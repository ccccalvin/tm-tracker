#!/usr/bin/env node
/**
 * seed-auth.mjs — populate the LOCAL Firebase AUTH EMULATOR with demo accounts
 * so you can click "Sign in with Google" and pick one instead of typing in the
 * emulator's "Add new account" form every time.
 *
 * Creates google.com-provider users (so they appear in the emulator's Google
 * sign-in picker). On first sign-in the app's ensureUserDoc() provisions the
 * matching users/{uid} profile: the bootstrap admin becomes an admin; everyone
 * else starts as an un-onboarded student and is sent through onboarding.
 *
 * Accounts:
 *   - calvintkusnadi@gmail.com  → admin   (matches BOOTSTRAP_ADMIN_EMAIL)
 *   - test@gmail.com            → student
 *
 * Safe: refuses to run unless pointed at an emulator. Idempotent (re-importing
 * deletes and recreates the same uids).
 *
 * Usage (with emulators running — `npm run emulators` in another terminal):
 *   npm run seed-auth
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Default to the auth emulator host from firebase.json; bail if not an emulator.
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('✗ refusing to seed auth: FIREBASE_AUTH_EMULATOR_HOST is not set (emulator only).');
  process.exit(1);
}

// Keep the admin email in sync with src/lib/config.ts (BOOTSTRAP_ADMIN_EMAIL).
const ACCOUNTS = [
  { uid: 'demo-admin', email: 'calvintkusnadi@gmail.com', displayName: 'Calvin (admin)' },
  { uid: 'demo-test-student', email: 'test@gmail.com', displayName: 'Test Student' },
];

const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'tm-tracker' });
const auth = admin.auth();

/** A google.com-provider user record (so it shows in the Google sign-in popup). */
function googleUser({ uid, email, displayName }) {
  return {
    uid,
    email,
    emailVerified: true,
    displayName,
    providerData: [{ uid: email, email, displayName, providerId: 'google.com' }],
  };
}

async function main() {
  const users = ACCOUNTS.map(googleUser);

  // Idempotent: drop any pre-existing copies of these uids first.
  await auth.deleteUsers(users.map((u) => u.uid)).catch(() => {});

  const res = await auth.importUsers(users);
  if (res.failureCount) {
    for (const e of res.errors) {
      console.error(`✗ ${users[e.index].email}: ${e.error.message}`);
    }
  }
  for (const u of users) {
    console.log(`✓ ${u.displayName} <${u.email}>`);
  }
  console.log(
    `\n✓ ${res.successCount} auth account(s) ready. Open the app → "Sign in with Google" → pick one.`,
  );
  process.exit(res.failureCount ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
