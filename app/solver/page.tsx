'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Grid } from '@/components/grid'
import { Records } from '@/components/records'
import { Button } from '@/components/ui/button'
import { matrixFromParams } from '@/lib/matrixHelpers'
import { BENCH_GRIDS, benchGrid } from '@/lib/solver/benchGrids'
import { Benchmark } from './benchmark'
import { Run } from './run'
import { freshVariants } from './variants'

const field = 'w-full p-2 rounded-md border bg-background text-foreground'

function SolverPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [tab, setTab] = useState<'run' | 'benchmark'>('run')
  const [variants, setVariants] = useState(freshVariants)
  const [runPick, setRunPick] = useState(['beam'])
  const [benchPick, setBenchPick] = useState(['ga-staged', 'beam', 'exact'])

  const seed = params.get('s') || ''
  const { validParams, error, input } = useMemo(() => matrixFromParams({
    s: seed, cs: params.get('cs') || '', c: params.get('c') || '', t: '',
  }), [params, seed])
  const hasGrid = params.toString() !== ''
  const benchId = BENCH_GRIDS.find(g => seed === `bench-${g}`)

  const [customSeed, setCustomSeed] = useState(benchId ? '' : seed)
  const [customSize, setCustomSize] = useState(params.get('cs') || '6x8')
  const open = (query: string) => router.replace(`/solver${query}`, { scroll: false })

  const grid = hasGrid && validParams ? { canva: input.canva, url: input.url, seed } : null
  const indexes = useMemo(() => ({
    rows: input.canva.map((_, i) => i), columns: input.canva[0].map((_, i) => i),
  }), [input.canva])

  return (
    <div className="grow flex flex-col gap-2">
      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <h2 className="text-sm font-bold text-muted-foreground">
          Solver{grid && ` · grid ${new URLSearchParams(input.url).get('cs')}${seed ? ` · ${seed}` : ''}`}
        </h2>
        <label className="text-xs text-muted-foreground">Benchmark grid
          <select value={benchId ?? (hasGrid ? 'custom' : '')} onChange={e => { if (e.target.value && e.target.value !== 'custom') open(benchGrid(e.target.value).query) }} className={field}>
            <option value="" disabled>Pick a grid</option>
            {BENCH_GRIDS.map(g => <option key={g} value={g}>{g}</option>)}
            <option value="custom" disabled>Other (below, or from the link)</option>
          </select>
        </label>
        <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (customSeed) open(`?s=${encodeURIComponent(customSeed)}&cs=${customSize}`) }}>
          <label className="grow text-xs text-muted-foreground">Seed
            <input value={customSeed} onChange={e => setCustomSeed(e.target.value)} className={field} />
          </label>
          <label className="w-24 text-xs text-muted-foreground">Size
            <input value={customSize} onChange={e => setCustomSize(e.target.value)} placeholder="8x8" className={field} />
          </label>
          <Button type="submit" variant="secondary" disabled={!customSeed}>Use</Button>
        </form>
        {hasGrid && !validParams && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {grid && <Grid canva={input.canva} canvaIndexes={indexes} cursor={{ x: 0, y: 0, value: 1 }} />}
      </div>

      {grid && !benchId && <Records url={input.url} className="justify-around p-3 bg-background rounded-lg" />}

      <div className="flex gap-2" role="group" aria-label="Mode">
        <Button className="grow" variant={tab === 'run' ? 'default' : 'secondary'} aria-pressed={tab === 'run'} onClick={() => setTab('run')}>Run</Button>
        <Button className="grow" variant={tab === 'benchmark' ? 'default' : 'secondary'} aria-pressed={tab === 'benchmark'} onClick={() => setTab('benchmark')}>Benchmark</Button>
      </div>

      {/* Both stay mounted, so a run or a table survives a look at the other tab */}
      <div className={tab === 'run' ? '' : 'hidden'}>
        <Run grid={grid} variants={variants} setVariants={setVariants} picked={runPick} setPicked={setRunPick} />
      </div>
      <div className={tab === 'benchmark' ? '' : 'hidden'}>
        <Benchmark variants={variants} setVariants={setVariants} picked={benchPick} setPicked={setBenchPick} />
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense><SolverPage /></Suspense>
}
