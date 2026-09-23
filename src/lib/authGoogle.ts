import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

let provider: GoogleAuthProvider | null = null;

function getGoogleProvider(): GoogleAuthProvider {
  if (!provider) {
    provider = new GoogleAuthProvider();
    DRIVE_SCOPES.forEach((scope) => provider!.addScope(scope));
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  }
  return provider;
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGoogleUser: FirebaseUser | null = null;

// Auth state listener to automatically keep token status in sync safely
export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        cachedGoogleUser = user;
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedGoogleUser = null;
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn('initGoogleAuth safe catch:', err);
    return () => {};
  }
};

/**
 * Trigger Google Sign In Popup with Drive permission.
 * Obtains live OAuth Access Token with friendly error explanation.
 */
export const connectGoogleDrive = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  try {
    isSigningIn = true;
    const p = getGoogleProvider();
    const result = await signInWithPopup(auth, p);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Tidak dapat memperoleh token otorisasi Google Drive dari akun Google Anda.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive Connection Error:', error);
    
    // User-friendly localized error messages
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Jendela popup Google Sign-In ditutup sebelum otorisasi selesai. Silakan klik tombol lagi untuk mencoba.');
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Browser memblokir jendela popup. Harap izinkan pop-up untuk situs ini lalu coba lagi.');
    }
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error(`Domain saat ini (${typeof window !== 'undefined' ? window.location.hostname : ''}) belum terdaftar di Firebase Authorized Domains. Sistem otomatis beralih ke penyimpanan lokal.`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get the current cached access token (memory-only)
 */
export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Check if Google Drive is currently authorized with a live token
 */
export const isGoogleDriveConnected = (): boolean => {
  return Boolean(cachedAccessToken);
};

export const getConnectedGoogleUser = (): FirebaseUser | null => {
  return cachedGoogleUser;
};

/**
 * Disconnect Google Drive token in memory
 */
export const disconnectGoogleDrive = async () => {
  cachedAccessToken = null;
  cachedGoogleUser = null;
};
