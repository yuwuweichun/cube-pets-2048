import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { GRID_SIZE } from '../../game/board'
import {
  SCENE_THEME_CONFIG,
  getGridPosition,
  type ThemeBlendRef,
} from './sceneShared'
import * as THREE from 'three'

type SceneBoardProps = {
  themeBlendRef: ThemeBlendRef
}

type BoardCellProps = {
  row: number
  col: number
  themeBlendRef: ThemeBlendRef
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

function BoardSurface({ themeBlendRef }: SceneBoardProps) {
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

export function SceneBoard({ themeBlendRef }: SceneBoardProps) {
  return (
    <>
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
    </>
  )
}
