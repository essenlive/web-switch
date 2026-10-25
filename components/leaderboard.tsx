'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';
import { formatRank } from '@/lib/scoreEvent';
import { replayLink } from '@/lib/replay';

export function Leaderboard({ url }: { url: string }) {
  const { nickname, following, myPubkey } = useCommunity();
  const [world, setWorld] = useState(false);
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
        <ol className="list-decimal list-inside space-y-1">
          {scores.slice(0, 20).map(s => (
            <li key={s.pubkey} className={s.pubkey === myPubkey ? 'font-bold' : ''}>
              {following.find(f => f.pubkey === s.pubkey)?.label ?? s.nickname} — {formatRank(s.rank)}
              <Link href={replayLink({ query: url, moves: s.inputs, times: s.times })} aria-label={`Watch ${s.nickname}'s replay`} title="Watch the replay" className="ml-2 inline-flex align-middle rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Clapperboard size={16} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
