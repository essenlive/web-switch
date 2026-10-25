import { matrixFromParams } from '@/lib/matrixHelpers';

export const APP = 'switch';

export type GameMode = 'daily' | 'time' | 'random' | 'custom';
export const MODES: { id: GameMode; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'time', label: 'Time challenge' },
  { id: 'random', label: 'Random' },
  { id: 'custom', label: 'Custom' },
];

// The grid url already says which mode it belongs to, so a record is per mode and per grid without storing the mode.
// Time challenge is t=true (it also uses a daily seed); daily is a YYYYMMDD seed; an explicit board (c) is custom.
export function modeOfUrl(url: string): GameMode {
  const p = new URLSearchParams(url);
  if (p.get('t') === 'true') return 'time';
  if (p.get('c')) return 'custom';
  return /^\d{8}$/.test(p.get('s') || '') ? 'daily' : 'random';
}

// Accepts a full link, a query string (?s=…&cs=…) or a bare seed; returns the canonical grid url or null.
export function parseGrid(text: string): string | null {
  const t = text.trim().split('#')[0];
  if (!t) return null;
  const q = t.includes('?') ? t.slice(t.indexOf('?')) : `?s=${encodeURIComponent(t)}&cs=6x8`;
  const p = new URLSearchParams(q);
  const r = matrixFromParams({ s: p.get('s') || '', cs: p.get('cs') || '6x8', c: p.get('c') || '', t: p.get('t') || '' });
  return r.validParams ? r.input.url : null;
}

// One sortable number, so local highscores, sorting and "is this a record" share a single rule.
// Win: its moves (< 1000, same as before the time challenge). Loss: 1000 x smallest grid area reached + moves.
export const rankOf = (won: boolean, moves: number, minArea: number) => won ? moves : 1000 * minArea + moves;
export const formatRank = (rank: number) => rank < 1000 ? `${rank} moves` : `lost, down to ${Math.floor(rank / 1000)} tiles`;
