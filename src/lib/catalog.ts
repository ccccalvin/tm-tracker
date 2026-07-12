/**
 * Catalog access. The catalog is generated from PDF filenames into
 * src/data/catalog.json (see scripts/generate-catalog.mjs) and bundled at build
 * time. The PDFs themselves live in Firebase Storage.
 */
import catalogJson from '@/data/catalog.json';
import type { MathLevel, Paper, PaperSet } from '@/types';

export const PAPERS: Paper[] = catalogJson.papers as Paper[];
export const PAPER_SETS: PaperSet[] = catalogJson.sets as PaperSet[];

const byId = new Map<string, Paper>(PAPERS.map((p) => [p.id, p]));

export function getPaper(id: string): Paper | undefined {
  return byId.get(id);
}

/** The math level a paper set corresponds to (2U → ADVN, 3U → EXT1). Drives the
 * level tag shown on rows in the combined "all sets" view, where a paper's
 * level is otherwise ambiguous. Keys are set ids from the catalog. */
const SET_LEVELS: Record<string, MathLevel> = {
  'yr12-advn-trials': 'ADVN',
  'yr12-ext1-trials': 'EXT1',
};

export function setLevel(setId: string): MathLevel | null {
  return SET_LEVELS[setId] ?? null;
}

export type PaperStatus = 'all' | 'completed' | 'uncompleted';

export type PaperSort = 'name' | 'year';

/**
 * Order a (filtered) paper list. Pure and stable-ish:
 *   'name' — school A→Z, then year ascending
 *   'year' — year descending (newest first), then school A→Z
 */
export function sortPapers(papers: Paper[], sort: PaperSort): Paper[] {
  const out = [...papers];
  if (sort === 'year') {
    out.sort((a, b) => b.year - a.year || a.school.localeCompare(b.school));
  } else {
    out.sort((a, b) => a.school.localeCompare(b.school) || a.year - b.year);
  }
  return out;
}

export interface PaperFilter {
  /** Free-text search over the label (school / year / type). */
  search: string;
  status: PaperStatus;
  /** When false, the default view: only recent (year >= minYear) papers that
   * are solution-backed. When true, "other" papers are also shown — older ones
   * and those without solutions. */
  showOther: boolean;
  /** Restrict to one set; undefined = all sets. */
  setId?: string;
}

/**
 * Filter the catalog. Pure — `completedIds` carries the runtime completion
 * state so this stays unit-testable.
 */
export function filterPapers(
  papers: Paper[],
  filter: PaperFilter,
  completedIds: Set<string>,
  minYear: number,
): Paper[] {
  const q = filter.search.trim().toLowerCase();
  return papers.filter((p) => {
    if (filter.setId && p.setId !== filter.setId) return false;
    if (!filter.showOther && (p.year < minYear || !p.hasSolutions)) return false;
    if (filter.status === 'completed' && !completedIds.has(p.id)) return false;
    if (filter.status === 'uncompleted' && completedIds.has(p.id)) return false;
    if (q && !p.label.toLowerCase().includes(q)) return false;
    return true;
  });
}
