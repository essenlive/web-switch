'use client'

import { Globe, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCommunity } from '@/hooks/useCommunity';
import { useCommunityScores } from '@/hooks/useCommunityScores';
import { readBest } from '@/lib/profile';
import { formatRank, type CommunityScore } from '@/lib/scoreEvent';

const short = (rank: number) => rank < 1000 ? rank : `${Math.floor(rank / 1000)} tiles`;

// Best published score of the world and of my community (friends) for a grid, with the owner's name.
// mine = my own best, shown first as "you"; left out it is read from the profile (pages without a score bar).
export function Records({ url, mine: mineProp, className = '' }: { url: string; mine?: string | number | null; className?: string }) {
  const { following } = useCommunity();
  const world = useCommunityScores([url], null).scores[0];
  const friends = useCommunityScores([url], following.map(f => f.pubkey)).scores[0];
  const [own, setOwn] = useState<number | null>(null);
  useEffect(() => { if (mineProp === undefined) setOwn(readBest(url)); }, [url, mineProp]);
  const mine = mineProp === undefined ? (own === null ? null : short(own)) : mineProp;
  const col = (label: string, Icon: typeof User, value: string | number, name?: string, title?: string) => (
    <span key={label} title={title} className="flex flex-col items-start gap-1 leading-none min-w-0">
      <span className="flex items-center gap-1.5 text-xl font-bold"><Icon size={16} aria-label={label} className="text-muted-foreground shrink-0" />{value}</span>
      <span className="text-xs text-muted-foreground truncate max-w-16">{name}</span>
    </span>
  );
  const rec = (label: string, Icon: typeof User, s?: CommunityScore) =>
    s && col(label, Icon, short(s.rank), following.find(f => f.pubkey === s.pubkey)?.label ?? s.nickname, formatRank(s.rank));
  // "you" always shows on the score bar (mineProp given), on the other pages only once there is a best
  const cols = [(mine !== null || mineProp !== undefined) && col('my best', User, mine ?? '-', 'you'), rec('community', Users, friends), rec('world', Globe, world)].filter(Boolean);
  if (!cols.length) return null;
  return <div className={`flex gap-4 ${className}`}>{cols}</div>;
}
