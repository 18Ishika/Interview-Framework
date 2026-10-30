import { RoundedBox } from '@react-three/drei'
import { DESK } from './layout'

const S = { castShadow: true, receiveShadow: true }
const wood = { color: '#5b3d28', roughness: 0.5, metalness: 0 }
const metal = { color: '#2a2f37', metalness: 0.85, roughness: 0.38 }

export default function Desk() {
  const { width, depth, height, position } = DESK
  const top = 0.06
  const legX = width / 2 - 0.12
  const legZ = depth / 2 - 0.1

  return (
    <group name="desk" position={position}>
      <RoundedBox args={[width, top, depth]} radius={0.02} smoothness={4} position={[0, height - top / 2, 0]} {...S}>
        <meshStandardMaterial {...wood} />
      </RoundedBox>

      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * legX, (height - top) / 2, sz * legZ]} {...S}>
            <boxGeometry args={[0.05, height - top, 0.05]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        )),
      )}

      {/* front modesty panel (faces camera) hides the legs */}
      <mesh position={[0, height - 0.38, depth / 2 - 0.06]} {...S}>
        <boxGeometry args={[width - 0.3, 0.5, 0.03]} />
        <meshStandardMaterial color="#1c222c" roughness={0.82} />
      </mesh>
      <mesh position={[0, height - top - 0.01, depth / 2 - 0.02]}>
        <boxGeometry args={[width - 0.1, 0.02, 0.02]} />
        <meshStandardMaterial {...metal} />
      </mesh>

            {/* interviewer side: laptop (screen faces the interviewer, away from camera) */}
      <group position={[0.85, height, -0.22]} rotation={[0, -0.2, 0]}>
        {/* base */}
        <mesh position={[0, 0.0075, 0]} {...S}>
          <boxGeometry args={[0.34, 0.015, 0.23]} />
          <meshStandardMaterial color="#8d939c" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* keyboard deck */}
        <mesh position={[0, 0.016, -0.015]}>
          <boxGeometry args={[0.29, 0.002, 0.13]} />
          <meshStandardMaterial color="#1c222c" roughness={0.8} />
        </mesh>
        {/* lid, hinged at the far (+z) edge, leaning back */}
        <group position={[0, 0.015, 0.115]} rotation={[0.25, 0, 0]}>
          <mesh position={[0, 0.11, 0]} {...S}>
            <boxGeometry args={[0.34, 0.22, 0.012]} />
            <meshStandardMaterial color="#8d939c" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* screen on the candidate-facing side */}
          <mesh position={[0, 0.11, -0.0066]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.31, 0.19]} />
            <meshStandardMaterial color="#101820" emissive="#2a4a6a" emissiveIntensity={0.5} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* candidate side: paper + pen */}
      <mesh position={[-1.3, height + 0.008, -0.28]} rotation={[0, 0.25, 0]} {...S}>
        <boxGeometry args={[0.3, 0.014, 0.22]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.9} />
      </mesh>
      <mesh position={[-1.1, height + 0.022, -0.2]} rotation={[Math.PI / 2, 0, 0.9]} {...S}>
        <cylinderGeometry args={[0.006, 0.006, 0.15, 10]} />
        <meshStandardMaterial {...metal} />
      </mesh>

      {/* interviewer side: paper + pen */}
      <mesh position={[1.25, height + 0.008, -0.28]} rotation={[0, -0.2, 0]} {...S}>
        <boxGeometry args={[0.3, 0.014, 0.22]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.9} />
      </mesh>
      <mesh position={[1.05, height + 0.022, -0.2]} rotation={[Math.PI / 2, 0, -0.9]} {...S}>
        <cylinderGeometry args={[0.006, 0.006, 0.15, 10]} />
        <meshStandardMaterial {...metal} />
      </mesh>
    </group>
  )
}