export type UserRole = 'staff' | 'spv' | 'manager' | 'admin' | 'hod';

export type UserStatus = 'Approved' | 'Pending' | 'Rejected';

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
  isPublic?: boolean; // True jika dipublikasikan ke portal publik & dashboard, false jika hanya internal intranet
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

// =========================================================================
// HOME & CAREER CMS TYPES
// =========================================================================

export interface HomeCmsServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: 'indigo' | 'orange' | 'teal' | 'blue' | 'purple';
}

export interface HomeCmsTestimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  photoUrl: string;
  rating: number;
}

export interface HomeCmsContent {
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroTitleSuffix: string;
  heroSubtitle: string;
  heroImageUrl: string;
  ctaExploreText: string;
  ctaVideoText: string;
  floatingCard1: {
    title: string;
    subtitle: string;
    status: string;
  };
  floatingCard2: {
    name: string;
    message: string;
    avatarUrl: string;
  };
  servicesTitle: string;
  servicesSubtitle: string;
  services: HomeCmsServiceItem[];
  aboutTag: string;
  aboutTitle: string;
  aboutDescription: string;
  aboutStatNumber: string;
  aboutStatLabel: string;
  aboutImage1: string;
  aboutImage2: string;
  aboutFeature1Title: string;
  aboutFeature1Desc: string;
  aboutFeature2Title: string;
  aboutFeature2Desc: string;
  aboutCtaText: string;
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: HomeCmsTestimonial[];
  newsletterTitle: string;
  newsletterDescription: string;
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  updatedAt: string;
}

export interface CareerBenefitItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

export interface CareerJobPosting {
  id: string;
  title: string;
  department: string;
  experience: string;
  deadline: string;
  jobType: 'Full-time' | 'Kontrak' | 'Magang' | 'Daily Worker';
  description: string;
  requirements: string[];
  status: 'Open' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export interface CareerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  fullName: string;
  email: string;
  phone: string;
  domisili: string;
  education: string;
  cvFileName: string;
  cvFileType: string;
  cvFileSize: number; // Max 1,048,576 bytes (1MB)
  cvFileData: string; // Base64 data URI (PDF only)
  notes?: string;
  status: 'Pending' | 'Reviewed' | 'Interview' | 'Rejected';
  submittedAt: string;
}

export interface CareerCmsContent {
  heroTitle: string;
  heroSubtitle: string;
  heroBgUrl: string;
  benefitsTag: string;
  benefitsTitle: string;
  benefitsDescription: string;
  benefits: CareerBenefitItem[];
  openingsTag: string;
  openingsTitle: string;
  openingsSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  updatedAt: string;
}

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


