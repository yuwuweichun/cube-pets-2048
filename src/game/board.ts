import type { Board, Direction, GameState, Tile } from './types'

type MergeResult = {
  tiles: Array<Tile | null>
  changed: boolean
  gained: number
}

export const GRID_SIZE = 4

let nextTileId = 1

function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () => Array<Tile | null>(GRID_SIZE).fill(null))
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((tile) => (tile ? { ...tile } : null)))
}

function createRandomTile(): Tile {
  return {
    id: nextTileId++,
    value: Math.random() < 0.9 ? 2 : 4,
    motion: 'spawn',
  }
}

export function normalizeBoardMotion(board: Board): Board {
  return board.map((row) =>
    row.map((tile) => (tile ? { ...tile, motion: 'idle' } : null)),
  )
}

function getEmptyCells(board: Board) {
  const cells: Array<{ row: number; col: number }> = []

  board.forEach((row, rowIndex) => {
    row.forEach((tile, colIndex) => {
      if (!tile) {
        cells.push({ row: rowIndex, col: colIndex })
      }
    })
  })

  return cells
}

export function placeRandomTile(board: Board): Board {
  const nextBoard = cloneBoard(board)
  const emptyCells = getEmptyCells(nextBoard)

  if (emptyCells.length === 0) {
    return nextBoard
  }

  const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  nextBoard[row][col] = createRandomTile()
  return nextBoard
}

export function buildInitialState(): GameState {
  let board = createEmptyBoard()
  board = placeRandomTile(board)
  board = placeRandomTile(board)

  return {
    board,
    score: 0,
    gameOver: false,
  }
}

function compactTiles(line: Array<Tile | null>): Tile[] {
  return line.filter((tile): tile is Tile => tile !== null)
}

function mergeLine(line: Array<Tile | null>): MergeResult {
  const compacted = compactTiles(line)
  const merged: Array<Tile | null> = []
  let gained = 0
  let changed = compacted.length !== line.length

  for (let index = 0; index < compacted.length; index += 1) {
    const current = compacted[index]
    const next = compacted[index + 1]

    if (next && current.value === next.value) {
      const value = current.value * 2
      merged.push({
        id: nextTileId++,
        value,
        motion: 'merge',
      })
      gained += value
      changed = true
      index += 1
    } else {
      merged.push(current)
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push(null)
  }

  const sameOrder = merged.every((tile, index) => tile?.id === line[index]?.id)

  return {
    tiles: merged,
    changed: changed || !sameOrder,
    gained,
  }
}

function transpose(board: Board): Board {
  return Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
    Array.from({ length: GRID_SIZE }, (_, colIndex) => {
      const tile = board[colIndex][rowIndex]
      return tile ? { ...tile } : null
    }),
  )
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse())
}

export function hasAvailableMoves(board: Board) {
  if (getEmptyCells(board).length > 0) {
    return true
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = board[row][col]
      const right = board[row][col + 1]
      const down = board[row + 1]?.[col]

      if ((right && tile?.value === right.value) || (down && tile?.value === down.value)) {
        return true
      }
    }
  }

  return false
}

export function moveBoard(board: Board, direction: Direction) {
  let working = cloneBoard(board)

  if (direction === 'right') {
    working = reverseRows(working)
  }

  if (direction === 'up' || direction === 'down') {
    working = transpose(working)
  }

  if (direction === 'down') {
    working = reverseRows(working)
  }

  let changed = false
  let gained = 0
  const mergedRows = working.map((row) => {
    const result = mergeLine(row)
    changed = changed || result.changed
    gained += result.gained
    return result.tiles
  })

  let nextBoard = mergedRows

  if (direction === 'down') {
    nextBoard = reverseRows(nextBoard)
  }

  if (direction === 'up' || direction === 'down') {
    nextBoard = transpose(nextBoard)
  }

  if (direction === 'right') {
    nextBoard = reverseRows(nextBoard)
  }

  return {
    board: nextBoard,
    changed,
    gained,
  }
}
