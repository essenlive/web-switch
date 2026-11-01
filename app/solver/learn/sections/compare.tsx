'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Lead, Panel, Section, ShowStart } from '../section'

const ENGINES = ['Genetic, one stage', 'Genetic, in stages', 'Push genes', 'Beam']
type Row = [size: string, id: string, optimum: number | null, results: (number | null)[]]
const N = null
// Moves of the best solution after 10 seconds per engine, on the benchmark grids (npm run solver:bench)
const DATA: Row[] = [
  ['4×4', 'a', 10, [10, 10, 10, 10]], ['4×4', 'b', 13, [13, 13, 13, 13]], ['5×5', 'a', 18, [18, 18, 18, 18]], ['5×5', 'b', 18, [19, 18, 18, 18]],
  ['6×6', 'a', N, [42, 38, 37, 32]], ['6×6', 'b', N, [27, 29, 31, 27]], ['6×6', 'c', N, [40, 34, 37, 37]],
  ['8×8', 'a', N, [N, 96, 105, 78]], ['8×8', 'b', N, [N, 95, 90, 78]], ['8×8', 'c', N, [N, 59, 77, 66]], ['8×8', 'd', N, [N, 81, 68, 61]],
  ['10×10', 'a', N, [N, N, N, 217]], ['10×10', 'b', N, [N, N, N, 147]],
]
const SIZES = ['All', '4×4', '5×5', '6×6', '8×8', '10×10']
const ADVICE: Record<string, string> = {
  All: 'The beam is the best default from 6×6 up. Below that, the exact search gives the optimum.',
  '4×4': 'Use the exact search: the optimum in a few milliseconds (445 positions for the example grid). The other engines find it too, but without a proof.',
  '5×5': 'Use the exact search: about 4 seconds to prove the optimum. The approximate engines are within 0 or 1 move.',
  '6×6': 'The beam wins on two grids and ties on one, with a first solution in under a second. The staged genetic search is a few moves behind.',
  '8×8': 'The beam is better on average (70.8 against 82.8 for the staged genetic search), but the genetic search wins grid c (59 against 66). The one-stage genetic search does not win in 10 seconds.',
  '10×10': 'Only the beam wins in 10 seconds. Its 147 to 217 moves are surely far from the optimum: the nearness is too coarse at this size.',
}

export function Compare() {
  const [size, setSize] = useState('All')
  const rows = DATA.filter(r => size === 'All' || r[0] === size)
  const average = (i: number) => { const v = rows.map(r => r[3][i]); return v.some(x => x === null) ? null : (v as number[]).reduce((a, b) => a + b, 0) / v.length }
  return (
    <Section id="compare" title="Comparing">
      <ShowStart id="compare" />
      <Lead>Moves of the best solution after 10 seconds per engine, on the benchmark grids. One run per grid and per engine: differences of a few moves prove nothing.</Lead>
      <Panel>
        <div role="group" aria-label="Size" className="flex flex-wrap gap-1.5">{SIZES.map(z => <Button key={z} variant={z === size ? 'default' : 'outline'} aria-pressed={z === size} onClick={() => setSize(z)}>{z}</Button>)}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-1 pr-3 font-bold">grid</th><th className="py-1 pr-3 text-right font-bold">optimum</th>{ENGINES.map(e => <th key={e} className="py-1 pr-3 text-right font-bold">{e}</th>)}</tr></thead>
            <tbody>
              {rows.map(([z, id, opt, res]) => { const best = Math.min(...res.filter((x): x is number => x !== null)); return (
                <tr key={z + id} className="border-t"><td className="py-1 pr-3">{z} {id}</td><td className="py-1 pr-3 text-right">{opt ?? '?'}</td>
                  {res.map((v, i) => <td key={i} className={`py-1 pr-3 text-right ${v === best ? 'font-extrabold' : ''}`}>{v ?? 'none'}</td>)}</tr>) })}
              {size !== 'All' && <tr className="border-t font-extrabold"><td className="py-1 pr-3">average</td><td />{ENGINES.map((e, i) => { const a = average(i); return <td key={e} className="py-1 pr-3 text-right">{a === null ? 'n/a' : a.toFixed(1)}</td> })}</tr>}
            </tbody>
          </table>
        </div>
        <p>{ADVICE[size]}</p>
        <p className="text-sm text-muted-foreground">Bold: the best solution of the row. &ldquo;none&rdquo;: no win in 10 seconds. The question mark: the optimum is not known beyond 5×5.</p>
      </Panel>
    </Section>
  )
}
