import { nip19 } from 'nostr-tools';
import { MAX_FRIENDS } from '@/lib/communityStorage';

// Transfer link: the key plus the friends as `label:npub` codes, so a QR code carries the whole profile
export const keyLink = (nsec: string, following: { pubkey: string; label: string }[] = []) =>
  `${location.origin}/community#cle=${nsec}` +
  (following.length ? `&amis=${following.map(f => encodeURIComponent(`${f.label}:${nip19.npubEncode(f.pubkey)}`)).join(',')}` : '');

// Fragment of a transfer link -> { nsec, friends } | null
export function parseKeyLink(hash: string) {
  const m = hash.match(/^#cle=(nsec1\w+)(?:&amis=(.*))?/);
  if (!m) return null;
  const friends = (m[2] ?? '').split(',').filter(Boolean).slice(0, MAX_FRIENDS).flatMap(c => parseFriendCode(decodeURIComponent(c)) ?? []);
  return { nsec: m[1], friends };
}

// Friend code `nickname:npub…` -> { label, pubkey } | null
export function parseFriendCode(code: string): { label: string; pubkey: string } | null {
  try {
    const i = code.lastIndexOf(':');
    const d = nip19.decode(code.slice(i + 1).trim());
    if (d.type !== 'npub') return null;
    return { label: (i > 0 ? code.slice(0, i) : '').slice(0, 20) || 'friend', pubkey: d.data };
  } catch { return null; }
}
