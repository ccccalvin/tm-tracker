import { describe, it, expect } from 'vitest';
import { PAPERS, PAPER_SETS, getPaper } from '@/lib/catalog';

/** Guards the generated catalog.json against drift / parser regressions. */
describe('catalog.json integrity', () => {
  it('has the expected counts', () => {
    expect(PAPERS.length).toBe(1061);
    expect(PAPERS.filter((p) => p.year >= 2018).length).toBe(274);
    expect(new Set(PAPERS.map((p) => p.school)).size).toBe(58);
  });

  it('includes the HSC and CSSA papers even without bundled solutions', () => {
    // HSC exams sit in both the ADVN (2U) and EXT1 (3U) sets.
    expect(PAPERS.filter((p) => p.school === 'HSC').length).toBe(118);
    expect(PAPERS.filter((p) => p.school === 'CSSA').length).toBe(6);
  });

  it('has the Advanced and Extension 1 sets, counts summing to the total', () => {
    expect(PAPER_SETS.map((s) => s.id)).toEqual(['yr12-advn-trials', 'yr12-ext1-trials']);
    expect(PAPER_SETS.reduce((n, s) => n + s.count, 0)).toBe(PAPERS.length);
    for (const set of PAPER_SETS) {
      expect(PAPERS.filter((p) => p.setId === set.id).length).toBe(set.count);
    }
  });

  it('every paper is well-formed and uniquely identified', () => {
    const ids = new Set<string>();
    for (const p of PAPERS) {
      expect(p.id).toMatch(/^[a-z0-9-]+__[a-z0-9-]+-\d{4}$/);
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.label).toBe(`${p.school} ${p.year} ${p.type}`);
      expect(p.storagePath).toMatch(/^papers\/.+\/.+\.pdf$/);
      // Every paper follows the "<unit> Trials [& Solutions]" naming — school
      // trials carry solutions; HSC/CSSA exams may not.
      expect(p.fileName).toMatch(/ (?:2U|3U|4U) Trials( & Solutions)?\.pdf$/);
      expect(p.year).toBeGreaterThanOrEqual(1960);
      expect(p.year).toBeLessThanOrEqual(2100);
    }
  });

  it('getPaper resolves by id', () => {
    const first = PAPERS[0];
    expect(getPaper(first.id)).toEqual(first);
    expect(getPaper('does-not-exist')).toBeUndefined();
  });
});
