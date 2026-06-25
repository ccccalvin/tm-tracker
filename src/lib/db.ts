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
import { ref, getDownloadURL } from 'firebase/storage';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, storage } from './firebase';
import { BOOTSTRAP_ADMIN_EMAIL, DEFAULT_CLASSES } from './config';
import type { AppUser, ClassInfo, Completion, Paper, TodoItem } from '@/types';

// ── timestamp helpers ───────────────────────────────────────────────────────
/** Firestore Timestamp | null → epoch millis | null (handles pending writes). */
export function toMillis(v: unknown): number | null {
  if (v && typeof (v as Timestamp).toMillis === 'function') return (v as Timestamp).toMillis();
  return null;
}

// ── mappers (Firestore doc → domain type) ───────────────────────────────────
export function mapUser(snap: QueryDocumentSnapshot<DocumentData>): AppUser {
  const d = snap.data();
  return {
    uid: snap.id,
    email: d.email ?? '',
    displayName: d.displayName ?? '',
    classId: d.classId ?? '',
    role: d.role === 'admin' ? 'admin' : 'student',
    isTMStudent: Boolean(d.isTMStudent),
    paperCount: typeof d.paperCount === 'number' ? d.paperCount : 0,
    lastCompletedAt: toMillis(d.lastCompletedAt),
    createdAt: toMillis(d.createdAt) ?? 0,
    onboarded: Boolean(d.onboarded),
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

// ── refs ────────────────────────────────────────────────────────────────────
export const usersCol = () => collection(db, 'users');
export const userRef = (uid: string) => doc(db, 'users', uid);
export const completionsCol = (uid: string) => collection(db, 'users', uid, 'completions');
export const completionRef = (uid: string, paperId: string) =>
  doc(db, 'users', uid, 'completions', paperId);
export const todosCol = (uid: string) => collection(db, 'users', uid, 'todos');
export const todoRef = (uid: string, paperId: string) =>
  doc(db, 'users', uid, 'todos', paperId);
export const classesCol = () => collection(db, 'classes');

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
    role: isBootstrapAdmin ? 'admin' : 'student',
    isTMStudent: false,
    paperCount: 0,
    lastCompletedAt: null,
    onboarded: isBootstrapAdmin, // admin skips student onboarding
    createdAt: serverTimestamp(),
  });

  if (isBootstrapAdmin) {
    await seedDefaultClasses();
  }
}

export async function completeOnboarding(
  uid: string,
  displayName: string,
  classId: string,
): Promise<void> {
  await updateDoc(userRef(uid), {
    displayName: displayName.trim(),
    classId,
    onboarded: true,
  });
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userRef(uid), { displayName: displayName.trim() });
}

// ── completions (instant-tick logging) ───────────────────────────────────────
/** Mark a paper complete (idempotent). Bumps paperCount + marks any todo done. */
export async function markComplete(uid: string, paper: Paper): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cRef = completionRef(uid, paper.id);
    const tRef = todoRef(uid, paper.id);
    const cSnap = await tx.get(cRef);
    const tSnap = await tx.get(tRef);
    if (cSnap.exists()) return; // already complete
    tx.set(cRef, {
      paperLabel: paper.label,
      completedAt: serverTimestamp(),
      score: null,
      notes: null,
    });
    tx.update(userRef(uid), {
      paperCount: increment(1),
      lastCompletedAt: serverTimestamp(),
    });
    if (tSnap.exists()) tx.update(tRef, { done: true });
  });
}

/** Un-mark a paper (idempotent). Decrements paperCount + un-dones any todo. */
export async function unmarkComplete(uid: string, paperId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const cRef = completionRef(uid, paperId);
    const tRef = todoRef(uid, paperId);
    const cSnap = await tx.get(cRef);
    const tSnap = await tx.get(tRef);
    if (!cSnap.exists()) return;
    tx.delete(cRef);
    tx.update(userRef(uid), { paperCount: increment(-1) });
    if (tSnap.exists()) tx.update(tRef, { done: false });
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
