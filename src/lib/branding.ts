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
  creatorSignature: 'JBagas 2026 ttd',
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
          updatedBy: parsed.updatedBy || '',
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

// Global active Firestore listener & timestamp guard to prevent stale reads overwriting fresh saves
let isListenerActive = false;
let lastLocalSaveTime = 0;

function syncFavicon(logoUrl: string | null) {
  if (typeof document === 'undefined') return;
  try {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (logoUrl) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logoUrl;
    }
  } catch {
    // Ignore favicon DOM errors
  }
}

function applyIncomingBranding(data: Partial<AppBranding>): AppBranding {
  const incomingTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
  // Ignore stale snapshot if we just saved locally within the last 5 seconds and incoming is older
  if (lastLocalSaveTime > 0 && Date.now() - lastLocalSaveTime < 5000 && incomingTime < lastLocalSaveTime) {
    return currentBranding;
  }

  const updated: AppBranding = {
    appName: data.appName || currentBranding.appName || DEFAULT_BRANDING.appName,
    subTitle: data.subTitle !== undefined ? data.subTitle : currentBranding.subTitle,
    customLogoUrl: data.customLogoUrl !== undefined ? data.customLogoUrl : currentBranding.customLogoUrl,
    creatorSignature: data.creatorSignature || currentBranding.creatorSignature || DEFAULT_BRANDING.creatorSignature,
    updatedAt: data.updatedAt || new Date().toISOString(),
    updatedBy: data.updatedBy || '',
  };
  currentBranding = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    syncFavicon(updated.customLogoUrl);
  }
  notifySubscribers(updated);
  return updated;
}

/**
 * Fetch latest branding from Firestore directly (one-time getDoc)
 */
export async function fetchAppBrandingFromFirestore(): Promise<AppBranding> {
  if (!isFirebaseConfigured()) return currentBranding;
  // Do not overwrite an in-flight local save
  if (lastLocalSaveTime > 0 && Date.now() - lastLocalSaveTime < 4000) {
    return currentBranding;
  }
  try {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return applyIncomingBranding(snap.data() as Partial<AppBranding>);
    }
  } catch (err) {
    console.debug('Direct branding fetch notice:', err);
  }
  return currentBranding;
}

export function initBrandingFirestoreSync(): void {
  if (isListenerActive || !isFirebaseConfigured()) return;
  try {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          applyIncomingBranding(snap.data() as Partial<AppBranding>);
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

// Fetch initial branding once immediately on script load
if (typeof window !== 'undefined') {
  initBrandingFirestoreSync();
  fetchAppBrandingFromFirestore().catch(() => {});
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
  const nowIso = new Date().toISOString();
  lastLocalSaveTime = Date.now();

  const updated: AppBranding = {
    appName: newBranding.appName !== undefined ? newBranding.appName.trim() : (currentBranding.appName || DEFAULT_BRANDING.appName),
    subTitle: newBranding.subTitle !== undefined ? newBranding.subTitle.trim() : (currentBranding.subTitle || DEFAULT_BRANDING.subTitle),
    customLogoUrl: newBranding.customLogoUrl !== undefined ? newBranding.customLogoUrl : (currentBranding.customLogoUrl || null),
    creatorSignature: newBranding.creatorSignature !== undefined ? newBranding.creatorSignature.trim() : (currentBranding.creatorSignature || DEFAULT_BRANDING.creatorSignature),
    updatedAt: nowIso,
    updatedBy: actorEmail || currentBranding.updatedBy || '',
  };

  currentBranding = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage write failed for branding:', e);
    }
    syncFavicon(updated.customLogoUrl);
  }

  // Broadcast to local subscribers immediately so UI updates in <10ms
  notifySubscribers(updated);

  // Sync to Firestore with a 2.5s UI timeout guard so slow connections never hang the loading button
  if (isFirebaseConfigured()) {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    const cleanPayload: Record<string, any> = {
      appName: updated.appName,
      subTitle: updated.subTitle,
      customLogoUrl: updated.customLogoUrl,
      creatorSignature: updated.creatorSignature,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy || '',
    };

    const writePromise = setDoc(docRef, cleanPayload, { merge: true }).catch((err: any) => {
      console.error('Firestore branding save error:', err);
    });

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 2500);
    });

    await Promise.race([writePromise, timeoutPromise]);
  }

  return updated;
}

/**
 * Super Admin logo upload helper: compresses logo file to ultra-compact WebP/PNG
 * and stores it permanently in Firestore and local state.
 */
export async function uploadCustomLogo(file: File, actorEmail?: string): Promise<string> {
  // Compress logo/icon to max 240x240 pixels with high crispness (results in ~4KB - 12KB in <40ms)
  const result = await compressImageFile(file, 240, 0.84);
  await saveAppBranding({ customLogoUrl: result.dataUrl }, actorEmail);
  return result.dataUrl;
}

/**
 * Reset logo back to default hotel icon
 */
export async function resetCustomLogo(actorEmail?: string): Promise<void> {
  await saveAppBranding({ customLogoUrl: null }, actorEmail);
}
