import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import bundledConfig from '../../firebase-applet-config.json';

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

const LOCAL_STORAGE_CUSTOM_CONFIG_KEY = 'ciputra_custom_firebase_config_v1';

export function getStoredFirebaseConfig(): FirebaseAppConfig {
  if (typeof window !== 'undefined') {
    try {
      // Remove any legacy/stale custom config that points to an old project or wrong databaseId
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.projectId !== bundledConfig.projectId ||
          parsed.firestoreDatabaseId !== bundledConfig.firestoreDatabaseId
        ) {
          localStorage.removeItem(LOCAL_STORAGE_CUSTOM_CONFIG_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return bundledConfig as FirebaseAppConfig;
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

// Initialize Firebase App safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with auto-detect long polling so writes never hang on corporate/iframe networks
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

// Initialize Firebase Analytics safely (only when a valid Google Analytics Measurement ID is provided)
export let analytics: Analytics | null = null;
if (
  typeof window !== 'undefined' &&
  firebaseConfig.measurementId &&
  firebaseConfig.measurementId.trim() !== '' &&
  firebaseConfig.measurementId.startsWith('G-')
) {
  try {
    isSupported()
      .then((supported) => {
        if (supported && firebaseConfig.measurementId?.startsWith('G-')) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {});
  } catch {
    // Ignore analytics errors in preview or local environments
  }
}

export const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const firebaseProjectId = firebaseConfig.projectId;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
}

export default app;

