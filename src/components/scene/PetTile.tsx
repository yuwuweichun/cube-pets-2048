import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getPetRule, getPetScaleMultiplier, PET_MODEL_MAP } from '../../game/pets'
import type { Tile } from '../../game/types'
import {
  DAY_EMISSIVE,
  NIGHT_EMISSIVE,
  SCENE_THEME_CONFIG,
  type SceneTheme,
  type ThemeBlendRef,
} from './sceneShared'

type PopAnimation = {
  amplitude: number
  duration: number
  elapsed: number
}

type PetTileProps = {
  tile: Tile
  position: [number, number, number]
  theme: SceneTheme
  themeBlendRef: ThemeBlendRef
}

export function PetTile({ tile, position, theme, themeBlendRef }: PetTileProps) {
  const rule = getPetRule(tile.value)
  const groupRef = useRef<THREE.Group | null>(null)
  const baseMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const initializedRef = useRef(false)
  const targetPosition = useRef(new THREE.Vector3(...position))
  const popAnimationRef = useRef<PopAnimation | null>(null)
  const glowAnimationRef = useRef<{ duration: number; elapsed: number } | null>(null)
  const dayTileColor = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.day.tileColor), [])
  const nightTileColor = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.night.tileColor), [])
  const workingColor = useMemo(() => new THREE.Color(), [])
  const workingEmissive = useMemo(() => new THREE.Color(), [])
  const { scene } = useGLTF(PET_MODEL_MAP[rule.value])
  const model = useMemo(() => {
    const cloned = scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z) || 1
    const scaleMultiplier = getPetScaleMultiplier(tile.value)

    cloned.position.sub(center)
    cloned.position.y += size.y / 2
    cloned.scale.multiplyScalar((0.98 / maxAxis) * scaleMultiplier)
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    return cloned
  }, [scene, tile.value])

  useLayoutEffect(() => {
    if (!initializedRef.current && groupRef.current) {
      groupRef.current.position.set(...position)
      initializedRef.current = true
    }
  }, [position])

  useEffect(() => {
    targetPosition.current.set(...position)
  }, [position])

  useEffect(() => {
    if (tile.motion === 'merge') {
      popAnimationRef.current = {
        amplitude: 0.18,
        duration: 0.36,
        elapsed: 0,
      }
      glowAnimationRef.current = {
        duration: 0.52,
        elapsed: 0,
      }

      if (groupRef.current) {
        groupRef.current.scale.setScalar(1.14)
      }
      return
    }

    if (tile.motion === 'spawn') {
      popAnimationRef.current = {
        amplitude: 0.1,
        duration: 0.28,
        elapsed: 0,
      }

      if (groupRef.current) {
        groupRef.current.scale.setScalar(1.08)
      }
    }
  }, [tile.motion])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const moveLerp = 1 - Math.exp(-12 * delta)
    group.position.lerp(targetPosition.current, moveLerp)

    let scale = 1
    const popAnimation = popAnimationRef.current
    if (popAnimation) {
      popAnimation.elapsed = Math.min(popAnimation.elapsed + delta, popAnimation.duration)
      const progress = popAnimation.elapsed / popAnimation.duration
      scale = 1 + Math.sin(progress * Math.PI) * popAnimation.amplitude

      if (progress >= 1) {
        popAnimationRef.current = null
      }
    }

    group.scale.setScalar(scale)

    const baseMaterial = baseMaterialRef.current
    if (!baseMaterial) {
      return
    }

    const glowAnimation = glowAnimationRef.current
    let glow = 0

    if (glowAnimation) {
      glowAnimation.elapsed = Math.min(glowAnimation.elapsed + delta, glowAnimation.duration)
      const progress = glowAnimation.elapsed / glowAnimation.duration
      glow = Math.sin(progress * Math.PI)

      if (progress >= 1) {
        glowAnimationRef.current = null
      }
    }

    const blend = themeBlendRef.current
    workingColor.copy(dayTileColor).lerp(nightTileColor, blend)
    workingEmissive.copy(DAY_EMISSIVE).lerp(NIGHT_EMISSIVE, blend)
    baseMaterial.color.copy(workingColor)
    baseMaterial.emissive.copy(workingEmissive)
    baseMaterial.emissiveIntensity = glow * THREE.MathUtils.lerp(2.1, 2.5, blend)
  })

  return (
    <group ref={groupRef}>
      <RoundedBox args={[1.42, 0.3, 1.42]} radius={0.14} smoothness={6} receiveShadow>
        <meshStandardMaterial
          ref={baseMaterialRef}
          color={SCENE_THEME_CONFIG.day.tileColor}
          metalness={0.08}
          roughness={0.88}
        />
      </RoundedBox>
      <primitive object={model} position={[0, 0.16, 0]} />
      <Html position={[-0.46, 0.17, 0.47]} transform sprite zIndexRange={[0, 10]}>
        <div className={`pet-badge ${theme === 'night' ? 'pet-badge-night' : ''}`}>
          <strong>{tile.value}</strong>
        </div>
      </Html>
    </group>
  )
}
