import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { generateRandomMatrix } from '../matrixHelpers';
import { createBeam } from './beam';
import { solveExact } from './exact';
import { createGA, type GAStats } from './ga';

// Not a test: a benchmark that only runs on demand, on a fixed set of grids.
//   npm run solver:bench                                   everything, 10 s per engine and grid
//   SOLVER_SECONDS=30 SOLVER_GRIDS=8x8 SOLVER_ENGINES=beam npm run solver:bench
// SOLVER_GRIDS and SOLVER_ENGINES are comma separated filters (a grid size, an engine name).
// For each grid: the optimum (exhaustive search, small grids only), then for each engine the moves of its best
// solution at the end of the budget and when the first one was found.

const GRIDS = [
  '4x4:a', '4x4:b', '5x5:a', '5x5:b',
  '6x6:a', '6x6:b', '6x6:c',
  '8x8:a', '8x8:b', '8x8:c', '8x8:d',
  '10x10:a', '10x10:b',
];

const ENGINES: Record<string, (canva: number[][]) => { step(): GAStats }> = {
  'ga-single': canva => createGA(canva, { population: 1500, length: 60, maxStages: 1 }),
  'ga-staged': canva => createGA(canva, { population: 1000, length: 50, maxStages: 30 }),
  'ga-push': canva => createGA(canva, { population: 1000, length: 8, maxStages: 30, pushes: true }),
  'beam': canva => createBeam(canva),
};

const seconds = Number(process.env.SOLVER_SECONDS ?? 10);
// vitest swallows console output of passing tests, so the report also goes to a file: SOLVER_OUT=report.txt
const report = (line: string) => { console.log(line); if (process.env.SOLVER_OUT) appendFileSync(process.env.SOLVER_OUT, line + '\n'); };
const only = (name: string) => (process.env[name] ?? '').split(',').filter(Boolean);

describe.skipIf(!process.env.SOLVER_BENCH)('solver benchmark', () => {
  const sizes = only('SOLVER_GRIDS'), engines = only('SOLVER_ENGINES');
  const totals: Record<string, number[]> = {};
  for (const grid of GRIDS.filter(g => !sizes.length || sizes.includes(g.split(':')[0]))) {
    it(grid, () => {
      const [size] = grid.split(':');
      const [rows, cols] = size.split('x').map(Number);
      const canva = generateRandomMatrix(`bench-${grid}`, rows, cols);
      let line = grid.padEnd(9);
      if (rows * cols <= 25) {
        const exact = solveExact(canva, { maxNodes: 3_000_000 });
        line += (exact.exhaustive ? `optimum ${exact.moves}` : `optimum >= ${exact.lowerBound}`).padEnd(16);
      } else line += ''.padEnd(16);
      for (const [name, make] of Object.entries(ENGINES)) {
        if (engines.length && !engines.includes(name)) continue;
        const engine = make(canva);
        const t0 = performance.now();
        let stats = engine.step(), first = '';
        while ((performance.now() - t0) / 1000 < seconds && !stats.done) {
          stats = engine.step();
          if (stats.won && !first) first = ` (first ${stats.moves} at ${((performance.now() - t0) / 1000).toFixed(1)}s)`;
        }
        (totals[name] ??= []).push(stats.won ? stats.moves : NaN);
        line += `${name} ${stats.won ? stats.moves : 'none'}${first}`.padEnd(36);
      }
      report(line);
    }, (seconds * 4 + 60) * 1000);
  }
  it('average', () => {
    report(Object.entries(totals).map(([n, v]) => `${n} ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}`).join('   '));
  });
});
