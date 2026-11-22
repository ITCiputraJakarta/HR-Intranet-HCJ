# Security Summary

Audit dan perbaikan menyeluruh telah diselesaikan di sisi frontend, backend Express API, penyimpanan lokal, serta konfigurasi & aturan keamanan Cloud Firestore untuk **Portal Intranet & Arsip Digital Hotel Ciputra Jakarta**:

1. **Autentikasi, Kata Sandi, dan Sesi API**
   - Menghapus seluruh kredensial bawaan/hardcoded dari kode sumber klien (`src/data/initialData.ts`) maupun server (`api/_lib/createApiApp.ts`).
   - Memperkuat hashing kata sandi menggunakan `crypto.scrypt` dengan salt acak per pengguna di backend dan `PBKDF2-HMAC-SHA256` (120.000 iterasi) di klien, serta menghapus dukungan perbandingan teks biasa (plaintext) atau hash lemah lama.
   - Menambahkan alur **Pengaturan Awal Super Admin Pertama Kali** (`POST /api/auth/bootstrap-admin`) khusus akun resmi `it@hotelciputra.com` yang terkunci otomatis setelah satu kali inisialisasi (atau lewat variabel lingkungan `ADMIN_BOOTSTRAP_PASSWORD`).
   - Mengamankan rute `/api/auth/session`, `/api/ai/draft-announcement`, dan `/api/ai/performance-feedback` dengan verifikasi token sesi bertanda tangan HMAC-SHA256 (`Authorization: Bearer ...`) yang hanya disimpan di memori sesi, tanpa membuka rute `/api/*` ke publik secara bebas.
   - Menerapkan verifikasi kriptografis token ID Firebase Auth menggunakan JWK resmi Google (`RS256`) untuk login Google SSO dan memblokir login otomatis anonim.
   - Mengunci pendaftaran mandiri (`POST /api/auth/register`) dan registrasi klien agar selalu menetapkan peran `staff` dan status `Pending`, mengabaikan klaim peran administratif yang disisipkan dari browser.
   - Menambahkan pembatasan laju permintaan (rate limiter per alamat IP soket asli) untuk mencegah tebakan kata sandi berulang dan penyalahgunaan endpoint AI.

2. **Validasi Berkas Unggahan, Tautan Media, Pratinjau PDF, dan Ekspor CSV**
   - Memblokir pengunggahan berkas SVG (`image/svg+xml`) di seluruh modul branding, CMS beranda, pengumuman, dokumen, serta pratinjau dokumen.
   - Mengaktifkan pemindaian tanda biner asli berkas (magic bytes) secara fail-closed agar berkas biner berbahaya yang disamarkan sebagai PDF atau gambar langsung ditolak di formulir karir publik maupun arsip dokumen.
   - Menyaring seluruh tautan gambar, ikon media sosial, favicon, dan tautan unduhan melalui pemeriksaan protokol aman (`sanitizeSafeUrl`) agar skema `javascript:` maupun `data:text/html` tidak pernah dirender atau dieksekusi, serta memastikan atribut `src` gambar tidak pernah bernilai string kosong.
   - Mengubah pratinjau dokumen PDF di `DocumentPreviewModal` dan `CareerCmsAdminView` agar menggunakan `blob:` URL sementara yang dibersihkan otomatis setelah modal ditutup.
   - Mengamankan seluruh ekspor CSV laporan kuota dan log audit dengan `escapeCsvCell` agar sel berawalan karakter formula (`=`, `+`, `-`, `@`) tidak dieksekusi oleh aplikasi spreadsheet.
   - Mengganti seluruh dialog `window.alert` / `window.confirm` dengan komponen dialog dan notifikasi internal aplikasi serta mengganti generator ID `Math.random()` dengan `crypto.randomUUID()`.

3. **Keamanan Data Publik & Aturan Keamanan Cloud Firestore**
   - Membatasi pendengar (`onSnapshot`) saat pengunjung belum login agar hanya mengambil pengumuman berstatus publik (`where('isPublic', '==', true)`), data lowongan karir, dan daftar unit/departemen.
   - Memperbaiki alur lamaran karir (`submitCareerApplication`) agar hanya menulis satu dokumen lamaran baru tanpa membaca atau menimpa data pelamar lain.
   - Memperbarui `firebase-blueprint.json`, menyusun `security_spec.md` beserta penguji aturan `firestore.rules.test.ts`, dan mengetatkan `firestore.rules` dengan prinsip tolak bawaan (*default-deny*), isolasi data pribadi karyawan dan pelamar, validasi ketat skema (`hasAll` + `hasOnly` + batas ukuran), kunci status akhir evaluasi kinerja (`Approved`), serta verifikasi `request.auth.token.email_verified == true`.
   - Aturan `firestore.rules` telah diperiksa menggunakan `@firebase/eslint-plugin-security-rules` (0 error, 0 warning) dan dideploy ke proyek Firebase aktif (`hr-intranet-31ff4`).

4. **Catatan Dependensi**
   - Audit dependensi (`bun audit`) masih mendeteksi 6 temuan pada paket turunan (`@grpc/grpc-js` dan `re2js` dari SDK `firebase`, `body-parser` & `qs` dari `express`, serta `source-map-js` dari `postcss`). Pembaruan rutin versi minor/patch `express` dan `firebase` disarankan pada siklus pemeliharaan berikutnya.

---

## PoC Verification

Seluruh uji verifikasi langsung terhadap rute server Express, fungsi kriptografi, validasi berkas, penyaringan tautan/CSV, serta skenario aturan Firestore berhasil dijalankan dan lulus:

- **Perlindungan Rute API Tanpa Token**: Permintaan tanpa token ke `GET /api/auth/session` dan `POST /api/ai/draft-announcement` ditolak dengan HTTP `401`, dilengkapi header keamanan `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, dan tanpa header `X-Powered-By`.
- **Pencegahan Eskalasi Peran Saat Registrasi**: Pengiriman `{ role: "admin", status: "Approved" }` ke `POST /api/auth/register` mengembalikan HTTP `201` dengan peran tetap dikunci ke `"staff"` dan status `"Pending"`, tanpa menyertakan hash kata sandi di respons.
- **Kunci Inisialisasi Super Admin Sekali Pakai**: `POST /api/auth/bootstrap-admin` menolak email non-admin (`403`), menerima setup pertama akun `it@hotelciputra.com` (`201` dengan token sesi valid untuk `/api/auth/session` & `/api/ai/draft-announcement`), dan menolak percobaan ulang berikutnya (`403`).
- **Pembatasan Percobaan Login Berulang**: Pengiriman kata sandi salah berulang kali ke `POST /api/auth/login` memicu blokir HTTP `429` secara otomatis.
- **Pemeriksaan Kriptografi, Berkas, Tautan, dan CSV**: `hashPassword` & `verifyPassword` lulus uji `PBKDF2:120000:...` dan menolak hash lemah lama; `validateAndScanFileUpload` menolak berkas berheader `MZ` yang disamarkan sebagai `.pdf` maupun berkas `image/svg+xml`; `sanitizeSafeUrl` menolak `javascript:` / `data:text/html` / `data:image/svg+xml`; `escapeCsvCell` menetralkan sel `=CMD(...)` dan `+1+1`.
- **Uji Aturan Keamanan Cloud Firestore**: `npx eslint -f json firestore.rules` menghasilkan `0` error dan `0` warning; 12 skenario uji pelanggaran aturan pada `firestore.rules.test.ts` seluruhnya ditolak sesuai rancangan, dan aturan final berhasil dideploy melalui layanan Firebase project (`hr-intranet-31ff4`).
