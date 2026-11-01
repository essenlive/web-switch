'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { isWon } from '@/lib/solver/simulate'
import { ringIndex } from '@/lib/solver/ring'
import type { SimState } from '@/lib/solver/simulate'
import { ACTION_END, ACTIONS, FRAMES, OPTIMUM, SOL } from '../data'
import { describeLine, plural } from '../format'
import { Lead, Panel, Section } from '../section'
import { useStage, wait, type ShowOptions } from '../stage'
import { Stepper, useStepper, type Step } from '../stepper'
import { Chip, Chips } from '../tile'

interface Played { state: SimState; moves: number; letters: string }
const F = FRAMES.states
const START: Played = { state: F[0], moves: 0, letters: '' }
const ringOf = (s: SimState) => ringIndex(s, s.x, s.y)
const removedOf = (action: number) => FRAMES.moves[ACTION_END[action] - 1].removed

export function Terrain() {
  const stage = useStage()
  const [free, setFree] = useState<{ now: Played; stack: Played[] }>({ now: START, stack: [] })
  const showFrame = (k: number, o: ShowOptions = {}) => stage.show(F[k], { chip: 'Terrain', step: `after ${plural(k, 'move')}`, moves: k, letters: SOL.slice(0, k), ...o })

  // Your turn: the push cells are clickable. The handlers read the grid itself, so they never go stale.
  const freeShow = (p: Played) => stage.show(p.state, { chip: 'Your turn', step: plural(p.moves, 'move'), moves: p.moves, letters: p.letters, onSlot: freePlay, note: isWon(p.state) ? '' : 'Click a cell of the ring.' })
  const freePlay = async (slot: number) => {
    const before = stage.read()
    await stage.playAction(slot)
    const after = stage.read()
    setFree(f => ({ now: after, stack: [...f.stack, before] }))
    freeShow(after)
  }
  const restart = () => { setFree({ now: START, stack: [] }); freeShow(START) }
  const undo = () => { const last = free.stack.at(-1); if (!last) return; setFree(f => ({ now: last, stack: f.stack.slice(0, -1) })); freeShow(last) }
  const playOptimum = () => stage.holdWhile(async () => {
    setFree({ now: START, stack: [] }); freeShow(START); await wait(300)
    for (const a of ACTIONS) { await freePlay(a.slot); await wait(200) }
  })

  const rowBefore = Array.from(F[1].cells.subarray(0, 4)), rowAfter = Array.from(F[2].cells.subarray(0, 4))
  const second = removedOf(1), last = removedOf(3)
  const steps: Step[] = [
    { title: 'The grid and the tile in hand',
      body: <>
        <p>This is the grid <code>4x4:a</code>. It has four colors, and each color has its own shape: <Chip value={1} /> red circle, <Chip value={2} /> blue square, <Chip value={3} /> green triangle, <Chip value={4} /> yellow diamond.</p>
        <p>Around the grid, the dashed crown is the <strong>ring</strong>: the only place the cursor can go. It starts in the bottom left corner holding a <Chip value={1} />. The shortest solution of this grid takes {OPTIMUM} moves, and that is the one we follow.</p>
      </>,
      show: () => showFrame(0, { step: 'start grid' }) },
    { title: 'The ring: 20 cells, 16 to push from',
      body: <>
        <p>The ring cells are numbered from 0 to 19, clockwise from the bottom left corner. The four corners (0, 5, 10 and 15) only serve to pass from one side to the next.</p>
        <p>The other 16 cells, with an arrow, are <strong>push cells</strong>: from there, the tile in hand is pushed into the grid. An 8×8 grid has a ring of 36 cells and 32 push cells.</p>
      </>,
      show: () => showFrame(0, { numbers: true, step: 'numbered ring' }) },
    { title: 'Walking: one move, the grid stays the same',
      body: <>
        <p>The cursor goes up one cell along the left side: one move. It is now on cell 19, and the tiles did not move.</p>
        <p><strong>Walking never changes the grid.</strong> That is why the solver does not search where to walk but where to push, and counts the walk as a cost.</p>
      </>,
      from: () => showFrame(0, { numbers: true }), animate: () => stage.walk(SOL[0]),
      show: () => showFrame(1, { numbers: true, path: [ringOf(F[0]), ringOf(F[1])], step: 'after 1 move (a walk)' }) },
    { title: 'Pushing: one tile goes in, another comes out',
      body: <>
        <p>The cursor pushes to the right. The bottom row <Chips values={rowBefore} /> receives <Chip value={F[1].held} /> from the left and becomes <Chips values={rowAfter} />.</p>
        <p>The tile that comes out on the right, <Chip value={F[2].held} />, is now in the cursor&apos;s hand, and the cursor jumped to the opposite side. This first action costs {ACTIONS[0].cost} moves: {plural(ACTIONS[0].walk.length, 'step')} of walking and one push.</p>
      </>,
      from: () => showFrame(1), animate: () => stage.playAction(ACTIONS[0].slot).then(() => undefined), show: () => showFrame(2, { step: 'after the 1st action' }) },
    { title: 'A uniform line disappears',
      body: <>
        <p>The cursor walks {ACTIONS[1].walk.length} cells along the right side, then pushes left into the top row: {ACTIONS[1].cost} moves. Right after the push, {second.map(l => describeLine(l, 4)).join(', then ')} holds only <Chip value={1} />: it disappears.</p>
        <p>The grid goes from 4×4 to 4×3. Total: {ACTION_END[1]} moves. Removing lines is the only way forward: you win when only one line is left.</p>
      </>,
      from: () => showFrame(ACTION_END[0]), animate: () => stage.playAction(ACTIONS[1].slot).then(() => undefined), show: () => showFrame(ACTION_END[1], { step: 'after the 2nd action' }) },
    { title: 'Two removals in a row, then the win',
      body: <>
        <p>Third action: one step down, then a push to the right ({ACTIONS[2].cost} moves). Nothing disappears, but the grid is getting ready.</p>
        <p>Fourth action: one step up, then a push to the left ({ACTIONS[3].cost} moves). This time {plural(last.length, last[0]?.kind === 'row' ? 'row' : 'column')} disappear one after the other. Only one column is left: <strong>won in {OPTIMUM} moves</strong>, with just 4 pushes. The other moves are walking.</p>
      </>,
      from: () => showFrame(ACTION_END[1]),
      animate: async () => { await stage.playAction(ACTIONS[2].slot); await wait(250); await stage.playAction(ACTIONS[3].slot) },
      show: () => showFrame(OPTIMUM, { step: `won in ${OPTIMUM} moves` }) },
    { title: 'Your turn',
      body: <p>The grid is now playable: click a cell of the ring. The cursor walks there by the shortest way, then pushes. Try to do better than {OPTIMUM} moves. You can&apos;t: the exact search proved it.</p>,
      extra: <div className="flex flex-col gap-2">
        <p role="status" className="font-bold">{isWon(free.now.state) ? `Won in ${free.now.moves} moves. ${free.now.moves === OPTIMUM ? 'That is the optimum.' : `The optimum is ${OPTIMUM}.`}` : `${plural(free.now.moves, 'move')} played. The optimum is ${OPTIMUM}.`}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={restart}>Restart</Button>
          <Button variant="outline" disabled={!free.stack.length} onClick={undo}>Undo</Button>
          <Button variant="outline" onClick={playOptimum}>Play the optimum</Button>
        </div>
      </div>,
      show: () => freeShow(free.now) },
  ]
  const { index, go } = useStepper('terrain', steps)
  return (
    <Section id="terrain" title="The terrain">
      <Lead>The rules of the game, on the example grid. On the last step, the grid becomes playable.</Lead>
      <Panel><Stepper steps={steps} index={index} go={go} label="The terrain, step by step" /></Panel>
    </Section>
  )
}
