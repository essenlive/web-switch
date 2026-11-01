'use client'

import { useState } from 'react'
import { nearness, nearnessDetail, isWon } from '@/lib/solver/simulate'
import { FRAMES, MOVE_WEIGHT, OPTIMUM, SOL, TILE_WEIGHT } from '../data'
import { ChartBox, LineChart } from '../charts'
import { plural } from '../format'
import { Lead, Panel, Section } from '../section'
import { useStage, type ShowOptions } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'
import { Chips } from '../tile'

const F = FRAMES.states
const detail0 = nearnessDetail(F[0])
const dropAt = F.findIndex(s => s.rows * s.cols < F[0].rows * F[0].cols) // the move where a line first disappears

export function Cost() {
  const stage = useStage()
  const [k, setK] = useState(0)                         // the move of the optimum shown by the slider
  const [w, setW] = useState({ tile: TILE_WEIGHT, move: MOVE_WEIGHT })
  const showCost = (m: number, o: ShowOptions = {}) => stage.show(F[m], { chip: 'Cost', step: `after ${plural(m, 'move')}`, moves: m, letters: SOL.slice(0, m), ...o })
  const costAt = (m: number, weights = w) => F[m].rows * F[m].cols * weights.tile + nearness(F[m]) + m * weights.move

  const points: [number, number][] = Array.from({ length: OPTIMUM }, (_, j) => [j, costAt(j)])
  const ys = points.map(p => p[1])
  const lab = (
    <div className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-0.5 text-sm font-semibold text-muted-foreground">Move of the optimum
        <input type="range" min={0} max={OPTIMUM} value={k} aria-label="Move of the optimum" className="w-full accent-foreground"
          onChange={e => { const m = Number(e.target.value); setK(m); stage.setCosts(true); showCost(m, { step: `after ${plural(m, 'move')} of the optimum` }) }} />
      </label>
      <p aria-live="polite" className="overflow-x-auto rounded-md bg-background px-3 py-2.5 font-mono text-sm">
        {isWon(F[k]) ? `won in ${k} moves` : `cost = ${w.tile} × ${F[k].rows * F[k].cols} tiles + ${nearness(F[k])} nearness + ${w.move} × ${k} moves = ${costAt(k)}`}
      </p>
      <div className="flex flex-wrap gap-3">
        {([['tile', 'Weight of a tile', 0, 16, 1], ['move', 'Weight of a move', 0, 3, 0.5]] as const).map(([key, label, min, max, step]) => (
          <label key={key} className="flex min-w-40 grow flex-col gap-0.5 text-sm font-semibold text-muted-foreground">
            <span>{label}: <b className="text-foreground">{w[key]}</b></span>
            <input type="range" min={min} max={max} step={step} value={w[key]} aria-label={label} className="w-full accent-foreground"
              onChange={e => { const next = { ...w, [key]: Number(e.target.value) }; setW(next) }} />
          </label>))}
      </div>
      <ChartBox title="Cost after each move of the optimum" value={isWon(F[k]) ? 'won' : `move ${k}: ${costAt(k)}`}>
        <LineChart points={points} xmax={OPTIMUM} ymin={Math.min(...ys) - 4} ymax={Math.max(...ys) + 4} mark={isWon(F[k]) ? null : k} height={90} label="Cost of the position after each move of the optimal solution" />
      </ChartBox>
    </div>)

  const steps: Step[] = [
    { title: 'Why a cost',
      body: <>
        <p>The approximate methods keep some positions and throw others away, while the game is not over. They need a number to rank two positions.</p>
        <p>Counting the tiles left is not enough: on this grid there are 16, then 12, then 4, and as long as no line disappears that number does not move. For the first {dropAt - 1} moves of the optimum it stays at 16. We need a number that goes down <em>before</em> a line disappears.</p>
      </>,
      show: () => { stage.setCosts(false); showCost(0, { step: 'start grid' }) } },
    { title: 'The cost of a line',
      body: <>
        <p>For one line, we count its tiles that are not of the majority color of the line: this is what would have to change for the line to be uniform.</p>
        <p>The numbers are now shown around the grid: on the right the cost of each row, at the bottom the cost of each column. Rows, from bottom to top: <strong>{detail0.rowCosts.join(', ')}</strong>. Columns, from left to right: <strong>{detail0.colCosts.join(', ')}</strong>. The second row from the bottom, <Chips values={Array.from(F[0].cells.subarray(4, 8))} />, has no majority color: 3 tiles to change.</p>
      </>,
      show: () => { stage.setCosts(true); showCost(0, { step: 'cost of each line' }) } },
    { title: 'Nearness',
      body: <>
        <p>To win, all rows but one (or all columns but one) must go: {F[0].rows - 1} of them. So we add up the {F[0].rows - 1} cheapest lines, and take the better of rows and columns.</p>
        <p>Rows: {detail0.rowsSum}. Columns: {detail0.colsSum}. The <strong>nearness</strong> is the smaller of the two: <strong>{detail0.value}</strong>. The underlined numbers on the grid are the ones that are counted.</p>
      </>,
      show: () => { stage.setCosts(true); showCost(0, { step: `nearness = ${detail0.value}` }) } },
    { title: 'The cost of a position',
      body: <>
        <p>The final cost adds three things: {TILE_WEIGHT} × the tiles left, the nearness, and {MOVE_WEIGHT} × the moves already played. At the start: {TILE_WEIGHT} × 16 + {detail0.value} + 0 = <strong>{16 * TILE_WEIGHT + detail0.value}</strong>.</p>
        <p>Each move costs {MOVE_WEIGHT}, so a mere walk makes the cost go up: after the first step, {16 * TILE_WEIGHT + nearness(F[1]) + MOVE_WEIGHT}. A position is only preferred if it lowers something else by more than it costs in moves.</p>
      </>,
      from: () => { stage.setCosts(true); showCost(0) }, animate: () => stage.walk(SOL[0]), show: () => { stage.setCosts(true); showCost(1) } },
    { title: 'Following the cost along the optimum',
      body: <>
        <p>Drag the slider: the grid replays the optimum move by move and the cost updates. It goes up during the walk, comes down a little when the nearness drops, then <strong>falls at move {dropAt}</strong>: a column disappears, 4 tiles fewer, 32 less on the cost.</p>
        <p>Change the weights. On this small grid, even a move weight of 3 keeps the cost of move {dropAt} under the starting cost, so the path stays worth it. On big grids, where reaching a line takes a long walk, it no longer holds: in the 8×8 measurements, move weights of 2 and more prevent winning some grids.</p>
      </>,
      extra: lab,
      show: () => { stage.setCosts(true); showCost(k, { step: `after ${plural(k, 'move')} of the optimum` }) } },
  ]
  const { index, go } = useStepper('cost', steps)
  return (
    <Section id="cost" title="The cost of a position">
      <Lead>To choose which positions to keep, the approximate methods must give a number to a position where the game is not over. This is where that number comes from.</Lead>
      <Panel><Stepper steps={steps} index={index} go={go} label="The cost, step by step" /></Panel>
    </Section>
  )
}
