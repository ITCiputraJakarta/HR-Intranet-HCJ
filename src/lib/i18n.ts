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

    // Authentication & Registration
    loginTab: 'Masuk Sistem',
    registerTab: 'Daftar Akun Baru',
    emailLabel: 'Alamat Email Karyawan',
    passwordLabel: 'Kata Sandi',
    loginSubmitBtn: 'Masuk ke Portal Intranet',
    fullNameLabel: 'Nama Lengkap',
    deptLabel: 'Departemen',
    roleLabel: 'Jabatan / Peran',
    workEmailLabel: 'Email Kantor',
    createPasswordLabel: 'Buat Kata Sandi',
    registerSubmitBtn: 'Kirim Pendaftaran Akun',
    authSecurityNotice: 'Autentikasi Terverifikasi & Log Akses Terstruktur',
    emailPlaceholder: 'nama@ciputra.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'Contoh: Sarah Oktaviana',
    passwordMinChars: 'Minimal 6 karakter',
    allDepartments: 'Semua Departemen',
    roleStaffDesc: 'Staff (Pelaksana Operasional)',
    roleSpvDesc: 'Supervisor (SPV)',
    roleManagerDesc: 'Manager Departemen',
    roleHodDesc: 'Head of Dept (HOD)',
    roleAdminDesc: 'Super Admin (Akses Penuh)',
    errEmailNotRegistered: 'Alamat email belum terdaftar di sistem.',
    errWrongPassword: 'Kata sandi yang Anda masukkan salah.',
    errAccountPending: 'Akun Anda masih berstatus Tertunda (Pending). Harap menunggu persetujuan dari Super Admin / HR.',
    errFillAllFields: 'Harap lengkapi semua kolom pendaftaran.',
    errEmailTaken: 'Email tersebut sudah terdaftar di sistem.',
    successRegistered: 'Pendaftaran berhasil! Akun Anda telah dicatat dengan status Pending dan menunggu persetujuan Super Admin.',
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

    // Authentication & Registration
    loginTab: 'Sign In',
    registerTab: 'Register New Account',
    emailLabel: 'Employee Email Address',
    passwordLabel: 'Password',
    loginSubmitBtn: 'Sign In to Intranet Portal',
    fullNameLabel: 'Full Name',
    deptLabel: 'Department',
    roleLabel: 'Position / Role',
    workEmailLabel: 'Work Email',
    createPasswordLabel: 'Create Password',
    registerSubmitBtn: 'Submit Account Registration',
    authSecurityNotice: 'Verified Authentication & Structured Access Logs',
    emailPlaceholder: 'name@ciputra.com',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'Example: Sarah Oktaviana',
    passwordMinChars: 'Minimum 6 characters',
    allDepartments: 'All Departments',
    roleStaffDesc: 'Staff (Operational)',
    roleSpvDesc: 'Supervisor (SPV)',
    roleManagerDesc: 'Department Manager',
    roleHodDesc: 'Head of Dept (HOD)',
    roleAdminDesc: 'Super Admin (Full Access)',
    errEmailNotRegistered: 'This email address is not registered in the system.',
    errWrongPassword: 'The password you entered is incorrect.',
    errAccountPending: 'Your account is currently Pending approval by Super Admin / HR.',
    errFillAllFields: 'Please complete all required fields.',
    errEmailTaken: 'This email address is already registered in the system.',
    successRegistered: 'Registration successful! Your account is now Pending approval by Super Admin.',
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
