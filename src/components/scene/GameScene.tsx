import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Board } from '../../game/types'
import { AutoResetOrbitControls } from './AutoResetOrbitControls'
import { PetTile } from './PetTile'
import { SceneAtmosphere } from './SceneAtmosphere'
import { SceneBoard } from './SceneBoard'
import {
  DEFAULT_CAMERA_POSITION,
  getGridPosition,
  getThemeBlendValue,
  type SceneTheme,
} from './sceneShared'

type GameSceneProps = {
  board: Board
  theme: SceneTheme
}

export type { SceneTheme } from './sceneShared'

function SceneContent({ board, theme }: GameSceneProps) {
  const themeBlendRef = useRef(getThemeBlendValue(theme))

  return (
    <>
      <SceneAtmosphere theme={theme} themeBlendRef={themeBlendRef} />
      <SceneBoard themeBlendRef={themeBlendRef} />

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
