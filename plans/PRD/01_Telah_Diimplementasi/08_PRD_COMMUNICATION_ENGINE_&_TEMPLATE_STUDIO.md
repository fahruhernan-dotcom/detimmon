# 📢 PRD 08: COMMUNICATION ENGINE & TEMPLATE STUDIO
## Mesin Komunikasi Terpadu, Studio Template & Alur Anti-Blind Blast

---

## 1. 🎨 Template Studio Dual-Panel (`TemplateStudioView.jsx`)

Template Studio memungkinkan admin dan tim kreatif membuat, menguji, dan memelihara template email resmi serta naskah WhatsApp tanpa harus menyentuh baris kode aplikasi:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TEMPLATE STUDIO — Official E-Ticket Delivery (Email v2)                    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ PANEL KIRI: EDITOR STRUKTUR & TOKENS │ PANEL KANAN: LIVE PREVIEW REAL-TIME  │
│                                      │                                      │
│ - Tipe: E-Ticket                     │ ┌──────────────────────────────────┐ │
│ - Kanal: EMAIL (HTML)                │ │ LPK INDONESIA DIGNITY            │ │
│ - Subject Line:                      │ │ E-TICKET RESMI PELATIHAN         │ │
│   [ 🎫 Tiket Anda: {{event_title}} ] │ │                                  │ │
│ - Content Blocks & Tokens:           │ │ Halo Bpk/Ibu {{buyer_name}},     │ │
│   {{participant_name}}               │ │ Tiket resmi Anda:                │ │
│   {{ticket_code}}                    │ │ ┌──────────────────────────────┐ │ │
│   {{event_date}}                     │ │ │ No. Tiket: TKT-202611-0012   │ │ │
│   {{venue_name}} / {{zoom_link}}     │ │ │ [KODE QR TIKET]              │ │ │
│   {{qr_code_url}}                    │ │ └──────────────────────────────┘ │ │
│                                      │ └──────────────────────────────────┘ │
│ [💾 Simpan Draft] [🚀 Aktifkan v2]   │ [📱 Kirim Email Uji Coba ke Saya]    │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 1.1 Daftar Variabel Token Dinamis yang Didukung:
* `{{buyer_name}}`: Nama pemesan pendaftaran.
* `{{participant_name}}`: Nama peserta individual (mendukung gelar).
* `{{ticket_code}}`: Nomor tiket unik (`TKT-XXXXXX`).
* `{{event_title}}`: Judul lengkap event aktif.
* `{{event_date}}` & `{{event_time}}`: Tanggal dan jam pelaksanaan.
* `{{venue_name}}`: Lokasi Ballroom Sala View Hotel Surakarta atau link Zoom Meeting.
* `{{qr_code_url}}`: URL render gambar QR code tiket.
* `{{voucher_code}}`: Kode kupon rebate Rp 100.000 untuk konversi.
* `{{certificate_number}}`: Nomor seri sertifikat resmi.

---

## 2. 🛡️ Alur Anti-Blind Blast 9-Tahap (`CommunicationCenter.jsx`)

Untuk mencegah insiden fatal seperti tiket terkirim ke pendaftar yang belum lunas atau email terkirim ganda (*spamming*), sistem mewajibkan alur 9-tahap yang terkunci:

```text
1. Filter Audience ──> 2. Pilih Template ──> 3. Pratinjau Desain
          │
          ▼
4. Review Daftar Penerima (Kecualikan yang Sudah Pernah Terkirim)
          │
          ▼
5. Persetujuan Staf (Approval Modal) ──> 6. Antrean Pengiriman (Queue)
          │
          ▼
7. Eksekusi via Gmail API ──> 8. Pelacakan Status ──> 9. Opsi Retry Gagal
```

### 2.1 Segmentasi Target Audience yang Aman:
* **`VERIFIED_PAID_ONLY`:** Hanya mengirimkan ke pendaftar berstatus lunas (mencegah tiket terkirim ke pendaftar bodong).
* **`PENDING_PAYMENT_ONLY`:** Khusus untuk broadcast pengingat batas transfer.
* **`ATTENDED_ONLY`:** Khusus untuk pengiriman E-Sertifikat dan voucher rebate alumni.
* **`EXCLUDE_ALREADY_SENT`:** Sistem otomatis memeriksa kolom `communication_recipients.status`. Jika sudah berstatus `SENT`, kontak tersebut dieksklusikan dari antrean pengiriman ulang.

---

## 3. 🚀 Mesin Pengiriman (Dispatch Engine)

1. **Gmail API v1 (Google OAuth 2.0):**
   * Menggunakan token resmi Google staf pengirim (`googleApiService.js`).
   * Dilengkapi *rate limiter* dan jeda waktu antar-email (100–300 ms) untuk mematuhi batas kuota Google Workspace harian tanpa diblokir.
2. **WhatsApp Direct Pre-Filled Engine:**
   * Menghasilkan link tautan `https://wa.me/628...?text=...` dengan teks yang terformat rapi (teks tebal `*...*`, enter `%0A`) yang siap dikirim staf CS dalam 1 klik.
