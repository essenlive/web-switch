import { expect, it } from 'vitest';
import { summarize } from '@/lib/calendar';

it('summarizes a month of ranks', () => {
  const s = summarize([null, { rank: 1, total: 4 }, { rank: 2, total: 4 }, null, { rank: 2, total: 2 }, { rank: 1, total: 2 }, null]);
  expect(s).toMatchObject({ played: 4, wins: 2, streak: 2, topPercent: 56, best: { rank: 1, total: 4 } });
  expect(summarize([null, null])).toMatchObject({ played: 0, streak: 0, topPercent: null, best: null });
});
