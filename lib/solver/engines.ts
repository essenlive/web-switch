import { createBeam, type BeamOptions } from './beam';
import { solveExact } from './exact';
import { createGA, type GAOptions, type GAStats } from './ga';

// Every way of searching, as data: what the worker runs, what the page lets you change, what the benchmark compares.

export type EngineKind = 'ga' | 'beam' | 'exact';
export type EngineOptions = Record<string, number | boolean | undefined>;

export interface EngineSpec {
    id: string;
    label: string;
    kind: EngineKind;
    options: EngineOptions;
    reference?: boolean;   // part of `npm run solver:bench`
}

export interface Field {
    key: string;
    label: string;
    hint: string;
    type: 'number' | 'boolean';
    fallback?: string;     // what an empty field means
    min?: number;
    step?: number;
}

const WEIGHTS: Field[] = [
    { key: 'tileWeight', label: 'Tile weight', hint: 'Cost of a tile left on the grid, against one tile off its line', type: 'number', fallback: '8', min: 0, step: 1 },
    { key: 'moveWeight', label: 'Move weight', hint: 'Cost of a move played. 0 ignores the length, 2 and more stalls some grids', type: 'number', fallback: '1', min: 0, step: 0.5 },
];

export const FIELDS: Record<EngineKind, Field[]> = {
    ga: [
        { key: 'population', label: 'Population', hint: 'Genomes per generation', type: 'number', fallback: '1000', min: 20, step: 100 },
        { key: 'length', label: 'Genes per stage', hint: 'Moves per genome (pushes if push genes)', type: 'number', fallback: '50', min: 2, step: 1 },
        { key: 'maxStages', label: 'Stages', hint: '1 = plain genetic search, running until stopped. More: the game is solved a stage at a time', type: 'number', fallback: '30', min: 1, step: 1 },
        { key: 'generations', label: 'Generations per stage', hint: 'Staged only', type: 'number', fallback: '15', min: 1, step: 1 },
        { key: 'beam', label: 'Beam', hint: 'Positions kept between two stages', type: 'number', fallback: '100', min: 1, step: 10 },
        { key: 'elite', label: 'Elite', hint: 'Genomes kept as they are. Empty: 2% of the population', type: 'number', fallback: 'auto', min: 0, step: 1 },
        { key: 'seed', label: 'Seed', hint: 'Same seed and grid, same run', type: 'number', fallback: '1', min: 0, step: 1 },
        ...WEIGHTS,
        { key: 'pushes', label: 'Push genes', hint: 'A gene is a push, as a distance along the ring from the cursor, instead of a single move', type: 'boolean' },
    ],
    beam: [
        { key: 'startWidth', label: 'Start width', hint: 'Positions kept per layer in the first round. The width doubles every round', type: 'number', fallback: '25', min: 1, step: 25 },
        { key: 'maxWidth', label: 'Max width', hint: 'The search ends after the round of this width', type: 'number', fallback: '25600', min: 1, step: 1000 },
        { key: 'maxLayers', label: 'Max layers', hint: 'Pushes in a solution, a round ends there', type: 'number', fallback: '120', min: 1, step: 10 },
        ...WEIGHTS,
    ],
    exact: [
        { key: 'maxNodes', label: 'Max positions', hint: 'It gives up (and says a lower bound) after expanding this many. Small grids only', type: 'number', fallback: '2000000', min: 1000, step: 100000 },
    ],
};

export const ENGINE_PRESETS: EngineSpec[] = [
    { id: 'beam', label: 'Beam search', kind: 'beam', options: {}, reference: true },
    { id: 'ga-staged', label: 'Genetic, staged', kind: 'ga', options: { population: 1000, length: 50, maxStages: 30 }, reference: true },
    { id: 'ga-single', label: 'Genetic, single stage', kind: 'ga', options: { population: 1500, length: 60, maxStages: 1 }, reference: true },
    { id: 'ga-push', label: 'Genetic, push genes', kind: 'ga', options: { population: 1000, length: 8, maxStages: 30, pushes: true }, reference: true },
    { id: 'ga-fast', label: 'Genetic, staged, small grids', kind: 'ga', options: { population: 400, length: 50, maxStages: 30 } },
    { id: 'ga-large', label: 'Genetic, staged, large grids', kind: 'ga', options: { population: 1000, length: 100, maxStages: 30 } },
    { id: 'ga-single-80', label: 'Genetic, single stage, 80 moves', kind: 'ga', options: { population: 1500, length: 80, maxStages: 1 } },
    { id: 'exact', label: 'Exact (optimum, small grids)', kind: 'exact', options: { maxNodes: 3_000_000 } },
];

export const EXACT_MAX_TILES = 25; // beyond that the exhaustive search has no chance

export function createEngine(kind: EngineKind, canva: number[][], options: EngineOptions): { step(): GAStats } {
    if (kind === 'beam') return createBeam(canva, options as BeamOptions);
    if (kind === 'ga') return createGA(canva, options as GAOptions);
    return {
        // One step does it all
        step(): GAStats {
            const r = solveExact(canva, { maxNodes: options.maxNodes as number | undefined });
            const won = r.exhaustive;
            return {
                generation: 1, pass: 0, stage: 0, won, tiles: 0, near: 0, moves: r.moves, solution: r.solution,
                averageTiles: 0, done: true, bound: r.lowerBound,
            };
        },
    };
}
