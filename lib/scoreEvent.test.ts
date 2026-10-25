import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams, generateRandomMatrix, growLine, growMs } from '@/lib/matrixHelpers';
import { scoreFromEvent, dTag, rankOf, SCORE_KIND } from '@/lib/scoreEvent';
import { parseFriendCode } from '@/lib/links';
import { nip19 } from 'nostr-tools';
import { getPublicKey } from 'nostr-tools/pure';

const GRID = '?s=test&cs=3x3';

// Solution trouvée en jouant la machine au hasard (déterministe : seed du hasard fixe)
function solve(url: string): Direction[] {
  const p = new URLSearchParams(url);
  const { input } = matrixFromParams({ s: p.get('s')!, cs: p.get('cs')!, c: '', t: '' });
  const dirs: Direction[] = ['up', 'left', 'down', 'right'];
  let seed = 1;
  for (;;) {
    const a = createActor(switchMachine, { input }).start();
    for (let i = 0; i < 300 && a.getSnapshot().value !== 'Game_End'; i++) {
      seed = (seed * 16807) % 2147483647;
      a.send({ type: 'input_move', params: { direction: dirs[seed % 4] } });
    }
    if (a.getSnapshot().value === 'Game_End') return a.getSnapshot().context.inputList;
  }
}

const sk = generateSecretKey();
const sign = (content: object, tags = [['d', dTag(GRID)]], key = sk) =>
  finalizeEvent({ kind: SCORE_KIND, created_at: 1, tags, content: JSON.stringify(content) }, key);

describe('scoreFromEvent', () => {
  const inputs = solve(GRID);
  it('accepte un événement valide et recalcule le score', () => {
    const s = scoreFromEvent(sign({ v: 1, nickname: 'bob', inputs }), GRID);
    expect(s?.score).toBe(inputs.length);
  });
  it('rejette signature, seed, entrées, pseudo, version', () => {
    const ok = sign({ v: 1, nickname: 'bob', inputs });
    expect(scoreFromEvent({ ...JSON.parse(JSON.stringify(ok)), sig: ok.sig.replace(/.$/, ok.sig.endsWith('0') ? '1' : '0') }, GRID)).toBeNull();
    expect(scoreFromEvent(ok, '?s=autre&cs=3x3')).toBeNull();
    expect(scoreFromEvent(sign({ v: 1, nickname: 'bob', inputs: inputs.slice(0, -1) }), GRID)).toBeNull(); // pas fini
    expect(scoreFromEvent(sign({ v: 1, nickname: 'bob', inputs: [...inputs, 'up'] }), GRID)).toBeNull(); // coup après victoire
    expect(scoreFromEvent(sign({ v: 1, nickname: 'bob', inputs: ['x'] }), GRID)).toBeNull();
    expect(scoreFromEvent(sign({ v: 1, nickname: 'x'.repeat(21), inputs }), GRID)).toBeNull();
    expect(scoreFromEvent(sign({ v: 2, nickname: 'bob', inputs }), GRID)).toBeNull();
  });
});

it('snapshot de la grille de seed connue (si ça casse, les défis partagés ont changé)', () => {
  expect(generateRandomMatrix('test', 3, 3)).toMatchSnapshot();
});

it('code ami : aller-retour', () => {
  const pubkey = getPublicKey(sk);
  const code = `bob:${nip19.npubEncode(pubkey)}`;
  expect(parseFriendCode(code)).toEqual({ label: 'bob', pubkey });
});

describe('time challenge', () => {
  const TGRID = '?s=test&cs=3x3&t=true';
  const GROW_MS = growMs([[1, 1, 1], [1, 1, 1], [1, 1, 1]]); // 3x3 grid
  const params = (url: string) => { const p = new URLSearchParams(url); return { s: p.get('s') || '', cs: p.get('cs') || '', c: p.get('c') || '', t: p.get('t') || '' }; };
  const newActor = () => createActor(switchMachine, { input: matrixFromParams(params(TGRID)).input }).start();

  it('t is part of the grid identity, and needs a seed', () => {
    expect(matrixFromParams(params(TGRID)).input.url).toBe(TGRID);
    expect(matrixFromParams(params(GRID)).input.url).toBe(GRID);
    expect(matrixFromParams({ s: '', cs: '2x2', c: '1234', t: 'true' }).validParams).toBe(false);
  });

  it('growth line is deterministic and never uniform (if this snapshot breaks, shared time challenges changed)', () => {
    expect([0, 1, 2, 3].map(i => growLine('test', i, 4))).toMatchSnapshot();
    for (let i = 0; i < 50; i++) expect(new Set(growLine('x', i, 3)).size).toBeGreaterThan(1);
  });

  const mv = (a: ReturnType<typeof newActor>, i: number, at: number) =>
    a.send({ type: 'input_move', params: { direction: i % 2 ? 'left' : 'right', at } });

  it('the grid grows with the clock, one step per interval (2000 ms x smallest side), even without a move', () => {
    const a = newActor();
    mv(a, 0, 0);
    a.send({ type: 'tick', params: { at: GROW_MS - 1 } });
    expect(a.getSnapshot().context.grown).toBe(0);
    a.send({ type: 'tick', params: { at: GROW_MS } });
    expect(a.getSnapshot().context.grown).toBe(1);
    a.send({ type: 'tick', params: { at: GROW_MS + 1 } });
    expect(a.getSnapshot().context.grown).toBe(1);
  });

  it('removing a line restarts the growth countdown', () => {
    // The first row is already uniform: the first (cursor) move evaluates the grid and removes it
    const canva = [[1, 1, 1], [2, 3, 2], [3, 2, 3]];
    const a = createActor(switchMachine, { input: { timerMode: true, seed: 'test', canva, url: 'x' } }).start();
    a.send({ type: 'input_move', params: { direction: 'right', at: 2000 } });
    expect(a.getSnapshot().context.canva.length).toBe(2);
    expect(a.getSnapshot().context.clockBase).toBe(2000);
    // the interval follows the current grid: 2 rows left, so 4000 ms
    a.send({ type: 'tick', params: { at: 2000 + 4000 - 1 } });
    expect(a.getSnapshot().context.grown).toBe(0);
    a.send({ type: 'tick', params: { at: 2000 + 4000 } });
    expect(a.getSnapshot().context.grown).toBe(1);
  });

  it('a late move first catches up on the growth, then is played', () => {
    const a = newActor();
    mv(a, 0, 10 * GROW_MS);
    expect(a.getSnapshot().context.grown).toBeGreaterThan(3); // intervals grow with the grid: 6000, 6000, 8000, 8000...
    expect(a.getSnapshot().context.score).toBe(1);
  });

  // Border moves only: nothing is cleared, so the grid keeps growing until it outgrows the limit.
  // Live game: ticks every 250 ms like the page. The replay gets no ticks, only the moves and their times.
  function lostGame() {
    const a = newActor();
    let at = 0, i = 0;
    for (; at < 400 * GROW_MS && a.getSnapshot().value !== 'Game_Over'; at += 250) {
      if (at % 1000 === 0) mv(a, i++, at);
      a.send({ type: 'tick', params: { at } });
    }
    const c = a.getSnapshot().context;
    expect(a.getSnapshot().value).toBe('Game_Over');
    return { inputs: c.inputList, times: c.times, end: c.endAt, rank: rankOf(false, c.score, c.minArea) };
  }
  const tsign = (content: object) => sign({ v: 1, nickname: 'bob', ...content }, [['d', dTag(TGRID)]]);

  it('a lost game replays to the same result without the ticks', () => {
    const g = lostGame();
    const s = scoreFromEvent(tsign(g), TGRID);
    expect(s?.won).toBe(false);
    expect(s?.rank).toBe(g.rank);
    expect(s?.score).toBe(g.inputs.length);
  });

  it('rejects bad or missing timestamps, and an early end', () => {
    const g = lostGame();
    const { times, end, ...rest } = g;
    expect(scoreFromEvent(tsign({ ...rest, end }), TGRID)).toBeNull(); // no times
    expect(scoreFromEvent(tsign({ ...rest, times: times.slice(1), end }), TGRID)).toBeNull(); // wrong length
    expect(scoreFromEvent(tsign({ ...rest, times: times.map(t => t / 10), end }), TGRID)).toBeNull(); // faster than a human
    expect(scoreFromEvent(tsign({ ...rest, times: [...times].reverse(), end }), TGRID)).toBeNull(); // not increasing
    expect(scoreFromEvent(tsign({ ...rest, times, end: 1000 }), TGRID)).toBeNull(); // end before the last move
    expect(scoreFromEvent(tsign({ ...rest, times, end: times[times.length - 1] }), TGRID)).toBeNull(); // not lost yet at that time
    expect(scoreFromEvent(tsign({ ...rest, times, end, inputs: [...rest.inputs, 'right'] }), TGRID)).toBeNull();
  });

  it('timestamps do not belong on a normal grid, and timed moves are not valid there', () => {
    const g = lostGame();
    expect(scoreFromEvent(sign({ v: 1, nickname: 'bob', ...g }), GRID)).toBeNull();
  });
});
