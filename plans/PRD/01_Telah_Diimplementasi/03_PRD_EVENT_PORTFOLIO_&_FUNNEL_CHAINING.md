# 🎯 PRD 03: EVENT PORTFOLIO & FUNNEL CHAINING ENGINE
## Manajemen Multi-Event, Funnel Berjenjang & Automasi Google Drive Workspace

---

## 1. 📂 Arsitektur Portofolio Multi-Event (Multi-Event Portfolio)

Dignity Command Center dirancang untuk mendukung banyak event sekaligus (*multi-event scalable architecture*), baik event bertipe webinar online maupun bootcamp offline tatap muka.

### 1.1 Penyelaras Konteks Event Global (`EventContext.jsx`)
* Seluruh layar operasional (Registrants, Payments, Tickets, Attendance, Certificates, Blast) terikat ke **Event Konteks Aktif**.
* Admin dapat berpindah antar-event dengan mulus melalui **Event Selector** di top navigation bar tanpa mereload halaman.
* Data event tersimpan di tabel `events` dan di-cache dalam state context aplikasi:
  ```json
  {
    "id": "e1a2b3c4-...",
    "slug": "webinar-public-speaking-nov-2026",
    "title": "Webinar Pre-Event: Live Diagnostic Public Speaking Lab",
    "event_type": "WEBINAR",
    "start_date": "2026-11-14T08:00:00+07:00",
    "end_date": "2026-11-14T11:30:00+07:00",
    "parent_event_id": null,
    "drive_workspace_url": "https://drive.google.com/drive/folders/...",
    "web_registration_config": {
      "is_open": true,
      "quota": 100,
      "standard_price": 100000,
      "mabar_price": 500000,
      "mabar_pax": 6,
      "payment_accounts": [...]
    }
  }
  ```

---

## 2. 🔗 Mesin Funnel Chaining (Webinar-ke-Bootcamp Chaining)

Salah satu keunggulan strategis sistem ini adalah kemampuan merangkai dua event yang berbeda menjadi satu kesatuan corong penjualan (*funnel pipeline*) melalui `EventChainingModal.jsx`.

```text
┌──────────────────────────────────────┐
│       EVENT PRE-EVENT (PARENT)       │
│  Webinar Tripwire (14 Nov 2026)      │
│  Harga: Rp 100.000 / pax             │
└──────────────────┬───────────────────┘
                   │ Mengaitkan (Chaining) via parent_event_id
                   │ + Penerbitan Kupon Otomatis saat Presensi
                   ▼
┌──────────────────────────────────────┐
│        EVENT CORE OFFER (CHILD)      │
│  Bootcamp Sala View (12-13 Des 2026) │
│  Harga: Rp 2.500.000 (Early: 1.95jt) │
│  Rebate: Potongan Langsung Rp 100.000│
└──────────────────────────────────────┘
```

### 2.1 Konfigurasi Parameter Chaining
* `target_event_id`: ID event tujuan (Core Offer Bootcamp).
* `rebate_voucher_enabled`: Boolean (Default `true`).
* `rebate_amount`: Rp 100.000 (100% dari biaya tiket webinar).
* `trigger_rule`: 
  * `UPON_ATTENDANCE` (Otomatis terbit saat peserta melakukan presensi webinar).
  * `UPON_PAYMENT` (Terbit langsung setelah pembayaran webinar terverifikasi).
* `voucher_valid_days`: 30 hari masa aktif sebelum tanggal bootcamp dimulai.

---

## 3. ☁️ Automasi Google Drive Workspace 1-Klik

Pada kartu portofolio event (`EventsPortfolioView.jsx`), terdapat tombol **Generate Workspace Drive**.

### 3.1 Struktur Folder Otomatis di Google Drive
Ketika staf mengklik tombol tersebut, sistem secara otomatis memanggil Google Drive API v3 untuk membuat hierarki folder terstruktur:

```text
📁 [2026-11-14] - Webinar Pre-Event Public Speaking Lab/
├── 📁 01_Bukti_Transfer_Pembayaran/       <-- Auto-backup bukti bayar pendaftar
├── 📁 02_Materi_&_Slide_Presentasi/       <-- Slide pembicara & modul PDF
├── 📁 03_E_Sertifikat_Terbit_PDF/         <-- PDF sertifikat hasil injeksi GAS
└── 📁 04_Rekaman_Audio_Video_Dokumentasi/ <-- Link rekaman Zoom / dokumentasi
```

### 3.2 Persistensi Tautan Workspace
ID dan URL folder induk Google Drive yang berhasil dibuat otomatis disimpan kembali ke kolom `events.drive_workspace_url`. Kartu event di dashboard akan langsung memunculkan tombol hijau **"Buka Drive Workspace"** yang dapat diakses seluruh tim dalam 1 klik.

---

## 4. 🌐 Dynamic Event Landing Page (`/event/:slug`)

Sistem secara dinamis merender halaman landing publik untuk setiap event yang berstatus `PUBLISHED`:
* **Hero Section:** Judul acara, tanggal, countdown timer, dan lencana format acara (Online/Offline).
* **Trainer & Speaker Profile:** Foto, profil keahlian, dan institusi pembicara (Dr. Puguh, Mbak Diyah, atau Willy Tan).
* **Curriculum & Schedule Matrix:** Rundown menit-per-menit acara.
* **Pricing & Package Cards:** Komparasi paket Individu vs Promo Mabar 6 Pax.
* **Call-to-Action (CTA):** Tombol menuju Form Registrasi Publik (`/register/:slug`).
