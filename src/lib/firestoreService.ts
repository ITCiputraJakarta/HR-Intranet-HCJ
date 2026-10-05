import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  User,
  IntranetDocument,
  AccessLog,
  CategoryMaster,
  DepartmentMaster,
  KPIMasterItem,
  PerformanceAppraisal,
  PushNotification,
  HotelUnitMaster
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_CATEGORIES,
  INITIAL_DEPARTMENTS,
  INITIAL_KPIS,
  INITIAL_PERFORMANCES,
  INITIAL_NOTIFICATIONS,
  HOTEL_UNITS
} from '../data/initialData';

// Collection references
const USERS_COL = 'users';
const DOCS_COL = 'documents';
const LOGS_COL = 'accessLogs';
const CATS_COL = 'categories';
const DEPTS_COL = 'departments';
const KPIS_COL = 'kpiMaster';
const PERFS_COL = 'performances';
const NOTIFS_COL = 'notifications';
const CONFIG_COL = 'systemConfig';

// =========================================================================
// CONNECTION STATE & DIAGNOSTICS
// =========================================================================

export type FirebaseConnectionState =
  | 'checking'
  | 'connected'
  | 'permission_denied'
  | 'not_found'
  | 'offline'
  | 'error';

export interface FirebaseDiagnosticReport {
  success: boolean;
  status: 'CONNECTED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'OFFLINE' | 'CONFIG_ERROR' | 'UNKNOWN';
  title: string;
  message: string;
  details?: string;
  troubleshootingSteps: string[];
}

let currentFirebaseState: FirebaseConnectionState = 'checking';
let lastErrorMessage = '';
const stateListeners: Array<(state: FirebaseConnectionState, message?: string) => void> = [];

export function onFirebaseStateChange(
  callback: (state: FirebaseConnectionState, message?: string) => void
): () => void {
  stateListeners.push(callback);
  callback(currentFirebaseState, lastErrorMessage);
  return () => {
    const idx = stateListeners.indexOf(callback);
    if (idx !== -1) stateListeners.splice(idx, 1);
  };
}

export function notifyFirebaseState(state: FirebaseConnectionState, message: string = '') {
  currentFirebaseState = state;
  lastErrorMessage = message;
  stateListeners.forEach((fn) => {
    try {
      fn(state, message);
    } catch (e) {
      console.warn('Listener error:', e);
    }
  });
}

/**
 * Check Firebase connection status (alias for testFirestoreConnection)
 */
export async function checkFirebaseConnection(): Promise<{ connected: boolean; message: string }> {
  const rep = await testFirestoreConnection();
  return {
    connected: rep.success,
    message: rep.message,
  };
}

/**
 * Perform a live diagnostic probe against Cloud Firestore
 */
export async function testFirestoreConnection(): Promise<FirebaseDiagnosticReport> {
  if (!isFirebaseConfigured()) {
    notifyFirebaseState('error', 'Konfigurasi Firebase belum lengkap.');
    return {
      success: false,
      status: 'CONFIG_ERROR',
      title: 'Konfigurasi Firebase Belum Lengkap',
      message: 'Project ID atau API Key Firebase belum tersedia pada konfigurasi aplikasi.',
      troubleshootingSteps: [
        'Buka tab "Kredensial Firebase" di dialog pengaturan ini.',
        'Pastikan API Key dan Project ID (hr-intranet-31ff4) terisi dengan benar.',
        'Klik Simpan Kredensial.'
      ],
    };
  }

  try {
    const testQuery = query(collection(db, USERS_COL), limit(1));
    const snap = await getDocs(testQuery);

    notifyFirebaseState('connected', 'Terhubung ke Cloud Firestore');
    return {
      success: true,
      status: 'CONNECTED',
      title: 'Koneksi Cloud Firestore Berhasil!',
      message: `Terhubung sukses ke project Firebase. Koleksi "${USERS_COL}" dapat diakses (${snap.empty ? 'koleksi kosong, siap inisialisasi master data' : `${snap.size} sampel dokumen terverifikasi`}).`,
      troubleshootingSteps: [],
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorCode = error?.code || '';

    if (
      errorCode === 'permission-denied' ||
      errorMsg.includes('permission') ||
      errorMsg.includes('Missing or insufficient permissions')
    ) {
      notifyFirebaseState('permission_denied', 'Aturan keamanan (Rules) memblokir akses.');
      return {
        success: false,
        status: 'PERMISSION_DENIED',
        title: 'Izin Akses Ditolak (Security Rules)',
        message: 'Aplikasi berhasil menghubungi project Firebase Anda, namun Security Rules di Firebase Console memblokir akses baca/tulis.',
        details: errorMsg,
        troubleshootingSteps: [
          'Buka Firebase Console di https://console.firebase.google.com/project/hr-intranet-31ff4/firestore/rules',
          'Pilih menu Build > Firestore Database > Tab "Rules".',
          'Ubah aturan menjadi: allow read, write: if true;',
          'Klik tombol "Publish" di Firebase Console.',
          'Kembali ke portal ini dan klik "Uji Koneksi Ulang".'
        ],
      };
    }

    if (
      errorCode === 'not-found' ||
      errorMsg.includes('not found') ||
      errorMsg.includes('does not exist')
    ) {
      notifyFirebaseState('not_found', 'Database Firestore belum dibuat.');
      return {
        success: false,
        status: 'NOT_FOUND',
        title: 'Database Cloud Firestore Belum Dibuat',
        message: 'Database Cloud Firestore belum diaktifkan pada project hr-intranet-31ff4.',
        details: errorMsg,
        troubleshootingSteps: [
          'Buka Firebase Console di https://console.firebase.google.com/project/hr-intranet-31ff4',
          'Di menu sebelah kiri, klik Build > Firestore Database.',
          'Klik tombol "Create Database".',
          'Pilih lokasi server (misal: asia-southeast2 / Jakarta atau asia-southeast1 / Singapore).',
          'Pilih Start in test mode (atau Production mode dengan izin baca/tulis).',
          'Setelah database aktif, uji koneksi kembali di sini.'
        ],
      };
    }

    if (
      errorCode === 'unavailable' ||
      errorMsg.includes('offline') ||
      errorMsg.includes('network')
    ) {
      notifyFirebaseState('offline', 'Koneksi jaringan terputus atau offline.');
      return {
        success: false,
        status: 'OFFLINE',
        title: 'Jaringan atau Server Firestore Tidak Dapat Dijangkau',
        message: 'Klien browser sedang offline atau server Firestore tidak merespons.',
        details: errorMsg,
        troubleshootingSteps: [
          'Periksa koneksi internet Anda.',
          'Data lokal di browser Anda tetap aman dan sistem tetap berjalan dalam mode offline.'
        ],
      };
    }

    notifyFirebaseState('error', errorMsg);
    return {
      success: false,
      status: 'UNKNOWN',
      title: 'Galat Koneksi Firebase',
      message: errorMsg || 'Terjadi galat saat menghubungi Firestore.',
      details: errorMsg,
      troubleshootingSteps: [
        'Pastikan API Key dan Project ID di Firebase Console cocok.',
        'Periksa apakah Cloud Firestore API aktif di Google Cloud Console.'
      ],
    };
  }
}

/**
 * Seed initial data to Firestore if the database is newly initialized or force requested
 */
export async function seedInitialFirestoreData(force: boolean = false): Promise<{ seeded: boolean; message: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { seeded: false, message: 'Konfigurasi Firebase belum lengkap.' };
  }

  try {
    if (!force) {
      const [usersSnapshot, docsSnapshot] = await Promise.all([
        getDocs(query(collection(db, USERS_COL), limit(1))),
        getDocs(query(collection(db, DOCS_COL), limit(1))),
      ]);
      if (!usersSnapshot.empty || !docsSnapshot.empty) {
        notifyFirebaseState('connected');
        return { seeded: true, message: 'Firestore sudah memiliki data master Hotel Ciputra Jakarta.' };
      }
    }

    console.log('Seeding initial Hotel Ciputra Jakarta data into Firestore...');
    const batch = writeBatch(db);

    // 1. Seed Users (respect deleted IDs)
    INITIAL_USERS.forEach((u) => {
      if (!isFirestoreIdDeleted(u.id)) {
        batch.set(doc(db, USERS_COL, u.id), u, { merge: true });
      }
    });

    // 2. Seed Departments
    INITIAL_DEPARTMENTS.forEach((d) => {
      if (!isFirestoreIdDeleted(d.id)) {
        batch.set(doc(db, DEPTS_COL, d.id), d, { merge: true });
      }
    });

    // 3. Seed Categories
    INITIAL_CATEGORIES.forEach((c) => {
      if (!isFirestoreIdDeleted(c.id)) {
        batch.set(doc(db, CATS_COL, c.id), c, { merge: true });
      }
    });

    // 4. Seed Documents (Firestore Native Storage)
    INITIAL_DOCUMENTS.forEach((docItem) => {
      if (!isFirestoreIdDeleted(docItem.id)) {
        batch.set(doc(db, DOCS_COL, docItem.id), sanitizeForFirestore(docItem), { merge: true });
      }
    });

    // 5. Seed KPIs
    INITIAL_KPIS.forEach((k) => {
      if (!isFirestoreIdDeleted(k.id)) {
        batch.set(doc(db, KPIS_COL, k.id), k, { merge: true });
      }
    });

    // 6. Seed Performances
    INITIAL_PERFORMANCES.forEach((p) => {
      if (!isFirestoreIdDeleted(p.id)) {
        batch.set(doc(db, PERFS_COL, p.id), p, { merge: true });
      }
    });

    // 7. Seed Notifications
    INITIAL_NOTIFICATIONS.forEach((n) => {
      if (!isFirestoreIdDeleted(n.id)) {
        batch.set(doc(db, NOTIFS_COL, n.id), n, { merge: true });
      }
    });

    // 8. Seed Default System Config (Firestore Native Storage settings)
    batch.set(
      doc(db, CONFIG_COL, 'storage_settings'),
      {
        id: 'storage_settings',
        provider: 'firestore',
        maxFileSizeMb: 15,
        autoPruneDays: 7,
        autoSyncEnabled: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 9. Seed Default Hotel Units Master
    batch.set(
      doc(db, CONFIG_COL, 'hotel_units_master'),
      {
        id: 'hotel_units_master',
        units: HOTEL_UNITS,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();
    notifyFirebaseState('connected');
    console.log('Firestore seeding completed successfully!');
    return { seeded: true, message: 'Data master awal Hotel Ciputra Jakarta berhasil disimpan ke Firebase Firestore!' };
  } catch (error: any) {
    console.warn('Error during Firestore seed:', error);
    const msg = error?.message || 'Gagal melakukan inisialisasi Firestore.';
    let humanReadable = msg;
    if (error?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      humanReadable = 'Izin akses ditolak: Security Rules di Firebase Console memblokir penulisan. Silakan publish aturan "allow read, write: if true;" di tab Rules Firebase Console.';
      notifyFirebaseState('permission_denied', humanReadable);
    } else if (error?.code === 'not-found' || msg.includes('does not exist')) {
      humanReadable = 'Database Firestore belum dibuat pada project hr-intranet-31ff4.';
      notifyFirebaseState('not_found', humanReadable);
    } else {
      notifyFirebaseState('error', msg);
    }
    return { seeded: false, message: humanReadable, error: msg };
  }
}

// =========================================================================
// DELETED IDS TOMBSTONE REGISTRY & PENDING WRITE GUARD
// =========================================================================

const DELETED_IDS_STORAGE_KEY = 'ciputra_deleted_ids_v1';
let memoryDeletedIds: Set<string> | null = null;
const pendingDocumentSaves = new Map<string, { doc: IntranetDocument; timestamp: number }>();
const reassembledChunkCache = new Map<string, { fileUrl?: string; attachmentUrl?: string }>();

function getDeletedIdsSet(): Set<string> {
  if (memoryDeletedIds) return memoryDeletedIds;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryDeletedIds = new Set(parsed);
          return memoryDeletedIds;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  memoryDeletedIds = new Set<string>();
  return memoryDeletedIds;
}

export function markFirestoreIdDeleted(id: string): void {
  if (!id) return;
  const set = getDeletedIdsSet();
  set.add(id);
  pendingDocumentSaves.delete(id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // Ignore storage errors
    }
  }
}

export function unmarkFirestoreIdDeleted(id: string): void {
  if (!id) return;
  const set = getDeletedIdsSet();
  if (set.has(id)) {
    set.delete(id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
      } catch {}
    }
  }
}

export function isFirestoreIdDeleted(id: string): boolean {
  if (!id) return false;
  return getDeletedIdsSet().has(id);
}

// =========================================================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// =========================================================================

function handleSubscriptionError(name: string, err: any) {
  console.warn(`${name} subscription notice:`, err?.message || err);
  if (err?.code === 'permission-denied' || String(err).includes('permission')) {
    notifyFirebaseState('permission_denied', 'Aturan keamanan Firebase membatasi akses');
  } else if (err?.code === 'not-found' || String(err).includes('not found')) {
    notifyFirebaseState('not_found', 'Database Firestore belum dibuat');
  } else if (err?.code === 'unavailable') {
    notifyFirebaseState('offline', 'Jaringan sedang offline');
  }
}

export function subscribeToUsers(onUpdate: (users: User[]) => void): () => void {
  try {
    const q = collection(db, USERS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: User[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as User;
          const id = data.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...data, id });
          }
        });
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          if (items.length > 0) {
            onUpdate(items);
          }
        }
      },
      (err) => handleSubscriptionError('Users', err)
    );
  } catch (e) {
    handleSubscriptionError('Users init', e);
    return () => {};
  }
}

async function hydrateChunkedDocument(docItem: any): Promise<IntranetDocument> {
  const cacheKey = `${docItem.id}_${docItem.updatedAt || docItem.uploadedAt || ''}`;
  const cached = reassembledChunkCache.get(cacheKey);
  if (cached) {
    const fileUrl = cached.fileUrl || docItem.fileUrl || '';
    const attachmentUrl = cached.attachmentUrl || docItem.attachmentUrl;
    return {
      ...docItem,
      fileUrl,
      previewUrl: fileUrl || docItem.previewUrl || '',
      downloadUrl: fileUrl || docItem.downloadUrl || '',
      thumbUrl: docItem.thumbUrl || (docItem.fileType?.startsWith('image/') ? fileUrl : ''),
      ...(attachmentUrl ? { attachmentUrl } : {}),
    };
  }

  try {
    const chunksSnap = await getDocs(collection(db, DOCS_COL, docItem.id, 'chunks'));
    if (!chunksSnap.empty) {
      const fileChunks: { index: number; data: string }[] = [];
      const attChunks: { index: number; data: string }[] = [];
      chunksSnap.forEach((c) => {
        const cData = c.data();
        if (cData.field === 'attachmentUrl') {
          attChunks.push({ index: Number(cData.index || 0), data: String(cData.data || '') });
        } else {
          fileChunks.push({ index: Number(cData.index || 0), data: String(cData.data || '') });
        }
      });

      fileChunks.sort((a, b) => a.index - b.index);
      attChunks.sort((a, b) => a.index - b.index);

      const fullFileUrl = fileChunks.length > 0 ? fileChunks.map((c) => c.data).join('') : (docItem.fileUrl || '');
      const fullAttUrl = attChunks.length > 0 ? attChunks.map((c) => c.data).join('') : docItem.attachmentUrl;

      reassembledChunkCache.set(cacheKey, {
        fileUrl: fullFileUrl,
        attachmentUrl: fullAttUrl,
      });

      return {
        ...docItem,
        fileUrl: fullFileUrl,
        previewUrl: fullFileUrl || docItem.previewUrl || '',
        downloadUrl: fullFileUrl || docItem.downloadUrl || '',
        thumbUrl: docItem.thumbUrl || (docItem.fileType?.startsWith('image/') ? fullFileUrl : ''),
        ...(fullAttUrl ? { attachmentUrl: fullAttUrl } : {}),
      };
    }
  } catch (e) {
    console.warn('[Firestore] Failed to hydrate document chunks:', docItem.id, e);
  }

  const fallbackUrl = docItem.fileUrl || '';
  return {
    ...docItem,
    previewUrl: docItem.previewUrl || fallbackUrl,
    downloadUrl: docItem.downloadUrl || fallbackUrl,
    thumbUrl: docItem.thumbUrl || (docItem.fileType?.startsWith('image/') ? fallbackUrl : ''),
  };
}

/**
 * Fetch full file (reassembling chunks if needed) for viewing or downloading
 */
export async function fetchDocumentFullFile(docItem: IntranetDocument): Promise<IntranetDocument> {
  if (docItem.fileUrl && docItem.fileUrl.length > 50) {
    return docItem;
  }
  return hydrateChunkedDocument(docItem);
}

export function subscribeToDocuments(onUpdate: (docs: IntranetDocument[]) => void): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const q = collection(db, DOCS_COL);
    return onSnapshot(
      q,
      async (snapshot) => {
        const rawItems: any[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as any;
          const id = item?.id || d.id;
          if (item && id && !isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            rawItems.push({ ...item, id });
          }
        });

        const hydratedItems: IntranetDocument[] = await Promise.all(
          rawItems.map(async (item) => {
            if (item.isChunkedFile || item.isChunkedAttachment) {
              return hydrateChunkedDocument(item);
            }
            const fileUrl = item.fileUrl || item.downloadUrl || item.previewUrl || '';
            return {
              ...item,
              fileUrl,
              previewUrl: item.previewUrl || fileUrl,
              downloadUrl: item.downloadUrl || fileUrl,
              thumbUrl: item.thumbUrl || (item.fileType?.startsWith('image/') ? fileUrl : ''),
            } as IntranetDocument;
          })
        );

        // Merge any in-flight/recently saved local documents so newly uploaded SOP/Formulir never disappear while syncing
        const now = Date.now();
        const existingIds = new Set(hydratedItems.map((i) => i.id));
        pendingDocumentSaves.forEach((entry, docId) => {
          if (now - entry.timestamp > 15000) {
            pendingDocumentSaves.delete(docId);
          } else if (!isFirestoreIdDeleted(docId) && !existingIds.has(docId)) {
            hydratedItems.push(entry.doc);
          } else if (existingIds.has(docId)) {
            // Ensure local full fileUrl is preserved if chunk upload is still finishing
            const idx = hydratedItems.findIndex((i) => i.id === docId);
            if (idx !== -1 && !hydratedItems[idx].fileUrl && entry.doc.fileUrl) {
              hydratedItems[idx] = entry.doc;
            }
          }
        });

        hydratedItems.sort(
          (a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
        );
        notifyFirebaseState('connected');
        onUpdate(hydratedItems);
      },
      (err) => handleSubscriptionError('Docs', err)
    );
  } catch (e) {
    handleSubscriptionError('Docs init', e);
    return () => {};
  }
}

const THREE_MONTHS_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 hari (3 bulan)

export function subscribeToAccessLogs(onUpdate: (logs: AccessLog[]) => void): () => void {
  try {
    const q = query(collection(db, LOGS_COL), limit(500));
    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const items: AccessLog[] = [];
        snapshot.forEach((d) => {
          const log = { ...(d.data() as AccessLog), id: (d.data() as AccessLog).id || d.id };
          const logTime = new Date(log.timestamp).getTime();
          if (!isNaN(logTime) && now - logTime > THREE_MONTHS_RETENTION_MS) {
            // Auto-delete logs older than 3 months from Firestore so storage never fills up
            deleteDoc(doc(db, LOGS_COL, d.id)).catch(() => {});
          } else if (!isFirestoreIdDeleted(log.id)) {
            items.push(log);
          }
        });
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        notifyFirebaseState('connected');
        onUpdate(items);
      },
      (err) => handleSubscriptionError('Logs', err)
    );
  } catch (e) {
    handleSubscriptionError('Logs init', e);
    return () => {};
  }
}

export function subscribeToDepartments(onUpdate: (depts: DepartmentMaster[]) => void): () => void {
  try {
    const q = collection(db, DEPTS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: DepartmentMaster[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as DepartmentMaster;
          const id = item.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...item, id });
          }
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          if (items.length > 0) {
            onUpdate(items);
          }
        }
      },
      (err) => handleSubscriptionError('Depts', err)
    );
  } catch (e) {
    handleSubscriptionError('Depts init', e);
    return () => {};
  }
}

export function subscribeToCategories(onUpdate: (cats: CategoryMaster[]) => void): () => void {
  try {
    const q = collection(db, CATS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: CategoryMaster[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as CategoryMaster;
          const id = item.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...item, id });
          }
        });
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('Cats', err)
    );
  } catch (e) {
    handleSubscriptionError('Cats init', e);
    return () => {};
  }
}

export function subscribeToKPIs(onUpdate: (kpis: KPIMasterItem[]) => void): () => void {
  try {
    const q = collection(db, KPIS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: KPIMasterItem[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as KPIMasterItem;
          const id = item.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...item, id });
          }
        });
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('KPIs', err)
    );
  } catch (e) {
    handleSubscriptionError('KPIs init', e);
    return () => {};
  }
}

export function subscribeToPerformances(onUpdate: (perfs: PerformanceAppraisal[]) => void): () => void {
  try {
    const q = collection(db, PERFS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: PerformanceAppraisal[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as PerformanceAppraisal;
          const id = item.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...item, id });
          }
        });
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('Perfs', err)
    );
  } catch (e) {
    handleSubscriptionError('Perfs init', e);
    return () => {};
  }
}

export function subscribeToNotifications(onUpdate: (notifs: PushNotification[]) => void): () => void {
  try {
    const q = collection(db, NOTIFS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: PushNotification[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as PushNotification;
          const id = item.id || d.id;
          if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
            items.push({ ...item, id });
          }
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (items.length > 0 || !snapshot.metadata.fromCache) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('Notifs', err)
    );
  } catch (e) {
    handleSubscriptionError('Notifs init', e);
    return () => {};
  }
}

export function subscribeToSystemConfig(onUpdate: (cfg: any) => void): () => void {
  try {
    const docRef = doc(db, CONFIG_COL, 'drive_storage_config');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          notifyFirebaseState('connected');
          onUpdate(docSnap.data());
        }
      },
      (err) => handleSubscriptionError('Config', err)
    );
  } catch (e) {
    handleSubscriptionError('Config init', e);
    return () => {};
  }
}

export function subscribeToHotelUnits(onUpdate: (units: HotelUnitMaster[]) => void): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const docRef = doc(db, CONFIG_COL, 'hotel_units_master');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.units) && data.units.length > 0) {
            notifyFirebaseState('connected');
            onUpdate(data.units as HotelUnitMaster[]);
          }
        }
      },
      (err) => handleSubscriptionError('HotelUnits', err)
    );
  } catch (e) {
    handleSubscriptionError('HotelUnits init', e);
    return () => {};
  }
}

// =========================================================================
// FIRESTORE CRUD OPERATIONS
// =========================================================================

// Users
export async function firestoreSaveUser(user: User): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(user.id);
  try {
    const cleanUser = sanitizeForFirestore(user);
    const writePromise = setDoc(doc(db, USERS_COL, user.id), cleanUser, { merge: true }).then(() => {
      console.log('[Firestore] User saved successfully:', user.id, user.email, user.status);
    });
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 2500);
    });
    await Promise.race([writePromise, timeoutPromise]);
  } catch (err) {
    console.warn('firestoreSaveUser error:', err);
  }
}

export async function firestoreDeleteUser(userId: string): Promise<void> {
  markFirestoreIdDeleted(userId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (err) {
    console.warn('firestoreDeleteUser error:', err);
  }
}

export async function firestoreFetchUsers(): Promise<User[]> {
  if (!isFirebaseConfigured()) return [];
  try {
    const snap = await getDocs(collection(db, USERS_COL));
    const items: User[] = [];
    snap.forEach((d) => {
      const u = d.data() as User;
      const id = u.id || d.id;
      if (u && u.email && !isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        items.push({ ...u, id });
      }
    });
    return items;
  } catch (err) {
    console.warn('firestoreFetchUsers error:', err);
    return [];
  }
}

export async function firestoreFindUserByEmail(email: string): Promise<User | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const snap = await getDocs(collection(db, USERS_COL));
    for (const d of snap.docs) {
      const u = d.data() as User;
      const id = u.id || d.id;
      if (
        u &&
        u.email &&
        u.email.trim().toLowerCase() === cleanEmail &&
        !isFirestoreIdDeleted(id) &&
        !isFirestoreIdDeleted(d.id)
      ) {
        return { ...u, id };
      }
    }
  } catch (err) {
    console.warn('firestoreFindUserByEmail error:', err);
  }
  return null;
}

/**
 * Recursively strips undefined values so Firestore setDoc does not throw "Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const CHUNK_SIZE_CHARS = 350000; // ~350KB per chunk document, guaranteed safe within Firestore 1MB document limit

async function saveDocumentWithChunksToFirestore(docItem: IntranetDocument): Promise<void> {
  const rawFileUrl = docItem.fileUrl || docItem.downloadUrl || docItem.previewUrl || '';
  const rawAttUrl = docItem.attachmentUrl || '';

  const isChunkedFile = rawFileUrl.length > CHUNK_SIZE_CHARS;
  const isChunkedAttachment = rawAttUrl.length > 300000;

  // Deduplicate previewUrl, downloadUrl, thumbUrl in Firestore so Base64 payload is never tripled!
  const firestorePayload: Record<string, any> = {
    ...sanitizeForFirestore(docItem),
    fileUrl: isChunkedFile ? '' : rawFileUrl,
    previewUrl: rawFileUrl.startsWith('data:') ? '' : (docItem.previewUrl || ''),
    downloadUrl: rawFileUrl.startsWith('data:') ? '' : (docItem.downloadUrl || ''),
    thumbUrl: rawFileUrl.startsWith('data:') ? '' : (docItem.thumbUrl || ''),
    isChunkedFile,
    isChunkedAttachment,
  };

  if (isChunkedAttachment) {
    firestorePayload.attachmentUrl = '';
  }

  const cacheKey = `${docItem.id}_${docItem.updatedAt || docItem.uploadedAt || ''}`;
  if (isChunkedFile || isChunkedAttachment) {
    reassembledChunkCache.set(cacheKey, {
      fileUrl: rawFileUrl,
      attachmentUrl: rawAttUrl || undefined,
    });
  }

  // Write chunks first if needed
  if (isChunkedFile || isChunkedAttachment) {
    const existingChunks = await getDocs(collection(db, DOCS_COL, docItem.id, 'chunks')).catch(() => null);
    if (existingChunks && !existingChunks.empty) {
      await Promise.all(existingChunks.docs.map((c) => deleteDoc(c.ref).catch(() => {})));
    }

    const chunkWrites: Promise<void>[] = [];
    if (isChunkedFile) {
      const totalFileChunks = Math.ceil(rawFileUrl.length / CHUNK_SIZE_CHARS);
      for (let i = 0; i < totalFileChunks; i++) {
        const piece = rawFileUrl.slice(i * CHUNK_SIZE_CHARS, (i + 1) * CHUNK_SIZE_CHARS);
        chunkWrites.push(
          setDoc(doc(db, DOCS_COL, docItem.id, 'chunks', `file_${i}`), {
            field: 'fileUrl',
            index: i,
            data: piece,
          })
        );
      }
    }

    if (isChunkedAttachment) {
      const totalAttChunks = Math.ceil(rawAttUrl.length / CHUNK_SIZE_CHARS);
      for (let i = 0; i < totalAttChunks; i++) {
        const piece = rawAttUrl.slice(i * CHUNK_SIZE_CHARS, (i + 1) * CHUNK_SIZE_CHARS);
        chunkWrites.push(
          setDoc(doc(db, DOCS_COL, docItem.id, 'chunks', `att_${i}`), {
            field: 'attachmentUrl',
            index: i,
            data: piece,
          })
        );
      }
    }

    await Promise.all(chunkWrites);
  }

  await setDoc(doc(db, DOCS_COL, docItem.id), firestorePayload, { merge: true });
  console.log('[Firestore] Document saved:', docItem.id, docItem.title);
}

// Documents (Firestore Native Storage with Auto-Chunking & Deduplication)
export async function firestoreSaveDocument(docItem: IntranetDocument): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(docItem.id);
  pendingDocumentSaves.set(docItem.id, { doc: docItem, timestamp: Date.now() });

  try {
    await saveDocumentWithChunksToFirestore(docItem);
    // Keep pendingDocumentSaves for 10s after write completes so concurrent snapshots never drop the file
    setTimeout(() => {
      pendingDocumentSaves.delete(docItem.id);
    }, 10000);
  } catch (err: any) {
    console.error('[Firestore] firestoreSaveDocument error:', err);
    throw err;
  }
}

export async function firestoreDeleteDocument(docId: string): Promise<void> {
  markFirestoreIdDeleted(docId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, DOCS_COL, docId));
    const chunksSnap = await getDocs(collection(db, DOCS_COL, docId, 'chunks')).catch(() => null);
    if (chunksSnap && !chunksSnap.empty) {
      await Promise.all(chunksSnap.docs.map((c) => deleteDoc(c.ref).catch(() => {})));
    }
    console.log('[Firestore] Document deleted:', docId);
  } catch (err: any) {
    console.warn('[Firestore] firestoreDeleteDocument error:', err);
  }
}

// Access Logs
export async function firestoreAddLog(log: AccessLog): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    await setDoc(doc(db, LOGS_COL, log.id), sanitizeForFirestore(log));
  } catch (err) {
    console.warn('firestoreAddLog error:', err);
  }
}

export async function firestoreDeleteLog(logId: string): Promise<void> {
  markFirestoreIdDeleted(logId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, LOGS_COL, logId));
  } catch (err) {
    console.warn('firestoreDeleteLog error:', err);
  }
}

export async function firestoreClearLogs(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const snapshot = await getDocs(collection(db, LOGS_COL));
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      markFirestoreIdDeleted(d.id);
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('firestoreClearLogs error:', err);
  }
}

// Departments
export async function firestoreSaveDepartment(dept: DepartmentMaster): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(dept.id);
  try {
    await setDoc(doc(db, DEPTS_COL, dept.id), sanitizeForFirestore(dept), { merge: true });
  } catch (err) {
    console.warn('firestoreSaveDepartment error:', err);
  }
}

export async function firestoreDeleteDepartment(deptId: string): Promise<void> {
  markFirestoreIdDeleted(deptId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, DEPTS_COL, deptId));
  } catch (err) {
    console.warn('firestoreDeleteDepartment error:', err);
  }
}

// Categories
export async function firestoreSaveCategory(cat: CategoryMaster): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(cat.id);
  try {
    await setDoc(doc(db, CATS_COL, cat.id), sanitizeForFirestore(cat), { merge: true });
  } catch (err) {
    console.warn('firestoreSaveCategory error:', err);
  }
}

export async function firestoreDeleteCategory(catId: string): Promise<void> {
  markFirestoreIdDeleted(catId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, CATS_COL, catId));
  } catch (err) {
    console.warn('firestoreDeleteCategory error:', err);
  }
}

// KPIs
export async function firestoreSaveKPI(kpi: KPIMasterItem): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(kpi.id);
  try {
    await setDoc(doc(db, KPIS_COL, kpi.id), sanitizeForFirestore(kpi), { merge: true });
  } catch (err) {
    console.warn('firestoreSaveKPI error:', err);
  }
}

export async function firestoreDeleteKPI(kpiId: string): Promise<void> {
  markFirestoreIdDeleted(kpiId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, KPIS_COL, kpiId));
  } catch (err) {
    console.warn('firestoreDeleteKPI error:', err);
  }
}

// Performances
export async function firestoreSavePerformance(perf: PerformanceAppraisal): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(perf.id);
  try {
    await setDoc(doc(db, PERFS_COL, perf.id), sanitizeForFirestore(perf), { merge: true });
  } catch (err) {
    console.warn('firestoreSavePerformance error:', err);
  }
}

export async function firestoreDeletePerformance(perfId: string): Promise<void> {
  markFirestoreIdDeleted(perfId);
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, PERFS_COL, perfId));
  } catch (err) {
    console.warn('firestoreDeletePerformance error:', err);
  }
}

// Notifications
export async function firestoreSaveNotification(notif: PushNotification): Promise<void> {
  if (!isFirebaseConfigured()) return;
  unmarkFirestoreIdDeleted(notif.id);
  try {
    await setDoc(doc(db, NOTIFS_COL, notif.id), sanitizeForFirestore(notif), { merge: true });
  } catch (err) {
    console.warn('firestoreSaveNotification error:', err);
  }
}

export async function firestoreMarkNotificationRead(id: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    await updateDoc(doc(db, NOTIFS_COL, id), { read: true });
  } catch (err) {
    console.warn('firestoreMarkNotificationRead error:', err);
  }
}

// System Config (Google Drive settings)
export async function firestoreSaveConfig(cfg: any): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    await setDoc(doc(db, CONFIG_COL, 'drive_storage_config'), {
      ...cfg,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveConfig error:', err);
  }
}

// Hotel Group Units Master (stored in systemConfig/hotel_units_master)
export async function firestoreSaveHotelUnits(units: HotelUnitMaster[]): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const cleanUnits = units.map((u) => sanitizeForFirestore(u));
    await setDoc(
      doc(db, CONFIG_COL, 'hotel_units_master'),
      {
        id: 'hotel_units_master',
        units: cleanUnits,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('firestoreSaveHotelUnits error:', err);
  }
}

// =========================================================================
// REAL-TIME CLOUD QUOTA TELEMETRY & FULL COLLECTION PULL (FIREBASE + VERCEL)
// =========================================================================

export interface CloudQuotaTelemetry {
  id: string;
  projectId: string;
  databaseId: string;
  dateKey: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  firebaseUsedBytes: number;
  firebaseUsedKB: number;
  firebaseRemainingKB: number;
  firebaseTotalDocs: number;
  firebaseChunkDocs: number;
  dailyReadsUsed: number;
  dailyWritesUsed: number;
  dailyDeletesUsed: number;
  vercelBandwidthUsedMB: number;
  vercelEdgeRequestsUsed: number;
  vercelBuildMinutesUsed: number;
  vercelBundleSizeMB: number;
  lastSyncedAt: string;
  syncedBy?: string;
}

export interface LiveFirestorePullResult {
  success: boolean;
  message: string;
  users: User[];
  documents: IntranetDocument[];
  performances: PerformanceAppraisal[];
  kpiMaster: KPIMasterItem[];
  accessLogs: AccessLog[];
  departments: DepartmentMaster[];
  categories: CategoryMaster[];
  hotelUnits: HotelUnitMaster[];
  chunkDocsCount: number;
  serverTotalDocsCount: number;
}

export async function firestorePullAllCollections(): Promise<LiveFirestorePullResult> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      message: 'Konfigurasi Firebase belum tersedia.',
      users: [],
      documents: [],
      performances: [],
      kpiMaster: [],
      accessLogs: [],
      departments: [],
      categories: [],
      hotelUnits: [],
      chunkDocsCount: 0,
      serverTotalDocsCount: 0,
    };
  }

  try {
    const [
      usersSnap,
      docsSnap,
      perfsSnap,
      kpisSnap,
      logsSnap,
      deptsSnap,
      catsSnap,
      unitsDocSnap,
    ] = await Promise.all([
      getDocs(collection(db, USERS_COL)),
      getDocs(collection(db, DOCS_COL)),
      getDocs(collection(db, PERFS_COL)),
      getDocs(collection(db, KPIS_COL)),
      getDocs(query(collection(db, LOGS_COL), limit(500))),
      getDocs(collection(db, DEPTS_COL)),
      getDocs(collection(db, CATS_COL)),
      getDoc(doc(db, CONFIG_COL, 'hotel_units_master')),
    ]);

    const users: User[] = [];
    usersSnap.forEach((d) => {
      const u = d.data() as User;
      const id = u.id || d.id;
      if (u && u.email && !isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        users.push({ ...u, id });
      }
    });

    const rawDocs: any[] = [];
    docsSnap.forEach((d) => {
      const item = d.data() as any;
      const id = item?.id || d.id;
      if (item && id && !isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        rawDocs.push({ ...item, id });
      }
    });

    let chunkDocsCount = 0;
    const documents: IntranetDocument[] = await Promise.all(
      rawDocs.map(async (item) => {
        if (item.isChunkedFile || item.isChunkedAttachment) {
          try {
            const cSnap = await getDocs(collection(db, DOCS_COL, item.id, 'chunks'));
            chunkDocsCount += cSnap.size;
          } catch {}
          return hydrateChunkedDocument(item);
        }
        const fileUrl = item.fileUrl || item.downloadUrl || item.previewUrl || '';
        return {
          ...item,
          fileUrl,
          previewUrl: item.previewUrl || fileUrl,
          downloadUrl: item.downloadUrl || fileUrl,
          thumbUrl: item.thumbUrl || (item.fileType?.startsWith('image/') ? fileUrl : ''),
        } as IntranetDocument;
      })
    );

    const performances: PerformanceAppraisal[] = [];
    perfsSnap.forEach((d) => {
      const item = d.data() as PerformanceAppraisal;
      const id = item.id || d.id;
      if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        performances.push({ ...item, id });
      }
    });

    const kpiMaster: KPIMasterItem[] = [];
    kpisSnap.forEach((d) => {
      const item = d.data() as KPIMasterItem;
      const id = item.id || d.id;
      if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        kpiMaster.push({ ...item, id });
      }
    });

    const accessLogs: AccessLog[] = [];
    logsSnap.forEach((d) => {
      const item = d.data() as AccessLog;
      const id = item.id || d.id;
      if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        accessLogs.push({ ...item, id });
      }
    });
    accessLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const departments: DepartmentMaster[] = [];
    deptsSnap.forEach((d) => {
      const item = d.data() as DepartmentMaster;
      const id = item.id || d.id;
      if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        departments.push({ ...item, id });
      }
    });

    const categories: CategoryMaster[] = [];
    catsSnap.forEach((d) => {
      const item = d.data() as CategoryMaster;
      const id = item.id || d.id;
      if (!isFirestoreIdDeleted(id) && !isFirestoreIdDeleted(d.id)) {
        categories.push({ ...item, id });
      }
    });

    let hotelUnits: HotelUnitMaster[] = [];
    if (unitsDocSnap.exists()) {
      const uData = unitsDocSnap.data();
      if (uData && Array.isArray(uData.units)) {
        hotelUnits = uData.units as HotelUnitMaster[];
      }
    }

    const serverTotalDocsCount =
      users.length +
      documents.length +
      chunkDocsCount +
      performances.length +
      kpiMaster.length +
      accessLogs.length +
      departments.length +
      categories.length +
      (hotelUnits.length > 0 ? 1 : 0);

    notifyFirebaseState('connected');
    return {
      success: true,
      message: `Berhasil menarik ${serverTotalDocsCount} dokumen aktif langsung dari server Cloud Firestore.`,
      users,
      documents,
      performances,
      kpiMaster,
      accessLogs,
      departments,
      categories,
      hotelUnits,
      chunkDocsCount,
      serverTotalDocsCount,
    };
  } catch (err: any) {
    console.warn('[Firestore] firestorePullAllCollections error:', err);
    return {
      success: false,
      message: err?.message || 'Gagal menarik koleksi dari Cloud Firestore.',
      users: [],
      documents: [],
      performances: [],
      kpiMaster: [],
      accessLogs: [],
      departments: [],
      categories: [],
      hotelUnits: [],
      chunkDocsCount: 0,
      serverTotalDocsCount: 0,
    };
  }
}

export async function firestoreSyncQuotaTelemetry(
  telemetry: CloudQuotaTelemetry
): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  try {
    await setDoc(
      doc(db, CONFIG_COL, 'cloud_quota_telemetry'),
      sanitizeForFirestore(telemetry),
      { merge: true }
    );
    notifyFirebaseState('connected');
    return true;
  } catch (err) {
    console.warn('[Firestore] firestoreSyncQuotaTelemetry error:', err);
    return false;
  }
}

export function subscribeToQuotaTelemetry(
  onUpdate: (telemetry: CloudQuotaTelemetry) => void
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const docRef = doc(db, CONFIG_COL, 'cloud_quota_telemetry');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          notifyFirebaseState('connected');
          onUpdate(docSnap.data() as CloudQuotaTelemetry);
        }
      },
      (err) => handleSubscriptionError('QuotaTelemetry', err)
    );
  } catch (e) {
    handleSubscriptionError('QuotaTelemetry init', e);
    return () => {};
  }
}

