#!/usr/bin/env node
/**
 * upload-pdfs.mjs — mirror the local PDF folders into Firebase Storage at the
 * paths the app expects (paper.storagePath from src/data/catalog.json).
 *
 * Runs with privileged Admin SDK credentials (bypasses Storage rules). Each
 * paper's local file is expected at  <repo>/<setId>/<fileName>  — i.e. the
 * source folder is named after the set id (e.g. "yr12-advn-trials/").
 *
 * Setup:
 *   1. Firebase console → Project settings → Service accounts → Generate new
 *      private key → save as ./serviceAccountKey.json (gitignored).
 *   2. Set the bucket, then run:
 *        FIREBASE_STORAGE_BUCKET=<your-bucket>.appspot.com npm run upload-pdfs
 *      (find the bucket in console → Storage; usually <project-id>.appspot.com)
 *
 * Flags:
 *   --force   re-upload even if the object already exists
 *   --dry     list what would upload, change nothing
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 8;

function loadAdmin() {
  try {
    return require('firebase-admin');
  } catch {
    console.error('✗ firebase-admin not installed. Run: npm install');
    process.exit(1);
  }
}

function loadCredential(admin) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : join(ROOT, 'serviceAccountKey.json');
  if (!existsSync(keyPath)) {
    console.error(`✗ service account key not found at ${keyPath}`);
    console.error('  Firebase console → Project settings → Service accounts → Generate new private key');
    process.exit(1);
  }
  return admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8')));
}

async function main() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    console.error('✗ set FIREBASE_STORAGE_BUCKET (e.g. my-project.appspot.com)');
    process.exit(1);
  }

  const admin = loadAdmin();
  admin.initializeApp({ credential: loadCredential(admin), storageBucket: bucketName });
  const bucket = admin.storage().bucket();

  const catalog = JSON.parse(readFileSync(join(ROOT, 'src/data/catalog.json'), 'utf8'));
  const papers = catalog.papers;

  let uploaded = 0;
  let skipped = 0;
  let missing = 0;

  async function handle(paper) {
    const localPath = join(ROOT, paper.setId, paper.fileName);
    if (!existsSync(localPath)) {
      missing += 1;
      console.warn(`  ⚠ missing local file: ${paper.fileName}`);
      return;
    }
    const dest = bucket.file(paper.storagePath);
    if (!FORCE) {
      const [exists] = await dest.exists();
      if (exists) {
        skipped += 1;
        return;
      }
    }
    if (DRY) {
      console.log(`  would upload ${paper.fileName} → ${paper.storagePath}`);
      uploaded += 1;
      return;
    }
    await bucket.upload(localPath, {
      destination: paper.storagePath,
      metadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=86400' },
    });
    uploaded += 1;
    if (uploaded % 25 === 0) console.log(`  …${uploaded} uploaded`);
  }

  // Simple concurrency pool.
  const queue = [...papers];
  async function worker() {
    while (queue.length) {
      const paper = queue.shift();
      await handle(paper);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(
    `\n${DRY ? '[dry run] ' : ''}done — ${uploaded} uploaded, ${skipped} already present, ${missing} missing`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
