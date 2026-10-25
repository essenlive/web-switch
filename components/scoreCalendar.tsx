'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rankIn, summarize } from '@/lib/calendar';
import type { CommunityScore } from '@/lib/scoreEvent';

const pad = (n: number) => String(n).padStart(2, '0');
export const monthOf = (day: string) => day.slice(0, 7); // YYYY-MM-DD -> YYYY-MM
export const dayUrl = (day: string, suffix: string) => `?s=${day.replaceAll('-', '')}&cs=6x8${suffix}`;
// The daily grids of a month, up to today
export function monthUrls(month: string, today: string, suffix: string): string[] {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${month}-${pad(i + 1)}`)
    .filter(d => d <= today).map(d => dayUrl(d, suffix));
}

interface Props {
  month: string; today: string; day: string; suffix: string;
  scores: CommunityScore[]; myPubkey: string | null; world: boolean;
  onMonth: (month: string) => void; onDay: (day: string) => void;
}

export function ScoreCalendar({ month, today, day, suffix, scores, myPubkey, world, onMonth, onDay }: Props) {
  const [y, m] = month.split('-').map(Number);
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); onMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // weeks start on Monday
  const ranks = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${month}-${pad(i + 1)}`;
    return d > today ? null : rankIn(scores.filter(s => s.url === dayUrl(d, suffix)), myPubkey);
  });
  const sum = summarize(ranks);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={18} /></Button>
        <h2 className="font-bold" aria-live="polite">{new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Next month" disabled={month >= monthOf(today)} onClick={() => shift(1)}><ChevronRight size={18} /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: lead }, (_, i) => <span key={i} />)}
        {ranks.map((r, i) => {
          const d = `${month}-${pad(i + 1)}`;
          const best = r ? 1 - (r.total > 1 ? (r.rank - 1) / (r.total - 1) : 0) : 0; // 1 = first, 0 = last
          return (
            <button key={d} type="button" disabled={d > today} aria-pressed={d === day}
              aria-label={`${d}${r ? `, rank ${r.rank} of ${r.total}` : ', not played'}`}
              onClick={() => onDay(d)}
              style={r ? { backgroundColor: `hsl(var(--primary) / ${0.05 + 0.3 * best})` } : undefined}
              className={`flex min-h-12 flex-col items-center justify-center rounded-md border text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 ${d === day ? 'border-2 border-primary font-bold' : ''}`}>
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="font-bold">{r ? `#${r.rank}/${r.total}` : '·'}</span>
            </button>
          );
        })}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        {([
          ['Days played', sum.played],
          ['Wins (#1)', sum.wins],
          ['Streak', sum.streak],
          ['Average', sum.topPercent === null ? '–' : `top ${sum.topPercent}%`],
          ['Best day', sum.best ? `#${sum.best.rank}/${sum.best.total}` : '–'],
        ] as const).map(([k, v]) => (
          <div key={k} className="rounded-md border p-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-bold">{v}</dd></div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{world ? 'World ranks cover the 200 latest scores of each day.' : 'Ranks among you and the people you follow.'}</p>
    </div>
  );
}
