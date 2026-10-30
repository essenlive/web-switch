import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { BENCH_GRIDS, benchGrid } from './benchGrids';
import { createEngine, ENGINE_PRESETS } from './engines';
import { solveExact } from './exact';

// Not a test: a benchmark that only runs on demand, on a fixed set of grids.
//   npm run solver:bench                                   everything, 10 s per engine and grid
//   SOLVER_SECONDS=30 SOLVER_GRIDS=8x8 SOLVER_ENGINES=beam npm run solver:bench
// SOLVER_GRIDS and SOLVER_ENGINES are comma separated filters (a grid size, an engine name).
// For each grid: the optimum (exhaustive search, small grids only), then for each engine the moves of its best
// solution at the end of the budget and when the first one was found.

const seconds = Number(process.env.SOLVER_SECONDS ?? 10);
// vitest swallows console output of passing tests, so the report also goes to a file: SOLVER_OUT=report.txt
const report = (line: string) => { console.log(line); if (process.env.SOLVER_OUT) appendFileSync(process.env.SOLVER_OUT, line + '\n'); };
const only = (name: string) => (process.env[name] ?? '').split(',').filter(Boolean);

describe.skipIf(!process.env.SOLVER_BENCH)('solver benchmark', () => {
  const sizes = only('SOLVER_GRIDS'), engines = only('SOLVER_ENGINES');
  const totals: Record<string, number[]> = {};
  const reference = ENGINE_PRESETS.filter(e => e.reference && (!engines.length || engines.includes(e.id)));
  for (const grid of BENCH_GRIDS.filter(g => !sizes.length || sizes.includes(g.split(':')[0]))) {
    it(grid, () => {
      const { rows, cols, canva } = benchGrid(grid);
      let line = grid.padEnd(9);
      if (rows * cols <= 25) {
        const exact = solveExact(canva, { maxNodes: 3_000_000 });
        line += (exact.exhaustive ? `optimum ${exact.moves}` : `optimum >= ${exact.lowerBound}`).padEnd(16);
      } else line += ''.padEnd(16);
      for (const { id: name, kind, options } of reference) {
        const engine = createEngine(kind, canva, options);
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
