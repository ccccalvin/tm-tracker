#!/usr/bin/env node
/**
 * generate-catalog.mjs — turn a folder of past-paper PDFs into the app catalog.
 *
 * The PDF *filenames* are the single source of truth for the catalog (see
 * DESIGN.md §2). Each file named like:
 *
 *     Knox 2021 2U Trials & Solutions.pdf
 *     └─school─┘ └yr┘ └────type/suffix────┘
 *
 * becomes one catalog paper. Files WITHOUT "& Solutions" are skipped — every
 * paper in the bank ships with worked solutions (DESIGN.md §2, Q26b).
 *
 * Output: src/data/catalog.json  (committed to the repo; the PDFs themselves
 * live in Firebase Storage, uploaded separately by scripts/upload-pdfs.mjs).
 *
 * Usage:
 *   node scripts/generate-catalog.mjs                 # default set
 *   node scripts/generate-catalog.mjs --check         # fail if catalog.json is stale
 *
 * To add another paper set later, append an entry to SETS below (a new folder
 * + its display Type) and re-run. Everything else (leaderboard, tracker, set
 * switcher) picks it up automatically.
 */
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Each paper SET = one folder of PDFs + display metadata.
 *   id   — stable slug, used in storage paths + paper ids. Never rename.
 *   name — shown in the set switcher (only appears when >1 set exists).
 *   type — the per-paper Type label, e.g. "Knox 2021 <Type>".
 *   dir  — folder (relative to repo root) holding the PDFs.
 */
const SETS = [
  {
    id: 'yr12-advn-trials',
    name: 'YR12 ADVN Trials',
    type: 'Trials',
    dir: 'yr12-advn-trials',
  },
  {
    id: 'yr12-ext1-trials',
    name: 'YR12 EXT1 Trials',
    type: 'Trials',
    dir: 'yr12-ext1-trials',
  },
];

// "<school...> <year> <unit> Trials [& Solutions].pdf" — unit is 2U/3U/4U.
const FILE_RE = /^(.+?)\s+((?:19|20)\d{2})\s+(?:2U|3U|4U)\s+Trials(\s*&\s*Solutions)?\.pdf$/i;

// Exam bodies whose papers enter the bank even without bundled worked solutions:
// the official HSC exams and the CSSA trials. Students self-check these against
// publicly available marking guidelines. Regular school trials still require
// "& Solutions" (DESIGN.md §2, Q26b).
const SOLUTIONS_EXEMPT = new Set(['HSC', 'CSSA']);

/** kebab-case a school name for use in ids/paths: "North Sydney Boys" -> "north-sydney-boys". */
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCatalog() {
  const sets = [];
  const papers = [];
  const warnings = [];

  for (const set of SETS) {
    const abs = join(ROOT, set.dir);
    if (!existsSync(abs)) {
      warnings.push(`set "${set.id}": folder not found at ${set.dir} — skipped`);
      continue;
    }
    const files = readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.pdf'));
    let included = 0;
    const seen = new Set();

    for (const file of files.sort()) {
      const m = file.match(FILE_RE);
      if (!m) {
        warnings.push(`set "${set.id}": unparseable filename skipped: ${file}`);
        continue;
      }
      const school = m[1].trim().replace(/\s+/g, ' ');
      const year = Number(m[2]);
      const hasSolutions = Boolean(m[3]);
      // Only papers shipping with solutions enter the bank — except the
      // exempt exam bodies (HSC / CSSA), which are shown regardless.
      if (!hasSolutions && !SOLUTIONS_EXEMPT.has(school)) continue;

      const slug = `${slugify(school)}-${year}`;
      const id = `${set.id}__${slug}`;
      if (seen.has(id)) {
        warnings.push(`set "${set.id}": duplicate paper id ${id} (from ${file}) — kept first`);
        continue;
      }
      seen.add(id);

      papers.push({
        id,
        setId: set.id,
        school,
        year,
        type: set.type,
        label: `${school} ${year} ${set.type}`,
        // Path inside the Firebase Storage bucket. upload-pdfs.mjs mirrors this.
        storagePath: `papers/${set.id}/${slug}.pdf`,
        fileName: file,
      });
      included += 1;
    }

    sets.push({ id: set.id, name: set.name, type: set.type, count: included });
  }

  // Stable ordering: school A→Z, then year ascending, grouped by set.
  papers.sort(
    (a, b) =>
      a.setId.localeCompare(b.setId) ||
      a.school.localeCompare(b.school) ||
      a.year - b.year,
  );

  return {
    generatedFrom: 'pdf-filenames',
    sets,
    papers,
    warnings,
  };
}

const catalog = buildCatalog();
const outPath = join(ROOT, 'src/data/catalog.json');
const json = JSON.stringify({ sets: catalog.sets, papers: catalog.papers }, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== json) {
    console.error('✗ catalog.json is stale — run `npm run catalog`');
    process.exit(1);
  }
  console.log('✓ catalog.json is up to date');
  process.exit(0);
}

writeFileSync(outPath, json);
const byYear = catalog.papers.filter((p) => p.year >= 2018).length;
console.log(`✓ wrote ${outPath}`);
console.log(`  sets:    ${catalog.sets.length}`);
console.log(`  papers:  ${catalog.papers.length} (with solutions)`);
console.log(`  2018+:   ${byYear}`);
console.log(`  schools: ${new Set(catalog.papers.map((p) => p.school)).size}`);
if (catalog.warnings.length) {
  console.log(`  warnings (${catalog.warnings.length}):`);
  for (const w of catalog.warnings.slice(0, 20)) console.log(`    - ${w}`);
}
