import { expect, it } from 'vitest';
import { standings } from '@/lib/standings';
import type { CommunityScore } from '@/lib/scoreEvent';

const sc = (pubkey: string, url: string, rank: number, won = true): CommunityScore =>
  ({ pubkey, nickname: pubkey, url, score: rank, won, rank, timestamp: 0, inputs: [] });

it('a long consistent record beats one lucky win', () => {
  const urls = Array.from({ length: 10 }, (_, i) => `?s=${i}`);
  const scores = [sc('lucky', urls[0], 5)];
  for (const u of urls) scores.push(sc('steady', u, 6), sc('x', u, 9), sc('y', u, 10));
  scores.push(sc('x', urls[0], 9));
  const r = standings(scores, urls);
  expect(r[0].pubkey).toBe('steady');
  expect(r.find(e => e.pubkey === 'steady')!.golds).toBe(9);
});

it('counts ties and unsolved grids', () => {
  const r = standings([sc('a', '?s=1', 5), sc('b', '?s=1', 5), sc('c', '?s=1', 3000, false)], ['?s=1']);
  expect(r.map(e => e.pubkey)).toEqual(['a', 'b']); // c solved nothing
  expect(r[0].golds).toBe(1);
});
