import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  NIGHT_LAMP_CONFIG,
  NIGHT_STAR_FIELD_PLACEMENT,
  NIGHT_STAR_MATERIAL,
  NIGHT_STAR_PULSE,
  SCENE_THEME_CONFIG,
  STAR_LAYERS,
  THEME_BLEND_DAMPING,
  getThemeBlendValue,
  type SceneTheme,
  type StarLayerSpec,
  type ThemeBlendRef,
} from './sceneShared'

function seededUnitValue(seed: number) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453
  return raw - Math.floor(raw)
}

type ThemeBlendControllerProps = {
  theme: SceneTheme
  themeBlendRef: ThemeBlendRef
}

type ThemeBlendOnlyProps = {
  themeBlendRef: ThemeBlendRef
}

type NightStarLayerProps = {
  positions: Float32Array
  spec: StarLayerSpec
  themeBlendRef: ThemeBlendRef
}

function ThemeBlendController({ theme, themeBlendRef }: ThemeBlendControllerProps) {
  useFrame((_, delta) => {
    themeBlendRef.current = THREE.MathUtils.damp(
      themeBlendRef.current,
      getThemeBlendValue(theme),
      THEME_BLEND_DAMPING,
      delta,
    )
  })

  return null
}

function SceneEnvironment({ themeBlendRef }: ThemeBlendOnlyProps) {
  const { scene } = useThree()
  const sceneRef = useRef<THREE.Scene | null>(null)
  const backgroundColor = useMemo(
    () => new THREE.Color(SCENE_THEME_CONFIG.day.background),
    [],
  )
  const fogColor = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.day.fog[0]), [])
  const fogRef = useRef(
    new THREE.Fog(
      SCENE_THEME_CONFIG.day.fog[0],
      SCENE_THEME_CONFIG.day.fog[1],
      SCENE_THEME_CONFIG.day.fog[2],
    ),
  )

  useEffect(() => {
    sceneRef.current = scene
  }, [scene])

  useEffect(() => {
    const targetScene = sceneRef.current
    const fog = fogRef.current
    if (!targetScene) {
      return
    }

    targetScene.background = backgroundColor
    targetScene.fog = fog

    return () => {
      if (targetScene.background === backgroundColor) {
        targetScene.background = null
      }

      if (targetScene.fog === fog) {
        targetScene.fog = null
      }
    }
  }, [backgroundColor])

  useFrame(() => {
    const blend = themeBlendRef.current
    const dayTheme = SCENE_THEME_CONFIG.day
    const nightTheme = SCENE_THEME_CONFIG.night

    backgroundColor.set(dayTheme.background).lerp(new THREE.Color(nightTheme.background), blend)
    fogColor.set(dayTheme.fog[0]).lerp(new THREE.Color(nightTheme.fog[0]), blend)
    fogRef.current.color.copy(fogColor)
    fogRef.current.near = THREE.MathUtils.lerp(dayTheme.fog[1], nightTheme.fog[1], blend)
    fogRef.current.far = THREE.MathUtils.lerp(dayTheme.fog[2], nightTheme.fog[2], blend)
  })

  return null
}

function SceneLights({ themeBlendRef }: ThemeBlendOnlyProps) {
  const ambientRef = useRef<THREE.AmbientLight | null>(null)
  const hemisphereRef = useRef<THREE.HemisphereLight | null>(null)
  const directionalRef = useRef<THREE.DirectionalLight | null>(null)
  const hemisphereSky = useMemo(() => new THREE.Color(), [])
  const hemisphereGround = useMemo(() => new THREE.Color(), [])
  const directionalPosition = useMemo(() => new THREE.Vector3(), [])
  const dayDirectionalPosition = useMemo(
    () => new THREE.Vector3(...SCENE_THEME_CONFIG.day.directionalPosition),
    [],
  )
  const nightDirectionalPosition = useMemo(
    () => new THREE.Vector3(...SCENE_THEME_CONFIG.night.directionalPosition),
    [],
  )

  useFrame(() => {
    const blend = themeBlendRef.current
    const dayTheme = SCENE_THEME_CONFIG.day
    const nightTheme = SCENE_THEME_CONFIG.night

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        dayTheme.ambientIntensity,
        nightTheme.ambientIntensity,
        blend,
      )
    }

    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = THREE.MathUtils.lerp(
        dayTheme.hemisphereIntensity,
        nightTheme.hemisphereIntensity,
        blend,
      )
      hemisphereSky
        .set(dayTheme.hemisphereColor)
        .lerp(new THREE.Color(nightTheme.hemisphereColor), blend)
      hemisphereGround
        .set(dayTheme.hemisphereGroundColor)
        .lerp(new THREE.Color(nightTheme.hemisphereGroundColor), blend)
      hemisphereRef.current.color.copy(hemisphereSky)
      hemisphereRef.current.groundColor.copy(hemisphereGround)
    }

    if (directionalRef.current) {
      directionalRef.current.intensity = THREE.MathUtils.lerp(
        dayTheme.directionalIntensity,
        nightTheme.directionalIntensity,
        blend,
      )
      directionalPosition.copy(dayDirectionalPosition).lerp(nightDirectionalPosition, blend)
      directionalRef.current.position.copy(directionalPosition)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={SCENE_THEME_CONFIG.day.ambientIntensity} />
      <hemisphereLight
        ref={hemisphereRef}
        intensity={SCENE_THEME_CONFIG.day.hemisphereIntensity}
        groundColor={SCENE_THEME_CONFIG.day.hemisphereGroundColor}
        color={SCENE_THEME_CONFIG.day.hemisphereColor}
      />
      <directionalLight
        ref={directionalRef}
        castShadow
        intensity={SCENE_THEME_CONFIG.day.directionalIntensity}
        position={SCENE_THEME_CONFIG.day.directionalPosition}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  )
}

function NightStarLayer({ positions, spec, themeBlendRef }: NightStarLayerProps) {
  const materialRef = useRef<THREE.PointsMaterial | null>(null)

  useFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) {
      return
    }

    const pulse = (Math.sin(clock.getElapsedTime() * spec.speed + spec.phase) + 1) * 0.5
    const nightFactor = themeBlendRef.current
    material.opacity = (spec.opacity + pulse * spec.breath) * nightFactor
    material.size =
      spec.size * THREE.MathUtils.lerp(0.8, 1, nightFactor) +
      pulse * spec.size * NIGHT_STAR_PULSE.sizePulseMultiplier * nightFactor
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={NIGHT_STAR_MATERIAL.color}
        size={spec.size}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        depthTest
        fog
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function NightStars({ themeBlendRef }: ThemeBlendOnlyProps) {
  const layers = useMemo(
    () =>
      STAR_LAYERS.map((spec, layerIndex) => {
        const positions = new Float32Array(spec.count * 3)
        const horizontalSpread =
          NIGHT_STAR_FIELD_PLACEMENT.baseHorizontalSpread +
          layerIndex * NIGHT_STAR_FIELD_PLACEMENT.horizontalSpreadStep
        const depthSpread =
          NIGHT_STAR_FIELD_PLACEMENT.baseDepthSpread +
          layerIndex * NIGHT_STAR_FIELD_PLACEMENT.depthSpreadStep
        const ySpread =
          NIGHT_STAR_FIELD_PLACEMENT.yRange + layerIndex * NIGHT_STAR_FIELD_PLACEMENT.yStep

        for (let index = 0; index < spec.count; index += 1) {
          const stride = index * 3
          const xNoise = seededUnitValue((layerIndex + 1) * 1000 + index * 13 + 1)
          const yNoise = seededUnitValue((layerIndex + 1) * 1000 + index * 13 + 2)
          const zNoise = seededUnitValue((layerIndex + 1) * 1000 + index * 13 + 3)
          positions[stride] =
            NIGHT_STAR_FIELD_PLACEMENT.baseX + (xNoise - 0.5) * horizontalSpread
          positions[stride + 1] =
            NIGHT_STAR_FIELD_PLACEMENT.baseY - yNoise * ySpread
          positions[stride + 2] =
            NIGHT_STAR_FIELD_PLACEMENT.baseZ -
            zNoise * depthSpread * NIGHT_STAR_FIELD_PLACEMENT.depthMultiplier
        }

        return { positions, spec }
      }),
    [],
  )

  return (
    <group>
      {layers.map(({ positions, spec }, index) => (
        <NightStarLayer
          key={`${spec.count}-${index}`}
          positions={positions}
          spec={spec}
          themeBlendRef={themeBlendRef}
        />
      ))}
    </group>
  )
}

function NightLampLight({ themeBlendRef }: ThemeBlendOnlyProps) {
  const spotLightRef = useRef<THREE.SpotLight | null>(null)
  const pointLightRef = useRef<THREE.PointLight | null>(null)
  const targetObject = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const light = spotLightRef.current
    if (!light) {
      return
    }

    targetObject.position.set(...NIGHT_LAMP_CONFIG.targetPosition)
    targetObject.updateMatrixWorld()
    light.target = targetObject
    light.target.updateMatrixWorld()
  }, [targetObject])

  useFrame(() => {
    const blend = themeBlendRef.current

    if (spotLightRef.current) {
      spotLightRef.current.intensity = NIGHT_LAMP_CONFIG.spotIntensity * blend
    }

    if (pointLightRef.current) {
      pointLightRef.current.intensity = NIGHT_LAMP_CONFIG.pointIntensity * blend
    }
  })

  return (
    <>
      <primitive object={targetObject} />
      <spotLight
        ref={spotLightRef}
        castShadow
        position={NIGHT_LAMP_CONFIG.spotPosition}
        angle={NIGHT_LAMP_CONFIG.spotAngle}
        penumbra={NIGHT_LAMP_CONFIG.spotPenumbra}
        intensity={0}
        distance={NIGHT_LAMP_CONFIG.spotDistance}
        color={NIGHT_LAMP_CONFIG.spotColor}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
        shadow-radius={8}
      />
      <pointLight
        ref={pointLightRef}
        position={NIGHT_LAMP_CONFIG.pointPosition}
        intensity={0}
        distance={NIGHT_LAMP_CONFIG.pointDistance}
        color={NIGHT_LAMP_CONFIG.pointColor}
      />
    </>
  )
}

export function SceneAtmosphere({ theme, themeBlendRef }: ThemeBlendControllerProps) {
  return (
    <>
      <ThemeBlendController theme={theme} themeBlendRef={themeBlendRef} />
      <SceneEnvironment themeBlendRef={themeBlendRef} />
      <SceneLights themeBlendRef={themeBlendRef} />
      <NightStars themeBlendRef={themeBlendRef} />
      <NightLampLight themeBlendRef={themeBlendRef} />
    </>
  )
}
