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
  return getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export function saveUsers(users: User[]): void {
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

// ----------------- DOCUMENTS (WITH GOOGLE DRIVE STORAGE) -----------------
export function getDocuments(): IntranetDocument[] {
  return getStored<IntranetDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
}

export function saveDocuments(docs: IntranetDocument[]): void {
  setStored(STORAGE_KEYS.DOCUMENTS, docs);
}

export function addDocument(doc: IntranetDocument, actor: User): void {
  const docs = getDocuments();
  const updated = [doc, ...docs];
  saveDocuments(updated);

  // Save document metadata and Google Drive links directly to Firestore
  firestoreSaveDocument(doc);

  // Record Structured Access Log
  addAccessLog({
    user: actor,
    actionCategory: 'DOCUMENT',
    action: 'Unggah Berkas ke Google Drive & Simpan ke Firebase',
    target: `${doc.title} (${doc.category})`,
    status: 'SUCCESS',
    details: `Dokumen disimpan di folder Google Drive dan didaftarkan ke Firebase Firestore. Distribusi: ${doc.akses_dept}`,
  });

  // Trigger Push Notification for relevant department users
  sendPushNotification({
    title: `Dokumen Baru: ${doc.title}`,
    message: `${doc.category} baru telah diterbitkan oleh ${actor.nama} untuk ${doc.akses_dept}. Berkas tersimpan di Google Drive.`,
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
      action: 'Hapus Dokumen Arsip',
      target: target.title,
      status: 'SUCCESS',
      details: `Dokumen ID ${docId} dihapus dari database Firebase Firestore.`,
    });
  }
}

// ----------------- STRUCTURED ACCESS LOGS -----------------
export function getAccessLogs(): AccessLog[] {
  return getStored<AccessLog[]>(STORAGE_KEYS.ACCESS_LOGS, INITIAL_ACCESS_LOGS);
}

export function saveAccessLogs(logs: AccessLog[]): void {
  setStored(STORAGE_KEYS.ACCESS_LOGS, logs);
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
  if (updated.length > 500) updated.length = 500;
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
  return getStored<CategoryMaster[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export function saveCategories(cats: CategoryMaster[]): void {
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
  return getStored<DepartmentMaster[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
}

export function saveDepartmentMasters(depts: DepartmentMaster[]): void {
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
  return getStored<KPIMasterItem[]>(STORAGE_KEYS.KPIS, INITIAL_KPIS);
}

export function saveKPIMaster(kpis: KPIMasterItem[]): void {
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
  const list = getStored<PerformanceAppraisal[]>(STORAGE_KEYS.PERFORMANCES, INITIAL_PERFORMANCES);
  if (!list || list.length === 0) return INITIAL_PERFORMANCES;
  const existingIds = new Set(list.map((p) => p.id));
  const missingInitials = INITIAL_PERFORMANCES.filter((p) => !existingIds.has(p.id));
  if (missingInitials.length > 0) {
    const merged = [...list, ...missingInitials];
    setStored(STORAGE_KEYS.PERFORMANCES, merged);
    return merged;
  }
  return list;
}

export function savePerformances(perfs: PerformanceAppraisal[]): void {
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
  if (perf.status === 'Submitted') {
    sendPushNotification({
      title: `Submit KPI Baru: ${perf.nama}`,
      message: `Formulir penilaian kinerja ${perf.periode} (${perf.tipe}) dari ${perf.nama} (${perf.departemen}) telah disubmit dan menunggu evaluasi SPV / HOD.`,
      category: 'KPI',
      targetDepartment: perf.departemen,
      targetRole: 'spv',
      documentId: perf.id,
    });
  } else if (perf.status === 'Approved') {
    sendPushNotification({
      title: `KPI Disetujui: ${perf.nama}`,
      message: `Evaluasi kinerja ${perf.periode} (${perf.tipe}) untuk ${perf.nama} telah disetujui (Skor: ${perf.finalGrandTotal.toFixed(2)}, Grade: ${perf.finalGrade}).`,
      category: 'KPI',
      targetDepartment: perf.departemen,
      documentId: perf.id,
    });
  }
}

// ----------------- ANNOUNCEMENTS -----------------
export function getAnnouncements(): IntranetDocument[] {
  return (getDocuments() || []).filter((d) => d.category === 'Pengumuman');
}

// ----------------- NOTIFICATIONS (3-DAY RETENTION) -----------------
export const NOTIFICATION_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 hari

export function cleanExpiredNotifications(): PushNotification[] {
  const all = getStored<PushNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const now = Date.now();
  const valid = all.filter((n) => {
    const time = new Date(n.createdAt).getTime();
    return !isNaN(time) && now - time <= NOTIFICATION_RETENTION_MS;
  });

  if (valid.length !== all.length) {
    setStored(STORAGE_KEYS.NOTIFICATIONS, valid);
  }
  return valid;
}

export function getNotifications(): PushNotification[] {
  return cleanExpiredNotifications();
}

export function saveNotifications(notifs: PushNotification[]): void {
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
          icon: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&auto=format&fit=crop',
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

// ----------------- GOOGLE DRIVE STORAGE CONFIG (SYSTEM CONFIG) -----------------
export function getSpreadsheetConfig(): SpreadsheetConfig {
  const conf = getStored<SpreadsheetConfig>(STORAGE_KEYS.CONFIG, {
    spreadsheetId: '',
    gasWebAppUrl: '',
    googleDriveFolderId: 'Intranet_Ciputra_Uploads',
    autoSync: true,
  });
  return {
    ...conf,
    webAppUrl: conf.webAppUrl || conf.gasWebAppUrl,
    driveFolderId: conf.driveFolderId || conf.googleDriveFolderId,
    autoSyncEnabled: conf.autoSyncEnabled !== undefined ? conf.autoSyncEnabled : true,
  };
}

export function saveSpreadsheetConfig(cfg: SpreadsheetConfig): void {
  const full: SpreadsheetConfig = {
    ...cfg,
    gasWebAppUrl: cfg.gasWebAppUrl || cfg.webAppUrl || '',
    webAppUrl: cfg.webAppUrl || cfg.gasWebAppUrl || '',
    googleDriveFolderId: cfg.googleDriveFolderId || cfg.driveFolderId || 'Intranet_Ciputra_Uploads',
    driveFolderId: cfg.driveFolderId || cfg.googleDriveFolderId || 'Intranet_Ciputra_Uploads',
    autoSync: true,
    autoSyncEnabled: true,
  };
  setStored(STORAGE_KEYS.CONFIG, full);
  firestoreSaveConfig(full);
}
