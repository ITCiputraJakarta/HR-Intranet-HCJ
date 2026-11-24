// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig: FirebaseAppConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyCbWSyLab5imSjZNI4mYH_KDDII1a4hayI',
  authDomain: 'hr-intranet-31ff4.firebaseapp.com',
  projectId: 'hr-intranet-31ff4',
  storageBucket: 'hr-intranet-31ff4.firebasestorage.app',
  messagingSenderId: '282386309612',
  appId: '1:282386309612:web:69a16c4854b378808ae0c9',
  measurementId: 'G-Q62YDK838M',
  firestoreDatabaseId: '(default)',
};

export const DEFAULT_FIREBASE_CONFIG: FirebaseAppConfig = firebaseConfig;

export function getStoredFirebaseConfig(): FirebaseAppConfig {
  return firebaseConfig;
}

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Analytics safely in browser environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    isSupported()
      .then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {});
  } catch {
    // Ignore analytics errors in restricted iframe environments
  }
}

// Initialize Cloud Firestore on configured database of hr-intranet-31ff4
const TARGET_FIRESTORE_DB_ID = firebaseConfig.firestoreDatabaseId || '(default)';

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      TARGET_FIRESTORE_DB_ID
    );
  } catch {
    return getFirestore(app, TARGET_FIRESTORE_DB_ID);
  }
}

export const db: Firestore = createFirestoreInstance();

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Validate connection to Firestore on boot without creating anonymous auth sessions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'systemConfig', 'app_branding'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export const firestoreDatabaseId = '(default)';
export const firebaseProjectId = firebaseConfig.projectId;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
}

export default app;
