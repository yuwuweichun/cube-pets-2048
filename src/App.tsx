import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import GameHud from './components/hud/GameHud'
import type { Direction } from './game/types'
import './App.css'

type Tile = {
  id: number
  value: number
  motion: 'idle' | 'spawn' | 'merge'
}

type Board = Array<Array<Tile | null>>

type GameState = {
  board: Board
  score: number
  gameOver: boolean
}

type MergeResult = {
  tiles: Array<Tile | null>
  changed: boolean
  gained: number
}

type PetTileProps = {
  tile: Tile
  position: [number, number, number]
}

type PopAnimation = {
  amplitude: number
  duration: number
  elapsed: number
}

type HudPopKey = 'score' | 'bestPet'

const GRID_SIZE = 4
const CELL_SIZE = 1.95
const HALF_GRID_OFFSET = ((GRID_SIZE - 1) * CELL_SIZE) / 2
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 4, 10) // 默认相机位置
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0.7, 0)

const PET_RULES = [
  { value: 2, file: 'animal-beaver.glb', name: 'Beaver' },
  { value: 4, file: 'animal-bee.glb', name: 'Bee' },
  { value: 8, file: 'animal-bunny.glb', name: 'Bunny' },
  { value: 16, file: 'animal-cat.glb', name: 'Cat' },
  { value: 32, file: 'animal-caterpillar.glb', name: 'Caterpillar' },
  { value: 64, file: 'animal-chick.glb', name: 'Chick' },
  { value: 128, file: 'animal-cow.glb', name: 'Cow' },
  { value: 256, file: 'animal-crab.glb', name: 'Crab' },
  { value: 512, file: 'animal-deer.glb', name: 'Deer' },
  { value: 1024, file: 'animal-dog.glb', name: 'Dog' },
  { value: 2048, file: 'animal-elephant.glb', name: 'Elephant' },
] as const

const PET_MODEL_MAP = Object.fromEntries(
  PET_RULES.map(({ value, file }) => [value, `/models/pets/${file}`]),
) as Record<(typeof PET_RULES)[number]['value'], string>

PET_RULES.forEach(({ value }) => {
  useGLTF.preload(PET_MODEL_MAP[value])
})

let nextTileId = 1

function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array<Tile | null>(GRID_SIZE).fill(null))
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((tile) => (tile ? { ...tile } : null)))
}

function createRandomTile(): Tile {
  return {
    id: nextTileId++,
    value: Math.random() < 0.9 ? 2 : 4,
    motion: 'spawn',
  }
}

function normalizeBoardMotion(board: Board): Board {
  return board.map((row) =>
    row.map((tile) => (tile ? { ...tile, motion: 'idle' } : null)),
  )
}

function getEmptyCells(board: Board) {
  const cells: Array<{ row: number; col: number }> = []

  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (!tile) {
        cells.push({ row: rowIndex, col: colIndex })
      }
    })
  })

  return cells
}

function placeRandomTile(board: Board): Board {
  const nextBoard = cloneBoard(board)
  const emptyCells = getEmptyCells(nextBoard)

  if (emptyCells.length === 0) {
    return nextBoard
  }

  const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  nextBoard[row][col] = createRandomTile()
  return nextBoard
}

function buildInitialState(): GameState {
  let board = createEmptyBoard()
  board = placeRandomTile(board)
  board = placeRandomTile(board)

  return {
    board,
    score: 0,
    gameOver: false,
  }
}

function compactTiles(line: Array<Tile | null>): Tile[] {
  return line.filter((tile): tile is Tile => tile !== null)
}

function mergeLine(line: Array<Tile | null>): MergeResult {
  const compacted = compactTiles(line)
  const merged: Array<Tile | null> = []
  let gained = 0
  let changed = compacted.length !== line.length

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index]
    const next = compacted[index + 1]

    if (next && current.value === next.value) {
      const value = current.value * 2
      merged.push({
        id: nextTileId++,
        value,
        motion: 'merge',
      })
      gained += value
      changed = true
      index += 1
    } else {
      merged.push(current)
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push(null)
  }

  const sameOrder = merged.every((tile, index) => tile?.id === line[index]?.id)

  return {
    tiles: merged,
    changed: changed || !sameOrder,
    gained,
  }
}

function transpose(board: Board): Board {
  return Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
    Array.from({ length: GRID_SIZE }, (_, colIndex) => {
      const tile = board[colIndex][rowIndex]
      return tile ? { ...tile } : null
    }),
  )
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse())
}

function hasAvailableMoves(board: Board) {
  if (getEmptyCells(board).length > 0) {
    return true
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = board[row][col]
      const right = board[row][col + 1]
      const down = board[row + 1]?.[col]

      if ((right && tile?.value === right.value) || (down && tile?.value === down.value)) {
        return true
      }
    }
  }

  return false
}

function moveBoard(board: Board, direction: Direction) {
  let working = cloneBoard(board)

  if (direction === 'right') {
    working = reverseRows(working)
  }

  if (direction === 'up' || direction === 'down') {
    working = transpose(working)
  }

  if (direction === 'down') {
    working = reverseRows(working)
  }

  let changed = false
  let gained = 0
  const mergedRows = working.map((row) => {
    const result = mergeLine(row)
    changed = changed || result.changed
    gained += result.gained
    return result.tiles
  })

  let nextBoard = mergedRows

  if (direction === 'down') {
    nextBoard = reverseRows(nextBoard)
  }

  if (direction === 'up' || direction === 'down') {
    nextBoard = transpose(nextBoard)
  }

  if (direction === 'right') {
    nextBoard = reverseRows(nextBoard)
  }

  return {
    board: nextBoard,
    changed,
    gained,
  }
}

function getGridPosition(row: number, col: number): [number, number, number] {
  return [
    col * CELL_SIZE - HALF_GRID_OFFSET,
    0.42,
    row * CELL_SIZE - HALF_GRID_OFFSET,
  ]
}

function getPetRule(value: number) {
  const match = PET_RULES.find((rule) => rule.value === value)
  return match ?? PET_RULES[PET_RULES.length - 1]
}

function getBestPetLabel(value: number) {
  if (value <= 0) {
    return 'None'
  }

  const petRule = PET_RULES.find((rule) => rule.value === value)
  return petRule ? `${petRule.name} ${value}` : `${value}`
}

function getPetScaleMultiplier(value: number) {
  const ruleIndex = PET_RULES.findIndex((rule) => rule.value === value)
  const safeIndex = Math.max(ruleIndex, 0)

  return Math.min(0.86 + safeIndex * 0.033, 1.18)
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

function GameScene({ board }: { board: Board }) {
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

function App() {
  const [game, setGame] = useState<GameState>(() => buildInitialState())
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null)
  const [poppingStat, setPoppingStat] = useState<Record<HudPopKey, boolean>>({
    score: false,
    bestPet: false,
  })
  const feedbackTimeoutRef = useRef<number | null>(null)
  const scorePopTimeoutRef = useRef<number | null>(null)
  const bestPetPopTimeoutRef = useRef<number | null>(null)
  const previousScoreRef = useRef(game.score)
  const previousMaxTileRef = useRef(0)

  function triggerStatPop(key: HudPopKey) {
    const timeoutRef = key === 'score' ? scorePopTimeoutRef : bestPetPopTimeoutRef

    setPoppingStat((current) => ({ ...current, [key]: true }))

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setPoppingStat((current) => ({ ...current, [key]: false }))
      timeoutRef.current = null
    }, 260)
  }

  function flashDirection(direction: Direction) {
    setActiveDirection(direction)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActiveDirection(null)
      feedbackTimeoutRef.current = null
    }, 160)
  }

  function executeMove(direction: Direction) {
    flashDirection(direction)
    setGame((current) => {
      if (current.gameOver) {
        return current
      }

      const moved = moveBoard(normalizeBoardMotion(current.board), direction)
      if (!moved.changed) {
        return current
      }

      const withSpawn = placeRandomTile(moved.board)
      return {
        board: withSpawn,
        score: current.score + moved.gained,
        gameOver: !hasAvailableMoves(withSpawn),
      }
    })
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const directionMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        a: 'left',
        s: 'down',
        d: 'right',
      }

      const direction = directionMap[event.key]
      if (!direction) {
        return
      }

      event.preventDefault()
      executeMove(direction)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const maxTile = Math.max(
    ...game.board.flatMap((row) => row.map((tile) => tile?.value ?? 0)),
    0,
  )
  const bestPetLabel = getBestPetLabel(maxTile)

  useEffect(() => {
    if (game.score > previousScoreRef.current) {
      triggerStatPop('score')
    }

    previousScoreRef.current = game.score
  }, [game.score])

  useEffect(() => {
    if (maxTile > previousMaxTileRef.current) {
      triggerStatPop('bestPet')
    }

    previousMaxTileRef.current = maxTile
  }, [maxTile])

  function restartGame() {
    setGame(buildInitialState())
  }

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
      if (scorePopTimeoutRef.current) {
        window.clearTimeout(scorePopTimeoutRef.current)
      }
      if (bestPetPopTimeoutRef.current) {
        window.clearTimeout(bestPetPopTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="canvas-panel canvas-panel-full">
        <GameScene board={game.board} />
        <GameHud
          score={game.score}
          bestPetLabel={bestPetLabel}
          isScorePopping={poppingStat.score}
          isBestPetPopping={poppingStat.bestPet}
          activeDirection={activeDirection}
          isGameOver={game.gameOver}
          onRestart={restartGame}
          onMove={executeMove}
        />
      </section>
    </main>
  )
}

export default App
