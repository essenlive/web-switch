'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Grid } from '@/components/grid'
import { Button } from '@/components/ui/button'
import { matrixFromParams } from '@/lib/matrixHelpers'
import type { GAStats } from '@/lib/solver/ga'
import type { SolverRequest } from '@/lib/solver/worker'

// Tiles left of the best attempt, per report
function Progress({ history, total }: { history: GAStats[], total: number }) {
  const W = 300, H = 80, PAD = 6
  const last = Math.max(1, history.length - 1)
  const x = (i: number) => PAD + (i / last) * (W - 2 * PAD)
  const y = (tiles: number) => PAD + (1 - tiles / total) * (H - 2 * PAD)
  const points = history.map((s, i) => `${x(i)},${y(s.tiles)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 text-foreground" role="img" aria-label={`Tiles left of the best attempt over ${history.length} reports`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function SolverPage() {
  const params = useSearchParams()
  const { validParams, error, input } = useMemo(() => matrixFromParams({
    s: params.get('s') || '', cs: params.get('cs') || '', c: params.get('c') || '', t: '',
  }), [params])

  const [population, setPopulation] = useState(1000)
  const [length, setLength] = useState(50)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<GAStats | null>(null)
  const [history, setHistory] = useState<GAStats[]>([])
  const worker = useRef<Worker | null>(null)

  const stop = () => { worker.current?.postMessage({ type: 'stop' } satisfies SolverRequest); setRunning(false) }
  const start = () => {
    if (!validParams) return
    worker.current ??= new Worker(new URL('../../lib/solver/worker.ts', import.meta.url))
    worker.current.onmessage = (e: MessageEvent<GAStats>) => {
      setStats(e.data)
      setHistory(h => [...h, e.data])
    }
    setStats(null); setHistory([])
    worker.current.postMessage({ type: 'start', canva: input.canva, options: { population, length } } satisfies SolverRequest)
    setRunning(true)
  }

  // Starts on its own when opened with a grid, stops with the page
  useEffect(() => {
    const id = setTimeout(start, 0)
    return () => { clearTimeout(id); worker.current?.terminate(); worker.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.url])

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
        <Progress history={history} total={total} />
        {stats && <p className="text-xs text-muted-foreground">pass {stats.pass}, stage {stats.stage}</p>}
        <div className="flex gap-2">
          <label className="grow text-xs text-muted-foreground">Population
            <input type="number" min={20} max={5000} step={100} value={population} disabled={running} onChange={e => setPopulation(Number(e.target.value))} className="w-full p-2 rounded-md border bg-background text-foreground" />
          </label>
          <label className="grow text-xs text-muted-foreground">Moves per stage
            <input type="number" min={10} max={1000} step={10} value={length} disabled={running} onChange={e => setLength(Number(e.target.value))} className="w-full p-2 rounded-md border bg-background text-foreground" />
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
