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
  creatorSignature: 'Created by Bagas Prasetyo • 2026',
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
        const parsed = JSON.parse(stored);
        return {
          appName: parsed.appName || DEFAULT_BRANDING.appName,
          subTitle: parsed.subTitle !== undefined ? parsed.subTitle : DEFAULT_BRANDING.subTitle,
          customLogoUrl: parsed.customLogoUrl !== undefined ? parsed.customLogoUrl : DEFAULT_BRANDING.customLogoUrl,
          creatorSignature: parsed.creatorSignature || DEFAULT_BRANDING.creatorSignature,
          updatedAt: parsed.updatedAt || DEFAULT_BRANDING.updatedAt,
          updatedBy: parsed.updatedBy,
        };
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

function notifySubscribers(updated: AppBranding) {
  listeners.forEach((fn) => {
    try {
      fn(updated);
    } catch (err) {
      console.warn('Branding subscriber error:', err);
    }
  });
}

// Global active Firestore listener
let isListenerActive = false;

export function initBrandingFirestoreSync(): void {
  if (isListenerActive || !isFirebaseConfigured()) return;
  try {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppBranding>;
          const updated: AppBranding = {
            appName: data.appName || currentBranding.appName || DEFAULT_BRANDING.appName,
            subTitle: data.subTitle !== undefined ? data.subTitle : currentBranding.subTitle,
            customLogoUrl: data.customLogoUrl !== undefined ? data.customLogoUrl : currentBranding.customLogoUrl,
            creatorSignature: data.creatorSignature || currentBranding.creatorSignature || DEFAULT_BRANDING.creatorSignature,
            updatedAt: data.updatedAt || new Date().toISOString(),
            updatedBy: data.updatedBy || currentBranding.updatedBy,
          };
          currentBranding = updated;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {}
          }
          notifySubscribers(updated);
        }
      },
      (err) => {
        console.debug('Branding live subscription notice:', err.message);
      }
    );
    isListenerActive = true;
  } catch (e) {
    console.warn('Failed to setup branding live listener:', e);
  }
}

// Fetch initial branding once immediately
if (typeof window !== 'undefined') {
  initBrandingFirestoreSync();
}

export function subscribeToAppBranding(callback: (branding: AppBranding) => void): () => void {
  listeners.push(callback);
  callback(currentBranding);
  initBrandingFirestoreSync();

  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export async function saveAppBranding(
  newBranding: Partial<AppBranding>,
  actorEmail?: string
): Promise<AppBranding> {
  const updated: AppBranding = {
    ...currentBranding,
    ...newBranding,
    appName: newBranding.appName !== undefined ? newBranding.appName.trim() : currentBranding.appName,
    subTitle: newBranding.subTitle !== undefined ? newBranding.subTitle.trim() : currentBranding.subTitle,
    creatorSignature: newBranding.creatorSignature !== undefined ? newBranding.creatorSignature.trim() : currentBranding.creatorSignature,
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

  // Broadcast to local subscribers immediately
  notifySubscribers(updated);

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
