import Chair from './Chair'
import GlbAvatar from './GlbAvatar'
import { SEATS } from './layout'

// Candidate sits on the LEFT, facing the interviewer. `speaking` moves the jaw.
export default function CandidateAvatar({ url = '/avatars/candidate.glb', speaking = false, children }) {
  const { position, rotationY } = SEATS.candidate
  return (
    <group name="candidate-slot" position={position} rotation={[0, rotationY, 0]}>
      <Chair color="#252a33" />
      {children ?? <GlbAvatar url={url} speaking={speaking} phase={0} pose="clasped" />}
    </group>
  )
}