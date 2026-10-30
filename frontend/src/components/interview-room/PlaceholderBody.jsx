import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const S = { castShadow: true, receiveShadow: true }

// shirt V-opening (top edge at y=0, point down)
const shirtV = new THREE.Shape()
shirtV.moveTo(-0.075, 0)
shirtV.lineTo(0.075, 0)
shirtV.lineTo(0, -0.27)
shirtV.closePath()

// tie knot + blade
const tieKnot = new THREE.Shape()
tieKnot.moveTo(-0.017, 0)
tieKnot.lineTo(0.017, 0)
tieKnot.lineTo(0.012, -0.035)
tieKnot.lineTo(-0.012, -0.035)
tieKnot.closePath()

const tieBlade = new THREE.Shape()
tieBlade.moveTo(-0.012, 0)
tieBlade.lineTo(0.012, 0)
tieBlade.lineTo(0.027, -0.16)
tieBlade.lineTo(0, -0.2)
tieBlade.lineTo(-0.027, -0.16)
tieBlade.closePath()

// right collar flap (mirrored for the left)
const collarFlap = new THREE.Shape()
collarFlap.moveTo(0, 0.005)
collarFlap.lineTo(0.08, 0.012)
collarFlap.lineTo(0.035, -0.055)
collarFlap.closePath()

// Neutral seated silhouette used until real rigged avatars arrive.
// Origin = floor under the seat, facing +Z. Head centre is ~1.25m high.
// Tiny idle loop (breathing, head sway, a nod every ~9s). `phase` offsets it.
// Formal look: suit jacket with lapels, white shirt V, collar, tie, cuffs.
export default function PlaceholderBody({
  head=null,
  suit = '#2b3342',
  skin = '#9a7b66',
  shirt = '#f7f5ef',
  tie = '#5a1523',
  phase = 0,
}) {
  const torso = useRef()
  const headGroup = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase
    const breath = Math.sin(t * 1.3)
    torso.current.scale.set(1.18 * (1 + breath * 0.008), 1 + breath * 0.012, 0.72)

    const cycle = (t % 9) / 9
    const nod = cycle > 0.85 ? Math.sin(((cycle - 0.85) / 0.15) * Math.PI) * 0.12 : 0
    headGroup.current.rotation.set(
      nod + Math.sin(t * 0.5) * 0.015,
      Math.sin(t * 0.37) * 0.05,
      Math.sin(t * 0.29) * 0.01,
    )
  })

  const suitMat = <meshStandardMaterial color={suit} roughness={0.88} />
  const lapelMat = <meshStandardMaterial color={suit} roughness={0.4} metalness={0.1} />
  const skinMat = <meshStandardMaterial color={skin} roughness={0.6} />
  const shirtMat = <meshStandardMaterial color={shirt} roughness={0.7} side={THREE.DoubleSide} />
  const tieMat = <meshStandardMaterial color={tie} roughness={0.45} side={THREE.DoubleSide} />

  return (
    <group name="avatar-placeholder">
      {/* torso + shoulders */}
      <mesh ref={torso} position={[0, 0.76, 0]} scale={[1.18, 1, 0.72]} {...S}>
        <capsuleGeometry args={[0.17, 0.32, 8, 20]} />
        {suitMat}
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} {...S}>
        <capsuleGeometry args={[0.06, 0.3, 6, 12]} />
        {suitMat}
      </mesh>

      {/* shirt V */}
      <mesh position={[0, 1.06, 0.128]}>
        <shapeGeometry args={[shirtV]} />
        {shirtMat}
      </mesh>

      {/* lapels along the V edges */}
      {[-1, 1].map((side) => (
        <mesh key={`lapel-${side}`} position={[side * 0.07, 0.93, 0.13]} rotation={[0, 0, -side * 0.27]} {...S}>
          <boxGeometry args={[0.045, 0.28, 0.016]} />
          {lapelMat}
        </mesh>
      ))}

      {/* collar flaps */}
      <mesh position={[0, 1.075, 0.133]}>
        <shapeGeometry args={[collarFlap]} />
        {shirtMat}
      </mesh>
      <mesh position={[0, 1.075, 0.133]} scale={[-1, 1, 1]}>
        <shapeGeometry args={[collarFlap]} />
        {shirtMat}
      </mesh>

      {/* tie */}
      <mesh position={[0, 1.06, 0.137]}>
        <shapeGeometry args={[tieKnot]} />
        {tieMat}
      </mesh>
      <mesh position={[0, 1.025, 0.135]}>
        <shapeGeometry args={[tieBlade]} />
        {tieMat}
      </mesh>

      {/* jacket buttons */}
      {[0.7, 0.63].map((y) => (
        <mesh key={y} position={[0, y, 0.122]}>
          <sphereGeometry args={[0.011, 10, 8]} />
          <meshStandardMaterial color="#111317" roughness={0.4} />
        </mesh>
      ))}

      {/* neck + head, pivoting at the base of the neck */}
      <group ref={headGroup} position={head ? [0, 1.06, 0.015] : [0, 1.1, 0]}>
        {head ?? (
          <>
            <mesh position={[0, 0, 0.01]} {...S}>
              <cylinderGeometry args={[0.045, 0.05, 0.1, 16]} />
              {skinMat}
            </mesh>
            <mesh position={[0, 0.145, 0.015]} scale={[0.92, 1.15, 1]} {...S}>
              <sphereGeometry args={[0.105, 28, 20]} />
              {skinMat}
            </mesh>
          </>
        )}
      </group>

      {/* arms resting on the desk */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.225, 0.9, 0.05]} rotation={[-0.45, 0, 0]} {...S}>
            <capsuleGeometry args={[0.048, 0.16, 6, 12]} />
            {suitMat}
          </mesh>
          <mesh position={[side * 0.215, 0.79, 0.25]} rotation={[Math.PI / 2, 0, 0]} {...S}>
            <capsuleGeometry args={[0.042, 0.2, 6, 12]} />
            {suitMat}
          </mesh>
          {/* shirt cuff */}
          <mesh position={[side * 0.215, 0.79, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.03, 14]} />
            {shirtMat}
          </mesh>
          <mesh position={[side * 0.215, 0.775, 0.42]} {...S}>
            <sphereGeometry args={[0.045, 14, 12]} />
            {skinMat}
          </mesh>
        </group>
      ))}

      {/* thighs + shins (hidden by the desk panel) */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`}>
          <mesh position={[side * 0.1, 0.52, 0.22]} {...S}>
            <boxGeometry args={[0.16, 0.1, 0.42]} />
            {suitMat}
          </mesh>
          <mesh position={[side * 0.1, 0.27, 0.43]} {...S}>
            <capsuleGeometry args={[0.06, 0.3, 6, 10]} />
            {suitMat}
          </mesh>
        </group>
      ))}
    </group>
  )
}