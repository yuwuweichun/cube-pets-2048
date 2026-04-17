import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { GRID_SIZE } from '../../game/board'
import { getPetRule, getPetScaleMultiplier, PET_MODEL_MAP } from '../../game/pets'
import type { Board, Tile } from '../../game/types'

type PetTileProps = {
  tile: Tile
  position: [number, number, number]
}

type PopAnimation = {
  amplitude: number
  duration: number
  elapsed: number
}

const CELL_SIZE = 1.95
const HALF_GRID_OFFSET = ((GRID_SIZE - 1) * CELL_SIZE) / 2
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 4, 10)
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0)

function getGridPosition(row: number, col: number): [number, number, number] {
  return [
    col * CELL_SIZE - HALF_GRID_OFFSET,
    0.42,
    row * CELL_SIZE - HALF_GRID_OFFSET,
  ]
}

function PetTile({ tile, position }: PetTileProps) {
  const rule = getPetRule(tile.value)
  const groupRef = useRef<THREE.Group | null>(null)
  const baseMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const initializedRef = useRef(false)
  const targetPosition = useRef(new THREE.Vector3(...position))
  const popAnimationRef = useRef<PopAnimation | null>(null)
  const glowAnimationRef = useRef<{ duration: number; elapsed: number } | null>(null)
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
    if (baseMaterial) {
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

      baseMaterial.emissive.set('#ffd04a')
      baseMaterial.emissiveIntensity = glow * 2.1
    }
  })

  return (
    <group ref={groupRef}>
      <RoundedBox args={[1.42, 0.3, 1.42]} radius={0.14} smoothness={6} receiveShadow>
        <meshStandardMaterial
          ref={baseMaterialRef}
          color="#fff6ea"
          metalness={0.08}
          roughness={0.88}
        />
      </RoundedBox>
      <primitive object={model} position={[0, 0.16, 0]} />
      <Html position={[-0.46, 0.17, 0.47]} transform sprite>
        <div className="pet-badge">
          <strong>{tile.value}</strong>
        </div>
      </Html>
    </group>
  )
}

function BoardCell({ row, col }: { row: number; col: number }) {
  const position = getGridPosition(row, col)

  return (
    <group position={[position[0], 0, position[2]]}>
      <RoundedBox args={[1.56, 0.16, 1.56]} radius={0.18} smoothness={6} receiveShadow>
        <meshStandardMaterial color="#d4b591" roughness={0.9} />
      </RoundedBox>
    </group>
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

type GameSceneProps = {
  board: Board
}

export default function GameScene({ board }: GameSceneProps) {
  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POSITION.toArray() as [number, number, number], fov: 34 }}
      shadows
      dpr={[1, 2]}
    >
      <color attach="background" args={['#f7efe5']} />
      <fog attach="fog" args={['#f7efe5', 10, 20]} />
      <ambientLight intensity={1.55} />
      <hemisphereLight intensity={0.95} groundColor="#bb9367" color="#fff9ef" />
      <directionalLight
        castShadow
        intensity={2.6}
        position={[6, 9, 5]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#f1e0ca" />
      </mesh>

      <group position={[0, 0.08, 0]}>
        <RoundedBox args={[8.95, 0.36, 8.95]} radius={0.26} smoothness={8} receiveShadow>
          <meshStandardMaterial color="#c89f76" roughness={0.92} />
        </RoundedBox>
        {Array.from({ length: GRID_SIZE }, (_, row) =>
          Array.from({ length: GRID_SIZE }, (_, col) => (
            <BoardCell key={`${row}-${col}`} row={row} col={col} />
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
              />
            ) : null,
          ),
        )}
      </Suspense>
      <AutoResetOrbitControls />
    </Canvas>
  )
}
