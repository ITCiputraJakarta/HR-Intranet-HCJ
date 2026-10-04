import { User, IntranetDocument, AccessLog, CategoryMaster, DepartmentMaster, KPIMasterItem, PerformanceAppraisal, PushNotification, HotelUnitMaster } from '../types';

export const HOTEL_UNITS: HotelUnitMaster[] = [
  {
    id: 'unit-hcj',
    name: 'Hotel Ciputra Jakarta',
    shortName: 'Hotel Ciputra Jakarta',
    code: 'HCJ',
    announcementPruneDays: 7,
    announcementRuleNote: 'Masa tayang standar 7 hari, distribusi khusus staf Hotel Ciputra Jakarta.',
    sopRuleNote: 'Standar SOP mengacu pada operasional Hotel Ciputra Jakarta.'
  }
];

export const HOTEL_UNIT_NAMES = HOTEL_UNITS.map((u) => u.name);

export const INITIAL_DEPARTMENTS: DepartmentMaster[] = [
  {
    id: "dept-001",
    unit: "All Units",
    name: "Front Office",
    code: "FO",
    description: "Layanan resepsionis, reservasi, concierge, dan operasional kedatangan tamu hotel.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-002",
    unit: "All Units",
    name: "Housekeeping",
    code: "HK",
    description: "Kebersihan, kenyamanan kamar tamu, penataan linen, laundry, dan area publik hotel.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-003",
    unit: "All Units",
    name: "Food & Beverage",
    code: "FB",
    description: "Pelayanan restoran, banquet, bar, room service, dan standar operasional kuliner hotel.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-004",
    unit: "All Units",
    name: "Engineering",
    code: "ENG",
    description: "Pemeliharaan teknis, fasilitas gedung, listrik, AC, plumbing, dan utilitas hotel.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-005",
    unit: "All Units",
    name: "Accounting & Finance",
    code: "ACC",
    description: "Pengelolaan keuangan, pembukuan, purchasing, audit kasir, dan perpajakan hotel.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-006",
    unit: "All Units",
    name: "Human Resources (HR)",
    code: "HR",
    description: "Manajemen SDM, rekrutmen, pelatihan kerja, evaluasi kinerja, dan kesejahteraan karyawan.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-007",
    unit: "All Units",
    name: "Sales & Marketing",
    code: "SM",
    description: "Penjualan kamar korporat, mice, promosi hotel, public relations, dan pemasaran digital.",
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "dept-008",
    unit: "All Units",
    name: "Security",
    code: "SEC",
    description: "Keamanan hotel 24 jam, pengawasan CCTV, keselamatan tamu, dan tanggap darurat.",
    createdAt: "2026-01-01T00:00:00Z"
  }
];

export const DEPARTMENTS = INITIAL_DEPARTMENTS.map((d) => d.name);

export const INITIAL_USERS: User[] = [
  // SUPER ADMIN (Lintas Unit / All Units)
  {
    id: "usr-001",
    nama: "Admin System",
    email: "admin@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Human Resources (HR)",
    role: "admin",
    status: "Approved",
    password: "admin",
    createdAt: "2026-01-10T08:00:00Z"
  },
  // ================= UNIT 1: HOTEL CIPUTRA JAKARTA =================
  {
    id: "usr-002",
    nama: "Hendra Wijaya",
    email: "hendra.fo@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Front Office",
    role: "manager",
    status: "Approved",
    password: "password123",
    createdAt: "2026-01-15T09:30:00Z"
  },
  {
    id: "usr-003",
    nama: "Siti Rahmawati",
    email: "siti.spv@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Front Office",
    role: "spv",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-01T10:15:00Z"
  },
  {
    id: "usr-004",
    nama: "Budi Santoso",
    email: "budi.staff@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Front Office",
    role: "staff",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-10T11:00:00Z"
  },
  {
    id: "usr-005",
    nama: "Dewi Lestari",
    email: "dewi.hk@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Housekeeping",
    role: "staff",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-12T13:45:00Z"
  },
  {
    id: "usr-006",
    nama: "Ahmad Fauzi",
    email: "fauzi.eng@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Engineering",
    role: "spv",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-14T08:20:00Z"
  },
  {
    id: "usr-007",
    nama: "Rian Pratama",
    email: "rian.new@ciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Food & Beverage",
    role: "staff",
    status: "Pending",
    password: "password123",
    createdAt: "2026-03-01T14:10:00Z"
  },
  // ================= UNIT 2: HOTEL CIPUTRA GROUP (UNIT 2) =================
  {
    id: "usr-201",
    nama: "Antonius Pratama",
    email: "anton.hod.u2@ciputra.com",
    unit: "Hotel Ciputra Group (Unit 2)",
    departemen: "Front Office",
    role: "hod",
    status: "Approved",
    password: "password123",
    createdAt: "2026-01-18T08:30:00Z"
  },
  {
    id: "usr-202",
    nama: "Rina Kusuma",
    email: "rina.mgr.u2@ciputra.com",
    unit: "Hotel Ciputra Group (Unit 2)",
    departemen: "Housekeeping",
    role: "manager",
    status: "Approved",
    password: "password123",
    createdAt: "2026-01-22T09:15:00Z"
  },
  {
    id: "usr-203",
    nama: "Dimas Saputra",
    email: "dimas.spv.u2@ciputra.com",
    unit: "Hotel Ciputra Group (Unit 2)",
    departemen: "Food & Beverage",
    role: "spv",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-04T10:00:00Z"
  },
  {
    id: "usr-204",
    nama: "Nadia Putri",
    email: "nadia.staff.u2@ciputra.com",
    unit: "Hotel Ciputra Group (Unit 2)",
    departemen: "Front Office",
    role: "staff",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-11T11:30:00Z"
  },
  {
    id: "usr-205",
    nama: "Reza Mahendra",
    email: "reza.staff.u2@ciputra.com",
    unit: "Hotel Ciputra Group (Unit 2)",
    departemen: "Engineering",
    role: "staff",
    status: "Approved",
    password: "password123",
    createdAt: "2026-02-16T14:20:00Z"
  }
];

export const INITIAL_CATEGORIES: CategoryMaster[] = [
  { id: "cat-001", unit: "All Units", departemen: "Front Office", nama_kategori: "Standar Layanan Tamu" },
  { id: "cat-002", unit: "All Units", departemen: "Front Office", nama_kategori: "Prosedur Check-in & Check-out" },
  { id: "cat-003", unit: "All Units", departemen: "Housekeeping", nama_kategori: "Sanitasi & Room Cleaning" },
  { id: "cat-004", unit: "All Units", departemen: "Food & Beverage", nama_kategori: "HACCP & Kebersihan Dapur" },
  { id: "cat-005", unit: "All Units", departemen: "Engineering", nama_kategori: "Pemeliharaan AC & Genset" },
  { id: "cat-006", unit: "All Units", departemen: "Human Resources (HR)", nama_kategori: "Kebijakan Cuti & Benefit" },
  { id: "cat-007", unit: "All Units", departemen: "All Departments", nama_kategori: "Protokol Keselamatan Kerja (K3)" }
];

export const INITIAL_DOCUMENTS: IntranetDocument[] = [
  // UNIT 1 DOCUMENTS & ANNOUNCEMENTS
  {
    id: "doc-101",
    title: "[Unit 1 HCJ] Kebijakan Libur Hari Raya Idul Fitri & Operasional Hotel 2026",
    category: "Pengumuman",
    sub_kategori: "Kebijakan Cuti & Benefit",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "All Departments",
    keterangan: "Khusus Staf Unit 1 (Hotel Ciputra Jakarta): Jadwal operasional serta ketentuan lembur (holiday surcharge) selama periode Hari Raya Idul Fitri 1447 H / 2026.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "SK-HCJ-04-Libur-Lebaran-2026.pdf",
    fileType: "application/pdf",
    fileSize: "1.8 MB",
    attachmentUrl: "data:application/pdf;base64,JVBERi0xLjQK",
    attachmentName: "SK-HCJ-04-Libur-Lebaran-2026.pdf",
    attachmentType: "application/pdf",
    attachmentSize: "1.8 MB",
    uploadedBy: "Admin System",
    uploadedByEmail: "admin@ciputra.com",
    uploadedAt: "2026-09-20T09:00:00Z",
    effectiveDate: "2026-09-01",
    expiryDate: "2026-12-31"
  },
  {
    id: "doc-102",
    title: "[Unit 1 HCJ] Pengumuman Employee of the Month - Budi Santoso",
    category: "Pengumuman",
    sub_kategori: "Kebijakan Cuti & Benefit",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "All Departments",
    keterangan: "Selamat kepada Budi Santoso (Front Office - Unit 1 Hotel Ciputra Jakarta) atas dedikasi dan pelayanan istimewa dengan skor ulasan kepuasan tamu bintang 5.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "Employee-Of-The-Month-HCJ-2026.pdf",
    fileType: "application/pdf",
    fileSize: "1.2 MB",
    uploadedBy: "Admin System",
    uploadedByEmail: "admin@ciputra.com",
    uploadedAt: "2026-09-22T11:30:00Z",
    effectiveDate: "2026-09-01",
    expiryDate: "2026-12-31"
  },
  {
    id: "doc-103",
    title: "[SOP Unit 1 HCJ] Penanganan Tamu VIP & Express Check-In Digital",
    category: "SOP",
    sub_kategori: "Prosedur Check-in & Check-out",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "Front Office",
    keterangan: "Standar Operasional Prosedur khusus Unit 1 (Hotel Ciputra Jakarta): Penyambutan tamu VIP korporat, validasi ID digital, dan penyerahan RFID smart key card.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "SOP-HCJ-FO-01-VIP-Express-Checkin.pdf",
    fileType: "application/pdf",
    fileSize: "3.2 MB",
    uploadedBy: "Hendra Wijaya",
    uploadedByEmail: "hendra.fo@ciputra.com",
    uploadedAt: "2026-02-20T14:00:00Z"
  },
  {
    id: "doc-104",
    title: "[SOP Unit 1 HCJ] Pembersihan Kamar Suite & Sanitasi Linen",
    category: "SOP",
    sub_kategori: "Sanitasi & Room Cleaning",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "Housekeeping",
    keterangan: "Langkah-langkah pembersihan kamar suite room Unit 1 (Hotel Ciputra Jakarta), penggantian linen microfiber, dan desinfeksi kamar mandi.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "SOP-HCJ-HK-03-Suite-Cleaning.pdf",
    fileType: "application/pdf",
    fileSize: "2.1 MB",
    uploadedBy: "Admin System",
    uploadedByEmail: "admin@ciputra.com",
    uploadedAt: "2026-02-18T10:20:00Z"
  },
  {
    id: "doc-105",
    title: "[Form Unit 1 HCJ] Formulir Pengajuan Cuti Tahunan & Sakit",
    category: "Form",
    sub_kategori: "Kebijakan Cuti & Benefit",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "All Departments",
    keterangan: "Formulir resmi staf Unit 1 (Hotel Ciputra Jakarta) yang wajib diisi karyawan dan disetujui Supervisor / HOD minimal 7 hari sebelum tanggal cuti.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "Form-HCJ-HR-07-Pengajuan-Cuti.pdf",
    fileType: "application/pdf",
    fileSize: "450 KB",
    uploadedBy: "Admin System",
    uploadedByEmail: "admin@ciputra.com",
    uploadedAt: "2026-01-25T08:30:00Z"
  },
  {
    id: "doc-106",
    title: "[Form Unit 1 HCJ] Formulir Work Order Pemeliharaan Engineering",
    category: "Form",
    sub_kategori: "Pemeliharaan AC & Genset",
    unit: "Hotel Ciputra Jakarta",
    akses_dept: "Engineering",
    keterangan: "Formulir tiket perbaikan fasilitas kamar dan area publik khusus gedung Unit 1 (Hotel Ciputra Jakarta).",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "Form-HCJ-ENG-02-Work-Order.pdf",
    fileType: "application/pdf",
    fileSize: "580 KB",
    uploadedBy: "Ahmad Fauzi",
    uploadedByEmail: "fauzi.eng@ciputra.com",
    uploadedAt: "2026-02-05T09:10:00Z"
  },
  // UNIT 2 DOCUMENTS & ANNOUNCEMENTS (TERPISAH)
  {
    id: "doc-201",
    title: "[Unit 2 HC Group] Aturan Baru Seragam Kerja & Briefing Shift Pagi 2026",
    category: "Pengumuman",
    sub_kategori: "Kebijakan Cuti & Benefit",
    unit: "Hotel Ciputra Group (Unit 2)",
    akses_dept: "All Departments",
    keterangan: "Khusus seluruh staf Unit 2 (Hotel Ciputra Group): Berlaku aturan baru penggunaan seragam kerja hospitality dan jadwal morning briefing pukul 07:30 WIB (Masa tayang rule Unit 2: 14 hari).",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "Pengumuman-HCG2-01-Seragam-Shift.pdf",
    fileType: "application/pdf",
    fileSize: "1.4 MB",
    uploadedBy: "Antonius Pratama",
    uploadedByEmail: "anton.hod.u2@ciputra.com",
    uploadedAt: "2026-09-24T08:00:00Z",
    effectiveDate: "2026-09-15",
    expiryDate: "2026-12-31"
  },
  {
    id: "doc-202",
    title: "[SOP Unit 2 HC Group] Prosedur Check-In Group & Banquet Event",
    category: "SOP",
    sub_kategori: "Prosedur Check-in & Check-out",
    unit: "Hotel Ciputra Group (Unit 2)",
    akses_dept: "Front Office",
    keterangan: "SOP khusus Unit 2 (Hotel Ciputra Group): Alur registrasi grup MICE, alokasi blok kamar terpisah, dan koordinasi welcome refreshment dengan tim F&B Unit 2.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "SOP-HCG2-FO-01-Group-Banquet.pdf",
    fileType: "application/pdf",
    fileSize: "2.6 MB",
    uploadedBy: "Antonius Pratama",
    uploadedByEmail: "anton.hod.u2@ciputra.com",
    uploadedAt: "2026-03-02T10:00:00Z"
  },
  {
    id: "doc-203",
    title: "[SOP Unit 2 HC Group] Standar Inspeksi Villa & Executive Floor",
    category: "SOP",
    sub_kategori: "Sanitasi & Room Cleaning",
    unit: "Hotel Ciputra Group (Unit 2)",
    akses_dept: "Housekeeping",
    keterangan: "SOP khusus departemen Housekeeping Unit 2 (Hotel Ciputra Group): Standar tata letak amenities, perawatan marmer, dan checklist inspeksi supervisor.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "SOP-HCG2-HK-02-Executive-Floor.pdf",
    fileType: "application/pdf",
    fileSize: "1.9 MB",
    uploadedBy: "Rina Kusuma",
    uploadedByEmail: "rina.mgr.u2@ciputra.com",
    uploadedAt: "2026-03-04T11:30:00Z"
  },
  {
    id: "doc-204",
    title: "[Form Unit 2 HC Group] Formulir Izin Pertukaran Shift Operasional",
    category: "Form",
    sub_kategori: "Kebijakan Cuti & Benefit",
    unit: "Hotel Ciputra Group (Unit 2)",
    akses_dept: "All Departments",
    keterangan: "Formulir khusus karyawan Unit 2 (Hotel Ciputra Group) untuk pengajuan pertukaran jadwal shift antar staf dalam satu departemen.",
    fileUrl: "",
    previewUrl: "",
    downloadUrl: "",
    thumbUrl: "",
    fileName: "Form-HCG2-HR-01-Tukar-Shift.pdf",
    fileType: "application/pdf",
    fileSize: "390 KB",
    uploadedBy: "Antonius Pratama",
    uploadedByEmail: "anton.hod.u2@ciputra.com",
    uploadedAt: "2026-03-05T09:15:00Z"
  }
];

const initLogNow = Date.now();
const initLogHour = 3600 * 1000;
const initLogDay = 24 * initLogHour;

export const INITIAL_ACCESS_LOGS: AccessLog[] = [
  {
    id: "log-1001",
    timestamp: new Date(initLogNow - 2 * initLogHour).toISOString(),
    userName: "Budi Santoso",
    userEmail: "budi.staff@ciputra.com",
    role: "staff",
    departemen: "Front Office",
    actionCategory: "AUTH",
    action: "Login Pengguna Berhasil",
    target: "Sesi Web Portal",
    status: "SUCCESS",
    details: "Autentikasi kredensial berhasil diverifikasi.",
    ipAddress: "192.168.10.42",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"
  },
  {
    id: "log-1002",
    timestamp: new Date(initLogNow - 5 * initLogHour).toISOString(),
    userName: "Budi Santoso",
    userEmail: "budi.staff@ciputra.com",
    role: "staff",
    departemen: "Front Office",
    actionCategory: "DOCUMENT",
    action: "Unduh Dokumen Cloud Firestore",
    target: "SOP-FO-01-VIP-Express-Checkin.pdf",
    status: "SUCCESS",
    details: "Berkas SOP resmi berhasil diunduh dari cloud Firestore.",
    ipAddress: "192.168.10.42"
  },
  {
    id: "log-1003",
    timestamp: new Date(initLogNow - 1 * initLogDay).toISOString(),
    userName: "Hendra Wijaya",
    userEmail: "hendra.fo@ciputra.com",
    role: "manager",
    departemen: "Front Office",
    actionCategory: "DOCUMENT",
    action: "Unggah File ke Cloud Firestore",
    target: "SOP-FO-01-VIP-Express-Checkin.pdf",
    status: "SUCCESS",
    details: "File dioptimasi dan disimpan langsung ke database Firebase Firestore.",
    ipAddress: "192.168.10.15"
  },
  {
    id: "log-1004",
    timestamp: new Date(initLogNow - 2 * initLogDay).toISOString(),
    userName: "Admin System",
    userEmail: "admin@ciputra.com",
    role: "admin",
    departemen: "Human Resources (HR)",
    actionCategory: "USER_MGMT",
    action: "Persetujuan Akun User",
    target: "siti.spv@ciputra.com (Approved)",
    status: "SUCCESS",
    details: "Admin menyetujui akun pendaftaran baru.",
    ipAddress: "192.168.1.5"
  },
  {
    id: "log-1005",
    timestamp: new Date(initLogNow - 3 * initLogDay).toISOString(),
    userName: "Tamu Tidak Dikenal",
    userEmail: "hacker@test.com",
    role: "staff",
    departemen: "Front Office",
    actionCategory: "AUTH",
    action: "Login Gagal",
    target: "Kredensial Tidak Valid",
    status: "FAILED",
    details: "Percobaan kata sandi salah 3 kali berturut-turut.",
    ipAddress: "10.200.4.12"
  }
];

export const INITIAL_KPIS: KPIMasterItem[] = [
  {
    id: "kpi-001",
    departemen: "Front Office",
    tahun: 2026,
    tipe: "Mid-Year",
    target_role: "staff",
    pillar: "Guest Satisfaction",
    objective: "Mencapai skor kepuasan ulasan check-in tamu minimal 92% di platform hotel.",
    weight: 40,
    target: "Nilai CSAT >= 92% dan komplain check-in < 3 kasus per bulan.",
    status: "Active"
  },
  {
    id: "kpi-002",
    departemen: "Front Office",
    tahun: 2026,
    tipe: "Mid-Year",
    target_role: "staff",
    pillar: "Operational Speed",
    objective: "Waktu pelayanan rata-rata check-in tidak lebih dari 3 menit per tamu.",
    weight: 30,
    target: "Rata-rata waktu proses check-in <= 180 detik.",
    status: "Active"
  },
  {
    id: "kpi-003",
    departemen: "Front Office",
    tahun: 2026,
    tipe: "Mid-Year",
    target_role: "staff",
    pillar: "Up-Selling & Room Revenue",
    objective: "Melakukan upselling tipe kamar superior ke deluxe/suite minimal 10 transaksi per bulan.",
    weight: 30,
    target: "Minimal 10 room upselling tercatat di PMS per bulan.",
    status: "Active"
  },
  {
    id: "kpi-004",
    departemen: "Front Office",
    tahun: 2026,
    tipe: "Mid-Year",
    target_role: "spv",
    pillar: "Team Leadership & Quality Control",
    objective: "Memastikan seluruh shift front desk beroperasi sesuai SOP tanpa insiden keselamatan.",
    weight: 50,
    target: "Audit kepatuhan SOP shift mencapai minimal 95%.",
    status: "Active"
  },
  {
    id: "kpi-005",
    departemen: "Front Office",
    tahun: 2026,
    tipe: "Mid-Year",
    target_role: "spv",
    pillar: "Resolution of Escalated Guest Issues",
    objective: "Menyelesaikan keluhan tamu eskalasi tingkat supervisor dalam waktu 30 menit.",
    weight: 50,
    target: "Tingkat penyelesaian tuntas keluhan tamu >= 95%.",
    status: "Active"
  }
];

export const INITIAL_PERFORMANCES: PerformanceAppraisal[] = [
  {
    id: "perf-001",
    periode: 2026,
    tipe: "Mid-Year",
    email: "budi.staff@ciputra.com",
    nama: "Budi Santoso",
    departemen: "Front Office",
    role: "staff",
    status: "Approved",
    kpis: [
      {
        pillar: "Guest Satisfaction",
        objective: "Mencapai skor kepuasan ulasan check-in tamu minimal 92%.",
        weight: 40,
        target: "Nilai CSAT >= 92%.",
        actual: "Tercapai 95% kepuasan tamu dengan 0 komplain tamu.",
        achieved_yn: "Yes",
        achieved_pct: 40
      },
      {
        pillar: "Operational Speed",
        objective: "Waktu pelayanan rata-rata check-in <= 3 menit.",
        weight: 30,
        target: "Rata-rata check-in <= 180 detik.",
        actual: "Rata-rata pelayanan tercatat 165 detik per tamu.",
        achieved_yn: "Yes",
        achieved_pct: 30
      },
      {
        pillar: "Up-Selling & Room Revenue",
        objective: "Melakukan upselling tipe kamar minimal 10 transaksi.",
        weight: 30,
        target: ">= 10 room upselling.",
        actual: "Tercapai 14 kamar upselling selama periode berjalan.",
        achieved_yn: "Yes",
        achieved_pct: 30
      }
    ],
    kpiTotalScore: 100,
    kpiTranslatedScore: 5,
    behaviourScores: {
      "beh-1": 4,
      "beh-2": 4,
      "beh-3": 5,
      "beh-4": 4,
      "beh-5": 4,
      "beh-6": 4,
      "beh-7": 4
    },
    avgBehaviour: 4.14,
    complianceScore: 5.0,
    finalGrandTotal: 4.61,
    finalGrade: "E",
    starBest: "Berhasil menangani rombongan tamu delegasi internasional sebanyak 45 kamar dalam 30 menit tanpa antrean panjang.",
    starChallenge: "Sistem PMS sempat lambat saat jam sibuk sore hari, namun diatasi dengan standby form darurat manual.",
    managerFeedback: "Kerja yang sangat luar biasa dari Budi. Keramahan dan ketanggapan menghadapi tamu menjadi teladan tim Front Desk.",
    hrRecommendation: "Promote to Senior Receptionist",
    hrNote: "Kandidat berpotensi tinggi untuk program kepemimpinan supervisor tahun depan.",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-05T14:30:00Z"
  },
  {
    id: "perf-002",
    periode: 2026,
    tipe: "Mid-Year",
    email: "siti.fo@ciputra.com",
    nama: "Siti Rahmawati",
    departemen: "Front Office",
    role: "staff",
    status: "Approved",
    kpis: [
      {
        pillar: "Guest Satisfaction",
        objective: "Mencapai skor kepuasan ulasan check-in tamu minimal 92%.",
        weight: 40,
        target: "Nilai CSAT >= 92%.",
        actual: "Tercapai CSAT 93.5% berdasarkan audit ulasan bulanan.",
        achieved_yn: "Yes",
        achieved_pct: 40
      },
      {
        pillar: "Operational Speed",
        objective: "Waktu pelayanan rata-rata check-in <= 3 menit.",
        weight: 30,
        target: "Rata-rata check-in <= 180 detik.",
        actual: "Rata-rata 175 detik, masih memenuhi batas standar.",
        achieved_yn: "Yes",
        achieved_pct: 30
      },
      {
        pillar: "Up-Selling & Room Revenue",
        objective: "Melakukan upselling tipe kamar minimal 10 transaksi.",
        weight: 30,
        target: ">= 10 room upselling.",
        actual: "Tercapai 7 transaksi upselling dari target 10.",
        achieved_yn: "No",
        achieved_pct: 0
      }
    ],
    kpiTotalScore: 70,
    kpiTranslatedScore: 3.5,
    behaviourScores: {
      "beh-1": 4,
      "beh-2": 4,
      "beh-3": 4,
      "beh-4": 4,
      "beh-5": 4,
      "beh-6": 5,
      "beh-7": 4
    },
    avgBehaviour: 4.14,
    complianceScore: 5.0,
    finalGrandTotal: 3.86,
    finalGrade: "G",
    starBest: "Konsisten ramah dan aktif dalam koordinasi tim antar-shift malam dan pagi.",
    starChallenge: "Target upselling kamar perlu dorongan keberanian menawarkan fitur kamar superior.",
    managerFeedback: "Siti menunjukkan dedikasi pelayanan yang baik, tingkatkan teknik komunikasi sales upselling.",
    hrRecommendation: "Stay in current position",
    hrNote: "Diberikan pelatihan product knowledge dan upselling technique di Q2.",
    createdAt: "2026-03-02T11:00:00Z",
    updatedAt: "2026-03-06T15:00:00Z"
  },
  {
    id: "perf-003",
    periode: 2026,
    tipe: "Mid-Year",
    email: "dewi.hr@ciputra.com",
    nama: "Dewi Lestari",
    departemen: "Human Resources",
    role: "staff",
    status: "Approved",
    kpis: [
      {
        pillar: "Employee Records & Compliance",
        objective: "Penyelesaian berkas arsip karyawan & database 100% akurat.",
        weight: 40,
        target: "100% kelengkapan arsip digital.",
        actual: "Seluruh berkas karyawan telah diverifikasi dan tersimpan aman di Cloud Firestore.",
        achieved_yn: "Yes",
        achieved_pct: 40
      },
      {
        pillar: "Onboarding Quality",
        objective: "Waktu onboarding karyawan baru maksimal 2 hari kerja.",
        weight: 30,
        target: "<= 2 hari orientasi lengkap.",
        actual: "Rata-rata orientasi terselesaikan dalam 1.5 hari.",
        achieved_yn: "Yes",
        achieved_pct: 30
      },
      {
        pillar: "Training Program Delivery",
        objective: "Menyelenggarakan minimal 3 sesi internal training departemen.",
        weight: 30,
        target: ">= 3 sesi training selesai.",
        actual: "Telah diselenggarakan 4 sesi training hospitality bintang 5.",
        achieved_yn: "Yes",
        achieved_pct: 30
      }
    ],
    kpiTotalScore: 100,
    kpiTranslatedScore: 5,
    behaviourScores: {
      "beh-1": 5,
      "beh-2": 5,
      "beh-3": 4,
      "beh-4": 5,
      "beh-5": 4,
      "beh-6": 5,
      "beh-7": 5
    },
    avgBehaviour: 4.71,
    complianceScore: 5.0,
    finalGrandTotal: 4.87,
    finalGrade: "E",
    starBest: "Menginisiasi digitalisasi seluruh arsip fisik ke intranet Cloud Firestore dalam tempo 2 minggu.",
    starChallenge: "Koordinasi jadwal training karyawan operasional shift malam.",
    managerFeedback: "Sangat proaktif, detail, dan berintegritas tinggi dalam mengelola data sensitif personalia.",
    hrRecommendation: "Promote",
    hrNote: "Direkomendasikan untuk promosi jabatan HR Officer / Specialist.",
    createdAt: "2026-03-03T09:00:00Z",
    updatedAt: "2026-03-08T10:30:00Z"
  },
  {
    id: "perf-004",
    periode: 2026,
    tipe: "Mid-Year",
    email: "agus.hk@ciputra.com",
    nama: "Agus Pratama",
    departemen: "Housekeeping",
    role: "staff",
    status: "Approved",
    kpis: [
      {
        pillar: "Room Cleanliness Standard",
        objective: "Nilai inspeksi kebersihan kamar mencapai minimal 95 poin.",
        weight: 40,
        target: "Inspeksi kebersihan >= 95%.",
        actual: "Rata-rata audit kebersihan supervisor mencapai 96.2%.",
        achieved_yn: "Yes",
        achieved_pct: 40
      },
      {
        pillar: "Turnaround Time",
        objective: "Durasi pembersihan kamar check-out maksimal 25 menit.",
        weight: 30,
        target: "<= 25 menit per kamar.",
        actual: "Rata-rata 23 menit per kamar standar.",
        achieved_yn: "Yes",
        achieved_pct: 30
      },
      {
        pillar: "Linen & Chemical Efficiency",
        objective: "Pengendalian zero waste pemakaian bahan pembersih kimiawi.",
        weight: 30,
        target: "Zero damage linen & audit sesuai takaran.",
        actual: "Pemakaian bahan kimiawi sesuai takaran standar MSDS.",
        achieved_yn: "Yes",
        achieved_pct: 30
      }
    ],
    kpiTotalScore: 100,
    kpiTranslatedScore: 5,
    behaviourScores: {
      "beh-1": 4,
      "beh-2": 4,
      "beh-3": 4,
      "beh-4": 3,
      "beh-5": 4,
      "beh-6": 4,
      "beh-7": 4
    },
    avgBehaviour: 3.86,
    complianceScore: 5.0,
    finalGrandTotal: 4.49,
    finalGrade: "G",
    starBest: "Konsisten menjaga standar kebersihan kamar lantai VIP tanpa ada komplain kebersihan.",
    starChallenge: "Tekanan load saat tingkat hunian hotel (occupancy) mencapai 100%.",
    managerFeedback: "Kinerja solid dan rajin. Komunikasi dengan tim laundry sangat responsif.",
    hrRecommendation: "Stay in current position",
    hrNote: "Pertahankan performa yang konsisten.",
    createdAt: "2026-03-04T13:00:00Z",
    updatedAt: "2026-03-09T16:00:00Z"
  },
  {
    id: "perf-005",
    periode: 2026,
    tipe: "Mid-Year",
    email: "rian.fb@ciputra.com",
    nama: "Rian Hidayat",
    departemen: "Food & Beverage",
    role: "staff",
    status: "Approved",
    kpis: [
      {
        pillar: "Food Hygiene & HACCP",
        objective: "Kepatuhan SOP sanitasi dan hygine makanan 100%.",
        weight: 40,
        target: "100% audit HACCP lolos.",
        actual: "Seluruh checklist sanitasi dapur dan buffet terpenuhi.",
        achieved_yn: "Yes",
        achieved_pct: 40
      },
      {
        pillar: "Order Serving Speed",
        objective: "Waktu saji pesanan a la carte maksimal 15 menit.",
        weight: 30,
        target: "<= 15 menit.",
        actual: "Rata-rata waktu saji tercatat 18 menit saat akhir pekan.",
        achieved_yn: "No",
        achieved_pct: 0
      },
      {
        pillar: "Beverage Upselling",
        objective: "Penjualan menu minuman spesial minimal 20 gelas per shift.",
        weight: 30,
        target: ">= 20 gelas minuman.",
        actual: "Tercapai 22 gelas minuman spesial per shift.",
        achieved_yn: "Yes",
        achieved_pct: 30
      }
    ],
    kpiTotalScore: 70,
    kpiTranslatedScore: 3.5,
    behaviourScores: {
      "beh-1": 3,
      "beh-2": 3,
      "beh-3": 4,
      "beh-4": 3,
      "beh-5": 3,
      "beh-6": 4,
      "beh-7": 3
    },
    avgBehaviour: 3.29,
    complianceScore: 5.0,
    finalGrandTotal: 3.48,
    finalGrade: "M",
    starBest: "Berhasil melayani buffet banquet pernikahan 500 pax dengan lancar.",
    starChallenge: "Kecepatan plating makanan pada saat jam sarapan (breakfast rush).",
    managerFeedback: "Perlu meningkatkan koordinasi dengan tim kitchen agar order a la carte tepat waktu.",
    hrRecommendation: "Need Training",
    hrNote: "Diikutkan dalam refreshment training speed-service F&B service.",
    createdAt: "2026-03-05T14:00:00Z",
    updatedAt: "2026-03-10T09:00:00Z"
  }
];

export const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: "notif-001",
    title: "Pengumuman Baru: Libur Idul Fitri 2026",
    message: "Manajemen menerbitkan pengumuman operasional dan jadwal libur Lebaran untuk seluruh departemen.",
    category: "Pengumuman",
    targetDepartment: "All Departments",
    documentId: "doc-101",
    createdAt: "2026-03-10T09:05:00Z",
    read: false
  },
  {
    id: "notif-002",
    title: "Dokumen SOP Baru: Express Check-In Digital",
    message: "SOP pelayanan express check-in telah diperbarui khusus untuk departemen Front Office.",
    category: "SOP",
    targetDepartment: "Front Office",
    documentId: "doc-103",
    createdAt: "2026-02-20T14:05:00Z",
    read: true
  }
];
