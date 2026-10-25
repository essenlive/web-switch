import { createActor } from 'xstate';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams } from '@/lib/matrixHelpers';

const CODES: Record<string, Direction> = { u: 'up', r: 'right', d: 'down', l: 'left' };
const ARROWS: Record<string, Direction> = { '⬆': 'up', '➡': 'right', '⬇': 'down', '⬅': 'left' };
const LETTERS = Object.fromEntries(Object.entries(CODES).map(([k, v]) => [v, k]));

export const encodeMoves = (moves: Direction[]) => moves.map(m => LETTERS[m]).join('');

// "urdl", "u r d l" or "⬆️ ➡️ ⬇️ ⬅️" (what the share button copies) -> directions, null if anything else is in there
export function parseMoves(text: string): Direction[] | null {
  const moves: Direction[] = [];
  for (const ch of text.replace(/[\s,]|️/g, '')) {
    const dir = CODES[ch.toLowerCase()] ?? ARROWS[ch];
    if (!dir) return null;
    moves.push(dir);
  }
  return moves;
}

export interface ReplayRequest {
  query: string;        // the grid identity, same shape as the url of a game (`?s=…&cs=…`)
  moves: Direction[];
  times?: number[];     // time challenge only, ms since the first move
}

// Takes anything a player has at hand: a full game link, a `/replay` link or a bare query string.
// Moves come from the `i` param (or `moves`), the grid from the rest.
export function parseReplayInput(text: string, movesText = ''): { request: ReplayRequest | null; error: string | null } {
  const start = text.indexOf('?');
  if (start < 0) return { request: null, error: 'Paste a game link, it should contain ?s=… or ?c=…' };
  const p = new URLSearchParams(text.slice(start).split('#')[0]);
  const rawMoves = movesText.trim() || p.get('i') || '';
  const moves = parseMoves(rawMoves);
  if (!moves) return { request: null, error: 'Moves can only be u, d, l, r or arrows.' };
  const { validParams, error, input } = matrixFromParams({
    s: p.get('s') || '', cs: p.get('cs') || '', c: p.get('c') || '', t: p.get('t') || '',
  });
  if (!validParams) return { request: null, error: `That grid link is not valid (${error}).` };
  const times = p.get('ti')?.split(',').map(Number);
  if (times && (times.length !== moves.length || times.some(n => !Number.isFinite(n)))) {
    return { request: null, error: 'Timestamps (ti) must match the moves.' };
  }
  return { request: { query: input.url, moves, times }, error: null };
}

export const replayLink = (r: ReplayRequest) =>
  `/replay${r.query}&i=${encodeMoves(r.moves)}${r.times ? `&ti=${r.times.join(',')}` : ''}`;

export interface Frame {
  canva: number[][];
  canvaIndexes: { rows: number[]; columns: number[] };
  cursor: { x: number; y: number; value: number };
  move: Direction | null; // the move that led here
  area: number;           // tiles left on the grid
  status: 'playing' | 'won' | 'lost';
}

// Plays every move on the real machine once. Frame i is the board after i moves, so seeking is just an index.
// Stops early (and says why) on a move the game would ignore or one played after the end.
export function buildFrames(r: ReplayRequest): { frames: Frame[]; error: string | null } {
  const p = new URLSearchParams(r.query);
  const { input } = matrixFromParams({ s: p.get('s') || '', cs: p.get('cs') || '', c: p.get('c') || '', t: p.get('t') || '' });
  const actor = createActor(switchMachine, { input }).start();
  const frame = (move: Direction | null): Frame => {
    const snap = actor.getSnapshot();
    const { canva, canvaIndexes, cursor } = structuredClone(snap.context);
    return {
      canva, canvaIndexes, cursor, move,
      area: canva.length * canva[0].length,
      status: snap.value === 'Game_End' ? 'won' : snap.value === 'Game_Over' ? 'lost' : 'playing',
    };
  };
  const frames = [frame(null)];
  let error: string | null = null;
  for (const [i, dir] of r.moves.entries()) {
    if (frames.at(-1)!.status !== 'playing') { error = `The game was already over before move ${i + 1}.`; break; }
    const before = actor.getSnapshot().context.score;
    actor.send({ type: 'input_move', params: { direction: dir, at: r.times?.[i] } });
    if (actor.getSnapshot().context.score === before) { error = `Move ${i + 1} (${dir}) is not possible there.`; break; }
    frames.push(frame(dir));
  }
  actor.stop();
  return { frames, error };
}
