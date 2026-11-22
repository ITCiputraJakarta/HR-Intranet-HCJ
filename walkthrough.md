# Security Summary

Audit dan perbaikan menyeluruh telah diselesaikan di sisi frontend, backend Express API, penyimpanan lokal, serta konfigurasi & aturan keamanan Cloud Firestore untuk **Portal Intranet & Arsip Digital Hotel Ciputra Jakarta**:

1. **Autentikasi, Sesi Cookie HttpOnly, dan Pencegahan Manipulasi Sesi Lokal**
   - Menghapus seluruh kredensial bawaan/hardcoded dari kode sumber klien (`src/data/initialData.ts`) maupun server (`api/_lib/createApiApp.ts`).
   - Memperkuat hashing kata sandi menggunakan `crypto.scrypt` dengan salt acak per pengguna di backend dan `PBKDF2-HMAC-SHA256` (120.000 iterasi) di klien, serta menghapus perbandingan teks biasa.
   - Menambahkan alur **Pengaturan Awal Super Admin Pertama Kali** (`POST /api/auth/bootstrap-admin`) khusus akun resmi `it@hotelciputra.com` yang terkunci otomatis setelah satu kali inisialisasi (atau lewat variabel lingkungan `ADMIN_BOOTSTRAP_PASSWORD`).
   - Mengamankan rute `/api/auth/session`, `/api/ai/draft-announcement`, dan `/api/ai/performance-feedback` dengan verifikasi token sesi bertanda tangan HMAC-SHA256 melalui header `Authorization: Bearer ...` maupun cookie `HttpOnly` (`hcj_session`) agar verifikasi muat ulang halaman tetap berjalan tanpa membuka celah pengubahan peran di browser.
   - Menegakkan prinsip **gagal tertutup (*fail-closed*)** pada pemulihan sesi (`src/App.tsx`): apabila sesi server dan Google SSO tidak terverifikasi, cache sesi dibersihkan dan pengguna diarahkan kembali ke halaman publik/login alih-alih mempercayai data `localStorage`.
   - Menghapus jejak cache PII karyawan, log akses, dokumen, kinerja, notifikasi, serta daftar pelamar karir di `localStorage` dan `sessionStorage` saat logout atau batas idle tercapai (`clearAllSessionCache`), serta menghentikan penyimpanan daftar lamaran karir publik di `localStorage`.
   - Menambahkan pembatasan laju permintaan per alamat IP soket asli untuk mencegah tebakan kata sandi berulang dan penyalahgunaan endpoint AI.

2. **Pembatasan Akses Berbasis Peran, Validasi Media/Berkas, dan Perbaikan Bug Fungsional**
   - Mengunci tab `quota-analytics`, `home-cms`, `career-cms`, dan modal sinkronisasi/branding agar hanya dapat dibuka oleh Super Admin terverifikasi (`isSuperAdmin`), termasuk menghentikan eksekusi sinkronisasi telemetri otomatis bagi pengguna non-admin.
   - Membatasi pendengar Firestore (`subscribeToUsers`, `subscribeToAccessLogs`, `subscribeToPerformances`) agar pengguna non-admin otomatis melakukan query terfilter ke email miliknya sendiri, serta membatasi tugas pembersihan otomatis pengumuman/log kedaluwarsa (`pruneExpiredAnnouncements`, `pruneExpiredAccessLogs`) khusus untuk Super Admin agar karyawan biasa tidak memicu error izin akses.
   - Memperbaiki pelanggaran urutan Hook React dan penggunaan prop lama pada `DocumentPreviewModal`, menyelaraskan bobot evaluasi kinerja dinamis sesuai jabatan (Staff/SPV 50/45/5, Manager 60/35/5, HOD 70/25/5) pada form dan cetakan PDF, serta menambahkan pilihan Unit Hotel pada modal tambah/ubah pengguna.
   - Mengganti seluruh generator ID klien berbasis `Date.now()` dan `Math.random()` menjadi `crypto.randomUUID()`, memblokir berkas SVG/berkas palsu lewat pemeriksaan *magic bytes*, serta menyaring tautan gambar/media di klien maupun `firestore.rules` (`isSafeMediaString`).

3. **Keamanan Data Publik & Aturan Keamanan Cloud Firestore**
   - Membatasi pendengar saat pengunjung belum login agar hanya mengambil pengumuman berstatus publik (`where('isPublic', '==', true)`), data lowongan karir, dan daftar unit/departemen.
   - Mengetatkan `firestore.rules` dengan prinsip tolak bawaan (*default-deny*), isolasi data pribadi karyawan dan pelamar, validasi ketat skema (`hasAll` + `hasOnly` + batas ukuran), penolakan tautan skrip berbahaya di kolom gambar/berkas/potongan berkas, kunci status akhir evaluasi kinerja (`Approved`), serta verifikasi `request.auth.token.email_verified == true`.
   - Aturan `firestore.rules` telah diperiksa menggunakan `@firebase/eslint-plugin-security-rules` (`0` error, `0` warning) dan dideploy ke proyek Firebase aktif (`hr-intranet-31ff4`).

4. **Catatan Dependensi & Keterbatasan Arsitektur**
   - Audit dependensi (`bun audit`) masih mendeteksi 6 temuan pada paket turunan (`@grpc/grpc-js` dan `re2js` dari SDK `firebase`, `body-parser` & `qs` dari `express`, serta `source-map-js` dari `postcss`). Pembaruan rutin versi minor/patch `express` dan `firebase` disarankan pada siklus pemeliharaan berikutnya.
   - Akun server berbasis email/kata sandi yang disimpan di memori server Node (`usersByEmail`) serta rahasia penandatangan fallback akan tereset saat server di-restart apabila `SESSION_SECRET` tidak diisi di variabel lingkungan, dan login email/kata sandi non-Google tidak membuat sesi Firebase Auth klien sehingga akses baca/tulis Firestore langsung tetap mensyaratkan login Google SSO (`email_verified == true`).

---

## PoC Verification

Seluruh uji verifikasi langsung terhadap rute server Express, aturan keamanan Firestore, dan logika aplikasi berhasil dijalankan dan lulus:

- **Perlindungan Rute API & Cookie Sesi**: Permintaan tanpa otentikasi ke `GET /api/auth/session` dan `POST /api/ai/draft-announcement` ditolak dengan HTTP `401`, dilengkapi header keamanan `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, dan tanpa header `X-Powered-By`. Login/bootstrap menghasilkan cookie `HttpOnly` (`hcj_session`) yang terverifikasi pada `GET /api/auth/session`, dan `POST /api/auth/logout` kedaluwarsa-kan cookie (`Max-Age=0`).
- **Pencegahan Eskalasi Peran Saat Registrasi**: Pengiriman `{ role: "admin", status: "Approved" }` ke `POST /api/auth/register` mengembalikan HTTP `201` dengan peran tetap dikunci ke `"staff"` dan status `"Pending"`, tanpa menyertakan hash kata sandi di respons.
- **Kunci Inisialisasi Super Admin Sekali Pakai & Pembatasan Percobaan**: `POST /api/auth/bootstrap-admin` menolak email non-admin (`403`), menerima setup pertama akun `it@hotelciputra.com` (`201`), menolak percobaan ulang berikutnya (`403`), dan `POST /api/auth/login` memicu blokir HTTP `429` saat percobaan sandi salah berulang kali.
- **Uji Aturan Keamanan Cloud Firestore**: `npx eslint -f json firestore.rules` menghasilkan `0` error dan `0` warning; 13 skenario uji pelanggaran aturan pada `firestore.rules.test.ts` (termasuk penolakan tautan skrip berbahaya pada dokumen) seluruhnya ditolak sesuai rancangan, dan aturan final berhasil dideploy melalui layanan Firebase project (`hr-intranet-31ff4`).
