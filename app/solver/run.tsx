'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { EngineSpec } from '@/lib/solver/engines'
import type { GAStats } from '@/lib/solver/ga'
import { useSolverWorker } from './useSolverWorker'
import { Variants } from './variants'

export interface SolverGrid { canva: number[][]; url: string; seed: string }

const HISTORY = 1500 // reports kept for the charts

// One line over the generations
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

export function Run({ grid, variants, setVariants, picked, setPicked }: {
  grid: SolverGrid | null
  variants: EngineSpec[]
  setVariants: (v: EngineSpec[]) => void
  picked: string[]
  setPicked: (ids: string[]) => void
}) {
  const variant = variants.find(v => v.id === picked[0]) ?? variants[0]
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<GAStats | null>(null)
  const [history, setHistory] = useState<GAStats[]>([])
  const posted = useRef(Infinity) // moves of the last solution sent to the relays
  const { start, stop } = useSolverWorker()

  const halt = () => { stop(); setRunning(false) }
  const go = () => {
    if (!grid) return
    posted.current = Infinity
    setStats(null); setHistory([])
    setRunning(true)
    start({ canva: grid.canva, kind: variant.kind, options: variant.options, seconds: seconds > 0 ? seconds : undefined }, m => {
      const s = m.stats
      // A new best solution goes to the-bot's profile (never for the benchmark grids, they are not real games)
      if (s.won && s.moves < posted.current && !grid.seed.startsWith('bench-')) {
        posted.current = s.moves
        import('@/lib/nostr').then(n => n.publishBotScore(grid.url, s.solution))
      }
      setStats(s)
      setHistory(h => [...h.slice(-(HISTORY - 1)), s])
      if (m.type === 'finished') setRunning(false)
    })
  }

  const total = grid ? grid.canva.length * grid.canva[0].length : 0
  const replay = grid && stats?.won ? `/replay${grid.url}&i=${stats.solution}` : null
  const status = running ? (stats?.won ? 'improving' : 'searching') : stats?.won ? 'solved' : stats ? 'stopped' : 'idle'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <Variants variants={variants} setVariants={setVariants} mode="one" picked={picked} setPicked={setPicked} locked={running} />
        <label className="text-xs text-muted-foreground">Time limit in seconds (0: until stopped)
          <input type="number" min={0} step={5} value={seconds} disabled={running} onChange={e => setSeconds(Math.max(0, Number(e.target.value)))} className="w-full p-2 rounded-md border bg-background text-foreground disabled:opacity-60" />
        </label>
        <div className="flex gap-2">
          {running
            ? <Button className="grow" onClick={halt}>Stop</Button>
            : <Button className="grow" disabled={!grid} onClick={go}>{stats ? 'Restart' : 'Start'}</Button>}
          {replay && <Button asChild variant="secondary" className="grow"><Link href={replay}>Replay solution</Link></Button>}
        </div>
        {!grid && <p className="text-sm text-muted-foreground">Pick a grid above.</p>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          ['generation', stats?.generation ?? 0],
          ['tiles left', stats ? stats.tiles : total],
          ['moves', stats ? stats.moves : 0],
          ['status', status],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col leading-none p-3 bg-background rounded-lg">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xl font-bold">{value}</span>
          </div>
        ))}
      </div>

      {variant.kind !== 'exact' && (
        <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
          <Chart label="Tiles left, best attempt" max={total || 1} points={history.filter(s => !s.won).map(s => [s.generation, s.tiles])} />
          <Chart label="Moves, shortest solution" max={history.find(s => s.won)?.moves ?? 1} points={history.filter(s => s.won).map(s => [s.generation, s.moves])} />
          {stats && <p className="text-xs text-muted-foreground">{variant.kind === 'beam' ? `round ${stats.pass}, layer ${stats.stage}` : `pass ${stats.pass}, stage ${stats.stage}`}</p>}
        </div>
      )}

      {stats?.bound !== undefined && !stats.won && (
        <p className="p-4 bg-background rounded-lg text-sm">Too big to finish: every solution needs at least {stats.bound} moves.</p>
      )}

      {stats && stats.solution && (
        <p className="p-4 bg-background rounded-lg break-all font-mono text-sm">
          <span className="block text-xs text-muted-foreground font-sans">
            {variant.kind === 'exact' ? `Optimum, ${stats.moves} moves` : stats.won ? `Solution, ${stats.moves} moves` : `Best so far, ${stats.moves} moves`}
          </span>
          {stats.solution}
        </p>
      )}
    </div>
  )
}
