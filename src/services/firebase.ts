import { initializeApp, getApps, getApp } from '@firebase/app';
import { getAuth, GoogleAuthProvider } from '@firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase is used only for Google authentication. Church records and images
// use the authenticated SYSJEGER API/Postgres database, never a second cloud
// data store that could reintroduce stale or public records.
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
