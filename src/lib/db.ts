/**
 * Data layer — every Firestore read/write goes through here. UI components call
 * these functions and the snapshot hooks in src/hooks; they never touch the
 * Firebase SDK directly.
 *
 * Firestore shape (DESIGN.md §12):
 *   users/{uid}                        AppUser profile (+ denormalized paperCount)
 *   users/{uid}/completions/{paperId}  Completion (private: owner + admins)
 *   users/{uid}/todos/{paperId}        TodoItem
 *   classes/{classId}                  ClassInfo
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  increment,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, storage } from './firebase';
import { BOOTSTRAP_ADMIN_EMAIL, DEFAULT_CLASSES } from './config';
import type {
  AppUser,
  Bounty,
  BountyResult,
  BountyResultEntry,
  ClassInfo,
  Completion,
  MathLevel,
  Paper,
  TodoItem,
} from '@/types';

// ── timestamp helpers ───────────────────────────────────────────────────────
/** Firestore Timestamp | null → epoch millis | null (handles pending writes). */
export function toMillis(v: unknown): number | null {
  if (v && typeof (v as Timestamp).toMillis === 'function') return (v as Timestamp).toMillis();
  return null;
}

/** A stored value → MathLevel, or null when missing/invalid. */
function toMathLevel(v: unknown): MathLevel | null {
  return v === 'ADVN' || v === 'EXT1' || v === 'EXT2' ? v : null;
}

// ── mappers (Firestore doc → domain type) ───────────────────────────────────
export function mapUser(snap: QueryDocumentSnapshot<DocumentData>): AppUser {
  const d = snap.data();
  return {
    uid: snap.id,
    email: d.email ?? '',
    displayName: d.displayName ?? '',
    classId: d.classId ?? '',
    mathLevel: toMathLevel(d.mathLevel),
    role: d.role === 'admin' ? 'admin' : 'student',
    isTMStudent: Boolean(d.isTMStudent),
    paperCount: typeof d.paperCount === 'number' ? d.paperCount : 0,
    lastCompletedAt: toMillis(d.lastCompletedAt),
    createdAt: toMillis(d.createdAt) ?? 0,
    onboarded: Boolean(d.onboarded),
    photoURL: typeof d.photoURL === 'string' && d.photoURL ? d.photoURL : null,
    showTrialsCountdown: Boolean(d.showTrialsCountdown),
    trialsDate: typeof d.trialsDate === 'string' && d.trialsDate ? d.trialsDate : null,
  };
}

export function mapCompletion(snap: QueryDocumentSnapshot<DocumentData>): Completion {
  const d = snap.data();
  return {
    paperId: snap.id,
    paperLabel: d.paperLabel ?? '',
    completedAt: toMillis(d.completedAt) ?? 0,
    score: typeof d.score === 'number' ? d.score : null,
    notes: typeof d.notes === 'string' ? d.notes : null,
  };
}

export function mapTodo(snap: QueryDocumentSnapshot<DocumentData>): TodoItem {
  const d = snap.data();
  return {
    paperId: snap.id,
    paperLabel: d.paperLabel ?? '',
    order: typeof d.order === 'number' ? d.order : 0,
    addedAt: toMillis(d.addedAt) ?? 0,
    done: Boolean(d.done),
  };
}

export function mapClass(snap: QueryDocumentSnapshot<DocumentData>): ClassInfo {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? snap.id,
    badge: d.badge ?? snap.id,
    archived: Boolean(d.archived),
    order: typeof d.order === 'number' ? d.order : 0,
  };
}

export function mapBounty(snap: QueryDocumentSnapshot<DocumentData>): Bounty {
  const d = snap.data();
  return {
    id: snap.id,
    title: d.title ?? '',
    prize: d.prize ?? '',
    message: d.message ?? '',
    startDate: d.startDate ?? '',
    endDate: d.endDate ?? '',
    published: Boolean(d.published),
    createdAt: toMillis(d.createdAt) ?? 0,
    result: mapBountyResult(d.result),
  };
}

function mapBountyResult(raw: unknown): BountyResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { lockedAt?: unknown; standings?: unknown };
  const standings = Array.isArray(r.standings)
    ? (r.standings as Record<string, unknown>[]).map((e) => ({
        uid: typeof e.uid === 'string' ? e.uid : '',
        displayName: typeof e.displayName === 'string' ? e.displayName : '',
        classId: typeof e.classId === 'string' ? e.classId : '',
        mathLevel: toMathLevel(e.mathLevel),
        photoURL: typeof e.photoURL === 'string' && e.photoURL ? e.photoURL : null,
        count: typeof e.count === 'number' ? e.count : 0,
        rank: typeof e.rank === 'number' ? e.rank : 0,
      }))
    : [];
  return {
    lockedAt: typeof r.lockedAt === 'number' ? r.lockedAt : 0,
    standings,
  };
}

// ── refs ────────────────────────────────────────────────────────────────────
export const usersCol = () => collection(db, 'users');
export const userRef = (uid: string) => doc(db, 'users', uid);
/** A user's one-shot admin-claim doc. Its mere existence (gated by the secret
 * token in firestore.rules) is what authorises self-promotion to admin. */
export const adminClaimRef = (uid: string) => doc(db, 'adminClaims', uid);
export const completionsCol = (uid: string) => collection(db, 'users', uid, 'completions');
export const completionRef = (uid: string, paperId: string) =>
  doc(db, 'users', uid, 'completions', paperId);
export const todosCol = (uid: string) => collection(db, 'users', uid, 'todos');
export const todoRef = (uid: string, paperId: string) =>
  doc(db, 'users', uid, 'todos', paperId);
export const classesCol = () => collection(db, 'classes');
export const bountiesCol = () => collection(db, 'bounties');
export const bountyRef = (id: string) => doc(db, 'bounties', id);
/**
 * Public, non-sensitive mirror of a completion (no score/notes) used to power
 * bounty standings for every signed-in user. Deterministic id keeps it 1:1 with
 * the private completion at `users/{uid}/completions/{paperId}`.
 */
export const completionEventsCol = () => collection(db, 'completionEvents');
export const completionEventRef = (uid: string, paperId: string) =>
  doc(db, 'completionEvents', `${uid}__${paperId}`);

// ── auth / onboarding ────────────────────────────────────────────────────────
/**
 * Ensure `users/{uid}` exists on sign-in. The bootstrap admin is created as a
 * fully-onboarded admin; everyone else starts as an un-onboarded student
 * (DESIGN.md §3/§4). Best-effort seeds the default classes for the admin.
 */
export async function ensureUserDoc(fbUser: FirebaseUser): Promise<void> {
  const ref = userRef(fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const isBootstrapAdmin =
    (fbUser.email ?? '').toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  await setDoc(ref, {
    email: fbUser.email ?? '',
    displayName: isBootstrapAdmin ? fbUser.displayName ?? 'Admin' : '',
    classId: '',
    mathLevel: null,
    role: isBootstrapAdmin ? 'admin' : 'student',
    isTMStudent: false,
    paperCount: 0,
    lastCompletedAt: null,
    onboarded: isBootstrapAdmin, // admin skips student onboarding
    createdAt: serverTimestamp(),
    photoURL: null,
    showTrialsCountdown: false,
    trialsDate: null,
  });

  if (isBootstrapAdmin) {
    await seedDefaultClasses();
  }
}

/**
 * Finish student onboarding: set the display name and chosen math level. The
 * class is NOT set here — it's hidden from students and assigned later by an
 * admin, so the profile stays class-less (classId '') until then.
 */
export async function completeOnboarding(
  uid: string,
  displayName: string,
  mathLevel: MathLevel,
): Promise<void> {
  await updateDoc(userRef(uid), {
    displayName: displayName.trim(),
    mathLevel,
    onboarded: true,
  });
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userRef(uid), { displayName: displayName.trim() });
}

/**
 * Self-service admin sign-up via a shared secret token (DESIGN.md §3).
 *
 * The token is NEVER trusted client-side: step 1 writes it into the user's
 * `adminClaims/{uid}` doc, which firestore.rules only permit when it matches the
 * locked `config/adminSecret` doc (a wrong token throws permission-denied here).
 * Step 2 self-promotes — the rules allow role→'admin' only because the claim doc
 * now exists. Admins carry NO class, so classId is cleared. Step 3 tidies up the
 * (now spent) claim doc; best-effort, since promotion has already succeeded.
 *
 * Throws on an invalid token — callers should surface that as "incorrect token".
 */
export async function claimAdmin(
  uid: string,
  displayName: string,
  token: string,
): Promise<void> {
  await setDoc(adminClaimRef(uid), { token, createdAt: serverTimestamp() });
  await updateDoc(userRef(uid), {
    displayName: displayName.trim(),
    role: 'admin',
    isTMStudent: false,
    classId: '',
    mathLevel: null,
    onboarded: true,
  });
  await deleteDoc(adminClaimRef(uid)).catch(() => {
    /* claim is spent; a lingering doc is harmless (unreadable, admin-deletable) */
  });
}

// ── profile picture ──────────────────────────────────────────────────────────
/** Storage path for a user's avatar (one per user; new uploads overwrite it). */
const avatarRef = (uid: string) => ref(storage, `avatars/${uid}`);

/**
 * Upload a cropped avatar image and point the profile at its download URL. The
 * blob is already a small (~256px) square produced client-side. Returns the new
 * URL (which carries a fresh token, so it busts any cached copy).
 */
export async function uploadAvatar(uid: string, blob: Blob): Promise<string> {
  await uploadBytes(avatarRef(uid), blob, { contentType: blob.type || 'image/jpeg' });
  const url = await getDownloadURL(avatarRef(uid));
  await updateDoc(userRef(uid), { photoURL: url });
  return url;
}

/** Remove the avatar image and revert the profile to the default icon. */
export async function removeAvatar(uid: string): Promise<void> {
  await updateDoc(userRef(uid), { photoURL: null });
  try {
    await deleteObject(avatarRef(uid));
  } catch {
    // The object may already be gone (e.g. never uploaded) — the profile is the
    // source of truth, so a missing storage object is not an error here.
  }
}

// ── personal countdown settings ──────────────────────────────────────────────
/** Save the student's "days until trials" countdown toggle + date. */
export async function updateTrialsCountdown(
  uid: string,
  settings: { showTrialsCountdown: boolean; trialsDate: string | null },
): Promise<void> {
  await updateDoc(userRef(uid), {
    showTrialsCountdown: settings.showTrialsCountdown,
    trialsDate: settings.trialsDate,
  });
}

// ── completions (instant-tick logging) ───────────────────────────────────────
/** Mark a paper complete (idempotent). Bumps paperCount + marks any todo done. */
export async function markComplete(uid: string, paper: Paper): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cRef = completionRef(uid, paper.id);
    const tRef = todoRef(uid, paper.id);
    const eRef = completionEventRef(uid, paper.id);
    const cSnap = await tx.get(cRef);
    const tSnap = await tx.get(tRef);
    if (cSnap.exists() && cSnap.data().completed !== false) return; // already complete
    if (cSnap.exists()) {
      // Re-completing a paper that was previously un-completed: keep the score
      // and notes that were preserved on the doc, just flag it complete again.
      tx.update(cRef, { completed: true, completedAt: serverTimestamp() });
    } else {
      tx.set(cRef, {
        paperLabel: paper.label,
        completedAt: serverTimestamp(),
        completed: true,
        score: null,
        notes: null,
      });
    }
    tx.update(userRef(uid), {
      paperCount: increment(1),
      lastCompletedAt: serverTimestamp(),
    });
    if (tSnap.exists()) tx.update(tRef, { done: true });
    // Public mirror for bounty standings — timestamp only, never score/notes.
    tx.set(eRef, {
      uid,
      paperId: paper.id,
      completedAt: serverTimestamp(),
      completed: true,
    });
  });
}

/**
 * Un-mark a paper (idempotent). Decrements paperCount + un-dones any todo.
 *
 * We keep the completion doc (flagging it `completed: false`) rather than
 * deleting it, so an accidental un-complete doesn't throw away the private
 * score/notes the user recorded. Re-completing restores them (see markComplete).
 */
export async function unmarkComplete(uid: string, paperId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cRef = completionRef(uid, paperId);
    const tRef = todoRef(uid, paperId);
    const eRef = completionEventRef(uid, paperId);
    const cSnap = await tx.get(cRef);
    const tSnap = await tx.get(tRef);
    if (!cSnap.exists() || cSnap.data().completed === false) return; // already not complete
    tx.update(cRef, { completed: false });
    tx.update(userRef(uid), { paperCount: increment(-1) });
    if (tSnap.exists()) tx.update(tRef, { done: false });
    // Mirror the un-complete so it stops counting toward bounties. Merge keeps
    // uid/paperId present so the security rule's owner check still passes.
    tx.set(eRef, { uid, paperId, completed: false }, { merge: true });
  });
}

/** Save the optional, private score/notes on an already-completed paper. */
export async function saveCompletionDetails(
  uid: string,
  paperId: string,
  details: { score: number | null; notes: string | null },
): Promise<void> {
  await updateDoc(completionRef(uid, paperId), {
    score: details.score,
    notes: details.notes,
  });
}

// ── to-do queue ──────────────────────────────────────────────────────────────
export async function addTodo(uid: string, paper: Paper, alreadyDone: boolean): Promise<void> {
  await setDoc(
    todoRef(uid, paper.id),
    {
      paperLabel: paper.label,
      order: Date.now(), // appended to the end; reorder normalizes later
      addedAt: serverTimestamp(),
      done: alreadyDone,
    },
    { merge: true },
  );
}

export async function removeTodo(uid: string, paperId: string): Promise<void> {
  await deleteDoc(todoRef(uid, paperId));
}

/** Persist a new manual order (drag-reorder). Writes order = array index. */
export async function reorderTodos(uid: string, orderedPaperIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedPaperIds.forEach((paperId, i) => {
    batch.update(todoRef(uid, paperId), { order: i });
  });
  await batch.commit();
}

// ── classes (admin) ──────────────────────────────────────────────────────────
export async function seedDefaultClasses(): Promise<void> {
  const batch = writeBatch(db);
  for (const c of DEFAULT_CLASSES) {
    batch.set(
      doc(db, 'classes', c.id),
      { name: c.name, badge: c.badge, order: c.order, archived: false },
      { merge: true },
    );
  }
  await batch.commit();
}

export async function addClass(name: string, badge: string, order: number): Promise<void> {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  await setDoc(doc(db, 'classes', id), {
    name: name.trim(),
    badge: badge.trim(),
    order,
    archived: false,
  });
}

export async function updateClass(
  id: string,
  patch: Partial<Pick<ClassInfo, 'name' | 'badge' | 'archived' | 'order'>>,
): Promise<void> {
  await updateDoc(doc(db, 'classes', id), patch);
}

// ── bounties (admin) ──────────────────────────────────────────────────────────
export interface BountyInput {
  title: string;
  prize: string;
  message: string;
  startDate: string;
  endDate: string;
}

/** Create a bounty. Published immediately by default; admins can hide it later. */
export async function createBounty(
  input: BountyInput,
  published = true,
): Promise<void> {
  await addDoc(bountiesCol(), {
    title: input.title.trim(),
    prize: input.prize.trim(),
    message: input.message.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    published,
    createdAt: serverTimestamp(),
  });
}

export async function updateBounty(
  id: string,
  patch: Partial<BountyInput & { published: boolean; result: BountyResult | null }>,
): Promise<void> {
  const clean: Record<string, unknown> = { ...patch };
  for (const key of ['title', 'prize', 'message'] as const) {
    if (typeof clean[key] === 'string') clean[key] = (clean[key] as string).trim();
  }
  await updateDoc(bountyRef(id), clean);
}

export async function deleteBounty(id: string): Promise<void> {
  await deleteDoc(bountyRef(id));
}

/**
 * Freeze a finished bounty's final standings so first place can never change
 * afterwards. Admin-only (security rules). Write-once: callers check that
 * `bounty.result` is still null before calling.
 */
export async function lockBountyResult(
  id: string,
  standings: BountyResultEntry[],
): Promise<void> {
  const result: BountyResult = { lockedAt: Date.now(), standings };
  await updateDoc(bountyRef(id), { result });
}

// ── admin: user management ────────────────────────────────────────────────────
export async function setTMStudent(uid: string, isTMStudent: boolean): Promise<void> {
  await updateDoc(userRef(uid), { isTMStudent });
}

export async function setRole(uid: string, role: AppUser['role']): Promise<void> {
  await updateDoc(userRef(uid), { role });
}

export async function reassignClass(uid: string, classId: string): Promise<void> {
  await updateDoc(userRef(uid), { classId });
}

/** Admin: change a student's math level (the coloured badge). */
export async function setMathLevel(uid: string, mathLevel: MathLevel): Promise<void> {
  await updateDoc(userRef(uid), { mathLevel });
}

export async function removeUser(uid: string): Promise<void> {
  // Deletes the profile doc. Subcollections (completions/todos) are orphaned in
  // Firestore but become unreachable; acceptable for the rare "remove a random
  // sign-up" case (DESIGN.md §8.1).
  await deleteDoc(userRef(uid));
}

// ── storage ──────────────────────────────────────────────────────────────────
/** Resolve a paper's PDF to a download URL (opened in a new tab). */
export async function getPaperUrl(storagePath: string): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}
