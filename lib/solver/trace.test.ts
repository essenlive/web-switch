import { describe, expect, it } from 'vitest';
import { BENCH_GRIDS, benchGrid } from './benchGrids';
import { createBeam } from './beam';
import { solveExact } from './exact';
import { createGA, type GASnapshot } from './ga';
import { nearnessDetail, createState, nearness, step, MOVE_LETTERS } from './simulate';
import { beamTrace, decompose, exactTrace, framesOf } from './trace';

const grid = (id: string) => benchGrid(id).canva;

describe('exactTrace', () => {
  it('finds what solveExact finds, and develops as many positions', () => {
    for (const id of ['4x4:a', '4x4:b']) {
      const exact = solveExact(grid(id)), trace = exactTrace(grid(id));
      expect(trace.moves).toBe(exact.moves);
      expect(trace.solution).toBe(exact.solution);
      expect(trace.expansions).toBe(exact.nodes);
      expect(trace.events.at(-1)!.kind).toBe('win');
    }
  });
  it('lists the 16 children of the start, all new, and reaches one position again by pushing and pushing back', () => {
    const t = exactTrace(grid('4x4:a'));
    expect(t.events[0].children).toHaveLength(16);
    expect(t.events[0].children.every(c => c.status === 'new')).toBe(true);
    const back = t.events.find(e => e.path === 'rud')!;
    expect(back.children.every(c => c.status === 'seen')).toBe(true);
  });
});

describe('beamTrace', () => {
  it('ends with the best solution of one round of createBeam of the same width', () => {
    for (const id of ['4x4:a', '4x4:b'] as const) for (const width of [3, 5, 10, 25]) {
      const trace = beamTrace(grid(id), width), beam = createBeam(grid(id), { startWidth: width, maxWidth: width });
      let stats = beam.step(); while (!stats.done) stats = beam.step();
      expect(trace.best?.moves ?? -1).toBe(stats.won ? stats.moves : -1);
    }
  });
  it('keeps at most `width` positions per layer, cheapest first', () => {
    const t = beamTrace(grid('6x6:a'), 5);
    for (const l of t.layers) { expect(l.kept.length).toBeLessThanOrEqual(5); expect(l.kept.map(k => k.cost)).toEqual([...l.kept.map(k => k.cost)].sort((a, b) => a - b)); }
  });
});

describe('createGA onGeneration', () => {
  it('reports every generation and changes nothing in the run', () => {
    const options = { population: 300, length: 8, generations: 6, maxStages: 30, seed: 3 };
    const snaps: GASnapshot[] = [];
    const plain = createGA(grid('4x4:a'), options), hooked = createGA(grid('4x4:a'), { ...options, onGeneration: s => snaps.push(s) });
    for (let i = 0; i < 20; i++) expect(hooked.step()).toEqual(plain.step());
    expect(snaps).toHaveLength(20);
    expect(snaps[0].generation).toBe(0);
    expect(snaps[0].top).toHaveLength(8);
    expect(snaps[0].pool).toHaveLength(1);
  });
});

describe('framesOf and decompose', () => {
  const canva = grid('4x4:a'), solution = solveExact(canva).solution;
  it('gives one state per move, ending won', () => {
    const f = framesOf(canva, solution);
    expect(f.states).toHaveLength(solution.length + 1);
    expect(f.moves.filter(m => m.isPush)).toHaveLength(4);
    expect(f.moves.at(-1)!.removed).toHaveLength(2); // the last push removes two columns in a row
  });
  it('cuts the optimum into four walk-and-push actions of 2, 4, 2 and 2 moves', () => {
    expect(decompose(canva, solution).map(a => a.cost)).toEqual([2, 4, 2, 2]);
  });
});

describe('nearnessDetail', () => {
  it('agrees with nearness on every benchmark grid', () => {
    for (const id of BENCH_GRIDS) {
      const s = createState(grid(id));
      expect(nearnessDetail(s).value).toBe(nearness(s));
      for (const l of 'uruuulrdl') step(s, MOVE_LETTERS.indexOf(l));
      expect(nearnessDetail(s).value).toBe(nearness(s));
    }
  });
});
