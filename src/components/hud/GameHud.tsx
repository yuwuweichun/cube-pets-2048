import type { Direction } from '../../game/types'
import DirectionControls from './DirectionControls'
import GameOverBanner from './GameOverBanner'
import StatCard from './StatCard'
import './GameHud.css'

type GameHudProps = {
  score: number
  bestPetLabel: string
  isScorePopping: boolean
  isBestPetPopping: boolean
  activeDirection: Direction | null
  isGameOver: boolean
  onRestart: () => void
  onMove: (direction: Direction) => void
  gameOverMessage?: string
}

function GameHud({
  score,
  bestPetLabel,
  isScorePopping,
  isBestPetPopping,
  activeDirection,
  isGameOver,
  onRestart,
  onMove,
  gameOverMessage = '棋盘已经没有可移动或可合并的宠物了，点击 Restart 再来一局。',
}: GameHudProps) {
  return (
    <div className="hud-overlay">
      <div className="hud-topbar">
        <StatCard label="Score" value={score} isPopping={isScorePopping} />
        <StatCard label="Best Pet" value={bestPetLabel} isPopping={isBestPetPopping} />
        <button type="button" className="hud-button restart-button" onClick={onRestart}>
          Restart
        </button>
      </div>

      <DirectionControls activeDirection={activeDirection} onMove={onMove} />

      {isGameOver ? <GameOverBanner message={gameOverMessage} /> : null}
    </div>
  )
}

export default GameHud

