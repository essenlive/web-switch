// Runs the genetic solver without the browser. Bundle it first: npx esbuild scripts/solver-bench.ts --bundle --platform=node --format=esm --outfile=bench.mjs, then node bench.mjs [seeds] [size] [generations] [population] [length]
// Prints, per grid, the generation of the first win and the final result.
import { generateRandomMatrix } from '../lib/matrixHelpers';
import { createGA, type GAStats } from '../lib/solver/ga';

const [seeds = '5', size = '6x6', gens = '2000', pop = '400', len = '150'] = process.argv.slice(2);
const [rows, cols] = size.split('x').map(Number);
console.log(`grid ${size}, ${seeds} seeds, ${gens} generations, population ${pop}, length ${len}`);
for (let i = 0; i < Number(seeds); i++) {
    const canva = generateRandomMatrix(`bench${i}`, rows, cols);
    const ga = createGA(canva, { population: Number(pop), length: Number(len), seed: i + 1 });
    const t0 = performance.now();
    let firstWin = -1, last: GAStats | null = null;
    for (let g = 0; g <= Number(gens); g++) {
        last = ga.step();
        if (last.won && firstWin < 0) firstWin = g;
    }
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    console.log(`bench${i}: first win ${firstWin < 0 ? 'never' : 'gen ' + firstWin} | final ${last!.won ? last!.moves + ' moves' : last!.tiles + ' tiles left'} | ${secs}s`);
}
