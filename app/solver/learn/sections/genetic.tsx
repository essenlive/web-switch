'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createGA, mulberry32, type GASnapshot } from '@/lib/solver/ga'
import { createState, MOVE_LETTERS } from '@/lib/solver/simulate'
import { CANVA, OPTIMUM } from '../data'
import { ChartBox, LineChart } from '../charts'
import { plural } from '../format'
import { Seq, playGenes } from '../genome'
import { Lead, Panel, Section, TryIt } from '../section'
import { MiniButton, MiniGrid } from '../mini-button'
import { usePlayer, useStage } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'

const EXAMPLE = 'luruuuldlrdrlrdldu' // one ignored move, six useful ones, then a tail that improves nothing
const START = createState(CANVA)
const OPTS = {
  staged: { population: 1000, length: 8, generations: 6, maxStages: 30 },
  single: { population: 300, length: 30, maxStages: 1 },
} as const
type Mode = 'staged' | 'single'
interface Run { snaps: GASnapshot[]; won: boolean; moves: number }

// The genetic search on the example grid, one snapshot per generation, until the first win
function runGA(mode: Mode, seed: number): Run {
  const snaps: GASnapshot[] = []
  const ga = createGA(CANVA, { ...OPTS[mode], seed, onGeneration: s => snaps.push(s) })
  let st = ga.step()
  for (let i = 0; i < 200 && !st.won; i++) st = ga.step()
  return { snaps, won: st.won, moves: st.moves }
}
// Chance enters here, at the module level, so that the page itself stays a pure function of its state
const randomInt = (n: number) => Math.floor(Math.random() * n)
function mutateGenome(genome: string, used: number, kind: 'change' | 'insert' | 'delete' | 'redo'): string {
  const g = genome.split(''), len = g.length
  if (!len) return genome
  const pos = Math.random() < 0.5 ? randomInt(Math.max(1, used)) : Math.min(len - 1, used + randomInt(len - used))
  if (kind === 'change') g[pos] = MOVE_LETTERS[(MOVE_LETTERS.indexOf(g[pos]) + 1 + randomInt(3)) & 3]
  else if (kind === 'insert') { g.splice(pos, 0, MOVE_LETTERS[randomInt(4)]); g.pop() }
  else if (kind === 'delete') { g.splice(pos, 1); g.push(MOVE_LETTERS[randomInt(4)]) }
  else { const end = Math.min(len, pos + 2 + randomInt(7)); for (let i = pos; i < end; i++) g[i] = MOVE_LETTERS[randomInt(4)] }
  return g.join('')
}
const randomGenome = (n: number) => Array.from({ length: n }, () => MOVE_LETTERS[randomInt(4)]).join('')

// A genome of a snapshot, played from the position its stage started it from
const traceOf = (snap: GASnapshot, i: number) => { const t = snap.top[i], p = snap.pool[t.start]; return { t, p, ...playGenes(p.state, p.moves.length, t.genome.slice(0, t.used)) } }

// An example of reproduction: two parents, a cut, one mutation
function makeChild(snap: GASnapshot, seed: number, variant: number) {
  const A = snap.top[0], B = snap.top.slice(1).find(t => t.start === A.start)
  if (!B) return null
  const rand = mulberry32(seed * 1000 + snap.generation * 7 + variant), len = A.genome.length
  const cut = Math.floor(rand() * Math.max(1, A.used))
  const crossed = A.genome.slice(0, cut) + B.genome.slice(cut), g = crossed.split('')
  const kind = rand(), pos = rand() < 0.5 ? Math.floor(rand() * Math.max(1, A.used)) : Math.min(len - 1, A.used + Math.floor(rand() * (len - A.used)))
  const changed = new Set<number>()
  let what: string
  if (kind < 0.45) { g[pos] = MOVE_LETTERS[(MOVE_LETTERS.indexOf(g[pos]) + 1 + Math.floor(rand() * 3)) & 3]; changed.add(pos); what = `change gene ${pos + 1}` }
  else if (kind < 0.7) { g.splice(pos, 0, MOVE_LETTERS[Math.floor(rand() * 4)]); g.pop(); changed.add(pos); what = `insert a gene at position ${pos + 1} (the tail slides, the last gene falls off)` }
  else if (kind < 0.9) { g.splice(pos, 1); g.push(MOVE_LETTERS[Math.floor(rand() * 4)]); changed.add(len - 1); what = `delete gene ${pos + 1} (the tail slides, a random gene enters at the end)` }
  else { const end = Math.min(len, pos + 2 + Math.floor(rand() * 7)); for (let i = pos; i < end; i++) { g[i] = MOVE_LETTERS[Math.floor(rand() * 4)]; changed.add(i) } what = `redo genes ${pos + 1} to ${end}` }
  const child = g.join(''), base = snap.pool[A.start], played = playGenes(base.state, base.moves.length, child)
  return { A, B, cut, crossed, child, changed, what, played, base }
}

// The first child of this generation that makes progress, so that the first example shows something
const firstProgress = (snap: GASnapshot, seed: number) => { for (let v = 0; v < 40; v++) if ((makeChild(snap, seed, v)?.played.used ?? 0) > 0) return v; return 0 }

export function Genetic() {
  const stage = useStage()
  const [panel, setPanel] = useState<'decoder' | 'population'>('decoder')
  const [genome, setGenome] = useState(EXAMPLE)
  const [scrub, setScrub] = useState(0)
  const [mode, setMode] = useState<Mode>('staged')
  const [seed, setSeed] = useState(3)
  const [run, setRun] = useState(() => runGA('staged', 3))
  const [gi, setGi] = useState(0)
  const [sel, setSel] = useState(0)
  const [k, setK] = useState<number | null>(null)
  const [variant, setVariant] = useState(0)

  // ---- what the grid shows
  const showDecoder = (g: string, s: number) => {
    const r = playGenes(START, 0, g), kk = Math.min(s, g.length)
    stage.show(r.states[kk], { chip: 'Genetic', step: `genome · gene ${kk} of ${g.length}`, moves: r.movesAt[kk], letters: r.accepted.slice(0, r.movesAt[kk]),
      note: kk ? `Gene ${kk}: ${g[kk - 1]}, ${r.rows[kk - 1].result === 'ignored' ? 'ignored' : r.rows[kk - 1].result === 'after' ? 'after the win' : 'played'}.` : 'No gene played yet.' })
  }
  const showPop = (rn: Run, g: number, s: number, kv: number | null) => {
    const snap = rn.snaps[g], tr = traceOf(snap, s), kk = kv == null ? tr.states.length - 1 : Math.min(kv, tr.states.length - 1), base = tr.p.moves
    stage.show(tr.states[kk], { chip: 'Genetic', step: `generation ${snap.generation} · genome n°${s + 1}`, moves: tr.movesAt[kk], letters: base + tr.accepted.slice(0, tr.movesAt[kk] - base.length),
      note: `This genome is played from ${snap.pool.length === 1 && snap.pool[0].moves.length === 0 ? 'the start' : `position n°${snap.top[s].start} of the stage`}.` })
  }
  const openPopulation = (rn: Run, g: number) => { setPanel('population'); setGi(g); setSel(0); setK(null); showPop(rn, g, 0, null) }
  const newRun = (m: Mode, sd: number) => { const rn = runGA(m, sd); setMode(m); setSeed(sd); setRun(rn); openPopulation(rn, 0) }
  const editGenome = (next: string) => { const s = Math.min(scrub, next.length); setGenome(next); setScrub(s); showDecoder(next, s) }
  const mutate = (kind: 'change' | 'insert' | 'delete' | 'redo') => editGenome(mutateGenome(genome, playGenes(START, 0, genome).used, kind))

  const G = run.snaps.length, snap = run.snaps[gi], top = snap.top[0], single = mode === 'single'
  const player = usePlayer(() => { if (gi >= G - 1) return false; openPopulation(run, gi + 1); return true }, 450)
  const manual = (g: number) => { player.stop(); openPopulation(run, Math.max(0, Math.min(G - 1, g))) }

  // ---- the decoder
  const r = playGenes(START, 0, genome), sc = Math.min(scrub, genome.length)
  const exampleResult = playGenes(START, 0, EXAMPLE)

  // ---- the population
  const tr = traceOf(snap, sel), kk = k == null ? tr.states.length - 1 : Math.min(k, tr.states.length - 1)
  const child = makeChild(snap, seed, firstProgress(snap, seed) + variant)
  const lines = run.snaps.map(s => [s.generation, s.top[0].won ? 0 : s.top[0].tiles] as [number, number])

  const steps: Step[] = [
    { title: 'A genome',
      body: <>
        <p>A genome is a list of moves: here {EXAMPLE.length} letters (<code>u r d l</code>: up, right, down, left). The game <strong>ignores an impossible move</strong>: the first one, <code>l</code>, tries to go left from the left side, and it is struck out. So every genome is valid: there is nothing to repair.</p>
        <p>Drag the &ldquo;Genes played&rdquo; slider: the grid plays the genome gene by gene. You can also edit the genome or apply a mutation.</p>
      </>,
      show: () => { setPanel('decoder'); setScrub(0); showDecoder(genome, 0) } },
    { title: 'Its value: the useful prefix',
      body: <>
        <p>At each accepted move, we compute the cost of the previous section. The value of a genome is <strong>the best cost met along the way</strong>: here {exampleResult.best}, reached after {exampleResult.used} genes, against {exampleResult.start} at the start. The dark genes are this &ldquo;useful prefix&rdquo;.</p>
        <p>What follows, the tail, does not count: the cost goes back up (each move costs 1) and the genome gains nothing by playing it. It is a free zone where mutations can explore without breaking anything. A genome that wins is worth its number of moves, which always beats a position that is not won.</p>
      </>,
      show: () => { setPanel('decoder'); const s = Math.min(exampleResult.used + 1, genome.length); setScrub(s); showDecoder(genome, s) } },
    { title: 'A random population',
      body: <>
        <p>Generation 0 is made of {OPTS[mode].population} random genomes. They are ranked by value: the table shows the eight best, with their useful prefix in dark. Click a row to play that genome on the grid.</p>
        <p>Most random genomes are worth nothing (empty prefix). This is why the population is large, and why selection matters.</p>
      </>,
      show: () => { player.stop(); openPopulation(run, 0) } },
    { title: 'Reproduction: selection, crossover, mutation',
      body: <>
        <p>A new generation is made like this: the best 2% go through unchanged (the elite); the others are children. A parent is the best of 3 genomes drawn at random. One time in two, the start of one parent is glued to the end of another, as long as they start from the same position. Then 1 to 4 mutations: change a move (45%), insert (25%), delete (20%) or redo 2 to 8 genes (10%). Half the mutations land in the useful prefix, half in the tail.</p>
        <p>The &ldquo;example of reproduction&rdquo; block redoes this with the two best genomes of the displayed generation. &ldquo;Another child&rdquo; draws another.</p>
      </>,
      show: () => { player.stop(); openPopulation(run, Math.min(2, G - 1)) } },
    { title: 'Generations',
      body: <>
        <p>Move the generations forward. The best genome improves: its tiles left go down as it reaches lines. {run.won ? `With seed ${seed}, a win appears at generation ${G - 1}, in ${run.moves} moves${run.moves === OPTIMUM ? ': the optimum.' : ` (the optimum is ${OPTIMUM}).`}` : 'With this seed, no win in the generations computed.'}</p>
        <p>The full solver does not stop at the first win: it starts a pass that has to be shorter. &ldquo;Another seed&rdquo; gives another story.</p>
      </>,
      show: () => { player.stop(); openPopulation(run, G - 1) } },
    { title: 'In stages',
      body: <>
        <p>A single long genome is too hard on big grids. The staged mode searches {OPTS.staged.length} moves at a time. For {OPTS.staged.generations} generations, genomes start from the grid. Then the best <strong>distinct</strong> positions reached are kept (up to 100), and the next stage spreads the population among them: each genome starts from one of these positions.</p>
        <p>The starting positions of the displayed generation are shown below. Move the generations forward in &ldquo;In stages&rdquo; mode: at generation {OPTS.staged.generations + 1}, stage 1 starts from the kept positions.</p>
      </>,
      show: () => { player.stop(); if (mode !== 'staged') newRun('staged', seed); else openPopulation(run, G - 1) } },
  ]
  const { index, go } = useStepper('genetic', steps, () => (panel === 'decoder' ? showDecoder(genome, sc) : showPop(run, gi, sel, k)))

  return (
    <Section id="genetic" title="Genetic: evolve lists of moves">
      <Lead>Instead of exploring methodically, we draw lists of moves at random and keep the best ones, generation after generation.</Lead>
      <Panel>
        <Stepper steps={steps} index={index} go={go} label="The genetic search, step by step" />
        {panel === 'decoder' && (
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted-foreground">Genome, edit it freely (u r d l)
              <input value={genome} spellCheck={false} autoComplete="off" onChange={e => editGenome(e.target.value.toLowerCase().replace(/[^urdl]/g, '').slice(0, 30))}
                className="w-full rounded-md border bg-background px-2.5 py-2 font-mono text-base text-foreground" />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Mutation:</span>
              {([['change', 'Change a move'], ['insert', 'Insert'], ['delete', 'Delete'], ['redo', 'Redo 2 to 8']] as const).map(([kind, label]) => <Button key={kind} variant="outline" onClick={() => mutate(kind)}>{label}</Button>)}
              <Button variant="outline" onClick={() => editGenome(randomGenome(15))}>Random</Button>
              <Button variant="outline" onClick={() => { setScrub(0); setGenome(EXAMPLE); showDecoder(EXAMPLE, 0) }}>Example</Button>
            </div>
            <label className="flex flex-col gap-0.5 text-sm font-semibold text-muted-foreground">Genes played
              <input type="range" min={0} max={genome.length} value={sc} aria-label="Genes played" className="w-full accent-foreground" onChange={e => { const s = Number(e.target.value); setScrub(s); showDecoder(genome, s) }} />
            </label>
            <div aria-hidden><Seq letters={genome} used={r.used} current={sc - 1} ignored={new Set(r.rows.filter(x => x.result === 'ignored').map(x => x.i))} /></div>
            <p aria-live="polite">{r.won ? `Win in ${r.moves} moves: the value of the genome is ${r.moves}, better than that of any position that is not won.`
              : r.used === 0 ? `Start: cost ${r.start}. No move goes below this cost: the useful prefix is empty, this genome is worth nothing.`
              : <>Start: cost <strong>{r.start}</strong>. Best cost reached: <strong>{r.best}</strong>, after {r.used} genes (the dark genes). The rest is the tail: it does not count, and mutates freely.</>}</p>
            <ChartBox title="Cost after each gene played" value={`start ${r.start}`}>
              {(() => { const pts: [number, number][] = [[0, r.start]]; r.rows.forEach(x => { if (x.cost != null) pts.push([x.i + 1, x.cost]) }); const ys = pts.map(p => p[1])
                return <LineChart points={pts} xmax={Math.max(1, genome.length)} ymin={Math.min(...ys) - 3} ymax={Math.max(...ys) + 3} mark={pts.some(p => p[0] === sc) ? sc : null} height={80} label="Cost of the position after each gene played" /> })()}
            </ChartBox>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-1 pr-2 text-right font-bold">#</th><th className="py-1 pr-2 font-bold">move</th><th className="py-1 pr-2 font-bold">result</th><th className="py-1 pr-2 text-right font-bold">tiles</th><th className="py-1 pr-2 text-right font-bold">near</th><th className="py-1 text-right font-bold">cost</th></tr></thead>
                <tbody>{r.rows.map(x => (
                  <tr key={x.i} className={`border-t ${x.result === 'best' || x.i === sc - 1 ? 'font-extrabold' : ''} ${x.result === 'ignored' || x.result === 'after' ? 'text-muted-foreground' : ''}`}>
                    <td className="py-1 pr-2 text-right">{x.i + 1}</td><td className="py-1 pr-2 font-mono">{x.letter}</td>
                    <td className="py-1 pr-2">{{ played: 'played', best: 'best so far', ignored: 'ignored', win: 'win', after: 'after the win' }[x.result]}</td>
                    <td className="py-1 pr-2 text-right">{x.tiles ?? ''}</td><td className="py-1 pr-2 text-right">{x.near ?? ''}</td><td className="py-1 text-right">{x.cost ?? x.moves ?? ''}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          </div>)}

        {panel === 'population' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mode">
              <Button variant={mode === 'staged' ? 'default' : 'outline'} aria-pressed={mode === 'staged'} onClick={() => { player.stop(); newRun('staged', seed) }}>In stages ({OPTS.staged.length} genes, {OPTS.staged.generations} generations)</Button>
              <Button variant={mode === 'single' ? 'default' : 'outline'} aria-pressed={mode === 'single'} onClick={() => { player.stop(); newRun('single', seed) }}>One stage ({OPTS.single.length} genes)</Button>
              <Button variant="outline" onClick={() => { player.stop(); newRun(mode, 1 + randomInt(98)) }}>Another seed</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="outline" aria-label="Previous generation" onClick={() => manual(gi - 1)}>◀</Button>
              <Button onClick={() => (player.playing ? player.stop() : (gi >= G - 1 && openPopulation(run, 0), player.start()))}>{player.playing ? '⏸ Pause' : '▶ Play'}</Button>
              <Button variant="outline" aria-label="Next generation" onClick={() => manual(gi + 1)}>▶</Button>
            </div>
            <input type="range" min={0} max={G - 1} value={gi} aria-label="Generation" onChange={e => manual(Number(e.target.value))} className="w-full accent-foreground" />
            <p aria-live="polite">Generation <strong>{snap.generation}</strong> of {G - 1}{single ? '' : <> · stage <strong>{snap.stage}</strong>, generation {snap.stageGeneration} of the stage</>}. Population of {OPTS[mode].population} genomes of {OPTS[mode].length} genes. {top.won ? <strong>The best genome wins in {top.moves + snap.pool[top.start].moves.length} moves.</strong> : `The best leaves ${top.tiles} tiles${top.used ? '' : ' (no progress)'}.`}</p>
            <ChartBox title="Tiles left, best genome" value={run.won ? `win at generation ${G - 1}` : `${top.tiles}`}>
              <LineChart points={lines} xmax={Math.max(1, G - 1)} ymin={0} ymax={16} mark={snap.generation} label="Tiles left of the best genome by generation" />
            </ChartBox>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-1 pr-2 text-right font-bold">rank</th><th className="py-1 pr-2 font-bold">genome (dark: useful prefix)</th><th className="py-1 pr-2 text-right font-bold">tiles</th><th className="py-1 pr-2 text-right font-bold">near</th>{!single && <th className="py-1 text-right font-bold">start</th>}</tr></thead>
                <tbody>{snap.top.map((t, i) => (
                  <tr key={i} onClick={() => { player.stop(); setSel(i); setK(null); showPop(run, gi, i, null) }} className={`cursor-pointer border-t ${i === sel ? 'font-extrabold' : ''}`}>
                    <td className="py-1 pr-2 text-right">{i + 1}</td><td className="py-1 pr-2"><Seq letters={t.genome} used={t.used} /></td>
                    <td className="py-1 pr-2 text-right">{t.won ? 'won' : t.tiles}</td><td className="py-1 pr-2 text-right">{t.won ? '·' : t.near}</td>{!single && <td className="py-1 text-right">n°{t.start}</td>}
                  </tr>))}</tbody>
              </table>
            </div>
            <label className="flex flex-col gap-0.5 text-sm font-semibold text-muted-foreground">Play genome n°{sel + 1}: {kk} of {tr.states.length - 1} {kk === 1 ? 'move' : 'moves'}
              <input type="range" min={0} max={tr.states.length - 1} value={kk} aria-label="Moves played" className="w-full accent-foreground" onChange={e => { const v = Number(e.target.value); setK(v); showPop(run, gi, sel, v) }} />
            </label>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Example of reproduction at this generation</h3>
            {child ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-muted-foreground">Parent A (the best), parent B (the next one that starts from the same position), a cut after gene {child.cut}, then a mutation.</p>
                <div className="flex items-center gap-2"><span className="w-4 text-sm text-muted-foreground">A</span><Seq letters={child.A.genome} used={child.A.used} cut={child.cut} /></div>
                <div className="flex items-center gap-2"><span className="w-4 text-sm text-muted-foreground">B</span><Seq letters={child.B.genome} used={child.B.used} cut={child.cut} /></div>
                <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">A[0..{child.cut}] + B[{child.cut}..]</span><Seq letters={child.crossed} used={Math.min(child.A.used, child.cut)} cut={child.cut} /></div>
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">mutation: {child.what}</span><Seq letters={child.child} used={child.played.used} changed={child.changed} /></div>
                <p>Child: {child.played.won ? <strong>wins in {child.played.moves} moves</strong> : child.played.used ? <>best cost <strong>{child.played.best}</strong> after {child.played.used} genes</> : 'no progress'}. Parent A {child.A.won ? 'was a win' : `had ${child.A.tiles} tiles and a nearness of ${child.A.near}`}. A child is only kept if, once ranked with the others, it lands among the best.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setVariant(v => v + 1)}>Another child</Button>
                  <Button onClick={() => { player.stop(); const p = child.played, m = p.movesAt[p.used]; stage.show(p.states[p.used], { chip: 'Genetic', step: 'the child, played', moves: m, letters: child.base.moves + p.accepted.slice(0, m - child.base.moves.length) }) }}>Show the child on the grid</Button>
                </div>
              </div>) : <p className="text-sm">No crossover possible here: the best genomes do not start from the same position.</p>}
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Starting positions of the stage</h3>
            {single ? <p className="text-sm text-muted-foreground">One stage: every genome starts from the start grid.</p> : <>
              <p className="text-sm text-muted-foreground">{plural(snap.pool.length, 'starting position')} at this generation (stage {snap.stage}). In stage 0 there is only the start; after that, they are the best positions reached at the end of the previous stage, and the genomes are spread among them.</p>
              <MiniGrid>
                {snap.pool.slice(0, 18).map((p, i) => <MiniButton key={i} state={p.state} top={`n°${i}`} bottom={`${p.moves.length} moves · cost ${p.cost}`} label={`Starting position ${i}`}
                  onClick={() => { player.stop(); stage.show(p.state, { chip: 'Genetic', step: `start n°${i} of stage ${snap.stage}`, moves: p.moves.length, letters: p.moves }) }} />)}
              </MiniGrid></>}
          </div>)}
        <TryIt engine="ga-staged" grid="6x6:a" label="Try the genetic search on a 6×6 grid" />
      </Panel>
    </Section>
  )
}
