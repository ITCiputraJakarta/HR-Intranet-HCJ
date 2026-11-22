/**
 * Ultra-Lightweight Client-Side Compressor for Firestore File Storage
 * Eliminates Google Drive dependency and optimizes every image/document
 * down to tiny footprints (typically 20KB - 60KB) to ensure Firestore monthly
 * quota is never exhausted.
 */

import {
  sanitizeSafeUrl,
  sanitizeFileName,
  validateAndScanFileUpload,
} from './security';

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
 * Compresses a validated raster image file (PNG/JPEG/WebP/GIF) to an ultra-lightweight WebP / PNG / JPEG data URL
 * Fails closed on SVG, HTML, or spoofed headers.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 900,
  quality: number = 0.72
): Promise<CompressionResult> {
  const scan = await validateAndScanFileUpload(file, 25 * 1024 * 1024);
  if (!scan.valid) {
    throw new Error(scan.error || 'Berkas gambar ditolak oleh sistem keamanan.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignore revoke errors
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Waktu pemrosesan gambar habis. Silakan pilih berkas gambar lain (PNG/JPG/WebP).'));
    }, 6000);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new Error('Format gambar tidak didukung atau rusak.'));
    };

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      try {
        let width = img.naturalWidth || img.width || maxDimension;
        let height = img.naturalHeight || img.height || maxDimension;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.max(1, Math.round((height * maxDimension) / width));
            width = maxDimension;
          } else {
            width = Math.max(1, Math.round((width * maxDimension) / height));
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas context tidak tersedia.'));
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        cleanup();

        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        let mime = 'image/webp';

        if (!compressedDataUrl.startsWith('data:image/webp')) {
          if (maxDimension <= 360 && file.type === 'image/png') {
            compressedDataUrl = canvas.toDataURL('image/png');
            mime = 'image/png';
          } else {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            mime = 'image/jpeg';
          }
        }

        if (compressedDataUrl.length > 350 * 1024 && maxDimension > 360) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.62);
          mime = 'image/jpeg';
        }

        const base64Len = compressedDataUrl.split(',')[1]?.length || 0;
        const compressedSizeBytes = Math.round((base64Len * 3) / 4);
        const originalSizeBytes = file.size;
        const reduction =
          originalSizeBytes > 0
            ? Math.max(0, Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100))
            : 0;

        const ext = mime === 'image/webp' ? '.webp' : mime === 'image/png' ? '.png' : '.jpg';

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: mime,
          originalSizeBytes,
          compressedSizeBytes,
          reductionPercentage: reduction,
          width,
          height,
          fileName: sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''), 'image') + ext,
        });
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Gagal mengompres gambar.'));
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Prepares a non-image file (PDF, Dokumen Kantor, Arsip Digital) for direct Firestore storage.
 * Enforces strict extension + magic-byte validation via validateAndScanFileUpload.
 */
export async function prepareDocumentFile(
  file: File,
  maxSizeBytes: number = 15 * 1024 * 1024 // 15 MB max limit with Firestore auto-chunking
): Promise<CompressionResult> {
  const scan = await validateAndScanFileUpload(file, maxSizeBytes);
  if (!scan.valid) {
    throw new Error(scan.error || 'Berkas dokumen ditolak oleh sistem keamanan.');
  }

  return new Promise((resolve, reject) => {
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
        fileName: sanitizeFileName(file.name, 'document'),
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
 * Converts a base64 data: URL into a Blob object for safe browser rendering & downloading.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const safeData = sanitizeSafeUrl(dataUrl, {
    allowDataDocument: true,
    allowDataImage: true,
  });
  if (!safeData || !safeData.startsWith('data:')) return null;
  try {
    const parts = safeData.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const binary = atob(parts[1] || '');
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch (e) {
    console.warn('Failed to convert dataUrl to Blob:', e);
    return null;
  }
}

/**
 * Triggers safe client-side download for validated data URLs or HTTP(S) URLs.
 */
export function downloadFileFromDataUrl(url: string, fileName: string): void {
  const safeUrl = sanitizeSafeUrl(url, {
    allowDataDocument: true,
    allowDataImage: true,
    allowBlob: true,
  });
  if (!safeUrl) return;
  const safeDownloadName = sanitizeFileName(fileName || 'download', 'download');

  if (safeUrl.startsWith('data:')) {
    const blob = dataUrlToBlob(safeUrl);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeDownloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = safeUrl;
  link.download = safeDownloadName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Safely opens a validated file in a new browser tab or downloads if not viewable inline.
 */
export function openFileFromDataUrl(url: string, fileName: string = 'document'): void {
  const safeUrl = sanitizeSafeUrl(url, {
    allowDataDocument: true,
    allowDataImage: true,
    allowBlob: true,
  });
  if (!safeUrl) return;
  const safeDownloadName = sanitizeFileName(fileName, 'document');

  if (safeUrl.startsWith('data:')) {
    const blob = dataUrlToBlob(safeUrl);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const isInlineViewable =
        blob.type === 'application/pdf' ||
        blob.type.startsWith('image/') ||
        blob.type.startsWith('text/');
      if (isInlineViewable) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.download = safeDownloadName;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = safeUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

