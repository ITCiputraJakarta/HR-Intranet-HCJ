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
  // Super Admin IT Utama Hotel Ciputra Jakarta
  {
    id: "usr-it-01",
    nama: "Super Admin IT",
    email: "it@hotelciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Engineering",
    role: "admin",
    status: "Approved",
    password: "password123",
    createdAt: "2026-01-01T08:00:00Z"
  },
  // Super Admin Management Hotel Ciputra Jakarta
  {
    id: "usr-admin-hcj",
    nama: "Admin Hotel Ciputra Jakarta",
    email: "admin@hotelciputra.com",
    unit: "Hotel Ciputra Jakarta",
    departemen: "Human Resources (HR)",
    role: "admin",
    status: "Approved",
    password: "admin123",
    createdAt: "2026-01-01T08:00:00Z"
  },
  // Super Admin System Alternatif
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

export const INITIAL_DOCUMENTS: IntranetDocument[] = [];

export const INITIAL_ACCESS_LOGS: AccessLog[] = [
  {
    id: "log-init-01",
    timestamp: new Date().toISOString(),
    userName: "Super Admin IT",
    userEmail: "it@hotelciputra.com",
    role: "admin",
    departemen: "Engineering",
    actionCategory: "SYSTEM",
    action: "Inisialisasi Portal Intranet",
    target: "Hotel Ciputra Jakarta",
    status: "SUCCESS",
    details: "Sistem resmi Hotel Ciputra Jakarta aktif dan tersinkronisasi ke Cloud Firestore.",
    ipAddress: "127.0.0.1",
    userAgent: "Internal Portal Engine"
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

export const INITIAL_PERFORMANCES: PerformanceAppraisal[] = [];

export const INITIAL_NOTIFICATIONS: PushNotification[] = [];
