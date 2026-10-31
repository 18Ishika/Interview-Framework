import { Component, Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CAMERA } from './layout'
import RoomEnvironment from './RoomEnvironment'
import RoomCamera from './RoomCamera'

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error('InterviewRoom failed to render:', err)
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="ivq-room__fallback">
          <strong>3D room unavailable</strong>
          <span>Your browser couldn&apos;t start WebGL. The interview can still continue.</span>
        </div>
      )
    }
    return this.props.children
  }
}

// mounts only once everything inside the surrounding Suspense (models included) has loaded
function Ready({ onReady }) {
  useEffect(() => {
    onReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export default function InterviewRoom({
  motionEnabled = true,
  speaking = false, // interviewer is talking
  candidateSpeaking = false, // user is recording an answer
  onReady, // called once when models are loaded
  className = '',
  candidateAvatarUrl,
}) {
  const [ready, setReady] = useState(false)

  const focus = candidateSpeaking ? 'candidate' : speaking ? 'interviewer' : null

  return (
    <div className={`ivq-room ${className}`}>
      <SceneBoundary>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ fov: CAMERA.fov, position: CAMERA.position, near: 0.1, far: 60 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.05
          }}
        >
          <color attach="background" args={['#070a10']} />
          <fog attach="fog" args={['#070a10', 10, 26]} />
          <Suspense fallback={null}>
            <RoomEnvironment
                speaking={speaking}
                candidateSpeaking={candidateSpeaking}
                candidateAvatarUrl={candidateAvatarUrl}
              />
            <Ready
              onReady={() => {
                setReady(true)
                onReady?.()
              }}
            />
          </Suspense>
          <RoomCamera enabled={motionEnabled} focus={focus} focusAmount={0.5} />
        </Canvas>
      </SceneBoundary>

      <div className={`ivq-room__veil ${ready ? 'is-clear' : ''}`} aria-hidden="true">
        <span>Entering room…</span>
      </div>
      <div className="ivq-room__vignette" aria-hidden="true" />
    </div>
  )
}