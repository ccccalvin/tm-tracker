import { describe, it, expect } from 'vitest';
import { PAPER_SETS } from '@/lib/catalog';
import {
  ALLOWED_SETS_BY_LEVEL,
  DEFAULT_SET_BY_LEVEL,
  allowedSetsForLevel,
} from '@/lib/config';

const EXT2_SET = 'yr12-ext2-trials';

describe('allowedSetsForLevel', () => {
  it('scopes each level to its own bank plus every easier one (cumulative)', () => {
    expect(allowedSetsForLevel('ADVN')).toEqual(['yr12-advn-trials']);
    expect(allowedSetsForLevel('EXT1')).toEqual(['yr12-advn-trials', 'yr12-ext1-trials']);
    expect(allowedSetsForLevel('EXT2')).toEqual([
      'yr12-advn-trials',
      'yr12-ext1-trials',
      EXT2_SET,
    ]);
  });

  it('never exposes a harder bank to a lower level', () => {
    // The whole point of the allow-list: an Ext1 student must not be shown or
    // scored against the Extension 2 (4U) papers.
    expect(allowedSetsForLevel('ADVN')).not.toContain('yr12-ext1-trials');
    expect(allowedSetsForLevel('ADVN')).not.toContain(EXT2_SET);
    expect(allowedSetsForLevel('EXT1')).not.toContain(EXT2_SET);
  });

  it('lets admins / not-yet-set range across every set (null)', () => {
    expect(allowedSetsForLevel(null)).toBeNull();
    expect(allowedSetsForLevel(undefined)).toBeNull();
  });

  it("lands each level on a bank it's allowed to see", () => {
    for (const [level, sets] of Object.entries(ALLOWED_SETS_BY_LEVEL)) {
      expect(sets).toContain(DEFAULT_SET_BY_LEVEL[level as keyof typeof DEFAULT_SET_BY_LEVEL]);
    }
  });

  it('only references set ids that exist in the catalog', () => {
    const known = new Set(PAPER_SETS.map((s) => s.id));
    for (const sets of Object.values(ALLOWED_SETS_BY_LEVEL)) {
      for (const id of sets) expect(known.has(id)).toBe(true);
    }
  });
});
