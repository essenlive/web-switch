import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams, generateRandomMatrix } from '@/lib/matrixHelpers';
import { scoreFromEvent, dTag, SCORE_KIND } from '@/lib/scoreEvent';
import { friendLink, parseFriendCode } from '@/lib/links';
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
  globalThis.location = { origin: 'http://x' } as Location;
  const ami = new URL(friendLink(code)).searchParams.get('ami')!;
  expect(parseFriendCode(ami)).toEqual({ label: 'bob', pubkey });
});
