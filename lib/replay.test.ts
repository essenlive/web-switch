import { describe, expect, it } from 'vitest';
import { buildFrames, encodeMoves, parseMoves, parseReplayInput, replayLink } from '@/lib/replay';

describe('parseMoves', () => {
  it('reads move letters', () => {
    expect(parseMoves('urdl')).toEqual(['up', 'right', 'down', 'left']);
    expect(parseMoves('⬆️')).toBeNull();
    expect(parseMoves('')).toEqual([]);
    expect(parseMoves('ux')).toBeNull();
  });
});

describe('parseReplayInput', () => {
  it('accepts a full game link with moves', () => {
    const { request } = parseReplayInput('https://switch.essenlive.xyz/g?s=abc&cs=6x8&i=ul');
    expect(request).toEqual({ query: '?s=abc&cs=6x8', moves: ['up', 'left'], times: undefined });
  });
  it('rejects bad links', () => {
    expect(parseReplayInput('nope').error).not.toBeNull();
    expect(parseReplayInput('?cs=6x8').error).toMatch(/not valid/);
  });
  it('round-trips through replayLink', () => {
    const r = parseReplayInput('?s=abc&cs=6x8&i=ulr').request!;
    expect(parseReplayInput(replayLink(r)).request).toEqual(r);
    expect(encodeMoves(r.moves)).toBe('ulr');
  });
});

describe('buildFrames', () => {
  it('has one frame per move plus the start, and flags an impossible move', () => {
    const { frames, error } = buildFrames({ query: '?s=abc&cs=6x8', moves: ['down'] });
    expect(error).not.toBeNull(); // the cursor starts on the bottom-left corner
    expect(frames).toHaveLength(1);
    const ok = buildFrames({ query: '?s=abc&cs=6x8', moves: ['right', 'up'] });
    expect(ok.error).toBeNull();
    expect(ok.frames).toHaveLength(3);
    expect(ok.frames[0].area).toBe(48);
  });
});
