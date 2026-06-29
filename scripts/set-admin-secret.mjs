#!/usr/bin/env node
/**
 * set-admin-secret.mjs — set the shared admin-signup token in PRODUCTION
 * Firestore (`config/adminSecret`). This is the token a new user enters on the
 * "I'm an admin" onboarding step to self-promote (validated server-side by
 * firestore.rules; never readable by clients).
 *
 * Requires ./serviceAccountKey.json (gitignored). Writes to PRODUCTION, so this
 * deliberately does NOT touch the emulator.
 *
 * Usage:
 *   node scripts/set-admin-secret.mjs                # generate a random token
 *   node scripts/set-admin-secret.mjs "my-token"     # set a specific token
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Never let a stray emulator env var redirect this prod write.
delete process.env.FIRESTORE_EMULATOR_HOST;

const keyPath = resolve(ROOT, 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`✗ could not read ${keyPath} — need a service account key to write to production.`);
  process.exit(1);
}

const token = process.argv[2]?.trim() || randomBytes(24).toString('base64url');

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

await db.doc('config/adminSecret').set({
  token,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

console.log(`✓ set config/adminSecret on project "${serviceAccount.project_id}"`);
console.log('');
console.log('  Admin signup token:');
console.log(`    ${token}`);
console.log('');
console.log('  Hand this to anyone who should become an admin. Re-run this script to rotate it.');
process.exit(0);
