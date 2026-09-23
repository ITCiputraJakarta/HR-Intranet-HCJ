export type Language = 'id' | 'en';

export const translations = {
  id: {
    // Brand & Header
    hotelName: 'Intranet HCJ',
    hotelFullName: 'Hotel Ciputra Jakarta',
    intranetPortal: 'Intranet HCJ',
    portalSubtitle: 'Portal Dokumen & Evaluasi Kinerja',
    googleSheetStudio: 'Studio Basis Data',
    
    // Page Headers Translations
    headerAnnouncementsTitle: 'Pengumuman & Berita Perusahaan',
    headerAnnouncementsSubtitle: 'Informasi resmi, buletin manajemen, dan kegiatan internal hotel',
    headerSOPTitle: 'Standar Operasional Prosedur (SOP)',
    headerSOPSubtitle: 'Panduan kerja resmi departemen dan standarisasi operasional hotel',
    headerFormsTitle: 'Formulir Kerja Departemen',
    headerFormsSubtitle: 'Format template permohonan kerja, checklist, dan arsip formulir operasional',
    headerPerformanceTitle: 'Evaluasi Kinerja & Capaian KPI',
    headerPerformanceSubtitle: 'Penilaian mandiri, evaluasi perilaku atasan, dan persetujuan KPI terkunci',
    headerDepartmentsTitle: 'Master Departemen Operasional',
    headerDepartmentsSubtitle: 'Struktur organisasi dan kode singkatan divisi Hotel Ciputra Jakarta',
    headerCategoriesTitle: 'Master Kategori Dokumen',
    headerCategoriesSubtitle: 'Klasifikasi pengarsipan dan subkategori arsip digital Firestore',
    headerKPIMasterTitle: 'Master Indikator Kinerja Utama (KPI)',
    headerKPIMasterSubtitle: 'Standar bobot, target, dan kriteria penilaian tiap posisi departemen',
    headerUsersTitle: 'Manajemen Pengguna & Otoritas Akun',
    headerUsersSubtitle: 'Persetujuan akun baru, penetapan hak akses role, dan kelola sandi',
    headerLogsTitle: 'Sistem Log Audit Aktivitas',
    headerLogsSubtitle: 'Rekam jejak terstruktur autentikasi, dokumen, dan perubahan data (Kebijakan Retensi 7 Hari)',

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
    menuCloudSync: 'Konfigurasi Cloud & Logo',
    
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
    loginSubmitBtn: 'Masuk ke Intranet HCJ',
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
    errCaptchaInvalid: 'Kode captcha tidak cocok atau belum diisi. Silakan coba lagi.',
    successRegistered: 'Pendaftaran berhasil! Akun Anda telah dicatat dengan status Pending dan menunggu persetujuan Super Admin.',
    customLogoLabel: 'Logo Portal Khusus',
    creatorSignatureText: '© 2026 Intranet HCJ | Developed by Bagas @2026',
  },
  en: {
    // Brand & Header
    hotelName: 'Intranet HCJ',
    hotelFullName: 'Hotel Ciputra Jakarta',
    intranetPortal: 'Intranet HCJ',
    portalSubtitle: 'Document Portal & Performance Appraisal',
    googleSheetStudio: 'Database Studio',
    
    // Page Headers Translations
    headerAnnouncementsTitle: 'Company Announcements & News',
    headerAnnouncementsSubtitle: 'Official notices, management bulletins, and internal hotel activities',
    headerSOPTitle: 'Standard Operating Procedures (SOP)',
    headerSOPSubtitle: 'Official departmental guidelines and hotel operational standardization',
    headerFormsTitle: 'Departmental Work Forms',
    headerFormsSubtitle: 'Request templates, operational checklists, and departmental form archives',
    headerPerformanceTitle: 'Performance Appraisal & KPI Achievement',
    headerPerformanceSubtitle: 'Self-appraisal, manager behavioral scoring, and locked KPI approvals',
    headerDepartmentsTitle: 'Operational Departments Master',
    headerDepartmentsSubtitle: 'Organizational hierarchy and division abbreviation codes of HCJ',
    headerCategoriesTitle: 'Document Categories Master',
    headerCategoriesSubtitle: 'Archival classifications and Firestore digital archive subcategories',
    headerKPIMasterTitle: 'Key Performance Indicators (KPI) Master',
    headerKPIMasterSubtitle: 'Weight standards, targets, and evaluation criteria per job role',
    headerUsersTitle: 'User Management & Authorization',
    headerUsersSubtitle: 'Account approvals, multi-role permissions, and credential management',
    headerLogsTitle: 'System Activity Audit Logs',
    headerLogsSubtitle: 'Structured audit trail of authentication, documents, and data changes (7-Day Policy)',

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
    menuCloudSync: 'Cloud & Logo Config',
    
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
    loginSubmitBtn: 'Sign In to Intranet HCJ',
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
    errCaptchaInvalid: 'Captcha code does not match or is missing. Please try again.',
    successRegistered: 'Registration successful! Your account is now Pending approval by Super Admin.',
    customLogoLabel: 'Custom Portal Logo',
    creatorSignatureText: '© 2026 Intranet HCJ | Developed By Bagas @2026',
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
