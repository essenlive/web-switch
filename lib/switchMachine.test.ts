import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import switchMachine, { type Direction } from '@/lib/switchMachine';
import { matrixFromParams, generateRandomMatrix, checkValues, addPadding, removePadding, getMatrixString } from '@/lib/matrixHelpers';

const start = (c: string, cs: string) => {
  const { input } = matrixFromParams({ s: '', cs, c, t: '' });
  const a = createActor(switchMachine, { input }).start();
  const play = (...d: Direction[]) => d.forEach(direction => a.send({ type: 'input_move', params: { direction } }));
  return { a, play, ctx: () => a.getSnapshot().context, input };
};

describe('switchMachine (normal mode)', () => {
  it('ignores a move off the grid', () => {
    const g = start('1221', '2x2');
    g.play('left', 'down');
    expect(g.ctx().score).toBe(0);
    expect(g.ctx().cursor).toMatchObject({ x: 0, y: 0 });
  });

  it('moves along the border without touching the grid', () => {
    const g = start('1221', '2x2');
    g.play('right');
    expect(g.ctx().cursor.x).toBe(1);
    expect(g.ctx().canva).toEqual(g.ctx().initialCanva);
  });

  it('pushing into a line changes the grid and counts a move', () => {
    const g = start('1221', '2x2');
    g.play('right', 'up');
    expect(g.ctx().score).toBeGreaterThan(0);
    expect(g.ctx().canva).not.toEqual(g.ctx().initialCanva);
  });

  it('restart brings back the initial grid and clears the moves', () => {
    const g = start('1221', '2x2');
    g.play('right', 'up');
    g.a.send({ type: 'restart_game', params: { input: null } });
    expect(g.ctx().canva).toEqual(g.ctx().initialCanva);
    expect(g.ctx().inputList).toEqual([]);
    expect(g.ctx().score).toBe(0);
  });
});

describe('matrixHelpers', () => {
  it('pads and unpads a grid', () => {
    const grid = [[1, 2], [3, 4]];
    expect(addPadding(grid, 0)).toEqual([[0, 0, 0, 0], [0, 1, 2, 0], [0, 3, 4, 0], [0, 0, 0, 0]]);
    expect(removePadding(addPadding(grid, 0))).toEqual(grid);
  });

  it('finds full rows and columns', () => {
    expect(checkValues([[1, 1], [2, 3]])).toEqual({ rows: [0], columns: [] });
    expect(checkValues([[1, 2], [1, 3]])).toEqual({ rows: [], columns: [0] });
    expect(() => checkValues([])).toThrow();
  });

  it('builds the same grid from the same seed, with no full line to start with', () => {
    const a = generateRandomMatrix('seed', 6, 8);
    expect(a).toEqual(generateRandomMatrix('seed', 6, 8));
    expect(checkValues(a)).toEqual({ rows: [], columns: [] });
  });

  it('validates the url params', () => {
    const ok = (p: object) => matrixFromParams({ s: '', cs: '', c: '', t: '', ...p });
    expect(ok({ s: 'x', cs: '6x8' })).toMatchObject({ validParams: true, input: { url: '?s=x&cs=6x8' } });
    expect(ok({ s: 'x', cs: '6x8', t: 'true' }).input.url).toBe('?s=x&cs=6x8&t=true');
    expect(ok({ c: '1221', cs: '2x2' }).input.url).toBe('?c=1221&cs=2x2');
    expect(ok({ s: 'x' }).validParams).toBe(false); // size missing
    expect(ok({ cs: '6x8' }).validParams).toBe(false); // seed and canva missing
    expect(ok({ c: '1225', cs: '2x2' }).validParams).toBe(false); // bad tile
    expect(ok({ c: '122', cs: '2x2' }).validParams).toBe(false); // wrong length
    expect(ok({ c: '1221', cs: '2x2', t: 'true' }).validParams).toBe(false); // timer needs a seed
  });

  it('prints the grid bottom row last', () => {
    expect(getMatrixString([[1, 2], [3, 4]])).toBe('🟩 🟨\n🟥 🟦');
  });
});
