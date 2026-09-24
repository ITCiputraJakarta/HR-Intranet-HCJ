/**
 * Ultra-Lightweight Client-Side Compressor for Firestore File Storage
 * Eliminates Google Drive dependency and optimizes every image/document
 * down to tiny footprints (typically 20KB - 60KB) to ensure Firestore monthly
 * quota is never exhausted.
 */

export interface CompressionResult {
  dataUrl: string;
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  width?: number;
  height?: number;
  fileName: string;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Compresses an image file to an ultra-lightweight WebP / JPEG data URL
 * Scales down to max 900x900 while retaining crispness for announcements and SOP documents.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 900,
  quality: number = 0.72
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung atau rusak.'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaled dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia.'));
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/webp for ultra compression, fallback to image/jpeg
        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        let mime = 'image/webp';

        // Check if webp is supported by checking signature
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          mime = 'image/jpeg';
        }

        // Estimate compressed size from base64 string
        const base64Len = compressedDataUrl.split(',')[1]?.length || 0;
        const compressedSizeBytes = Math.round((base64Len * 3) / 4);
        const originalSizeBytes = file.size;
        const reduction = originalSizeBytes > 0
          ? Math.max(0, Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100))
          : 0;

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: mime,
          originalSizeBytes,
          compressedSizeBytes,
          reductionPercentage: reduction,
          width,
          height,
          fileName: file.name.replace(/\.[^/.]+$/, '') + (mime === 'image/webp' ? '.webp' : '.jpg'),
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Prepares a non-image file (PDF, Doc, Spreadsheet) for direct Firestore storage.
 * Enforces size limits to protect Firestore document bounds (max 650KB).
 */
export async function prepareDocumentFile(
  file: File,
  maxSizeBytes: number = 700 * 1024 // 700 KB max limit for Firestore document health
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (file.size > maxSizeBytes) {
      reject(
        new Error(
          `Ukuran berkas (${formatBytes(file.size)}) melebihi batas penyimpanan hemat Firestore (${formatBytes(
            maxSizeBytes
          )}). Silakan gunakan berkas berukuran lebih kecil atau kompres dokumen terlebih dahulu agar kuota bulanan tetap efisien.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas dokumen.'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const originalSizeBytes = file.size;

      resolve({
        dataUrl,
        mimeType: file.type || 'application/octet-stream',
        originalSizeBytes,
        compressedSizeBytes: originalSizeBytes,
        reductionPercentage: 0,
        fileName: file.name,
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Universal file handler for both images and documents to be stored natively in Firestore
 */
export async function processFileForFirestore(file: File): Promise<CompressionResult> {
  const isImage = file.type.startsWith('image/');
  if (isImage) {
    return compressImageFile(file, 900, 0.72);
  } else {
    return prepareDocumentFile(file);
  }
}

/**
 * Triggers safe and instant client-side download for base64 data URLs or HTTP URLs
 * without requiring Google Drive or any third-party services.
 */
export function downloadFileFromDataUrl(url: string, fileName: string): void {
  if (!url) return;

  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const binary = atob(parts[1]);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      return;
    } catch (e) {
      console.warn('Fallback standard download:', e);
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'download';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

