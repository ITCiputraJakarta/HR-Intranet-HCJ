export type UserRole = 'staff' | 'spv' | 'manager' | 'admin' | 'hod';

export type UserStatus = 'Approved' | 'Pending';

export interface HotelUnitMaster {
  id: string;
  name: string;
  shortName?: string;
  code: string;
  description?: string;
  announcementPruneDays?: number;
  announcementMaxDays?: number;
  announcementRuleNote: string;
  sopRuleNote: string;
}

export interface User {
  id: string;
  nama: string;
  email: string;
  unit?: string; // Pemisah Unit Hotel Group (mis. 'Hotel Ciputra Jakarta' vs 'Hotel Ciputra Group (Unit 2)')
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
  unit?: string; // Unit Hotel Group pemisah SOP & Pengumuman ('Hotel Ciputra Jakarta' | 'Hotel Ciputra Group (Unit 2)' | 'All Units')
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
  attachmentUrl?: string; // URL data/file untuk dokumen lampiran tambahan
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: string;
  isChunked?: boolean;
  chunksCount?: number;
  driveFileId?: string; // deprecated
  driveFolderPath?: string; // deprecated
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
  unit?: string;
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
  unit?: string;
  departemen: string;
  nama_kategori: string;
}

export interface DepartmentMaster {
  id: string;
  unit?: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KPIMasterItem {
  id: string;
  unit?: string;
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
  unit?: string;
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
  unit?: string;
  targetDepartment: string;
  targetRole?: string;
  documentId?: string;
  createdAt: string;
  read: boolean;
}

export type Announcement = IntranetDocument;
export type NotificationItem = PushNotification;

export interface SystemStorageConfig {
  storageProvider: 'firestore';
  autoPruneAnnouncementsDays: number;
  autoSyncEnabled: boolean;
  updatedAt?: string;
  rootFolderId?: string;
  rootFolderName?: string;
  sopFolder?: string;
  formsFolder?: string;
  photosFolder?: string;
}

// Backward-compatibility aliases (eliminating Google Drive while keeping type safety)
export type GoogleDriveStorageConfig = SystemStorageConfig & {
  sharedDriveUrl?: string;
  useDepartmentSubfolders?: boolean;
};

export type SpreadsheetConfig = SystemStorageConfig & {
  spreadsheetId?: string;
  gasWebAppUrl?: string;
  webAppUrl?: string;
  googleDriveFolderId?: string;
  driveFolderId?: string;
  autoSync?: boolean;
  lastSync?: string;
  lastSyncTimestamp?: string;
};


