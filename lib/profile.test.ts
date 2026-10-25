import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS, loadHighscores, removeHighscore, wipeProfile } from '@/lib/profile';

const fakeStore = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const daily = '?s=20260101&cs=6x8';
const timed = '?s=20260101&cs=6x8&t=true';

const seed = () => fakeStore({
  [STORAGE_KEYS.highscores]: JSON.stringify({ [daily]: 12, [timed]: 5004, '?s=x&cs=6x8': null }),
  [STORAGE_KEYS.highscoreInputs]: JSON.stringify({ [daily]: ['up', 'left'], [timed]: { inputs: ['up'], times: [900] } }),
  [STORAGE_KEYS.community]: '{"nickname":"bob","following":[]}',
  [STORAGE_KEYS.key]: 'abc',
});

describe('profile storage', () => {
  it('lists highscores with their moves and mode, skipping empty ones', () => {
    expect(loadHighscores(seed())).toEqual([
      { url: daily, rank: 12, mode: 'daily', inputs: ['up', 'left'], times: undefined },
      { url: timed, rank: 5004, mode: 'time', inputs: ['up'], times: [900] },
    ]);
  });
  it('removes one highscore and its moves only', () => {
    const s = seed();
    removeHighscore(daily, s);
    expect(loadHighscores(s).map(h => h.url)).toEqual([timed]);
    expect(s.m.get(STORAGE_KEYS.community)).toBeDefined();
  });
  it('wipes everything', () => {
    const s = seed();
    wipeProfile(s);
    expect(s.m.size).toBe(0);
    expect(loadHighscores(s)).toEqual([]);
  });
});
