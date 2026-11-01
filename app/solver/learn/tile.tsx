import type { ReactNode } from 'react'
import { Circle, Diamond, Square, Triangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SimState } from '@/lib/solver/simulate'

// One shape per color, so tiles never rely on hue alone (same as the game)
const ICONS = [null, Circle, Square, Triangle, Diamond] as const
const COLORS = ['', 'bg-tile-1 text-tile-ink-1', 'bg-tile-2 text-tile-ink-2', 'bg-tile-3 text-tile-ink-3', 'bg-tile-4 text-tile-ink-4']
export const TILE_NAMES = ['empty', 'red circle', 'blue square', 'green triangle', 'yellow diamond']

export function Tile({ value, className }: { value: number; className?: string }) {
  const Icon = ICONS[value]
  return (
    <span role="img" aria-label={TILE_NAMES[value]} className={cn('grid size-full place-items-center rounded-sm', COLORS[value], className)}>
      {Icon && <Icon aria-hidden className="size-1/2" fill="currentColor" strokeWidth={2.5} />}
    </span>
  )
}

// A tile small enough for a sentence
export function Chip({ value }: { value: number }) {
  const Icon = ICONS[value]
  return (
    <span role="img" aria-label={TILE_NAMES[value]} className={cn('mx-px inline-grid size-5 place-items-center rounded-sm align-[-0.3em]', COLORS[value])}>
      {Icon && <Icon aria-hidden className="size-3" fill="currentColor" strokeWidth={2.5} />}
    </span>
  )
}
export const Chips = ({ values }: { values: ArrayLike<number> }) => <>{Array.from(values, (v, i) => <Chip key={i} value={v} />)}</>

// A whole position as a thumbnail: grid, dashed ring, and the cursor with the tile it holds
const SHAPE_PATHS = [null, <circle key="1" cx="50" cy="50" r="27" />, <rect key="2" x="24" y="24" width="52" height="52" rx="4" />, <polygon key="3" points="50,20 81,77 19,77" />, <polygon key="4" points="50,17 83,50 50,83 17,50" />]
export function MiniBoard({ state, cell = 11, className }: { state: SimState; cell?: number; className?: string }) {
  const W = (state.cols + 2) * cell, H = (state.rows + 2) * cell
  const tiles: ReactNode[] = []
  for (let r = 0; r < state.rows; r++) for (let c = 0; c < state.cols; c++) {
    const v = state.cells[r * state.cols + c]
    tiles.push(
      <svg key={`${r}-${c}`} x={(c + 1) * cell} y={(state.rows - r) * cell} width={cell} height={cell} viewBox="0 0 100 100">
        <rect x="3" y="3" width="94" height="94" rx="16" style={{ fill: `var(--tile-${v})` }} />
        <g style={{ fill: `var(--tile-ink-${v})` }}>{SHAPE_PATHS[v]}</g>
      </svg>)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden className={className}>
      <rect x={cell / 2} y={cell / 2} width={W - cell} height={H - cell} rx="3" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 3" />
      {tiles}
      <svg x={state.x * cell} y={(state.rows + 1 - state.y) * cell} width={cell} height={cell} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" strokeWidth="14" stroke="currentColor" style={{ fill: `var(--tile-${state.held})` }} />
      </svg>
    </svg>
  )
}
