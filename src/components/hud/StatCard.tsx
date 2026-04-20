import './StatCard.css'
import type { SceneTheme } from '../scene/GameScene'

type StatCardProps = {
  label: string
  value: string | number
  isPopping?: boolean
  theme?: SceneTheme
}

function StatCard({ label, value, isPopping = false, theme = 'day' }: StatCardProps) {
  return (
    <div className={`stat-card is-${theme} ${isPopping ? 'is-popping' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default StatCard
