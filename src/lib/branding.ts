/**
 * Branding and Custom Logo Management for Intranet HCJ
 * Synchronized with Firebase Firestore (systemConfig/app_branding) and local cache.
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { compressImageFile } from './fileCompressor';

export interface AppBranding {
  appName: string;
  subTitle: string;
  customLogoUrl: string | null;
  creatorSignature: string;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'Intranet HCJ',
  subTitle: 'Portal Dokumen & Evaluasi Kinerja',
  customLogoUrl: null,
  creatorSignature: '© 2026 Intranet HCJ | Developed with excellence @2026',
  updatedAt: new Date().toISOString(),
};

const BRANDING_STORAGE_KEY = 'ciputra_intra_branding_v1';
const CONFIG_COLLECTION = 'systemConfig';
const BRANDING_DOC_ID = 'app_branding';

let currentBranding: AppBranding = (() => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BRANDING_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_BRANDING, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse cached branding:', e);
    }
  }
  return DEFAULT_BRANDING;
})();

const listeners: Array<(branding: AppBranding) => void> = [];

export function getAppBranding(): AppBranding {
  return currentBranding;
}

export function subscribeToAppBranding(callback: (branding: AppBranding) => void): () => void {
  listeners.push(callback);
  callback(currentBranding);

  // If Firestore is ready, listen to live updates from the database
  let unsubscribeFirestore: (() => void) | null = null;
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
      unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<AppBranding>;
            const updated: AppBranding = { ...DEFAULT_BRANDING, ...data };
            currentBranding = updated;
            try {
              localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
              console.warn('Failed to cache branding:', e);
            }
            listeners.forEach((fn) => fn(updated));
          }
        },
        (err) => {
          console.debug('Branding live subscription notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('Failed to setup branding live listener:', e);
    }
  }

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}

export async function saveAppBranding(
  newBranding: Partial<AppBranding>,
  actorEmail?: string
): Promise<AppBranding> {
  const updated: AppBranding = {
    ...currentBranding,
    ...newBranding,
    appName: newBranding.appName?.trim() || currentBranding.appName || 'Intranet HCJ',
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail || currentBranding.updatedBy,
  };

  currentBranding = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage write failed for branding:', e);
    }
  }

  // Broadcast to local subscribers
  listeners.forEach((fn) => fn(updated));

  // Sync to Firestore
  if (isFirebaseConfigured()) {
    try {
      const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn('Firestore branding save error:', err);
    }
  }

  return updated;
}

/**
 * Super Admin logo upload helper: compresses logo file to ultra-compact WebP/JPEG
 * and stores it permanently in Firestore and local state.
 */
export async function uploadCustomLogo(file: File, actorEmail?: string): Promise<string> {
  // Compress logo to max 320x320 pixels with high crispness (results in ~8KB - 20KB)
  const result = await compressImageFile(file, 320, 0.85);
  await saveAppBranding({ customLogoUrl: result.dataUrl }, actorEmail);
  return result.dataUrl;
}

/**
 * Reset logo back to default hotel icon
 */
export async function resetCustomLogo(actorEmail?: string): Promise<void> {
  await saveAppBranding({ customLogoUrl: null }, actorEmail);
}
