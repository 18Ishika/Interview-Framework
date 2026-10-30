import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Starts the webcam + MediaPipe. Returns a ref; call ref.current?.detect() each frame.
export default function useFaceTracking(enabled = true) {
  const api = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    let stream, landmarker, cancelled = false
    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true

    ;(async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      video.srcObject = stream
      await video.play()

      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      )
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        numFaces: 1,
      })
      if (cancelled) return

      let lastTime = -1
      api.current = {
        result: null,
        detect() {
          if (video.currentTime === lastTime) return
          lastTime = video.currentTime
          this.result = landmarker.detectForVideo(video, performance.now())
        },
      }
    })().catch((e) => console.error('Face tracking failed:', e))

    return () => {
      cancelled = true
      api.current = null
      stream?.getTracks().forEach((t) => t.stop())
      landmarker?.close()
    }
  }, [enabled])

  return api
}