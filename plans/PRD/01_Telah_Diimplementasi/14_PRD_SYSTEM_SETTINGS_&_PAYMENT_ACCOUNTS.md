# 📄 PRD 14: MASTER CONFIGURATION & PAYMENT ACCOUNTS ENGINE
## Dignity Event Operations Command Center

---

## 1. Ringkasan Eksekutif & Objektif Produk

### 1.1 Latar Belakang
Pada arsitektur sistem modern, parameter operasional penting—seperti nomor rekening bank penerima transfer, tarif tiket, biaya honor narasumber, nomor kontak hotline WhatsApp, dan kredensial API pihak ketiga—tidak boleh di-hardcode ke dalam kode sumber aplikasi (*zero hardcoding rule*).

Komponen [`ConfigModal.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/components/ConfigModal.jsx) dan modul layanan [`paymentAccountService.js`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/services/paymentAccountService.js) bertindak sebagai pusat kendali master (*Master Control Plane*) bagi Super Admin untuk mengatur seluruh parameter dinamis aplikasi secara visual dan aman.

### 1.2 Tujuan Produk (Product Goals)
1. **Pusat Rekening Bank Dinamis (Multi-Payment Accounts):** Memungkinkan Super Admin menambah, mengedit, menonaktifkan, dan mengurutkan rekening bank tujuan pembayaran (BCA, Mandiri, BRI, QRIS) yang ditampilkan secara real-time pada formulir checkout publik [`/daftar`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/04_PRD_PUBLIC_REGISTRATION_&_INTAKE_ENGINE.md).
2. **Kredensial Google Workspace Terpadu:** Mengelola integrasi Google Client ID, Client Secret, Spreadsheet ID, dan ID Folder Google Drive tanpa perlu melakukan deploy ulang kode.
3. **Gateway Komunikasi WhatsApp & CS Hotline:** Mengatur nomor WhatsApp resmi admin (`6289681077483`) dan API Key gateway pihak ketiga.
4. **Parameter Sensitivitas Finansial P&L:** Mengatur honor narasumber (*Mbak Diyah Rp 2,5jt* vs *Willy Tan Rp 3,5jt*) dan tarif dasar tiket sebagai acuan kalkulator laba bersih real-time.

---

## 2. Arsitektur Data Master Configuration

```text
┌────────────────────────────────────────────────────────────┐
│                    TABEL: system_settings                  │
│ • key (VARCHAR, PK)        • value (JSONB / TEXT)          │
│ • category (VARCHAR)       • updated_by (UUID)             │
├────────────────────────────────────────────────────────────┤
│                    TABEL: payment_accounts                 │
│ • id (UUID, PK)            • bank_name (BCA / Mandiri /..) │
│ • account_number (VARCHAR) • account_holder (VARCHAR)      │
│ • qris_image_url (TEXT)    • is_active (BOOLEAN)           │
│ • display_order (INT)      • instructions (TEXT)           │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Fitur Utama & Ruang Lingkup Sistem

### 3.1 Manajemen Rekening Penerima Transfer (`payment_accounts`)
Setiap baris rekening bank menampung atribut berikut:
- **`bank_code` / `bank_name`**: Kode identitas perbankan (e.g., `'BCA'`, `'MANDIRI'`, `'BRI'`, `'QRIS'`).
- **`account_number`**: Nomor rekening tujuan atau link statis/dinamis QRIS.
- **`account_holder`**: Nama resmi pemilik rekening (e.g., *"LPK INDONESIA DIGNITI"* atau *"YAYASAN KLTC"*).
- **`qris_image_url`**: Tautan gambar QRIS resmi (tersimpan di Supabase Storage bucket `event-assets`).
- **`is_active`**: Toggle saklar aktif/nonaktif. Rekening nonaktif tidak akan muncul di form pendaftaran publik namun tetap tersimpan untuk audit mutasi lama.
- **`display_order`**: Urutan prioritas penayangan di kartu pembayaran checkout peserta.

### 3.2 Pengaturan Ekosistem Google Cloud & Workspace
- **Google Client ID & Client Secret:** Mengizinkan browser admin meminta token OAuth 2.0 secara aman (*Client-Side Token Exchange*) dengan scope:
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.file`
- **Google Drive Root Folder ID:** Folder penampung arsip backup data peserta, struk bukti bayar, dan berkas PDF E-Sertifikat yang diterbitkan.
- **Google Apps Script Web App URL:** Endpoint webhook alternatif untuk otomatisasi tanpa kuota berbayar.

### 3.3 Konfigurasi Hotline WhatsApp Admin
- **Hotline CS Solo:** Standarisasi nomor telepon WhatsApp admin resmi (`+62 896-8107-7483`).
- **Template Generator Prefilled Link:** Menghasilkan tautan otomatis dengan format:
  ```text
  https://wa.me/6289681077483?text=Halo%20Admin%20Dignity,%20saya%20ingin%20konfirmasi%20tiket%20...
  ```

### 3.4 Automasi Saklar Operasional (Automation Feature Flags)
- **`auto_ticket_emission` (BOOLEAN):** Jika diaktifkan, saat status pembayaran diverifikasi oleh tim Finance, sistem secara otomatis menerbitkan sub-tiket dan mengirimkan email konfirmasi tanpa perlu menekan tombol kirim manual.
- **`auto_rebate_emission` (BOOLEAN):** Jika diaktifkan, saat presensi sesi 2 terverifikasi dan sertifikat dibuat, sistem otomatis menerbitkan voucher rebate Rp 100.000 ke akun alumni.

---

## 4. Keamanan & Kebijakan Hak Akses

1. **Akses Pengeditan Terbatas (Restricted Mutation):** Hanya staf dengan peran `OWNER` / `SUPER ADMIN` yang diizinkan mengubah nilai pada tabel `system_settings` dan `payment_accounts`.
2. **Penyamaran Nilai Sensitif (Masking):** Token API eksternal dan *Google Client Secret* ditampilkan dalam bentuk tersamarkan (*asterisks*) pada UI, dan hanya dapat diubah melalui verifikasi sesi aktif.
3. **Pencatatan Log Audit:** Setiap perubahan konfigurasi dicatat otomatis ke tabel `audit_logs` dengan menyimpan nilai lama (*old_value*) dan nilai baru (*new_value*).
