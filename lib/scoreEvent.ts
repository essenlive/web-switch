import { verifyEvent, type Event } from 'nostr-tools/pure';
import { createActor } from 'xstate';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams } from '@/lib/matrixHelpers';
import { APP, rankOf } from '@/lib/highscores';

export { APP, rankOf, formatRank } from '@/lib/highscores';

export const SCORE_KIND = 30078; // NIP-78, replaceable per (pubkey, d)
// The challenge = the grid query (`?s=seed&cs=6x8` ou `?c=...&cs=...`)
export const dTag = (url: string) => `${APP}:${url}`;

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];
const MAX_MOVES = 500;
// Time challenge timestamps are self-reported (ms since the first move). Bounds only stop casual tampering.
const MAX_TIME = 30 * 60 * 1000;
const MIN_GAP = 120; // faster than a human can swipe

export interface ScorePayload {
  v: 1;
  nickname: string;
  inputs: Direction[];
  // Time challenge only: ms since the clock started (first move attempt), one per input, and the time the grid was lost
  times?: number[];
  end?: number;
}

export interface CommunityScore {
  pubkey: string;
  nickname: string;
  url: string;
  score: number; // number of moves
  won: boolean;  // false only in the time challenge (grid outgrew the limit)
  rank: number;  // lower is better, see rankOf
  timestamp: number;
  inputs: Direction[]; // the verified moves, so the score can be replayed
  times?: number[];
}

// Replays the moves on the real machine: returns the result, or null if the game did not end exactly with the last move.
export function replay(url: string, inputs: Direction[], times?: number[], end?: number): { won: boolean; moves: number; rank: number } | null {
  const p = new URLSearchParams(url);
  const { validParams, input } = matrixFromParams({
    s: p.get('s') || '', cs: p.get('cs') || '', c: p.get('c') || '', t: p.get('t') || '',
  });
  if (!validParams) return null;
  const actor = createActor(switchMachine, { input }).start();
  try {
    const over = () => ['Game_End', 'Game_Over'].includes(actor.getSnapshot().value as string);
    for (const [i, dir] of inputs.entries()) {
      if (over()) return null; // moves after the end
      actor.send({ type: 'input_move', params: { direction: dir, at: times?.[i] } });
    }
    if (end !== undefined && !over()) actor.send({ type: 'tick', params: { at: end } }); // idle until the grid outgrew the limit
    const snap = actor.getSnapshot();
    const won = snap.value === 'Game_End';
    // an ignored move (off the grid) does not count: score != number of inputs -> rejected
    if (!(won || snap.value === 'Game_Over') || snap.context.score !== inputs.length) return null;
    return { won, moves: snap.context.score, rank: rankOf(won, snap.context.score, snap.context.minArea) };
  } finally {
    actor.stop();
  }
}

// A removed score is the same replaceable event with an empty payload: relays keep only the newest, so it overwrites the score.
export const TOMBSTONE = { v: 1, deleted: true } as const;

// When (ms) a verified event says its author removed the score of this grid, else null.
export function removalFromEvent(event: Event, url: string): number | null {
  try {
    if (event.kind !== SCORE_KIND || !verifyEvent(event)) return null;
    if (!event.tags.some(t => t[0] === 'd' && t[1] === dTag(url))) return null;
    const p = JSON.parse(event.content);
    return p?.v === 1 && p.deleted === true ? event.created_at * 1000 : null;
  } catch {
    return null;
  }
}

export function scoreFromEvent(event: Event, url: string): CommunityScore | null {
  try {
    if (event.kind !== SCORE_KIND || !verifyEvent(event)) return null;
    if (!event.tags.some(t => t[0] === 'd' && t[1] === dTag(url))) return null;
    const p = JSON.parse(event.content) as ScorePayload;
    if (p.v !== 1 || typeof p.nickname !== 'string' || p.nickname.length > 20) return null;
    if (!Array.isArray(p.inputs) || p.inputs.length === 0 || p.inputs.length > MAX_MOVES) return null;
    if (!p.inputs.every(d => DIRECTIONS.includes(d))) return null;
    const timed = new URLSearchParams(url).get('t') === 'true';
    if (timed) {
      const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_TIME;
      if (!Array.isArray(p.times) || p.times.length !== p.inputs.length || !p.times.every(ok)) return null;
      if (p.times.some((t, i) => i > 0 && t - p.times![i - 1] < MIN_GAP)) return null;
      if (p.end !== undefined && !(ok(p.end) && p.end >= p.times[p.times.length - 1])) return null;
    } else if (p.times !== undefined || p.end !== undefined) return null;
    const r = replay(url, p.inputs, p.times, p.end);
    if (r === null) return null;
    return { pubkey: event.pubkey, nickname: p.nickname, url, score: r.moves, won: r.won, rank: r.rank, timestamp: event.created_at * 1000, inputs: p.inputs, times: p.times };
  } catch {
    return null;
  }
}
