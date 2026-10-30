import { applySlot, slotCount, slotLetters, walkDistance } from './ring';
import { cloneState, copyState, createState, isWon, stateKey, type SimState } from './simulate';

// Shortest solution by uniform-cost search over pushes (walks between them cost what they cost), with every
// position remembered. Exhaustive, so only small grids finish; on a big one it stops at `maxNodes` and says how
// far it got: every solution needs at least `lowerBound` moves. Used to measure how far the heuristic solvers are.

export interface ExactResult {
    exhaustive: boolean;   // true: `moves` is the optimum. false: gave up, the optimum is at least `lowerBound`
    moves: number;         // 0 when not exhaustive
    solution: string;
    lowerBound: number;
    nodes: number;
}

export function replaySlots(canva: number[][], slots: number[]): string {
    const s = createState(canva);
    let text = '';
    for (const slot of slots) { text += slotLetters(s, slot); applySlot(s, slot); }
    return text;
}

export function solveExact(canva: number[][], { maxNodes = 2_000_000 } = {}): ExactResult {
    const scratch = createState(canva);
    const parents: number[] = [-1], slots: number[] = [-1]; // by node id
    const buckets: { state: SimState; id: number; key: number }[][] = [[{ state: createState(canva), id: 0, key: 0 }]];
    const best = new Map<number, number>();
    best.set(stateKey(scratch), 0);
    let nodes = 0;
    for (let dist = 0; dist < buckets.length; dist++) {
        for (const entry of buckets[dist] ?? []) {
            if (isWon(entry.state)) {
                const chain: number[] = [];
                for (let id = entry.id; id > 0; id = parents[id]) chain.push(slots[id]);
                return { exhaustive: true, moves: dist, solution: replaySlots(canva, chain.reverse()), lowerBound: dist, nodes };
            }
            if (best.get(entry.key) !== undefined && best.get(entry.key)! < dist) continue; // reached cheaper since
            if (++nodes > maxNodes) return { exhaustive: false, moves: 0, solution: '', lowerBound: dist, nodes };
            const n = slotCount(entry.state);
            for (let slot = 0; slot < n; slot++) {
                copyState(entry.state, scratch);
                const next = dist + walkDistance(scratch, slot) + 1;
                applySlot(scratch, slot);
                const key = stateKey(scratch);
                const known = best.get(key);
                if (known !== undefined && known <= next) continue;
                best.set(key, next);
                parents.push(entry.id); slots.push(slot);
                (buckets[next] ??= []).push({ state: cloneState(scratch), id: parents.length - 1, key });
            }
            entry.state = undefined as unknown as SimState; // expanded, let it go
        }
        buckets[dist] = [];
    }
    return { exhaustive: true, moves: 0, solution: '', lowerBound: 0, nodes }; // cannot happen: every grid can be won
}
