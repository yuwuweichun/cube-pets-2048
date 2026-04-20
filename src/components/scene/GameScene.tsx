import { Suspense, useRef, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Board } from '../../game/types'
import { AutoResetOrbitControls } from './AutoResetOrbitControls'
import { PetTile } from './PetTile'
import { SceneAtmosphere } from './SceneAtmosphere'
import { SceneBoard } from './SceneBoard'
import {
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  DESKTOP_CAMERA_DISTANCE,
  DESKTOP_MAX_CAMERA_DISTANCE,
  DESKTOP_MIN_CAMERA_DISTANCE,
  MOBILE_CAMERA_DISTANCE,
  MOBILE_MAX_CAMERA_DISTANCE,
  MOBILE_MIN_CAMERA_DISTANCE,
  getGridPosition,
  getThemeBlendValue,
  type SceneTheme,
} from './sceneShared'

type GameSceneProps = {
  board: Board
  theme: SceneTheme
}

type SceneContentProps = GameSceneProps & {
  initialDistance: number
  minDistance: number
  maxDistance: number
}

export type { SceneTheme } from './sceneShared'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 720px)'

function subscribeToMobileViewport(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
  mediaQuery.addEventListener('change', onStoreChange)

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange)
  }
}

function getMobileViewportSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
}

function SceneContent({
  board,
  theme,
  initialDistance,
  minDistance,
  maxDistance,
  isMobileViewport,
}: SceneContentProps & { isMobileViewport: boolean }) {
  const themeBlendRef = useRef(getThemeBlendValue(theme))

  return (
    <>
      <SceneAtmosphere theme={theme} themeBlendRef={themeBlendRef} isMobileViewport={isMobileViewport} />
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

      <AutoResetOrbitControls
        initialDistance={initialDistance}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />
    </>
  )
}

export default function GameScene({ board, theme }: GameSceneProps) {
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  )

  const initialDistance = isMobileViewport ? MOBILE_CAMERA_DISTANCE : DESKTOP_CAMERA_DISTANCE
  const minDistance = isMobileViewport ? MOBILE_MIN_CAMERA_DISTANCE : DESKTOP_MIN_CAMERA_DISTANCE
  const maxDistance = isMobileViewport ? MOBILE_MAX_CAMERA_DISTANCE : DESKTOP_MAX_CAMERA_DISTANCE
  const defaultViewDirection = DEFAULT_CAMERA_POSITION.clone().sub(DEFAULT_CAMERA_TARGET).normalize()

  // Keep the initial distance explicit here so mobile/desktop zoom is easy to adjust later.
  const cameraPosition = defaultViewDirection.multiplyScalar(initialDistance).add(DEFAULT_CAMERA_TARGET)

  return (
    <Canvas
      camera={{ position: cameraPosition.toArray() as [number, number, number], fov: DEFAULT_CAMERA_FOV }}
      shadows
      dpr={[1, 2]}
    >
      <SceneContent
        board={board}
        theme={theme}
        initialDistance={initialDistance}
        minDistance={minDistance}
        maxDistance={maxDistance}
        isMobileViewport={isMobileViewport}
      />
    </Canvas>
  )
}
