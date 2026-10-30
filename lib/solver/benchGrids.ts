import { generateRandomMatrix } from '../matrixHelpers';

// The fixed grids of the benchmark, named `<rows>x<cols>:<letter>`. The grid is generateRandomMatrix('bench-<name>').
export const BENCH_GRIDS = [
    '4x4:a', '4x4:b', '5x5:a', '5x5:b',
    '6x6:a', '6x6:b', '6x6:c',
    '8x8:a', '8x8:b', '8x8:c', '8x8:d',
    '10x10:a', '10x10:b',
];

export interface BenchGrid { id: string; rows: number; cols: number; seed: string; query: string; canva: number[][] }

export function benchGrid(id: string): BenchGrid {
    const [rows, cols] = id.split(':')[0].split('x').map(Number);
    const seed = `bench-${id}`;
    return { id, rows, cols, seed, query: `?s=${seed}&cs=${cols}x${rows}`, canva: generateRandomMatrix(seed, rows, cols) };
}
