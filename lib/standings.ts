import type { CommunityScore } from '@/lib/scoreEvent';

export interface Standing { pubkey: string; nickname: string; score: number; solved: number; played: number; golds: number }

// Shrunken average rank over a set of grids. Per grid, among the players who solved it: p = (rank - 0.5) / N, ties share
// their average rank (1st of 3 and 1st of 200 compare, a lone player gets a neutral 0.5). A player's mean p is pulled towards
// 0.5 by m imaginary average results, so one lucky win does not beat a long consistent record.
// m is fixed so a player is scored the same way in every scope (only the competitors change).
const M = 5;
export function standings(scores: CommunityScore[], urls: string[]): Standing[] {
  const by = new Map<string, Standing & { sum: number }>();
  for (const url of urls) {
    const all = scores.filter(s => s.url === url);
    const won = all.filter(s => s.won).sort((a, b) => a.rank - b.rank);
    for (const s of all) {
      const e = by.get(s.pubkey) ?? { pubkey: s.pubkey, nickname: s.nickname, score: 0, solved: 0, played: 0, golds: 0, sum: 0 };
      e.played++;
      by.set(s.pubkey, e);
    }
    for (const s of won) {
      const first = won.findIndex(o => o.rank === s.rank), last = won.findLastIndex(o => o.rank === s.rank);
      const e = by.get(s.pubkey)!;
      e.solved++;
      e.sum += ((first + last) / 2 + 0.5) / won.length;
      if (first === 0) e.golds++;
    }
  }
  const players = [...by.values()].filter(e => e.solved > 0);
  return players
    .map(({ sum, ...e }) => ({ ...e, score: Math.round(100 * (1 - (sum + M * 0.5) / (e.solved + M))) }))
    .sort((a, b) => b.score - a.score || b.golds - a.golds || b.solved - a.solved);
}
