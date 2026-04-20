import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameAudio } from './audio/useGameAudio'
import GameHud from './components/hud/GameHud'
import GameScene from './components/scene/GameScene'
import {
  buildInitialState,
  hasAvailableMoves,
  moveBoard,
  normalizeBoardMotion,
  placeRandomTile,
} from './game/board'
import { getBestPetLabel } from './game/pets'
import type { Direction, GameState, HudPopKey } from './game/types'
import './App.css'

type AppState = {
  game: GameState
  statPopVersion: Record<HudPopKey, number>
}

function getMaxTile(board: GameState['board']) {
  return Math.max(...board.flatMap((row) => row.map((tile) => tile?.value ?? 0)), 0)
}

function buildNextAppState(current: AppState, direction: Direction) {
  if (current.game.gameOver) {
    return { nextState: current, shouldPlayMoveSound: false }
  }

  const moved = moveBoard(normalizeBoardMotion(current.game.board), direction)
  if (!moved.changed) {
    return { nextState: current, shouldPlayMoveSound: false }
  }

  const withSpawn = placeRandomTile(moved.board)
  const nextGame = {
    board: withSpawn,
    score: current.game.score + moved.gained,
    gameOver: !hasAvailableMoves(withSpawn),
  }

  return {
    nextState: {
      game: nextGame,
      statPopVersion: {
        score: current.statPopVersion.score + (nextGame.score > current.game.score ? 1 : 0),
        bestPet:
          current.statPopVersion.bestPet +
          (getMaxTile(nextGame.board) > getMaxTile(current.game.board) ? 1 : 0),
      },
    },
    shouldPlayMoveSound: true,
  }
}

function App() {
  const [appState, setAppState] = useState<AppState>(() => ({
    game: buildInitialState(),
    statPopVersion: {
      score: 0,
      bestPet: 0,
    },
  }))
  const appStateRef = useRef(appState)
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const previousGameOverRef = useRef(appState.game.gameOver)
  const { game, statPopVersion } = appState
  const { isMusicEnabled, playGameOverSound, playMoveSound, toggleMusic } = useGameAudio()

  const flashDirection = useCallback((direction: Direction) => {
    setActiveDirection(direction)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActiveDirection(null)
      feedbackTimeoutRef.current = null
    }, 160)
  }, [])

  const executeMove = useCallback((direction: Direction) => {
    flashDirection(direction)

    const { nextState, shouldPlayMoveSound } = buildNextAppState(appStateRef.current, direction)
    if (nextState !== appStateRef.current) {
      appStateRef.current = nextState
      setAppState(nextState)
    }

    if (shouldPlayMoveSound) {
      playMoveSound()
    }
  }, [flashDirection, playMoveSound])

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
  }, [executeMove])

  const maxTile = getMaxTile(game.board)
  const bestPetLabel = getBestPetLabel(maxTile)

  function restartGame() {
    const nextState = {
      game: buildInitialState(),
      statPopVersion: appStateRef.current.statPopVersion,
    }
    appStateRef.current = nextState
    setAppState(nextState)
  }

  useEffect(() => {
    appStateRef.current = appState
  }, [appState])

  useEffect(() => {
    if (!previousGameOverRef.current && game.gameOver) {
      playGameOverSound()
    }

    previousGameOverRef.current = game.gameOver
  }, [game.gameOver, playGameOverSound])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
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
          scorePopVersion={statPopVersion.score}
          bestPetPopVersion={statPopVersion.bestPet}
          activeDirection={activeDirection}
          isGameOver={game.gameOver}
          isMusicEnabled={isMusicEnabled}
          onToggleMusic={toggleMusic}
          onRestart={restartGame}
          onMove={executeMove}
        />
      </section>
    </main>
  )
}

export default App
