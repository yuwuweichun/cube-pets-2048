import type { SceneTheme } from '../scene/GameScene'
import './HudModal.css'

type ScoreSubmitModalProps = {
  bestPetLabel: string
  isSubmitting: boolean
  playerName: string
  score: number
  submitError: string | null
  theme: SceneTheme
  onCancel: () => void
  onChangePlayerName: (value: string) => void
  onSubmit: () => void
}

function ScoreSubmitModal({
  bestPetLabel,
  isSubmitting,
  playerName,
  score,
  submitError,
  theme,
  onCancel,
  onChangePlayerName,
  onSubmit,
}: ScoreSubmitModalProps) {
  const trimmedName = playerName.trim()

  return (
    <div className={`hud-modal-scrim is-${theme}`} role="presentation">
      <section
        className={`hud-modal-card is-${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-submit-title"
      >
        <header className="hud-modal-header">
          <div className="hud-modal-title-wrap">
            <h2 id="score-submit-title" className="hud-modal-title">上传成绩</h2>
            <p className="hud-modal-subtitle">
              这局已经结束啦，留下名字，把你的成绩放进排行榜。
            </p>
          </div>
        </header>

        <div className="hud-modal-body">
          <div className="hud-stat-grid">
            <div className={`hud-stat-item is-${theme}`}>
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className={`hud-stat-item is-${theme}`}>
              <span>Best Pet</span>
              <strong>{bestPetLabel}</strong>
            </div>
          </div>

          <div className={`hud-panel hud-form-grid is-${theme}`}>
            <div className="hud-field">
              <label htmlFor="leaderboard-player-name">玩家名字</label>
              <input
                className={`hud-input is-${theme}`}
                id="leaderboard-player-name"
                type="text"
                value={playerName}
                maxLength={20}
                placeholder="输入你的名字"
                autoComplete="nickname"
                disabled={isSubmitting}
                onChange={(event) => onChangePlayerName(event.target.value.slice(0, 20))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && trimmedName) {
                    event.preventDefault()
                    onSubmit()
                  }
                }}
              />
              <span className="hud-field-hint">最多 20 个字符，上传前会自动去掉首尾空格。</span>
            </div>

            {submitError ? (
              <p className={`hud-status hud-status-error is-${theme}`} role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="hud-actions">
              <button
                type="button"
                className={`hud-button hud-button-secondary is-${theme}`}
                disabled={isSubmitting}
                onClick={onCancel}
              >
                取消
              </button>
              <button
                type="button"
                className={`hud-button hud-button-primary is-${theme}`}
                disabled={!trimmedName || isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ScoreSubmitModal
