import Link from 'next/link'
import { BENCH_GRIDS, benchGrid } from '@/lib/solver/benchGrids'
import { Lead, Section, ShowStart } from '../section'

// The way out of the explanation: the tool, on one of the benchmark grids
export function Try() {
  return (
    <Section id="try" title="Try it on a real grid">
      <ShowStart id="try" />
      <Lead>The solver page opens on any grid: pick the engine, change every option, and compare engines on the benchmark grids. Here are the grids of the benchmark.</Lead>
      <ul className="flex flex-wrap gap-1.5">
        {BENCH_GRIDS.map(id => <li key={id}><Link href={`/solver${benchGrid(id).query}`} className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:border-foreground">{id}</Link></li>)}
      </ul>
      <p className="text-sm text-muted-foreground">From a game link, replace the path by <code>/solver</code> and keep the part after the <code>?</code>: <code>/solver?s=SEED&amp;cs=6x8</code>.</p>
    </Section>
  )
}
