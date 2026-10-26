// Fast, allocation-free copy of the game rules (lib/switchMachine.ts + lib/matrixHelpers.ts) for the solver.
// lib/solver/simulate.test.ts plays it against the real machine, keep both in sync.
// No imports on purpose: this file also runs in a worker and in node scripts.

// Moves are 0..3, in the letters of a replay link (`urdl`)
export const UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
export const MOVE_LETTERS = 'urdl';

export interface SimState {
    rows: number;
    cols: number;
    cells: Uint8Array; // row-major, row 0 is the bottom row like canva[0], values 1..4
    x: number;         // cursor on the ring around the grid: 0..cols+1
    y: number;         // 0..rows+1, y = 0 is the bottom border
    held: number;      // the tile in hand
}

export function createState(canva: number[][]): SimState {
    const rows = canva.length, cols = canva[0].length;
    const cells = new Uint8Array(rows * cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells[r * cols + c] = canva[r][c];
    return { rows, cols, cells, x: 0, y: 0, held: 1 };
}

export function cloneState(s: SimState): SimState {
    return { ...s, cells: s.cells.slice() };
}

// Resets `into` to `from` without allocating, unless the size changed (a line was removed)
export function copyState(from: SimState, into: SimState): void {
    if (into.cells.length !== from.cells.length) into.cells = new Uint8Array(from.cells.length);
    into.cells.set(from.cells);
    into.rows = from.rows; into.cols = from.cols;
    into.x = from.x; into.y = from.y; into.held = from.held;
}

export const isWon = (s: SimState) => s.rows <= 1 || s.cols <= 1;

function removeRow(s: SimState, r: number) {
    s.cells.copyWithin(r * s.cols, (r + 1) * s.cols);
    s.rows--;
    s.cells = s.cells.subarray(0, s.rows * s.cols);
}

function removeColumn(s: SimState, c: number) {
    const { rows, cols, cells } = s;
    let w = 0;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (k !== c) cells[w++] = cells[r * cols + k];
    s.cols--;
    s.cells = cells.subarray(0, rows * s.cols);
}

// Same order as the machine: win check, then the first uniform row, else the first uniform column, then again
function evaluate(s: SimState) {
    for (;;) {
        if (isWon(s)) return;
        const { rows, cols, cells } = s;
        let line = -1;
        for (let r = 0; r < rows && line < 0; r++) {
            const v = cells[r * cols];
            let same = true;
            for (let c = 1; c < cols; c++) if (cells[r * cols + c] !== v) { same = false; break; }
            if (same) line = r;
        }
        if (line >= 0) {
            removeRow(s, line);
            if (s.y !== 0) s.y--; // the machine does this whichever row went
            continue;
        }
        for (let c = 0; c < cols && line < 0; c++) {
            const v = cells[c];
            let same = true;
            for (let r = 1; r < rows; r++) if (cells[r * cols + c] !== v) { same = false; break; }
            if (same) line = c;
        }
        if (line < 0) return;
        removeColumn(s, line);
        if (s.x !== 0) s.x--;
    }
}

// Plays one move in place. Returns false when the game would ignore it (the state is untouched).
export function step(s: SimState, dir: number): boolean {
    const { rows, cols, cells } = s;
    if (isWon(s)) return false;
    if ((s.y <= 0 && dir === DOWN) || (s.y >= rows + 1 && dir === UP) || (s.x <= 0 && dir === LEFT) || (s.x >= cols + 1 && dir === RIGHT)) return false;

    const onRowBorder = s.y === 0 || s.y === rows + 1;
    const onColBorder = s.x === 0 || s.x === cols + 1;
    if ((onRowBorder && (dir === LEFT || dir === RIGHT)) || (onColBorder && (dir === UP || dir === DOWN))) {
        if (dir === UP) s.y++; else if (dir === DOWN) s.y--; else if (dir === LEFT) s.x--; else s.x++;
    } else {
        let out: number;
        if (dir === DOWN) { // from the top border: enters on top of column x-1, the bottom tile comes out
            const c = s.x - 1;
            out = cells[c];
            for (let r = 0; r < rows - 1; r++) cells[r * cols + c] = cells[(r + 1) * cols + c];
            cells[(rows - 1) * cols + c] = s.held;
            s.y = 0;
        } else if (dir === UP) {
            const c = s.x - 1;
            out = cells[(rows - 1) * cols + c];
            for (let r = rows - 1; r > 0; r--) cells[r * cols + c] = cells[(r - 1) * cols + c];
            cells[c] = s.held;
            s.y = rows + 1;
        } else if (dir === LEFT) { // from the right border: enters on the right of row y-1, the left tile comes out
            const o = (s.y - 1) * cols;
            out = cells[o];
            for (let c = 0; c < cols - 1; c++) cells[o + c] = cells[o + c + 1];
            cells[o + cols - 1] = s.held;
            s.x = 0;
        } else {
            const o = (s.y - 1) * cols;
            out = cells[o + cols - 1];
            for (let c = cols - 1; c > 0; c--) cells[o + c] = cells[o + c - 1];
            cells[o] = s.held;
            s.x = cols + 1;
        }
        s.held = out;
    }
    evaluate(s);
    return true;
}

// How far the grid is from its next line, lower is better. The rows (or the columns) needed to win
// are the cheapest ones; each costs its tiles that are not the majority color of the line.
// Smooth where "tiles left" is flat, which is what lets a search climb.
export function nearness(s: SimState): number {
    const { rows, cols, cells } = s;
    return Math.min(cheapest(cells, rows, cols, 1, cols), cheapest(cells, cols, rows, cols, 1));
}

const costs = new Int32Array(64);
const counts = new Int32Array(5);
// `lines` lines of `len` tiles, `stride` between two tiles of a line, `offset` between the starts of two lines. Sum of the (lines - 1) cheapest.
function cheapest(cells: Uint8Array, lines: number, len: number, stride: number, offset: number): number {
    let n = 0;
    for (let l = 0; l < lines; l++) {
        counts[1] = counts[2] = counts[3] = counts[4] = 0;
        const base = l * offset;
        for (let k = 0; k < len; k++) counts[cells[base + k * stride]]++;
        costs[n++] = len - Math.max(counts[1], counts[2], counts[3], counts[4]);
    }
    // insertion sort, n is small
    for (let i = 1; i < n; i++) { const v = costs[i]; let j = i - 1; while (j >= 0 && costs[j] > v) { costs[j + 1] = costs[j]; j--; } costs[j + 1] = v; }
    let sum = 0;
    for (let i = 0; i < n - 1; i++) sum += costs[i];
    return sum;
}
