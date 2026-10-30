import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const BLINK_RE = /blink|eyes?_?closed/i
const MOUTH_RE = /^(jaw_?open|mouth_?open)$/i
const FINGER_RE = /thumb|index|middle|ring|pinky|little|finger/i
const HAND_RE = /(hand|wrist)([._]?[lr])?$/i
const FORE_RE = /(fore|lower).?arm/i
const TWIST_RE = /twist|roll|helper|share|corrective/i

// ---- jaw knobs ----
const TALK_OPEN = 0.65 // max jaw opening 0..1 (higher = wider mouth)
const TALK_SMOOTH = 16 // higher = snappier, lower = softer

// ---- moods (ARKit / Ready Player Me blendshapes) ----
const MOODS = {
  neutral: { smile: 0.1, browUp: 0, browDown: 0, squint: 0 },
  friendly: { smile: 0.35, browUp: 0.15, browDown: 0, squint: 0.15 },
  serious: { smile: 0, browUp: 0, browDown: 0.25, squint: 0.05 },
  curious: { smile: 0.1, browUp: 0.4, browDown: 0, squint: 0 },
}

// Pose notes:
//  A) across / drop|y / reach|fwd -> wrist target (lap, clasped, thighs)
//     across: 1 = straight under own shoulder, 0 = body centre
//     drop: how far BELOW the shoulder the wrist sits (m) -> works for any model size
//     reach: 0..1 of full arm length (higher = hands further forward)
//  B) onArm {along,out,fwd,thick,back} -> hand lands ON the opposite upper arm (crossed)
//  dz: extra forward offset for the left-side arm | pole: elbow direction
//  fingers: finger direction | curl/curlAmt: finger wrap | lean: torso tilt | spread: shoulder widen (m)
const POSES = {
  // candidate: relaxed, hands loosely clasped at belly level
  clasped: {
    across: 0.3,
    drop: 0.32,
    reach: 0.72,
    pole: [0.6, -1, -0.2],
    fingers: [-0.7, -0.3, 0.8],
    curl: [-0.4, -0.7, 0.3],
    curlAmt: 0.35,
    dz: 0.03,
    lean: 0.1,
  },
  // hands resting in lap, one over the other
  lap: {
    across: 0.55,
    drop: 0.42,
    reach: 0.92,
    pole: [0.5, -1, -0.4],
    fingers: [-0.35, -0.4, 1],
    curl: [-0.3, -0.8, 0.4],
    curlAmt: 0.3,
    dz: 0.03,
    lean: 0.05,
  },
  // hands flat on thighs, upright and attentive (good for interviewer)
  thighs: {
    across: 1,
    drop: 0.46,
    reach: 0.95,
    pole: [0.9, -1, -0.5],
    fingers: [-0.1, -0.25, 1],
    lean: 0.03,
  },
  // arms crossed
  crossed: {
    onArm: { along: 0.8, out: 0.15, fwd: 0.45, thick: 0.05, back: 0.12 },
    dz: 0.04,
    pole: [0.5, -1, 0.1],
    fingers: [-0.95, -0.25, 0.1],
    curl: [-0.5, -0.5, -0.6],
    curlAmt: 0.5,
    lean: 0.05,
    spread: 0.03,
  },
}

const ARM_DOWN = 1.3
const FOREARM_FWD = 1.2
const MIN_FORE = 0.17
const MIN_UPPER = 0.2
const MAX_ERROR = 0.04
const MAX_HOPS = 12

const AXIS_Z = new THREE.Vector3(0, 0, 1)
const AXIS_X = new THREE.Vector3(1, 0, 0)
const _w = new THREE.Quaternion()
const _q = new THREE.Quaternion()
const _p = new THREE.Quaternion()
const _v = new THREE.Vector3()

const wp = (o) => o.getWorldPosition(new THREE.Vector3())
const r3 = (v) => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]

// set a morph target by (lowercase) name on every mesh that has it
const setM = (map, name, v) => {
  const list = map[name]
  if (list) for (const { inf, i } of list) inf[i] = v
}

const findBone = (root, re) => {
  let hit = null
  root.traverse((o) => {
    if (!hit && o.isBone && re.test(o.name)) hit = o
  })
  return hit
}

const climb = (start, stop) => {
  let o = start
  for (let i = 0; i < MAX_HOPS && o?.isBone && !stop(o); i++) o = o.parent
  return o
}

function rotateWorld(bone, axis, angle) {
  bone.getWorldQuaternion(_w)
  _q.setFromAxisAngle(axis, angle).multiply(_w)
  bone.parent.getWorldQuaternion(_p)
  bone.quaternion.copy(_p.invert().multiply(_q))
  bone.updateMatrixWorld(true)
}

function poseArms(root) {
  root.updateMatrixWorld(true)
  const upper = []
  const fore = []
  root.traverse((o) => {
    if (!o.isBone) return
    if (/(fore|lower).?arm([._]?[lr])?$/i.test(o.name)) fore.push(o)
    else if (/arm([._]?[lr])?$/i.test(o.name)) upper.push(o)
  })
  for (const b of upper) {
    const side = b.getWorldPosition(_v).x > 0 ? -1 : 1
    rotateWorld(b, AXIS_Z, side * ARM_DOWN)
  }
  for (const b of fore) rotateWorld(b, AXIS_X, -FOREARM_FWD)
}

const isAncestor = (a, b) => {
  let p = b.parent
  while (p) {
    if (p === a) return true
    p = p.parent
  }
  return false
}

function findHands(root) {
  const hands = []
  root.traverse((o) => {
    if (o.isBone && !FINGER_RE.test(o.name) && HAND_RE.test(o.name)) hands.push(o)
  })
  return hands.filter((h) => !hands.some((o) => o !== h && isAncestor(h, o)))
}

function widenShoulders(root, amount) {
  root.updateMatrixWorld(true)
  const bones = []
  root.traverse((o) => {
    if (o.isBone && /shoulder|clavicle/i.test(o.name) && !TWIST_RE.test(o.name)) bones.push(o)
  })
  const tops = bones.filter((b) => !bones.some((o) => o !== b && isAncestor(o, b)))
  for (const b of tops) {
    const target = wp(b)
    target.x += (target.x >= 0 ? 1 : -1) * amount
    b.position.copy(b.parent.worldToLocal(target))
    b.updateMatrixWorld(true)
  }
  return tops.length
}

function chainFor(hand, strategy, k) {
  let fore
  let upper
  if (strategy === 'name') {
    fore = climb(hand.parent, (o) => FORE_RE.test(o.name) && !TWIST_RE.test(o.name))
    upper = climb(
      fore?.parent,
      (o) => /arm/i.test(o.name) && !FORE_RE.test(o.name) && !TWIST_RE.test(o.name),
    )
  } else if (strategy === 'distance') {
    const hp = wp(hand)
    fore = climb(hand.parent, (o) => wp(o).distanceTo(hp) >= MIN_FORE * k)
    const fp = fore?.isBone ? wp(fore) : null
    upper = climb(fore?.parent, (o) => !fp || wp(o).distanceTo(fp) >= MIN_UPPER * k)
  } else {
    fore = hand.parent
    upper = fore?.parent
  }
  return fore?.isBone && upper?.isBone ? { upper, fore, hand } : null
}

function aimBone(bone, childPos, targetPos) {
  const pos = bone.getWorldPosition(new THREE.Vector3())
  const from = childPos.clone().sub(pos).normalize()
  const to = targetPos.clone().sub(pos).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(from, to)
  const w = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(q)
  const p = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
  bone.quaternion.copy(p.multiply(w))
  bone.updateMatrixWorld(true)
}

function curlFingers(hand, side, pose) {
  if (!pose.curl || !pose.fingers) return
  const fd = new THREE.Vector3(side * pose.fingers[0], pose.fingers[1], pose.fingers[2]).normalize()
  const cd = new THREE.Vector3(side * pose.curl[0], pose.curl[1], pose.curl[2]).normalize()
  const amt = pose.curlAmt ?? 0.9

  for (const root of hand.children) {
    if (!root.isBone || !FINGER_RE.test(root.name) || /thumb/i.test(root.name)) continue
    const chain = []
    let b = root
    while (b?.isBone && chain.length < 4) {
      chain.push(b)
      b = b.children.find((c) => c.isBone)
    }
    const segs = Math.max(1, chain.length - 1)
    chain.forEach((bone, i) => {
      const child = bone.children.find((c) => c.isBone)
      if (!child) return
      const t = Math.min(1, (i + 1) / segs) * amt
      const dir = fd.clone().lerp(cd, t).normalize()
      aimBone(bone, wp(child), wp(bone).add(dir))
    })
  }
}

function wristTarget(S, L1, L2, side, pose, k) {
  if (pose.onArm) {
    const a = pose.onArm
    const fd = new THREE.Vector3(side * pose.fingers[0], pose.fingers[1], pose.fingers[2]).normalize()
    const u = new THREE.Vector3(-side * a.out, -1, a.fwd).normalize()
    const landing = new THREE.Vector3(-S.x, S.y, S.z).addScaledVector(u, L1 * a.along)
    landing.z += a.thick * k
    const target = landing.addScaledVector(fd, -a.back * k)
    if (side > 0) target.z += (pose.dz ?? 0) * k
    return target
  }

  const tx = side * pose.across * Math.abs(S.x)
  // relative to shoulder when `drop` is given, else absolute y
  const ty = pose.drop != null ? S.y - pose.drop * k : pose.y
  let dz
  if (pose.fwd != null) {
    dz = pose.fwd * k
  } else {
    const dx = tx - S.x
    const dy = ty - S.y
    const r = pose.reach * (L1 + L2)
    dz = Math.sqrt(Math.max(0.0025, r * r - dx * dx - dy * dy))
  }
  const tz = S.z + dz + (side > 0 ? (pose.dz ?? 0) * k : 0)
  return new THREE.Vector3(tx, ty, tz)
}

function restHand({ upper, fore, hand }, pose, k) {
  const S = upper.getWorldPosition(new THREE.Vector3())
  const E = fore.getWorldPosition(new THREE.Vector3())
  const W = hand.getWorldPosition(new THREE.Vector3())
  const side = S.x >= 0 ? 1 : -1
  const L1 = S.distanceTo(E)
  const L2 = E.distanceTo(W)

  const target = wristTarget(S, L1, L2, side, pose, k)
  const pole = new THREE.Vector3(side * pose.pole[0], pose.pole[1], pose.pole[2])

  const toT = target.clone().sub(S)
  const d = THREE.MathUtils.clamp(toT.length(), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3)
  const dir = toT.normalize()
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA))
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize()
  const elbow = S.clone().addScaledVector(dir, L1 * cosA).addScaledVector(perp, L1 * sinA)

  aimBone(upper, E, elbow)
  fore.getWorldPosition(E)
  hand.getWorldPosition(W)
  aimBone(fore, W, target)

  if (pose.fingers) {
    const finger =
      hand.children.find((c) => c.isBone && /middle/i.test(c.name)) ??
      hand.children.find((c) => c.isBone && /index/i.test(c.name)) ??
      hand.children.find((c) => c.isBone)
    if (finger) {
      const fd = new THREE.Vector3(side * pose.fingers[0], pose.fingers[1], pose.fingers[2]).normalize()
      aimBone(hand, wp(finger), wp(hand).add(fd))
    }
  }

  curlFingers(hand, side, pose)

  const after = wp(hand)
  return {
    chain: [upper.name, fore.name, hand.name],
    side,
    L1: +L1.toFixed(3),
    L2: +L2.toFixed(3),
    shoulder: r3(S),
    target: r3(target),
    handAfter: r3(after),
    error: +after.distanceTo(target).toFixed(3),
  }
}

function placeArms(m, poseDef, k, url) {
  m.updateMatrixWorld(true)
  const snap = new Map()
  m.traverse((o) => o.isBone && snap.set(o, o.quaternion.clone()))
  const restore = () => {
    snap.forEach((q, b) => b.quaternion.copy(q))
    m.updateMatrixWorld(true)
  }

  const hands = findHands(m)
  const tried = []
  for (const strategy of ['name', 'distance', 'parent']) {
    const chains = hands.map((h) => chainFor(h, strategy, k)).filter(Boolean)
    if (chains.length < 2) {
      tried.push({ strategy, chains: chains.length })
      continue
    }
    const results = chains.map((ch) => restHand(ch, poseDef, k))
    const worst = Math.max(...results.map((r) => r.error))
    tried.push({ strategy, worst, results })
    if (worst < MAX_ERROR) {
      console.log('ARMS ok', url, JSON.stringify(tried))
      return { ok: true, targets: results.map((r) => r.target) }
    }
    restore()
  }

  const names = []
  m.traverse((o) => o.isBone && names.push(o.name))
  console.warn('ARMS failed, using fixed pose', url, JSON.stringify(tried), 'bones:', names)
  poseArms(m)
  return { ok: false, targets: [] }
}

// Loads a full-body GLB, scales it, seats it, poses the arms with IK, and adds idle
// animation (breathing, head sway, blinking, gaze drift, mood) plus a talking jaw
// while `speaking` is true.
export default function GlbAvatar({
  url,
  height = 1.7,
  seatedTop = 1.37,
  pose = 'clasped',
  mood = 'friendly',
  speaking = false,
  phase = 0,
  debug = false,
}) {
  const { scene } = useGLTF(url)
  const blink = useRef({ next: 2 + Math.random() * 2, t: -1 })
  const mouth = useRef(0)
  const wrap = useRef()
  const dbg = useRef([])
  const anim = useRef({
    sylT: 0,
    open: 0,
    shape: 0.5,
    browKick: 0,
    smile: 0,
    brow: 0,
    gazeT: 2,
    gx: 0,
    gy: 0,
    cgx: 0,
    cgy: 0,
  })

  const { model, rig } = useMemo(() => {
    const m = SkeletonUtils.clone(scene)
    m.updateMatrixWorld(true)
    const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3())
    m.scale.setScalar(height / size.y)
    m.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(m)
    const c = box.getCenter(new THREE.Vector3())
    m.position.set(-c.x, seatedTop - box.max.y, -c.z)
    m.updateMatrixWorld(true)

    const poseDef = POSES[pose] ?? POSES.clasped

    const spine = findBone(m, /spine$/i)
    const headBone = findBone(m, /head$/i)
    if (poseDef.lean && spine) {
      rotateWorld(spine, AXIS_X, poseDef.lean)
      if (headBone) rotateWorld(headBone, AXIS_X, -poseDef.lean * 0.7)
    }

    if (poseDef.spread) {
      const widened = widenShoulders(m, poseDef.spread * (height / 1.7))
      if (!widened) console.warn('No shoulder/clavicle bones found in', url)
    }

    const { ok: armsOk, targets } = placeArms(m, poseDef, height / 1.7, url)

    const morphs = []
    const morphMap = {}
    const blinkNames = []
    const mouthNames = []
    m.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
      if (o.morphTargetDictionary && o.morphTargetInfluences) {
        morphs.push(o)
        for (const n of Object.keys(o.morphTargetDictionary)) {
          ;(morphMap[n.toLowerCase()] ??= []).push({
            inf: o.morphTargetInfluences,
            i: o.morphTargetDictionary[n],
          })
          if (BLINK_RE.test(n)) blinkNames.push(n)
          if (MOUTH_RE.test(n)) mouthNames.push(n)
        }
      }
    })

    const head = headBone
    const jaw = findBone(m, /jaw$/i)
    const chest = findBone(m, /spine2$/i) ?? findBone(m, /spine1$/i) ?? spine
    const base = {
      head: head?.rotation.clone(),
      chest: chest?.rotation.clone(),
      jaw: jaw?.rotation.clone(),
    }

    console.log('GLB rig', {
      url,
      pose,
      armsOk,
      head: head?.name,
      chest: chest?.name,
      jaw: jaw?.name,
      blink: blinkNames,
      mouth: mouthNames,
    })
    if (!blinkNames.length) console.warn('No blink blendshapes in', url)
    if (!mouthNames.length) console.warn('No jaw/mouth blendshapes in', url)

    return {
      model: m,
      rig: {
        head,
        chest,
        jaw,
        base,
        morphs,
        morphMap,
        hasMouth: mouthNames.length > 0,
        hands: findHands(m),
        targets,
      },
    }
  }, [scene, height, seatedTop, pose, url])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + phase
    const { head, chest, jaw, base, morphs, morphMap, hands } = rig
    const A = anim.current
    const M = MOODS[mood] ?? MOODS.neutral

    // ---- talking: random syllables, word gaps, pauses ----
    A.sylT -= delta
    if (speaking) {
      if (A.sylT <= 0) {
        A.sylT = 0.07 + Math.random() * 0.14
        A.open = Math.random() < 0.12 ? 0.05 : 0.25 + Math.random() * 0.75
        A.shape = Math.random() // 0 = round (oo), 1 = wide (ee)
        if (Math.random() < 0.15) A.sylT += 0.25 // pause between words
        if (Math.random() < 0.2) A.browKick = 0.3 + Math.random() * 0.4
      }
    } else {
      A.open = 0
      A.shape = 0.5
    }
    mouth.current = THREE.MathUtils.damp(mouth.current, A.open * TALK_OPEN, TALK_SMOOTH, delta)
    const mouthV = mouth.current
    A.browKick = THREE.MathUtils.damp(A.browKick, 0, 6, delta)

    // ---- gaze drift ----
    A.gazeT -= delta
    if (A.gazeT <= 0) {
      A.gazeT = 1.5 + Math.random() * 2.5
      A.gx = (Math.random() - 0.5) * 1.2
      A.gy = (Math.random() - 0.5) * 0.6
    }
    A.cgx = THREE.MathUtils.damp(A.cgx, A.gx, 10, delta)
    A.cgy = THREE.MathUtils.damp(A.cgy, A.gy, 10, delta)

    // ---- body ----
    if (chest) chest.rotation.x = base.chest.x + Math.sin(t * 1.3) * 0.012

    if (head) {
      const cycle = (t % 9) / 9
      const nod = cycle > 0.85 ? Math.sin(((cycle - 0.85) / 0.15) * Math.PI) * 0.12 : 0
      const talkNod = speaking ? Math.sin(t * 2.3) * 0.02 * Math.min(1, mouthV * 2) : 0
      head.rotation.set(
        base.head.x + nod + talkNod + Math.sin(t * 0.5) * 0.015 + A.cgy * -0.03,
        base.head.y + Math.sin(t * 0.37) * 0.05 + A.cgx * 0.05,
        base.head.z + Math.sin(t * 0.29) * 0.01,
      )
    }

    // jaw bone fallback when the model has no jawOpen blendshape
    if (jaw && base.jaw && !rig.hasMouth) jaw.rotation.x = base.jaw.x + mouthV * 0.35

    // ---- blink ----
    const b = blink.current
    b.next -= delta
    if (b.next <= 0 && b.t < 0) {
      b.t = 0
      b.next = 3 + Math.random() * 2
    }
    let blinkV = 0
    if (b.t >= 0) {
      b.t += delta
      blinkV = Math.sin(Math.min(b.t / 0.15, 1) * Math.PI)
      if (b.t >= 0.15) b.t = -1
    }

    // ---- blink + jaw open ----
    for (const o of morphs) {
      const d = o.morphTargetDictionary
      const inf = o.morphTargetInfluences
      for (const n in d) {
        if (BLINK_RE.test(n)) inf[d[n]] = blinkV
        else if (MOUTH_RE.test(n)) inf[d[n]] = mouthV
      }
    }

    // ---- expressions ----
    A.smile = THREE.MathUtils.damp(A.smile, M.smile + (speaking ? A.shape * mouthV * 0.3 : 0), 3, delta)
    A.brow = THREE.MathUtils.damp(A.brow, M.browUp + A.browKick, 8, delta)

    setM(morphMap, 'mouthsmileleft', A.smile)
    setM(morphMap, 'mouthsmileright', A.smile)
    setM(morphMap, 'cheeksquintleft', A.smile * 0.5)
    setM(morphMap, 'cheeksquintright', A.smile * 0.5)
    setM(morphMap, 'eyesquintleft', M.squint + A.smile * 0.2)
    setM(morphMap, 'eyesquintright', M.squint + A.smile * 0.2)

    setM(morphMap, 'browinnerup', A.brow)
    setM(morphMap, 'browouterupleft', A.brow * 0.6)
    setM(morphMap, 'browouterupright', A.brow * 0.6)
    setM(morphMap, 'browdownleft', M.browDown)
    setM(morphMap, 'browdownright', M.browDown)

    // mouth shapes while talking (round vs wide)
    setM(morphMap, 'mouthfunnel', (1 - A.shape) * mouthV * 0.5)
    setM(morphMap, 'mouthpucker', (1 - A.shape) * mouthV * 0.25)
    setM(morphMap, 'mouthstretchleft', A.shape * mouthV * 0.3)
    setM(morphMap, 'mouthstretchright', A.shape * mouthV * 0.3)
    setM(morphMap, 'mouthlowerdownleft', mouthV * 0.3)
    setM(morphMap, 'mouthlowerdownright', mouthV * 0.3)

    // eyes
    setM(morphMap, 'eyelookoutleft', Math.max(-A.cgx, 0))
    setM(morphMap, 'eyelookinright', Math.max(-A.cgx, 0))
    setM(morphMap, 'eyelookinleft', Math.max(A.cgx, 0))
    setM(morphMap, 'eyelookoutright', Math.max(A.cgx, 0))
    setM(morphMap, 'eyelookupleft', Math.max(A.cgy, 0))
    setM(morphMap, 'eyelookupright', Math.max(A.cgy, 0))
    setM(morphMap, 'eyelookdownleft', Math.max(-A.cgy, 0))
    setM(morphMap, 'eyelookdownright', Math.max(-A.cgy, 0))

    // ---- debug markers ----
    if (debug && wrap.current) {
      hands.forEach((h, i) => {
        const s = dbg.current[i]
        if (!s) return
        h.getWorldPosition(_v)
        wrap.current.worldToLocal(_v)
        s.position.copy(_v)
      })
    }
  })

  return (
    <group ref={wrap}>
      <primitive object={model} />
      {debug &&
        rig.targets.map((t, i) => (
          <mesh key={`target-${i}`} position={t} renderOrder={999}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial color="red" depthTest={false} />
          </mesh>
        ))}
      {debug &&
        rig.hands.map((h, i) => (
          <mesh key={`hand-${i}`} ref={(el) => (dbg.current[i] = el)} renderOrder={999}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color="lime" depthTest={false} />
          </mesh>
        ))}
    </group>
  )
}

// start downloading both models as soon as this file loads
useGLTF.preload('/avatars/interviewer.glb')
useGLTF.preload('/avatars/candidate.glb')