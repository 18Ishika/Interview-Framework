import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GlbAvatar from './GlbAvatar'
import '../../styles/welcome-intro.css'

const GREETING =
  "Hello! I'm Alan Turing, your interviewer today. Take a deep breath, stay confident, and be yourself. All the best for your interview!"

const TYPE_SPEED = 60 // ms per character
const LOOK_AT = new THREE.Vector3(0, 1.02, 0)

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => /ryan|daniel|google uk english male/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-GB') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  )
}

function Ready({ onReady }) {
  useEffect(() => {
    onReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function CameraRig() {
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const cam = state.camera
    cam.position.x = THREE.MathUtils.damp(cam.position.x, Math.sin(t * 0.35) * 0.06, 2, delta)
    cam.position.y = THREE.MathUtils.damp(cam.position.y, 1.2 + Math.sin(t * 0.5) * 0.01, 2, delta)
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 1.55, 0.6, delta)
    cam.lookAt(LOOK_AT)
  })
  return null
}

function Rise({ children }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, 0, 2.2, delta)
    const s = THREE.MathUtils.damp(ref.current.scale.x, 1, 2.2, delta)
    ref.current.scale.setScalar(s)
  })
  return (
    <group ref={ref} position={[0, -0.35, 0]} scale={0.92}>
      {children}
    </group>
  )
}

// waitFor: keep the intro on screen until this is true (e.g. the session finished loading)
export default function WelcomeIntro({ onDone, waitFor = true }) {
  const [avatarReady, setAvatarReady] = useState(false)
  const [typed, setTyped] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const doneRef = useRef(onDone)
  const waitRef = useRef(waitFor)
  const skipRef = useRef(() => {})
  const checkRef = useRef(() => {})
  doneRef.current = onDone
  waitRef.current = waitFor

  // safety net: start anyway if the model is slow or WebGL fails
  useEffect(() => {
    const id = setTimeout(() => setAvatarReady(true), 7000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!avatarReady) return undefined

    const timers = []
    let typeId
    let typingDone = false
    let speechDone = false
    let finished = false
    let skipped = false
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

    const leave = (delay) => {
      if (finished) return
      finished = true
      timers.push(setTimeout(() => setLeaving(true), delay))
      timers.push(setTimeout(() => doneRef.current?.(), delay + 900))
    }

    const check = () => {
      if (!(typingDone && speechDone)) return
      setSpeaking(false)
      if (waitRef.current) leave(skipped ? 0 : 1200)
    }
    checkRef.current = check

    skipRef.current = () => {
      clearInterval(typeId)
      timers.forEach(clearTimeout)
      synth?.cancel()
      setTyped(GREETING)
      typingDone = true
      speechDone = true
      skipped = true
      check()
    }

    timers.push(
      setTimeout(() => {
        setSpeaking(true)

        if (synth) {
          synth.cancel()
          const u = new SpeechSynthesisUtterance(GREETING)
          u.voice = pickVoice()
          u.rate = 0.95
          u.pitch = 0.9
          u.onend = () => {
            speechDone = true
            check()
          }
          u.onerror = () => {
            speechDone = true
            check()
          }
          synth.speak(u)
          timers.push(
            setTimeout(() => {
              speechDone = true
              check()
            }, 25000),
          )
        } else {
          speechDone = true
        }

        let i = 0
        typeId = setInterval(() => {
          i += 1
          setTyped(GREETING.slice(0, i))
          if (i >= GREETING.length) {
            clearInterval(typeId)
            typingDone = true
            check()
          }
        }, TYPE_SPEED)
      }, 1600),
    )

    return () => {
      clearInterval(typeId)
      timers.forEach(clearTimeout)
      synth?.cancel()
    }
  }, [avatarReady])

  // session became ready after the greeting already finished -> leave now
  useEffect(() => {
    if (waitFor) checkRef.current()
  }, [waitFor])

  const typingDone = typed.length >= GREETING.length
  const holding = typingDone && !speaking && !waitFor && !leaving

  return (
    <div className={`wi ${avatarReady ? 'is-ready' : ''} ${leaving ? 'is-leaving' : ''}`}>
      <div className="wi__beam" aria-hidden="true" />
      <div className="wi__grid" aria-hidden="true" />
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className="wi__dot" style={{ '--i': i }} aria-hidden="true" />
      ))}
      <div className={`wi__floor ${speaking ? 'is-speaking' : ''}`} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className="wi__canvas">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 28, position: [0, 1.2, 2.3], near: 0.1, far: 30 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 1.1
          }}
        >
          <ambientLight intensity={0.55} />
          <hemisphereLight args={['#ffffff', '#1a1510', 0.5]} />
          <directionalLight position={[1.5, 2.5, 2.5]} intensity={2.2} />
          <directionalLight position={[-2, 2, -2]} intensity={2.4} color="#d9a441" />
          <Suspense fallback={null}>
            <Rise>
              <GlbAvatar url="/avatars/interviewer.glb" pose="clasped" mood="friendly" speaking={speaking} />
            </Rise>
            <Ready onReady={() => setAvatarReady(true)} />
          </Suspense>
          <CameraRig />
        </Canvas>
      </div>

      <div className="wi__loading" aria-hidden="true">
        <span />
        Entering the interview room…
      </div>

      <div className="wi__caption">
        <div className="wi__plate">
          <span className={`wi__dotlive ${speaking ? 'is-on' : ''}`} />
          <div>
            <p className="wi__name">Alan Turing</p>
            <p className="wi__role">{holding ? 'Getting your room ready…' : 'Your interviewer'}</p>
          </div>
          <div className={`wi__wave ${speaking ? 'is-on' : ''}`} aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <i key={i} style={{ '--d': `${i * 0.09}s` }} />
            ))}
          </div>
        </div>

        <p className="wi__text" aria-live="polite">
          {typed}
          {!typingDone && <span className="wi__cursor" />}
        </p>
      </div>

      <button className="wi__skip" onClick={() => skipRef.current()}>
        Skip intro
      </button>
    </div>
  )
}