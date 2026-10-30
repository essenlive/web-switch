import { describe, expect, it } from 'vitest';
import { generateRandomMatrix } from '../matrixHelpers';
import { solveExact } from './exact';
import { applySlot, ringCell, ringIndex, ringSize, slotCount, slotLetters, walkDistance } from './ring';
import { cloneState, createState, isWon, MOVE_LETTERS, stateKey, step, type SimState } from './simulate';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

describe('ring', () => {
  it('numbers every border cell once, and back', () => {
    for (const [rows, cols] of [[3, 3], [6, 8], [2, 5]]) {
      const s = createState(generateRandomMatrix('r', rows, cols));
      const seen = new Set<number>();
      for (let i = 0; i < ringSize(s); i++) {
        const [x, y] = ringCell(s, i);
        expect(x === 0 || y === 0 || x === cols + 1 || y === rows + 1).toBe(true);
        expect(ringIndex(s, x, y)).toBe(i);
        seen.add(i);
      }
      expect(seen.size).toBe(2 * (rows + cols) + 4);
    }
  });
});

describe('slots', () => {
  it('walk letters + push, played move by move, give the same position as applySlot', () => {
    for (const [seed, rows, cols] of [['a', 6, 8], ['b', 5, 5], ['c', 3, 7]] as const) {
      const rand = lcg(seed.charCodeAt(0));
      const fast = createState(generateRandomMatrix(seed, rows, cols));
      const slow = cloneState(fast);
      for (let n = 0; n < 150 && !isWon(fast); n++) {
        const slot = Math.floor(rand() * slotCount(fast));
        const letters = slotLetters(fast, slot);
        expect(letters.length).toBe(walkDistance(fast, slot) + 1);
        for (const l of letters) expect(step(slow, MOVE_LETTERS.indexOf(l)), `${seed} move ${n}`).toBe(true);
        applySlot(fast, slot);
        expect(stateKey(slow)).toBe(stateKey(fast));
        expect([slow.x, slow.y, slow.held]).toEqual([fast.x, fast.y, fast.held]);
      }
    }
  });
});

// Plain breadth-first search over single moves: slow but obviously right
function bruteForce(canva: number[][]): number {
  let level = [createState(canva)];
  const seen = new Set<number>([stateKey(level[0])]);
  for (let depth = 0; ; depth++) {
    const next: SimState[] = [];
    for (const s of level) {
      if (isWon(s)) return depth;
      for (let dir = 0; dir < 4; dir++) {
        const c = cloneState(s);
        if (!step(c, dir)) continue;
        const key = stateKey(c);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(c);
      }
    }
    level = next;
  }
}

describe('solveExact', () => {
  it('finds the same optimum as a search over single moves, and a solution that wins in that many moves', () => {
    for (const [seed, rows, cols] of [['x', 3, 3], ['y', 3, 3], ['z', 3, 4], ['w', 4, 3]] as const) {
      const canva = generateRandomMatrix(seed, rows, cols);
      const exact = solveExact(canva);
      expect(exact.exhaustive).toBe(true);
      expect(exact.moves).toBe(bruteForce(canva));
      const s = createState(canva);
      for (const l of exact.solution) expect(step(s, MOVE_LETTERS.indexOf(l))).toBe(true);
      expect(isWon(s)).toBe(true);
      expect(exact.solution.length).toBe(exact.moves);
    }
  }, 60_000);

  it('gives up with a lower bound when the grid is too big for its budget', () => {
    const r = solveExact(generateRandomMatrix('big', 8, 8), { maxNodes: 2000 });
    expect(r.exhaustive).toBe(false);
    expect(r.lowerBound).toBeGreaterThan(0);
  });
});
