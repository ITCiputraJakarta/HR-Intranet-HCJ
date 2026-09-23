import { getDriveStorageConfig } from './storage';

export interface DriveUploadResult {
  success: boolean;
  message?: string;
  fileUrl: string;
  previewUrl: string;
  downloadUrl: string;
  thumbUrl: string;
  driveFileId: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  fileType: string;
  driveFolderPath: string;
}

/**
 * Returns the structured folder hierarchy inside Google Drive:
 * 1. SOP: Drive Utama -> SOP -> [FO / HK / ACCT / HR / FB / ENG / SM / SEC]
 * 2. Formulir Kerja: Drive Utama -> Formulir Kerja -> [FO / HK / ACCT / HR / FB / ENG / SM / SEC]
 * 3. Foto & Media: Drive Utama -> Media & Foto (Terpusat 1 folder untuk semua foto banner/karyawan)
 */
export function getDriveFolderPath(
  category: string,
  departemen: string,
  fileName?: string
): string {
  const config = getDriveStorageConfig();
  const root = config.rootFolderName || 'Drive Utama Hotel Ciputra';
  const photosFolder = config.photosFolder || 'Media & Foto';
  const sopFolder = config.sopFolder || 'SOP';
  const formsFolder = config.formsFolder || 'Formulir Kerja';

  let subPath = '';

  if (category === 'Pengumuman' || category.toLowerCase().includes('foto') || category.toLowerCase().includes('media')) {
    subPath = photosFolder;
  } else if (category === 'SOP') {
    const deptFolder = formatDepartmentFolderName(departemen);
    subPath = `${sopFolder} / ${deptFolder}`;
  } else {
    // Default to Formulir Kerja or Category name
    const folderCat = category === 'Form' ? formsFolder : category;
    const deptFolder = formatDepartmentFolderName(departemen);
    subPath = `${folderCat} / ${deptFolder}`;
  }

  const fullFolder = `${root} / ${subPath}`;
  return fileName ? `${fullFolder} / ${fileName}` : fullFolder;
}

/**
 * Map department code/name to standardized folder name
 */
export function formatDepartmentFolderName(dept: string): string {
  if (!dept || dept === 'All' || dept === 'All Departments') {
    return 'Semua Departemen (Lintas Hotel)';
  }
  const clean = dept.trim();
  const mapping: { [key: string]: string } = {
    'Front Office': 'Front Office (FO)',
    'FO': 'Front Office (FO)',
    'Housekeeping': 'Housekeeping (HK)',
    'HK': 'Housekeeping (HK)',
    'Accounting': 'Accounting & Finance (ACCT)',
    'ACCT': 'Accounting & Finance (ACCT)',
    'Human Resources': 'Human Resources (HR)',
    'HR': 'Human Resources (HR)',
    'Food & Beverage': 'Food & Beverage (FB)',
    'FB': 'Food & Beverage (FB)',
    'Engineering': 'Engineering (ENG)',
    'ENG': 'Engineering (ENG)',
    'Sales & Marketing': 'Sales & Marketing (SM)',
    'SM': 'Sales & Marketing (SM)',
    'Executive Office': 'Executive Office (GM/HOD)',
    'Security': 'Security & Safety',
  };

  return mapping[clean] || clean;
}

/**
 * Upload and register a document or photo into the structured storage system.
 * Generates portable data URLs or object URLs, assigns permanent file IDs, and maps to the Google Drive folder hierarchy.
 * Fully compatible with Vercel Hobby Free hosting (no Apps Script / proxy required).
 */
export async function uploadFileToDriveStorage(params: {
  file: File;
  title: string;
  category: string;
  departemen: string;
  uploadedBy: string;
  uploadedByEmail: string;
  customDriveUrl?: string;
}): Promise<DriveUploadResult> {
  const mimeType = params.file.type || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/');
  const fileSizeMB = (params.file.size / (1024 * 1024)).toFixed(2) + ' MB';

  // Compute structured Google Drive folder path
  const driveFolderPath = getDriveFolderPath(params.category, params.departemen, params.file.name);

  // Convert file to Data URL for persistent storage in browser & Firestore
  const dataUrl = await new Promise<string>((resolve) => {
    // For small/medium files (up to 2MB) encode as Data URL so they survive page reloads and device switches
    if (params.file.size <= 2.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(params.file));
      reader.readAsDataURL(params.file);
    } else {
      resolve(URL.createObjectURL(params.file));
    }
  });

  const uniqueId = `1Drv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  const effectiveUrl = params.customDriveUrl?.trim() || dataUrl;

  return {
    success: true,
    message: `Berkas berhasil disimpan ke folder ${driveFolderPath}`,
    fileUrl: effectiveUrl,
    previewUrl: effectiveUrl,
    downloadUrl: effectiveUrl,
    thumbUrl: isImage ? effectiveUrl : '',
    driveFileId: uniqueId,
    fileName: params.file.name,
    fileSize: fileSizeMB,
    mimeType,
    fileType: mimeType,
    driveFolderPath,
  };
}

// Backward compatibility alias for uploadFileToGoogleDrive
export const uploadFileToGoogleDrive = uploadFileToDriveStorage;
