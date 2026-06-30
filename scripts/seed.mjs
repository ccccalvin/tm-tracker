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

// Math levels for the demo students — a mix of all three colours plus a couple
// left null, to exercise both the coloured badges and the admin "assign a level
// to an unset student" flow.
const MATH_LEVELS = ['ADVN', 'EXT1', 'EXT2', null, 'ADVN', 'EXT1', 'EXT2', null];

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

/** Delete every doc returned by a collection/query, in batches. */
async function deleteAll(ref) {
  const snap = await ref.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** Local `YYYY-MM-DD` for a Date. */
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

    // Clear this demo student's prior completions + public events so re-running
    // the seed produces a consistent dataset (events don't pile up across runs).
    await deleteAll(db.collection(`users/${uid}/completions`));
    await deleteAll(db.collection('completionEvents').where('uid', '==', uid));

    let lastCompletedAt = 0;
    const cbatch = db.batch();
    for (const p of chosen) {
      const daysAgo = Math.random() * 14;
      const ms = Date.now() - daysAgo * 86400000;
      lastCompletedAt = Math.max(lastCompletedAt, ms);
      cbatch.set(db.doc(`users/${uid}/completions/${p.id}`), {
        paperLabel: p.label,
        completedAt: admin.firestore.Timestamp.fromMillis(ms),
        completed: true,
        score: Math.random() < 0.7 ? 50 + Math.floor(Math.random() * 46) : null,
        notes: null,
      });
      // Public mirror that powers bounty standings (no score/notes).
      cbatch.set(db.doc(`completionEvents/${uid}__${p.id}`), {
        uid,
        paperId: p.id,
        completedAt: admin.firestore.Timestamp.fromMillis(ms),
        completed: true,
      });
    }
    const mathLevel = MATH_LEVELS[i % MATH_LEVELS.length];
    cbatch.set(db.doc(`users/${uid}`), {
      email: `${uid}@example.com`,
      displayName: STUDENTS[i],
      classId,
      mathLevel,
      role: 'student',
      isTMStudent: true,
      paperCount: chosen.length,
      lastCompletedAt: admin.firestore.Timestamp.fromMillis(lastCompletedAt),
      onboarded: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await cbatch.commit();
    console.log(`✓ ${STUDENTS[i]} — ${chosen.length} papers (${classId}, ${mathLevel ?? 'no level'})`);
  }

  // Sample bounties in each state, with fixed ids so re-seeding doesn't pile up
  // duplicates. The seeded completions land in the last ~14 days, so:
  //  - "active"  spans now → its standings are live,
  //  - "ended"   closed yesterday but still covers most completions → has a
  //              winner (an admin viewing Home will lock first place in),
  //  - "upcoming" hasn't started yet → shows a "starts in" countdown.
  const now = Date.now();
  const day = 86400000;
  const BOUNTIES = [
    {
      id: 'seed-active',
      title: 'Bounty: Holiday Edition',
      prize: '$100',
      message:
        'Whoever completes the most papers during the holidays wins $100. Good luck :)',
      startDate: ymd(new Date(now - 30 * day)),
      endDate: ymd(new Date(now + 14 * day)),
    },
    {
      id: 'seed-ended',
      title: 'Bounty: Term Sprint',
      prize: 'A $50 voucher',
      message: 'Most papers before the term break takes the prize. Sprint to the finish!',
      startDate: ymd(new Date(now - 20 * day)),
      endDate: ymd(new Date(now - 1 * day)),
    },
    {
      id: 'seed-upcoming',
      title: 'Bounty: Trials Blitz',
      prize: 'Bragging rights 🏆',
      message: 'Starting soon — rack up the most papers in the lead-up to trials.',
      startDate: ymd(new Date(now + 7 * day)),
      endDate: ymd(new Date(now + 21 * day)),
    },
  ];
  for (const b of BOUNTIES) {
    await db.doc(`bounties/${b.id}`).set({
      title: b.title,
      prize: b.prize,
      message: b.message,
      startDate: b.startDate,
      endDate: b.endDate,
      published: true,
      result: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log(`✓ seeded ${BOUNTIES.length} sample bounties (active, ended, upcoming)`);

  console.log('\n✓ seed complete. Sign in with the Auth emulator to view as admin/student.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
