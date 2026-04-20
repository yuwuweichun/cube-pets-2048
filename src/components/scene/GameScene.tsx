import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { GRID_SIZE } from '../../game/board'
import { getPetRule, getPetScaleMultiplier, PET_MODEL_MAP } from '../../game/pets'
import type { Board, Tile } from '../../game/types'

export type SceneTheme = 'day' | 'night'

type ThemeBlendRef = MutableRefObject<number>

type PetTileProps = {
  tile: Tile
  position: [number, number, number]
  theme: SceneTheme
  themeBlendRef: ThemeBlendRef
}

type BoardCellProps = {
  row: number
  col: number
  themeBlendRef: ThemeBlendRef
}

type GameSceneProps = {
  board: Board
  theme: SceneTheme
}

type PopAnimation = {
  amplitude: number
  duration: number
  elapsed: number
}

type SceneThemeConfig = {
  background: string
  fog: [string, number, number]
  ambientIntensity: number
  hemisphereIntensity: number
  hemisphereGroundColor: string
  hemisphereColor: string
  directionalIntensity: number
  directionalPosition: [number, number, number]
  floorColor: string
  boardBaseColor: string
  cellColor: string
  tileColor: string
}

type StarLayerSpec = {
  count: number
  size: number
  opacity: number
  breath: number
  speed: number
  phase: number
}

type StarFieldPlacement = {
  baseX: number
  baseHorizontalSpread: number
  horizontalSpreadStep: number
  baseY: number
  yRange: number
  yStep: number
  baseZ: number
  baseDepthSpread: number
  depthSpreadStep: number
  depthMultiplier: number
}

type StarPulseConfig = {
  sizePulseMultiplier: number
}

type StarMaterialConfig = {
  color: string
}

type NightLampConfig = {
  spotPosition: [number, number, number]
  spotAngle: number
  spotPenumbra: number
  spotIntensity: number
  spotDistance: number
  spotColor: string
  pointPosition: [number, number, number]
  pointIntensity: number
  pointDistance: number
  pointColor: string
  targetPosition: [number, number, number]
}

const CELL_SIZE = 1.95
const HALF_GRID_OFFSET = ((GRID_SIZE - 1) * CELL_SIZE) / 2
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 4, 10)
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0)
const THEME_BLEND_DAMPING = 4.8

const NIGHT_STAR_FIELD_PLACEMENT: StarFieldPlacement = {
  // 星点群在 X 轴上的中心点。改它会让整片星点整体向左或向右平移。
  baseX: 0,
  // 星点左右分布的基础宽度。越大，画面左右两侧越容易出现星点。
  baseHorizontalSpread: 20,
  // 每层额外增加的左右宽度。越大，远层比近层铺得更开。
  horizontalSpreadStep: 7,
  // 星点群在 Y 轴上的起点。改它会让整片星点整体上移或下移。
  baseY: 0.5,
  // 单层在 Y 轴上的随机浮动范围。越大，上下分布越松。
  yRange: 2.2,
  // 每层额外增加的 Y 浮动。越大，后层上下差异更明显。
  yStep: 0.6,
  // 星点群在 Z 轴上的起点。改它会让整片星点整体更靠前或更靠后。
  baseZ: 9,
  // 单层在 Z 轴上的基础纵深范围。越大，星点从近到远拉得更长。
  baseDepthSpread: 4,
  // 每层额外增加的纵深。越大，远层比近层退得更远。
  depthSpreadStep: 1,
  // 纵深放大倍数。越大，Z 方向整体后移得更夸张。
  depthMultiplier: 4,
}

const NIGHT_STAR_PULSE: StarPulseConfig = {
  // 呼吸时的尺寸放大倍数。越大，星点大小变化越明显。
  sizePulseMultiplier: 1.05,
}

const NIGHT_STAR_MATERIAL: StarMaterialConfig = {
  // 星点颜色。偏蓝会更冷，偏白会更亮、更抢眼。
  color: '#eef5ff',
}

const NIGHT_LAMP_CONFIG: NightLampConfig = {
  spotPosition: [0.5, 10.8, 3.4],
  spotAngle: 0.48,
  spotPenumbra: 0.88,
  spotIntensity: 34,
  spotDistance: 30,
  spotColor: '#ffe3a6',
  pointPosition: [0.45, 10.1, 3.1],
  pointIntensity: 2.2,
  pointDistance: 8.5,
  pointColor: '#ffd98f',
  targetPosition: [0, 0.3, 0],
}

const STAR_LAYERS: StarLayerSpec[] = [
  // `count`: 数量，越大越密。
  // `size`: 基础尺寸，越大越显眼。
  // `opacity`: 基础透明度，越大越亮。
  // `breath`: 呼吸亮度增量，越大明暗变化越明显。
  // `speed`: 呼吸速度，越大闪烁越快。
  // `phase`: 相位偏移，用来打散多层同步闪烁。
  { count: 100, size: 0.1, opacity: 0.8, breath: 0.34, speed: 0.78, phase: 0 },
  { count: 60, size: 0.15, opacity: 0.4, breath: 0.38, speed: 1.04, phase: 1.7 },
  { count: 20, size: 0.2, opacity: 0.9, breath: 0.44, speed: 0.62, phase: 3.1 },
]

const SCENE_THEME_CONFIG: Record<SceneTheme, SceneThemeConfig> = {
  day: {
    background: '#f7efe5',
    fog: ['#f7efe5', 10, 20],
    ambientIntensity: 1.55,
    hemisphereIntensity: 0.95,
    hemisphereGroundColor: '#bb9367',
    hemisphereColor: '#fff9ef',
    directionalIntensity: 2.6,
    directionalPosition: [6, 9, 5],
    floorColor: '#f1e0ca',
    boardBaseColor: '#c89f76',
    cellColor: '#d4b591',
    tileColor: '#fff6ea',
  },
  night: {
    background: '#07111f',
    fog: ['#07111f', 11.5, 24],
    ambientIntensity: 0.34,
    hemisphereIntensity: 0.36,
    hemisphereGroundColor: '#130f17',
    hemisphereColor: '#2e4772',
    directionalIntensity: 0.42,
    directionalPosition: [5.5, 10.5, 4.5],
    floorColor: '#101826',
    boardBaseColor: '#634d40',
    cellColor: '#816554',
    tileColor: '#efe7dd',
  },
}

const DAY_EMISSIVE = new THREE.Color('#ffd04a')
const NIGHT_EMISSIVE = new THREE.Color('#ffd786')

function getGridPosition(row: number, col: number): [number, number, number] {
  return [
    col * CELL_SIZE - HALF_GRID_OFFSET,
    0.42,
    row * CELL_SIZE - HALF_GRID_OFFSET,
  ]
}

function getThemeBlendValue(theme: SceneTheme) {
  return theme === 'night' ? 1 : 0
}

function ThemeBlendController({
  theme,
  themeBlendRef,
}: {
  theme: SceneTheme
  themeBlendRef: ThemeBlendRef
}) {
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

function SceneEnvironment({ themeBlendRef }: { themeBlendRef: ThemeBlendRef }) {
  const { scene } = useThree()
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
    scene.background = backgroundColor
    scene.fog = fogRef.current

    return () => {
      if (scene.background === backgroundColor) {
        scene.background = null
      }

      if (scene.fog === fogRef.current) {
        scene.fog = null
      }
    }
  }, [backgroundColor, scene])

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

function SceneLights({ themeBlendRef }: { themeBlendRef: ThemeBlendRef }) {
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

function PetTile({ tile, position, theme, themeBlendRef }: PetTileProps) {
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
      <Html position={[-0.46, 0.17, 0.47]} transform sprite>
        <div className={`pet-badge ${theme === 'night' ? 'pet-badge-night' : ''}`}>
          <strong>{tile.value}</strong>
        </div>
      </Html>
    </group>
  )
}

function BoardCell({ row, col, themeBlendRef }: BoardCellProps) {
  const position = getGridPosition(row, col)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const dayColor = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.day.cellColor), [])
  const nightColor = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.night.cellColor), [])
  const workingColor = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const material = materialRef.current
    if (!material) {
      return
    }

    workingColor.copy(dayColor).lerp(nightColor, themeBlendRef.current)
    material.color.copy(workingColor)
  })

  return (
    <group position={[position[0], 0, position[2]]}>
      <RoundedBox args={[1.56, 0.16, 1.56]} radius={0.18} smoothness={6} receiveShadow>
        <meshStandardMaterial
          ref={materialRef}
          color={SCENE_THEME_CONFIG.day.cellColor}
          roughness={0.9}
        />
      </RoundedBox>
    </group>
  )
}

function NightStarLayer({
  positions,
  spec,
  themeBlendRef,
}: {
  positions: Float32Array
  spec: StarLayerSpec
  themeBlendRef: ThemeBlendRef
}) {
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

function NightStars({ themeBlendRef }: { themeBlendRef: ThemeBlendRef }) {
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

          // X 轴：以 baseX 为中心，向左右随机铺开。
          positions[stride] =
            NIGHT_STAR_FIELD_PLACEMENT.baseX + (Math.random() - 0.5) * horizontalSpread
          // Y 轴：以 baseY 为起点，向下随机分布。
          positions[stride + 1] =
            NIGHT_STAR_FIELD_PLACEMENT.baseY - Math.random() * ySpread
          // Z 轴：以 baseZ 为起点，向远处随机延展。
          positions[stride + 2] =
            NIGHT_STAR_FIELD_PLACEMENT.baseZ -
            Math.random() * depthSpread * NIGHT_STAR_FIELD_PLACEMENT.depthMultiplier
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

function NightLampLight({ themeBlendRef }: { themeBlendRef: ThemeBlendRef }) {
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

function BoardSurface({ themeBlendRef }: { themeBlendRef: ThemeBlendRef }) {
  const floorMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const boardMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const floorDay = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.day.floorColor), [])
  const floorNight = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.night.floorColor), [])
  const boardDay = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.day.boardBaseColor), [])
  const boardNight = useMemo(() => new THREE.Color(SCENE_THEME_CONFIG.night.boardBaseColor), [])
  const workingFloorColor = useMemo(() => new THREE.Color(), [])
  const workingBoardColor = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const blend = themeBlendRef.current

    if (floorMaterialRef.current) {
      workingFloorColor.copy(floorDay).lerp(floorNight, blend)
      floorMaterialRef.current.color.copy(workingFloorColor)
    }

    if (boardMaterialRef.current) {
      workingBoardColor.copy(boardDay).lerp(boardNight, blend)
      boardMaterialRef.current.color.copy(workingBoardColor)
    }
  })

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial ref={floorMaterialRef} color={SCENE_THEME_CONFIG.day.floorColor} />
      </mesh>

      <group position={[0, 0.08, 0]}>
        <RoundedBox args={[8.95, 0.36, 8.95]} radius={0.26} smoothness={8} receiveShadow>
          <meshStandardMaterial
            ref={boardMaterialRef}
            color={SCENE_THEME_CONFIG.day.boardBaseColor}
            roughness={0.92}
          />
        </RoundedBox>
      </group>
    </>
  )
}

function AutoResetOrbitControls() {
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

function SceneContent({ board, theme }: GameSceneProps) {
  const themeBlendRef = useRef(getThemeBlendValue(theme))

  return (
    <>
      <ThemeBlendController theme={theme} themeBlendRef={themeBlendRef} />
      <SceneEnvironment themeBlendRef={themeBlendRef} />
      <SceneLights themeBlendRef={themeBlendRef} />
      <NightStars themeBlendRef={themeBlendRef} />
      <NightLampLight themeBlendRef={themeBlendRef} />
      <BoardSurface themeBlendRef={themeBlendRef} />

      <group position={[0, 0.08, 0]}>
        {Array.from({ length: GRID_SIZE }, (_, row) =>
          Array.from({ length: GRID_SIZE }, (_, col) => (
            <BoardCell
              key={`${row}-${col}`}
              row={row}
              col={col}
              themeBlendRef={themeBlendRef}
            />
          )),
        )}
      </group>

      <Suspense fallback={null}>
        {board.flatMap((row, rowIndex) =>
          row.map((tile, colIndex) =>
            tile ? (
              <PetTile
                key={tile.id}
                tile={tile}
                position={getGridPosition(rowIndex, colIndex)}
                theme={theme}
                themeBlendRef={themeBlendRef}
              />
            ) : null,
          ),
        )}
      </Suspense>

      <AutoResetOrbitControls />
    </>
  )
}

export default function GameScene({ board, theme }: GameSceneProps) {
  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POSITION.toArray() as [number, number, number], fov: 34 }}
      shadows
      dpr={[1, 2]}
    >
      <SceneContent board={board} theme={theme} />
    </Canvas>
  )
}
