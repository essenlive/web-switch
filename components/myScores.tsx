'use client'

import Link from 'next/link';
import { Clapperboard, Trash2 } from 'lucide-react';
import { useCommunity } from '@/hooks/useCommunity';
import { MODES, modeOfUrl } from '@/lib/highscores';
import { formatRank } from '@/lib/scoreEvent';
import { replayLink } from '@/lib/replay';

const playPath = (url: string) => `${modeOfUrl(url) === 'random' ? '/r' : '/g'}${url}`;

export function MyScores() {
  const { highscores, removeHighscore } = useCommunity();

  return (
    <div className="flex flex-col gap-3 p-4 bg-background rounded-lg">
      {highscores.length === 0 ? <p>Solve a grid and your best shows up here, per mode.</p> : MODES.map(m => {
        const rows = highscores.filter(b => b.mode === m.id).sort((a, b) => a.url < b.url ? 1 : -1);
        if (!rows.length) return null;
        return (
          <div key={m.id} className="flex flex-col gap-1">
            <h2 className="font-bold text-muted-foreground">{m.label}</h2>
            <ul className="flex flex-col gap-1">
              {rows.map(b => (
                <li key={b.url} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{formatRank(b.rank)} <span className="text-sm text-muted-foreground">{b.url.replace('?', '')}</span></span>
                  <span className="flex items-center gap-3 shrink-0">
                    <Link href={playPath(b.url)} className="underline">Play</Link>
                    <Link href={`/leaderboard?u=${encodeURIComponent(b.url)}`} className="underline">Ranking</Link>
                    {b.inputs && <Link href={replayLink({ query: b.url, moves: b.inputs, times: b.times })} aria-label="Watch the replay" title="Watch the replay"><Clapperboard size={18} /></Link>}
                    <button type="button" aria-label={`Remove my score on ${b.url.replace('?', '')}`} title="Remove from this device and the community" className="cursor-pointer rounded-sm p-1 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => removeHighscore(b.url)}>
                      <Trash2 size={18} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
