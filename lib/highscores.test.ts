import { expect, it } from 'vitest';
import { modeOfUrl, parseGrid } from '@/lib/highscores';

it('tells the mode from the grid url', () => {
  expect(modeOfUrl('?s=20261025&cs=6x8')).toBe('daily');
  expect(modeOfUrl('?s=20261025&cs=6x8&t=true')).toBe('time');
  expect(modeOfUrl('?s=abcdef&cs=6x8')).toBe('random');
  expect(modeOfUrl('?c=1234&cs=2x2')).toBe('custom');
});

it('parses links, query strings and bare seeds into one canonical url', () => {
  expect(parseGrid('https://switch.essenlive.xyz/g?s=abc&cs=6x8')).toBe('?s=abc&cs=6x8');
  expect(parseGrid('abc')).toBe('?s=abc&cs=6x8');
  expect(parseGrid('?s=abc&cs=6x8&t=true')).toBe('?s=abc&cs=6x8&t=true');
  expect(parseGrid('?s=abc&cs=nope')).toBeNull();
  expect(parseGrid('  ')).toBeNull();
});
