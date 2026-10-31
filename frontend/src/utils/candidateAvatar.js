import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useGLTF } from '@react-three/drei'

export const DEFAULT_CANDIDATE_AVATAR = '/avatars/candidate_ishika.glb' // any file that exists

// Clerk user id -> avatar file in /public/avatars
const CANDIDATE_AVATARS = {
  user_3FUR15Dx29dcXrbr89JYpOMduDz: '/avatars/candidate_ishika.glb',
  user_3F5RaxIb81cBL9eTNVLh1ep4GDk: '/avatars/candidate_vishakha.glb',
  user_3Kgv9YzZRsz2F2jZW8rhxUwjDCa: '/avatars/candidate_sonu.glb',
}

export function useCandidateAvatar() {
  const { user } = useUser()
  const url = (user && CANDIDATE_AVATARS[user.id]) || DEFAULT_CANDIDATE_AVATAR

  // start downloading this user's model early
  useEffect(() => {
    useGLTF.preload(url)
  }, [url])

  return url
}