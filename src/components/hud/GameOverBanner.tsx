import './GameOverBanner.css'

type GameOverBannerProps = {
  title?: string
  message: string
}

function GameOverBanner({
  title = 'Game Over',
  message,
}: GameOverBannerProps) {
  return (
    <div className="game-over-card hud-game-over">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}

export default GameOverBanner

