# 📄 PRD 13: GOOGLE WORKSPACE TWO-WAY SYNC & EXTERNAL SOURCES ENGINE
## Dignity Event Operations Command Center

---

## 1. Ringkasan Eksekutif & Objektif Produk

### 1.1 Latar Belakang
Meskipun sistem Command Center memiliki portal registrasi publik berbasis web murni ([`PRD 04`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/04_PRD_PUBLIC_REGISTRATION_&_INTAKE_ENGINE.md)), sebagian besar alur operasional awal dan pendaftaran legacy masih mengandalkan Google Forms dan Google Sheets tim panitia.

Agar tim admin tidak perlu melakukan *copy-paste* data secara manual yang rentan terhadap galat manusia (*human error*), dibangun **Mesin Sinkronisasi Dua Arah (Two-Way Sync Engine)** yang menjembatani Google Sheets dengan database Supabase PostgreSQL secara real-time dan andal.

### 1.2 Tujuan Produk (Product Goals)
1. **Sinkronisasi Otomatis & Sesuai Permintaan (On-Demand):** Menarik respons pendaftaran dan presensi terbaru dari Google Sheets ke Supabase dengan satu klik tombol `🔄 Tarik Data Sheets (Live)`.
2. **Umpan Balik Status ke Google Sheets (Write-Back):** Setiap kali admin memverifikasi status pembayaran atau menerbitkan sertifikat di dashboard web, status tersebut (`LUNAS`, `TICKET-XXXX`, `CERT-XXXX`, `✓ TERKIRIM`) otomatis ditulis kembali ke sheet terkait.
3. **Fleksibilitas Pemetaan Kolom (Dynamic Header Mapping):** Mampu membaca variasi penamaan kolom pada Google Sheets tanpa mengubah struktur kode sumber frontend.
4. **Audit Forensik Sinkronisasi:** Menyimpan log riwayat eksekusi sinkronisasi (jumlah data baru, data terperbarui, data gagal, dan catatan kesalahan) pada tabel `sync_jobs` dan `sync_logs`.

---

## 2. Arsitektur Komponen & Alur Integrasi

```text
┌─────────────────────────┐              ┌─────────────────────────┐
│ Google Forms (Peserta)  │              │ Google Sheets Master    │
│ • Form Registrasi       │ ───────────> │ • DB_Registrasi_Webinar │
│ • Form Presensi Zoom    │              │ • DB_Presensi_Sertifikat│
└─────────────────────────┘              └───────────┬─────────────┘
                                                     │
                                   OAuth 2.0 / Apps Script Webhook
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DIGNITY SYNC & ORCHESTRATION LAYER                  │
│                                                                        │
│  [sheetsService.js] ────────> [syncService.js] ───────> [Supabase SSOT]│
│  • Token Bearer Fetch        • Normalisasi Data        • persons       │
│  • Batch Read/Write Range    • Deduplikasi Email       • registrations │
│  • Rate Limiting & Retry     • Conflict Resolver       • payments      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                Write-Back
                                     │
                                     ▼
                     Update Status: 'LUNAS' & 'TERKIRIM'
```

---

## 3. Spesifikasi Skema Database Terkait

Mesin sinkronisasi ditopang oleh 3 tabel inti pada Supabase (migrasi `003_phase7_external_sources_enhanced.sql`):

### 3.1 Tabel `external_sources`
Menyimpan konfigurasi binding spreadsheet untuk setiap acara:
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key ke `events.id`)
- `source_type` (Enum: `'GOOGLE_SHEETS'`, `'TYPEFORM'`, `'CSV_IMPORT'`)
- `label` (VARCHAR: e.g. "Google Sheet Registrasi Batch 1")
- `external_sheet_id` (VARCHAR: ID spreadsheet Google)
- `sheet_tab_name` (VARCHAR: e.g. "DB_Registrasi_Webinar")
- `column_mappings` (JSONB: pemetaan header kolom Google Sheet ke properti Supabase)
- `sync_interval_minutes` (INTEGER: interval sinkronisasi latar belakang, default `0` = on-demand)
- `is_active` (BOOLEAN, default `true`)

### 3.2 Tabel `sync_jobs` & `sync_logs`
- `sync_jobs`: Mencatat sesi eksekusi sinkronisasi (`status`: `RUNNING`, `COMPLETED`, `FAILED`; `records_pulled`, `records_pushed`, `duration_ms`).
- `sync_logs`: Mencatat pesan diagnostik per baris data jika terjadi kesalahan parsing (misal format nomor telepon salah atau URL bukti bayar rusak).

---

## 4. Format Pemetaan Kolom (Column Mapping Rules)

Konfigurasi JSONB `column_mappings` fleksibel menangani berbagai format judul kolom Google Forms bahasa Indonesia:

```json
{
  "timestamp": ["Timestamp", "Waktu Pendaftaran", "Tanggal"],
  "full_name": ["Nama Lengkap", "Nama Lengkap Peserta (Beserta Gelar)", "Nama"],
  "email": ["Email", "Alamat Email", "Email Aktif"],
  "phone": ["Nomor WhatsApp", "No WA", "WhatsApp"],
  "institution": ["Instansi", "Asal Instansi / Universitas / Perusahaan", "Institusi"],
  "package_type": ["Pilihan Paket", "Jenis Tiket", "Paket Pendaftaran"],
  "payment_proof_url": ["Bukti Transfer", "Upload Bukti Pembayaran", "Struk"],
  "payment_status": ["Status Pembayaran", "Status Bayar", "Status"],
  "ticket_code": ["Nomor Tiket", "Kode Tiket", "Ticket No"],
  "certificate_number": ["Nomor Sertifikat", "No Sertifikat Resmi"]
}
```

---

## 5. Logika Rekonsiliasi & Resolusi Konflik (Conflict Resolution)

1. **Aturan Deduplikasi:** Peserta diidentifikasi secara unik berdasarkan kombinasi `(email, event_id)` atau `(phone_number, event_id)`.
2. **Prioritas Kebenaran Data (Strict Forward-Only):**
   - Jika status di Supabase sudah `CONFIRMED` atau `VERIFIED`, data di Supabase **TIDAK BOLEH** ditimpa menjadi `PENDING` meskipun Google Sheet bernilai kosong.
   - Status di Google Sheet yang berubah menjadi `LUNAS` akan otomatis memicu transisi status di Supabase ke `CONFIRMED` dan menginisiasi penerbitan tiket.
3. **Penyimpanan URL Bukti Bayar Google Drive:**
   - Link upload file Google Drive dari formulir Google (`https://drive.google.com/open?id=...`) otomatis dinormalisasi oleh `formatters.js` menjadi tautan pratinjau langsung yang dapat dibuka oleh operator.

---

## 6. Integrasi Google Apps Script (`google_apps_script_backend.js`)

Sebagai jalur alternatif berbiaya nol (*serverless*), sistem mendukung integrasi webhook via Google Apps Script Web App:
- **`doGet(e)`**: Mengembalikan seluruh data respons dalam format JSON terkompresi.
- **`doPost(e)`**: Menerima perintah penulisan status kembali (*write-back*) dari browser admin untuk menandai baris yang telah diverifikasi dan mencatat nomor sertifikat/tiket tanpa membutuhkan izin Google Cloud Console tingkat tinggi bagi pengguna awam.
