# 📝 PRD 04: PUBLIC REGISTRATION & INTAKE ENGINE
## Mesin Registrasi Publik Wizard & Sinkronisasi Dua Arah

---

## 1. 🌐 Arsitektur Registrasi Jalur Ganda (Dual-Channel Intake)

Sistem pendaftaran dirancang dengan dua pintu masuk yang terintegrasi:

```text
┌────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     PINTU 1: PUBLIC WIZARD (UTAMA)     │  │   PINTU 2: GOOGLE SHEETS (LEGACY│
│  - URL: /register/:slug                │  │  - Google Form Pendaftaran      │
│  - Langsung hit Supabase via RPC       │  │  - Respons masuk ke Spreadsheet │
│  - Upload bukti bayar ke Storage       │  │  - Disinkronkan via GAS Backend │
└───────────────────┬────────────────────┘  └────────────────┬────────────────┘
                    │                                        │
                    ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE POSTGRESQL (SINGLE SOURCE OF TRUTH)             │
│  - Tabel: registrations, registration_members, payments, persons            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🚶 Alur 4-Langkah Public Registration Wizard (`PublicRegistrationWizard.jsx`)

Peserta yang membuka `/register/:slug` akan dipandu melalui 4 tahapan intuitif:

### Langkah 1: Pemilihan Paket Tiket (Package Selection)
* **Paket Individu:** Rp 100.000 (1 Pax).
* **Paket Promo Mabar 5+1 Free:** Rp 500.000 (6 Pax — Hemat Rp 100.000).
* **Penerapan Kupon / Voucher:** Kolom input voucher rebate (misal: alumni webinar memasukkan kode `REBATE100K-XXXX` saat mendaftar bootcamp, otomatis memotong tagihan Rp 100.000).

### Langkah 2: Pengisian Biodata Peserta & Anggota
* **Data Pemesan Utama:**
  * Nama Lengkap (beserta gelar jika ingin dicantumkan di sertifikat).
  * Nomor WhatsApp Aktif (diawali `08` atau `62` otomatis dinormalisasi).
  * Alamat Email Resmi (untuk pengiriman E-Ticket dan E-Sertifikat PDF).
  * Institusi / Perusahaan / Instansi & Kota Domisili.
* **Pengisian Anggota Tambahan (Khusus Paket Mabar):**
  * Wizard secara dinamis membuka 5 baris form tambahan untuk mendata Nama Lengkap & Nomor WhatsApp Anggota ke-2 sampai ke-6.

### Langkah 3: Instruksi Pembayaran & Kode Unik
* **Nominal Tagihan Cerdas:** Tagihan dasar + 3 digit kode unik acak (misal: Rp 100.854) untuk mempermudah pengecekan mutasi bank oleh finance.
* **Pilihan Rekening Resmi LPK Indonesia Dignity:**
  * BCA, Bank Mandiri, BRI, dan QRIS.
  * Dilengkapi tombol 1-klik "Salin Nomor Rekening".

### Langkah 4: Unggah Bukti Transfer & Konfirmasi
* Komponen drag-and-drop gambar bukti transfer (format JPG/PNG/WebP, maks 5 MB).
* Pratinjau gambar bukti bayar sebelum submit.
* Gambar diunggah langsung ke Supabase Storage bucket `payment-proofs`.
* Eksekusi Stored Procedure `submit_web_registration(...)`.

---

## 3. 🛑 Penegakan Status Pendaftaran (`is_open`)

1. **Frontend Guard:**  
   Jika `events.web_registration_config.is_open === false`, halaman pendaftaran otomatis menampilkan status banner: **"Pendaftaran Ditutup"**, mengunci input form, dan menyembunyikan tombol submit.
2. **Backend Database RPC Guard:**  
   Prosedur `submit_web_registration` di PostgreSQL wajib memeriksa `events.web_registration_config->>'is_open'`. Jika `false`, transaksi langsung di-rollback dan melempar error code `REGISTRATION_CLOSED`. Hal ini menjamin keamanan bahkan jika ada manipulasi DOM pada browser pengguna.

---

## 4. 🔄 Sinkronisasi Google Sheets Legacy (`SyncDashboard.jsx`)

Untuk mendukung operasional Google Forms konvensional:
* **Google Apps Script Bridge (`google_apps_script_backend.js`):** Script mandiri yang dipasang di Google Sheets registrasi untuk mengirim webhook ke Supabase setiap ada form baru.
* **Two-Way Pull & Push:** Staf dapat mengklik **"Sync Google Sheets"** di dashboard admin untuk menarik baris pendaftar baru dari spreadsheet atau memperbarui status verifikasi di spreadsheet secara real-time.
