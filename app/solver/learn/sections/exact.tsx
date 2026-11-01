'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { slotLetters } from '@/lib/solver/ring'
import { createState, isWon } from '@/lib/solver/simulate'
import { CANVA, EXACT, OPTIMUM, SOL } from '../data'
import { fmt, plural } from '../format'
import { Lead, Panel, Section } from '../section'
import { MiniButton, MiniGrid } from '../mini-button'
import { usePlayer, useStage } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'

const E = EXACT.events, LAST = E.length - 1
const FIRST_NEXT = E.findIndex(e => e.d > 0)
const FIRST_DUP = E.findIndex(e => e.children.some(c => c.status === 'seen'))
// Positions per bucket over the whole search, to give the chart a fixed scale
const totals = (() => {
  const found: number[] = [1], expanded: number[] = []
  for (const e of E) { if (e.kind === 'expand') expanded[e.d] = (expanded[e.d] ?? 0) + 1; for (const c of e.children) if (c.status !== 'seen') found[c.cost] = (found[c.cost] ?? 0) + 1 }
  return { found, expanded, max: Math.max(...found.filter(Boolean), ...expanded.filter(Boolean)), dMax: found.length - 1 }
})()
const countAt = (d: number) => E.filter(e => e.d === d && e.kind === 'expand').length

export function Exact() {
  const stage = useStage()
  const [idx, setIdx] = useState(0)
  const [pin, setPin] = useState(-1)                  // a child shown on the grid instead of the position
  const [speed, setSpeed] = useState(200)
  const e = E[idx]

  // What the grid shows
  const present = (k: number, pinned: number) => {
    const ev = E[k], c = pinned >= 0 ? ev.children[pinned] : null
    if (c) stage.show(c.state, { chip: 'Exact', step: `child of position ${k + 1}: cell ${c.slot}`, moves: c.cost, letters: ev.path + slotLetters(ev.state, c.slot),
      note: `Walk ${c.walk}, push 1: this child costs ${c.cost} moves. ${c.status === 'seen' ? 'Already met, so it is ignored.' : `It goes in bucket ${c.cost}.`}` })
    else stage.show(ev.state, { chip: 'Exact', step: `position ${k + 1} / ${E.length} · bucket ${ev.d}`, moves: ev.d, letters: ev.path,
      note: isWon(ev.state) ? `A winning position comes out of bucket ${ev.d}: this is the optimum.` : `This position costs ${ev.d} moves from the start.` })
  }
  const goto = (k: number) => { const n = Math.max(0, Math.min(LAST, k)); setIdx(n); setPin(-1); present(n, -1) }
  const nextBucket = () => { const j = E.findIndex((x, i) => i > idx && x.d > e.d); return j < 0 ? LAST : j }
  const player = usePlayer(() => { if (idx >= LAST) return false; goto(idx + 1); return true }, speed)
  const manual = (k: number) => { player.stop(); goto(k) }

  // Positions developed and put in buckets up to here
  const { found, expanded } = useMemo(() => {
    const found: number[] = [1], expanded: number[] = []
    for (let j = 0; j <= idx; j++) { const ev = E[j]; if (ev.kind === 'expand') expanded[ev.d] = (expanded[ev.d] ?? 0) + 1; for (const c of ev.children) if (c.status !== 'seen') found[c.cost] = (found[c.cost] ?? 0) + 1 }
    return { found, expanded }
  }, [idx])
  const done = expanded.reduce((a, b) => a + (b ?? 0), 0), known = found.reduce((a, b) => a + (b ?? 0), 0)
  const seen = e.children.filter(c => c.status === 'seen').length

  const steps: Step[] = [
    { title: 'Bucket 0: the start',
      body: <>
        <p>The exact search ranks positions by their <strong>number of moves from the start</strong>, in numbered buckets. At first, bucket 0 holds a single position: the start grid, which you see on the side.</p>
        <p>The algorithm empties the buckets in order: 0, then 1, then 2, and so on. Whatever comes out of a bucket is &ldquo;developed&rdquo;.</p>
      </>,
      show: () => { player.stop(); goto(0) } },
    { title: 'Developing a position',
      body: (() => {
        const costs = E[0].children.map(c => c.cost), counts = new Map<number, number>()
        costs.forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1))
        return <>
          <p>Developing a position means pushing it into each of the 16 push cells. Each child costs the walk to the cell plus 1 for the push. For the start, the children cost from {Math.min(...costs)} to {Math.max(...costs)} moves: {[...counts].map(([c, n]) => `${n} in bucket ${c}`).join(', ')}.</p>
          <p>Each child is shown below, with the cursor where it lands. Click one to see it on the grid.</p>
        </>
      })(),
      show: () => { player.stop(); goto(0) } },
    { title: 'Moving on to the next bucket',
      body: <>
        <p>Bucket 0 is now empty. The search moves to the first bucket that holds something: bucket {E[FIRST_NEXT].d}, with {plural(countAt(E[FIRST_NEXT].d), 'position')}. All of them are developed before moving to bucket {E[FIRST_NEXT].d + 1}.</p>
        <p>This is what guarantees the result: a long win cannot be found before a short one, because buckets are emptied in order of moves. Use &ldquo;Next bucket&rdquo; to watch each bucket fill and empty.</p>
      </>,
      show: () => { player.stop(); goto(FIRST_NEXT) } },
    { title: 'Never visiting a position twice',
      body: (() => {
        const ev = E[FIRST_DUP], n = ev.children.filter(c => c.status === 'seen').length
        const sameAsStart = Array.from(ev.state.cells).join() === Array.from(createState(CANVA).cells).join()
        return <>
          <p>This position (n°{FIRST_DUP + 1}, bucket {ev.d}) has {plural(n, 'child', 'children')} out of 16 that were already met at an equal or lower cost: they are greyed out and not put in a bucket.</p>
          <p>{sameAsStart ? <>The reason is in its path, <code>{ev.path}</code>: the cursor walks, pushes a column up, then pushes it back down. <strong>A push followed by the opposite push brings back exactly the start grid</strong>, only the cursor moved. All its children are positions the start already produced, in fewer moves.</> : 'The same position can be reached by very different paths.'}</p>
          <p>Without this rule the number of positions would explode. A position is recognised by its grid, the place of the cursor and the tile in hand.</p>
        </>
      })(),
      show: () => { player.stop(); goto(FIRST_DUP) } },
    { title: 'The first win is the optimum',
      body: <>
        <p>After {plural(EXACT.expansions, 'position')} developed, a winning position comes out of bucket {OPTIMUM}. Since all the smaller buckets were emptied without a win, no solution is shorter: <strong>{OPTIMUM} moves is the optimum</strong>.</p>
        <p>The path: <code>{SOL}</code>. On a 5×5 grid, the same method develops about 70,000 positions (4 seconds). Beyond that the number of positions explodes: it gives up and only reports a lower bound.</p>
      </>,
      from: () => stage.show(createState(CANVA), { chip: 'Exact', step: 'the path found', moves: 0, letters: '' }),
      animate: () => stage.playLetters(CANVA, SOL, createState(CANVA), { chip: 'Exact', step: 'the path found' }),
      show: () => { player.stop(); goto(LAST) } },
  ]
  const { index, go } = useStepper('exact', steps, () => present(idx, pin))

  const win = e.kind === 'win'
  return (
    <Section id="exact" title="Exact: explore everything, in order">
      <Lead>The only method that proves it found the minimum. On this grid it develops {EXACT.expansions} positions.</Lead>
      <Panel>
        <Stepper steps={steps} index={index} go={go} label="The exact search, step by step" />
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" aria-label="Start" onClick={() => manual(0)}>⏮</Button>
          <Button variant="outline" aria-label="Previous position" onClick={() => manual(idx - 1)}>◀</Button>
          <Button onClick={() => (player.playing ? player.stop() : (idx >= LAST && goto(0), player.start()))}>{player.playing ? '⏸ Pause' : '▶ Play'}</Button>
          <Button variant="outline" aria-label="Next position" onClick={() => manual(idx + 1)}>▶</Button>
          <Button variant="outline" onClick={() => manual(nextBucket())}>Next bucket</Button>
          <Button variant="outline" onClick={() => manual(LAST)}>Win</Button>
          <select aria-label="Speed" value={speed} onChange={ev => setSpeed(Number(ev.target.value))} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value={600}>Slow</option><option value={200}>Medium</option><option value={25}>Fast</option>
          </select>
        </div>
        <input type="range" min={0} max={LAST} value={idx} aria-label="Position explored" onChange={ev => manual(Number(ev.target.value))} className="w-full accent-foreground" />
        <p aria-live="polite">{win
          ? <><strong>Win.</strong> A winning position comes out of bucket {e.d}, after {plural(EXACT.expansions, 'position')} developed. No cheaper position is waiting: {e.d} moves is the optimum.</>
          : <>Position <strong>{idx + 1}</strong> of {E.length}, from bucket <strong>{e.d}</strong>. Developed so far: {fmt(done)}. Put in a bucket: {fmt(known)}.</>}</p>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>Buckets (moves from the start)</span><span>dark: developed · light: put in a bucket</span></div>
          <div role="img" aria-label="Positions per bucket" className="flex h-28 items-end gap-1 pt-1.5">
            {Array.from({ length: totals.dMax + 1 }, (_, d) => (
              <div key={d} title={`bucket ${d}: ${expanded[d] ?? 0} developed, ${found[d] ?? 0} put in`} className={`relative h-full min-w-0 flex-1 ${d > e.d ? 'opacity-40' : ''}`}>
                <i className="absolute inset-x-0 bottom-0 rounded-t-sm bg-border" style={{ height: `${((found[d] ?? 0) / totals.max) * 100}%` }} />
                <i className="absolute inset-x-0 bottom-0 rounded-t-sm bg-foreground" style={{ height: `${((expanded[d] ?? 0) / totals.max) * 100}%` }} />
              </div>))}
          </div>
          <div aria-hidden className="flex gap-1 text-[0.68rem] tabular-nums text-muted-foreground">
            {Array.from({ length: totals.dMax + 1 }, (_, d) => <span key={d} className={`min-w-0 flex-1 text-center ${d === e.d ? 'font-extrabold text-foreground' : ''}`}>{d}</span>)}
          </div>
        </div>
        {win ? <p>The path found: <code>{e.path}</code></p> : <>
          <p><strong>The 16 children</strong>: pushing into each cell. Costs from {Math.min(...e.children.map(c => c.cost))} to {Math.max(...e.children.map(c => c.cost))} moves. {e.children.length - seen ? plural(e.children.length - seen, 'put in a bucket', 'put in a bucket') : 'None put in a bucket'}, {seen} ignored because already met at an equal or lower cost. Click one to see it on the grid.</p>
          <MiniGrid>
            {e.children.map((c, i) => <MiniButton key={c.slot} state={c.state} top={`cell ${c.slot}`} bottom={`cost ${c.cost}${c.status === 'seen' ? ' · seen' : c.status === 'cheaper' ? ' · cheaper' : ''}${c.won ? ' · wins' : ''}`}
              faded={c.status === 'seen'} pressed={pin === i} label={`Child in cell ${c.slot}, cost ${c.cost}`}
              onClick={() => { player.stop(); const n = pin === i ? -1 : i; setPin(n); present(idx, n) }} />)}
          </MiniGrid>
        </>}
      </Panel>
    </Section>
  )
}
