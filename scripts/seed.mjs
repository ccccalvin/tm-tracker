#!/usr/bin/env node
/**
 * seed.mjs — populate the LOCAL Firebase EMULATOR with demo data so the
 * leaderboard, tracker and admin views have something to show.
 *
 * Seeds the two default classes plus a handful of demo TM students with random
 * completions. Safe: it refuses to run unless it's pointed at an emulator.
 *
 * Usage (with emulators running — `npm run emulators` in another terminal):
 *   npm run seed
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Default to the emulator host from firebase.json.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('✗ refusing to seed: FIRESTORE_EMULATOR_HOST is not set (emulator only).');
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'tm-tracker' });
const db = admin.firestore();

const CLASSES = [
  { id: 'mon-advn', name: "Calvin's Monday ADVN", badge: 'MON ADVN', order: 0 },
  { id: 'fri-advn', name: "Calvin's Friday ADVN", badge: 'FRI ADVN', order: 1 },
];

const STUDENTS = [
  'Aisha Khan', 'Ben Tran', 'Chloe Wong', 'Daniel Lee', 'Ella Nguyen',
  'Felix Chen', 'Grace Patel', 'Hugo Smith',
];

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

async function main() {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'src/data/catalog.json'), 'utf8'));
  const papers = catalog.papers;

  const batch = db.batch();
  for (const c of CLASSES) {
    batch.set(db.doc(`classes/${c.id}`), {
      name: c.name, badge: c.badge, order: c.order, archived: false,
    });
  }
  await batch.commit();
  console.log(`✓ seeded ${CLASSES.length} classes`);

  for (let i = 0; i < STUDENTS.length; i++) {
    const uid = `demo-student-${i + 1}`;
    const classId = CLASSES[i % CLASSES.length].id;
    const count = 3 + Math.floor(Math.random() * 38); // 3..40
    const chosen = pick(papers, count);

    let lastCompletedAt = 0;
    const cbatch = db.batch();
    for (const p of chosen) {
      const daysAgo = Math.random() * 14;
      const ms = Date.now() - daysAgo * 86400000;
      lastCompletedAt = Math.max(lastCompletedAt, ms);
      cbatch.set(db.doc(`users/${uid}/completions/${p.id}`), {
        paperLabel: p.label,
        completedAt: admin.firestore.Timestamp.fromMillis(ms),
        score: Math.random() < 0.7 ? 50 + Math.floor(Math.random() * 46) : null,
        notes: null,
      });
    }
    cbatch.set(db.doc(`users/${uid}`), {
      email: `${uid}@example.com`,
      displayName: STUDENTS[i],
      classId,
      role: 'student',
      isTMStudent: true,
      paperCount: chosen.length,
      lastCompletedAt: admin.firestore.Timestamp.fromMillis(lastCompletedAt),
      onboarded: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await cbatch.commit();
    console.log(`✓ ${STUDENTS[i]} — ${chosen.length} papers (${classId})`);
  }

  console.log('\n✓ seed complete. Sign in with the Auth emulator to view as admin/student.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
