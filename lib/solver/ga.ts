import { applySlot, ringIndex, ringSize, ringSlot, slotLetters, walkDistance } from './ring';
import { copyState, createState, isWon, MOVE_LETTERS, nearness, step, type SimState } from './simulate';

// Staged genetic search for a short winning sequence of moves on one grid.
//
// A genome is a short, fixed number of moves (0..3). The game ignores a move it cannot play, so every genome is valid.
// Fitness (lower is better):
//   a win         -> the moves it took, so the search keeps shortening solutions
//   anything else -> the best position reached along the way: tiles left first, then how near the next line is.
//
// One stage evolves genomes from a pool of starting positions for a few generations. The best distinct positions
// reached (the beam) become the pool of the next stage, so a long game is solved 50 moves at a time.
// A win ends the pass; the next pass starts over from the grid and has to beat the best solution so far.

export interface GAOptions {
    population?: number;   // genomes per generation, all stages
    length?: number;       // genes per genome (a stage): moves, or pushes if `pushes`
    pushes?: boolean;      // a gene is a push (a slot of the ring, given as a distance from the cursor, the walk is the shortest) instead of a single move
    beam?: number;         // positions kept between two stages
    generations?: number;  // generations per stage
    maxStages?: number;    // stages before a pass gives up and starts over
    seed?: number;         // same seed and grid, same run
    elite?: number;        // genomes kept as they are
    tileWeight?: number;   // cost of a tile left on the grid...
    moveWeight?: number;   // ...and of a move played, against one tile off its line (see nearness)
}

export interface GAStats {
    generation: number;
    pass: number;
    stage: number;
    won: boolean;          // a solution was found, `moves` and `solution` are then the shortest so far
    tiles: number;         // tiles left on the best position reached
    near: number;          // see nearness()
    moves: number;         // moves played to get there
    solution: string;      // those moves, as in a replay link (`urdl`)
    averageTiles: number;
    done?: boolean;        // the search has nothing left to try (the GA never says so)
}

// Plays moves (replay letters) and returns the ones that were accepted, or null if the grid is not won
function play(canva: number[][], moves: string): string | null {
    const s = createState(canva);
    let played = '';
    for (const m of moves) {
        if (isWon(s)) break;
        if (step(s, MOVE_LETTERS.indexOf(m))) played += m;
    }
    return isWon(s) ? played : null;
}

// Drops useless moves: any run of up to 8 moves that can be cut while the grid is still won (ud in a side column, lr along an edge...)
export function prune(canva: number[][], moves: string): string {
    let best = play(canva, moves) ?? moves;
    for (let again = true; again;) {
        again = false;
        for (let k = 1; k <= 8 && !again; k++) {
            for (let i = 0; i + k <= best.length && !again; i++) {
                const shorter = play(canva, best.slice(0, i) + best.slice(i + k));
                if (shorter !== null && shorter.length < best.length) { best = shorter; again = true; }
            }
        }
    }
    return best;
}

const NOT_WON = 1_000_000;
const HOPELESS = 2_000_000;
const STALE_STAGES = 3; // stages in a row without progress before a pass starts over

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Two positions with the same key are the same position (up to a negligible hash collision)
function keyOf(s: SimState): number {
    let h = 2166136261;
    const mix = (v: number) => { h = Math.imul(h ^ v, 16777619); };
    mix(s.rows); mix(s.cols); mix(s.x); mix(s.y); mix(s.held);
    for (let i = 0; i < s.cells.length; i++) mix(s.cells[i]);
    return h >>> 0;
}

interface Position { state: SimState; moves: string; near: number; cost: number }
interface Evaluation { score: number; used: number; moves: number; won: boolean; tiles: number; near: number }

export function createGA(canva: number[][], options: GAOptions = {}) {
    const population = options.population ?? 1000;
    const length = options.length ?? 50;
    const beam = options.beam ?? 100;
    const maxStages = options.maxStages ?? 30;
    const stageGenerations = maxStages === 1 ? Infinity : options.generations ?? 15; // one stage = a plain GA, it runs until stopped
    const elite = Math.min(options.elite ?? Math.max(2, Math.round(population * 0.02)), population - 1);
    const tileWeight = options.tileWeight ?? 8;
    const moveWeight = options.moveWeight ?? 1;
    const rand = mulberry32(options.seed ?? 1);
    const pushes = options.pushes ?? false;
    // A push gene is a byte around 128, the signed distance along the ring from the cursor (small ones more likely)
    const randMove = () => pushes ? 128 + Math.round((rand() + rand() - 1) * 127) : Math.floor(rand() * 4);

    // Plays a gene. Returns the moves it cost, 0 if the game ignored it; `text` receives the letters when given.
    function playGene(s: SimState, gene: number, out?: { text: string }): number {
        if (!pushes) {
            if (!step(s, gene)) return 0;
            if (out) out.text += MOVE_LETTERS[gene];
            return 1;
        }
        if (isWon(s)) return 0;
        const P = ringSize(s);
        const slot = ringSlot(s, ringIndex(s, s.x, s.y) + Math.round((gene - 128) / 128 * (P / 2)) + P);
        const cost = walkDistance(s, slot) + 1;
        if (out) out.text += slotLetters(s, slot);
        applySlot(s, slot);
        return cost;
    }

    const root = createState(canva);
    const costOf = (s: SimState, near: number, moves: number) => s.rows * s.cols * tileWeight + near + moves * moveWeight;
    const rootNear = nearness(root);
    const rootPosition: Position = { state: root, moves: '', near: rootNear, cost: costOf(root, rootNear, 0) };
    const scratch: SimState = createState(canva);

    let pool: Position[] = [rootPosition];
    let genomes = Array.from({ length: population }, () => new Uint8Array(length));
    let next = Array.from({ length: population }, () => new Uint8Array(length));
    let starts = new Int32Array(population);
    let nextStarts = new Int32Array(population);
    const evals: Evaluation[] = genomes.map(() => ({ score: 0, used: 0, moves: 0, won: false, tiles: 0, near: 0 }));
    let order: number[] = Array.from({ length: population }, (_, i) => i);

    let generation = 0, pass = 0, stage = 0, stageGeneration = 0, staleStages = 0, stageBest = Infinity;
    let best: { moves: string; tiles: number } | null = null; // shortest solution of all passes
    let headline = { tiles: root.rows * root.cols, near: rootNear, moves: 0, solution: '' };
    let started = false;

    function fillPopulation() {
        for (let i = 0; i < population; i++) {
            starts[i] = i % pool.length;
            for (let j = 0; j < length; j++) genomes[i][j] = randMove();
        }
    }

    function evaluate(g: Uint8Array, startIndex: number, out: Evaluation) {
        const from = pool[startIndex];
        copyState(from.state, scratch);
        const base = from.moves.length;
        // A solution is only worth having if it is shorter than the best one
        const limit = best ? best.moves.length - base : Infinity;
        let bestCost = from.cost, used = 0, moves = 0, bestMoves = 0;
        let tiles = from.state.rows * from.state.cols, near = from.near;
        for (let i = 0; i < length; i++) {
            const cost = playGene(scratch, g[i]);
            if (!cost) continue;
            moves += cost;
            if (moves >= limit) { out.score = HOPELESS; out.won = false; out.used = used; out.moves = bestMoves; out.tiles = tiles; out.near = near; return; }
            if (isWon(scratch)) {
                out.score = base + moves; out.used = i + 1; out.moves = moves; out.won = true;
                out.tiles = scratch.rows * scratch.cols; out.near = 0;
                return;
            }
            const area = scratch.rows * scratch.cols;
            const n = nearness(scratch);
            const c = costOf(scratch, n, base + moves);
            if (c < bestCost) { bestCost = c; used = i + 1; bestMoves = moves; tiles = area; near = n; }
        }
        out.score = NOT_WON + bestCost; out.won = false;
        out.used = used; out.moves = bestMoves; out.tiles = tiles; out.near = near;
    }

    function rank() {
        for (let i = 0; i < population; i++) evaluate(genomes[i], starts[i], evals[i]);
        order = order.sort((a, b) => evals[a].score - evals[b].score || evals[a].used - evals[b].used);
    }

    function tournament(): number {
        let winner = order[Math.floor(rand() * population)];
        for (let k = 1; k < 3; k++) {
            const c = order[Math.floor(rand() * population)];
            if (evals[c].score < evals[winner].score) winner = c;
        }
        return winner;
    }

    // Mutations keep the head of the genome and change what follows, so progress made early is not undone.
    function mutate(g: Uint8Array, used: number) {
        const count = 1 + (rand() < 0.5 ? 1 : 0) + (rand() < 0.25 ? 2 : 0);
        for (let n = 0; n < count; n++) {
            // Half of the time inside the part that matters, half in the tail that is still exploring
            const pos = rand() < 0.5 ? Math.floor(rand() * Math.max(1, used)) : Math.min(length - 1, used + Math.floor(rand() * (length - used)));
            const kind = rand();
            if (kind < 0.45) {
                g[pos] = pushes ? randMove() : (g[pos] + 1 + Math.floor(rand() * 3)) & 3; // a different move
            } else if (kind < 0.7) {
                g.copyWithin(pos + 1, pos, length - 1); // insert
                g[pos] = randMove();
            } else if (kind < 0.9) {
                g.copyWithin(pos, pos + 1); // delete
                g[length - 1] = randMove();
            } else {
                const end = Math.min(length, pos + 2 + Math.floor(rand() * 7)); // redo a few moves
                for (let i = pos; i < end; i++) g[i] = randMove();
            }
        }
    }

    function breed() {
        for (let i = 0; i < elite; i++) { next[i].set(genomes[order[i]]); nextStarts[i] = starts[order[i]]; }
        for (let i = elite; i < population; i++) {
            const a = tournament();
            const child = next[i];
            child.set(genomes[a]);
            nextStarts[i] = starts[a];
            if (rand() < 0.5) {
                const b = tournament();
                // A tail only makes sense from the same starting position
                if (starts[b] === starts[a]) {
                    const cut = Math.floor(rand() * Math.max(1, evals[a].used));
                    child.set(genomes[b].subarray(cut), cut);
                }
            }
            mutate(child, evals[a].used);
        }
        [genomes, next] = [next, genomes];
        [starts, nextStarts] = [nextStarts, starts];
    }

    // The moves of an evaluated genome, as letters, up to its best position (or its win)
    function movesOf(index: number) {
        const g = genomes[index];
        copyState(pool[starts[index]].state, scratch);
        const out = { text: '' };
        for (let i = 0; i < evals[index].used; i++) playGene(scratch, g[i], out);
        return out.text;
    }

    function startPass() {
        pass++; stage = 0; stageGeneration = 0; staleStages = 0; stageBest = Infinity;
        pool = [rootPosition];
        fillPopulation();
        rank();
    }

    // End of a stage: keep a win if there is one, otherwise the best distinct positions become the next pool
    function endStage() {
        const winner = order.find(i => evals[i].won);
        if (winner !== undefined) {
            const text = prune(canva, pool[starts[winner]].moves + movesOf(winner));
            if (!best || text.length < best.moves.length) best = { moves: text, tiles: evals[winner].tiles };
            startPass();
            return;
        }
        const seen = new Set<number>();
        const kept: Position[] = [];
        for (const i of order) {
            if (kept.length >= beam || evals[i].score >= HOPELESS) break;
            copyState(pool[starts[i]].state, scratch);
            const g = genomes[i];
            const out = { text: '' };
            for (let j = 0; j < evals[i].used; j++) playGene(scratch, g[j], out);
            const text = out.text;
            const key = keyOf(scratch);
            if (seen.has(key)) continue;
            seen.add(key);
            const moves = pool[starts[i]].moves + text, near = nearness(scratch);
            kept.push({ state: { ...scratch, cells: scratch.cells.slice() }, moves, near, cost: costOf(scratch, near, moves.length) });
        }
        const top = kept[0];
        if (!top) { startPass(); return; }
        if (top.cost < stageBest) { stageBest = top.cost; staleStages = 0; } else staleStages++;
        stage++;
        if (staleStages >= STALE_STAGES || stage >= maxStages) { startPass(); return; }
        pool = kept;
        stageGeneration = 0;
        fillPopulation();
        rank();
    }

    return {
        // One generation. The first call reports generation 0, the random population.
        step(): GAStats {
            if (!started) { started = true; fillPopulation(); rank(); }
            else {
                breed();
                rank();
                generation++;
                stageGeneration++;
            }
            const top = order[0];
            if (!best && evals[top].score < HOPELESS) {
                const c = evals[top];
                headline = { tiles: c.tiles, near: c.near, moves: pool[starts[top]].moves.length + c.moves, solution: pool[starts[top]].moves + movesOf(top) };
            }
            const reportedPass = pass, reportedStage = stage;
            let total = 0;
            for (let i = 0; i < population; i++) total += evals[i].tiles;
            const averageTiles = total / population;
            if (stageGeneration >= stageGenerations || evals[top].won) endStage();
            return best
                ? { generation, pass: reportedPass, stage: reportedStage, won: true, tiles: best.tiles, near: 0, moves: best.moves.length, solution: best.moves, averageTiles }
                : { generation, pass: reportedPass, stage: reportedStage, won: false, ...headline, averageTiles };
        },
    };
}
