'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';

export function Leaderboard({ url }: { url: string }) {
  const { nickname, following, myPubkey } = useCommunity();
  const [world, setWorld] = useState(false);
  const authors = world ? null : [...(nickname && myPubkey ? [myPubkey] : []), ...following.map(f => f.pubkey)];
  const { scores, isLoading } = useCommunityScores(url, authors);

  return (
    <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
      <div className="flex gap-2">
        <Button variant={world ? 'outline' : 'default'} onClick={() => setWorld(false)}>Ma communauté</Button>
        <Button variant={world ? 'default' : 'outline'} onClick={() => setWorld(true)}>Mondial</Button>
      </div>
      {!nickname && (
        <p><Link href="/community" className="underline font-bold">Choisis un pseudo</Link> pour publier tes scores.</p>
      )}
      {isLoading ? <p>Chargement…</p> : scores.length === 0 ? <p>Aucun score pour cette grille.</p> : (
        <ol className="list-decimal list-inside">
          {scores.slice(0, 20).map(s => (
            <li key={s.pubkey} className={s.pubkey === myPubkey ? 'font-bold' : ''}>
              {following.find(f => f.pubkey === s.pubkey)?.label ?? s.nickname} — {s.score} coups
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
