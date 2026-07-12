import { describe, it, expect } from 'vitest';
import { filterPapers, sortPapers, type PaperFilter } from '@/lib/catalog';
import type { Paper } from '@/types';

function mk(id: string, school: string, year: number, setId = 'set1', hasSolutions = true): Paper {
  return {
    id,
    setId,
    school,
    year,
    type: 'Trials',
    label: `${school} ${year} Trials`,
    hasSolutions,
    storagePath: `papers/${setId}/${id}.pdf`,
    fileName: `${school} ${year} 2U Trials${hasSolutions ? ' & Solutions' : ''}.pdf`,
  };
}

const PAPERS: Paper[] = [
  mk('s1', 'Knox', 2021),
  mk('s2', 'Manly', 2015),
  mk('s3', 'Abbotsleigh', 2020, 'set2'),
];

const base: PaperFilter = { search: '', status: 'all', showOther: false };

describe('filterPapers', () => {
  it('hides pre-minYear papers unless showOther', () => {
    expect(filterPapers(PAPERS, base, new Set(), 2018).map((p) => p.id)).toEqual(['s1', 's3']);
    expect(
      filterPapers(PAPERS, { ...base, showOther: true }, new Set(), 2018).map((p) => p.id),
    ).toEqual(['s1', 's2', 's3']);
  });

  it('hides recent papers without solutions unless showOther', () => {
    const papers = [mk('a', 'Knox', 2021), mk('b', 'Manly', 2022, 'set1', false)];
    expect(filterPapers(papers, base, new Set(), 2018).map((p) => p.id)).toEqual(['a']);
    expect(
      filterPapers(papers, { ...base, showOther: true }, new Set(), 2018).map((p) => p.id),
    ).toEqual(['a', 'b']);
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
      filterPapers(PAPERS, { ...base, setId: 'set1', showOther: true }, new Set(), 2018).map((p) => p.id),
    ).toEqual(['s1', 's2']);
  });
});

describe('sortPapers', () => {
  it('sorts by name: school A→Z then year ascending', () => {
    expect(sortPapers(PAPERS, 'name').map((p) => p.id)).toEqual(['s3', 's1', 's2']);
  });

  it('sorts by year descending, breaking ties on school', () => {
    expect(sortPapers(PAPERS, 'year').map((p) => p.id)).toEqual(['s1', 's3', 's2']);
  });

  it('does not mutate the input array', () => {
    const before = PAPERS.map((p) => p.id);
    sortPapers(PAPERS, 'year');
    expect(PAPERS.map((p) => p.id)).toEqual(before);
  });
});
