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
  const controlButtons = [
    { direction: directions.primary.direction, label: directions.primary.label, slotClassName: 'slot-up' },
    ...directions.row.map(({ direction, label }) => ({ direction, label, slotClassName: `slot-${direction}` })),
  ]

  return (
    <div className="hud-controls">
      <div className="controls-grid">
        {controlButtons.map(({ direction, label, slotClassName }) => (
          <div key={direction} className={`controls-slot ${slotClassName}`}>
            <button
              type="button"
              className={`direction-button is-${theme} ${activeDirection === direction ? 'is-active' : ''}`}
              onClick={() => onMove(direction)}
            >
              {label}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DirectionControls
