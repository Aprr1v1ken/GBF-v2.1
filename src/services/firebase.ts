import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  disableNetwork,
  enableNetwork,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const FIRESTORE_DATABASE_ID =
  (firebaseConfig as any).firestoreDatabaseId ||
  'ai-studio-gmitbetelfuimela-5319dba1-69fb-4d38-bee2-9c9529e50460';

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      FIRESTORE_DATABASE_ID
    );
  } catch (err) {
    // Fallback for restricted WebViews / private browsing without IndexedDB
    console.warn('[Firebase] IndexedDB offline cache unavailable, using memory cache:', err);
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      FIRESTORE_DATABASE_ID
    );
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let networkPausedForOffline = false;
let connectivityCheckPromise: Promise<boolean> | null = null;

async function canReachFirestoreEndpoint(timeoutMs = 3500): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !auth.currentUser) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const idToken = await auth.currentUser.getIdToken();
    const docName = `projects/${firebaseConfig.projectId}/databases/${FIRESTORE_DATABASE_ID}/documents/test/connection`;
    const probeUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents:batchGet?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const response = await fetch(probeUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ documents: [docName] }),
      signal: controller.signal,
    });
    // HTTP 200 (found or missing doc marker) confirms live authenticated backend reachability.
    return response.status > 0 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function pauseFirestoreNetworkSafely(): Promise<void> {
  if (networkPausedForOffline) return;
  networkPausedForOffline = true;
  try {
    await disableNetwork(db);
  } catch {
    // Ignore shutdown/persistence edge errors
  }
}

export async function ensureFirestoreNetworkReady(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    await pauseFirestoreNetworkSafely();
    return false;
  }
  const reachable = await canReachFirestoreEndpoint(3500);
  if (!reachable) {
    await pauseFirestoreNetworkSafely();
    return false;
  }
  if (networkPausedForOffline) {
    networkPausedForOffline = false;
    try {
      await enableNetwork(db);
    } catch {
      return false;
    }
  }
  return true;
}

// Connectivity test constraint as required by Firebase skill, guarded so slow/offline
// links switch cleanly to local cache before Firestore's 10-second stream error fires.
async function testConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (connectivityCheckPromise) return connectivityCheckPromise;

  connectivityCheckPromise = (async () => {
    try {
      const ready = await ensureFirestoreNetworkReady();
      if (!ready) return false;

      let watchdogFired = false;
      const watchdogTimer = setTimeout(() => {
        watchdogFired = true;
        void pauseFirestoreNetworkSafely();
      }, 6500);

      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        clearTimeout(watchdogTimer);
        return !watchdogFired;
      } catch (error) {
        clearTimeout(watchdogTimer);
        if (
          error instanceof Error &&
          (error.message.includes('the client is offline') ||
            error.message.includes('network') ||
            error.message.includes('unavailable'))
        ) {
          await pauseFirestoreNetworkSafely();
        }
        return false;
      }
    } finally {
      connectivityCheckPromise = null;
    }
  })();

  return connectivityCheckPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (auth.currentUser) void testConnection();
  });
  window.addEventListener('offline', () => {
    void pauseFirestoreNetworkSafely();
  });
  onAuthStateChanged(auth, (user) => {
    if (user) {
      void testConnection();
    } else {
      void pauseFirestoreNetworkSafely();
    }
  });
}

