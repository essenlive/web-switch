import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import { nip19 } from 'nostr-tools';
import { APP, SCORE_KIND, TOMBSTONE, dTag, removalFromEvent, scoreFromEvent, type CommunityScore, type ScorePayload } from '@/lib/scoreEvent';
import { STORAGE_KEYS } from '@/lib/profile';

export const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
const KEY = STORAGE_KEYS.key;
let pool: SimplePool | null = null;
const getPool = () => (pool ??= new SimplePool());

function getSecretKey(): Uint8Array | null { // creates the key on first use
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
  getPool().publish(RELAYS, event).forEach(p => p.catch(() => {})); // best effort, one relay is enough
}

// Removes a score: overwrites it with a tombstone (what relays reliably honour), then asks for a NIP-09 deletion too.
export function unpublishScore(url: string): void {
  const sk = getSecretKey();
  if (!sk) return;
  const now = Math.floor(Date.now() / 1000);
  const d = dTag(url);
  const events = [
    finalizeEvent({ kind: SCORE_KIND, created_at: now, tags: [['d', d], ['t', APP]], content: JSON.stringify(TOMBSTONE) }, sk),
    finalizeEvent({ kind: 5, created_at: now, tags: [['a', `${SCORE_KIND}:${getPublicKey(sk)}:${d}`], ['k', String(SCORE_KIND)]], content: '' }, sk),
  ];
  events.forEach(e => getPool().publish(RELAYS, e).forEach(p => p.catch(() => {})));
}

// Grid urls of every score this identity still has on the relays, also the ones this device never played
export async function listMyScoreUrls(): Promise<string[]> {
  const pk = getMyPubkey();
  if (!pk) return [];
  try {
    const events = await getPool().querySync(RELAYS, { kinds: [SCORE_KIND], authors: [pk], '#t': [APP], limit: 500 }, { maxWait: 3000 });
    const live = new Map<string, Event>(); // newest event per grid
    for (const e of events) {
      const d = e.tags.find(t => t[0] === 'd' && t[1]?.startsWith(`${APP}:`))?.[1];
      if (d && (!live.has(d) || live.get(d)!.created_at < e.created_at)) live.set(d, e);
    }
    return [...live].filter(([d, e]) => removalFromEvent(e, d.slice(APP.length + 1)) === null).map(([d]) => d.slice(APP.length + 1));
  } catch { return []; }
}

// A new identity, the old key is not kept anywhere
export function resetKey(): string | null {
  try { localStorage.removeItem(KEY); } catch { return null; }
  return getMyPubkey();
}

// One subscription for several grids (a month of daily grids): the 200 limit is per grid, the relays may cap it lower.
export function subscribeScores(urls: string[], authors: string[] | null, onScore: (s: CommunityScore) => void, onRemoved?: (url: string, pubkey: string, at: number) => void) {
  const sub = getPool().subscribeMany(RELAYS,
    { kinds: [SCORE_KIND], '#d': urls.map(dTag), ...(authors ? { authors } : { limit: 200 * urls.length }) },
    { onevent(event: Event) {
        if (authors && !authors.includes(event.pubkey)) return; // a relay may return something else
        const d = event.tags.find(t => t[0] === 'd')?.[1];
        const url = urls.find(u => dTag(u) === d);
        if (!url) return;
        const s = scoreFromEvent(event, url);
        if (s) return onScore(s);
        const at = removalFromEvent(event, url);
        if (at !== null) onRemoved?.(url, event.pubkey, at);
    } });
  return () => sub.close();
}
