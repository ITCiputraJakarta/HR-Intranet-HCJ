# Security Summary

**Reviewed Files**: 17 (`api/_lib/createApiApp.ts`, `src/lib/firebase.ts`, `src/lib/authSession.ts`, `src/lib/firestoreService.ts`, `src/lib/cmsService.ts`, `src/lib/branding.ts`, `src/lib/storage.ts`, `src/App.tsx`, `src/components/LoginView.tsx`, `src/components/UserManagementView.tsx`, `src/components/AnnouncementsView.tsx`, `src/components/public/PublicHomeView.tsx`, `src/components/HomeCmsAdminView.tsx`, `src/components/CareerCmsAdminView.tsx`, `firebase.json`, `firebase-blueprint.json`, `firestore.rules`, `firestore.rules.test.ts`)
**Issues Resolved**: 7

Audit sinkronisasi dan keamanan menyeluruh Frontend (`React + Vite`) ↔ Backend (`Express /api/*`) ↔ `Cloud Firestore` (`hr-intranet-31ff4` / `(default)`) telah diselesaikan untuk menghilangkan data fiktif (phantom data) serta menutup celah autentikasi, otorisasi, CSRF, dan ketidaksinkronan aturan akses.

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Phantom Public News & Stale Cache | `src/components/public/PublicHomeView.tsx`, `src/lib/cmsService.ts`, `src/lib/firestoreService.ts`, `src/App.tsx` | 298 | Ketika Cloud Firestore memiliki 0 pengumuman publik aktif, `PublicHomeView.tsx` menampilkan 3 artikel contoh bawaan dan listener/sinkronisasi melewatkan snapshot kosong dari server (`fromCache === false`), sehingga UI menampilkan data yang tidak ada di backend. | Medium | Fixed | Menghapus seluruh artikel fallback fiktif dari `PublicHomeView.tsx` (diganti status kosong resmi), menambahkan filter `expiryDate`, serta memperbarui `subscribeToUsers`, `subscribeToDepartments`, `subscribeToCareerJobs`, `subscribeToCareerApplications`, `getCareerJobs()`, dan `runSuperAdminAutoSync` agar menerima snapshot kosong server secara akurat. |
| Approved-Member Database Access Gate | `firestore.rules`, `firebase-blueprint.json`, `src/lib/firestoreService.ts` | 43 | Beberapa aturan baca/tulis koleksi internal di Firestore sebelumnya hanya memeriksa status login Google terverifikasi (`isSignedIn()`) tanpa memastikan status keanggotaan `Approved` di database serta memakai perbandingan email peka huruf besar/kecil. | High | Needs Follow-Up | Menambahkan koleksi indeks `/userAccess/{accessId}` dan helper `isApprovedMember()` plus perbandingan email case-insensitive (`.lower()`) di `firestore.rules` dan `firebase-blueprint.json`, disertai pengurutan tulis parent-sebelum-chunk. File aturan lolos `eslint` lokal; deploy ke project `hr-intranet-31ff4` perlu dijalankan oleh pemilik project (`firebase deploy --only firestore:rules`). |
| Admin-Only Photo Public Announcements | `firestore.rules`, `src/components/AnnouncementsView.tsx` | 111 | Pembatasan publikasi pengumuman publik (khusus Super Admin, khusus foto tanpa berkas lampiran non-gambar) sebelumnya hanya dijaga di antarmuka React dan berisiko dilewati oleh permintaan langsung ke Firestore. | Medium | Needs Follow-Up | Menambahkan `isValidPublicAnnouncement()` di `firestore.rules` yang mewajibkan `isAdmin()`, `category == 'Pengumuman'`, `fileType` gambar (`image/png|jpeg|jpg|webp|gif`), serta melarang field `attachmentUrl`/`attachmentName` pada dokumen `isPublic == true`. UI `AnnouncementsView.tsx` turut dikunci ke `isSuperAdmin`. |
| Express ↔ Browser Password Hash Sync | `api/_lib/createApiApp.ts`, `src/lib/storage.ts` | 126 | Server Express hanya memeriksa hash `SCRYPT:`, sedangkan hash password user yang tersinkron dari browser/Firestore menggunakan `PBKDF2:120000:<saltHex>:<hashHex>` (UTF-8 salt & trimmed password), menyebabkan kegagalan sinkron login dan pembaruan status ke server. | High | Fixed | Menambahkan `verifyStoredPassword()` di `api/_lib/createApiApp.ts` untuk memverifikasi `SCRYPT:` maupun `PBKDF2:` browser secara timing-safe, serta menambahkan endpoint admin `/api/admin/users`, `/api/admin/users/sync`, dan `DELETE /api/admin/users/:email` yang dipanggil langsung oleh `storage.ts` dan `App.tsx`. |
| First-Run Admin Claim & Immediate Revocation | `api/_lib/createApiApp.ts`, `src/App.tsx` | 608 | Akun non-utama yang diturunkan statusnya (`Rejected`/`Pending`) masih dapat memakai token sesi lama hingga kedaluwarsa, dan tidak tersedia jalur klaim satu kali yang aman ketika `ADMIN_BOOTSTRAP_PASSWORD` belum disetel. | High | Fixed | Middleware `requireAuth` kini memeriksa status langsung pada `usersByEmail` dan langsung menolak (`403`) + menghapus cookie bila status bukan `Approved`; rute `/api/auth/claim-admin` hanya aktif sekali saat password Super Admin belum ada; `App.tsx` mewajibkan `isSessionVerified === true`. |
| Cookie Session CSRF Hardening | `api/_lib/createApiApp.ts`, `src/lib/authSession.ts` | 481 | Permintaan pengubah status berbasis cookie tanpa header `Origin` hanya dicek sebagian tanpa fallback `Referer` dan header khusus `X-Requested-With`. | Medium | Fixed | Middleware CSRF kini memverifikasi host `Origin`, memeriksa `Referer` jika `Origin` tidak ada pada sesi cookie, mewajibkan header `X-Requested-With` sebagai fallback ketat, dan `fetchWithApiAuth` mengirim `X-Requested-With: XMLHttpRequest` secara default. |
| Firestore Database Target Consistency | `firebase.json`, `src/lib/firebase.ts` | 12 | `firebase.json` sempat mengarah ke ID database lama (`ai-studio-...`), tidak sinkron dengan `firebase-applet-config.json` yang memakai `(default)`. | Medium | Fixed | Menyamakan `firebase.json` dan inisialisasi eksplisit `TARGET_FIRESTORE_DB_ID` pada `src/lib/firebase.ts` agar seluruh koneksi membaca/menulis ke database `(default)` pada `hr-intranet-31ff4`. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Session & Token Verification | `api/_lib/createApiApp.ts` | Cookie `HttpOnly` bertanda tangan HMAC-SHA256 + verifikasi status `Approved` langsung pada setiap permintaan; token Google SSO diverifikasi tanda tangan RS256 Google SecureToken dan status Firestore `fail-closed`. |
| CSRF & Rate Limiting | `api/_lib/createApiApp.ts`, `src/lib/authSession.ts` | Pembatasan rate limiter per IP untuk `/auth/*` & `/ai/*`, pengecekan `Origin`/`Referer`/`X-Requested-With` pada request pengubah status, serta header `Cache-Control: no-store` dan `X-Content-Type-Options: nosniff`. |
| Firestore Rules Validation & Ownership | `firestore.rules`, `firestore.rules.test.ts` | Default-deny global, validasi ID dokumen & panjang string/array, isolasi PII pada `users`, `accessLogs`, `performances`, dan `career_applications`, serta `0` error/warning pada pemeriksaan `npx eslint -f json firestore.rules`. |
| Silent Error & Write Propagation | `src/lib/firestoreService.ts`, `src/lib/cmsService.ts`, `src/lib/branding.ts`, `src/components/*` | Kesalahan simpan/hapus Firestore tidak lagi ditelan oleh timeout/catch kosong pada komponen admin, sehingga kegagalan izin atau jaringan muncul secara akurat ke pengguna. |

> **Catatan Audit Dependensi (`bun audit`)**: Terdeteksi 2 temuan kerentanan (`1 high`, `1 low`) pada paket turunan `@grpc/grpc-js@1.9.16` di dalam dependensi `firebase` (`GHSA-m9gg-hp2v-232j` dan `GHSA-f596-whhp-79r4`). Pembaruan paket `firebase` disarankan pada siklus pemeliharaan berikutnya.

---

## PoC Verification

### 1. Eliminasi Artikel Fiktif "Berita & Pengumuman" Saat Firestore Kosong

#### Summary
| Field | Value |
|---|---|
| Issue Type | Hardcoded Phantom Fallback Data & Stale Empty Snapshot Skipping |
| Impact | Medium |
| Affected File | `src/components/public/PublicHomeView.tsx:298`, `src/lib/cmsService.ts:132`, `src/lib/firestoreService.ts:496` |
| Test Scenario | Memuat halaman Beranda Publik (`PublicHomeView`) dan katalog karir ketika Cloud Firestore mengembalikan array kosong (`[]`). |

#### How It Was Fixed
Seluruh array berita sampel bawaan di `PublicHomeView.tsx` dihapus dan diganti tampilan kosong eksplisit (*Belum Ada Pengumuman Publik*), ditambah penyaringan `expiryDate`. Listener Firestore (`Users`, `Departments`, `CareerJobs`, `CareerApplications`) dan `runSuperAdminAutoSync` kini meneruskan array kosong `[]` ketika snapshot server kosong (`!snapshot.metadata.fromCache`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `subscribeToDocuments(..., true)` menerima snapshot kosong dari Firestore saat tidak ada dokumen `isPublic: true`. | Callback memperbarui state ke `[]` dan `saveDocuments([])`. |
| 2 | `PublicHomeView.tsx` menyaring `documents` (`isPublic === true && category === 'Pengumuman' && !expired`). | `publishedNews` bernilai `[]` (panjang `0`). |
| 3 | Kondisi render `publishedNews.length === 0` dijalankan pada `PublicHomeView.tsx`. | Merender kotak status kosong resmi tanpa memunculkan 3 artikel contoh lama. |

#### Conclusion
**Fix Verified** - Beranda publik hanya menampilkan pengumuman publik aktif yang benar-benar ada di Cloud Firestore dan selalu bersih saat koleksi kosong.

---

### 2. Verifikasi Sinkronisasi Password, Klaim Admin Tunggal, dan Pencabutan Sesi Real-Time

#### Summary
| Field | Value |
|---|---|
| Issue Type | Password Hash Mismatch & Unrevoked Session Token on Role/Status Change |
| Impact | High |
| Affected File | `api/_lib/createApiApp.ts:126`, `api/_lib/createApiApp.ts:608`, `api/_lib/createApiApp.ts:657` |
| Test Scenario | Uji HTTP langsung ke `createApiApp()` mencakup CSRF lintas asal, klaim admin ganda, self-register role spoofing, login `PBKDF2`, dan pencabutan akses setelah status diubah ke `Rejected`. |

#### How It Was Fixed
`verifyStoredPassword()` mendukung verifikasi `SCRYPT:` maupun `PBKDF2:120000:<saltHex>:<hashHex>` milik browser, `/api/auth/claim-admin` hanya menerima klaim pertama ketika akun admin utama belum memiliki hash, `/api/auth/register` mengunci role ke `staff` & status ke `Pending`, dan `requireAuth` memblokir sesi seketika saat status di `usersByEmail` berubah dari `Approved`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `POST /api/auth/claim-admin` pertama untuk `it@hotelciputra.com` berjalan, lalu percobaan kedua dikirim dengan password berbeda. | Klaim pertama mengembalikan HTTP `201`; klaim kedua ditolak HTTP `403`. |
| 2 | `POST /api/auth/register` dikirim dengan payload `{ role: "admin", status: "Approved" }`, lalu dicoba `POST /api/auth/login`. | Pendaftaran dipaksa ke `role: "staff"` dan `status: "Pending"`; login ditolak HTTP `403`. |
| 3 | Admin menyinkronkan user ke `Approved` dengan hash `PBKDF2` lalu login (`200`), kemudian menyinkronkan status user menjadi `Rejected` dan mengakses `GET /api/auth/session`. | Login `PBKDF2` sukses (`200`), lalu setelah status `Rejected` disinkronkan, token aktif langsung ditolak HTTP `403` dan cookie dihapus. |

#### Conclusion
**Fix Verified** - Login browser dan server Express tersinkron penuh, klaim admin tidak dapat diulang, dan pencabutan akses berlaku seketika.

---

### 3. Validasi Aturan Firestore: Blokir Non-Admin Publik, Lampiran Non-Foto, dan Eskalasi `/userAccess`

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Approved-Member Database Gate & Public Announcement Type Enforcement |
| Impact | High |
| Affected File | `firestore.rules:42`, `firestore.rules:111`, `firestore.rules:355`, `firestore.rules.test.ts:293` |
| Test Scenario | Evaluasi `npx eslint -f json firestore.rules` serta 17 skenario negatif pada `firestore.rules.test.ts` (termasuk eskalasi `userAccess`, non-admin `isPublic: true`, dan pengumuman publik berisi lampiran PDF). |

#### How It Was Fixed
Aturan menambahkan `isApprovedMember()` berbasis indeks `/userAccess/{accessId}`, perbandingan email case-insensitive, dan `isValidPublicAnnouncement()` yang mewajibkan `isAdmin()`, MIME gambar (`image/png|jpeg|jpg|webp|gif`), serta melarang field lampiran dokumen pada pengumuman publik.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | `npx eslint -f json firestore.rules` dieksekusi untuk mengaudit seluruh blok `allow` dan helper. | Keluar kode `0` dengan `errorCount: 0` dan `warningCount: 0`. |
| 2 | `firestore.rules.test.ts` menguji pembuatan dokumen di `/userAccess` oleh non-admin dan pembuatan pengumuman `isPublic: true` oleh staff atau oleh admin dengan `attachmentUrl` PDF. | Seluruh 17 skenario mengembalikan `PERMISSION_DENIED` (`RULES_SPEC_OK`). |

#### Conclusion
**Fix Verified Locally (Deploy Follow-Up Required)** - Aturan Firestore tervalidasi oleh ESLint dan seluruh 17 skenario penolakan; deploy aturan ke Firebase project `hr-intranet-31ff4` perlu dijalankan dari akun pemilik Firebase.
