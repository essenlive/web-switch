import { copyState, createState, isWon, MOVE_LETTERS, nearness, step, type SimState } from './simulate';

// Genetic search for a short winning sequence of moves on one grid.
// A genome is a fixed number of moves (0..3). The game ignores a move it cannot play, so every genome is valid.
// Fitness (lower is better):
//   a win        -> the moves it took, so the search keeps shortening solutions
//   anything else-> the best position reached along the way: tiles left first, then how near the next line is.
// Moves after the best position are free to drift, so the tail of a genome keeps exploring.

export interface GAOptions {
    population?: number;   // genomes per generation (X)
    length?: number;       // moves per genome (Y)
    seed?: number;         // same seed and grid, same run
    elite?: number;        // genomes kept as they are
    stagnation?: number;   // generations without progress before part of the population is replaced
}

export interface GAStats {
    generation: number;
    won: boolean;
    tiles: number;         // tiles left on the best genome's grid
    near: number;          // see nearness()
    moves: number;         // accepted moves of the best genome
    solution: string;      // those moves, as in a replay link (`urdl`)
    averageTiles: number;
    restarts: number;
}

const TILE_WEIGHT = 1000;
const NOT_WON = 1_000_000;

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

interface Evaluation { score: number; used: number; tiles: number; near: number; moves: number; won: boolean }

export function createGA(canva: number[][], options: GAOptions = {}) {
    const population = options.population ?? 400;
    const length = options.length ?? 150;
    const elite = Math.min(options.elite ?? Math.max(2, Math.round(population * 0.02)), population - 1);
    const stagnation = options.stagnation ?? 150;
    const rand = mulberry32(options.seed ?? 1);
    const randMove = () => Math.floor(rand() * 4);

    const start = createState(canva);
    const scratch: SimState = createState(canva);

    let genomes = Array.from({ length: population }, () => randomGenome());
    let next = Array.from({ length: population }, () => new Uint8Array(length));
    const evals: Evaluation[] = genomes.map(() => ({ score: 0, used: 0, tiles: 0, near: 0, moves: 0, won: false }));
    let order: number[] = Array.from({ length: population }, (_, i) => i);
    let generation = 0; // generations bred so far, 0 is the random population
    let reported = false;
    let restarts = 0;
    let bestEver = Infinity;
    let sinceProgress = 0;
    let lastSolution = { key: '', text: '' };

    function randomGenome() {
        const g = new Uint8Array(length);
        for (let i = 0; i < length; i++) g[i] = randMove();
        return g;
    }

    function evaluate(g: Uint8Array, out: Evaluation) {
        copyState(start, scratch);
        let bestCost = Infinity, used = 0, moves = 0, bestMoves = 0;
        let tiles = scratch.rows * scratch.cols, near = nearness(scratch);
        bestCost = tiles * TILE_WEIGHT + near;
        for (let i = 0; i < length; i++) {
            if (!step(scratch, g[i])) continue;
            moves++;
            if (isWon(scratch)) {
                out.score = moves; out.used = i + 1; out.moves = moves; out.won = true;
                out.tiles = scratch.rows * scratch.cols; out.near = 0;
                return;
            }
            const area = scratch.rows * scratch.cols;
            const n = nearness(scratch);
            const cost = area * TILE_WEIGHT + n;
            if (cost < bestCost) { bestCost = cost; used = i + 1; bestMoves = moves; tiles = area; near = n; }
        }
        out.score = NOT_WON + bestCost; out.used = used; out.moves = bestMoves; out.won = false;
        out.tiles = tiles; out.near = near;
    }

    function tournament(): number {
        let best = order[Math.floor(rand() * population)];
        for (let k = 1; k < 3; k++) {
            const c = order[Math.floor(rand() * population)];
            if (evals[c].score < evals[best].score) best = c;
        }
        return best;
    }

    // Mutations keep the head of the genome and change what follows, so progress made early is not undone.
    function mutate(g: Uint8Array, used: number) {
        const count = 1 + (rand() < 0.5 ? 1 : 0) + (rand() < 0.25 ? 2 : 0);
        for (let n = 0; n < count; n++) {
            // Half of the time inside the part that matters, half in the tail that is still exploring
            const pos = rand() < 0.5 ? Math.floor(rand() * Math.max(1, used)) : Math.min(length - 1, used + Math.floor(rand() * (length - used)));
            const kind = rand();
            if (kind < 0.45) {
                g[pos] = (g[pos] + 1 + Math.floor(rand() * 3)) & 3; // a different move
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

    function solutionOf(g: Uint8Array, used: number) {
        copyState(start, scratch);
        let text = '';
        for (let i = 0; i < used; i++) if (step(scratch, g[i])) text += MOVE_LETTERS[g[i]];
        return text;
    }

    function rank() {
        for (let i = 0; i < population; i++) evaluate(genomes[i], evals[i]);
        order = order.sort((a, b) => evals[a].score - evals[b].score || evals[a].used - evals[b].used);
    }

    rank();

    return {
        // One generation. The first call after creation reports generation 0, the random population.
        step(): GAStats {
            if (reported) {
                // Breed: keep the elite, fill the rest with children of tournament winners
                for (let i = 0; i < elite; i++) next[i].set(genomes[order[i]]);
                for (let i = elite; i < population; i++) {
                    const a = tournament();
                    const child = next[i];
                    child.set(genomes[a]);
                    if (rand() < 0.5) {
                        const b = tournament();
                        const cut = Math.floor(rand() * Math.max(1, evals[a].used));
                        child.set(genomes[b].subarray(cut), cut);
                    }
                    mutate(child, evals[a].used);
                }
                [genomes, next] = [next, genomes];
                rank();
                generation++;
            }
            reported = true;

            const best = evals[order[0]];
            if (best.score < bestEver) { bestEver = best.score; sinceProgress = 0; } else sinceProgress++;
            if (sinceProgress >= stagnation) {
                // Stuck: keep the best tenth, start the others over
                const keep = Math.max(elite, Math.round(population * 0.1));
                const survivors = order.slice(0, keep).map(i => genomes[i].slice());
                genomes = genomes.map((_, i) => (i < keep ? survivors[i] : randomGenome()));
                rank();
                sinceProgress = 0;
                restarts++;
            }

            const top = evals[order[0]];
            // Same score and length means the same result, no need to replay it again
            const key = `${top.score}:${top.used}`;
            if (key !== lastSolution.key) lastSolution = { key, text: solutionOf(genomes[order[0]], top.used) };
            let total = 0;
            for (let i = 0; i < population; i++) total += evals[i].tiles;
            return {
                generation,
                won: top.won, tiles: top.tiles, near: top.near, moves: top.moves,
                solution: lastSolution.text, averageTiles: total / population, restarts,
            };
        },
    };
}
