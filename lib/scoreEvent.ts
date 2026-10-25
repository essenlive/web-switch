import { verifyEvent, type Event } from 'nostr-tools/pure';
import { createActor } from 'xstate';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams } from '@/lib/matrixHelpers';

export const SCORE_KIND = 30078; // NIP-78, remplaçable par (pubkey, d)
export const APP = 'switch';
// Le défi = la query de la grille (`?s=seed&cs=6x8` ou `?c=...&cs=...`)
export const dTag = (url: string) => `${APP}:${url}`;

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];
const MAX_MOVES = 500;

export interface ScorePayload {
  v: 1;
  nickname: string;
  inputs: Direction[];
}

export interface CommunityScore {
  pubkey: string;
  nickname: string;
  url: string;
  score: number; // nombre de coups, moins = mieux
  timestamp: number;
}

// Rejoue les coups sur la vraie machine : renvoie le score, ou null si la partie n'est pas une victoire exacte.
export function replay(url: string, inputs: Direction[]): number | null {
  const p = new URLSearchParams(url);
  const { validParams, input } = matrixFromParams({
    s: p.get('s') || '', cs: p.get('cs') || '', c: p.get('c') || '', t: '',
  });
  if (!validParams) return null;
  const actor = createActor(switchMachine, { input }).start();
  try {
    for (const dir of inputs) {
      if (actor.getSnapshot().value === 'Game_End') return null; // coups après la victoire
      actor.send({ type: 'input_move', params: { direction: dir } });
    }
    const snap = actor.getSnapshot();
    // un coup ignoré (hors grille) ne compte pas : score != nb d'entrées -> rejet
    return snap.value === 'Game_End' && snap.context.score === inputs.length ? snap.context.score : null;
  } finally {
    actor.stop();
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
    const score = replay(url, p.inputs);
    if (score === null) return null;
    return { pubkey: event.pubkey, nickname: p.nickname, url, score, timestamp: event.created_at * 1000 };
  } catch {
    return null;
  }
}
