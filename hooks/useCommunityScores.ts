'use client'

import { useEffect, useState } from 'react';
import { subscribeScores } from '@/lib/nostr';
import type { CommunityScore } from '@/lib/scoreEvent';

// authors = null -> mondial ; [] -> pas d'abonnement
export function useCommunityScores(url: string, authors: string[] | null) {
  const [scores, setScores] = useState<CommunityScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = authors ? authors.join(',') : '*';

  useEffect(() => {
    setScores([]);
    if (!url || (authors && authors.length === 0)) { setIsLoading(false); return; }
    setIsLoading(true);
    const byKey = new Map<string, CommunityScore>(); // un score par pubkey, le plus récent
    const removed = new Map<string, number>();       // pubkey -> when they removed their score: older copies still served by a relay are dropped
    const publish = () => setScores([...byKey.values()].filter(s => s.timestamp > (removed.get(s.pubkey) ?? 0)).sort((a, b) => a.rank - b.rank));
    // pas de signal de fin fiable des relais : 1,5 s max
    const timer = setTimeout(() => setIsLoading(false), 1500);
    const close = subscribeScores(url, authors, s => {
      const prev = byKey.get(s.pubkey);
      if (!prev || prev.timestamp < s.timestamp) byKey.set(s.pubkey, s);
      publish();
      setIsLoading(false);
    }, (pubkey, at) => { removed.set(pubkey, Math.max(at, removed.get(pubkey) ?? 0)); publish(); });
    return () => { clearTimeout(timer); close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  return { scores, isLoading };
}
