import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox} from '@react-three/drei'
import * as THREE from 'three'
import { ROOM } from './layout'
import Desk from './Desk'
import WallClock from './WallClock'
import CandidateAvatar from './CandidateAvatar'
import InterviewerAvatar from './InterviewerAvatar'

const { width: RW, depth: RD, height: RH, backZ } = ROOM

// ---- theme palette (matches index.css) ----
const C = {
  bg: '#D8C7A6',
  wallBack: '#DCC9A6',
  wallSide: '#CDB991',
  ceiling: '#E6D9BC',
  floor: '#B89C70',
  baseboard: '#A68A5E',
  rug: '#86A788',
  terracotta: '#D4A373',
  terracottaDeep: '#A87347',
  evergreen: '#00200B',
  sage: '#9CBA9D',
  leaf: '#5E8562',
  gold: '#FED26E',
}
// ---- lighting knobs (tweak here if it feels too dark / too bright) ----
const LIGHT = {
  ambient: 0.75,
  hemi: 0.85,
  key: 40, // warm spot over the desk
  rim: 0.45, // soft back light
  fill: 0.55,
}

function makeArtTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 360
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, 512, 360)
  bg.addColorStop(0, '#F8F2E4')
  bg.addColorStop(1, '#EFE6D2')
  g.fillStyle = bg
  g.fillRect(0, 0, 512, 360)
  g.fillStyle = 'rgba(212,163,115,0.95)'
  g.beginPath()
  g.arc(330, 150, 80, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(156,186,157,0.85)'
  g.fillRect(40, 230, 300, 14)
  g.fillRect(90, 262, 340, 8)
  g.fillStyle = 'rgba(0,32,11,0.35)'
  g.fillRect(60, 60, 120, 6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Artwork({ position ,scale = 1}) {
  const tex = useMemo(() => makeArtTexture(), [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <group name="artwork" position={position} scale={scale}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.05, 0.05]} />
        <meshStandardMaterial color={C.evergreen} metalness={0.1} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.028]}>
        <planeGeometry args={[1.4, 0.95]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  )
}

function SlatPanel({ position, width = 2.2, height = 3.0 }) {
  const count = Math.floor(width / 0.13)
  return (
    <group name="acoustic-panel" position={position}>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial color="#E2D6BC" roughness={1} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.065 + i * 0.13, 0, 0.045]} castShadow receiveShadow>
          <boxGeometry args={[0.07, height - 0.1, 0.05]} />
          <meshStandardMaterial color={i % 2 ? C.terracotta : C.terracottaDeep} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Plant({ position , scale=1}) {
  const sway = useRef()
  useFrame((state) => {
    // very slow, tiny sway
    const t = state.clock.elapsedTime
    sway.current.rotation.z = Math.sin(t * 0.4) * 0.02
    sway.current.rotation.x = Math.sin(t * 0.33 + 1.2) * 0.015
  })
  return (
    <group name="plant" position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.19, 0.6, 28]} />
        <meshStandardMaterial color="#C48F5C" roughness={0.7} metalness={0.05} />
      </mesh>
      <group ref={sway} position={[0, 0.6, 0]}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2
          const tilt = 0.3 + 0.12 * (i % 3)
          const h = 0.8 + 0.2 * ((i * 7) % 3)
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0.1 + tilt * 0.3, 0.3 * h, 0]} rotation={[0, 0, -tilt]} scale={[0.06, 0.42 * h, 0.17]} castShadow>
                <sphereGeometry args={[1, 12, 8]} />
                <meshStandardMaterial color={C.leaf} roughness={0.7} />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

export default function RoomEnvironment({ speaking = false, candidateSpeaking = false }) {
  const spot = useRef()
  const wallLight = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])

  // barely-there breathing in the key light
  useFrame((state) => {
    const t = state.clock.elapsedTime
    spot.current.intensity = LIGHT.key * (1 + 0.035 * Math.sin(t * 0.35) + 0.015 * Math.sin(t * 0.9))
    wallLight.current.intensity = 3 * (1 + 0.06 * Math.sin(t * 0.6 + 2))
  })

  const wall = { color: C.wallBack, roughness: 0.95 }

  return (
    <>
      <color attach="background" args={[C.bg]} />

      {/* ---------- lights ---------- */}
      <ambientLight intensity={LIGHT.ambient} color="#FFF4E0" />
      <hemisphereLight args={['#FFF8EA', '#D9C4A0', LIGHT.hemi]} />

      <primitive object={target} position={[0, 0.8, -2.3]} />
      <spotLight
        ref={spot}
        position={[0.2, 3.9, -0.8]}
        target={target}
        angle={0.75}
        penumbra={0.9}
        intensity={LIGHT.key}
        decay={2}
        color="#FFD9A8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-2.5, 3, -6]} intensity={LIGHT.rim} color="#FFE8C8" />
      <directionalLight position={[4, 2.5, 4]} intensity={LIGHT.fill} color="#FFF1DC" />

      {/* local, network-free reflections */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={0.8} color="#FFE2BC" position={[0, 5, -1]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#FFF4E0" position={[-6, 2, -1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#E8F0E4" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>

      {/* ---------- shell ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, backZ + RD / 2]} receiveShadow>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={C.floor} roughness={0.6} metalness={0.02} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, RH, backZ + RD / 2]}>
        <planeGeometry args={[RW, RD]} />
        <meshStandardMaterial color={C.ceiling} roughness={1} />
      </mesh>
      <mesh position={[0, RH / 2, backZ]} receiveShadow>
        <planeGeometry args={[RW, RH]} />
        <meshStandardMaterial {...wall} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-RW / 2, RH / 2, backZ + RD / 2]} receiveShadow>
        <planeGeometry args={[RD, RH]} />
        <meshStandardMaterial color={C.wallSide} roughness={0.95} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[RW / 2, RH / 2, backZ + RD / 2]} receiveShadow>
        <planeGeometry args={[RD, RH]} />
        <meshStandardMaterial color={C.wallSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, backZ + 0.015]}>
        <boxGeometry args={[RW, 0.12, 0.03]} />
        <meshStandardMaterial color={C.baseboard} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* rug under the desk */}
      <RoundedBox args={[7.2, 0.02, 4.4]} radius={0.01} position={[0, 0.01, -2.2]} receiveShadow>
        <meshStandardMaterial color={C.rug} roughness={1} />
      </RoundedBox>

            {/* ---------- back wall details (kept few, all inside camera frame) ---------- */}
      <SlatPanel position={[-2.7, 1.3, backZ]} width={1.0} height={2.2} />
      <SlatPanel position={[2.7, 1.3, backZ]} width={1.0} height={2.2} />
      <Artwork position={[-1.3, 2.05, backZ + 0.04]} scale={0.65} />
      <WallClock position={[1.3, 2.1, backZ + 0.04]} radius={0.3} />
      <RoundedBox args={[1.0, 0.08, 0.04]} radius={0.02} position={[0, 2.4, backZ + 0.04]}>
        <meshStandardMaterial color="#FFF0C8" emissive={C.gold} emissiveIntensity={1.1} />
      </RoundedBox>
      <pointLight ref={wallLight} position={[0, 2.4, backZ + 0.7]} intensity={3} distance={6} decay={2} color="#FFD58A" />

      <Plant position={[2.3, 0, backZ + 0.7]} scale={0.8} />
      {/* ---------- furniture + avatar slots ---------- */}
      <Desk />
            <CandidateAvatar speaking={candidateSpeaking} />
      <InterviewerAvatar speaking={speaking} />
    </>
  )
}