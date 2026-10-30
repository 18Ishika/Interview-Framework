import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TAU = Math.PI * 2

function makeHaloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,184,107,0.55)')
  grad.addColorStop(0.45, 'rgba(255,160,80,0.16)')
  grad.addColorStop(1, 'rgba(255,160,80,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// Analogue wall clock driven by the browser's real local time.
// Origin = centre of the clock face, faces +Z. No timers: hands are updated in
// useFrame, so nothing needs cleaning up besides the halo texture.
export default function WallClock({ position = [0, 0, 0], radius = 0.5 }) {
  const hourRef = useRef()
  const minuteRef = useRef()
  const secondRef = useRef()
  const date = useMemo(() => new Date(), [])
  const halo = useMemo(() => makeHaloTexture(), [])

  useEffect(() => () => halo.dispose(), [halo])

  useFrame(() => {
    date.setTime(Date.now())
    const ms = date.getMilliseconds()
    const s = date.getSeconds() + ms / 1000
    const m = date.getMinutes() + s / 60
    const h = (date.getHours() % 12) + m / 60
    // 12 o'clock is +Y, clockwise = negative rotation about Z
    hourRef.current.rotation.z = -(h / 12) * TAU
    minuteRef.current.rotation.z = -(m / 60) * TAU
    secondRef.current.rotation.z = -(s / 60) * TAU
  })

  const ticks = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0
        const a = (i / 60) * TAU
        const r = radius * (major ? 0.82 : 0.88)
        return {
          key: i,
          major,
          x: Math.sin(a) * r,
          y: Math.cos(a) * r,
          rot: -a,
        }
      }),
    [radius],
  )

  const metal = { color: '#b9a27a', metalness: 0.9, roughness: 0.35 }

  return (
    <group name="wall-clock" position={position}>
      {/* warm halo on the wall */}
    <mesh position={[0, 0, -0.012]}>
      <planeGeometry args={[radius * 2.6, radius * 2.6]} />
      <meshBasicMaterial map={halo} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* face + bezel */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.05, 72]} />
        <meshStandardMaterial color="#0d1118" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <torusGeometry args={[radius, 0.02, 16, 96]} />
        <meshStandardMaterial {...metal} />
      </mesh>

      {/* hour + minute markers */}
      {ticks.map((t) => (
        <mesh key={t.key} position={[t.x, t.y, 0.028]} rotation={[0, 0, t.rot]}>
          <boxGeometry args={t.major ? [0.022, radius * 0.16, 0.006] : [0.008, radius * 0.06, 0.004]} />
          <meshStandardMaterial
            color={t.major ? '#e8dcc2' : '#7f8794'}
            emissive={t.major ? '#e8dcc2' : '#000000'}
            emissiveIntensity={t.major ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* hands */}
      <group ref={hourRef} position={[0, 0, 0.04]}>
        <mesh position={[0, radius * 0.22, 0]}>
          <boxGeometry args={[0.03, radius * 0.5, 0.01]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      </group>
      <group ref={minuteRef} position={[0, 0, 0.05]}>
        <mesh position={[0, radius * 0.33, 0]}>
          <boxGeometry args={[0.02, radius * 0.72, 0.01]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      </group>
      <group ref={secondRef} position={[0, 0, 0.06]}>
        <mesh position={[0, radius * 0.3, 0]}>
          <boxGeometry args={[0.006, radius * 0.86, 0.006]} />
          <meshStandardMaterial color="#d9893f" emissive="#d9893f" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -radius * 0.12, 0]}>
          <boxGeometry args={[0.012, radius * 0.2, 0.006]} />
          <meshStandardMaterial color="#d9893f" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 20]} />
        <meshStandardMaterial {...metal} />
      </mesh>

      {/* soft light so the face stays readable */}
      <pointLight position={[0, 0, 0.7]} intensity={0.5} distance={3} decay={2} color="#ffc489" />
    </group>
  )
}
