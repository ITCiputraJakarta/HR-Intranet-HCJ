import {
  User,
  UserRole,
  UserStatus,
  IntranetDocument,
  AccessLog,
  CategoryMaster,
  DepartmentMaster,
  KPIMasterItem,
  PerformanceAppraisal,
  PushNotification,
  SpreadsheetConfig,
  GoogleDriveStorageConfig,
  SystemStorageConfig,
  ActionCategory,
  LogStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_ACCESS_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_DEPARTMENTS,
  INITIAL_KPIS,
  INITIAL_PERFORMANCES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import {
  firestoreSaveUser,
  firestoreDeleteUser,
  firestoreSaveDocument,
  firestoreDeleteDocument,
  firestoreAddLog,
  firestoreClearLogs,
  firestoreSaveCategory,
  firestoreDeleteCategory,
  firestoreSaveDepartment,
  firestoreSaveKPI,
  firestoreDeleteKPI,
  firestoreSavePerformance,
  firestoreDeletePerformance,
  firestoreSaveNotification,
  firestoreMarkNotificationRead,
  firestoreSaveConfig,
} from './firestoreService';

const STORAGE_KEYS = {
  USERS: 'ciputra_intra_users_v1',
  CURRENT_USER: 'ciputra_intra_curr_user_v1',
  DOCUMENTS: 'ciputra_intra_documents_v1',
  ACCESS_LOGS: 'ciputra_intra_logs_v1',
  CATEGORIES: 'ciputra_intra_cats_v1',
  DEPARTMENTS: 'ciputra_intra_depts_v1',
  KPIS: 'ciputra_intra_kpis_v1',
  PERFORMANCES: 'ciputra_intra_perfs_v1',
  NOTIFICATIONS: 'ciputra_intra_notifs_v1',
  CONFIG: 'ciputra_intra_config_v1',
};

// Runtime in-memory cache to prevent excessive Firestore reads and ensure instant UI performance
let memoryUsers: User[] | null = null;
let memoryDocuments: IntranetDocument[] | null = null;
let memoryLogs: AccessLog[] | null = null;
let memoryCategories: CategoryMaster[] | null = null;
let memoryDepartments: DepartmentMaster[] | null = null;
let memoryKPIs: KPIMasterItem[] | null = null;
let memoryPerformances: PerformanceAppraisal[] | null = null;
let memoryNotifications: PushNotification[] | null = null;
let memoryConfig: any = null;

export function updateMemoryCache(
  collectionKey: 'users' | 'documents' | 'logs' | 'categories' | 'departments' | 'kpis' | 'performances' | 'notifications' | 'config',
  data: any
): void {
  switch (collectionKey) {
    case 'users':
      memoryUsers = data;
      break;
    case 'documents':
      memoryDocuments = data;
      break;
    case 'logs':
      memoryLogs = data;
      break;
    case 'categories':
      memoryCategories = data;
      break;
    case 'departments':
      memoryDepartments = data;
      break;
    case 'kpis':
      memoryKPIs = data;
      break;
    case 'performances':
      memoryPerformances = data;
      break;
    case 'notifications':
      memoryNotifications = data;
      break;
    case 'config':
      memoryConfig = data;
      break;
  }
}

export function clearMemoryCache(): void {
  memoryUsers = null;
  memoryDocuments = null;
  memoryLogs = null;
  memoryCategories = null;
  memoryDepartments = null;
  memoryKPIs = null;
  memoryPerformances = null;
  memoryNotifications = null;
  memoryConfig = null;
}

// Safe storage getter with fallback
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      return fallback;
    }
    return parsed;
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// ----------------- USERS -----------------
export function getUsers(): User[] {
  if (memoryUsers && memoryUsers.length > 0) {
    return memoryUsers;
  }
  const loaded = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  memoryUsers = loaded;
  return loaded;
}

export function saveUsers(users: User[]): void {
  memoryUsers = users;
  setStored(STORAGE_KEYS.USERS, users);
}

export function getCurrentUser(): User | null {
  return getStored<User | null>(STORAGE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    setStored(STORAGE_KEYS.CURRENT_USER, user);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

/**
 * Hapus seluruh cache dan data tersimpan di browser saat pengguna logout.
 * Memastikan sesi benar-benar bersih tanpa jejak data role sebelumnya.
 */
export function clearAllSessionCache(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Error clearing all session cache:', e);
  }
}

export function updateUserStatus(userId: string, status: 'Approved' | 'Pending', actor: User): User[] {
  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  const updated = users.map((u) => (u.id === userId ? { ...u, status } : u));
  saveUsers(updated);

  if (target) {
    const updatedTarget = { ...target, status };
    firestoreSaveUser(updatedTarget);

    addAccessLog({
      user: actor,
      actionCategory: 'USER_MGMT',
      action: 'Pembaruan Status Persetujuan Akun',
      target: `${target.nama} (${target.email}) -> ${status}`,
      status: 'SUCCESS',
      details: `Status persetujuan akun karyawan diubah menjadi ${status} di Firestore.`,
    });
  }
  return updated;
}

export function updateUserRole(userId: string, role: User['role'], actor: User): User[] {
  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  const updated = users.map((u) => (u.id === userId ? { ...u, role } : u));
  saveUsers(updated);

  if (target) {
    const updatedTarget = { ...target, role };
    firestoreSaveUser(updatedTarget);

    addAccessLog({
      user: actor,
      actionCategory: 'USER_MGMT',
      action: 'Pembaruan Peran Akses Karyawan',
      target: `${target.nama} (${target.email}) -> ${role.toUpperCase()}`,
      status: 'SUCCESS',
      details: `Hak akses pengguna diperbarui ke tingkat ${role} di Firestore.`,
    });
  }
  return updated;
}

export function deleteUser(userId: string, actor: User): { success: boolean; message?: string } {
  if (userId === actor.id) {
    return { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' };
  }
  const users = getUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, message: 'Akun pengguna tidak ditemukan dalam database.' };
  }

  const updated = users.filter((u) => u.id !== userId);
  saveUsers(updated);

  // Delete from Firestore
  firestoreDeleteUser(userId);

  addAccessLog({
    user: actor,
    actionCategory: 'USER_MGMT',
    action: 'Hapus Akun Pengguna',
    target: `${target.nama} (${target.email})`,
    status: 'WARNING',
    details: `Akun karyawan dihapus secara permanen dari Firebase Firestore oleh Super Admin ${actor.nama}.`,
  });

  return { success: true };
}

export function registerUser(newUser: User): void {
  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
  if (!exists) {
    const updated = [...users, newUser];
    saveUsers(updated);
    firestoreSaveUser(newUser);
  }
}

export function createUserByAdmin(newUser: User, actor: User): void {
  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
  if (!exists) {
    const updated = [...users, newUser];
    saveUsers(updated);
    firestoreSaveUser(newUser);

    addAccessLog({
      user: actor,
      actionCategory: 'USER_MGMT',
      action: 'Tambah Akun Pengguna Baru',
      target: `${newUser.nama} (${newUser.email})`,
      status: 'SUCCESS',
      details: `Dibuat oleh Super Admin ${actor.nama}. Role: ${newUser.role}, Dept: ${newUser.departemen}, Status: ${newUser.status}`,
    });
  }
}

export function updateUserByAdmin(
  userId: string,
  data: {
    nama: string;
    email: string;
    departemen: string;
    role: UserRole;
    status: UserStatus;
    password?: string;
  },
  actor: User
): { success: boolean; message: string; user?: User } {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Pengguna tidak ditemukan dalam database.' };
  }

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.nama.trim();

  if (!cleanName || !cleanEmail) {
    return { success: false, message: 'Nama dan Email tidak boleh kosong.' };
  }

  const emailTaken = users.some((u) => u.id !== userId && u.email.toLowerCase() === cleanEmail);
  if (emailTaken) {
    return { success: false, message: `Email "${cleanEmail}" sudah digunakan oleh akun lain.` };
  }

  const existing = users[index];
  const updatedUser: User = {
    ...existing,
    nama: cleanName,
    email: cleanEmail,
    departemen: data.departemen,
    role: data.role,
    status: data.status,
    password: data.password && data.password.trim() ? data.password.trim() : existing.password,
  };

  const updatedUsers = [...users];
  updatedUsers[index] = updatedUser;
  saveUsers(updatedUsers);
  firestoreSaveUser(updatedUser);

  addAccessLog({
    user: actor,
    actionCategory: 'USER_MGMT',
    action: 'Edit Data Akun Pengguna',
    target: `${updatedUser.nama} (${updatedUser.email})`,
    status: 'SUCCESS',
    details: `Data akun diperbarui oleh Super Admin ${actor.nama}. Role: ${updatedUser.role}, Dept: ${updatedUser.departemen}, Status: ${updatedUser.status}`,
  });

  return { success: true, message: 'Data pengguna berhasil diperbarui!', user: updatedUser };
}

// ----------------- DOCUMENTS (CLOUD FIRESTORE STORAGE) -----------------
export function getDocuments(): IntranetDocument[] {
  if (memoryDocuments && memoryDocuments.length > 0) {
    return memoryDocuments;
  }
  const loaded = getStored<IntranetDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
  memoryDocuments = loaded;
  return loaded;
}

export function saveDocuments(docs: IntranetDocument[]): void {
  memoryDocuments = docs;
  setStored(STORAGE_KEYS.DOCUMENTS, docs);
}

export function addDocument(doc: IntranetDocument, actor: User): void {
  const docs = getDocuments();
  const updated = [doc, ...docs];
  saveDocuments(updated);

  // Save document metadata and content directly to Firestore
  firestoreSaveDocument(doc);

  // Record Structured Access Log
  addAccessLog({
    user: actor,
    actionCategory: 'DOCUMENT',
    action: 'Unggah Berkas ke Cloud Firestore',
    target: `${doc.title} (${doc.category})`,
    status: 'SUCCESS',
    details: `Dokumen disimpan langsung ke database Firebase Firestore. Distribusi: ${doc.akses_dept}`,
  });

  // Trigger Push Notification for relevant department users
  sendPushNotification({
    title: `Dokumen Baru: ${doc.title}`,
    message: `${doc.category} baru telah diterbitkan oleh ${actor.nama} untuk ${doc.akses_dept}. Berkas tersimpan di Cloud Firestore.`,
    category: doc.category,
    targetDepartment: doc.akses_dept,
    documentId: doc.id,
  });
}

export function deleteDocument(docId: string, actor: User): void {
  const docs = getDocuments();
  const target = docs.find((d) => d.id === docId);
  const updated = docs.filter((d) => d.id !== docId);
  saveDocuments(updated);

  // Delete from Firestore
  firestoreDeleteDocument(docId);

  if (target) {
    addAccessLog({
      user: actor,
      actionCategory: 'DOCUMENT',
      action: 'Hapus Dokumen Arsip Firestore',
      target: target.title,
      status: 'SUCCESS',
      details: `Dokumen ID ${docId} dihapus dari Cloud Firestore.`,
    });
  }
}

export function updateDocument(updatedDoc: IntranetDocument, actor: User): void {
  const docs = getDocuments();
  const index = docs.findIndex((d) => d.id === updatedDoc.id);
  const updatedWithTimestamp: IntranetDocument = {
    ...updatedDoc,
    updatedAt: new Date().toISOString(),
  };

  let newDocs: IntranetDocument[];
  if (index !== -1) {
    newDocs = [...docs];
    newDocs[index] = updatedWithTimestamp;
  } else {
    newDocs = [updatedWithTimestamp, ...docs];
  }

  saveDocuments(newDocs);
  firestoreSaveDocument(updatedWithTimestamp);

  addAccessLog({
    user: actor,
    actionCategory: 'DOCUMENT',
    action: 'Perbaharui Berkas & Keterangan Dokumen',
    target: `${updatedWithTimestamp.title} (${updatedWithTimestamp.category})`,
    status: 'SUCCESS',
    details: `Dokumen diperbarui oleh ${actor.nama}. Berkas: ${updatedWithTimestamp.fileName} (${updatedWithTimestamp.fileSize || '-'}), Distribusi: ${updatedWithTimestamp.akses_dept}`,
  });
}

/**
 * Otomatis membersihkan pengumuman yang sudah mencapai tanggal kedaluwarsa (expiryDate)
 * atau lewat batas hari (default: 7 hari / 1 minggu).
 * Menghapus dokumen pengumuman beserta file dan fotonya langsung dari Firestore.
 */
export function pruneExpiredAnnouncements(
  maxDays: number = 7,
  actor?: User
): { deletedCount: number; remainingCount: number; deletedTitles: string[] } {
  const docs = getDocuments();
  const now = Date.now();
  const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

  const validDocs: IntranetDocument[] = [];
  const expiredDocs: IntranetDocument[] = [];

  for (const doc of docs) {
    if (doc.category === 'Pengumuman') {
      let isExpired = false;

      // 1. Prioritaskan pengecekan tanggal kedaluwarsa eksplisit (expiryDate)
      if (doc.expiryDate) {
        // Kedaluwarsa berlaku hingga detik terakhir di hari tersebut (23:59:59.999)
        const expiryTimestamp = new Date(`${doc.expiryDate}T23:59:59.999`).getTime();
        if (!isNaN(expiryTimestamp) && now > expiryTimestamp) {
          isExpired = true;
        }
      } else {
        // 2. Fallback untuk pengumuman lawas tanpa expiryDate: gunakan batas maxDays dari uploadedAt
        const uploadTime = new Date(doc.uploadedAt).getTime();
        if (!isNaN(uploadTime) && now - uploadTime > maxAgeMs) {
          isExpired = true;
        }
      }

      if (isExpired) {
        expiredDocs.push(doc);
        continue;
      }
    }
    validDocs.push(doc);
  }

  if (expiredDocs.length > 0) {
    saveDocuments(validDocs);
    // Delete expired announcements directly from Firestore
    expiredDocs.forEach((d) => {
      firestoreDeleteDocument(d.id);
    });

    addAccessLog({
      user: actor || null,
      actionCategory: 'DOCUMENT',
      action: 'Pembersihan Otomatis Pengumuman Kedaluwarsa',
      target: `${expiredDocs.length} pengumuman kedaluwarsa`,
      status: 'SUCCESS',
      details: `Sistem membersihkan ${expiredDocs.length} pengumuman & foto kedaluwarsa dari Firestore: ${expiredDocs.map((e) => e.title).slice(0, 3).join(', ')}${expiredDocs.length > 3 ? '...' : ''}`,
    });
  }

  return {
    deletedCount: expiredDocs.length,
    remainingCount: validDocs.filter((d) => d.category === 'Pengumuman').length,
    deletedTitles: expiredDocs.map((d) => d.title),
  };
}

// ----------------- STRUCTURED ACCESS LOGS (1-WEEK RETENTION) -----------------
export const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari (1 minggu)

/**
 * Otomatis membersihkan log yang berumur lebih dari 1 minggu (7 hari ke belakang dari saat ini).
 * Log hanya bertahan selama 1 minggu agar penyimpanan tidak penuh.
 */
export function pruneExpiredAccessLogs(): AccessLog[] {
  const all = memoryLogs || getStored<AccessLog[]>(STORAGE_KEYS.ACCESS_LOGS, INITIAL_ACCESS_LOGS);
  const now = Date.now();
  const valid = all.filter((log) => {
    const time = new Date(log.timestamp).getTime();
    return !isNaN(time) && now - time <= LOG_RETENTION_MS;
  });

  memoryLogs = valid;
  if (valid.length !== all.length) {
    setStored(STORAGE_KEYS.ACCESS_LOGS, valid);
  }
  return valid;
}

export function getAccessLogs(): AccessLog[] {
  if (memoryLogs && memoryLogs.length > 0) {
    return memoryLogs;
  }
  return pruneExpiredAccessLogs();
}

export function saveAccessLogs(logs: AccessLog[]): void {
  const now = Date.now();
  const valid = logs.filter((log) => {
    const time = new Date(log.timestamp).getTime();
    return !isNaN(time) && now - time <= LOG_RETENTION_MS;
  });
  memoryLogs = valid;
  setStored(STORAGE_KEYS.ACCESS_LOGS, valid);
}

export function addAccessLog(params: {
  user?: User | null;
  actionCategory: ActionCategory;
  action: string;
  target: string;
  status: LogStatus;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}): AccessLog {
  const logs = getAccessLogs();
  const newLog: AccessLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userName: params.user?.nama || 'Tamu / Sistem',
    userEmail: params.user?.email || 'unauthenticated@ciputra.com',
    role: params.user?.role || 'staff',
    departemen: params.user?.departemen || 'All Departments',
    actionCategory: params.actionCategory,
    action: params.action,
    target: params.target,
    status: params.status,
    details: params.details || '',
    ipAddress: params.ipAddress || '192.168.1.' + (Math.floor(Math.random() * 80) + 10),
    userAgent: params.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Browser'),
  };

  const updated = [newLog, ...logs];
  saveAccessLogs(updated);

  // Persist log to Firestore
  firestoreAddLog(newLog);

  return newLog;
}

export function clearAccessLogs(actor: User): void {
  const resetLogs: AccessLog[] = [
    {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: actor.nama,
      userEmail: actor.email,
      role: actor.role,
      departemen: actor.departemen,
      actionCategory: 'SYSTEM',
      action: 'Pembersihan Riwayat Log',
      target: 'Tabel AccessLogs',
      status: 'WARNING',
      details: 'Super Admin membersihkan riwayat log akses dari Firebase Firestore.',
    },
  ];
  saveAccessLogs(resetLogs);
  firestoreClearLogs();
  firestoreAddLog(resetLogs[0]);
}

// ----------------- CATEGORIES -----------------
export function getCategories(): CategoryMaster[] {
  if (memoryCategories && memoryCategories.length > 0) {
    return memoryCategories;
  }
  const loaded = getStored<CategoryMaster[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  memoryCategories = loaded;
  return loaded;
}

export function saveCategories(cats: CategoryMaster[]): void {
  memoryCategories = cats;
  setStored(STORAGE_KEYS.CATEGORIES, cats);
}

export function addCategory(cat: CategoryMaster, actor: User): void {
  const cats = getCategories();
  saveCategories([...cats, cat]);
  firestoreSaveCategory(cat);

  addAccessLog({
    user: actor,
    actionCategory: 'SYSTEM',
    action: 'Tambah Kategori Master',
    target: `${cat.nama_kategori} (${cat.departemen})`,
    status: 'SUCCESS',
  });
}

export function deleteCategory(id: string, actor: User): void {
  const cats = getCategories();
  const target = cats.find((c) => c.id === id);
  saveCategories(cats.filter((c) => c.id !== id));
  firestoreDeleteCategory(id);

  if (target) {
    addAccessLog({
      user: actor,
      actionCategory: 'SYSTEM',
      action: 'Hapus Kategori Master',
      target: target.nama_kategori,
      status: 'SUCCESS',
    });
  }
}

// ----------------- DEPARTMENTS MASTER -----------------
export function getDepartmentMasters(): DepartmentMaster[] {
  if (memoryDepartments && memoryDepartments.length > 0) {
    return memoryDepartments;
  }
  const loaded = getStored<DepartmentMaster[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  memoryDepartments = loaded;
  return loaded;
}

export function saveDepartmentMasters(depts: DepartmentMaster[]): void {
  memoryDepartments = depts;
  setStored(STORAGE_KEYS.DEPARTMENTS, depts);
}

export function getDepartments(): string[] {
  const list = getDepartmentMasters();
  return list.map((d) => d.name);
}

export function addDepartment(
  data: { name: string; code: string; description?: string },
  actor: User
): { success: boolean; message: string; department?: DepartmentMaster } {
  const trimmedName = data.name.trim();
  const trimmedCode = data.code.trim().toUpperCase();
  const trimmedDesc = (data.description || '').trim();

  if (!trimmedName) {
    return { success: false, message: 'Nama departemen tidak boleh kosong.' };
  }
  if (!trimmedCode) {
    return { success: false, message: 'Kode singkatan departemen tidak boleh kosong.' };
  }

  const list = getDepartmentMasters();
  if (list.some((d) => d.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, message: `Departemen '${trimmedName}' sudah terdaftar dalam sistem.` };
  }
  if (list.some((d) => d.code.toUpperCase() === trimmedCode)) {
    return { success: false, message: `Kode singkatan '${trimmedCode}' sudah digunakan departemen lain.` };
  }

  const newDept: DepartmentMaster = {
    id: `dept-${Date.now()}`,
    name: trimmedName,
    code: trimmedCode,
    description: trimmedDesc || `Departemen operasional ${trimmedName} Hotel Ciputra Jakarta.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveDepartmentMasters([...list, newDept]);
  firestoreSaveDepartment(newDept);

  addAccessLog({
    user: actor,
    actionCategory: 'SYSTEM',
    action: 'Tambah Departemen Baru',
    target: `${newDept.name} [${newDept.code}]`,
    status: 'SUCCESS',
    details: `Departemen baru '${newDept.name}' (${newDept.code}) disimpan ke Firebase Firestore oleh ${actor.nama}.`,
  });

  return { success: true, message: `Departemen '${newDept.name}' berhasil ditambahkan!`, department: newDept };
}

export function updateDepartment(
  id: string,
  data: { name: string; code: string; description?: string },
  actor: User
): { success: boolean; message: string; department?: DepartmentMaster } {
  const trimmedName = data.name.trim();
  const trimmedCode = data.code.trim().toUpperCase();
  const trimmedDesc = (data.description || '').trim();

  if (!trimmedName) {
    return { success: false, message: 'Nama departemen tidak boleh kosong.' };
  }
  if (!trimmedCode) {
    return { success: false, message: 'Kode singkatan departemen tidak boleh kosong.' };
  }

  const list = getDepartmentMasters();
  const target = list.find((d) => d.id === id);
  if (!target) {
    return { success: false, message: 'Departemen tidak ditemukan.' };
  }

  if (list.some((d) => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, message: `Nama departemen '${trimmedName}' sudah digunakan oleh departemen lain.` };
  }
  if (list.some((d) => d.id !== id && d.code.toUpperCase() === trimmedCode)) {
    return { success: false, message: `Kode singkatan '${trimmedCode}' sudah digunakan departemen lain.` };
  }

  const oldName = target.name;
  const isNameChanged = oldName !== trimmedName;

  const updatedDept: DepartmentMaster = {
    ...target,
    name: trimmedName,
    code: trimmedCode,
    description: trimmedDesc,
    updatedAt: new Date().toISOString(),
  };

  saveDepartmentMasters(list.map((d) => (d.id === id ? updatedDept : d)));
  firestoreSaveDepartment(updatedDept);

  // Cascade updates if name changed
  let cascadeCount = 0;
  if (isNameChanged) {
    const users = getUsers();
    const updatedUsers = users.map((u) => {
      if (u.departemen === oldName) {
        cascadeCount++;
        const updatedU = { ...u, departemen: trimmedName };
        firestoreSaveUser(updatedU);
        return updatedU;
      }
      return u;
    });
    saveUsers(updatedUsers);

    const docs = getDocuments();
    const updatedDocs = docs.map((doc) => {
      if (doc.akses_dept === oldName) {
        cascadeCount++;
        const updatedD = { ...doc, akses_dept: trimmedName };
        firestoreSaveDocument(updatedD);
        return updatedD;
      }
      return doc;
    });
    saveDocuments(updatedDocs);

    const cats = getCategories();
    const updatedCats = cats.map((c) => {
      if (c.departemen === oldName) {
        cascadeCount++;
        const updatedC = { ...c, departemen: trimmedName };
        firestoreSaveCategory(updatedC);
        return updatedC;
      }
      return c;
    });
    saveCategories(updatedCats);

    const kpis = getKPIMaster();
    const updatedKPIs = kpis.map((k) => {
      if (k.departemen === oldName) {
        cascadeCount++;
        const updatedK = { ...k, departemen: trimmedName };
        firestoreSaveKPI(updatedK);
        return updatedK;
      }
      return k;
    });
    saveKPIMaster(updatedKPIs);

    const curr = getCurrentUser();
    if (curr && curr.departemen === oldName) {
      setCurrentUser({ ...curr, departemen: trimmedName });
    }
  }

  addAccessLog({
    user: actor,
    actionCategory: 'SYSTEM',
    action: 'Perbarui Data Departemen',
    target: `${oldName} -> ${trimmedName} (${trimmedCode})`,
    status: 'SUCCESS',
    details: isNameChanged
      ? `Nama departemen diubah dari "${oldName}" menjadi "${trimmedName}". Sinkronisasi relasi berhasil diterapkan ke Firestore.`
      : `Informasi kode/deskripsi departemen ${trimmedName} berhasil diperbarui di Firestore.`,
  });

  return {
    success: true,
    message: isNameChanged
      ? `Departemen berhasil diperbarui menjadi '${trimmedName}' & relasi data disinkronkan ke Firestore!`
      : `Informasi departemen '${trimmedName}' berhasil diperbarui!`,
    department: updatedDept,
  };
}

// ----------------- KPI MASTER -----------------
export function getKPIMaster(): KPIMasterItem[] {
  if (memoryKPIs && memoryKPIs.length > 0) {
    return memoryKPIs;
  }
  const loaded = getStored<KPIMasterItem[]>(STORAGE_KEYS.KPIS, INITIAL_KPIS);
  memoryKPIs = loaded;
  return loaded;
}

export function saveKPIMaster(kpis: KPIMasterItem[]): void {
  memoryKPIs = kpis;
  setStored(STORAGE_KEYS.KPIS, kpis);
}

export function addKPIMasterItem(item: KPIMasterItem, actor: User): void {
  const kpis = getKPIMaster();
  saveKPIMaster([...kpis, item]);
  firestoreSaveKPI(item);

  addAccessLog({
    user: actor,
    actionCategory: 'KPI_CONFIG',
    action: 'Tambah Master Indikator KPI',
    target: `${item.pillar} [${item.departemen} - ${item.target_role.toUpperCase()}]`,
    status: 'SUCCESS',
    details: `Bobot: ${item.weight}%, Target: ${item.target}. Disimpan di Firestore.`,
  });

  // Notifikasi KPI baru untuk SPV & Departemen terkait
  sendPushNotification({
    title: `Indikator KPI Baru: ${item.departemen}`,
    message: `Master KPI baru ditambahkan oleh ${actor.nama} untuk ${item.departemen} (${item.target_role.toUpperCase()}): "${item.pillar} - ${item.objective}". Target: ${item.target} (Bobot ${item.weight}%).`,
    category: 'KPI',
    targetDepartment: item.departemen,
    targetRole: 'spv',
  });
}

export function updateKPIMasterItem(item: KPIMasterItem, actor: User): void {
  const kpis = getKPIMaster();
  saveKPIMaster(kpis.map((k) => (k.id === item.id ? item : k)));
  firestoreSaveKPI(item);

  addAccessLog({
    user: actor,
    actionCategory: 'KPI_CONFIG',
    action: 'Ubah Indikator KPI',
    target: item.pillar,
    status: 'SUCCESS',
  });

  sendPushNotification({
    title: `Pembaruan KPI: ${item.departemen}`,
    message: `Indikator KPI "${item.pillar}" (${item.departemen} - ${item.target_role.toUpperCase()}) telah diperbarui oleh ${actor.nama}.`,
    category: 'KPI',
    targetDepartment: item.departemen,
    targetRole: 'spv',
  });
}

export function deleteKPIMasterItem(id: string, actor: User): void {
  const kpis = getKPIMaster();
  const target = kpis.find((k) => k.id === id);
  saveKPIMaster(kpis.filter((k) => k.id !== id));
  firestoreDeleteKPI(id);

  if (target) {
    addAccessLog({
      user: actor,
      actionCategory: 'KPI_CONFIG',
      action: 'Hapus Master Indikator KPI',
      target: target.pillar,
      status: 'SUCCESS',
    });
  }
}

export function deployKPI(dept: string, year: number | string, tipe: string, role: string, actor: User): void {
  const kpis = getKPIMaster();
  const updated = kpis.map((k) => {
    if (k.departemen === dept && String(k.tahun) === String(year) && k.tipe === tipe && k.target_role === role) {
      const activeItem = { ...k, status: 'Active' as const };
      firestoreSaveKPI(activeItem);
      return activeItem;
    }
    return k;
  });
  saveKPIMaster(updated);

  addAccessLog({
    user: actor,
    actionCategory: 'KPI_CONFIG',
    action: 'Deploy Indikator KPI Periode Aktif',
    target: `${dept} (${year} ${tipe} - ${role.toUpperCase()})`,
    status: 'SUCCESS',
    details: 'Status seluruh draf indikator diubah menjadi Active di Firebase Firestore.',
  });

  sendPushNotification({
    title: `KPI Aktif Dideploy: ${dept}`,
    message: `Indikator penilaian kinerja aktif periode ${year} (${tipe}) untuk ${role.toUpperCase()} departemen ${dept} telah resmi dideploy.`,
    category: 'KPI',
    targetDepartment: dept,
  });
}

// ----------------- PERFORMANCE APPRAISAL -----------------
export function getPerformances(): PerformanceAppraisal[] {
  if (memoryPerformances && memoryPerformances.length > 0) {
    return memoryPerformances;
  }
  const list = getStored<PerformanceAppraisal[]>(STORAGE_KEYS.PERFORMANCES, INITIAL_PERFORMANCES);
  if (!list || list.length === 0) {
    memoryPerformances = INITIAL_PERFORMANCES;
    return INITIAL_PERFORMANCES;
  }
  const existingIds = new Set(list.map((p) => p.id));
  const missingInitials = INITIAL_PERFORMANCES.filter((p) => !existingIds.has(p.id));
  if (missingInitials.length > 0) {
    const merged = [...list, ...missingInitials];
    setStored(STORAGE_KEYS.PERFORMANCES, merged);
    memoryPerformances = merged;
    return merged;
  }
  memoryPerformances = list;
  return list;
}

export function savePerformances(perfs: PerformanceAppraisal[]): void {
  memoryPerformances = perfs;
  setStored(STORAGE_KEYS.PERFORMANCES, perfs);
}

export function savePerformanceItem(perf: PerformanceAppraisal, actor: User): void {
  const list = getPerformances();
  const existingIdx = list.findIndex((p) => p.id === perf.id);
  let updatedItem: PerformanceAppraisal;
  let updatedList: PerformanceAppraisal[];

  if (existingIdx >= 0) {
    updatedItem = { ...perf, updatedAt: new Date().toISOString() };
    updatedList = [...list];
    updatedList[existingIdx] = updatedItem;
  } else {
    updatedItem = { ...perf, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    updatedList = [updatedItem, ...list];
  }

  savePerformances(updatedList);
  firestoreSavePerformance(updatedItem);

  addAccessLog({
    user: actor,
    actionCategory: 'APPRAISAL',
    action: `Simpan Evaluasi Kinerja (${perf.status}) ke Firestore`,
    target: `${perf.nama} - Periode ${perf.periode} (${perf.tipe})`,
    status: 'SUCCESS',
    details: `Skor Akhir: ${perf.finalGrandTotal.toFixed(2)} (${perf.finalGrade}). Status: ${perf.status}`,
  });

  // Notifikasi otomatis ke SPV, HOD, & Admin saat submit atau disetujui
  if (perf.status === 'Submitted' || perf.status === 'On Review') {
    sendPushNotification({
      title: `Submit KPI Baru: ${perf.nama}`,
      message: `Formulir penilaian kinerja ${perf.periode} (${perf.tipe}) dari ${perf.nama} (${perf.departemen}) telah disubmit dan menunggu review Manajer.`,
      category: 'KPI',
      targetDepartment: perf.departemen,
      targetRole: 'manager',
      documentId: perf.id,
    });
  } else if (perf.status === 'Approved') {
    sendPushNotification({
      title: `KPI Disetujui: ${perf.nama}`,
      message: `Evaluasi kinerja ${perf.periode} (${perf.tipe}) untuk ${perf.nama} telah disetujui (Skor: ${perf.finalGrandTotal.toFixed(2)}, Grade: ${perf.finalGrade}). Dokumen terkunci.`,
      category: 'KPI',
      targetDepartment: perf.departemen,
      documentId: perf.id,
    });
  }
}

/**
 * Submit form KPI oleh Staff / SPV: status beralih menjadi 'On Review'
 * dan notifikasi dikirimkan ke Manajer Departemen untuk segera diperiksa.
 */
export function submitPerformanceForReview(perf: PerformanceAppraisal, actor: User): PerformanceAppraisal {
  const updatedPerf: PerformanceAppraisal = {
    ...perf,
    status: 'On Review',
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };

  savePerformanceItem(updatedPerf, actor);

  sendPushNotification({
    title: `Perlu Dicek: Form KPI ${perf.nama}`,
    message: `Karyawan ${perf.nama} (${perf.role.toUpperCase()}) mengajukan form KPI periode ${perf.periode} (${perf.tipe}) ke Manajer Departemen ${perf.departemen} untuk diperiksa dan dinilai.`,
    category: 'KPI',
    targetDepartment: perf.departemen,
    targetRole: 'manager',
    documentId: perf.id,
  });

  addAccessLog({
    user: actor,
    actionCategory: 'APPRAISAL',
    action: 'Pengajuan Form KPI ke Manajer (On Review)',
    target: `${perf.nama} (${perf.departemen}) - Periode ${perf.periode} (${perf.tipe})`,
    status: 'SUCCESS',
    details: `Karyawan mengajukan evaluasi KPI. Status berubah menjadi 'On Review' dan notifikasi review dikirim ke Manajer Departemen.`,
  });

  return updatedPerf;
}

/**
 * Manajer menyetujui KPI (Approve): status menjadi 'Approved' dan dokumen DIKUNCI (isLocked: true).
 * Setelah disetujui, Staff maupun Manajer tidak dapat mengedit lagi. Hanya Super Admin yang bisa membuka kunci.
 */
export function approvePerformanceItem(
  perf: PerformanceAppraisal,
  actor: User,
  extra?: { managerFeedback?: string; hrRecommendation?: string }
): PerformanceAppraisal {
  const updatedPerf: PerformanceAppraisal = {
    ...perf,
    status: 'Approved',
    isLocked: true,
    approvedBy: actor.nama,
    approvedAt: new Date().toISOString(),
    managerFeedback: extra?.managerFeedback !== undefined ? extra.managerFeedback : perf.managerFeedback,
    hrRecommendation: extra?.hrRecommendation !== undefined ? extra.hrRecommendation : perf.hrRecommendation,
    updatedAt: new Date().toISOString(),
  };

  savePerformanceItem(updatedPerf, actor);

  // Notifikasi ke karyawan bahwa KPI telah disetujui dan dikunci
  sendPushNotification({
    title: `KPI Disetujui & Dikunci: ${perf.nama}`,
    message: `Form KPI Anda periode ${perf.periode} (${perf.tipe}) telah disetujui oleh Manajer ${actor.nama} dengan predikat ${perf.finalGrade} (Skor: ${perf.finalGrandTotal.toFixed(2)}). Dokumen resmi terkunci.`,
    category: 'KPI',
    targetDepartment: perf.departemen,
    documentId: perf.id,
  });

  addAccessLog({
    user: actor,
    actionCategory: 'APPRAISAL',
    action: 'Persetujuan & Penguncian Form KPI (Approved)',
    target: `${perf.nama} (${perf.departemen}) - Nilai: ${perf.finalGrandTotal.toFixed(2)} (${perf.finalGrade})`,
    status: 'SUCCESS',
    details: `Disetujui oleh Manajer ${actor.nama}. Dokumen dikunci permanen. Hanya Super Admin yang memiliki hak istimewa untuk membukanya kembali.`,
  });

  return updatedPerf;
}

/**
 * Super Admin privilege: Membuka kunci (Unlock) dokumen KPI yang sudah Approved
 * sehingga dapat diedit kembali oleh Manajer / Staff untuk koreksi data.
 */
export function unlockPerformanceItem(
  perfId: string,
  actor: User,
  reason: string = 'Koreksi data evaluasi kinerja'
): { success: boolean; message: string; performance?: PerformanceAppraisal } {
  if (actor.role !== 'admin') {
    return {
      success: false,
      message: 'Hanya Super Admin yang berwenang membuka kunci (Unlock) dokumen KPI yang telah disetujui.',
    };
  }

  const list = getPerformances();
  const target = list.find((p) => p.id === perfId);
  if (!target) {
    return { success: false, message: 'Dokumen evaluasi kinerja tidak ditemukan.' };
  }

  const updatedPerf: PerformanceAppraisal = {
    ...target,
    status: 'On Review',
    isLocked: false,
    unlockedBy: actor.nama,
    unlockedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedList = list.map((p) => (p.id === perfId ? updatedPerf : p));
  savePerformances(updatedList);
  firestoreSavePerformance(updatedPerf);

  sendPushNotification({
    title: `Kunci KPI Dibuka: ${target.nama}`,
    message: `Super Admin ${actor.nama} telah membuka kunci form KPI ${target.nama} (${target.departemen}). Status kini 'On Review' dan dapat disesuaikan kembali. Alasan: ${reason}`,
    category: 'KPI',
    targetDepartment: target.departemen,
    documentId: target.id,
  });

  addAccessLog({
    user: actor,
    actionCategory: 'APPRAISAL',
    action: 'Buka Kunci Form KPI (Unlock)',
    target: `${target.nama} (${target.departemen})`,
    status: 'SUCCESS',
    details: `Kunci dokumen dibuka oleh Super Admin ${actor.nama}. Alasan: ${reason}. Status diubah ke On Review.`,
  });

  return { success: true, message: 'Kunci formulir KPI berhasil dibuka. Dokumen kini dapat diedit kembali.', performance: updatedPerf };
}

/**
 * Hapus dokumen evaluasi kinerja (Super Admin only atau pemilik draf)
 */
export function deletePerformanceItem(perfId: string, actor: User): { success: boolean; message: string } {
  const list = getPerformances();
  const target = list.find((p) => p.id === perfId);
  if (!target) {
    return { success: false, message: 'Dokumen KPI tidak ditemukan.' };
  }

  if (target.isLocked && actor.role !== 'admin') {
    return { success: false, message: 'Dokumen KPI terkunci tidak dapat dihapus kecuali oleh Super Admin.' };
  }

  const updatedList = list.filter((p) => p.id !== perfId);
  savePerformances(updatedList);
  firestoreDeletePerformance(perfId);

  addAccessLog({
    user: actor,
    actionCategory: 'APPRAISAL',
    action: 'Hapus Dokumen Evaluasi Kinerja',
    target: `${target.nama} - Periode ${target.periode} (${target.tipe})`,
    status: 'SUCCESS',
    details: `Dihapus oleh ${actor.nama} (${actor.role.toUpperCase()}).`,
  });

  return { success: true, message: 'Dokumen KPI berhasil dihapus.' };
}

// ----------------- ANNOUNCEMENTS -----------------
export function getAnnouncements(): IntranetDocument[] {
  return (getDocuments() || []).filter((d) => d.category === 'Pengumuman');
}

// ----------------- NOTIFICATIONS (3-DAY RETENTION) -----------------
export const NOTIFICATION_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 hari

export function cleanExpiredNotifications(): PushNotification[] {
  const all = memoryNotifications || getStored<PushNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const now = Date.now();
  const valid = all.filter((n) => {
    const time = new Date(n.createdAt).getTime();
    return !isNaN(time) && now - time <= NOTIFICATION_RETENTION_MS;
  });

  memoryNotifications = valid;
  if (valid.length !== all.length) {
    setStored(STORAGE_KEYS.NOTIFICATIONS, valid);
  }
  return valid;
}

export function getNotifications(): PushNotification[] {
  if (memoryNotifications && memoryNotifications.length > 0) {
    return memoryNotifications;
  }
  return cleanExpiredNotifications();
}

export function saveNotifications(notifs: PushNotification[]): void {
  memoryNotifications = notifs;
  setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
}

export function sendPushNotification(params: {
  title: string;
  message: string;
  category: string;
  targetDepartment: string;
  targetRole?: string;
  documentId?: string;
}): void {
  const notifs = getNotifications();
  const newNotif: PushNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: params.title,
    message: params.message,
    category: params.category,
    targetDepartment: params.targetDepartment,
    targetRole: params.targetRole,
    documentId: params.documentId,
    createdAt: new Date().toISOString(),
    read: false,
  };

  saveNotifications([newNotif, ...notifs]);
  firestoreSaveNotification(newNotif);

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(params.title, {
          body: params.message,
        });
      } catch (e) {
        console.warn('Native notification error:', e);
      }
    }
  }
}

export function markNotificationAsRead(id: string): void {
  const notifs = getNotifications();
  saveNotifications(notifs.map((n) => (n.id === id ? { ...n, read: true } : n)));
  firestoreMarkNotificationRead(id);
}

export function markAllNotificationsAsRead(): void {
  const notifs = getNotifications();
  saveNotifications(notifs.map((n) => ({ ...n, read: true })));
  notifs.forEach((n) => {
    if (!n.read) firestoreMarkNotificationRead(n.id);
  });
}

export const markNotificationsAsRead = markAllNotificationsAsRead;

// ----------------- CLOUD FIRESTORE STORAGE CONFIG (SYSTEM CONFIG) -----------------
export const DEFAULT_STORAGE_CONFIG: SystemStorageConfig = {
  storageProvider: 'firestore',
  autoPruneAnnouncementsDays: 7,
  autoSyncEnabled: true,
  rootFolderId: 'firestore-native',
  rootFolderName: 'Penyimpanan Berkas Cloud Firestore',
  sopFolder: 'SOP',
  formsFolder: 'Formulir Kerja',
  photosFolder: 'Foto & Media',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_DRIVE_CONFIG: GoogleDriveStorageConfig = {
  ...DEFAULT_STORAGE_CONFIG,
  sharedDriveUrl: '',
  useDepartmentSubfolders: true,
};

export function extractDriveFolderId(input: string): string {
  if (!input) return '';
  return input.trim();
}

export function getSystemStorageConfig(): SystemStorageConfig {
  if (memoryConfig) return memoryConfig;
  const stored = getStored<any>(STORAGE_KEYS.CONFIG, DEFAULT_STORAGE_CONFIG);
  const res: SystemStorageConfig = {
    storageProvider: 'firestore',
    autoPruneAnnouncementsDays: stored.autoPruneAnnouncementsDays || 7,
    autoSyncEnabled: stored.autoSyncEnabled !== undefined ? stored.autoSyncEnabled : true,
    rootFolderId: stored.rootFolderId || 'firestore-native',
    rootFolderName: stored.rootFolderName || 'Penyimpanan Berkas Cloud Firestore',
    sopFolder: stored.sopFolder || 'SOP',
    formsFolder: stored.formsFolder || 'Formulir Kerja',
    photosFolder: stored.photosFolder || 'Foto & Media',
    updatedAt: stored.updatedAt || new Date().toISOString(),
  };
  memoryConfig = res;
  return res;
}

export function getDriveStorageConfig(): GoogleDriveStorageConfig {
  const base = getSystemStorageConfig();
  return {
    ...base,
    sharedDriveUrl: '',
    useDepartmentSubfolders: true,
  };
}

export function saveSystemStorageConfig(
  cfg: Partial<SystemStorageConfig>,
  actor?: User
): SystemStorageConfig {
  const current = getSystemStorageConfig();
  const updated: SystemStorageConfig = {
    ...current,
    ...cfg,
    storageProvider: 'firestore',
    updatedAt: new Date().toISOString(),
  };

  memoryConfig = updated;
  setStored(STORAGE_KEYS.CONFIG, updated);
  firestoreSaveConfig(updated);

  if (actor) {
    addAccessLog({
      user: actor,
      actionCategory: 'SYSTEM',
      action: 'Simpan Konfigurasi Penyimpanan Firestore',
      target: updated.rootFolderName || 'Cloud Firestore',
      status: 'SUCCESS',
      details: `Penyimpanan: Firebase Cloud Firestore. Retensi pengumuman otomatis: ${updated.autoPruneAnnouncementsDays} hari.`,
    });
  }

  return updated;
}

export function saveDriveStorageConfig(
  cfg: Partial<GoogleDriveStorageConfig>,
  actor?: User
): GoogleDriveStorageConfig {
  const res = saveSystemStorageConfig(cfg, actor);
  return {
    ...res,
    sharedDriveUrl: cfg.sharedDriveUrl || '',
    useDepartmentSubfolders: cfg.useDepartmentSubfolders !== undefined ? cfg.useDepartmentSubfolders : true,
  };
}

export function getSpreadsheetConfig(): SpreadsheetConfig {
  const conf = getSystemStorageConfig();
  return {
    ...conf,
    autoSync: true,
    autoSyncEnabled: true,
  };
}

export function saveSpreadsheetConfig(cfg: SpreadsheetConfig): void {
  saveSystemStorageConfig({
    autoPruneAnnouncementsDays: cfg.autoPruneAnnouncementsDays,
    autoSyncEnabled: cfg.autoSyncEnabled !== undefined ? cfg.autoSyncEnabled : true,
  });
}

