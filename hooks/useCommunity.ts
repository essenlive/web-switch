'use client'

import { useCallback, useEffect, useState } from 'react';
import { nip19 } from 'nostr-tools';
import { getMyPubkey, publishScore } from '@/lib/nostr';
import { loadSettings, saveSettings, NICKNAME_RE, type CommunitySettings } from '@/lib/communityStorage';
import { parseFriendCode } from '@/lib/links';
import type { Direction } from '@/lib/switchMachine';

export function useCommunity() {
  const [settings, setSettings] = useState<CommunitySettings>({ nickname: null, following: [] });
  const [myPubkey, setMyPubkey] = useState<string | null>(null);

  // Dans un effet : jamais au rendu (hydratation SSR)
  useEffect(() => { setSettings(loadSettings()); setMyPubkey(getMyPubkey()); }, []);

  const update = (s: CommunitySettings) => { setSettings(s); saveSettings(s); };

  const friendCode = settings.nickname && myPubkey ? `${settings.nickname}:${nip19.npubEncode(myPubkey)}` : null;

  const addFollowing = useCallback((code: string): string | null => {
    const f = parseFriendCode(code);
    if (!f) return 'That friend code is not valid';
    if (f.pubkey === myPubkey) return "That's you!";
    const cur = loadSettings();
    if (cur.following.some(x => x.pubkey === f.pubkey)) return 'Already in your friends';
    update({ ...cur, following: [...cur.following, f] });
    return null;
  }, [myPubkey]);

  const removeFollowing = (pubkey: string) =>
    update({ ...settings, following: settings.following.filter(f => f.pubkey !== pubkey) });

  // Les événements sont remplaçables : on republie tous les meilleurs scores locaux avec le nouveau pseudo
  const saveNickname = (nickname: string): string | null => {
    if (!NICKNAME_RE.test(nickname)) return 'Nickname must be 3 to 20 characters: letters, numbers, _ or -';
    update({ ...settings, nickname });
    try {
      // Timed games are stored with their timestamps, the other ones are a plain list of moves
      type Stored = Direction[] | { inputs: Direction[]; times: number[]; end?: number } | null;
      const all: Record<string, Stored> = JSON.parse(localStorage.getItem('localHighscoresInputs') || '{}');
      Object.entries(all).forEach(([url, v]) => {
        const p = Array.isArray(v) ? { inputs: v } : v;
        if (url && p?.inputs?.length) publishScore(url, { nickname, ...p });
      });
    } catch {}
    return null;
  };

  return { nickname: settings.nickname, following: settings.following, myPubkey, friendCode, addFollowing, removeFollowing, saveNickname };
}
