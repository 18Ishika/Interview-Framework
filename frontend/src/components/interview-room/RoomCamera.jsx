import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA, CAMERA_MOTION, CAMERA_FOCUS } from './layout'

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const smooth = (x) => x * x * (3 - 2 * x)

// Slow dolly push-in / pull-back, lateral drift and faint pointer parallax.
// `enabled=false` eases everything back to the stable default composition.
// `focus` ('interviewer' | 'candidate' | null) eases to that close-up (motion pauses).
export default function RoomCamera({ enabled = true, intro = true, focus = null, focusAmount = 1 }) {
  const { camera, size } = useThree()

  const rig = useMemo(() => {
    const base = new THREE.Vector3(...CAMERA.position)
    const target = new THREE.Vector3(...CAMERA.lookAt)
    const dir = target.clone().sub(base).normalize()
    const first = CAMERA_FOCUS.interviewer
    return {
      base,
      target,
      dir,
      look: new THREE.Vector3(),
      motion: 0,
      px: 0,
      py: 0,
      focus: 0,
      key: 'interviewer',
      goalPos: new THREE.Vector3(...first.position),
      goalLook: new THREE.Vector3(...first.lookAt),
      curPos: new THREE.Vector3(...first.position),
      curLook: new THREE.Vector3(...first.lookAt),
    }
  }, [])

  // Keep both characters in frame on narrower layouts by widening the fov.
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const ref = 16 / 9
    let fov = CAMERA.fov
    if (aspect < ref) {
      const t = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)) * (ref / aspect)
      fov = Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(t)), 42)
    }
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const m = CAMERA_MOTION

    rig.motion = THREE.MathUtils.damp(rig.motion, enabled && !focus ? 1 : 0, 1.4, delta)
        rig.focus = THREE.MathUtils.damp(rig.focus, focus ? focusAmount : 0, 2.5, delta)
    rig.px = THREE.MathUtils.damp(rig.px, state.pointer.x, 1.2, delta)
    rig.py = THREE.MathUtils.damp(rig.py, state.pointer.y, 1.2, delta)

    // pick the close-up; glide between seats, snap when not focused
    if (focus) rig.key = focus
    const goal = CAMERA_FOCUS[rig.key]
    rig.goalPos.set(...goal.position)
    rig.goalLook.set(...goal.lookAt)
    if (rig.focus < 0.01) {
      rig.curPos.copy(rig.goalPos)
      rig.curLook.copy(rig.goalLook)
    } else {
      const a = 1 - Math.exp(-4 * delta)
      rig.curPos.lerp(rig.goalPos, a)
      rig.curLook.lerp(rig.goalLook, a)
    }

    const breathe = (1 - Math.cos((t / m.dollyPeriodSec) * Math.PI * 2)) / 2
    const dolly = smooth(breathe) * m.dollyMeters * rig.motion
    const drift = Math.sin((t / m.driftPeriodSec) * Math.PI * 2) * m.driftMeters * rig.motion

    const k = intro ? easeOutCubic(Math.min(t / m.introSec, 1)) : 1
    const introPull = (1 - k) * 1.6

    camera.position.copy(rig.base).addScaledVector(rig.dir, dolly - introPull)
    camera.position.x += drift + rig.px * 0.12 * rig.motion
    const bob = Math.sin((t / m.bobPeriodSec) * Math.PI * 2) * m.bobMeters * rig.motion
    camera.position.y += (1 - k) * 0.25 + bob + rig.py * 0.05 * rig.motion

    rig.look.copy(rig.target)
    rig.look.x += drift * 0.35

    if (rig.focus > 0.001) {
      const f = smooth(rig.focus)
      camera.position.lerp(rig.curPos, f)
      rig.look.lerp(rig.curLook, f)
    }
    camera.lookAt(rig.look)
  })

  return null
}