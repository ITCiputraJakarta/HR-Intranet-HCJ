// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer
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
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const DEFAULT_FIREBASE_CONFIG: FirebaseAppConfig = {
  apiKey: 'AIzaSyCbWSyLab5imSjZNI4mYH_KDDII1a4hayI',
  authDomain: 'hr-intranet-31ff4.firebaseapp.com',
  projectId: 'hr-intranet-31ff4',
  storageBucket: 'hr-intranet-31ff4.firebasestorage.app',
  messagingSenderId: '282386309612',
  appId: '1:282386309612:web:69a16c4854b378808ae0c9',
  measurementId: 'G-Q62YDK838M',
  firestoreDatabaseId: '(default)',
};

const LOCAL_STORAGE_CUSTOM_CONFIG_KEY = 'ciputra_custom_firebase_config_v1';

export function getStoredFirebaseConfig(): FirebaseAppConfig {
  if (typeof window !== 'undefined') {
    try {
      // Clear any stale custom config that had a mismatched databaseId so hr-intranet-31ff4 connects cleanly to (default)
      localStorage.removeItem(LOCAL_STORAGE_CUSTOM_CONFIG_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: Partial<FirebaseAppConfig>): void {
  if (typeof window !== 'undefined') {
    const current = getStoredFirebaseConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_CONFIG_KEY, JSON.stringify(updated));
  }
}

export function resetStoredFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_CUSTOM_CONFIG_KEY);
  }
}

export const firebaseConfig: FirebaseAppConfig = getStoredFirebaseConfig();

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
    // Ignore analytics errors in restricted iframe/local environments
  }
}

// Initialize Cloud Firestore on the default database of hr-intranet-31ff4 with auto-detect long polling
function createFirestoreInstance(): Firestore {
  const targetDbId =
    firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId !== '(default)' &&
    firebaseConfig.firestoreDatabaseId.trim() !== ''
      ? firebaseConfig.firestoreDatabaseId
      : undefined;

  try {
    return targetDbId
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, targetDbId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Validate connection to Firestore on boot
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

export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const firebaseProjectId = firebaseConfig.projectId;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
}

export default app;

