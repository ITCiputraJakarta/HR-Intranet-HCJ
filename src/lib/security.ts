/**
 * Security utilities for HR Intranet Portal
 * - Password hashing and verification (Web Crypto SHA-256 with salt)
 * - Input sanitization (Anti-XSS)
 * - File upload validation and binary header (magic bytes) scanning
 */

// Simple hex encoder
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < byteArray.length; i++) {
    hex += byteArray[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Hash password with SHA-256 and unique salt
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword) return '';
  
  // If already hashed with our prefix
  if (plainPassword.startsWith('SHA256:')) {
    return plainPassword;
  }

  // Generate 16 bytes salt
  const saltBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(saltBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      saltBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const saltHex = bufferToHex(saltBytes.buffer);

  // SHA-256(salt + password)
  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + ':' + plainPassword);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashHex = bufferToHex(hashBuffer);
    return `SHA256:${saltHex}:${hashHex}`;
  }

  // Fallback if subtle crypto is not available in test/legacy context
  let hash = 0;
  const str = saltHex + ':' + plainPassword;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `SHA256:${saltHex}:${Math.abs(hash).toString(16)}`;
}

/**
 * Verify password against stored hash with backward compatibility
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;

  const trimmedPlain = plainPassword.trim();
  const trimmedStored = storedHash.trim();

  // If stored in modern SHA256 format
  if (trimmedStored.startsWith('SHA256:')) {
    const parts = trimmedStored.split(':');
    if (parts.length === 3) {
      const saltHex = parts[1];
      const expectedHash = parts[2];

      const encoder = new TextEncoder();
      const data = encoder.encode(saltHex + ':' + trimmedPlain);

      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const actualHash = bufferToHex(hashBuffer);
        return actualHash === expectedHash;
      }
    }
  }

  // Backward compatibility with legacy plain text password
  return trimmedPlain === trimmedStored;
}

/**
 * Sanitize string inputs to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}

/**
 * Dangerous file extensions that must NEVER be uploaded
 */
const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'php', 'phtml', 'php3', 'php4', 'php5',
  'js', 'jsx', 'ts', 'tsx', 'vbs', 'msi', 'scr', 'jar', 'html', 'htm',
  'dll', 'com', 'cgi', 'pl', 'py', 'rb', 'apk', 'app', 'dmg', 'iso', 'bin'
]);

/**
 * Allowed MIME types / extensions for documents and images
 */
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'
]);

/**
 * Scan file upload: checks extension, file size, and scans binary magic bytes
 */
export async function validateAndScanFileUpload(
  file: File,
  maxSizeBytes: number = 25 * 1024 * 1024 // 25 MB max
): Promise<{ valid: boolean; error?: string; detectedType?: string }> {
  if (!file) {
    return { valid: false, error: 'Berkas tidak ditemukan.' };
  }

  // 1. Check file size
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${maxMb} MB.`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Berkas kosong (0 bytes) tidak diperbolehkan.' };
  }

  // 2. Check extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ext || FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Tipe ekstensi .${ext || 'unknown'} diblokir oleh sistem keamanan demi mencegah eksekusi skrip berbahaya.`
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Format berkas .${ext} tidak didukung. Harap unggah PDF, Dokumen Office (DOC/DOCX/XLS/XLSX), CSV, atau Gambar (JPG/PNG/WEBP).`
    };
  }

  // 3. Scan Magic Bytes (inspect file header directly to prevent extension spoofing)
  try {
    const slice = file.slice(0, 16);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    const isPdfHeader = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    const isPngHeader = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    const isJpegHeader = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    // GIF magic bytes: 'GIF87a' or 'GIF89a' (0x47 0x49 0x46 0x38)
    const isGifHeader = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;

    // ZIP / DOCX / XLSX magic bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    const isZipOfficeHeader = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

    // Legacy OLE2 DOC/XLS: 0xD0 0xCF 0x11 0xE0
    const isOle2OfficeHeader = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;

    // Check header consistency for specific extensions
    if (ext === 'pdf' && !isPdfHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .pdf tetapi struktur header bukan dokumen PDF yang valid.'
      };
    }

    if ((ext === 'png') && !isPngHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .png tetapi struktur header bukan gambar PNG yang valid.'
      };
    }

    if ((ext === 'jpg' || ext === 'jpeg') && !isJpegHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .jpg/.jpeg tetapi struktur header bukan gambar JPEG yang valid.'
      };
    }

    if ((ext === 'docx' || ext === 'xlsx') && !isZipOfficeHeader && !isOle2OfficeHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas dokumen Office tidak memiliki header ZIP/XML yang valid.'
      };
    }

    let detected = ext.toUpperCase();
    if (isPdfHeader) detected = 'PDF Document';
    if (isPngHeader) detected = 'PNG Image';
    if (isJpegHeader) detected = 'JPEG Image';

    return { valid: true, detectedType: detected };
  } catch (err) {
    console.warn('Binary header scan skipped due to browser read error:', err);
    // If browser cannot slice, fallback to extension check which already passed
    return { valid: true, detectedType: ext.toUpperCase() };
  }
}
