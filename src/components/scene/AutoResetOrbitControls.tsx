import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from './sceneShared'

type AutoResetOrbitControlsProps = {
  minDistance: number
  maxDistance: number
  initialDistance: number
}

export function AutoResetOrbitControls({
  minDistance,
  maxDistance,
  initialDistance,
}: AutoResetOrbitControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const resetDistanceRef = useRef(initialDistance)
  const desiredTargetRef = useRef(DEFAULT_CAMERA_TARGET.clone())
  const desiredPositionRef = useRef(DEFAULT_CAMERA_POSITION.clone())
  const defaultViewDirection = useMemo(
    () => DEFAULT_CAMERA_POSITION.clone().sub(DEFAULT_CAMERA_TARGET).normalize(),
    [],
  )

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (isResetting) {
      const damping = 1 - Math.exp(-4.5 * delta)
      desiredTargetRef.current.lerp(DEFAULT_CAMERA_TARGET, damping)
      desiredPositionRef.current
        .copy(defaultViewDirection)
        .multiplyScalar(resetDistanceRef.current)
        .add(desiredTargetRef.current)

      controls.object.position.lerp(desiredPositionRef.current, damping)
      controls.target.copy(desiredTargetRef.current)
      controls.update()

      const closeEnough =
        controls.object.position.distanceTo(desiredPositionRef.current) < 0.03 &&
        controls.target.distanceTo(DEFAULT_CAMERA_TARGET) < 0.03

      if (closeEnough) {
        controls.object.position.copy(desiredPositionRef.current)
        controls.target.copy(DEFAULT_CAMERA_TARGET)
        controls.update()
        setIsResetting(false)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      target={DEFAULT_CAMERA_TARGET.toArray()}
      minPolarAngle={0.6}
      maxPolarAngle={1.15}
      minDistance={minDistance}
      maxDistance={maxDistance}
      onStart={() => setIsResetting(false)}
      onEnd={() => {
        const controls = controlsRef.current
        if (!controls) {
          return
        }

        resetDistanceRef.current = THREE.MathUtils.clamp(
          controls.object.position.distanceTo(controls.target),
          minDistance,
          maxDistance,
        )
        desiredTargetRef.current.copy(controls.target)
        setIsResetting(true)
      }}
    />
  )
}
