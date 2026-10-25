import { APP, modeOfUrl, type GameMode } from '@/lib/highscores';
import type { Direction } from '@/lib/switchMachine';

// Everything a player keeps on this device. The game page writes the highscores, the community code the rest.
export const STORAGE_KEYS = {
  community: `${APP}-community`, // nickname + friends
  key: `${APP}-key`,             // secret key: the identity that signs scores
  highscores: 'localHighscores', // { [gridUrl]: rank | null }
  highscoreInputs: 'localHighscoresInputs',
};

export type Stored = Direction[] | { inputs: Direction[]; times: number[]; end?: number } | null;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Highscore {
  url: string;
  rank: number;
  mode: GameMode;
  inputs: Direction[] | null; // null if the moves were never stored (older records): no replay possible
  times?: number[];
  end?: number;
}

const read = <T,>(key: string, store: Store): Record<string, T> => {
  try { return JSON.parse(store.getItem(key) || '{}') ?? {}; } catch { return {}; }
};

export function loadHighscores(store: Store = localStorage): Highscore[] {
  const ranks = read<number | null>(STORAGE_KEYS.highscores, store);
  const moves = read<Stored>(STORAGE_KEYS.highscoreInputs, store);
  return Object.entries(ranks)
    .filter((e): e is [string, number] => !!e[0] && typeof e[1] === 'number')
    .map(([url, rank]) => {
      const m = moves[url];
      const inputs = Array.isArray(m) ? m : m?.inputs ?? null;
      return { url, rank, mode: modeOfUrl(url), inputs, times: Array.isArray(m) ? undefined : m?.times, end: Array.isArray(m) ? undefined : m?.end };
    });
}

export const readBest = (url: string, store: Store = localStorage): number | null =>
  read<number | null>(STORAGE_KEYS.highscores, store)[url] ?? null;

// A new personal best: the rank and the moves (with timestamps for timed games, which cannot be re-published without them)
export function saveHighscore(url: string, rank: number, stored: Stored, store: Store = localStorage) {
  for (const [key, value] of [[STORAGE_KEYS.highscores, rank], [STORAGE_KEYS.highscoreInputs, stored]] as const) {
    store.setItem(key, JSON.stringify({ ...read(key, store), [url]: value }));
  }
}

export function removeHighscore(url: string, store: Store = localStorage) {
  for (const key of [STORAGE_KEYS.highscores, STORAGE_KEYS.highscoreInputs]) {
    const all = read<unknown>(key, store);
    delete all[url];
    store.setItem(key, JSON.stringify(all));
  }
}

// Forgets the whole profile on this device. The next visit starts with a fresh key.
export function wipeProfile(store: Store = localStorage) {
  Object.values(STORAGE_KEYS).forEach(k => store.removeItem(k));
}
