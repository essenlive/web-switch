import type { Line } from '@/lib/solver/simulate'

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`
export const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ')

// "the second column from the left", "the top row"
export function describeLine(l: Line, rows: number) {
  if (l.kind === 'col') return `the ${ordinal(l.index + 1)} column from the left`
  return l.index === rows - 1 ? 'the top row' : l.index === 0 ? 'the bottom row' : `the ${ordinal(l.index + 1)} row from the bottom`
}
