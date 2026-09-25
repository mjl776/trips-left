import { stableHash } from './stable-hash';

describe('stableHash', () => {
  it('is independent of object key order at every level', () => {
    expect(stableHash({ a: 1, b: { c: 2, d: 3 } })).toBe(
      stableHash({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it('differs when a value differs', () => {
    expect(stableHash({ rec: 1 })).not.toBe(stableHash({ rec: 0.5 }));
  });

  it('preserves array order', () => {
    expect(stableHash([1, 2])).not.toBe(stableHash([2, 1]));
  });
});
