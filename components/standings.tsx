'use client'

import { useState } from 'react';
import { nip19 } from 'nostr-tools';
import { UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';
import { dayUrl } from '@/components/scoreCalendar';
import { standings } from '@/lib/standings';

const WINDOW = 30;
const iconBtn = 'inline-flex shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const MODES = [{ id: 'daily', label: 'Daily', suffix: '' }, { id: 'time', label: 'Time challenge', suffix: '&t=true' }];

// The last 30 days up to today (YYYY-MM-DD), newest first
const lastDays = (today: string) => Array.from({ length: WINDOW }, (_, i) => {
  const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

export function Standings({ today, world }: { today: string; world: boolean }) {
  const { nickname, following, myPubkey, addFollowing, removeFollowing } = useCommunity();
  const [mode, setMode] = useState(MODES[0]);
  const urls = today ? lastDays(today).map(d => dayUrl(d, mode.suffix)) : [];
  const authors = world ? null : [...(nickname && myPubkey ? [myPubkey] : []), ...following.map(f => f.pubkey)];
  const { scores, isLoading } = useCommunityScores(urls, authors);
  const rows = standings(scores, urls);

  return (
    <div className="flex flex-col gap-3 p-4 bg-background rounded-lg">
      <div role="group" aria-label="Standings mode" className="flex flex-wrap gap-2">
        {MODES.map(m => (
          <Button key={m.id} className="h-11" variant={mode.id === m.id ? 'default' : 'outline'} aria-pressed={mode.id === m.id} onClick={() => setMode(m)}>{m.label}</Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Last {WINDOW} days. Score = average rank over the grids solved, pulled towards the middle for players with few results.</p>
      {isLoading ? <p>Loading…</p> : rows.length === 0 ? <p>No scores in the last {WINDOW} days.</p> : (
        <ol className="flex flex-col gap-1">
          <li aria-hidden className="grid grid-cols-[1fr_3rem_4rem_3rem] gap-2 text-sm text-muted-foreground">
            <span>Player</span><span className="text-right">Score</span><span className="text-right">Solved</span><span className="text-right">🥇</span>
          </li>
          {rows.slice(0, 20).map((r, i) => {
            const mine = r.pubkey === myPubkey;
            const friend = following.find(f => f.pubkey === r.pubkey);
            return (
              <li key={r.pubkey} className={`grid grid-cols-[1fr_3rem_4rem_3rem] items-center gap-2 ${mine ? 'font-bold' : ''}`}>
                <span className="flex items-center gap-1 min-w-0">
                  <span className="truncate">{i + 1}. {friend?.label ?? r.nickname}</span>
                  {!mine && (friend ? (
                    <button type="button" aria-label={`Remove ${friend.label} from my community`} title="Remove from my community" onClick={() => removeFollowing(r.pubkey)} className={iconBtn + ' hover:text-destructive'}><UserMinus size={16} /></button>
                  ) : (
                    <button type="button" aria-label={`Add ${r.nickname} to my community`} title="Add to my community" onClick={() => addFollowing(`${r.nickname}:${nip19.npubEncode(r.pubkey)}`)} className={iconBtn}><UserPlus size={16} /></button>
                  ))}
                </span>
                <span className="text-right">{r.score}</span>
                <span className="text-right">{r.solved}/{r.played}</span>
                <span className="text-right">{r.golds}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
