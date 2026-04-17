export type Direction = 'up' | 'down' | 'left' | 'right'

export type TileMotion = 'idle' | 'spawn' | 'merge'

export type Tile = {
  id: number
  value: number
  motion: TileMotion
}

export type Board = Array<Array<Tile | null>>

export type GameState = {
  board: Board
  score: number
  gameOver: boolean
}

export type HudPopKey = 'score' | 'bestPet'
