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
 * Standard RFC/FIPS 180-4 SHA-256 in pure JavaScript
 * Produces identical output to window.crypto.subtle and Node.js crypto in all environments
 */
export function sha256Pure(str: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const utf8 = unescape(encodeURIComponent(str));
  const msgLen = utf8.length;
  const words: number[] = [];
  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) << (24 - (i % 4) * 8));
  }
  words[msgLen >> 2] = (words[msgLen >> 2] || 0) | (0x80 << (24 - (msgLen % 4) * 8));
  const newLen = (((msgLen + 8) >> 6) + 1) << 4;
  words[newLen - 1] = msgLen * 8;
  const W = new Array(64);
  for (let i = 0; i < newLen; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t] || 0;
    for (let t = 16; t < 64; t++) {
      const g0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const g1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (((W[t - 16] + g0) | 0) + ((W[t - 7] + g1) | 0)) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((h + s1) | 0) + ((ch + K[t]) | 0) + W[t]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    H = [
      (H[0] + a) | 0,
      (H[1] + b) | 0,
      (H[2] + c) | 0,
      (H[3] + d) | 0,
      (H[4] + e) | 0,
      (H[5] + f) | 0,
      (H[6] + g) | 0,
      (H[7] + h) | 0,
    ];
  }
  return H.map((val) => (val >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Hash password with standard SHA-256 and unique salt
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword) return '';
  const trimmed = plainPassword.trim();
  if (!trimmed) return '';
  
  // If already hashed with our prefix
  if (trimmed.startsWith('SHA256:')) {
    return trimmed;
  }

  // Generate 16 bytes salt
  const saltBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(saltBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      saltBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const saltHex = bufferToHex(saltBytes.buffer);

  // Attempt window.crypto.subtle, fallback to deterministic pure JS sha256
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(saltHex + ':' + trimmed);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashHex = bufferToHex(hashBuffer);
      return `SHA256:${saltHex}:${hashHex}`;
    }
  } catch (e) {
    // Fallback to pure JS sha256 if subtle crypto throws in sandboxed iframe
  }

  const hashHex = sha256Pure(saltHex + ':' + trimmed);
  return `SHA256:${saltHex}:${hashHex}`;
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

      // 1. Check with Web Crypto Subtle if available
      try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder();
          const data = encoder.encode(saltHex + ':' + trimmedPlain);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
          const actualHash = bufferToHex(hashBuffer);
          if (actualHash === expectedHash) return true;
        }
      } catch (e) {
        // Fallback to pure JS sha256
      }

      // 2. Check with pure JS standard SHA-256
      const pureHash = sha256Pure(saltHex + ':' + trimmedPlain);
      if (pureHash === expectedHash) return true;

      // 3. Backward compatibility with older non-subtle 32-bit hash
      let hash = 0;
      const str = saltHex + ':' + trimmedPlain;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      if (Math.abs(hash).toString(16) === expectedHash) return true;
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
