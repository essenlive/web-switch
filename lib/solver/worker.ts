/// <reference lib="webworker" />
import { createEngine, type EngineKind, type EngineOptions } from './engines';
import type { GAStats } from './ga';

export interface SolverStart { canva: number[][]; kind: EngineKind; options: EngineOptions; seconds?: number }
export type SolverRequest = ({ type: 'start'; id: number } & SolverStart) | { type: 'stop' };

// `id` is the one of the start request, so a page that restarted ignores what the old run still says
export type SolverMessage =
    | { type: 'stats'; id: number; stats: GAStats }
    // The run is over: the time budget ran out, or the search has nothing left to try
    | { type: 'finished'; id: number; stats: GAStats; firstWin: { moves: number; at: number } | null; elapsed: number };

let run = 0;

self.onmessage = (e: MessageEvent<SolverRequest>) => {
    run++; // a new message cancels the run in progress
    if (e.data.type === 'stop') return;
    const { id, canva, kind, options, seconds } = e.data;
    const mine = run;
    const engine = createEngine(kind, canva, options);
    const t0 = performance.now();
    let firstWin: { moves: number; at: number } | null = null;
    const next = () => {
        const stats = engine.step();
        if (stats.won && !firstWin) firstWin = { moves: stats.moves, at: (performance.now() - t0) / 1000 };
        return stats;
    };
    const loop = () => {
        if (mine !== run) return;
        // Keeps going after a win to shorten it. Work in slices so a stop message can get through, report once per slice
        const until = performance.now() + 100;
        let stats = next();
        while (performance.now() < until && !stats.done) stats = next();
        const elapsed = (performance.now() - t0) / 1000;
        const finished = stats.done || (seconds !== undefined && elapsed >= seconds);
        self.postMessage(finished ? { type: 'finished', id, stats, firstWin, elapsed } : { type: 'stats', id, stats } satisfies SolverMessage);
        if (!finished) setTimeout(loop, 0);
    };
    loop();
};
