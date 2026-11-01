'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ringIndex, ringSlot, slotDirection, walkDistance } from '@/lib/solver/ring'
import { isWon, nearness, nearnessDetail } from '@/lib/solver/simulate'
import { Button } from '@/components/ui/button'
import { Tile } from './tile'
import { cost } from './data'
import { useBoard, useStage } from './stage'
import styles from './learn.module.css'

const ARROWS = ['↑', '→', '↓', '←']
const DIRECTIONS = ['up', 'right', 'down', 'left']

// The example grid, kept next to the text: on a wide screen a column on the right, on a narrow one a band at the top
export function BoardView() {
  const stage = useStage()
  const b = useBoard()
  const [collapsed, setCollapsed] = useState(false)
  const s = b.state, won = isWon(s)
  const cursor = ringIndex(s, s.x, s.y), cols = s.cols + 2, path = new Set(b.path)
  const flash = (r: number, c: number) => b.flash.some(l => (l.kind === 'row' && l.index === r) || (l.kind === 'col' && l.index === c))
  const near = won ? null : nearness(s)

  const cells: ReactNode[] = []
  for (let y = s.rows + 1; y >= 0; y--) for (let x = 0; x <= s.cols + 1; x++) {
    if (x >= 1 && x <= s.cols && y >= 1 && y <= s.rows) {
      cells.push(<div key={`${x}-${y}`} className={cn('rounded-sm', flash(y - 1, x - 1) && styles.flash)}><Tile value={s.cells[(y - 1) * s.cols + (x - 1)]} /></div>)
      continue
    }
    const idx = ringIndex(s, x, y), corner = (x === 0 || x === s.cols + 1) && (y === 0 || y === s.rows + 1), isCursor = idx === cursor
    const onPath = path.has(idx) && !isCursor && idx !== b.target, isTarget = idx === b.target && !isCursor
    const ring = cn('relative grid place-items-center rounded-sm border text-xs',
      corner ? 'border-transparent' : 'border-dashed border-border bg-muted text-muted-foreground',
      corner && (b.numbers || onPath || isTarget) && 'border-dashed border-border',
      isCursor && 'border-2 border-solid border-foreground bg-background p-[3px]',
      isTarget && 'border-2 border-solid border-foreground bg-background font-bold text-foreground',
      onPath && 'border-foreground bg-foreground text-background')
    const num = b.numbers ? <span aria-hidden className="absolute left-[3px] top-px text-[0.6rem] font-bold opacity-70">{idx}</span> : null
    if (corner) { cells.push(<div key={`${x}-${y}`} className={ring}>{num}{isCursor && <Tile value={s.held} />}</div>); continue }
    const slot = ringSlot(s, idx), dir = slotDirection(s, slot), d = walkDistance(s, slot)
    cells.push(
      <button key={`${x}-${y}`} type="button" disabled={!b.interactive} tabIndex={b.interactive ? undefined : -1}
        aria-label={b.interactive ? `Push ${DIRECTIONS[dir]} from push cell ${slot}: walk ${d}, ${d + 1} moves` : `Push cell ${slot}`}
        onClick={() => stage.slot(slot)}
        className={cn(ring, b.interactive && 'cursor-pointer hover:border-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring')}>
        {num}
        {isCursor ? <Tile value={s.held} /> : <span aria-hidden className="text-base font-extrabold leading-none">{ARROWS[dir]}</span>}
      </button>)
  }

  const detail = b.showCosts && !won ? nearnessDetail(s) : null
  const style = { '--n': cols } as CSSProperties
  return (
    <aside aria-label="Example grid, followed through the whole page" data-busy={b.held}
      className="sticky top-4 z-10 flex flex-col gap-2.5 rounded-lg bg-background p-3 max-lg:top-0 max-lg:rounded-t-none max-lg:shadow-md lg:col-start-2 lg:row-start-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-background">{b.chip || 'Start'}</span>
        <span className="min-w-0 grow truncate text-sm font-bold text-muted-foreground">{b.step || 'grid 4x4:a'}</span>
        <Button variant="outline" size="sm" aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>{collapsed ? 'Show' : 'Hide'}</Button>
      </div>
      {!collapsed && (
        <div className="flex gap-3 lg:flex-col">
          <div className={cn('relative w-max max-w-full shrink-0 lg:mx-auto', detail && 'pr-[30px] pb-[26px]')} style={style}>
            <div role="group" aria-label="Grid"
              className="grid gap-[3px] [--cell:min(42px,calc((100vw-120px)/var(--n)))] max-lg:[--cell:min(30px,calc((100vw-190px)/var(--n)))] max-sm:[--cell:min(26px,calc((100vw-176px)/var(--n)))] grid-cols-[repeat(var(--n),var(--cell))] auto-rows-[var(--cell)]">
              {cells}
            </div>
            {detail && (
              <div aria-hidden className="pointer-events-none absolute inset-0 text-xs font-bold [--cell:min(42px,calc((100vw-120px)/var(--n)))] max-lg:[--cell:min(30px,calc((100vw-190px)/var(--n)))] max-sm:[--cell:min(26px,calc((100vw-176px)/var(--n)))] [--step:calc(var(--cell)+3px)]">
                {Array.from({ length: s.rows }, (_, i) => { const r = s.rows - 1 - i; return <span key={`r${i}`} className={cn('absolute w-6 text-muted-foreground', detail.useRows && detail.kept.includes(r) && 'font-extrabold text-foreground underline underline-offset-4')} style={{ left: `calc(var(--step)*${s.cols + 2} + 6px)`, top: `calc(var(--step)*${i + 1} + 8px)` }}>{detail.rowCosts[r]}</span> })}
                {Array.from({ length: s.cols }, (_, j) => <span key={`c${j}`} className={cn('absolute w-6 text-center text-muted-foreground', !detail.useRows && detail.kept.includes(j) && 'font-extrabold text-foreground underline underline-offset-4')} style={{ left: `calc(var(--step)*${j + 1} + (var(--cell) - 1.5rem) / 2)`, top: `calc(var(--step)*${s.rows + 2} + 2px)` }}>{detail.colCosts[j]}</span>)}
              </div>
            )}
          </div>
          <div className="flex min-w-0 grow flex-col gap-2.5">
            <dl className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
              {[['moves', b.moves], ['tiles', s.rows * s.cols], ['near', near ?? '·'], ['cost', won ? 'won' : cost(s, b.moves)]].map(([label, value]) => (
                <div key={label} className="flex min-w-0 flex-col rounded-md bg-muted px-2 py-1">
                  <dt className="text-[0.7rem] font-bold text-muted-foreground">{label}</dt>
                  <dd className="text-base font-extrabold tabular-nums">{value}</dd>
                </div>))}
            </dl>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">Moves from the start</span>
              <code className="min-h-8 break-all rounded-md bg-muted px-2 py-1 text-sm">{b.letters || '(none)'}</code>
            </div>
            <p aria-live="polite" className="min-h-10 text-sm text-muted-foreground max-lg:hidden">{b.note || (won ? `Won in ${b.moves} moves.` : '')}</p>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={b.showCosts} onChange={e => stage.setCosts(e.target.checked)} className="size-4 accent-foreground" />
              Cost of each line
            </label>
          </div>
        </div>
      )}
    </aside>
  )
}
