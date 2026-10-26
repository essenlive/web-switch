'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Grid } from '@/components/grid'
import { Button } from '@/components/ui/button'
import { matrixFromParams } from '@/lib/matrixHelpers'
import type { GAStats } from '@/lib/solver/ga'
import type { SolverRequest } from '@/lib/solver/worker'

// One line over the generations: tiles left of the best attempt, then (once solved) the moves of the shortest solution
function Chart({ points, max, label }: { points: [number, number][], max: number, label: string }) {
  const W = 300, H = 60, PAD = 6
  const last = Math.max(1, points[points.length - 1]?.[0] ?? 1)
  const path = points.map(([g, v]) => `${PAD + (g / last) * (W - 2 * PAD)},${PAD + (1 - v / max) * (H - 2 * PAD)}`).join(' ')
  const end = points[points.length - 1]
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{end ? `${end[1]} · gen ${end[0]}` : 'waiting'}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 text-foreground" role="img" aria-label={label}>
        <polyline points={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// Settings worth comparing; the numbers come from scripts/solver-bench.ts runs
const PRESETS = [
  { name: 'Single stage, 60 moves', population: 1500, length: 60, stages: 1 },
  { name: 'Single stage, 80 moves', population: 1500, length: 80, stages: 1 },
  { name: 'Staged, 60 moves', population: 1500, length: 60, stages: 30 },
  { name: 'Staged, fast (small grids)', population: 400, length: 50, stages: 30 },
  { name: 'Staged, large grids', population: 1000, length: 100, stages: 30 },
]

function SolverPage() {
  const params = useSearchParams()
  const { validParams, error, input } = useMemo(() => matrixFromParams({
    s: params.get('s') || '', cs: params.get('cs') || '', c: params.get('c') || '', t: '',
  }), [params])

  const [population, setPopulation] = useState(1500)
  const [length, setLength] = useState(60)
  const [stages, setStages] = useState(1)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<GAStats | null>(null)
  const [history, setHistory] = useState<GAStats[]>([])
  const worker = useRef<Worker | null>(null)
  const posted = useRef(Infinity) // moves of the last solution sent to the relays

  const stop = () => { worker.current?.postMessage({ type: 'stop' } satisfies SolverRequest); setRunning(false) }
  const start = () => {
    if (!validParams) return
    worker.current ??= new Worker(new URL('../../lib/solver/worker.ts', import.meta.url))
    posted.current = Infinity
    worker.current.onmessage = (e: MessageEvent<GAStats>) => {
      // A new best solution goes to the-bot's profile
      if (e.data.won && e.data.moves < posted.current) {
        posted.current = e.data.moves
        import('@/lib/nostr').then(n => n.publishBotScore(input.url, e.data.solution))
      }
      setStats(e.data)
      setHistory(h => [...h, e.data])
    }
    setStats(null); setHistory([])
    worker.current.postMessage({ type: 'start', canva: input.canva, options: { population, length, maxStages: stages } } satisfies SolverRequest)
    setRunning(true)
  }

  // The worker stops with the page
  useEffect(() => () => { worker.current?.terminate(); worker.current = null }, [])

  const total = input.canva.length * input.canva[0].length
  const indexes = useMemo(() => ({
    rows: input.canva.map((_, i) => i), columns: input.canva[0].map((_, i) => i),
  }), [input.canva])
  const replay = stats?.won ? `/replay${input.url}&i=${stats.solution}` : null

  if (!params.toString() || !validParams) {
    return (
      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <h2 className="text-sm font-bold text-muted-foreground">Solver</h2>
        <p role={error ? 'alert' : undefined} className={error ? 'text-destructive' : undefined}>{error ?? 'Open this page with a grid, like /solver?s=abc&cs=6x6'}</p>
      </div>
    )
  }

  return (
    <div className="grow flex flex-col gap-2">
      <div className="p-4 bg-background rounded-lg">
        <h2 className="text-sm font-bold text-muted-foreground">Solver · grid {new URLSearchParams(input.url).get('cs')}</h2>
        <Grid canva={input.canva} canvaIndexes={indexes} cursor={{ x: 0, y: 0, value: 1 }} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          ['generation', stats?.generation ?? 0],
          ['tiles left', stats ? stats.tiles : total],
          ['moves', stats ? stats.moves : 0],
          ['status', !running ? (stats?.won ? 'solved' : 'stopped') : stats?.won ? 'improving' : 'searching'],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col leading-none p-3 bg-background rounded-lg">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xl font-bold">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <Chart label="Tiles left, best attempt" max={total} points={history.filter(s => !s.won).map(s => [s.generation, s.tiles])} />
        <Chart label="Moves, shortest solution" max={history.find(s => s.won)?.moves ?? 1} points={history.filter(s => s.won).map(s => [s.generation, s.moves])} />
        {stats && <p className="text-xs text-muted-foreground">pass {stats.pass}, stage {stats.stage}</p>}
        <label className="text-xs text-muted-foreground">Preset
          <select
            value={PRESETS.findIndex(p => p.population === population && p.length === length && p.stages === stages)}
            disabled={running}
            onChange={e => { const p = PRESETS[Number(e.target.value)]; if (p) { setPopulation(p.population); setLength(p.length); setStages(p.stages) } }}
            className="w-full p-2 rounded-md border bg-background text-foreground"
          >
            {PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name} · {p.population} / {p.length} / {p.stages}</option>)}
            <option value={-1} disabled>Custom</option>
          </select>
        </label>
        <div className="flex gap-2">
          <label className="grow text-xs text-muted-foreground">Population
            <input type="number" min={20} max={5000} step={100} value={population} disabled={running} onChange={e => setPopulation(Number(e.target.value))} className="w-full p-2 rounded-md border bg-background text-foreground" />
          </label>
          <label className="grow text-xs text-muted-foreground">Moves per stage
            <input type="number" min={10} max={1000} step={10} value={length} disabled={running} onChange={e => setLength(Number(e.target.value))} className="w-full p-2 rounded-md border bg-background text-foreground" />
          </label>
          <label className="grow text-xs text-muted-foreground">Stages
            <input type="number" min={1} max={100} step={1} value={stages} disabled={running} onChange={e => setStages(Math.max(1, Number(e.target.value)))} className="w-full p-2 rounded-md border bg-background text-foreground" />
          </label>
        </div>
        <div className="flex gap-2">
          {running
            ? <Button className="grow" onClick={stop}>Stop</Button>
            : <Button className="grow" onClick={start}>{stats ? 'Restart' : 'Start'}</Button>}
          {replay && <Button asChild variant="secondary" className="grow"><Link href={replay}>Replay solution</Link></Button>}
        </div>
      </div>

      {stats && stats.solution && (
        <p className="p-4 bg-background rounded-lg break-all font-mono text-sm">
          <span className="block text-xs text-muted-foreground font-sans">{stats.won ? `Solution, ${stats.moves} moves` : `Best so far, ${stats.moves} moves`}</span>
          {stats.solution}
        </p>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense><SolverPage /></Suspense>
}
