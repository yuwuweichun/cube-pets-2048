import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from './sceneShared'

export function AutoResetOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    if (isResetting) {
      const damping = 1 - Math.exp(-4.5 * delta)
      controls.object.position.lerp(DEFAULT_CAMERA_POSITION, damping)
      controls.target.lerp(DEFAULT_CAMERA_TARGET, damping)
      controls.update()

      const closeEnough =
        controls.object.position.distanceTo(DEFAULT_CAMERA_POSITION) < 0.03 &&
        controls.target.distanceTo(DEFAULT_CAMERA_TARGET) < 0.03

      if (closeEnough) {
        controls.object.position.copy(DEFAULT_CAMERA_POSITION)
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
      minDistance={5.5}
      maxDistance={18}
      onStart={() => setIsResetting(false)}
      onEnd={() => setIsResetting(true)}
    />
  )
}
