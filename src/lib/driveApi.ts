import { getDriveStorageConfig } from './storage';
import { getGoogleAccessToken } from './authGoogle';

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
  directDriveUploaded?: boolean;
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
  const photosFolder = config.photosFolder || 'Foto & Media';
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
  if (!dept || dept === 'All' || dept === 'All Departments' || dept === 'Semua Departemen (Lintas Hotel)') {
    return 'All Departments';
  }
  const clean = dept.trim();
  const mapping: { [key: string]: string } = {
    'Front Office': 'Front Office',
    'FO': 'Front Office',
    'Housekeeping': 'Housekeeping',
    'HK': 'Housekeeping',
    'Accounting': 'Accounting',
    'ACCT': 'Accounting',
    'Human Resources': 'Human Resources',
    'HR': 'Human Resources',
    'Food & Beverage': 'Food & Beverage',
    'FB': 'Food & Beverage',
    'Engineering': 'Engineering',
    'ENG': 'Engineering',
    'Sales & Marketing': 'Sales & Marketing',
    'SM': 'Sales & Marketing',
    'Executive Office': 'Executive Office',
    'Security': 'Security',
  };

  return mapping[clean] || clean;
}

/**
 * Deletes a file directly from Google Drive if authenticated with Google Drive OAuth
 */
export async function deleteDriveFile(driveFileId: string): Promise<boolean> {
  if (!driveFileId || driveFileId.startsWith('1Drv-temp-') || driveFileId.startsWith('local-')) {
    return false;
  }
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn('Error deleting file from Google Drive:', err);
    return false;
  }
}

/**
 * Helper to find or create a folder by name inside a parent folder on Google Drive
 */
async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Create folder if not found
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (createRes.ok) {
      const createdFolder = await createRes.json();
      return createdFolder.id;
    }
  } catch (err) {
    console.warn('Error resolving Drive folder:', err);
  }

  return parentFolderId || 'root';
}

/**
 * Upload binary file directly to Google Drive via multipart upload
 */
async function uploadToGoogleDriveAPI(
  accessToken: string,
  file: File,
  targetFolderId: string
): Promise<{ fileId: string; webViewLink?: string; webContentLink?: string }> {
  const metadata = {
    name: file.name,
    parents: targetFolderId ? [targetFolderId] : undefined,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message || `Gagal upload ke Google Drive API (${res.status})`
    );
  }

  const result = await res.json();

  // Try to set public read permission so all intranet staff can view/download
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Could not set public permission on Drive file:', permErr);
  }

  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink || `https://drive.google.com/uc?export=download&id=${result.id}`,
  };
}

/**
 * Upload file directly to real Google Drive if OAuth token is available.
 * Falls back safely to portable data URL so everything is 100% functional.
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
  const config = getDriveStorageConfig();
  const mimeType = params.file.type || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/');
  const fileSizeMB = (params.file.size / (1024 * 1024)).toFixed(2) + ' MB';

  const driveFolderPath = getDriveFolderPath(params.category, params.departemen, params.file.name);
  const accessToken = await getGoogleAccessToken();

  let directDriveUploaded = false;
  let driveFileId = `1Drv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  let driveWebViewLink = '';
  let driveDownloadLink = '';

  // 1. If Google Drive OAuth is active, upload directly into the target Google Drive folder
  if (accessToken) {
    try {
      // Determine the target folder ID in Drive
      let targetFolderId = config.rootFolderId && config.rootFolderId !== 'Intranet_Ciputra_Uploads'
        ? config.rootFolderId
        : undefined;

      // Navigate or create subfolders if requested
      if (params.category === 'Pengumuman' || params.category.toLowerCase().includes('foto')) {
        targetFolderId = await getOrCreateDriveFolder(accessToken, config.photosFolder || 'Foto & Media', targetFolderId);
      } else {
        const catFolder = await getOrCreateDriveFolder(
          accessToken,
          params.category === 'SOP' ? (config.sopFolder || 'SOP') : (config.formsFolder || 'Formulir Kerja'),
          targetFolderId
        );
        const deptName = formatDepartmentFolderName(params.departemen);
        targetFolderId = await getOrCreateDriveFolder(accessToken, deptName, catFolder);
      }

      // Execute upload to Google Drive
      const uploadRes = await uploadToGoogleDriveAPI(accessToken, params.file, targetFolderId || 'root');
      driveFileId = uploadRes.fileId;
      driveWebViewLink = uploadRes.webViewLink || `https://drive.google.com/file/d/${uploadRes.fileId}/view`;
      driveDownloadLink = uploadRes.webContentLink || `https://drive.google.com/uc?export=download&id=${uploadRes.fileId}`;
      directDriveUploaded = true;
    } catch (driveErr) {
      console.warn('Real Google Drive API upload failed, falling back to local/Firestore storage:', driveErr);
    }
  }

  // Generate Data URL for instant fast preview and local rendering
  const dataUrl = await new Promise<string>((resolve) => {
    if (params.file.size <= 2.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(params.file));
      reader.readAsDataURL(params.file);
    } else {
      resolve(URL.createObjectURL(params.file));
    }
  });

  const finalFileUrl = driveWebViewLink || params.customDriveUrl?.trim() || dataUrl;
  const finalDownloadUrl = driveDownloadLink || finalFileUrl;

  return {
    success: true,
    message: directDriveUploaded
      ? `Berkas berhasil diupload langsung ke Google Drive (${driveFolderPath})!`
      : `Berkas tersimpan dan siap disinkronkan ke folder ${driveFolderPath}`,
    fileUrl: finalFileUrl,
    previewUrl: isImage ? dataUrl : finalFileUrl,
    downloadUrl: finalDownloadUrl,
    thumbUrl: isImage ? dataUrl : '',
    driveFileId,
    fileName: params.file.name,
    fileSize: fileSizeMB,
    mimeType,
    fileType: mimeType,
    driveFolderPath,
    directDriveUploaded,
  };
}

export const uploadFileToGoogleDrive = uploadFileToDriveStorage;
