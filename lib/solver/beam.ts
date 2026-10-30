import type { GAStats } from './ga';
import { prune } from './ga';
import { applySlot, slotCount, slotLetters, walkDistance } from './ring';
import { cloneState, copyState, createState, isWon, nearness, stateKey, type SimState } from './simulate';

// Beam search over pushes (see ring.ts). Layer by layer, every kept position is pushed in every slot; the
// `width` cheapest distinct positions make the next layer. Cost of a position: tiles left, nearness to the next
// line, and the moves played so far (same weights as the genetic search).
// Deterministic. When a round has run its course the width doubles and it starts again, with the shortest
// solution so far as the bound: a position that cannot beat it is dropped.

export interface BeamOptions {
    startWidth?: number;
    maxWidth?: number;
    maxLayers?: number;    // pushes in a solution; a round ends there
    tileWeight?: number;
    moveWeight?: number;
}

interface Link { slot: number; prev: Link | null }
interface Node { state: SimState; moves: number; link: Link | null }
interface Candidate { parent: Node; slot: number; moves: number; cost: number; key: number; tiles: number; near: number }

export function createBeam(canva: number[][], options: BeamOptions = {}) {
    const startWidth = options.startWidth ?? 25;
    const maxWidth = options.maxWidth ?? 25_600;
    const maxLayers = options.maxLayers ?? 120;
    const tileWeight = options.tileWeight ?? 8;
    const moveWeight = options.moveWeight ?? 1;

    const root = createState(canva);
    const scratch = createState(canva);
    const rebuilt = createState(canva);

    let width = startWidth, round = 0, layerIndex = 0, generation = 0, done = false;
    let layer: Node[] = [{ state: root, moves: 0, link: null }];
    let seen = new Map<number, number>();
    let best: { moves: number; solution: string; tiles: number } | null = null;
    let headline = { tiles: root.rows * root.cols, near: nearness(root) };

    // Replays the chain of pushes to get the letters of the moves
    function lettersOf(link: Link | null): string {
        const slots: number[] = [];
        for (let l = link; l; l = l.prev) slots.push(l.slot);
        copyState(root, rebuilt);
        let text = '';
        for (let i = slots.length - 1; i >= 0; i--) { text += slotLetters(rebuilt, slots[i]); applySlot(rebuilt, slots[i]); }
        return text;
    }

    function nextRound() {
        round++; layerIndex = 0;
        if (width >= maxWidth) { done = true; return; }
        width = Math.min(maxWidth, width * 2);
        layer = [{ state: root, moves: 0, link: null }];
        seen = new Map();
    }

    function expand() {
        const candidates: Candidate[] = [];
        for (const node of layer) {
            const n = slotCount(node.state);
            for (let slot = 0; slot < n; slot++) {
                copyState(node.state, scratch);
                const moves = node.moves + walkDistance(scratch, slot) + 1;
                if (best && moves >= best.moves) continue;
                applySlot(scratch, slot);
                if (isWon(scratch)) {
                    const link = { slot, prev: node.link };
                    const solution = prune(canva, lettersOf(link));
                    if (!best || solution.length < best.moves) best = { moves: solution.length, solution, tiles: scratch.rows * scratch.cols };
                    continue;
                }
                const key = stateKey(scratch);
                const known = seen.get(key);
                if (known !== undefined && known <= moves) continue;
                seen.set(key, moves);
                const tiles = scratch.rows * scratch.cols, near = nearness(scratch);
                candidates.push({ parent: node, slot, moves, key, tiles, near, cost: tiles * tileWeight + near + moves * moveWeight });
            }
        }
        // A key can be in the list twice when a cheaper way to it came later: keep the cheapest of each
        candidates.sort((a, b) => a.cost - b.cost);
        const next: Node[] = [];
        const taken = new Set<number>();
        for (const c of candidates) {
            if (next.length >= width) break;
            if (taken.has(c.key) || seen.get(c.key)! < c.moves) continue;
            taken.add(c.key);
            const state = cloneState(c.parent.state);
            applySlot(state, c.slot);
            next.push({ state, moves: c.moves, link: { slot: c.slot, prev: c.parent.link } });
        }
        if (candidates[0] && !best) headline = { tiles: candidates[0].tiles, near: candidates[0].near };
        layer = next;
    }

    return {
        // One layer of the current round. Reports like the genetic search does: pass = round, stage = layer.
        step(): GAStats {
            if (!done) {
                expand();
                generation++;
                layerIndex++;
                if (layer.length === 0 || layerIndex >= maxLayers) nextRound();
            }
            return best
                ? { generation, pass: round, stage: layerIndex, won: true, tiles: best.tiles, near: 0, moves: best.moves, solution: best.solution, averageTiles: 0, done }
                : { generation, pass: round, stage: layerIndex, won: false, ...headline, moves: layer[0]?.moves ?? 0, solution: '', averageTiles: 0, done };
        },
    };
}
