'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createState } from '@/lib/solver/simulate'
import { beamTrace, framesOf } from '@/lib/solver/trace'
import { CANVA, OPTIMUM, TILE_WEIGHT } from '../data'
import { plural } from '../format'
import { Lead, Panel, Section } from '../section'
import { MiniButton, MiniGrid } from '../mini-button'
import { usePlayer, useStage } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'

const WIDTHS = [3, 5, 10, 25]
const TABLE_WIDTHS = [3, 5, 10, 25, 50, 100]
const SLOTS = 16
const cache = new Map<number, ReturnType<typeof beamTrace>>()
const trace = (w: number) => { let t = cache.get(w); if (!t) { t = beamTrace(CANVA, w); cache.set(w, t) } return t }
const firstWin = (w: number) => { const i = trace(w).layers.findIndex(l => l.wins.length); return i < 0 ? trace(w).layers.length : i + 1 }
const firstDupe = () => { const i = trace(5).layers.findIndex(l => l.dupes > 0); return i < 0 ? 1 : i + 1 }

export function Beam() {
  const stage = useStage()
  const [W, setW] = useState(5)
  const [L, setL] = useState(1)
  const [sel, setSel] = useState(0)
  const t = trace(W), ly = t.layers[L - 1], kept = ly.kept
  const win = ly.wins.length ? ly.wins.reduce((a, b) => (b.moves < a.moves ? b : a)) : null
  const root = useMemo(() => createState(CANVA), [])

  const present = (w: number, l: number, s: number) => {
    const layer = trace(w).layers[l - 1], k = layer.kept[s], chip = `Beam W=${w}`
    const best = layer.wins.length ? layer.wins.reduce((a, b) => (b.moves < a.moves ? b : a)) : null
    if (k) stage.show(k.state, { chip, step: `layer ${l} / ${trace(w).layers.length} · rank ${s + 1}`, moves: k.moves, letters: k.letters, note: `Cost ${TILE_WEIGHT} × ${k.tiles} + ${k.near} + ${k.moves} = ${k.cost}.` })
    else if (best) stage.show(framesOf(CANVA, best.letters).states.at(-1)!, { chip, step: `layer ${l}: a win`, moves: best.moves, letters: best.letters })
    else stage.show(root, { chip, step: `layer ${l}`, moves: 0 })
  }
  const set = (w: number, l: number, s: number) => { setW(w); setL(l); setSel(s); present(w, l, s) }
  const player = usePlayer(() => { if (L >= t.layers.length) return false; set(W, L + 1, 0); return true }, 700)
  const manual = (w: number, l: number, s = 0) => { player.stop(); set(w, Math.max(1, Math.min(trace(w).layers.length, l)), s) }

  const table = useMemo(() => TABLE_WIDTHS.map(w => { const tr = trace(w), fl = firstWin(w), l = tr.layers[fl - 1]; return { w, layers: tr.layers.length, first: l.wins.length ? { layer: fl, moves: Math.min(...l.wins.map(x => x.moves)) } : null, best: tr.best?.moves ?? null } }), [])

  const steps: Step[] = [
    { title: 'One layer',
      body: (() => { const l = trace(5).layers[0]; return <>
        <p>At the start there is a single position. Layer 1 pushes it into the {SLOTS} cells: {l.tried} tries, {l.candidates} new positions. They are ranked by <strong>cost</strong> (the formula of the previous section) and only the <strong>W = 5</strong> cheapest are kept.</p>
        <p>The others will never be seen again: this is what makes the beam fast, and what costs it the guarantee of the exact search. The kept positions are shown below, from the cheapest to the most expensive.</p>
      </> })(),
      show: () => manual(5, 1) },
    { title: 'Ranking by cost',
      body: (() => { const l = trace(5).layers[2]; return <>
        <p>In layer 3, {l.from} positions are pushed into their cells: {l.tried} tries for {l.candidates} new positions, and only {l.kept.length} are kept. The grid shows the best one (n°1); its cost is in the note under the grid.</p>
        <p>Each card gives its cost split in three: tiles left, nearness and moves played. A position with more moves can come first if it lowered the tiles or the nearness.</p>
      </> })(),
      show: () => manual(5, 3) },
    { title: 'Duplicates',
      body: (() => { const k = firstDupe(), l = trace(5).layers[k - 1]; return <>
        <p>In layer {k}, {plural(l.dupes, 'push', 'pushes')} give a position that was already met with as many moves or fewer. They are thrown away before the ranking. Without this, several of the W places would be taken by the same position reached by different paths, and the beam would lose diversity.</p>
      </> })(),
      show: () => manual(5, firstDupe()) },
    { title: 'Up to the win',
      body: (() => { const k = firstWin(5), l = trace(5).layers[k - 1], m = Math.min(...l.wins.map(x => x.moves)); return <>
        <p>In layer {k}, {plural(l.wins.length, 'push wins', 'pushes win')}: the best takes {m} moves{m === OPTIMUM ? ', which is the optimum' : ` (the optimum is ${OPTIMUM})`}. The beam keeps that solution as a bound and goes on: any position that can no longer beat it is dropped.</p>
        <p>Use the &ldquo;Show the solution on the grid&rdquo; button to replay it move by move.</p>
      </> })(),
      show: () => manual(5, firstWin(5)) },
    { title: 'Widening the beam',
      body: (() => { const hit = table.find(r => r.best === OPTIMUM); return <>
        <p>With a bigger W, more positions are kept at each layer, so there is a better chance of keeping the right path. The table below compares the widths on this grid{hit ? `. Here, W = ${hit.w} is enough to find the optimum of ${OPTIMUM} moves` : ''}.</p>
        <p>This grid is small: even a width of 3 is enough. On 6×6 a width of 25 to 200 is usually needed, and on 10×10 the beam is the only engine that wins. The full solver chains rounds of width 25, 50, 100, 200… and reuses the best solution as a bound to go faster.</p>
      </> })(),
      show: () => manual(25, firstWin(25)) },
  ]
  const { index, go } = useStepper('beam', steps, () => present(W, L, sel))

  return (
    <Section id="beam" title="Beam: keep only the best">
      <Lead>Same exploration, layer by layer, but only the W cheapest positions survive each layer.</Lead>
      <Panel>
        <Stepper steps={steps} index={index} go={go} label="The beam search, step by step" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Width</span>
          <div role="group" aria-label="Beam width" className="flex flex-wrap gap-1.5">
            {WIDTHS.map(w => <Button key={w} variant={w === W ? 'default' : 'outline'} aria-pressed={w === W} onClick={() => manual(w, Math.min(L, trace(w).layers.length))}>W = {w}</Button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" aria-label="Previous layer" onClick={() => manual(W, L - 1)}>◀</Button>
          <Button onClick={() => (player.playing ? player.stop() : (L >= t.layers.length && set(W, 1, 0), player.start()))}>{player.playing ? '⏸ Pause' : '▶ Play'}</Button>
          <Button variant="outline" aria-label="Next layer" onClick={() => manual(W, L + 1)}>▶</Button>
        </div>
        <input type="range" min={1} max={t.layers.length} value={L} aria-label="Layer" onChange={e => manual(W, Number(e.target.value))} className="w-full accent-foreground" />
        <p aria-live="polite"><strong>Layer {L}</strong> of {t.layers.length}. {plural(ly.from, 'kept position')} pushed into all their cells ({SLOTS} at the start, fewer once a line has disappeared): {plural(ly.tried + ly.pruned, 'push', 'pushes')}
          {ly.pruned ? `, of which ${ly.pruned} dropped (they can no longer beat the best solution)` : ''}. {ly.dupes} give a position already met, {ly.candidates} are new{win ? `, ${plural(ly.wins.length, 'push wins', 'pushes win')}` : ''}. {kept.length ? <>The <strong>{kept.length}</strong> cheapest are kept.</> : 'Nothing left to keep.'}</p>
        {kept.length > 0 && <>
          <p className="text-sm text-muted-foreground">Kept positions, from the cheapest to the most expensive. Click one to see it on the grid.</p>
          <MiniGrid>
            {kept.map((k, i) => <MiniButton key={k.letters} state={k.state} top={`n°${i + 1}`} bottom={`cost ${k.cost} · ${k.tiles} t. · near ${k.near} · ${k.moves} moves`} pressed={i === sel} label={`Kept position ${i + 1}, cost ${k.cost}`}
              onClick={() => { player.stop(); setSel(i); present(W, L, i) }} />)}
          </MiniGrid>
        </>}
        {win && (
          <div className="flex flex-wrap items-center gap-2">
            <p>A push wins in this layer: <strong>{plural(win.moves, 'move')}</strong>{win.moves === OPTIMUM ? ' (the optimum).' : '.'}</p>
            <Button onClick={() => { player.stop(); stage.playLetters(CANVA, win.letters, root, { chip: `Beam W=${W}`, step: 'the solution' }) }}>Show the solution on the grid</Button>
          </div>)}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Effect of the width on this grid</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3 font-bold">width</th><th className="py-1 pr-3 text-right font-bold">layers</th><th className="py-1 pr-3 text-right font-bold">first win</th><th className="py-1 text-right font-bold">best</th></tr></thead>
              <tbody>{table.map(r => (
                <tr key={r.w} className={`border-t ${r.w === W ? 'font-extrabold' : ''}`}>
                  <td className="py-1 pr-3">W = {r.w}</td><td className="py-1 pr-3 text-right">{r.layers}</td>
                  <td className="py-1 pr-3 text-right">{r.first ? `layer ${r.first.layer} · ${r.first.moves} moves` : 'none'}</td><td className="py-1 text-right">{r.best ?? 'none'}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">The optimum is {OPTIMUM} moves. A narrow beam sometimes loses the right path and finds a longer one; a wide beam keeps it but takes more time.</p>
        </div>
      </Panel>
    </Section>
  )
}
