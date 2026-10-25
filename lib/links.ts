import { nip19 } from 'nostr-tools';

export const keyLink = (nsec: string) => `${location.origin}/community#cle=${nsec}`;

// Friend code `pseudo:npub…` -> { label, pubkey } | null
export function parseFriendCode(code: string): { label: string; pubkey: string } | null {
  try {
    const i = code.lastIndexOf(':');
    const d = nip19.decode(code.slice(i + 1).trim());
    if (d.type !== 'npub') return null;
    return { label: (i > 0 ? code.slice(0, i) : '').slice(0, 20) || 'friend', pubkey: d.data };
  } catch { return null; }
}
