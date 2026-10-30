import Chair from './Chair'
import GlbAvatar from './GlbAvatar'
import { SEATS } from './layout'

// Interviewer sits on the RIGHT, angled toward the candidate.
export default function InterviewerAvatar({ url = '/avatars/interviewer.glb', speaking = false, children }) {
  const { position, rotationY } = SEATS.interviewer
  return (
    <group name="interviewer-slot" position={position} rotation={[0, rotationY, 0]}>
      <Chair color="#252a33" />
      {children ?? <GlbAvatar url={url} speaking={speaking} phase={1.7} pose="thighs" mood="serious" /> }
    </group>
  )
}