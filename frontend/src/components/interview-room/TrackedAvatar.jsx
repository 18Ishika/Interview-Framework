import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

export default function TrackedAvatar({ trackerRef, url = '/models/avatar.glb' }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => clone(scene), [scene])
  const morphMeshes = useRef([])
  const head = useRef(null)
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const euler = useMemo(() => new THREE.Euler(), [])

  useEffect(() => {
    const list = []
    model.traverse((o) => {
      if (o.morphTargetInfluences && o.morphTargetDictionary) list.push(o)
    })
    morphMeshes.current = list
    head.current = model.getObjectByName('Head') // bone name depends on your model
  }, [model])

  useFrame(() => {
    const tracker = trackerRef.current
    if (!tracker) return
    tracker.detect()
    const r = tracker.result
    if (!r) return

    const shapes = r.faceBlendshapes?.[0]?.categories
    if (shapes) {
      for (const mesh of morphMeshes.current) {
        for (const { categoryName, score } of shapes) {
          const i = mesh.morphTargetDictionary[categoryName]
          if (i !== undefined) {
            // light smoothing so it doesn't jitter
            mesh.morphTargetInfluences[i] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[i], score, 0.5)
          }
        }
      }
    }

    const mat = r.facialTransformationMatrixes?.[0]?.data
    if (mat && head.current) {
      m4.fromArray(mat)
      euler.setFromRotationMatrix(m4)
      // flip signs here if the head moves the wrong way (webcam is mirrored)
      head.current.rotation.set(-euler.x * 0.8, -euler.y * 0.8, euler.z * 0.8)
    }
  })

  // origin is at the feet, so lift/scale so the hips land on the chair seat
  return <primitive object={model} position={[0, 0.0, 0]} scale={1} />
}