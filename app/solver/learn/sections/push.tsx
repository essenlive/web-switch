'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mulberry32 } from '@/lib/solver/ga'
import { ringCell, ringIndex, ringSize, ringSlot, slotDirection, slotRing, walkDistance, walkPath } from '@/lib/solver/ring'
import { cloneState, isWon, nearness, type SimState } from '@/lib/solver/simulate'
import { FRAMES } from '../data'
import { plural } from '../format'
import { Lead, Panel, Section, TryIt } from '../section'
import { useStage, wait } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'

const F = FRAMES.states
const P = ringSize(F[0])
const DIRECTIONS = ['up', 'right', 'down', 'left']
const GENES = [140, 116, 160, 96, 130, 170, 120, 150]  // a push genome of eight genes
const PRESETS = [128, 140, 116, 96, 160, 200]

// A gene read from where the cursor is: a signed distance along the ring, then the push cell it lands on
function decode(s: SimState, gene: number) {
  const cur = ringIndex(s, s.x, s.y), offset = Math.round((gene - 128) / 128 * (P / 2))
  const raw = ((cur + offset) % P + P) % P, corner = [0, 5, 10, 15].includes(raw)
  const slot = ringSlot(s, cur + offset + P)
  return { cur, offset, raw, corner, slot, target: slotRing(s, slot), walk: walkDistance(s, slot), dir: slotDirection(s, slot), path: walkPath(s, slot) }
}
const withCursor = (ring: number) => { const s = cloneState(F[0]); const [x, y] = ringCell(s, ring); s.x = x; s.y = y; return s }

// 5,000 genes drawn the way the search draws them: 128 + round((r1 + r2 - 1) × 127)
const histogram = (() => {
  const rand = mulberry32(42), counts = new Map<number, number>()
  for (let i = 0; i < 5000; i++) { const gene = 128 + Math.round((rand() + rand() - 1) * 127), o = Math.round((gene - 128) / 128 * (P / 2)); counts.set(o, (counts.get(o) ?? 0) + 1) }
  const offsets = Array.from({ length: P + 1 }, (_, i) => i - P / 2), max = Math.max(...counts.values())
  return { offsets, counts, max, near: offsets.filter(o => Math.abs(o) <= 2).reduce((a, o) => a + (counts.get(o) ?? 0), 0) }
})()

interface Row { i: number; gene: number; offset: number; slot: number; walk: number; tiles: number; near: number; moves: number }
interface Played { state: SimState; moves: number; letters: string }

export function Push() {
  const stage = useStage()
  const [panel, setPanel] = useState(0)
  const [gene, setGene] = useState(160)
  const [cursor, setCursor] = useState(3)
  const [rows, setRows] = useState<Row[]>([])
  const [played, setPlayed] = useState<Played>({ state: F[0], moves: 0, letters: '' })

  const showRead = (g: number, c: number) => {
    const s = withCursor(c), d = decode(s, g)
    stage.show(s, { chip: 'Push genes', step: `gene ${g}: offset ${d.offset > 0 ? '+' : ''}${d.offset}`, numbers: true, path: d.path, target: d.target,
      onSlot: slot => { const ring = slotRing(s, slot); setCursor(ring); showRead(g, ring) }, note: 'Click a cell of the ring to put the cursor there.' })
  }
  const showPlayed = (p: Played, n: number) => stage.show(p.state, { chip: 'Push genes', step: n ? `after gene ${n}` : 'start, no gene played', moves: p.moves, letters: p.letters, numbers: true })
  const playNext = () => stage.holdWhile(async () => {
    const n = rows.length, s = cloneState(played.state), d = decode(s, GENES[n])
    stage.show(s, { chip: 'Push genes', step: `gene ${n + 1}: ${GENES[n]}`, moves: played.moves, letters: played.letters, numbers: true, target: d.target, path: d.path })
    await wait(600)
    await stage.playAction(d.slot)
    const after = stage.read(), near = isWon(after.state) ? 0 : nearness(after.state)
    setRows(r => [...r, { i: n + 1, gene: GENES[n], offset: d.offset, slot: d.slot, walk: d.walk, tiles: after.state.rows * after.state.cols, near, moves: after.moves }])
    setPlayed(after)
    showPlayed(after, n + 1)
  })
  const restart = () => { const start = { state: F[0], moves: 0, letters: '' }; setRows([]); setPlayed(start); showPlayed(start, 0) }

  const s = withCursor(cursor), d = decode(s, gene)
  const steps: Step[] = [
    { title: 'Reading a gene',
      body: <>
        <p>A gene is a byte. It is read as a <strong>signed distance along the ring</strong> from the cursor: 128 means &ldquo;here&rdquo;, smaller values go backward, larger ones forward. The walk to the chosen cell is always the shortest way.</p>
        <p>Drag the gene: the grid shows the cursor, the cell aimed at and the walk. Click a cell of the ring to move the cursor.</p>
      </>,
      show: () => { setPanel(0); showRead(gene, cursor) } },
    { title: 'Playing eight genes',
      body: <p>A push genome is a list of genes. Each one is read from where the cursor is at that moment, then the push is played with its walk. Press &ldquo;Next gene&rdquo;: the grid shows the cell aimed at, then plays the walk and the push.</p>,
      show: () => { setPanel(1); showPlayed(played, rows.length) } },
    { title: 'Drawing a gene',
      body: <>
        <p>A gene drawn at random is 128 + round((r₁ + r₂ − 1) × 127): the sum of two random numbers makes a triangle around 128. Small distances are the most likely, which gives genomes whose walks cost little.</p>
        <p>An absolute cell number gave poor results: it no longer means anything once the grid shrinks. The offset from the cursor keeps its meaning, and with short stages (6 to 10 pushes) the result catches up with the plain genetic search without beating it.</p>
      </>,
      show: () => { setPanel(2); stage.show(withCursor(3), { chip: 'Push genes', step: 'cursor on cell 3', numbers: true }) } },
  ]
  const { index, go } = useStepper('push', steps, () => (panel === 0 ? showRead(gene, cursor) : panel === 1 ? showPlayed(played, rows.length) : stage.show(withCursor(3), { chip: 'Push genes', step: 'cursor on cell 3', numbers: true })))

  return (
    <Section id="push" title="Push genes: a distance on the ring">
      <Lead>The same principle, but a gene describes a whole push. The walk to the cell is computed.</Lead>
      <Panel>
        <Stepper steps={steps} index={index} go={go} label="Push genes, step by step" />
        {panel === 0 && (
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-0.5 text-sm font-semibold text-muted-foreground"><span>Gene: <b className="text-foreground">{gene}</b></span>
              <input type="range" min={0} max={255} value={gene} aria-label="Gene" className="w-full accent-foreground" onChange={e => { const g = Number(e.target.value); setGene(g); showRead(g, cursor) }} />
            </label>
            <div role="group" aria-label="Example genes" className="flex flex-wrap gap-1.5">{PRESETS.map(p => <Button key={p} variant={p === gene ? 'default' : 'outline'} aria-pressed={p === gene} onClick={() => { setGene(p); showRead(p, cursor) }}>{p}</Button>)}</div>
            <p aria-live="polite">Ring of {P} cells, cursor on cell {d.cur}. Offset = round(({gene} − 128) / 128 × {P} / 2) = <strong>{d.offset > 0 ? '+' : ''}{d.offset}</strong>. We land on ring cell {d.raw}{d.corner ? ', a corner: we take the next cell' : ''}, which is push cell {d.slot} (push {DIRECTIONS[d.dir]}). Walk {d.walk}, cost <strong>{d.walk + 1}</strong>.</p>
          </div>)}
        {panel === 1 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-1 font-mono text-sm" aria-label="The eight genes">{GENES.map((g, i) => <span key={i} className={`rounded-sm px-1.5 py-0.5 ${i < rows.length ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>{g}</span>)}</div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={rows.length >= GENES.length || isWon(played.state)} onClick={playNext}>Next gene</Button>
              <Button variant="outline" onClick={restart}>Restart</Button>
            </div>
            <p aria-live="polite">{rows.length === 0 ? 'Each gene is read from the position where the cursor is at that moment.' : `${plural(rows.length, 'gene')} played: ${played.moves} moves, ${played.state.rows * played.state.cols} tiles${isWon(played.state) ? ', won' : ''}. Eight genes are not enough to win here: the genetic search draws others and keeps the best.`}</p>
            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead><tr className="text-right text-xs uppercase text-muted-foreground">{['#', 'gene', 'offset', 'cell', 'walk', 'tiles', 'near', 'moves'].map(t => <th key={t} className="py-1 pr-2 font-bold">{t}</th>)}</tr></thead>
                  <tbody>{rows.map(r => <tr key={r.i} className="border-t text-right">{[r.i, r.gene, (r.offset > 0 ? '+' : '') + r.offset, r.slot, r.walk, r.tiles, r.near, r.moves].map((v, i) => <td key={i} className="py-1 pr-2">{v}</td>)}</tr>)}</tbody>
                </table>
              </div>)}
          </div>)}
        {panel === 2 && (
          <div className="flex flex-col gap-1.5">
            <div role="img" aria-label="Distribution of the offsets of 5000 genes drawn at random" className="flex h-24 items-end gap-0.5">
              {histogram.offsets.map(o => <div key={o} title={`${o}: ${histogram.counts.get(o) ?? 0}`} className="min-w-0 flex-1 rounded-t-sm bg-foreground" style={{ height: `${((histogram.counts.get(o) ?? 0) / histogram.max) * 100}%` }} />)}
            </div>
            <div aria-hidden className="flex gap-0.5 text-[0.65rem] tabular-nums text-muted-foreground">{histogram.offsets.map(o => <span key={o} className="min-w-0 flex-1 overflow-hidden text-center">{o}</span>)}</div>
            <p className="text-sm text-muted-foreground">Offset (in ring cells) of 5,000 genes drawn at random. {Math.round(histogram.near / 5000 * 100)}% land within 2 cells of the cursor: the draw is a triangle, so short walks are favoured.</p>
          </div>)}
        <TryIt engine="ga-push" grid="6x6:a" label="Try the push genes on a real grid" />
      </Panel>
    </Section>
  )
}
