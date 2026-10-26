import { STORAGE_KEYS } from '@/lib/profile';

export interface Following { pubkey: string; label: string }
export interface CommunitySettings { nickname: string | null; following: Following[] }

const KEY = STORAGE_KEYS.community;
// Keeps the transfer link (key + friends) inside one QR code, which holds about 2.9 KB
export const MAX_FRIENDS = 30;
export const NICKNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export function loadSettings(): CommunitySettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return { nickname: s?.nickname ?? null, following: Array.isArray(s?.following) ? s.following : [] };
  } catch { return { nickname: null, following: [] }; }
}
export function saveSettings(s: CommunitySettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
