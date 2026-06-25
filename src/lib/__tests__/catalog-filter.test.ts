import { describe, it, expect } from 'vitest';
import { filterPapers, type PaperFilter } from '@/lib/catalog';
import type { Paper } from '@/types';

function mk(id: string, school: string, year: number, setId = 'set1'): Paper {
  return {
    id,
    setId,
    school,
    year,
    type: 'Trials',
    label: `${school} ${year} Trials`,
    storagePath: `papers/${setId}/${id}.pdf`,
    fileName: `${school} ${year} 2U Trials & Solutions.pdf`,
  };
}

const PAPERS: Paper[] = [
  mk('s1', 'Knox', 2021),
  mk('s2', 'Manly', 2015),
  mk('s3', 'Abbotsleigh', 2020, 'set2'),
];

const base: PaperFilter = { search: '', status: 'all', showOlder: false };

describe('filterPapers', () => {
  it('hides pre-minYear papers unless showOlder', () => {
    expect(filterPapers(PAPERS, base, new Set(), 2018).map((p) => p.id)).toEqual(['s1', 's3']);
    expect(
      filterPapers(PAPERS, { ...base, showOlder: true }, new Set(), 2018).map((p) => p.id),
    ).toEqual(['s1', 's2', 's3']);
  });

  it('searches the label case-insensitively', () => {
    expect(filterPapers(PAPERS, { ...base, search: 'knox' }, new Set(), 2018).map((p) => p.id)).toEqual(['s1']);
    expect(filterPapers(PAPERS, { ...base, search: '2020' }, new Set(), 2018).map((p) => p.id)).toEqual(['s3']);
  });

  it('filters by completion status', () => {
    const completed = new Set(['s1']);
    expect(filterPapers(PAPERS, { ...base, status: 'completed' }, completed, 2018).map((p) => p.id)).toEqual(['s1']);
    expect(
      filterPapers(PAPERS, { ...base, status: 'uncompleted' }, completed, 2018).map((p) => p.id),
    ).toEqual(['s3']);
  });

  it('restricts to a set when setId given', () => {
    expect(
      filterPapers(PAPERS, { ...base, setId: 'set1', showOlder: true }, new Set(), 2018).map((p) => p.id),
    ).toEqual(['s1', 's2']);
  });
});
