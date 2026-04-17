import { useEffect, useRef, useState } from 'react'
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
