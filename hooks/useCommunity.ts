'use client'

import { useCallback, useEffect, useState } from 'react';
import { nip19 } from 'nostr-tools';
import { getMyPubkey, listMyScoreUrls, publishScore, resetKey, unpublishScore } from '@/lib/nostr';
import { loadHighscores, removeHighscore as removeLocalHighscore, wipeProfile, type Highscore } from '@/lib/profile';
import { loadSettings, saveSettings, NICKNAME_RE, MAX_FRIENDS, type CommunitySettings } from '@/lib/communityStorage';
import { parseFriendCode } from '@/lib/links';

export function useCommunity() {
  const [settings, setSettings] = useState<CommunitySettings>({ nickname: null, following: [] });
  const [myPubkey, setMyPubkey] = useState<string | null>(null);
  const [highscores, setHighscores] = useState<Highscore[]>([]);

  // In an effect, never during render (SSR hydration)
  useEffect(() => { setSettings(loadSettings()); setMyPubkey(getMyPubkey()); setHighscores(loadHighscores()); }, []);

  const update = (s: CommunitySettings) => { setSettings(s); saveSettings(s); };

  const friendCode = settings.nickname && myPubkey ? `${settings.nickname}:${nip19.npubEncode(myPubkey)}` : null;

  const addFollowing = useCallback((code: string): string | null => {
    const f = parseFriendCode(code);
    if (!f) return 'That friend code is not valid';
    if (f.pubkey === myPubkey) return "That's you!";
    const cur = loadSettings();
    if (cur.following.some(x => x.pubkey === f.pubkey)) return 'Already in your friends';
    if (cur.following.length >= MAX_FRIENDS) return `You can follow up to ${MAX_FRIENDS} friends`;
    update({ ...cur, following: [...cur.following, f] });
    return null;
  }, [myPubkey]);

  const removeFollowing = (pubkey: string) =>
    update({ ...settings, following: settings.following.filter(f => f.pubkey !== pubkey) });

  // Events are replaceable: every local best is re-published with the new nickname
  const saveNickname = (nickname: string): string | null => {
    if (!NICKNAME_RE.test(nickname)) return 'Nickname must be 3 to 20 characters: letters, numbers, _ or -';
    update({ ...settings, nickname });
    loadHighscores().forEach(({ url, inputs, times, end }) => {
      if (inputs?.length) publishScore(url, { nickname, inputs, ...(times ? { times, end } : {}) });
    });
    return null;
  };

  // A personal best lives in two places, this device and the community: removing it clears both
  const removeHighscore = (url: string) => {
    removeLocalHighscore(url);
    unpublishScore(url);
    setHighscores(loadHighscores());
  };

  // Wipes the nickname, friends and highscores here, and every score this identity published. Ends with a new key.
  const deleteProfile = async () => {
    const urls = new Set([...highscores.map(h => h.url), ...(await listMyScoreUrls())]);
    urls.forEach(unpublishScore);
    wipeProfile();
    setMyPubkey(resetKey());
    setSettings({ nickname: null, following: [] });
    setHighscores([]);
  };

  return { nickname: settings.nickname, following: settings.following, myPubkey, friendCode, highscores, addFollowing, removeFollowing, saveNickname, removeHighscore, deleteProfile };
}
