export type UserRole = 'staff' | 'spv' | 'manager' | 'admin' | 'hod';

export type UserStatus = 'Approved' | 'Pending';

export interface User {
  id: string;
  nama: string;
  email: string;
  departemen: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  avatar?: string;
  createdAt: string;
}

export type DocumentCategory = 'Pengumuman' | 'SOP' | 'Form';

export interface IntranetDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  sub_kategori?: string;
  akses_dept: string; // 'All Departments' or specific dept
  keterangan?: string;
  fileUrl: string;
  previewUrl: string;
  downloadUrl: string;
  thumbUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: string;
  updatedAt?: string;
  effectiveDate?: string; // Tanggal mulai berlaku pengumuman (YYYY-MM-DD, default hari ini saat submit)
  expiryDate?: string;    // Tanggal kedaluwarsa pengumuman (YYYY-MM-DD, otomatis terhapus setelah melewati tanggal ini)
  driveFileId?: string;
  driveFolderPath?: string;
}

export type ActionCategory =
  | 'AUTH'
  | 'DOCUMENT'
  | 'USER_MGMT'
  | 'APPRAISAL'
  | 'KPI_CONFIG'
  | 'SYSTEM';

export type LogStatus = 'SUCCESS' | 'WARNING' | 'FAILED';

export interface AccessLog {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  departemen: string;
  actionCategory: ActionCategory;
  action: string;
  target: string;
  status: LogStatus;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CategoryMaster {
  id: string;
  departemen: string;
  nama_kategori: string;
}

export interface DepartmentMaster {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KPIMasterItem {
  id: string;
  departemen: string;
  tahun: number | string;
  tipe: 'Mid-Year' | 'Year-End';
  target_role: UserRole;
  pillar: string;
  objective: string;
  weight: number;
  target: string;
  status: 'Draft' | 'Active';
}

export interface KPIRowItem {
  pillar: string;
  objective: string;
  weight: number;
  target: string;
  actual?: string;
  achieved_yn?: 'Yes' | 'No' | '';
  achieved_pct?: number;
}

export interface PerformanceAppraisal {
  id: string;
  periode: number | string;
  tipe: 'Mid-Year' | 'Year-End';
  email: string;
  nama: string;
  departemen: string;
  role: UserRole;
  status: 'Draft' | 'Submitted' | 'On Review' | 'On Check' | 'Approved';
  kpis: KPIRowItem[];
  kpiTotalScore: number;
  kpiTranslatedScore: number;
  behaviourScores: { [key: string]: number };
  avgBehaviour: number;
  complianceScore: number;
  finalGrandTotal: number;
  finalGrade: 'E' | 'G' | 'M' | 'U';
  starBest?: string;
  starChallenge?: string;
  managerFeedback?: string;
  hrRecommendation?: string;
  hrNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  isLocked?: boolean;
  unlockedBy?: string;
  unlockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  targetDepartment: string;
  targetRole?: string;
  documentId?: string;
  createdAt: string;
  read: boolean;
}

export type Announcement = IntranetDocument;
export type NotificationItem = PushNotification;

export interface GoogleDriveStorageConfig {
  rootFolderId: string; // ID atau Kode Folder Utama / Shared Drive
  rootFolderName: string; // Nama Folder Utama (e.g., 'Drive Utama Hotel Ciputra')
  sharedDriveUrl: string; // URL langsung ke folder Google Drive
  sopFolder: string; // Subfolder untuk SOP (e.g., 'SOP')
  formsFolder: string; // Subfolder untuk Formulir Kerja (e.g., 'Formulir Kerja')
  photosFolder: string; // Subfolder terpusat untuk foto & media (e.g., 'Foto & Media')
  useDepartmentSubfolders: boolean; // Pemisahan subfolder per departemen (FO, HK, ACCT, HR, dll.)
  autoPruneAnnouncementsDays: number; // Jumlah hari retensi pengumuman sebelum terhapus otomatis (default 7 hari)
  updatedAt?: string;
}

export interface SpreadsheetConfig extends Partial<GoogleDriveStorageConfig> {
  spreadsheetId?: string;
  gasWebAppUrl?: string;
  webAppUrl?: string;
  googleDriveFolderId?: string;
  driveFolderId?: string;
  autoSync?: boolean;
  autoSyncEnabled?: boolean;
  lastSync?: string;
  lastSyncTimestamp?: string;
}

