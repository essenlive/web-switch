import { benchGrid } from '@/lib/solver/benchGrids'
import { solveExact } from '@/lib/solver/exact'
import { decompose, exactTrace, framesOf } from '@/lib/solver/trace'

// The one example grid of the page: 4x4:a, small enough for the exact search to be shown whole.
export const GRID_ID = '4x4:a'
export const CANVA = benchGrid(GRID_ID).canva
export const SOL = solveExact(CANVA).solution           // the optimum, 10 moves
export const OPTIMUM = SOL.length
export const FRAMES = framesOf(CANVA, SOL)              // the state after each move of the optimum
export const ACTIONS = decompose(CANVA, SOL)            // four pushes, each with the walk to its slot
export const ACTION_END = ACTIONS.reduce<number[]>((acc, a) => [...acc, (acc.at(-1) ?? 0) + a.cost], []) // moves so far: 2, 6, 8, 10
export const EXACT = exactTrace(CANVA)                  // the whole exact search, position by position

// The same costs as the beam search and the genetic search
export const TILE_WEIGHT = 8
export const MOVE_WEIGHT = 1
