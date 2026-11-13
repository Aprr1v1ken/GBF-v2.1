import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, ensureFirestoreNetworkReady } from './firebase.ts';

export type FirestoreSyncCollection =
  | 'members'
  | 'families'
  | 'financial_transactions'
  | 'announcements'
  | 'schedules'
  | 'events'
  | 'church_staff';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function sanitizeFirestoreDocId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned || `doc_${Date.now()}`;
}

export function isFirestoreSyncReady(): boolean {
  return Boolean(typeof window !== 'undefined' && navigator.onLine && auth.currentUser);
}

function stripUndefinedFields(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) cleaned[k] = v;
  }
  return cleaned;
}

export async function mirrorDocToFirestore(
  collectionName: FirestoreSyncCollection,
  id: string,
  payload: Record<string, any>
): Promise<boolean> {
  if (!isFirestoreSyncReady()) return false;
  if (!(await ensureFirestoreNetworkReady())) return false;
  const docId = sanitizeFirestoreDocId(id);
  if (!VALID_ID_REGEX.test(docId)) return false;

  try {
    await setDoc(
      doc(db, collectionName, docId),
      {
        ...stripUndefinedFields(payload),
        id: docId,
        _syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn(`[FirestoreSync] Mirror write skipped for ${collectionName}/${docId}:`, err);
    return false;
  }
}

export async function removeDocFromFirestore(
  collectionName: FirestoreSyncCollection,
  id: string
): Promise<boolean> {
  if (!isFirestoreSyncReady()) return false;
  if (!(await ensureFirestoreNetworkReady())) return false;
  const docId = sanitizeFirestoreDocId(id);
  if (!VALID_ID_REGEX.test(docId)) return false;

  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (err) {
    console.warn(`[FirestoreSync] Mirror delete skipped for ${collectionName}/${docId}:`, err);
    return false;
  }
}

export async function pullCollectionFromFirestore<T = any>(
  collectionName: FirestoreSyncCollection
): Promise<T[]> {
  if (!isFirestoreSyncReady()) return [];
  if (!(await ensureFirestoreNetworkReady())) return [];
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as T[];
  } catch (err) {
    console.warn(`[FirestoreSync] Could not pull ${collectionName}:`, err);
    return [];
  }
}

export async function syncRecordsToFirestoreBatch(
  collectionName: FirestoreSyncCollection,
  records: Array<Record<string, any> & { id?: string }>
): Promise<number> {
  if (!isFirestoreSyncReady() || records.length === 0) return 0;
  if (!(await ensureFirestoreNetworkReady())) return 0;

  let synced = 0;
  const CHUNK_SIZE = 350;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const rec of chunk) {
        if (!rec.id) continue;
        const docId = sanitizeFirestoreDocId(rec.id);
        if (!VALID_ID_REGEX.test(docId)) continue;
        batch.set(
          doc(db, collectionName, docId),
          {
            ...stripUndefinedFields(rec),
            id: docId,
            _syncedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        synced++;
      }
      await batch.commit();
    } catch (err) {
      console.warn(`[FirestoreSync] Batch sync warning on ${collectionName}:`, err);
    }
  }
  return synced;
}
