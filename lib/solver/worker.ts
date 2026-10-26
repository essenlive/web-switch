/// <reference lib="webworker" />
import { createGA, type GAOptions, type GAStats } from './ga';

export type SolverRequest = { type: 'start'; canva: number[][]; options: GAOptions } | { type: 'stop' };
export type SolverMessage = GAStats;

let run = 0;

self.onmessage = (e: MessageEvent<SolverRequest>) => {
    run++; // a new message cancels the run in progress
    if (e.data.type === 'stop') return;
    const id = run;
    const ga = createGA(e.data.canva, e.data.options);
    const loop = () => {
        if (id !== run) return;
        // Keeps going after a win to shorten it. Work in slices so a stop message can get through, report once per slice
        const until = performance.now() + 100;
        let stats = ga.step();
        while (performance.now() < until) stats = ga.step();
        self.postMessage(stats satisfies SolverMessage);
        setTimeout(loop, 0);
    };
    loop();
};
