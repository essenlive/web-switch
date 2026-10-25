import type { CommunityScore } from '@/lib/scoreEvent';

export interface DayRank { rank: number; total: number }

// My place among the scores of one grid (already sorted best first), null if I did not play it
export function rankIn(scores: CommunityScore[], pubkey: string | null): DayRank | null {
  const i = scores.findIndex(s => s.pubkey === pubkey);
  return i < 0 ? null : { rank: i + 1, total: scores.length };
}

// days = one entry per day of the month, null = not played. The streak counts back from the last day of the list
// (ponytail: stays inside the displayed month, a streak across a month boundary is cut at the 1st)
export function summarize(days: (DayRank | null)[]) {
  const played = days.filter((d): d is DayRank => d !== null);
  let streak = 0;
  const last = days.length - 1 - [...days].reverse().findIndex(d => d !== null);
  for (let i = last; i >= 0 && days[i]; i--) streak++;
  return {
    played: played.length,
    wins: played.filter(d => d.rank === 1).length,
    streak: played.length ? streak : 0,
    topPercent: played.length ? Math.round(100 * played.reduce((a, d) => a + d.rank / d.total, 0) / played.length) : null,
    best: played.length ? played.reduce((a, d) => (d.rank / d.total < a.rank / a.total ? d : a)) : null,
  };
}
