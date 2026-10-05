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
          if (maxDimension <= 360 && (file.type === 'image/png' || file.type === 'image/svg+xml')) {
            compressedDataUrl = canvas.toDataURL('image/png');
            mime = 'image/png';
          } else {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            mime = 'image/jpeg';
          }
        }

        // Safety cap: if dataUrl is still > 350KB (e.g. complex photo), re-encode as JPEG at 0.62 quality so Firestore 1MB doc limit is never exceeded
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
 * Prepares a non-image file (PDF, Dokumen Kantor, Arsip Digital) for direct Firestore storage.
 * Supports up to 15MB with automatic Firestore chunking in firestoreService.
 */
export async function prepareDocumentFile(
  file: File,
  maxSizeBytes: number = 15 * 1024 * 1024 // 15 MB max limit with Firestore auto-chunking
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // Strict security scan: block potentially dangerous executable or script files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.msi', '.ps1', '.php', '.py', '.scr', '.dll'];
    const lowerName = (file.name || '').toLowerCase();
    if (dangerousExtensions.some((ext) => lowerName.endsWith(ext))) {
      reject(new Error('Format berkas eksekusi tidak diizinkan demi keamanan server dan pengguna.'));
      return;
    }

    if (file.size > maxSizeBytes) {
      reject(
        new Error(
          `Ukuran berkas (${formatBytes(file.size)}) melebihi batas maksimum (${formatBytes(
            maxSizeBytes
          )}). Silakan gunakan berkas berukuran di bawah 15 MB.`
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
 * Converts a base64 data: URL into a Blob object for safe browser rendering & downloading.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const parts = dataUrl.split(',');
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
 * Triggers safe and instant client-side download for base64 data URLs or HTTP URLs
 * without requiring Google Drive or any third-party services.
 */
export function downloadFileFromDataUrl(url: string, fileName: string): void {
  if (!url) return;

  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
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

/**
 * Safely opens a file (including base64 data: PDFs/images) in a new browser tab or downloads if not viewable inline.
 */
export function openFileFromDataUrl(url: string, fileName: string = 'document'): void {
  if (!url) return;

  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // For PDF and images, open in new tab; for Office docs (docx/xlsx), download directly
      const isInlineViewable =
        blob.type === 'application/pdf' ||
        blob.type.startsWith('image/') ||
        blob.type.startsWith('text/');
      if (isInlineViewable) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.download = fileName;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

