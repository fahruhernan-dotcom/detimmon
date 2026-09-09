# 🏗️ PRD 01: CORE ARCHITECTURE & DATA MODEL
## Sistem Basis Data Supabase PostgreSQL & Fondasi Arsitektur

---

## 1. 🏛️ Arsitektur Sistem Menyeluruh (System Architecture)

Sistem Dignity Command Center menggunakan arsitektur **Modern Decoupled Event Stack**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (FRONTEND)                         │
│  - React 18 SPA (Vite, Port 8080)                                           │
│  - White Luxury Minimal Theme (Tailwind CSS, Lucide Icons, shadcn Primitives│
│  - Public Registration Wizard (/register/:slug)                             │
│  - Public Attendance Form (/attendance/:event_id)                           │
│  - Public Certificate Verification (/verify/:cert_number)                   │
│  - Admin Command Center (/admin)                                            │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │ HTTPS API Calls               │ OAuth 2.0 Auth
                       ▼                               ▼
┌─────────────────────────────────────────┐  ┌────────────────────────────────┐
│      SUPABASE POSTGRESQL (SINGLE TRUTH) │  │     GOOGLE WORKSPACE CLOUD     │
│  - 26 Normalized Relational Tables      │  │  - Gmail API v1 (Blast Ticket) │
│  - Row Level Security (RLS) Policies    │  │  - Google Drive API v3 (Backup)│
│  - PL/pgSQL Stored Procedures (RPCs)    │  │  - Google Sheets API v4 (Sync) │
│  - Real-time Subscriptions              │  │  - Google Apps Script (Bridge) │
│  - Supabase Storage (Payment Proofs)    │  │                                │
└─────────────────────────────────────────┘  └────────────────────────────────┘
```

---

## 2. 📊 Skema Entitas Relasional (26 Tabel Database)

Seluruh struktur tabel telah didefinisikan melalui 9 file migrasi (`supabase/migrations/001` s/d `009`):

### 2.1 Identitas, Autentikasi & Hak Akses
1. **`profiles`:** Data profil pengguna, avatar, dan Google Account ID.
2. **`roles`:** Master peran pengguna (`owner`, `admin`, `finance`, `coordinator`, `field_officer`, `auditor`).
3. **`user_roles`:** Relasi mapping many-to-many pengguna dengan perannya.
4. **`persons`:** Data induk individual (nama, email, nomor WhatsApp, institusi/perusahaan, kota).
5. **`speakers`:** Profil pembicara/trainer resmi (Dr. Puguh Dwi Kuncoro, Mbak Halimatus Sa'diyah, Willy Tan).

### 2.2 Tata Kelola Event & Konfigurasi
6. **`events`:** Tabel induk acara.
   * *Kolom Kunci:* `id`, `parent_event_id`, `slug`, `title`, `event_type` (`WEBINAR`/`BOOTCAMP`), `start_date`, `end_date`, `location`, `web_registration_config` (JSONB: jam, rekening, kuota, `is_open`), `drive_workspace_url`.
7. **`event_speakers`:** Relasi penugasan pembicara ke event spesifik.
8. **`system_settings`:** Konfigurasi global sistem (default timeout, rate limit, URL publik).

### 2.3 Registrasi & Klastering Tiket
9. **`registrations`:** Header transaksi registrasi pendaftar.
   * *Kolom Kunci:* `id`, `event_id`, `buyer_person_id`, `package_type` (`INDIVIDUAL`/`MABAR_6_PAX`/`CUSTOM`), `total_pax`, `nominal_agreed`, `payment_status` (`PENDING`/`VERIFIED`/`REJECTED`/`REFUNDED`), `unique_code`.
10. **`registration_members`:** Rincian individual peserta di dalam satu registrasi (khusus paket Mabar: pemesan utama + 5 nama anggota pendamping).
11. **`tickets`:** Master tiket resmi terbit.
    * *Kolom Kunci:* `id`, `registration_id`, `member_id`, `ticket_code` (`TKT-XXXXXX` atau `TKT-XXXXXX-A`), `qr_payload`, `status` (`ISSUED`/`USED`/`CANCELLED`).

### 2.4 Buku Besar Keuangan & Mutasi
12. **`payments`:** Bukti transfer pembayaran dari pendaftar.
    * *Kolom Kunci:* `id`, `registration_id`, `nominal`, `bank_sender`, `bank_destination`, `transfer_proof_url`, `verified_by_user_id`, `verified_at`, `rejection_reason`.
13. **`payment_adjustments`:** Penyesuaian ledger (diskon, kode unik, kompensasi).

### 2.5 Presensi Lapangan Dual-Checkpoint
14. **`attendances`:** Catatan kehadiran lapangan.
    * *Kolom Kunci:* `id`, `event_id`, `ticket_id`, `person_id`, `checkpoint` (`CHECKPOINT_1_PAGI`/`CHECKPOINT_2_SIANG`), `scanned_by_user_id`, `scanned_at`, `notes`.

### 2.6 Sertifikat & Verifikasi Publik
15. **`certificates`:** E-Sertifikat resmi yang diterbitkan.
    * *Kolom Kunci:* `id`, `event_id`, `person_id`, `ticket_id`, `certificate_number` (`CERT/DIGNITY/2026/XXXX`), `pdf_drive_url`, `issued_at`, `verification_hash`.

### 2.7 Funnel Konversi & Voucher Rebate
16. **`vouchers`:** Master kupon potongan harga & rebate.
    * *Kolom Kunci:* `id`, `origin_event_id`, `code` (`REBATE100K-XXXX`), `discount_amount` (Rp 100.000), `is_redeemed`, `redeemed_at`, `redeemed_in_registration_id`, `expires_at`.
17. **`conversions`:** Log pelacak konversi alumni webinar yang mendaftar ke bootcamp offline.

### 2.8 Mesin Komunikasi & Template
18. **`message_templates`:** Master template pesan email dan WhatsApp dengan versioning.
19. **`communication_batches`:** Batch broadcast pengiriman email/WA massal.
20. **`communication_recipients`:** Daftar target penerima per batch beserta status pengiriman (`QUEUED`/`SENT`/`FAILED`).
21. **`email_jobs`** & **`email_logs`:** Queue worker log pengiriman email via Gmail API.

### 2.9 Integrasi Eksternal & Audit Trail
22. **`external_sources`:** Konfigurasi koneksi Google Sheets legacy per event.
23. **`sync_jobs`** & **`sync_logs`:** Log sinkronisasi dua arah database dengan spreadsheet.
24. **`audit_logs`:** Forensik lengkap pencatatan setiap aksi mutasi data oleh staf.

---

## 3. ⚙️ Stored Procedures & Logika RPC Penting

### 3.1 `submit_web_registration(...)`
* **Keamanan:** `SECURITY DEFINER` (dapat dijalankan oleh publik anonim).
* **Alur Eksekusi:**
  1. Memvalidasi `is_open === true` pada `events.web_registration_config`. Jika `false`, tolak transaksi dengan error `REGISTRATION_CLOSED`.
  2. Mencegah duplikasi: Memeriksa apakah nomor WhatsApp/email sudah memiliki tiket aktif.
  3. Menginsert record ke `persons` (atau mengambil person yang sudah ada).
  4. Membuat record `registrations` dengan status `PENDING`.
  5. Menginsert record ke `payments` beserta link file bukti transfer di Supabase Storage.
  6. Jika paket Mabar, menginsert data anggota pendamping ke `registration_members`.

### 3.2 `redeem_voucher(p_code, p_registration_id)`
* **Logika:** Mengunci voucher secara row-level lock (`FOR UPDATE`), memvalidasi tanggal kedaluwarsa, memastikan belum pernah di-redeem, memotong total tagihan registrasi, dan mencatat foreign key `redeemed_in_registration_id`.

### 3.3 `fast_verify_payment(p_payment_id, p_verified_by)`
* **Logika:** Mengubah status payment menjadi `VERIFIED`, mengupdate registration menjadi `VERIFIED`, secara otomatis men-generate record `tickets` dengan format penomoran sekuensial unik, dan menyiapkan payload QR code siap scan.

---

## 4. 🛡️ Kebijakan Keamanan & Row Level Security (RLS)

* **Public Access (Anonim):**
  * HANYA diizinkan memanggil RPC `submit_web_registration`, membaca event aktif dengan filter `is_open = true`, dan memverifikasi sertifikat via `validate_certificate`.
* **Staff Access (Authenticated):**
  * Divalidasi melalui token sesi staf dan tabel `user_roles`.
  * Finance hanya berhak mengakses modul `payments` dan `financial_adjustments`.
  * Field Officer hanya berhak menulis ke tabel `attendances`.
  * Owner memiliki akses unconstrained ke seluruh modul.
* **Strict Policy Anti-Mock:** Dilarang keras menaruh mock data di frontend. Komponen wajib membaca live query Supabase.
