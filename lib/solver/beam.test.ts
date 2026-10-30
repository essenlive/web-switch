import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import switchMachine, { type Direction } from '../switchMachine';
import { generateRandomMatrix } from '../matrixHelpers';
import { createBeam } from './beam';

const NAMES: Record<string, Direction> = { u: 'up', r: 'right', d: 'down', l: 'left' };

describe('createBeam', () => {
  it('finds a solution that wins in the real machine in exactly that many moves, and stops when its widths are used up', () => {
    const canva = generateRandomMatrix('beam', 6, 6);
    const beam = createBeam(canva, { startWidth: 8, maxWidth: 64 });
    let stats = beam.step();
    for (let i = 0; i < 2000 && !stats.done; i++) stats = beam.step();
    expect(stats.done).toBe(true);
    expect(stats.won).toBe(true);

    const actor = createActor(switchMachine, { input: { canva, timerMode: false, seed: '', url: '' } }).start();
    for (const l of stats.solution) actor.send({ type: 'input_move', params: { direction: NAMES[l] } });
    expect(actor.getSnapshot().value).toBe('Game_End');
    expect(actor.getSnapshot().context.score).toBe(stats.moves);
    expect(stats.solution.length).toBe(stats.moves);
  });

  it('is deterministic', () => {
    const canva = generateRandomMatrix('det', 5, 5);
    const run = () => {
      const beam = createBeam(canva, { startWidth: 8, maxWidth: 32 });
      let stats = beam.step();
      while (!stats.done) stats = beam.step();
      return stats.solution;
    };
    expect(run()).toBe(run());
  });
});
