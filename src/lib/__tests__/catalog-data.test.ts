import { describe, it, expect } from 'vitest';
import { PAPERS, PAPER_SETS, getPaper } from '@/lib/catalog';

/** Guards the generated catalog.json against drift / parser regressions. */
describe('catalog.json integrity', () => {
  it('has the expected counts', () => {
    expect(PAPERS.length).toBe(487);
    expect(PAPERS.filter((p) => p.year >= 2018).length).toBe(176);
    expect(new Set(PAPERS.map((p) => p.school)).size).toBe(52);
  });

  it('has exactly one set whose count matches', () => {
    expect(PAPER_SETS).toHaveLength(1);
    expect(PAPER_SETS[0].count).toBe(PAPERS.length);
  });

  it('every paper is well-formed and uniquely identified', () => {
    const ids = new Set<string>();
    for (const p of PAPERS) {
      expect(p.id).toMatch(/^[a-z0-9-]+__[a-z0-9-]+-\d{4}$/);
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.label).toBe(`${p.school} ${p.year} ${p.type}`);
      expect(p.storagePath).toMatch(/^papers\/.+\/.+\.pdf$/);
      // Only solutions papers are in the catalog.
      expect(p.fileName).toMatch(/& Solutions\.pdf$/);
      expect(p.year).toBeGreaterThanOrEqual(2000);
      expect(p.year).toBeLessThanOrEqual(2100);
    }
  });

  it('getPaper resolves by id', () => {
    const first = PAPERS[0];
    expect(getPaper(first.id)).toEqual(first);
    expect(getPaper('does-not-exist')).toBeUndefined();
  });
});
