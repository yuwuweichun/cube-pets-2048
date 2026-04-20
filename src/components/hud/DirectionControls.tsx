import type { Direction } from '../../game/types'
import type { SceneTheme } from '../scene/GameScene'
import './DirectionControls.css'

type DirectionConfig = {
  direction: Direction
  label: string
}

type DirectionLayout = {
  primary: DirectionConfig
  row: DirectionConfig[]
}

type DirectionControlsProps = {
  activeDirection: Direction | null
  onMove: (direction: Direction) => void
  theme?: SceneTheme
  directions?: DirectionLayout
}

const DEFAULT_DIRECTIONS: DirectionLayout = {
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
  theme = 'day',
  directions = DEFAULT_DIRECTIONS,
}: DirectionControlsProps) {
  return (
    <div className="hud-controls">
      <button
        type="button"
        className={`hud-button is-${theme} ${activeDirection === directions.primary.direction ? 'is-active' : ''}`}
        onClick={() => onMove(directions.primary.direction)}
      >
        {directions.primary.label}
      </button>

      <div className="controls-row">
        {directions.row.map(({ direction, label }) => (
          <button
            key={direction}
            type="button"
            className={`hud-button is-${theme} ${activeDirection === direction ? 'is-active' : ''}`}
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
