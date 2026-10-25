'use client'

import { useState } from 'react';
import Link from 'next/link';
import { nip19 } from 'nostr-tools';
import { Clapperboard, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';
import { formatRank } from '@/lib/scoreEvent';
import { replayLink } from '@/lib/replay';

const iconBtn = 'inline-flex shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Leaderboard({ url }: { url: string }) {
  const { nickname, following, myPubkey, addFollowing, removeFollowing, removeHighscore } = useCommunity();
  const [world, setWorld] = useState(false);
  const [removedUrl, setRemovedUrl] = useState<string | null>(null); // the relays do not echo our own removal back
  const authors = world ? null : [...(nickname && myPubkey ? [myPubkey] : []), ...following.map(f => f.pubkey)];
  const { scores, isLoading } = useCommunityScores(url, authors);

  return (
    <div className="flex flex-col gap-3 p-4 bg-background rounded-lg">
      <div className="flex gap-2">
        <Button variant={world ? 'outline' : 'default'} onClick={() => setWorld(false)}>My community</Button>
        <Button variant={world ? 'default' : 'outline'} onClick={() => setWorld(true)}>World</Button>
      </div>
      {!nickname && (
        <p><Link href="/community" className="underline font-bold">Pick a nickname</Link> to publish your scores.</p>
      )}
      {isLoading ? <p>Loading…</p> : scores.length === 0 ? <p>No scores for this grid yet.</p> : (
        <ol className="flex flex-col gap-1">
          {scores.filter(s => !(removedUrl === url && s.pubkey === myPubkey)).slice(0, 20).map((s, i) => {
            const mine = s.pubkey === myPubkey;
            const friend = following.find(f => f.pubkey === s.pubkey);
            return (
              <li key={s.pubkey} className={`grid grid-cols-2 items-center gap-2 ${mine ? 'font-bold' : ''}`}>
                <span className="flex items-center gap-1 min-w-0">
                  <span className="truncate">{i + 1}. {friend?.label ?? s.nickname}</span>
                  {!mine && (friend ? (
                    <button type="button" aria-label={`Remove ${friend.label} from my community`} title="Remove from my community" onClick={() => removeFollowing(s.pubkey)} className={iconBtn + ' hover:text-destructive'}>
                      <UserMinus size={16} />
                    </button>
                  ) : (
                    <button type="button" aria-label={`Add ${s.nickname} to my community`} title="Add to my community" onClick={() => addFollowing(`${s.nickname}:${nip19.npubEncode(s.pubkey)}`)} className={iconBtn + ' hover:text-foreground'}>
                      <UserPlus size={16} />
                    </button>
                  ))}
                </span>
                <span className="flex items-center justify-end gap-1">
                  {formatRank(s.rank)}
                  <Link href={replayLink({ query: url, moves: s.inputs, times: s.times })} aria-label={`Watch ${s.nickname}'s replay`} title="Watch the replay" className={iconBtn + ' hover:text-foreground'}>
                    <Clapperboard size={16} />
                  </Link>
                  {mine && (
                    <button type="button" aria-label="Remove my score" title="Remove my score" onClick={() => { removeHighscore(url); setRemovedUrl(url); }} className={iconBtn + ' hover:text-destructive'}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
