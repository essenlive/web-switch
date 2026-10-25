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
    // pas de signal de fin fiable des relais : 1,5 s max
    const timer = setTimeout(() => setIsLoading(false), 1500);
    const close = subscribeScores(url, authors, s => {
      const prev = byKey.get(s.pubkey);
      if (!prev || prev.timestamp < s.timestamp) byKey.set(s.pubkey, s);
      setScores([...byKey.values()].sort((a, b) => a.score - b.score));
      setIsLoading(false);
    });
    return () => { clearTimeout(timer); close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  return { scores, isLoading };
}
