/**
 * Branding, Custom Logo, Hotel Hero Photo & Bottom Gallery Footer Management for Intranet HCJ
 * Synchronized with Firebase Firestore (systemConfig/app_branding) and local cache.
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { compressImageFile } from './fileCompressor';

export interface AppBranding {
  appName: string;
  subTitle: string;
  customLogoUrl: string | null;
  customBgUrl: string | null;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  footerTitle: string;
  footerDescription: string;
  footerBottomTitle: string;
  galleryTitle: string;
  galleryImages: Array<string | null>;
  footerAddress: string;
  footerContact: string;
  footerCopyright: string;
  creatorSignature: string;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'Intranet',
  subTitle: 'Hotel Ciputra Jakarta',
  customLogoUrl: null,
  customBgUrl: null,
  heroBadge: '',
  heroTitle: '',
  heroDescription: '',
  footerTitle: 'Hotel Ciputra Jakarta',
  footerDescription:
    'Portal Intranet Resmi Manajemen & Karyawan. Pusat akses dokumen SOP, formulir operasional, pengumuman internal, dan evaluasi kinerja terpadu.',
  footerBottomTitle: 'Intranet HCJ',
  galleryTitle: 'Galeri & Fasilitas Hotel',
  galleryImages: [null, null, null, null],
  footerAddress: 'Hospitality Operations & Human Capital Management Division',
  footerContact: 'Layanan Bantuan IT & HRD: it@hotelciputra.com',
  footerCopyright: '© 2026 Intranet HCJ • All Rights Reserved',
  creatorSignature: 'JBagas 2026 ttd',
  updatedAt: new Date().toISOString(),
};

const BRANDING_STORAGE_KEY = 'ciputra_intra_branding_v1';
const CONFIG_COLLECTION = 'systemConfig';
const BRANDING_DOC_ID = 'app_branding';
const BRANDING_GALLERY_DOC_ID = 'app_branding_gallery';

function normalizeGalleryImages(arr: unknown): Array<string | null> {
  if (!Array.isArray(arr)) return [null, null, null, null];
  return [0, 1, 2, 3].map((i) => (typeof arr[i] === 'string' && arr[i] ? arr[i] : null));
}

let currentBranding: AppBranding = (() => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BRANDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          appName: parsed.appName || DEFAULT_BRANDING.appName,
          subTitle: parsed.subTitle !== undefined ? parsed.subTitle : DEFAULT_BRANDING.subTitle,
          customLogoUrl:
            parsed.customLogoUrl !== undefined ? parsed.customLogoUrl : DEFAULT_BRANDING.customLogoUrl,
          customBgUrl:
            parsed.customBgUrl !== undefined ? parsed.customBgUrl : DEFAULT_BRANDING.customBgUrl,
          heroBadge: parsed.heroBadge !== undefined ? parsed.heroBadge : DEFAULT_BRANDING.heroBadge,
          heroTitle: parsed.heroTitle !== undefined ? parsed.heroTitle : DEFAULT_BRANDING.heroTitle,
          heroDescription:
            parsed.heroDescription !== undefined ? parsed.heroDescription : DEFAULT_BRANDING.heroDescription,
          footerTitle:
            parsed.footerTitle !== undefined ? parsed.footerTitle : DEFAULT_BRANDING.footerTitle,
          footerDescription:
            parsed.footerDescription !== undefined
              ? parsed.footerDescription
              : DEFAULT_BRANDING.footerDescription,
          footerBottomTitle:
            parsed.footerBottomTitle !== undefined
              ? parsed.footerBottomTitle
              : DEFAULT_BRANDING.footerBottomTitle,
          galleryTitle:
            parsed.galleryTitle !== undefined ? parsed.galleryTitle : DEFAULT_BRANDING.galleryTitle,
          galleryImages: normalizeGalleryImages(parsed.galleryImages),
          footerAddress:
            parsed.footerAddress !== undefined ? parsed.footerAddress : DEFAULT_BRANDING.footerAddress,
          footerContact:
            parsed.footerContact !== undefined ? parsed.footerContact : DEFAULT_BRANDING.footerContact,
          footerCopyright:
            parsed.footerCopyright !== undefined ? parsed.footerCopyright : DEFAULT_BRANDING.footerCopyright,
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
  if (lastLocalSaveTime > 0 && Date.now() - lastLocalSaveTime < 5000 && incomingTime < lastLocalSaveTime) {
    return currentBranding;
  }

  const updated: AppBranding = {
    appName: data.appName || currentBranding.appName || DEFAULT_BRANDING.appName,
    subTitle: data.subTitle !== undefined ? data.subTitle : currentBranding.subTitle,
    customLogoUrl: data.customLogoUrl !== undefined ? data.customLogoUrl : currentBranding.customLogoUrl,
    customBgUrl: data.customBgUrl !== undefined ? data.customBgUrl : currentBranding.customBgUrl,
    heroBadge: data.heroBadge !== undefined ? data.heroBadge : currentBranding.heroBadge,
    heroTitle: data.heroTitle !== undefined ? data.heroTitle : currentBranding.heroTitle,
    heroDescription:
      data.heroDescription !== undefined ? data.heroDescription : currentBranding.heroDescription,
    footerTitle: data.footerTitle !== undefined ? data.footerTitle : currentBranding.footerTitle,
    footerDescription:
      data.footerDescription !== undefined ? data.footerDescription : currentBranding.footerDescription,
    footerBottomTitle:
      data.footerBottomTitle !== undefined ? data.footerBottomTitle : currentBranding.footerBottomTitle,
    galleryTitle: data.galleryTitle !== undefined ? data.galleryTitle : currentBranding.galleryTitle,
    galleryImages:
      data.galleryImages !== undefined
        ? normalizeGalleryImages(data.galleryImages)
        : currentBranding.galleryImages,
    footerAddress: data.footerAddress !== undefined ? data.footerAddress : currentBranding.footerAddress,
    footerContact: data.footerContact !== undefined ? data.footerContact : currentBranding.footerContact,
    footerCopyright:
      data.footerCopyright !== undefined ? data.footerCopyright : currentBranding.footerCopyright,
    creatorSignature:
      data.creatorSignature || currentBranding.creatorSignature || DEFAULT_BRANDING.creatorSignature,
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

export async function fetchAppBrandingFromFirestore(): Promise<AppBranding> {
  if (!isFirebaseConfigured()) return currentBranding;
  if (lastLocalSaveTime > 0 && Date.now() - lastLocalSaveTime < 4000) {
    return currentBranding;
  }
  try {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    const galleryRef = doc(db, CONFIG_COLLECTION, BRANDING_GALLERY_DOC_ID);
    const [snap, gallerySnap] = await Promise.all([
      getDoc(docRef),
      getDoc(galleryRef).catch(() => null),
    ]);
    if (snap.exists()) {
      const mainData = snap.data() as Partial<AppBranding>;
      if (gallerySnap && gallerySnap.exists()) {
        const gData = gallerySnap.data();
        if (Array.isArray(gData?.galleryImages)) {
          mainData.galleryImages = gData.galleryImages;
        }
      }
      return applyIncomingBranding(mainData);
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
    const galleryRef = doc(db, CONFIG_COLLECTION, BRANDING_GALLERY_DOC_ID);
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
    onSnapshot(
      galleryRef,
      (snap) => {
        if (snap.exists()) {
          const gData = snap.data();
          if (Array.isArray(gData?.galleryImages)) {
            applyIncomingBranding({
              galleryImages: gData.galleryImages,
              updatedAt: gData.updatedAt || currentBranding.updatedAt,
            });
          }
        }
      },
      () => {}
    );
    isListenerActive = true;
  } catch (e) {
    console.warn('Failed to setup branding live listener:', e);
  }
}

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
    appName:
      newBranding.appName !== undefined
        ? newBranding.appName.trim()
        : currentBranding.appName || DEFAULT_BRANDING.appName,
    subTitle:
      newBranding.subTitle !== undefined
        ? newBranding.subTitle.trim()
        : currentBranding.subTitle || DEFAULT_BRANDING.subTitle,
    customLogoUrl:
      newBranding.customLogoUrl !== undefined
        ? newBranding.customLogoUrl
        : currentBranding.customLogoUrl || null,
    customBgUrl:
      newBranding.customBgUrl !== undefined
        ? newBranding.customBgUrl
        : currentBranding.customBgUrl || null,
    heroBadge:
      newBranding.heroBadge !== undefined
        ? newBranding.heroBadge.trim()
        : currentBranding.heroBadge ?? DEFAULT_BRANDING.heroBadge,
    heroTitle:
      newBranding.heroTitle !== undefined
        ? newBranding.heroTitle.trim()
        : currentBranding.heroTitle ?? DEFAULT_BRANDING.heroTitle,
    heroDescription:
      newBranding.heroDescription !== undefined
        ? newBranding.heroDescription.trim()
        : currentBranding.heroDescription ?? DEFAULT_BRANDING.heroDescription,
    footerTitle:
      newBranding.footerTitle !== undefined
        ? newBranding.footerTitle.trim()
        : currentBranding.footerTitle ?? DEFAULT_BRANDING.footerTitle,
    footerDescription:
      newBranding.footerDescription !== undefined
        ? newBranding.footerDescription.trim()
        : currentBranding.footerDescription ?? DEFAULT_BRANDING.footerDescription,
    footerBottomTitle:
      newBranding.footerBottomTitle !== undefined
        ? newBranding.footerBottomTitle.trim()
        : currentBranding.footerBottomTitle ?? DEFAULT_BRANDING.footerBottomTitle,
    galleryTitle:
      newBranding.galleryTitle !== undefined
        ? newBranding.galleryTitle.trim()
        : currentBranding.galleryTitle ?? DEFAULT_BRANDING.galleryTitle,
    galleryImages:
      newBranding.galleryImages !== undefined
        ? normalizeGalleryImages(newBranding.galleryImages)
        : currentBranding.galleryImages ?? [null, null, null, null],
    footerAddress:
      newBranding.footerAddress !== undefined
        ? newBranding.footerAddress.trim()
        : currentBranding.footerAddress ?? DEFAULT_BRANDING.footerAddress,
    footerContact:
      newBranding.footerContact !== undefined
        ? newBranding.footerContact.trim()
        : currentBranding.footerContact ?? DEFAULT_BRANDING.footerContact,
    footerCopyright:
      newBranding.footerCopyright !== undefined
        ? newBranding.footerCopyright.trim()
        : currentBranding.footerCopyright ?? DEFAULT_BRANDING.footerCopyright,
    creatorSignature:
      newBranding.creatorSignature !== undefined
        ? newBranding.creatorSignature.trim()
        : currentBranding.creatorSignature || DEFAULT_BRANDING.creatorSignature,
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

  notifySubscribers(updated);

  if (isFirebaseConfigured()) {
    const docRef = doc(db, CONFIG_COLLECTION, BRANDING_DOC_ID);
    const galleryRef = doc(db, CONFIG_COLLECTION, BRANDING_GALLERY_DOC_ID);

    const galleryBytes = JSON.stringify(updated.galleryImages || []).length;
    const bgBytes = (updated.customBgUrl || '').length;
    const splitGallery = galleryBytes + bgBytes > 600000;

    const cleanPayload: Record<string, any> = {
      appName: updated.appName,
      subTitle: updated.subTitle,
      customLogoUrl: updated.customLogoUrl,
      customBgUrl: updated.customBgUrl,
      heroBadge: updated.heroBadge,
      heroTitle: updated.heroTitle,
      heroDescription: updated.heroDescription,
      footerTitle: updated.footerTitle,
      footerDescription: updated.footerDescription,
      footerBottomTitle: updated.footerBottomTitle,
      galleryTitle: updated.galleryTitle,
      galleryImages: splitGallery ? [null, null, null, null] : updated.galleryImages,
      footerAddress: updated.footerAddress,
      footerContact: updated.footerContact,
      footerCopyright: updated.footerCopyright,
      creatorSignature: updated.creatorSignature,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy || '',
    };

    const writeOps: Promise<any>[] = [
      setDoc(docRef, cleanPayload, { merge: true }).catch((err: any) => {
        console.error('Firestore branding save error:', err);
      }),
      setDoc(
        galleryRef,
        {
          galleryImages: updated.galleryImages,
          updatedAt: updated.updatedAt,
          updatedBy: updated.updatedBy || '',
        },
        { merge: true }
      ).catch((err: any) => {
        console.error('Firestore branding gallery save error:', err);
      }),
    ];

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 3000);
    });

    await Promise.race([Promise.all(writeOps), timeoutPromise]);
  }

  return updated;
}

export async function uploadCustomLogo(file: File, actorEmail?: string): Promise<string> {
  const result = await compressImageFile(file, 260, 0.85);
  await saveAppBranding({ customLogoUrl: result.dataUrl }, actorEmail);
  return result.dataUrl;
}

export async function resetCustomLogo(actorEmail?: string): Promise<void> {
  await saveAppBranding({ customLogoUrl: null }, actorEmail);
}

export async function uploadCustomBg(file: File, actorEmail?: string): Promise<string> {
  const result = await compressImageFile(file, 1200, 0.72);
  await saveAppBranding({ customBgUrl: result.dataUrl }, actorEmail);
  return result.dataUrl;
}

export async function resetCustomBg(actorEmail?: string): Promise<void> {
  await saveAppBranding({ customBgUrl: null }, actorEmail);
}

export async function uploadGalleryImage(
  index: number,
  file: File,
  actorEmail?: string
): Promise<string> {
  const result = await compressImageFile(file, 440, 0.72);
  const nextGallery = [...(currentBranding.galleryImages || [null, null, null, null])];
  nextGallery[index] = result.dataUrl;
  await saveAppBranding({ galleryImages: nextGallery }, actorEmail);
  return result.dataUrl;
}

export async function resetGalleryImage(index: number, actorEmail?: string): Promise<void> {
  const nextGallery = [...(currentBranding.galleryImages || [null, null, null, null])];
  nextGallery[index] = null;
  await saveAppBranding({ galleryImages: nextGallery }, actorEmail);
}
