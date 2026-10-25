'use client'

import { useEffect, useState } from 'react';
import { subscribeScores } from '@/lib/nostr';
import type { CommunityScore } from '@/lib/scoreEvent';

// urls = the grids to load ; authors = null -> mondial ; [] -> pas d'abonnement
// Returns every grid's scores sorted best first, each one carries its url.
export function useCommunityScores(urls: string[], authors: string[] | null) {
  const [scores, setScores] = useState<CommunityScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = `${urls.join(',')}|${authors ? authors.join(',') : '*'}`;

  useEffect(() => {
    setScores([]);
    if (urls.length === 0 || (authors && authors.length === 0)) { setIsLoading(false); return; }
    setIsLoading(true);
    const byKey = new Map<string, CommunityScore>(); // un score par (grille, pubkey), le plus récent
    const removed = new Map<string, number>();       // (grille, pubkey) -> when they removed their score: older copies still served by a relay are dropped
    const publish = () => setScores([...byKey.values()].filter(s => s.timestamp > (removed.get(`${s.url}|${s.pubkey}`) ?? 0)).sort((a, b) => a.rank - b.rank));
    // pas de signal de fin fiable des relais : 1,5 s max
    const timer = setTimeout(() => setIsLoading(false), 1500);
    const close = subscribeScores(urls, authors, s => {
      const k = `${s.url}|${s.pubkey}`;
      const prev = byKey.get(k);
      if (!prev || prev.timestamp < s.timestamp) byKey.set(k, s);
      publish();
      setIsLoading(false);
    }, (url, pubkey, at) => { const k = `${url}|${pubkey}`; removed.set(k, Math.max(at, removed.get(k) ?? 0)); publish(); });
    return () => { clearTimeout(timer); close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { scores, isLoading };
}
