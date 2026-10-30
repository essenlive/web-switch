import { DOWN, LEFT, MOVE_LETTERS, RIGHT, step, UP, type SimState } from './simulate';

// The cursor lives on a ring around the grid and walking along it never changes the grid. So a game is
// "walk to a slot, push, walk to a slot, push...", and the walk between two pushes is always the shorter way
// round the ring. The solvers search over pushes (a "slot" is a ring cell that is not a corner) and pay the walk
// as a cost: nothing is lost (any list of moves reduces to this one with no more moves) and the detours are gone.
//
// Ring cells are numbered clockwise from the bottom left corner: along the bottom, up the right side,
// back along the top, down the left side. With C = cols + 1 and R = rows + 1 the ring has 2C + 2R cells.

export const ringSize = (s: SimState) => 2 * (s.rows + s.cols) + 4;
export const slotCount = (s: SimState) => 2 * (s.rows + s.cols);

export function ringIndex(s: SimState, x: number, y: number): number {
    const C = s.cols + 1, R = s.rows + 1;
    if (y === 0) return x;
    if (x === C) return C + y;
    if (y === R) return C + R + (C - x);
    return 2 * C + R + (R - y);
}

export function ringCell(s: SimState, index: number): [number, number] {
    const C = s.cols + 1, R = s.rows + 1;
    if (index <= C) return [index, 0];
    if (index <= C + R) return [C, index - C];
    if (index <= 2 * C + R) return [C - (index - C - R), R];
    return [0, R - (index - 2 * C - R)];
}

// Slots 0..cols-1 are on the bottom border, then rows on the right, cols on the top, rows on the left
export function slotRing(s: SimState, slot: number): number {
    const { rows, cols } = s, C = cols + 1, R = rows + 1;
    if (slot < cols) return 1 + slot;
    slot -= cols;
    if (slot < rows) return C + 1 + slot;
    slot -= rows;
    if (slot < cols) return C + R + 1 + slot;
    return 2 * C + R + 1 + slot - cols;
}

export function slotDirection(s: SimState, slot: number): number {
    const { rows, cols } = s;
    if (slot < cols) return UP;
    if (slot < cols + rows) return LEFT;
    if (slot < 2 * cols + rows) return DOWN;
    return RIGHT;
}

// Moves needed to bring the cursor to the slot (not counting the push)
export function walkDistance(s: SimState, slot: number): number {
    const P = ringSize(s);
    const forward = (slotRing(s, slot) - ringIndex(s, s.x, s.y) + P) % P;
    return Math.min(forward, P - forward);
}

// Walks to the slot and pushes. Returns false only if the game is already won.
export function applySlot(s: SimState, slot: number): boolean {
    const [x, y] = ringCell(s, slotRing(s, slot));
    s.x = x; s.y = y;
    return step(s, slotDirection(s, slot));
}

// The moves of that walk and push, as replay letters
export function slotLetters(s: SimState, slot: number): string {
    const P = ringSize(s), from = ringIndex(s, s.x, s.y), to = slotRing(s, slot);
    const forward = (to - from + P) % P;
    const clockwise = forward <= P - forward;
    let index = from, text = '';
    for (let n = clockwise ? forward : P - forward; n > 0; n--) {
        const nextIndex = (index + (clockwise ? 1 : P - 1)) % P;
        const [x0, y0] = ringCell(s, index), [x1, y1] = ringCell(s, nextIndex);
        text += MOVE_LETTERS[x1 > x0 ? RIGHT : x1 < x0 ? LEFT : y1 > y0 ? UP : DOWN];
        index = nextIndex;
    }
    return text + MOVE_LETTERS[slotDirection(s, slot)];
}
