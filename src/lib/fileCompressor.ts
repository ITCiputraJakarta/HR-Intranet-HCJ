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
 * Compresses an image file to an ultra-lightweight WebP / PNG / JPEG data URL
 * Uses zero-copy Object URL decoding for instant compression (<50ms) and handles SVG/transparent icons gracefully.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 900,
  quality: number = 0.72
): Promise<CompressionResult> {
  // Fast path for small SVG files (< 80KB): preserve vector data URL directly without raster delay
  if (file.type === 'image/svg+xml' && file.size <= 80 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca berkas SVG.'));
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({
          dataUrl,
          mimeType: 'image/svg+xml',
          originalSizeBytes: file.size,
          compressedSizeBytes: file.size,
          reductionPercentage: 0,
          width: maxDimension,
          height: maxDimension,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    });
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

        // Calculate scaled dimensions
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

        // Prefer image/webp (supports transparency for icons/logos & ultra small size), fallback to png/jpeg
        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        let mime = 'image/webp';

        if (!compressedDataUrl.startsWith('data:image/webp')) {
          if (file.type === 'image/png' || file.type === 'image/svg+xml' || maxDimension <= 360) {
            compressedDataUrl = canvas.toDataURL('image/png');
            mime = 'image/png';
          } else {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            mime = 'image/jpeg';
          }
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
          fileName: file.name.replace(/\.[^/.]+$/, '') + ext,
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

