export type Language = 'id' | 'en';

export const translations = {
  id: {
    // Brand & Header
    hotelName: 'Hotel Ciputra Jakarta',
    intranetPortal: 'Intranet Portal',
    portalSubtitle: 'Penyimpanan Dokumen & Cloud Architecture',
    googleSheetStudio: 'Google Sheet Studio',
    
    // Sidebar Headings
    archivesAndFiles: 'Arsip & Berkas',
    masterAndConfig: 'Master & Konfigurasi',
    superAdminControl: 'Super Admin Control',
    yourDepartment: 'Departemen Anda',
    allFilesAccess: 'Akses Semua Berkas & Upload',
    deptProtectedFilter: 'Filter Terproteksi Departemen',
    logoutSession: 'Keluar Sesi',
    
    // Sidebar Menus
    menuAnnouncements: 'Pengumuman & Berita',
    menuSOP: 'File SOP',
    menuForms: 'Formulir Kerja',
    menuPerformance: 'Review Kinerja (Appraisal)',
    menuDepartments: 'Master Departemen',
    menuCategories: 'Master Kategori',
    menuKPIMaster: 'Master Data KPI',
    menuUserManagement: 'Manajemen User',
    menuAccessLogs: 'Sistem Log Akses',
    menuCloudSync: 'Firebase & Drive Cloud',
    
    // Notifications
    notificationsTitle: 'Notifikasi Masuk',
    unreadCountLabel: 'belum dibaca',
    totalCountLabel: 'total',
    markAllRead: 'Tandai semua dibaca',
    enablePushNotice: 'Aktifkan notifikasi push browser',
    allowPushBtn: 'Izinkan',
    noActiveNotifications: 'Belum ada notifikasi baru untuk departemen Anda.',
    autoExpireNotice: 'Notifikasi otomatis kedaluwarsa & terhapus setelah 3 hari.',
    expiresInDays: 'Aktif sisa',
    daysUnit: 'hari',
    hoursUnit: 'jam',
    minutesUnit: 'menit lalu',
    justNow: 'Baru saja',
    
    // User Profile & Roles
    signedInAs: 'Masuk Sebagai',
    myProfile: 'Profil Akun Saya',
    accessLogsMenu: 'Sistem Log Akses Terstruktur',
    signOut: 'Keluar (Sign Out)',
    roleAdmin: 'SUPER ADMIN',
    roleManager: 'MANAGER',
    roleSpv: 'SPV / SUPERVISOR',
    roleHod: 'HEAD OF DEPT',
    roleStaff: 'STAFF',
    
    // Common Actions
    save: 'Simpan',
    cancel: 'Batal',
    edit: 'Ubah Data',
    delete: 'Hapus',
    add: 'Tambah',
    search: 'Cari...',
    filter: 'Filter',
    reset: 'Reset',
    actions: 'Aksi',
    status: 'Status',
    languageLabel: 'Bahasa',
  },
  en: {
    // Brand & Header
    hotelName: 'Hotel Ciputra Jakarta',
    intranetPortal: 'Intranet Portal',
    portalSubtitle: 'Document Storage & Cloud Architecture',
    googleSheetStudio: 'Google Sheet Studio',
    
    // Sidebar Headings
    archivesAndFiles: 'Archives & Documents',
    masterAndConfig: 'Master & Configuration',
    superAdminControl: 'Super Admin Control',
    yourDepartment: 'Your Department',
    allFilesAccess: 'All Files & Upload Access',
    deptProtectedFilter: 'Department Protected Filter',
    logoutSession: 'Log Out',
    
    // Sidebar Menus
    menuAnnouncements: 'Announcements & News',
    menuSOP: 'SOP Documents',
    menuForms: 'Work Forms',
    menuPerformance: 'Performance Appraisal',
    menuDepartments: 'Department Master',
    menuCategories: 'Category Master',
    menuKPIMaster: 'KPI Master Data',
    menuUserManagement: 'User Management',
    menuAccessLogs: 'Access Audit Logs',
    menuCloudSync: 'Firebase & Cloud Drive',
    
    // Notifications
    notificationsTitle: 'Incoming Notifications',
    unreadCountLabel: 'unread',
    totalCountLabel: 'total',
    markAllRead: 'Mark all as read',
    enablePushNotice: 'Enable browser push notifications',
    allowPushBtn: 'Allow',
    noActiveNotifications: 'No active notifications for your department.',
    autoExpireNotice: 'Notifications automatically expire and delete after 3 days.',
    expiresInDays: 'Expires in',
    daysUnit: 'days',
    hoursUnit: 'hours',
    minutesUnit: 'min ago',
    justNow: 'Just now',
    
    // User Profile & Roles
    signedInAs: 'Signed In As',
    myProfile: 'My Account Profile',
    accessLogsMenu: 'Structured Access Audit Logs',
    signOut: 'Sign Out',
    roleAdmin: 'SUPER ADMIN',
    roleManager: 'MANAGER',
    roleSpv: 'SPV / SUPERVISOR',
    roleHod: 'HEAD OF DEPT',
    roleStaff: 'STAFF',
    
    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit Data',
    delete: 'Delete',
    add: 'Add',
    search: 'Search...',
    filter: 'Filter',
    reset: 'Reset',
    actions: 'Actions',
    status: 'Status',
    languageLabel: 'Language',
  }
};

const LANG_STORAGE_KEY = 'ciputra_intra_lang_v1';

export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'id';
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

export function saveLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Failed to save language preference:', e);
  }
}

export function t(key: keyof typeof translations['id'], lang: Language | string = 'id'): string {
  const normalizedLang: Language = lang === 'en' ? 'en' : 'id';
  const dict = translations[normalizedLang] || translations.id;
  return dict[key] || translations.id[key] || String(key);
}
