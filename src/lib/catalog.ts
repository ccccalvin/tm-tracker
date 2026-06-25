/**
 * Catalog access. The catalog is generated from PDF filenames into
 * src/data/catalog.json (see scripts/generate-catalog.mjs) and bundled at build
 * time. The PDFs themselves live in Firebase Storage.
 */
import catalogJson from '@/data/catalog.json';
import type { Paper, PaperSet } from '@/types';

export const PAPERS: Paper[] = catalogJson.papers as Paper[];
export const PAPER_SETS: PaperSet[] = catalogJson.sets as PaperSet[];

const byId = new Map<string, Paper>(PAPERS.map((p) => [p.id, p]));

export function getPaper(id: string): Paper | undefined {
  return byId.get(id);
}

export type PaperStatus = 'all' | 'completed' | 'uncompleted';

export interface PaperFilter {
  /** Free-text search over the label (school / year / type). */
  search: string;
  status: PaperStatus;
  /** When false, only papers with year >= minYear are shown. */
  showOlder: boolean;
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
    if (!filter.showOlder && p.year < minYear) return false;
    if (filter.status === 'completed' && !completedIds.has(p.id)) return false;
    if (filter.status === 'uncompleted' && completedIds.has(p.id)) return false;
    if (q && !p.label.toLowerCase().includes(q)) return false;
    return true;
  });
}
