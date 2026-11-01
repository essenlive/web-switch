import { replaySlots } from './exact';
import { prune } from './ga';
import { applySlot, ringIndex, ringSlot, slotCount, slotLetters, walkDistance } from './ring';
import { cloneState, copyState, createState, isWon, MOVE_LETTERS, nearness, stateKey, step, type Line, type SimState } from './simulate';

// The same searches as exact.ts and beam.ts, keeping every step, for the pages that show them.
// trace.test.ts checks that they find what the solvers find.

/* ---------- Exact ---------- */
export interface ExactChild { slot: number; walk: number; cost: number; state: SimState; won: boolean; status: 'new' | 'cheaper' | 'seen' }
export interface ExactEvent { kind: 'expand' | 'win'; d: number; id: number; state: SimState; path: string; children: ExactChild[] }
export interface ExactTrace { events: ExactEvent[]; moves: number; solution: string; expansions: number }

// Every position the exact search develops, in order, with its children and what became of each
export function exactTrace(canva: number[][]): ExactTrace {
    const scratch = createState(canva), parents = [-1], slotsOf = [-1], best = new Map<number, number>();
    const buckets: { state: SimState | null; id: number; key: number }[][] = [[{ state: createState(canva), id: 0, key: 0 }]];
    const events: ExactEvent[] = [];
    best.set(stateKey(scratch), 0);
    const pathOf = (id: number) => { const chain: number[] = []; for (let i = id; i > 0; i = parents[i]) chain.push(slotsOf[i]); return replaySlots(canva, chain.reverse()); };
    for (let dist = 0; dist < buckets.length; dist++) {
        for (const entry of buckets[dist] ?? []) {
            const state = entry.state!;
            if (isWon(state)) {
                events.push({ kind: 'win', d: dist, id: entry.id, state: cloneState(state), path: pathOf(entry.id), children: [] });
                return { events, moves: dist, solution: pathOf(entry.id), expansions: events.length - 1 };
            }
            if (best.get(entry.key) !== undefined && best.get(entry.key)! < dist) continue;
            const children: ExactChild[] = [];
            events.push({ kind: 'expand', d: dist, id: entry.id, state: cloneState(state), path: pathOf(entry.id), children });
            for (let slot = 0; slot < slotCount(state); slot++) {
                copyState(state, scratch);
                const walk = walkDistance(scratch, slot), next = dist + walk + 1;
                applySlot(scratch, slot);
                const key = stateKey(scratch), known = best.get(key);
                const child: ExactChild = { slot, walk, cost: next, state: cloneState(scratch), won: isWon(scratch), status: 'seen' };
                if (known === undefined || known > next) {
                    child.status = known === undefined ? 'new' : 'cheaper';
                    best.set(key, next); parents.push(entry.id); slotsOf.push(slot);
                    (buckets[next] ??= []).push({ state: cloneState(scratch), id: parents.length - 1, key });
                }
                children.push(child);
            }
            entry.state = null;
        }
        buckets[dist] = [];
    }
    return { events, moves: 0, solution: '', expansions: events.length };
}

/* ---------- Beam ---------- */
export interface KeptPosition { state: SimState; moves: number; cost: number; tiles: number; near: number; letters: string }
export interface BeamLayer {
    layer: number;
    from: number;          // positions pushed in this layer
    tried: number;         // pushes tried
    dupes: number;         // pushes that gave a position already met
    pruned: number;        // pushes dropped: they cannot beat the best solution
    candidates: number;    // new positions
    kept: KeptPosition[];
    wins: { raw: number; moves: number; letters: string }[];
}
export interface BeamTrace { layers: BeamLayer[]; best: { moves: number; solution: string; layer: number } | null; width: number }

interface Link { slot: number; prev: Link | null }
interface Node { state: SimState; moves: number; cost: number; tiles: number; near: number; link: Link | null }

// One round of the beam search with a fixed width, layer by layer
export function beamTrace(canva: number[][], width: number, { tileWeight = 8, moveWeight = 1, maxLayers = 120 } = {}): BeamTrace {
    const root = createState(canva), scratch = createState(canva), rebuilt = createState(canva);
    let layer: Node[] = [{ state: root, moves: 0, cost: root.rows * root.cols * tileWeight + nearness(root), tiles: root.rows * root.cols, near: nearness(root), link: null }];
    const seen = new Map<number, number>(), layers: BeamLayer[] = [];
    let best: BeamTrace['best'] = null;
    const lettersOf = (link: Link | null) => {
        const slots: number[] = []; for (let l = link; l; l = l.prev) slots.push(l.slot);
        copyState(root, rebuilt); let text = '';
        for (let i = slots.length - 1; i >= 0; i--) { text += slotLetters(rebuilt, slots[i]); applySlot(rebuilt, slots[i]); }
        return text;
    };
    for (let layerNo = 1; layerNo <= maxLayers && layer.length; layerNo++) {
        const candidates: { parent: Node; slot: number; moves: number; key: number; tiles: number; near: number; cost: number }[] = [];
        const wins: BeamLayer['wins'] = [];
        let tried = 0, dupes = 0, pruned = 0;
        for (const node of layer) {
            for (let slot = 0; slot < slotCount(node.state); slot++) {
                copyState(node.state, scratch);
                const moves = node.moves + walkDistance(scratch, slot) + 1;
                if (best && moves >= best.moves) { pruned++; continue; }
                tried++;
                applySlot(scratch, slot);
                if (isWon(scratch)) {
                    const raw = lettersOf({ slot, prev: node.link }), solution = prune(canva, raw);
                    wins.push({ raw: raw.length, moves: solution.length, letters: solution });
                    if (!best || solution.length < best.moves) best = { moves: solution.length, solution, layer: layerNo };
                    continue;
                }
                const key = stateKey(scratch), known = seen.get(key);
                if (known !== undefined && known <= moves) { dupes++; continue; }
                seen.set(key, moves);
                const tiles = scratch.rows * scratch.cols, near = nearness(scratch);
                candidates.push({ parent: node, slot, moves, key, tiles, near, cost: tiles * tileWeight + near + moves * moveWeight });
            }
        }
        candidates.sort((a, b) => a.cost - b.cost);
        const next: Node[] = [], taken = new Set<number>();
        for (const c of candidates) {
            if (next.length >= width) break;
            if (taken.has(c.key) || seen.get(c.key)! < c.moves) continue;
            taken.add(c.key);
            const state = cloneState(c.parent.state); applySlot(state, c.slot);
            next.push({ state, moves: c.moves, cost: c.cost, tiles: c.tiles, near: c.near, link: { slot: c.slot, prev: c.parent.link } });
        }
        layers.push({ layer: layerNo, from: layer.length, tried, dupes, pruned, candidates: candidates.length, wins,
            kept: next.map(k => ({ state: k.state, moves: k.moves, cost: k.cost, tiles: k.tiles, near: k.near, letters: lettersOf(k.link) })) });
        layer = next;
    }
    return { layers, best, width };
}

/* ---------- Moves played one by one ---------- */
export interface FrameMove { letter: string; isPush: boolean; pre: SimState | null; lines: Line[]; removed: Line[] }

export function uniformLines(s: SimState): Line[] {
    const out: Line[] = [];
    for (let r = 0; r < s.rows; r++) { let same = true; for (let c = 1; c < s.cols; c++) if (s.cells[r * s.cols + c] !== s.cells[r * s.cols]) { same = false; break; } if (same) out.push({ kind: 'row', index: r }); }
    for (let c = 0; c < s.cols; c++) { let same = true; for (let r = 1; r < s.rows; r++) if (s.cells[r * s.cols + c] !== s.cells[c]) { same = false; break; } if (same) out.push({ kind: 'col', index: c }); }
    return out;
}

// The state after each move of a list of moves, and for each push the lines that were about to go and the ones that went
export function framesOf(canva: number[][], letters: string): { states: SimState[]; moves: FrameMove[] } {
    const s = createState(canva), states = [cloneState(s)], moves: FrameMove[] = [];
    for (const letter of letters) {
        const before = cloneState(s), pre = cloneState(s), dir = MOVE_LETTERS.indexOf(letter);
        step(pre, dir, undefined, true);
        const isPush = Math.abs(pre.x - before.x) + Math.abs(pre.y - before.y) !== 1;
        const removed: Line[] = [];
        step(s, dir, removed);
        moves.push({ letter, isPush, pre: isPush ? pre : null, lines: isPush ? uniformLines(pre) : [], removed });
        states.push(cloneState(s));
    }
    return { states, moves };
}

// A list of moves as "walk, then push" actions
export interface Action { walk: string; push: string; slot: number; cost: number }
export function decompose(canva: number[][], letters: string): Action[] {
    const s = createState(canva), out: Action[] = [];
    let walk = '';
    for (const letter of letters) {
        const before = cloneState(s);
        if (!step(s, MOVE_LETTERS.indexOf(letter))) continue;
        if (Math.abs(s.x - before.x) + Math.abs(s.y - before.y) === 1) { walk += letter; continue; }
        out.push({ walk, push: letter, slot: ringSlot(before, ringIndex(before, before.x, before.y)), cost: walk.length + 1 });
        walk = '';
    }
    return out;
}
