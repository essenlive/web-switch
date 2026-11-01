'use client'

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { slotLetters } from '@/lib/solver/ring'
import { cloneState, evaluate, isWon, MOVE_LETTERS, step, type Line, type SimState } from '@/lib/solver/simulate'
import { decompose, uniformLines } from '@/lib/solver/trace'

// The grid that stays next to the text. Every section drives it through show() and the animated plays;
// the board component only draws what this object says.

export interface ShowOptions {
  chip?: string          // which method is driving the grid
  step?: string          // where that method is
  note?: string
  moves?: number
  letters?: string       // the moves from the start to this position
  numbers?: boolean      // number the ring cells
  path?: number[]        // ring cells to highlight (a walk)
  target?: number | null // the ring cell aimed at
  onSlot?: (slot: number) => void // makes the push cells clickable
}

export interface BoardSnapshot {
  state: SimState
  moves: number
  letters: string
  chip: string
  step: string
  note: string
  numbers: boolean
  path: number[]
  target: number | null
  flash: Line[]          // lines about to disappear
  interactive: boolean
  held: boolean          // an animation is running: other sections must leave the grid alone
  showCosts: boolean
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, reducedMotion() ? 0 : ms))

export class Stage {
  private work: SimState
  private meta = { moves: 0, letters: '', chip: '', step: '', note: '', numbers: false, path: [] as number[], target: null as number | null, flash: [] as Line[] }
  private onSlot: ((slot: number) => void) | null = null
  private busy = false
  private holds = 0
  private showCosts = false
  private pending: (() => void) | null = null
  private sections = new Map<string, () => void>()
  private listeners = new Set<() => void>()
  private snapshot: BoardSnapshot

  constructor(start: SimState) {
    this.work = cloneState(start)
    this.snapshot = this.build()
  }

  private build(): BoardSnapshot {
    const m = this.meta
    return { state: cloneState(this.work), moves: m.moves, letters: m.letters, chip: m.chip, step: m.step, note: m.note, numbers: m.numbers, path: m.path, target: m.target, flash: m.flash,
      interactive: !!this.onSlot && !this.busy && !isWon(this.work), held: this.holds > 0 || this.busy, showCosts: this.showCosts }
  }
  private emit() { this.snapshot = this.build(); this.listeners.forEach(l => l()) }
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getSnapshot = () => this.snapshot

  show(state: SimState, o: ShowOptions = {}) {
    this.work = cloneState(state)
    this.meta = { moves: o.moves ?? 0, letters: o.letters ?? '', chip: o.chip ?? this.meta.chip, step: o.step ?? '', note: o.note ?? '', numbers: o.numbers ?? false, path: o.path ?? [], target: o.target ?? null, flash: [] }
    this.onSlot = o.onSlot ?? null
    this.busy = false
    this.emit()
  }
  setCosts(on: boolean) { this.showCosts = on; this.emit() }
  slot(slot: number) { this.onSlot?.(slot) }
  // What is on the grid now (after plays)
  read() { return { state: cloneState(this.work), moves: this.meta.moves, letters: this.meta.letters } }

  // While something plays, a section scrolled into view must not take the grid over; it does so once the play is over
  async holdWhile<T>(fn: () => Promise<T>): Promise<T> {
    this.holds++; this.emit()
    try { return await fn() } finally {
      this.holds--
      if (!this.holds && this.pending) { const p = this.pending; this.pending = null; p() }
      this.emit()
    }
  }

  // Walks to the slot, pushes, shows the lines about to go, then removes them. Returns the lines removed.
  playAction(slot: number): Promise<Line[]> {
    return this.holdWhile(async () => {
      const s = this.work
      if (this.busy || isWon(s)) return []
      this.busy = true; this.emit()
      const letters = slotLetters(s, slot), walk = letters.slice(0, -1), push = letters.slice(-1)
      for (const l of walk) { step(s, MOVE_LETTERS.indexOf(l)); this.meta.moves++; this.meta.letters += l; this.emit(); await wait(70) }
      step(s, MOVE_LETTERS.indexOf(push), undefined, true); this.meta.moves++; this.meta.letters += push
      const lines = uniformLines(s)
      this.meta.flash = lines; this.emit()
      if (lines.length) await wait(560)
      const removed: Line[] = []
      evaluate(s, removed)
      this.meta.flash = []; this.busy = false; this.emit()
      return removed
    })
  }
  walk(letters: string): Promise<void> {
    return this.holdWhile(async () => {
      this.busy = true; this.emit()
      for (const l of letters) { step(this.work, MOVE_LETTERS.indexOf(l)); this.meta.moves++; this.meta.letters += l; this.emit(); await wait(120) }
      this.busy = false; this.emit()
    })
  }

  // Replays a list of moves from the start, action by action (walk and push)
  playLetters(canva: number[][], letters: string, start: SimState, o: ShowOptions = {}): Promise<void> {
    return this.holdWhile(async () => {
      this.show(start, o); await wait(250)
      for (const a of decompose(canva, letters)) { await this.playAction(a.slot); await wait(180) }
    })
  }

  // Sections register what they show; the page asks for it when the section comes to the middle of the screen
  register(id: string, refresh: () => void) { this.sections.set(id, refresh); return () => { this.sections.delete(id) } }
  activate(id: string) {
    const refresh = this.sections.get(id)
    if (!refresh) return
    if (this.holds || this.busy) this.pending = refresh; else refresh()
  }
}

const StageContext = createContext<Stage | null>(null)
export const StageProvider = StageContext.Provider
export function useStage() {
  const stage = useContext(StageContext)
  if (!stage) throw new Error('useStage outside of the learn page')
  return stage
}
// Calls `tick` every `ms` while playing; tick returns false when there is nothing left to play
export function usePlayer(tick: () => boolean, ms: number) {
  const [playing, setPlaying] = useState(false)
  const latest = useRef(tick)
  useEffect(() => { latest.current = tick })
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => { if (!latest.current()) setPlaying(false) }, ms)
    return () => clearInterval(id)
  }, [playing, ms])
  return { playing, start: () => setPlaying(true), stop: () => setPlaying(false) }
}
export function useBoard() {
  const stage = useStage()
  return useSyncExternalStore(stage.subscribe, stage.getSnapshot, stage.getSnapshot)
}
// A section tells what it shows on the grid, and the page asks for it when the section is in view
export function useSectionRefresh(id: string, refresh: () => void) {
  const stage = useStage()
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh })
  useEffect(() => stage.register(id, () => latest.current()), [stage, id])
}
