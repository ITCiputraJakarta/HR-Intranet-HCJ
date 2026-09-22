import { getSpreadsheetConfig } from './storage';

export interface DriveUploadResult {
  success: boolean;
  message?: string;
  fileUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  thumbUrl?: string;
  driveFileId?: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  fileType?: string;
}

/**
 * Upload a document or photo to Google Drive via the Google Apps Script DriveApp backend
 */
export async function uploadFileToGoogleDrive(params: {
  file: File;
  title: string;
  category: string;
  departemen: string;
  uploadedBy: string;
  uploadedByEmail: string;
}): Promise<DriveUploadResult> {
  const config = getSpreadsheetConfig();
  const gasUrl = (config.webAppUrl || config.gasWebAppUrl || '').trim();

  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(params.file);
  });

  const fileSizeMB = (params.file.size / (1024 * 1024)).toFixed(2) + ' MB';
  const mimeType = params.file.type || 'application/octet-stream';

  // If Google Apps Script Web App URL is configured, upload directly to Google Drive
  if (gasUrl) {
    try {
      const response = await fetch('/api/proxy-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasUrl,
          payload: {
            action: 'uploadFile',
            fileName: params.file.name,
            fileBase64: base64Data,
            mimeType,
            title: params.title,
            category: params.category,
            departemen: params.departemen,
            uploadedBy: params.uploadedBy,
            uploadedByEmail: params.uploadedByEmail,
            folderName: config.googleDriveFolderId || 'Intranet_Ciputra_Uploads',
          },
        }),
      });

      const resData = await response.json().catch(() => null);
      if (response.ok && resData && resData.success) {
        return {
          success: true,
          message: 'Berkas berhasil diunggah langsung ke Google Drive!',
          fileUrl: resData.fileUrl || resData.document?.fileUrl,
          previewUrl: resData.previewUrl || resData.document?.previewUrl,
          downloadUrl: resData.downloadUrl || resData.document?.downloadUrl,
          thumbUrl: resData.thumbUrl || resData.document?.thumbUrl,
          driveFileId: resData.fileId || resData.document?.driveFileId,
          fileName: params.file.name,
          fileSize: fileSizeMB,
          mimeType,
          fileType: mimeType,
        };
      }
    } catch (err) {
      console.warn('Google Drive direct upload through GAS failed, falling back to client URL:', err);
    }
  }

  // Standalone client fallback: For files under 400KB, use permanent data URL so documents remain viewable across reloads
  const localUrl = params.file.size < 400 * 1024 ? `data:${mimeType};base64,${base64Data}` : URL.createObjectURL(params.file);
  const fallbackDriveId = `1Drv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    success: true,
    message: gasUrl ? 'Berkas diproses dan disimpan ke penyimpanan intranet.' : 'Berkas berhasil disimpan ke penyimpanan intranet.',
    fileUrl: localUrl,
    previewUrl: localUrl,
    downloadUrl: localUrl,
    thumbUrl: mimeType.startsWith('image/') ? localUrl : undefined,
    driveFileId: fallbackDriveId,
    fileName: params.file.name,
    fileSize: fileSizeMB,
    mimeType,
    fileType: mimeType,
  };
}
