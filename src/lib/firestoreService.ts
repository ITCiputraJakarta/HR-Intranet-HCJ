import {
  collection,
  doc,
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
  PushNotification
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_CATEGORIES,
  INITIAL_DEPARTMENTS,
  INITIAL_KPIS,
  INITIAL_PERFORMANCES,
  INITIAL_NOTIFICATIONS
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
      const usersSnapshot = await getDocs(collection(db, USERS_COL));
      if (!usersSnapshot.empty) {
        notifyFirebaseState('connected');
        return { seeded: true, message: 'Firestore sudah memiliki data master Hotel Ciputra Jakarta.' };
      }
    }

    console.log('Seeding initial Hotel Ciputra Jakarta data into Firestore...');
    const batch = writeBatch(db);

    // 1. Seed Users
    INITIAL_USERS.forEach((u) => {
      batch.set(doc(db, USERS_COL, u.id), u);
    });

    // 2. Seed Departments
    INITIAL_DEPARTMENTS.forEach((d) => {
      batch.set(doc(db, DEPTS_COL, d.id), d);
    });

    // 3. Seed Categories
    INITIAL_CATEGORIES.forEach((c) => {
      batch.set(doc(db, CATS_COL, c.id), c);
    });

    // 4. Seed Documents (Google Drive linked SOPs & Forms)
    INITIAL_DOCUMENTS.forEach((docItem) => {
      batch.set(doc(db, DOCS_COL, docItem.id), docItem);
    });

    // 5. Seed KPIs
    INITIAL_KPIS.forEach((k) => {
      batch.set(doc(db, KPIS_COL, k.id), k);
    });

    // 6. Seed Performances
    INITIAL_PERFORMANCES.forEach((p) => {
      batch.set(doc(db, PERFS_COL, p.id), p);
    });

    // 7. Seed Notifications
    INITIAL_NOTIFICATIONS.forEach((n) => {
      batch.set(doc(db, NOTIFS_COL, n.id), n);
    });

    // 8. Seed Default System Config (Firestore Native Storage settings)
    batch.set(doc(db, CONFIG_COL, 'storage_settings'), {
      id: 'storage_settings',
      provider: 'firestore',
      maxFileSizeMb: 15,
      autoPruneDays: 7,
      autoSyncEnabled: true,
      updatedAt: new Date().toISOString(),
    });

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
        snapshot.forEach((d) => items.push(d.data() as User));
        if (items.length > 0) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('Users', err)
    );
  } catch (e) {
    handleSubscriptionError('Users init', e);
    return () => {};
  }
}

export function subscribeToDocuments(onUpdate: (docs: IntranetDocument[]) => void): () => void {
  try {
    const q = collection(db, DOCS_COL);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: IntranetDocument[] = [];
        snapshot.forEach((d) => items.push(d.data() as IntranetDocument));
        items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        if (items.length > 0) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
      },
      (err) => handleSubscriptionError('Docs', err)
    );
  } catch (e) {
    handleSubscriptionError('Docs init', e);
    return () => {};
  }
}

export function subscribeToAccessLogs(onUpdate: (logs: AccessLog[]) => void): () => void {
  try {
    const q = query(collection(db, LOGS_COL), limit(250));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: AccessLog[] = [];
        snapshot.forEach((d) => items.push(d.data() as AccessLog));
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (items.length > 0) {
          notifyFirebaseState('connected');
          onUpdate(items);
        }
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
        snapshot.forEach((d) => items.push(d.data() as DepartmentMaster));
        items.sort((a, b) => a.name.localeCompare(b.name));
        if (items.length > 0) {
          notifyFirebaseState('connected');
          onUpdate(items);
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
        snapshot.forEach((d) => items.push(d.data() as CategoryMaster));
        if (items.length > 0) {
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
        snapshot.forEach((d) => items.push(d.data() as KPIMasterItem));
        if (items.length > 0) {
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
        snapshot.forEach((d) => items.push(d.data() as PerformanceAppraisal));
        items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        if (items.length > 0) {
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
        snapshot.forEach((d) => items.push(d.data() as PushNotification));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (items.length > 0) {
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

// =========================================================================
// FIRESTORE CRUD OPERATIONS
// =========================================================================

// Users
export async function firestoreSaveUser(user: User): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COL, user.id), user, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveUser error:', err);
  }
}

export async function firestoreDeleteUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (err) {
    console.warn('firestoreDeleteUser error:', err);
  }
}

// Documents (with Google Drive URLs)
export async function firestoreSaveDocument(docItem: IntranetDocument): Promise<void> {
  try {
    await setDoc(doc(db, DOCS_COL, docItem.id), docItem, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveDocument error:', err);
  }
}

export async function firestoreDeleteDocument(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, DOCS_COL, docId));
  } catch (err) {
    console.warn('firestoreDeleteDocument error:', err);
  }
}

// Access Logs
export async function firestoreAddLog(log: AccessLog): Promise<void> {
  try {
    await setDoc(doc(db, LOGS_COL, log.id), log);
  } catch (err) {
    console.warn('firestoreAddLog error:', err);
  }
}

export async function firestoreClearLogs(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, LOGS_COL));
    const batch = writeBatch(db);
    snapshot.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('firestoreClearLogs error:', err);
  }
}

// Departments
export async function firestoreSaveDepartment(dept: DepartmentMaster): Promise<void> {
  try {
    await setDoc(doc(db, DEPTS_COL, dept.id), dept, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveDepartment error:', err);
  }
}

// Categories
export async function firestoreSaveCategory(cat: CategoryMaster): Promise<void> {
  try {
    await setDoc(doc(db, CATS_COL, cat.id), cat, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveCategory error:', err);
  }
}

export async function firestoreDeleteCategory(catId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CATS_COL, catId));
  } catch (err) {
    console.warn('firestoreDeleteCategory error:', err);
  }
}

// KPIs
export async function firestoreSaveKPI(kpi: KPIMasterItem): Promise<void> {
  try {
    await setDoc(doc(db, KPIS_COL, kpi.id), kpi, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveKPI error:', err);
  }
}

export async function firestoreDeleteKPI(kpiId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, KPIS_COL, kpiId));
  } catch (err) {
    console.warn('firestoreDeleteKPI error:', err);
  }
}

// Performances
export async function firestoreSavePerformance(perf: PerformanceAppraisal): Promise<void> {
  try {
    await setDoc(doc(db, PERFS_COL, perf.id), perf, { merge: true });
  } catch (err) {
    console.warn('firestoreSavePerformance error:', err);
  }
}

export async function firestoreDeletePerformance(perfId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PERFS_COL, perfId));
  } catch (err) {
    console.warn('firestoreDeletePerformance error:', err);
  }
}

// Notifications
export async function firestoreSaveNotification(notif: PushNotification): Promise<void> {
  try {
    await setDoc(doc(db, NOTIFS_COL, notif.id), notif, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveNotification error:', err);
  }
}

export async function firestoreMarkNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, NOTIFS_COL, id), { read: true });
  } catch (err) {
    console.warn('firestoreMarkNotificationRead error:', err);
  }
}

// System Config (Google Drive settings)
export async function firestoreSaveConfig(cfg: any): Promise<void> {
  try {
    await setDoc(doc(db, CONFIG_COL, 'drive_storage_config'), {
      ...cfg,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('firestoreSaveConfig error:', err);
  }
}
