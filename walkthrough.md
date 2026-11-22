# Security Summary

**Reviewed Files**: 9 (`api/_lib/createApiApp.ts`, `src/components/LoginView.tsx`, `src/App.tsx`, `src/lib/storage.ts`, `src/lib/cmsService.ts`, `src/lib/firestoreService.ts`, `src/components/common/UnifiedLogo.tsx`, `firestore.rules`, `firestore.rules.test.ts`)
**Issues Resolved**: 7

Audit menyeluruh keamanan Login Google SSO, penyimpanan browser (`localStorage`/`sessionStorage`), komunikasi API, dan aturan akses Cloud Firestore telah diselesaikan dan diverifikasi untuk **Portal Intranet & Arsip Digital Hotel Ciputra Jakarta**.

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Google SSO Session Bypass | `api/_lib/createApiApp.ts` | 719 | Endpoint `POST /api/auth/firebase-session` sebelumnya langsung menerbitkan cookie `hcj_session` dan token berstatus `Approved` untuk akun Gmail terverifikasi mana pun tanpa memeriksa apakah akun disetujui di Firestore. | Critical | Fixed | Menambahkan `verifyFirebaseIdToken` (`sign_in_provider === "google.com"` & `auth_time`) serta `lookupFirestoreUserByEmail` ke Firestore REST API (`fail-closed`: `Pending`/`Rejected`/belum terdaftar ditolak HTTP `403`, error DB ditolak HTTP `503`, cookie lama dihapus). |
| Lingering Firebase SSO Session | `src/components/LoginView.tsx` | 557 | Pengguna Google yang statusnya masih `Pending`, `Rejected`, atau baru mendaftar tetap berada dalam sesi Firebase Auth aktif di browser. | High | Fixed | Menambahkan `cleanupUnapprovedGoogleSession()` (`auth.signOut()` + `POST /api/auth/logout` + `clearAllSessionCache()`) di seluruh jalur non-Approved pada `LoginView.tsx` dan `App.tsx`. |
| Sensitive PII in Browser Storage | `src/lib/storage.ts` | 89 | Direktori karyawan, log akses, target KPI, kategori internal, skor penilaian kinerja, notifikasi, dan dokumen SOP/Formulir internal sebelumnya masih disimpan di `localStorage`. | High | Fixed | Memindahkan seluruh data sensitif ke cache memori JS (`SENSITIVE_STORAGE_KEYS`), membersihkan sisa data lama saat startup (`scrubLegacySensitiveLocalStorage`), serta membatasi penyimpanan dokumen di `localStorage` hanya pada pengumuman berstatus publik (`isPublic === true`). |
| Candidate CV & PII Exposure | `src/lib/cmsService.ts` | 23 | Data lamaran karir beserta berkas CV PDF kandidat (`hcj_career_applications_v1`) sebelumnya tersimpan di `localStorage`. | High | Fixed | Menghapus seluruh penyimpanan `localStorage` untuk lamaran karir, membersihkan kunci lama saat boot, dan menahan data hanya di memori selama sesi Super Admin aktif. |
| Cross-Origin Request Forgery | `api/_lib/createApiApp.ts` | 424 | Permintaan pengubah status (`POST`/`PUT`/`PATCH`/`DELETE`) yang memakai cookie `HttpOnly` belum memverifikasi kecocokan `Origin` terhadap host server. | Medium | Fixed | Menambahkan middleware verifikasi Same-Origin pada permintaan berbasis cookie serta header `Strict-Transport-Security` saat koneksi HTTPS aktif. |
| Browser Console & Full-Scan Leaks | `src/lib/firestoreService.ts` | 43 | Pesan error dan log konsol sempat mencatat alamat email pengguna, nama dokumen, dan `firestoreFindUserByEmail` sempat memiliki fallback scan seluruh koleksi `users`. | Medium | Fixed | Menyunting pesan error (`email: '[REDACTED]'`), menghapus log konsol sensitif, dan menghapus fallback scan penuh pada `firestoreFindUserByEmail`. |
| Admin Telemetry Read Scope | `firestore.rules` | 532 | Dokumen `systemConfig/cloud_quota_telemetry` sebelumnya dapat dibaca oleh seluruh pengguna terautentikasi, bukan khusus Super Admin. | Low | Fixed | Memperketat `allow get` pada `cloud_quota_telemetry` khusus untuk `isAdmin()`, memverifikasi dengan `eslint` dan `firestore.rules.test.ts` (14 skenario), lalu men-deploy ulang aturan ke Firebase (`hr-intranet-31ff4`). |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Google SSO Token & Provider | `api/_lib/createApiApp.ts` | Token Google Firebase diverifikasi tanda tangan kriptografi RS256 terhadap kunci publik Google SecureToken, dicek `aud`/`iss`/`exp`/`auth_time`, `email_verified === true`, dan `firebase.sign_in_provider === "google.com"`. |
| Session Cookies & Fail-Closed Boot | `src/App.tsx`, `api/_lib/createApiApp.ts` | Cookie sesi `HttpOnly; SameSite=Lax` bertanda tangan HMAC-SHA256 wajib lolos verifikasi server dan status `Approved` di Firestore sebelum antarmuka portal dibuka. |
| Header Keamanan & Isolasi Data | `api/_lib/createApiApp.ts`, `src/lib/storage.ts` | Header `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`, `Cache-Control: no-store`, dan `Strict-Transport-Security` (HTTPS) aktif; data sensitif dibersihkan otomatis dari `localStorage` dan `sessionStorage` saat logout atau idle timeout. |
| Cloud Firestore Access Control | `firestore.rules`, `firestore.rules.test.ts` | Aturan *default-deny*, isolasi PII pemilik/admin, pembatasan unggahan CV PDF (<= 1 MB), larangan tautan skrip berbahaya pada dokumen/potongan berkas, serta pembatasan baca `cloud_quota_telemetry` hanya untuk Super Admin. |

> **Catatan Audit Dependensi (`npm audit --omit=dev --audit-level=high`)**: Masih terdapat 9 temuan kerentanan pada paket turunan (`@grpc/grpc-js` dan `re2js` via `firebase`, `body-parser` & `qs` via `express`, serta `vite`/`source-map-js`). Pembaruan versi minor/patch paket utama direkomendasikan pada siklus pemeliharaan berikutnya.

---

## PoC Verification

### 1. Penolakan Google SSO untuk Akun Belum Disetujui / Belum Terdaftar

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Server-Side Authorization Check on Google SSO Exchange |
| Impact | Critical |
| Affected File | `api/_lib/createApiApp.ts:719`, `src/components/LoginView.tsx:557` |
| Test Scenario | Pengiriman `idToken` tidak sah ke `POST /api/auth/firebase-session` serta penelusuran akun Google valid yang berstatus `Pending` atau belum terdaftar. |

#### How It Was Fixed
Server kini memverifikasi klaim penyedia login (`google.com`) dan `auth_time`, lalu memanggil Cloud Firestore REST API menggunakan token pemanggil untuk memastikan akun terdaftar dan berstatus `Approved` sebelum menerbitkan cookie sesi maupun token API. Di browser, akun non-Approved langsung dikeluarkan lewat `cleanupUnapprovedGoogleSession()`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Permintaan `POST /api/auth/firebase-session` dengan token palsu masuk ke handler. | Ditolak HTTP `401 Unauthorized` & cookie `hcj_session` dikosongkan (`Max-Age=0`). |
| 2 | Token Google valid milik karyawan `Pending`/`Rejected` atau non-admin baru masuk ke `lookupFirestoreUserByEmail()` (`api/_lib/createApiApp.ts:289`). | Firestore mengembalikan status non-Approved atau kosong; server menolak HTTP `403 Forbidden` dan membersihkan cookie. |
| 3 | Pada `LoginView.tsx:591-642`, hasil `Pending`/`Rejected`/unregistered memanggil `cleanupUnapprovedGoogleSession()`. | Sesi Firebase Auth, cookie sesi, dan cache memori dibersihkan total. |

#### Conclusion
**Fix Verified** - Tidak ada pengguna Google yang dapat memperoleh sesi portal aktif tanpa persetujuan status `Approved` di Firestore.

---

### 2. Pencegahan Kebocoran PII & Dokumen Internal dari `localStorage`

#### Summary
| Field | Value |
|---|---|
| Issue Type | Sensitive Data Persistence in Browser Storage |
| Impact | High |
| Affected File | `src/lib/storage.ts:89`, `src/lib/cmsService.ts:23` |
| Test Scenario | Pembacaan/penulisan `getUsers()`, `getPerformances()`, `getAccessLogs()`, `getKPIMaster()`, `getCategories()`, `getCareerApplications()`, serta penyimpanan `saveDocuments()` campuran dokumen SOP internal dan pengumuman publik. |

#### How It Was Fixed
Kunci penyimpanan sensitif dimasukkan ke daftar `SENSITIVE_STORAGE_KEYS`, dibersihkan saat boot (`scrubLegacySensitiveLocalStorage()`), dan ditolak penulisannya di `setStored()`. Khusus `DOCUMENTS`, hanya dokumen `isPublic === true && category === 'Pengumuman'` (tanpa lampiran besar) yang boleh disimpan di `localStorage`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Modul `storage.ts` dan `cmsService.ts` dimuat di browser. | `scrubLegacySensitiveLocalStorage()` dan `cmsService.ts` langsung menghapus kunci PII/lamaran lama di `localStorage`. |
| 2 | Aplikasi memanggil `setStored(STORAGE_KEYS.USERS, ...)` atau `saveDocuments([...])`. | Kunci sensitif dilewati; `saveDocuments` menyaring keluar seluruh SOP/Formulir non-publik. |
| 3 | Pengguna keluar (`handleLogout`) di `src/App.tsx`. | State `documents`/`announcements` direset hanya ke item `isPublic === true` dan `clearAllSessionCache()` membersihkan `sessionStorage`. |

#### Conclusion
**Fix Verified** - Direktori pegawai, log audit, penilaian KPI, CV pelamar, dan SOP rahasia tidak tersimpan di `localStorage`.

---

### 3. Perlindungan Permintaan Lintas Asal (Same-Origin) & Pembatasan Telemetri Firestore

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Origin Verification & Overly Permissive Telemetry Read |
| Impact | Medium |
| Affected File | `api/_lib/createApiApp.ts:424`, `firestore.rules:532` |
| Test Scenario | Mengirim `POST /api/auth/logout` dengan `Origin: https://evil.example` dan `Cookie: hcj_session=dummy`, serta menguji akses baca `systemConfig/cloud_quota_telemetry` oleh pengguna biasa di `firestore.rules.test.ts` (#14). |

#### How It Was Fixed
Middleware Express memblokir permintaan mutasi (`POST`/`PUT`/`PATCH`/`DELETE`) berbasis cookie jika host `Origin` berbeda dari host server. Di sisi database, `firestore.rules` membatasi `get` pada `cloud_quota_telemetry` hanya untuk `isAdmin()`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `curl -X POST http://127.0.0.1:3000/api/auth/logout -H "Origin: https://evil.example" -H "Cookie: hcj_session=dummy"` dijalankan. | Server mengembalikan HTTP `403 Forbidden` (`Permintaan lintas asal ditolak demi keamanan sesi.`). |
| 2 | `npx eslint -f json firestore.rules` dan `firestore.rules.test.ts` (14 skenario termasuk kasus `cloud_quota_telemetry` untuk non-admin) dijalankan. | `0` error/warning ESLint, seluruh 14 skenario mengembalikan `PERMISSION_DENIED` (`RULES_SPEC_OK`), dan aturan dideploy ke `hr-intranet-31ff4`. |

#### Conclusion
**Fix Verified** - Permintaan mutasi lintas asal ditolak server dan telemetri kuota hanya dapat dibaca oleh Super Admin.
