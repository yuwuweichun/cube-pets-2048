import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { SceneTheme } from '../scene/GameScene'
import './HudModal.css'

type LeaderboardModalProps = {
  entries: LeaderboardEntry[]
  errorMessage: string | null
  infoMessage: string | null
  isLoading: boolean
  theme: SceneTheme
  onClose: () => void
  onRefresh: () => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M19 6v5h-5M5 18v-5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M17.3 10A7 7 0 0 0 6.8 6.7L5 8M6.7 14A7 7 0 0 0 17.2 17.3L19 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function formatSubmittedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function LeaderboardModal({
  entries,
  errorMessage,
  infoMessage,
  isLoading,
  theme,
  onClose,
  onRefresh,
}: LeaderboardModalProps) {
  return (
    <div className={`hud-modal-scrim is-${theme}`} role="presentation" onClick={onClose}>
      <section
        className={`hud-modal-card is-${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="hud-modal-header">
          <div className="hud-modal-title-wrap">
            <h2 id="leaderboard-title" className="hud-modal-title">排行榜</h2>
            <p className="hud-modal-subtitle">展示公开 Top 10 成绩，按分数从高到低排序。</p>
          </div>
          <div className="hud-modal-icon-actions">
            <button
              type="button"
              className={`hud-icon-button hud-modal-icon-button is-${theme}`}
              onClick={onClose}
              aria-label="关闭排行榜"
              title="关闭"
            >
              <CloseIcon />
            </button>
            <button
              type="button"
              className={`hud-icon-button hud-modal-icon-button is-${theme}`}
              disabled={isLoading}
              onClick={onRefresh}
              aria-label="刷新排行榜"
              title="刷新排行榜"
            >
              <RefreshIcon />
            </button>
          </div>
        </header>

        <div className="hud-modal-body">
          {infoMessage ? <p className={`hud-status hud-status-success is-${theme}`}>{infoMessage}</p> : null}
          {errorMessage ? (
            <p className={`hud-status hud-status-error is-${theme}`} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className={`hud-panel is-${theme}`}>
            {isLoading ? (
              <p className="hud-inline-note">正在加载排行榜...</p>
            ) : entries.length === 0 ? (
              <p className="hud-inline-note">还没有成绩记录，成为第一个上榜的玩家吧。</p>
            ) : (
              <div className="leaderboard-table-wrap">
                <table className={`leaderboard-table is-${theme}`}>
                  <thead>
                    <tr>
                      <th scope="col">排名</th>
                      <th scope="col">玩家</th>
                      <th scope="col">分数</th>
                      <th scope="col">最佳宠物</th>
                      <th scope="col">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{entry.player_name}</td>
                        <td>{entry.score}</td>
                        <td>{entry.best_pet}</td>
                        <td>{formatSubmittedAt(entry.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default LeaderboardModal
