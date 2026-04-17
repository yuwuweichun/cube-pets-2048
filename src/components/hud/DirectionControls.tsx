import type { Direction } from '../../game/types'
import './DirectionControls.css'

type DirectionConfig = {
  direction: Direction
  label: string
}

type DirectionControlsProps = {
  activeDirection: Direction | null
  onMove: (direction: Direction) => void
  directions?: {
    primary: DirectionConfig
    row: DirectionConfig[]
  }
}

const DEFAULT_DIRECTIONS: DirectionControlsProps['directions'] = {
  primary: { direction: 'up', label: 'Up' },
  row: [
    { direction: 'left', label: 'Left' },
    { direction: 'down', label: 'Down' },
    { direction: 'right', label: 'Right' },
  ],
}

function DirectionControls({
  activeDirection,
  onMove,
  directions = DEFAULT_DIRECTIONS,
}: DirectionControlsProps) {
  return (
    <div className="hud-controls">
      <button
        type="button"
        className={`hud-button ${activeDirection === directions.primary.direction ? 'is-active' : ''}`}
        onClick={() => onMove(directions.primary.direction)}
      >
        {directions.primary.label}
      </button>

      <div className="controls-row">
        {directions.row.map(({ direction, label }) => (
          <button
            key={direction}
            type="button"
            className={`hud-button ${activeDirection === direction ? 'is-active' : ''}`}
            onClick={() => onMove(direction)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DirectionControls

