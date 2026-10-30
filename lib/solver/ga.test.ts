import { describe, expect, it } from 'vitest';
import { generateRandomMatrix } from '../matrixHelpers';
import { createGA, prune } from './ga';

describe('prune', () => {
    it('keeps a winning solution winning and never makes it longer', () => {
        const canva = generateRandomMatrix('prune', 5, 5);
        const ga = createGA(canva, { population: 200, length: 40 });
        let stats = ga.step();
        for (let g = 0; g < 500 && !stats.won; g++) stats = ga.step();
        expect(stats.won).toBe(true);
        // Padded with a detour: pruning must still win, with no more moves than the solution
        const pruned = prune(canva, stats.solution + 'ud');
        expect(pruned.length).toBeLessThanOrEqual(stats.solution.length);
        expect(prune(canva, pruned)).toBe(pruned);
    });
});
