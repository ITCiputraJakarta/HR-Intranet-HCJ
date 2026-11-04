/**
 * Branding, Custom Logo, Hotel Hero Photo, Hero Editorial Text & Bottom Gallery Footer Management for Intranet HCJ
 * Synchronized with Firebase Firestore (systemConfig/app_branding) and local cache.
 */

import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { compressImageFile } from './fileCompressor';
import { SocialMediaItem } from '../types';

export interface GalleryItemCaption {
  tag: string;
  title: string;
  subtitle: string;
}

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
  galleryCaptions: GalleryItemCaption[];
  socialLinks: SocialMediaItem[];
  footerAddress: string;
  footerContact: string;
  footerCopyright: string;
  creatorSignature: string;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_SOCIAL_LINKS: SocialMediaItem[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://instagram.com/hotelciputrajkt',
    enabled: true,
    handle: '@hotelciputrajkt',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://facebook.com/hotelciputrajakarta',
    enabled: true,
    handle: 'Hotel Ciputra Jakarta',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://linkedin.com/company/hotel-ciputra-jakarta',
    enabled: true,
    handle: 'Hotel Ciputra Jakarta',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://youtube.com/@hotelciputrajakarta',
    enabled: true,
    handle: '@hotelciputrajakarta',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: 'https://tiktok.com/@hotelciputrajakarta',
    enabled: false,
    handle: '@hotelciputrajakarta',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    url: 'https://x.com/hotelciputrajkt',
    enabled: false,
    handle: '@hotelciputrajkt',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Hotline',
    url: 'https://wa.me/62215660640',
    enabled: true,
    handle: '+62 21 566 0640',
  },
];

export function normalizeSocialLinks(arr: unknown): SocialMediaItem[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    return DEFAULT_SOCIAL_LINKS.map((s) => ({ ...s }));
  }
  return DEFAULT_SOCIAL_LINKS.map((def) => {
    const found = arr.find((item: any) => item && (item.id === def.id || item.name?.toLowerCase() === def.name.toLowerCase()));
    if (found) {
      return {
        id: def.id,
        name: def.name,
        url: typeof found.url === 'string' && found.url.trim() ? found.url.trim() : def.url,
        enabled: typeof found.enabled === 'boolean' ? found.enabled : def.enabled,
        handle: typeof found.handle === 'string' ? found.handle.trim() : def.handle,
      };
    }
    return { ...def };
  });
}

export const DEFAULT_GALLERY_CAPTIONS: GalleryItemCaption[] = [
  {
    tag: 'SUITES & ACCOMMODATION',
    title: 'Executive & Presidential Suites',
    subtitle: 'Kemewahan akomodasi berstandar internasional dengan panorama cakrawala kota Jakarta.',
  },
  {
    tag: 'SKYPOOL & WELLNESS',
    title: 'Tropical Oasis & Infinity Pool',
    subtitle: 'Fasilitas rekreasi dan kebugaran eksklusif di jantung pusat bisnis dan perbelanjaan.',
  },
  {
    tag: 'FINE DINING & LOUNGE',
    title: 'The Gallery & Artisan Culinary',
    subtitle: 'Sajian kuliner berkelas dunia oleh tim chef profesional dengan cita rasa autentik.',
  },
  {
    tag: 'GRAND BALLROOM & MICE',
    title: 'Grand Ballroom & Executive Events',
    subtitle: 'Venue konferensi, pertemuan eksekutif, dan perhelatan megah berkapasitas penuh.',
  },
];

export const DEFAULT_BRANDING: AppBranding = {
  appName: 'Intranet HCJ',
  subTitle: 'Hotel Ciputra Jakarta',
  customLogoUrl: null,
  customBgUrl: null,
  heroBadge: 'LUXURY HOSPITALITY • SWISS-BELHOTEL INTERNATIONAL',
  heroTitle: 'Keanggunan Layanan & Standar Operasional Kelas Dunia',
  heroDescription:
    'Selamat datang di Portal Digital Eksekutif & Karyawan Hotel Ciputra Jakarta. Pusat integrasi standar prosedur operasional (SOP), manajemen mutu layanan perhotelan, dan kolaborasi lintas departemen.',
  footerTitle: 'Hotel Ciputra Jakarta',
  footerDescription:
    'Sistem Informasi Intranet Terpadu. Seluruh dokumen, standar prosedur operasional (SOP), dan formulir di dalam portal ini bersifat rahasia untuk keperluan internal.',
  footerBottomTitle: 'Intranet HCJ',
  galleryTitle: 'Destinasi & Fasilitas Unggulan Hotel',
  galleryImages: [null, null, null, null],
  galleryCaptions: DEFAULT_GALLERY_CAPTIONS,
  socialLinks: DEFAULT_SOCIAL_LINKS,
  footerAddress: 'Hospitality Operations & Human Capital Management Division',
  footerContact: 'Layanan Bantuan IT & HRD: it@hotelciputra.com',
  footerCopyright: '© 2026 Intranet HCJ JBagas • All Rights Reserved',
  creatorSignature: 'JBagas',
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

function normalizeGalleryCaptions(arr: unknown): GalleryItemCaption[] {
  if (!Array.isArray(arr)) return DEFAULT_GALLERY_CAPTIONS.map((c) => ({ ...c }));
  return [0, 1, 2, 3].map((i) => {
    const item = arr[i] as Partial<GalleryItemCaption> | undefined;
    const def = DEFAULT_GALLERY_CAPTIONS[i];
    return {
      tag: typeof item?.tag === 'string' && item.tag.trim() ? item.tag.trim() : def.tag,
      title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : def.title,
      subtitle:
        typeof item?.subtitle === 'string' && item.subtitle.trim()
          ? item.subtitle.trim()
          : def.subtitle,
    };
  });
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
          customBgUrl: null,
          heroBadge:
            parsed.heroBadge && parsed.heroBadge.trim()
              ? parsed.heroBadge
              : DEFAULT_BRANDING.heroBadge,
          heroTitle:
            parsed.heroTitle && parsed.heroTitle.trim()
              ? parsed.heroTitle
              : DEFAULT_BRANDING.heroTitle,
          heroDescription:
            parsed.heroDescription && parsed.heroDescription.trim()
              ? parsed.heroDescription
              : DEFAULT_BRANDING.heroDescription,
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
          galleryCaptions: normalizeGalleryCaptions(parsed.galleryCaptions),
          socialLinks: normalizeSocialLinks(parsed.socialLinks),
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
    heroBadge:
      data.heroBadge !== undefined && data.heroBadge.trim()
        ? data.heroBadge
        : currentBranding.heroBadge || DEFAULT_BRANDING.heroBadge,
    heroTitle:
      data.heroTitle !== undefined && data.heroTitle.trim()
        ? data.heroTitle
        : currentBranding.heroTitle || DEFAULT_BRANDING.heroTitle,
    heroDescription:
      data.heroDescription !== undefined && data.heroDescription.trim()
        ? data.heroDescription
        : currentBranding.heroDescription || DEFAULT_BRANDING.heroDescription,
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
    galleryCaptions:
      data.galleryCaptions !== undefined
        ? normalizeGalleryCaptions(data.galleryCaptions)
        : currentBranding.galleryCaptions,
    socialLinks:
      data.socialLinks !== undefined
        ? normalizeSocialLinks(data.socialLinks)
        : currentBranding.socialLinks || DEFAULT_SOCIAL_LINKS,
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
        if (Array.isArray(gData?.galleryCaptions)) {
          mainData.galleryCaptions = gData.galleryCaptions;
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
          const patch: Partial<AppBranding> = {
            updatedAt: gData.updatedAt || currentBranding.updatedAt,
          };
          if (Array.isArray(gData?.galleryImages)) {
            patch.galleryImages = gData.galleryImages;
          }
          if (Array.isArray(gData?.galleryCaptions)) {
            patch.galleryCaptions = gData.galleryCaptions;
          }
          applyIncomingBranding(patch);
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
    galleryCaptions:
      newBranding.galleryCaptions !== undefined
        ? normalizeGalleryCaptions(newBranding.galleryCaptions)
        : currentBranding.galleryCaptions ?? DEFAULT_GALLERY_CAPTIONS,
    socialLinks:
      newBranding.socialLinks !== undefined
        ? normalizeSocialLinks(newBranding.socialLinks)
        : currentBranding.socialLinks ?? DEFAULT_SOCIAL_LINKS,
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
      galleryCaptions: updated.galleryCaptions,
      footerAddress: updated.footerAddress,
      footerContact: updated.footerContact,
      footerCopyright: updated.footerCopyright,
      creatorSignature: updated.creatorSignature,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy || '',
    };

    const hasCustomGalleryImages =
      Array.isArray(updated.galleryImages) && updated.galleryImages.some((img) => Boolean(img));

    const writeOps: Promise<any>[] = [
      setDoc(docRef, cleanPayload, { merge: true }).catch((err: any) => {
        console.error('Firestore branding save error:', err);
      }),
    ];

    if (hasCustomGalleryImages) {
      writeOps.push(
        setDoc(
          galleryRef,
          {
            galleryImages: updated.galleryImages,
            galleryCaptions: updated.galleryCaptions,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy || '',
          },
          { merge: true }
        ).catch((err: any) => {
          console.error('Firestore branding gallery save error:', err);
        })
      );
    }

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
