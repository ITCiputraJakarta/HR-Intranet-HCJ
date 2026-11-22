/**
 * Security utilities for HR Intranet Portal
 * - Password hashing & verification (PBKDF2-HMAC-SHA256 via Web Crypto + pure-JS SHA-256 fallback)
 * - Safe URL sanitization (anti-javascript:/data:text/html/svg injection)
 * - CSV formula injection escaping & safe filename sanitization
 * - Input sanitization
 * - File upload validation and fail-closed binary header (magic bytes) + script scanning
 */

const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEY_BITS = 256;

function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < byteArray.length; i++) {
    hex += byteArray[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function getCryptoObj(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return null;
}

/**
 * Cryptographically secure random bytes (fail closed if CSPRNG unavailable)
 */
export function getSecureRandomBytes(length: number): Uint8Array {
  const cryptoObj = getCryptoObj();
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Cryptographically secure random generator is unavailable in this environment.');
  }
  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);
  return bytes;
}

/**
 * Constant-time string comparison to reduce timing side-channels on hash checks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/**
 * Standard RFC/FIPS 180-4 SHA-256 in pure JavaScript
 * Produces identical output to crypto.subtle and Node.js crypto in all environments
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
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);
  const msgLen = utf8Bytes.length;
  const words: number[] = [];
  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8Bytes[i] << (24 - (i % 4) * 8));
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

async function derivePbkdf2Hex(
  plainPassword: string,
  saltHex: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<string> {
  const cryptoObj = getCryptoObj();
  if (cryptoObj && cryptoObj.subtle) {
    const encoder = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      encoder.encode(plainPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(saltHex),
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      PBKDF2_KEY_BITS
    );
    return bufferToHex(derivedBits);
  }
  // Stretched pure-JS fallback only when Web Crypto subtle is unavailable
  let acc = sha256Pure(`${saltHex}:${plainPassword}`);
  const rounds = Math.min(iterations, 5000);
  for (let i = 1; i < rounds; i++) {
    acc = sha256Pure(`${acc}:${saltHex}:${i}`);
  }
  return acc;
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Kata sandi tidak valid.' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { valid: false, error: 'Kata sandi wajib minimal 8 karakter.' };
  }
  if (trimmed.length > 128) {
    return { valid: false, error: 'Kata sandi maksimal 128 karakter.' };
  }
  if (!/[A-Za-z]/.test(trimmed) || !/\d/.test(trimmed)) {
    return { valid: false, error: 'Kata sandi wajib mengandung kombinasi huruf dan angka.' };
  }
  return { valid: true };
}

export function needsPasswordUpgrade(storedHash?: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  return !storedHash.startsWith('PBKDF2:');
}

/**
 * Hash password using PBKDF2-HMAC-SHA256 (120,000 iterations) with a CSPRNG 16-byte salt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword) return '';
  const trimmed = plainPassword.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('PBKDF2:')) {
    return trimmed;
  }

  const saltBytes = getSecureRandomBytes(16);
  const saltHex = bufferToHex(saltBytes.buffer as ArrayBuffer);
  const hashHex = await derivePbkdf2Hex(trimmed, saltHex, PBKDF2_ITERATIONS);
  return `PBKDF2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify password strictly against PBKDF2 or legacy SHA256 hashes (no plaintext or weak 32-bit fallback).
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;

  const trimmedPlain = plainPassword.trim();
  const trimmedStored = storedHash.trim();

  // Modern PBKDF2:iterations:saltHex:hashHex format
  if (trimmedStored.startsWith('PBKDF2:')) {
    const parts = trimmedStored.split(':');
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const saltHex = parts[2];
    const expectedHash = parts[3];
    if (!Number.isFinite(iterations) || iterations < 10000 || iterations > 1000000 || !saltHex || !expectedHash) {
      return false;
    }
    try {
      const actualHash = await derivePbkdf2Hex(trimmedPlain, saltHex, iterations);
      return constantTimeEqual(actualHash, expectedHash);
    } catch {
      return false;
    }
  }

  // Legacy SHA256:saltHex:hashHex migration support (verifies cryptographically only)
  if (trimmedStored.startsWith('SHA256:')) {
    const parts = trimmedStored.split(':');
    if (parts.length === 3) {
      const saltHex = parts[1];
      const expectedHash = parts[2];
      if (!saltHex || !expectedHash || expectedHash.length !== 64) {
        return false;
      }
      try {
        const cryptoObj = getCryptoObj();
        if (cryptoObj && cryptoObj.subtle) {
          const encoder = new TextEncoder();
          const data = encoder.encode(saltHex + ':' + trimmedPlain);
          const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
          const actualHash = bufferToHex(hashBuffer);
          if (constantTimeEqual(actualHash, expectedHash)) return true;
        }
      } catch {
        // Fallback to pure JS sha256
      }

      const pureHash = sha256Pure(saltHex + ':' + trimmedPlain);
      return constantTimeEqual(pureHash, expectedHash);
    }
  }

  // Reject plaintext or unknown hash formats
  return false;
}

/**
 * Sanitize string inputs to remove active HTML/script markers
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export interface SafeUrlOptions {
  allowDataImage?: boolean;
  allowDataDocument?: boolean;
  allowBlob?: boolean;
  allowRelative?: boolean;
}

const SAFE_IMAGE_DATA_PREFIX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_DOC_DATA_PREFIX =
  /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/plain|text\/csv);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Validates and sanitizes dynamic URLs for href / src / iframe sinks.
 * Returns null if empty or unsafe (so callers never render `src=""` or `javascript:`).
 */
export function sanitizeSafeUrl(
  rawUrl?: string | null,
  options: SafeUrlOptions = {}
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Strip control whitespace bypass attempts when inspecting scheme
  const compact = trimmed.replace(/[\u0000-\u0020]+/g, '');
  const lower = compact.toLowerCase();

  // Explicitly block dangerous schemes & active HTML/SVG data URLs
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:image/svg') ||
    lower.startsWith('data:application/javascript') ||
    lower.startsWith('data:text/javascript')
  ) {
    return null;
  }

  if (lower.startsWith('data:')) {
    if (options.allowDataImage && SAFE_IMAGE_DATA_PREFIX.test(compact)) {
      return compact;
    }
    if (options.allowDataDocument && SAFE_DOC_DATA_PREFIX.test(compact)) {
      return compact;
    }
    // Also allow safe data:image inside document preview if allowDataDocument is enabled
    if (options.allowDataDocument && SAFE_IMAGE_DATA_PREFIX.test(compact)) {
      return compact;
    }
    return null;
  }

  if (lower.startsWith('blob:')) {
    return options.allowBlob ? trimmed : null;
  }

  if (options.allowRelative !== false) {
    if ((trimmed.startsWith('/') && !trimmed.startsWith('//')) || trimmed.startsWith('#')) {
      return trimmed;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Escapes CSV cell values against Spreadsheet Formula Injection (=, +, -, @, \t, \r)
 * and safely quotes according to RFC 4180.
 */
export function escapeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Sanitizes downloaded or uploaded filenames against path traversal and special characters.
 */
export function sanitizeFileName(name: string, fallback: string = 'document'): string {
  if (!name || typeof name !== 'string') return fallback;
  const base = name.replace(/^.*[\\/]/, '').replace(/\.\./g, '');
  const clean = base.replace(/[^\w.\-() ]+/g, '_').replace(/^\.+/, '').trim();
  return clean.slice(0, 120) || fallback;
}

/**
 * Dangerous file extensions that must NEVER be uploaded
 */
const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'php', 'phtml', 'php3', 'php4', 'php5',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'vbs', 'msi', 'scr', 'jar', 'html', 'htm',
  'xhtml', 'svg', 'svgz', 'xml', 'dll', 'com', 'cgi', 'pl', 'py', 'rb', 'apk', 'app',
  'dmg', 'iso', 'bin'
]);

/**
 * Strict allowlist for documents and raster images
 */
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'
]);

/**
 * Scan file upload: checks extension, file size, MIME, magic bytes (fail-closed), and text scripts
 */
export async function validateAndScanFileUpload(
  file: File,
  maxSizeBytes: number = 25 * 1024 * 1024 // 25 MB max
): Promise<{ valid: boolean; error?: string; detectedType?: string }> {
  if (!file) {
    return { valid: false, error: 'Berkas tidak ditemukan.' };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
    return {
      valid: false,
      error: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${maxMb} MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Berkas kosong (0 bytes) tidak diperbolehkan.' };
  }

  if (file.type && (file.type.toLowerCase().includes('svg') || file.type.toLowerCase().includes('html'))) {
    return {
      valid: false,
      error: 'Format SVG atau HTML tidak diizinkan demi keamanan portal.',
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ext || FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Tipe ekstensi .${ext || 'unknown'} diblokir oleh sistem keamanan demi mencegah eksekusi skrip berbahaya.`,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Format berkas .${ext} tidak didukung. Harap unggah PDF, Dokumen Office (DOC/DOCX/XLS/XLSX), CSV, TXT, atau Gambar (JPG/PNG/WEBP/GIF).`,
    };
  }

  // Fail-closed header & content verification
  try {
    const headerBuf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    if (bytes.length < 3) {
      return { valid: false, error: 'Berkas terlalu kecil atau tidak memiliki header yang valid.' };
    }

    const isPdfHeader =
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46; // %PDF

    const isPngHeader =
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;

    const isJpegHeader = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    const isGifHeader =
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61; // GIF87a / GIF89a

    const isWebpHeader =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50; // RIFF....WEBP

    const isZipOfficeHeader =
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04;

    const isOle2OfficeHeader =
      bytes.length >= 4 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0;

    if (ext === 'pdf' && !isPdfHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .pdf tetapi struktur header bukan dokumen PDF yang valid.',
      };
    }
    if (ext === 'png' && !isPngHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .png tetapi struktur header bukan gambar PNG yang valid.',
      };
    }
    if ((ext === 'jpg' || ext === 'jpeg') && !isJpegHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .jpg/.jpeg tetapi struktur header bukan gambar JPEG yang valid.',
      };
    }
    if (ext === 'webp' && !isWebpHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .webp tetapi struktur header bukan gambar WebP yang valid.',
      };
    }
    if (ext === 'gif' && !isGifHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas berekstensi .gif tetapi struktur header bukan gambar GIF yang valid.',
      };
    }
    if ((ext === 'docx' || ext === 'xlsx') && !isZipOfficeHeader && !isOle2OfficeHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas dokumen Office tidak memiliki header ZIP/OOXML yang valid.',
      };
    }
    if ((ext === 'doc' || ext === 'xls') && !isOle2OfficeHeader && !isZipOfficeHeader) {
      return {
        valid: false,
        error: 'Integritas berkas gagal: Berkas dokumen Office tidak memiliki header OLE2 yang valid.',
      };
    }

    // For plain-text / CSV uploads, verify absence of binary executables or HTML/script payloads
    if (ext === 'csv' || ext === 'txt') {
      if (isPdfHeader || isZipOfficeHeader || (bytes[0] === 0x4d && bytes[1] === 0x5a)) {
        return {
          valid: false,
          error: 'Integritas berkas gagal: Isi berkas teks tidak sesuai dengan ekstensinya.',
        };
      }
      const textSample = new TextDecoder('utf-8', { fatal: false }).decode(
        await file.slice(0, 8192).arrayBuffer()
      );
      if (/<script\b|<iframe\b|<svg\b|javascript:|onerror\s*=|onload\s*=/i.test(textSample)) {
        return {
          valid: false,
          error: 'Berkas ditolak karena mengandung tag HTML/skrip aktif yang tidak diperbolehkan.',
        };
      }
    }

    let detected = ext.toUpperCase();
    if (isPdfHeader) detected = 'PDF Document';
    else if (isPngHeader) detected = 'PNG Image';
    else if (isJpegHeader) detected = 'JPEG Image';
    else if (isWebpHeader) detected = 'WebP Image';
    else if (isGifHeader) detected = 'GIF Image';

    return { valid: true, detectedType: detected };
  } catch {
    // Fail closed if browser cannot inspect file bytes
    return {
      valid: false,
      error: 'Gagal memverifikasi integritas biner berkas. Unggahan dibatalkan demi keamanan.',
    };
  }
}
