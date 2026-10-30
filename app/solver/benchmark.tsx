'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BENCH_GRIDS, benchGrid } from '@/lib/solver/benchGrids'
import { EXACT_MAX_TILES, type EngineSpec } from '@/lib/solver/engines'
import { useSolverWorker } from './useSolverWorker'
import { Variants } from './variants'

interface Result {
  moves: number | null         // best solution at the end of the budget
  solution: string
  first: { moves: number; at: number } | null
  bound?: number               // exact search that gave up
}

interface Job { grid: string; variant: EngineSpec }

const SIZES = ['4x4', '5x5', '6x6', '8x8', '10x10']
const sizeOf = (grid: string) => grid.split(':')[0]
const key = (grid: string, variant: string) => `${grid}|${variant}`

export function Benchmark({ variants, setVariants, picked, setPicked }: {
  variants: EngineSpec[]
  setVariants: (v: EngineSpec[]) => void
  picked: string[]
  setPicked: (ids: string[]) => void
}) {
  const [grids, setGrids] = useState<string[]>(['4x4:a', '6x6:a', '8x8:a', '8x8:b'])
  const [seconds, setSeconds] = useState(5)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' })
  const [copied, setCopied] = useState(false)
  const { start, stop } = useSolverWorker()
  const jobs = useRef<Job[]>([])

  const chosenGrids = BENCH_GRIDS.filter(g => grids.includes(g))
  const chosenVariants = variants.filter(v => picked.includes(v.id))

  const runNext = (index: number) => {
    const job = jobs.current[index]
    if (!job) { setRunning(false); return }
    setProgress({ done: index, total: jobs.current.length, label: `${job.grid} · ${job.variant.label}` })
    const g = benchGrid(job.grid)
    start({ canva: g.canva, kind: job.variant.kind, options: job.variant.options, seconds }, m => {
      if (m.type !== 'finished') return
      const exact = job.variant.kind === 'exact'
      setResults(r => ({
        ...r,
        [key(job.grid, job.variant.id)]: {
          moves: m.stats.won ? m.stats.moves : null, solution: m.stats.solution,
          first: m.firstWin, bound: exact && !m.stats.won ? m.stats.bound : undefined,
        },
      }))
      runNext(index + 1)
    })
  }
  const run = () => {
    // The optimum is only worth asking for on small grids
    jobs.current = chosenGrids.flatMap(grid => chosenVariants
      .filter(variant => variant.kind !== 'exact' || benchGrid(grid).canva.length * benchGrid(grid).canva[0].length <= EXACT_MAX_TILES)
      .map(variant => ({ grid, variant })))
    if (!jobs.current.length) return
    setResults({})
    setRunning(true)
    runNext(0)
  }
  const halt = () => { stop(); setRunning(false) }

  const best = (grid: string) => Math.min(...chosenVariants.filter(v => v.kind !== 'exact').map(v => results[key(grid, v.id)]?.moves ?? Infinity))
  const average = (variant: EngineSpec) => {
    const values = chosenGrids.map(g => results[key(g, variant.id)]).filter(Boolean)
    const solved = values.filter(r => r.moves !== null)
    return solved.length ? { mean: solved.reduce((a, r) => a + r.moves!, 0) / solved.length, solved: solved.length, of: values.length } : null
  }
  const cellText = (r?: Result) => {
    if (!r) return '·'
    if (r.bound !== undefined) return `≥ ${r.bound}`
    return r.moves === null ? 'none' : String(r.moves)
  }

  const copy = async () => {
    const rows = [['grid', ...chosenVariants.map(v => v.label)]]
    for (const g of chosenGrids) rows.push([g, ...chosenVariants.map(v => {
      const r = results[key(g, v.id)]
      return r ? `${cellText(r)}${r.first ? ` (first ${r.first.moves} at ${r.first.at.toFixed(1)}s)` : ''}` : ''
    })])
    rows.push(['average', ...chosenVariants.map(v => { const a = average(v); return a ? `${a.mean.toFixed(1)} (${a.solved}/${a.of})` : '' })])
    try { await navigator.clipboard.writeText(`${seconds} s per run\n${rows.map(r => r.join('\t')).join('\n')}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const finished = Object.keys(results).length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <h3 className="text-xs font-bold text-muted-foreground">Grids</h3>
        <div className="flex flex-col gap-1">
          {SIZES.map(size => (
            <div key={size} className="flex items-center gap-1">
              <span className="w-12 text-xs text-muted-foreground">{size}</span>
              {BENCH_GRIDS.filter(g => sizeOf(g) === size).map(g => (
                <Button key={g} size="sm" variant={grids.includes(g) ? 'default' : 'secondary'} aria-pressed={grids.includes(g)} disabled={running}
                  onClick={() => setGrids(grids.includes(g) ? grids.filter(x => x !== g) : [...grids, g])}>{g.split(':')[1]}</Button>
              ))}
            </div>
          ))}
          <div className="flex gap-1 pt-1">
            <Button size="sm" variant="secondary" disabled={running} onClick={() => setGrids(BENCH_GRIDS)}>All</Button>
            <Button size="sm" variant="secondary" disabled={running} onClick={() => setGrids([])}>None</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <Variants variants={variants} setVariants={setVariants} mode="many" picked={picked} setPicked={setPicked} locked={running} />
        <label className="text-xs text-muted-foreground">Seconds per grid and engine
          <input type="number" min={1} step={1} value={seconds} disabled={running} onChange={e => setSeconds(Math.max(1, Number(e.target.value)))} className="w-full p-2 rounded-md border bg-background text-foreground disabled:opacity-60" />
        </label>
        <div className="flex gap-2">
          {running
            ? <Button className="grow" onClick={halt}>Stop</Button>
            : <Button className="grow" disabled={!chosenGrids.length || !chosenVariants.length} onClick={run}>Run {chosenGrids.length * chosenVariants.length} searches</Button>}
          {finished && !running && <Button variant="secondary" onClick={copy}>{copied ? 'Copied' : 'Copy report'}</Button>}
        </div>
        {running && (
          <p className="text-xs text-muted-foreground" role="status">
            {progress.done + 1} / {progress.total} · {progress.label}. A beam layer or the exact search is not interrupted, so a run can overrun its time.
          </p>
        )}
      </div>

      {(finished || running) && (
        <div className="p-4 bg-background rounded-lg overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">Moves of the best solution per grid and engine</caption>
            <thead>
              <tr className="text-xs text-muted-foreground text-left">
                <th className="pr-3 font-normal">grid</th>
                {chosenVariants.map(v => <th key={v.id} className="pr-3 font-normal align-bottom">{v.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {chosenGrids.map(g => (
                <tr key={g} className="border-t">
                  <th scope="row" className="pr-3 py-1 text-left font-normal text-muted-foreground">{g}</th>
                  {chosenVariants.map(v => {
                    const r = results[key(g, v.id)]
                    const win = r?.moves != null && v.kind !== 'exact' && r.moves === best(g)
                    const cell = (
                      <>
                        <span className={win ? 'font-bold underline' : v.kind === 'exact' ? 'font-bold' : ''}>{cellText(r)}</span>
                        {r?.first && v.kind !== 'exact' && <span className="block text-xs text-muted-foreground">first {r.first.moves} · {r.first.at.toFixed(1)}s</span>}
                      </>
                    )
                    return <td key={v.id} className="pr-3 py-1 align-top">{r?.solution ? <Link href={`/replay${benchGrid(g).query}&i=${r.solution}`}>{cell}</Link> : cell}</td>
                  })}
                </tr>
              ))}
              <tr className="border-t font-bold">
                <th scope="row" className="pr-3 py-1 text-left font-bold">average</th>
                {chosenVariants.map(v => {
                  const a = average(v)
                  return <td key={v.id} className="pr-3 py-1 align-top">{a ? <>{a.mean.toFixed(1)}<span className="block text-xs font-normal text-muted-foreground">{a.solved}/{a.of} solved</span></> : '·'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
