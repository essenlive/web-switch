'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Leaderboard } from '@/components/leaderboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreCalendar, monthOf, monthUrls } from '@/components/scoreCalendar';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';
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
  const params = useSearchParams();
  const shared = params.get('u'); // a specific grid, e.g. from "Leaderboard" next to a personal best
  const [view, setView] = useState<View>(shared ? 'grid' : 'daily');
  const [day, setDay] = useState(''); // filled after mount: the local date differs between server and client
  const [gridText, setGridText] = useState(shared ?? '');
  const [month, setMonth] = useState('');
  const [world, setWorld] = useState(false);
  const today = toDay(getDailyString());
  useEffect(() => { setDay(today); setMonth(monthOf(today)); }, [today]);

  const { nickname, following, myPubkey } = useCommunity();
  const seed = day.replaceAll('-', '');
  const gridUrl = parseGrid(gridText);
  const suffix = view === 'time' ? '&t=true' : '';
  const url = view === 'grid' ? gridUrl : seed ? `?s=${seed}&cs=${CS}${suffix}` : null;
  // one subscription for the whole month shown, plus the selected day when it is in another month
  const urls = view === 'grid' ? (gridUrl ? [gridUrl] : []) : month ? [...new Set([...monthUrls(month, today, suffix), ...(url ? [url] : [])])] : [];
  const authors = world ? null : [...(nickname && myPubkey ? [myPubkey] : []), ...following.map(f => f.pubkey)];
  const { scores, isLoading } = useCommunityScores(urls, authors);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="sr-only">Leaderboard</h1>
      <div role="group" aria-label="Ranking scope" className="flex gap-2">
        <Button className="h-11 grow text-base rounded-lg" variant={world ? 'outline' : 'default'} aria-pressed={!world} onClick={() => setWorld(false)}>My community</Button>
        <Button className="h-11 grow text-base rounded-lg" variant={world ? 'default' : 'outline'} aria-pressed={world} onClick={() => setWorld(true)}>World</Button>
      </div>

      <div className="flex flex-col gap-3 p-4 bg-background rounded-lg">
            <div role="group" aria-label="Leaderboard mode" className="flex flex-wrap gap-2">
              {VIEWS.map(v => (
                <Button key={v.id} className="h-11" variant={view === v.id ? 'default' : 'outline'} aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.label}</Button>
              ))}
            </div>
            {view === 'grid' ? (
              <>
                <Label htmlFor="grid">Paste a grid link, a seed or a ?s=…&amp;cs=… query</Label>
                <div className="flex gap-2">
                  <Input id="grid" className="h-11 min-w-0" value={gridText} autoComplete="off" aria-invalid={!!gridText && !gridUrl} onChange={e => setGridText(e.target.value)} />
                  {url && <Button asChild className="h-11 shrink-0"><Link href={playPath(url)}>Play this grid</Link></Button>}
                </div>
                {gridText && !gridUrl && <p role="status" className="text-destructive font-bold">That is not a valid grid.</p>}
              </>
            ) : (
              <>
                <ScoreCalendar month={month} today={today} day={day} suffix={suffix} scores={scores} myPubkey={myPubkey} world={world}
                  onMonth={setMonth} onDay={d => { setDay(d); setMonth(monthOf(d)); }} />
                {url && <Button asChild className="h-11"><Link href={playPath(url)}>Play {day}</Link></Button>}
              </>
            )}
      </div>

      {url && <Leaderboard url={url} all={scores} isLoading={isLoading} />}
    </div>
  );
}
