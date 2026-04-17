import './StatCard.css'

type StatCardProps = {
  label: string
  value: string | number
  isPopping?: boolean
}

function StatCard({ label, value, isPopping = false }: StatCardProps) {
  return (
    <div className={`stat-card ${isPopping ? 'is-popping' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default StatCard

