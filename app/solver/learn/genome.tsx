import { cn } from '@/lib/utils'
import { isWon, MOVE_LETTERS, nearness, step, cloneState, type SimState } from '@/lib/solver/simulate'
import { cost } from './data'

export interface GeneRow { i: number; letter: string; result: 'played' | 'best' | 'ignored' | 'win' | 'after'; tiles?: number; near?: number; cost?: number; moves?: number }
export interface Played {
  rows: GeneRow[]
  states: SimState[]     // the state after each gene (unchanged when the gene is ignored)
  movesAt: number[]      // moves played after each gene, counting from the start of the game
  used: number           // length of the useful prefix
  best: number           // best cost met
  start: number          // cost at the start
  won: boolean
  moves: number
  accepted: string       // the moves that were played
}

// Plays genes (moves) from a position, the way the genetic search evaluates a genome
export function playGenes(state0: SimState, baseMoves: number, letters: string): Played {
  const s = cloneState(state0), states = [cloneState(s)], movesAt = [baseMoves], rows: GeneRow[] = []
  let moves = 0, best = cost(s, baseMoves), used = 0, won = false, accepted = ''
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i]
    if (won) { rows.push({ i, letter, result: 'after' }); states.push(cloneState(s)); movesAt.push(baseMoves + moves); continue }
    if (!step(s, MOVE_LETTERS.indexOf(letter))) { rows.push({ i, letter, result: 'ignored' }); states.push(cloneState(s)); movesAt.push(baseMoves + moves); continue }
    moves++; accepted += letter; states.push(cloneState(s)); movesAt.push(baseMoves + moves)
    if (isWon(s)) { won = true; used = i + 1; rows.push({ i, letter, result: 'win', moves: baseMoves + moves }); continue }
    const c = cost(s, baseMoves + moves), better = c < best
    if (better) { best = c; used = i + 1 }
    rows.push({ i, letter, result: better ? 'best' : 'played', tiles: s.rows * s.cols, near: nearness(s), cost: c })
  }
  return { rows, states, movesAt, used, best, start: cost(state0, baseMoves), won, moves: baseMoves + moves, accepted }
}

// A genome as a row of letters: the useful prefix dark, the tail light, a cut mark, changed genes outlined
export function Seq({ letters, used, cut, changed, current, ignored }: { letters: string; used: number; cut?: number; changed?: Set<number>; current?: number; ignored?: Set<number> }) {
  return (
    <span className="flex flex-wrap items-center gap-0.5 font-mono text-sm">
      {[...letters].map((l, i) => (
        <span key={i} className={cn('inline-block min-w-[1.4em] rounded-sm px-1 text-center', i < used ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
          cut === i + 1 && 'border-r-[3px] border-foreground', changed?.has(i) && 'outline-2 outline-foreground', i === current && 'outline-[3px] outline-foreground', ignored?.has(i) && 'line-through opacity-60')}>{l}</span>))}
    </span>
  )
}
