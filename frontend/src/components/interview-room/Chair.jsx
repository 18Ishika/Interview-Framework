import { RoundedBox } from '@react-three/drei'

const S = { castShadow: true, receiveShadow: true }
const metal = { color: '#3a4049', metalness: 0.85, roughness: 0.38 }

// Simple executive chair. Origin = floor, seat centre, facing +Z.
export default function Chair({ color = '#1f242c' }) {
  return (
    <group name="chair">
      <RoundedBox args={[0.54, 0.09, 0.52]} radius={0.035} smoothness={4} position={[0, 0.45, 0]} {...S}>
        <meshStandardMaterial color={color} roughness={0.72} />
      </RoundedBox>
      <RoundedBox
        args={[0.5, 0.64, 0.07]}
        radius={0.03}
        smoothness={4}
        position={[0, 0.83, -0.26]}
        rotation={[-0.1, 0, 0]}
        {...S}
      >
        <meshStandardMaterial color={color} roughness={0.72} />
      </RoundedBox>
      <mesh position={[0, 0.24, 0]} {...S}>
        <cylinderGeometry args={[0.03, 0.035, 0.38, 14]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]}>
          <mesh position={[0.17, 0.045, 0]} {...S}>
            <boxGeometry args={[0.34, 0.03, 0.05]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
