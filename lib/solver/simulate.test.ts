import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import switchMachine from '@/lib/switchMachine';
import { generateRandomMatrix } from '@/lib/matrixHelpers';
import { createState, cloneState, isWon, nearness, step, MOVE_LETTERS } from '@/lib/solver/simulate';

const NAMES = ['up', 'right', 'down', 'left'] as const;

// Small deterministic generator, the test must not depend on Math.random
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

function toCanva(s: ReturnType<typeof createState>) {
  return Array.from({ length: s.rows }, (_, r) => Array.from(s.cells.subarray(r * s.cols, (r + 1) * s.cols)));
}

describe('simulate matches the machine', () => {
  for (const [seed, cs] of [['a', [6, 8]], ['b', [8, 8]], ['c', [3, 9]], ['d', [10, 4]], ['e', [2, 2]]] as const) {
    it(`grid ${seed} ${cs[0]}x${cs[1]}`, () => {
      const canva = generateRandomMatrix(seed, cs[0], cs[1]);
      const actor = createActor(switchMachine, { input: { canva, timerMode: false, seed: '', url: '' } }).start();
      const sim = createState(canva);
      const rand = lcg(seed.charCodeAt(0));
      let accepted = 0;
      for (let i = 0; i < 4000; i++) {
        const dir = Math.floor(rand() * 4);
        const before = actor.getSnapshot().context.score;
        actor.send({ type: 'input_move', params: { direction: NAMES[dir] } });
        const ctx = actor.getSnapshot().context;
        const ok = step(sim, dir);
        expect(ok, `move ${i} ${MOVE_LETTERS[dir]}`).toBe(ctx.score !== before);
        expect(toCanva(sim), `grid after move ${i}`).toEqual(ctx.canva);
        expect([sim.x, sim.y, sim.held]).toEqual([ctx.cursor.x, ctx.cursor.y, ctx.cursor.value]);
        expect(isWon(sim)).toBe(actor.getSnapshot().value === 'Game_End');
        if (ok) accepted++;
      }
      expect(accepted).toBeGreaterThan(cs[0] * cs[1] > 4 ? 100 : 0);
    });
  }

  it('wins on some random walks of the 3x3 grids, so the win path is covered', () => {
    let wins = 0;
    for (let n = 0; n < 40; n++) {
      const rand = lcg(n);
      const sim = createState(generateRandomMatrix(`w${n}`, 3, 3));
      const actor = createActor(switchMachine, { input: { canva: generateRandomMatrix(`w${n}`, 3, 3), timerMode: false, seed: '', url: '' } }).start();
      for (let i = 0; i < 400 && !isWon(sim); i++) {
        const dir = Math.floor(rand() * 4);
        actor.send({ type: 'input_move', params: { direction: NAMES[dir] } });
        step(sim, dir);
      }
      expect(isWon(sim)).toBe(actor.getSnapshot().value === 'Game_End');
      if (isWon(sim)) wins++;
    }
    expect(wins).toBeGreaterThan(0);
  }, 60_000);
});

describe('cloneState', () => {
  it('is independent of the original', () => {
    const a = createState(generateRandomMatrix('x', 5, 5));
    const b = cloneState(a);
    step(b, 1); step(b, 0);
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
  });
});

describe('nearness', () => {
  it('is 0 when the rows needed to win are already uniform', () => {
    // 2 rows: win needs one removed row, one uniform row is enough once a column is not uniform
    const s = createState([[1, 1, 1], [1, 2, 3]]);
    expect(nearness(s)).toBe(0);
  });
  it('counts the tiles off the majority color', () => {
    const s = createState([[1, 1, 2], [3, 4, 1], [2, 2, 2]]);
    // rows cost 1, 2, 0 -> two cheapest = 1; columns cost 1, 2, 1 -> two cheapest = 2
    expect(nearness(s)).toBe(1);
  });
});
