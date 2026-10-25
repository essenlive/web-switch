'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Leaderboard } from '@/components/leaderboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDailyString } from '@/lib/utils';
import { modeOfUrl, parseGrid } from '@/lib/highscores';

const CS = '6x8';
const toDay = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`; // YYYYMMDD -> YYYY-MM-DD
type View = 'daily' | 'time' | 'grid';
const VIEWS: { id: View; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'time', label: 'Time challenge' },
  { id: 'grid', label: 'Specific grid' },
];
const playPath = (url: string) => `${modeOfUrl(url) === 'random' ? '/r' : '/g'}${url}`;

export default function LeaderboardPage() {
  const shared = useSearchParams().get('u'); // a specific grid, e.g. from "Leaderboard" next to a personal best
  const [view, setView] = useState<View>(shared ? 'grid' : 'daily');
  const [day, setDay] = useState(''); // filled after mount: the local date differs between server and client
  const [gridText, setGridText] = useState(shared ?? '');
  useEffect(() => { setDay(toDay(getDailyString())); }, []);

  const seed = day.replaceAll('-', '');
  const gridUrl = parseGrid(gridText);
  const url = view === 'grid' ? gridUrl : seed ? `?s=${seed}&cs=${CS}${view === 'time' ? '&t=true' : ''}` : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 p-4 bg-background rounded-lg">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div role="group" aria-label="Leaderboard mode" className="flex flex-wrap gap-2">
          {VIEWS.map(v => (
            <Button key={v.id} className="h-11" variant={view === v.id ? 'default' : 'outline'} aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</Button>
          ))}
        </div>
        {view === 'grid' ? (
          <>
            <Label htmlFor="grid">Paste a grid link, a seed or a ?s=…&amp;cs=… query</Label>
            <Input id="grid" className="h-11" value={gridText} autoComplete="off" aria-invalid={!!gridText && !gridUrl} onChange={e => setGridText(e.target.value)} />
            {gridText && !gridUrl && <p role="status" className="text-destructive font-bold">That is not a valid grid.</p>}
          </>
        ) : (
          <>
            <Label htmlFor="day">{view === 'time' ? 'Time challenge of' : 'Daily grid of'}</Label>
            <Input id="day" className="h-11" type="date" value={day} max={toDay(getDailyString())} onChange={e => e.target.value && setDay(e.target.value)} />
          </>
        )}
        {url && <Link href={playPath(url)} className="underline font-bold">Play this grid</Link>}
      </div>

      {url && <Leaderboard url={url} />}

      <p className="px-1"><Link href="/community" className="underline font-bold">Your highscores</Link> are on your profile, where you can replay or remove them.</p>
    </div>
  );
}
