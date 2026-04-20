import type { Direction } from '../../game/types'
import DirectionControls from './DirectionControls'
import GameOverBanner from './GameOverBanner'
import StatCard from './StatCard'
import './GameHud.css'

type GameHudProps = {
  score: number
  bestPetLabel: string
  scorePopVersion: number
  bestPetPopVersion: number
  activeDirection: Direction | null
  isGameOver: boolean
  isMusicEnabled: boolean
  onToggleMusic: () => void
  onRestart: () => void
  onMove: (direction: Direction) => void
  gameOverMessage?: string
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.3 0 2.5.42 3.47 1.15L13 10h8V2z"
        fill="currentColor"
      />
    </svg>
  )
}

function MusicOnIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 9v6h4l5 5V4L7 9zm10.5 3c0-1.77-1-3.29-2.5-4.03v8.05A4.48 4.48 0 0 0 13.5 12M11 3.23v2.06c2.89.86 5 3.54 5 6.67s-2.11 5.81-5 6.67v2.06c4.01-.91 7-4.49 7-8.73s-2.99-7.82-7-8.73"
        fill="currentColor"
      />
    </svg>
  )
}

function MusicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25 1.27-1.27zm14.52 9c0-4.24-2.99-7.82-7-8.73v2.06c2.89.86 5 3.54 5 6.67 0 .82-.15 1.61-.44 2.34l1.51 1.51c.6-1.14.93-2.43.93-3.85m-4.29 0c0-1.77-1-3.29-2.5-4.03v3.18l2.45 2.45c.03-.19.05-.39.05-.6"
        fill="currentColor"
      />
    </svg>
  )
}

function GameHud({
  score,
  bestPetLabel,
  scorePopVersion,
  bestPetPopVersion,
  activeDirection,
  isGameOver,
  isMusicEnabled,
  onToggleMusic,
  onRestart,
  onMove,
  gameOverMessage = '棋盘已经没有可移动或可合并的宠物了，点击 Restart 再来一局。',
}: GameHudProps) {
  return (
    <div className="hud-overlay">
      <div className="hud-topbar">
        <div className="hud-stat-stack">
          <StatCard
            key={`score-${scorePopVersion}`}
            label="Score"
            value={score}
            isPopping={scorePopVersion > 0}
          />
          <StatCard
            key={`best-pet-${bestPetPopVersion}`}
            label="Best Pet"
            value={bestPetLabel}
            isPopping={bestPetPopVersion > 0}
          />
        </div>

        <div className="hud-action-stack">
          <button
            type="button"
            className="hud-icon-button restart-button"
            onClick={onRestart}
            aria-label="Restart game"
            title="Restart"
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            className={`hud-icon-button music-toggle-button ${isMusicEnabled ? 'is-enabled' : 'is-disabled'}`}
            onClick={onToggleMusic}
            aria-label={isMusicEnabled ? 'Turn music off' : 'Turn music on'}
            aria-pressed={isMusicEnabled}
            title={isMusicEnabled ? 'Music On' : 'Music Off'}
          >
            {isMusicEnabled ? <MusicOnIcon /> : <MusicOffIcon />}
          </button>
        </div>
      </div>

      <DirectionControls activeDirection={activeDirection} onMove={onMove} />

      {isGameOver ? <GameOverBanner message={gameOverMessage} /> : null}
    </div>
  )
}

export default GameHud
