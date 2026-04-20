import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameAudio } from './audio/useGameAudio'
import GameHud from './components/hud/GameHud'
import LeaderboardModal from './components/hud/LeaderboardModal'
import ScoreSubmitModal from './components/hud/ScoreSubmitModal'
import GameScene, { type SceneTheme } from './components/scene/GameScene'
import {
  buildInitialState,
  hasAvailableMoves,
  moveBoard,
  normalizeBoardMotion,
  placeRandomTile,
} from './game/board'
import { getBestPetLabel } from './game/pets'
import { fetchLeaderboard, submitLeaderboardScore, type LeaderboardEntry } from './lib/leaderboard'
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
  const [sceneTheme, setSceneTheme] = useState<SceneTheme>('day')
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [leaderboardInfoMessage, setLeaderboardInfoMessage] = useState<string | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const previousGameOverRef = useRef(appState.game.gameOver)
  const { game, statPopVersion } = appState
  const { isMusicEnabled, playGameOverSound, playMoveSound, toggleMusic } = useGameAudio()
  const isModalOpen = isSubmitModalOpen || isLeaderboardOpen

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
    if (isModalOpen) {
      return
    }

    flashDirection(direction)

    const { nextState, shouldPlayMoveSound } = buildNextAppState(appStateRef.current, direction)
    if (nextState !== appStateRef.current) {
      appStateRef.current = nextState
      setAppState(nextState)
    }

    if (shouldPlayMoveSound) {
      playMoveSound()
    }
  }, [flashDirection, isModalOpen, playMoveSound])

  const loadLeaderboard = useCallback(async () => {
    setIsLeaderboardLoading(true)
    setLeaderboardError(null)

    try {
      const entries = await fetchLeaderboard(10)
      setLeaderboardEntries(entries)
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : '排行榜加载失败，请稍后重试。')
    } finally {
      setIsLeaderboardLoading(false)
    }
  }, [])

  const openLeaderboard = useCallback(() => {
    setLeaderboardInfoMessage(null)
    setIsLeaderboardOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isModalOpen && event.key === 'Escape') {
        if (isSubmitModalOpen && !isSubmittingScore) {
          setIsSubmitModalOpen(false)
          setSubmitError(null)
        } else if (isLeaderboardOpen) {
          setIsLeaderboardOpen(false)
          setLeaderboardInfoMessage(null)
        }

        return
      }

      if (isModalOpen) {
        return
      }

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
  }, [executeMove, isLeaderboardOpen, isModalOpen, isSubmitModalOpen, isSubmittingScore])

  const maxTile = getMaxTile(game.board)
  const bestPetLabel = getBestPetLabel(maxTile)

  function restartGame() {
    const nextState = {
      game: buildInitialState(),
      statPopVersion: appStateRef.current.statPopVersion,
    }
    appStateRef.current = nextState
    setAppState(nextState)
    setIsSubmitModalOpen(false)
    setIsLeaderboardOpen(false)
    setPlayerName('')
    setHasSubmittedScore(false)
    setIsSubmittingScore(false)
    setSubmitError(null)
    setLeaderboardInfoMessage(null)
  }

  const toggleTheme = useCallback(() => {
    setSceneTheme((currentTheme) => (currentTheme === 'day' ? 'night' : 'day'))
  }, [])

  useEffect(() => {
    appStateRef.current = appState
  }, [appState])

  useEffect(() => {
    if (!previousGameOverRef.current && game.gameOver) {
      playGameOverSound()
      if (!hasSubmittedScore) {
        setSubmitError(null)
        setIsSubmitModalOpen(true)
      }
    }

    previousGameOverRef.current = game.gameOver
  }, [game.gameOver, hasSubmittedScore, playGameOverSound])

  useEffect(() => {
    if (!isLeaderboardOpen) {
      return
    }

    void loadLeaderboard()
  }, [isLeaderboardOpen, loadLeaderboard])

  async function handleSubmitScore() {
    const trimmedName = playerName.trim()
    if (!trimmedName || isSubmittingScore) {
      return
    }

    setIsSubmittingScore(true)
    setSubmitError(null)

    try {
      await submitLeaderboardScore({
        playerName: trimmedName,
        score: game.score,
        bestPet: bestPetLabel,
      })

      setPlayerName(trimmedName)
      setHasSubmittedScore(true)
      setIsSubmitModalOpen(false)
      setLeaderboardInfoMessage('成绩上传成功，已经为你刷新排行榜。')
      setIsLeaderboardOpen(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '成绩上传失败，请稍后再试。')
    } finally {
      setIsSubmittingScore(false)
    }
  }

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
        <GameScene board={game.board} theme={sceneTheme} />
        <GameHud
          score={game.score}
          bestPetLabel={bestPetLabel}
          scorePopVersion={statPopVersion.score}
          bestPetPopVersion={statPopVersion.bestPet}
          activeDirection={activeDirection}
          isMusicEnabled={isMusicEnabled}
          isLeaderboardOpen={isLeaderboardOpen}
          theme={sceneTheme}
          onOpenLeaderboard={openLeaderboard}
          onToggleMusic={toggleMusic}
          onToggleTheme={toggleTheme}
          onRestart={restartGame}
          onMove={executeMove}
        />
        {isSubmitModalOpen ? (
          <ScoreSubmitModal
            bestPetLabel={bestPetLabel}
            isSubmitting={isSubmittingScore}
            playerName={playerName}
            score={game.score}
            submitError={submitError}
            theme={sceneTheme}
            onCancel={() => {
              if (isSubmittingScore) {
                return
              }

              setIsSubmitModalOpen(false)
              setSubmitError(null)
            }}
            onChangePlayerName={setPlayerName}
            onSubmit={() => {
              void handleSubmitScore()
            }}
          />
        ) : null}
        {isLeaderboardOpen ? (
          <LeaderboardModal
            entries={leaderboardEntries}
            errorMessage={leaderboardError}
            infoMessage={leaderboardInfoMessage}
            isLoading={isLeaderboardLoading}
            theme={sceneTheme}
            onClose={() => {
              setIsLeaderboardOpen(false)
              setLeaderboardInfoMessage(null)
            }}
            onRefresh={() => {
              void loadLeaderboard()
            }}
          />
        ) : null}
      </section>
    </main>
  )
}

export default App
