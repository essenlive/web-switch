import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import { nip19 } from 'nostr-tools';
import { APP, SCORE_KIND, dTag, scoreFromEvent, type CommunityScore, type ScorePayload } from '@/lib/scoreEvent';

export const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
const KEY = `${APP}-key`;
let pool: SimplePool | null = null;
const getPool = () => (pool ??= new SimplePool());

function getSecretKey(): Uint8Array | null { // crée la clé au premier usage
  if (typeof window === 'undefined') return null;
  try {
    let hex = localStorage.getItem(KEY);
    if (!hex) { hex = bytesToHex(generateSecretKey()); localStorage.setItem(KEY, hex); }
    return hexToBytes(hex);
  } catch { return null; }
}
export const getMyPubkey = () => { const sk = getSecretKey(); return sk ? getPublicKey(sk) : null; };
export const exportKey = () => { const sk = getSecretKey(); return sk ? nip19.nsecEncode(sk) : null; };
export function importKey(nsec: string): boolean {
  try {
    const d = nip19.decode(nsec.trim());
    if (d.type !== 'nsec') return false;
    localStorage.setItem(KEY, bytesToHex(d.data));
    return true;
  } catch { return false; }
}

export function publishScore(url: string, payload: Omit<ScorePayload, 'v'>): void {
  const sk = getSecretKey();
  if (!sk) return;
  const event = finalizeEvent(
    { kind: SCORE_KIND, created_at: Math.floor(Date.now() / 1000),
      tags: [['d', dTag(url)], ['t', APP]], content: JSON.stringify({ v: 1, ...payload }) }, sk);
  getPool().publish(RELAYS, event).forEach(p => p.catch(() => {})); // best effort, un relais suffit
}

export function subscribeScores(url: string, authors: string[] | null, onScore: (s: CommunityScore) => void) {
  const sub = getPool().subscribeMany(RELAYS,
    { kinds: [SCORE_KIND], '#d': [dTag(url)], ...(authors ? { authors } : { limit: 200 }) },
    { onevent(event: Event) {
        const s = scoreFromEvent(event, url);
        if (s && (!authors || authors.includes(s.pubkey))) onScore(s); // un relais peut renvoyer autre chose
    } });
  return () => sub.close();
}
