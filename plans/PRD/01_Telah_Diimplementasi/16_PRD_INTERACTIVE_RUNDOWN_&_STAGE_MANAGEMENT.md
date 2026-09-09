# 📄 PRD 16: INTERACTIVE RUNDOWN, TIMELINE & STAGE MANAGEMENT ENGINE
## Dignity Event Operations Command Center

---

## 1. Ringkasan Eksekutif & Objektif Produk

### 1.1 Latar Belakang
Rundown acara konvensional berbasis kertas lembaran (*printed paper*) atau berkas Word statis memiliki kelemahan fatal di lapangan: **begitu sesi pembukaan atau protokoler pejabat molor 15–20 menit, seluruh jadwal di kertas menjadi usang**. Akibatnya, tim audio-visual (soundman), Master of Ceremony (MC), operator proyektor, tim konsumsi, dan liaison officer (LO) narasumber kehilangan sinkronisasi.

Terinspirasi dari studi kasus nyata penyelenggaraan acara multi-hari LPK Indonesia Dignity (seperti *Pelatihan Hypnosis & Yoga Poltekkes Palembang 4 Hari* dan *Bootcamp Sala View Hotel Solo 2 Hari*), sistem Command Center memerlukan **Mesin Rundown Interaktif & Stage Cue Management** digital yang hidup, dinamis, dan tersinkronisasi secara real-time.

### 1.2 Tujuan Produk (Product Goals)
1. **Multi-Day & Multi-Track Scheduler:** Mendukung fleksibilitas jadwal 1 hari (*Webinar Pre-Event*), 2 hari (*Bootcamp Sala View*), hingga 4 hari multi-batch paralel (*Poltekkes Kemenkes*).
2. **Live Session Tracker & Hitungan Mundur (Countdown):** Menampilkan status sesi yang sedang berlangsung secara real-time dengan hitungan mundur menit (*"Sisa 12 Menit"*), indikator visual *"ON SCHEDULE"*, *"DELAYED (+15 min)"*, atau *"OVERTIME"*.
3. **Penyelarasan Keterlambatan Sekali-Klik (One-Click Dynamic Shift Timeline):** Jika acara molor, stage manager cukup menekan tombol `⚡ Geser Waktu (+X menit)` untuk otomatis mengkalkulasi ulang jam seluruh sesi berikutnya, dengan opsi cerdas memangkas buffer istirahat tanpa menggeser jam kepulangan akhir.
4. **Stage Cue & Logistik Checklist per Sesi:** Setiap blok sesi memiliki daftar periksa teknis mandiri (kebutuhan mic, slide deck clicker, musik latar, phantom/matras, snack break).
5. **Mode Khusus Meja Operator (Live Stage Operator Dark Mode):** Tampilan layar penuh (*full-screen high-contrast dark mode*) yang nyaman dilihat operator soundman dan MC podium di tempat temaram.
6. **Portal Agenda Publik Peserta (`/event/:slug/rundown`):** Calon dan peserta terdaftar dapat melihat jadwal terverifikasi yang selalu diperbarui jika terjadi perubahan di lapangan.

---

## 2. Arsitektur Data Supabase PostgreSQL

Sistem ini didukung oleh 2 tabel baru yang terhubung ke entitas acara `events`:

```text
┌────────────────────────────────────────────────────────────┐
│                    TABEL: event_schedules                  │
│ • id (UUID, PK)             • event_id (UUID, FK -> events)│
│ • day_number (INT)          • schedule_date (DATE)         │
│ • title (VARCHAR)           • location_room (VARCHAR)      │
│ • track_name (VARCHAR)      • is_published (BOOLEAN)       │
├────────────────────────────────────────────────────────────┤
│                    TABEL: schedule_items                   │
│ • id (UUID, PK)             • schedule_id (UUID, FK)       │
│ • session_code (VARCHAR)    • title (VARCHAR)              │
│ • description (TEXT)        • start_time (TIME)            │
│ • end_time (TIME)           • duration_minutes (INT)       │
│ • session_type (ENUM)       • speaker_name (VARCHAR)       │
│ • pic_team (VARCHAR)        • equipment_checklist (JSONB)  │
│ • status (ENUM)             • delay_minutes (INT)          │
│ • sort_order (INT)          • stage_cues (TEXT)            │
└────────────────────────────────────────────────────────────┘
```

### 2.1 Nilai Enum Sesi (`session_type`)
- `'CEREMONY'` — Pembukaan, Penutupan, Sambutan Pejabat, Sumpah Profesi.
- `'KEYNOTE'` — Materi Teori Utama / Kuliah Pakar.
- `'PRACTICE'` — Praktik Mandiri, Workshop, Simulasi Lab, Senam Yoga.
- `'DEMO'` — Demonstrasi Klinis Live di Depan Kelas.
- `'BREAK'` — Morning/Afternoon Coffee Break, Hidrasi Elektrolit.
- `'MEAL'` — ISHOMA (Istirahat, Sholat, Makan Siang).
- `'EVALUATION'` — Post-Test, OSCE, Q&A, Ujian Praktik.

### 2.2 Nilai Status Sesi (`status`)
- `'SCHEDULED'` — Terjadwal, belum dimulai.
- `'PREPARING'` — 10 menit sebelum mulai (peringatan ke MC & operator alat).
- `'LIVE'` — Sesi sedang berjalan di panggung/ruangan.
- `'OVERTIME'` — Melewati batas waktu durasi yang dialokasikan.
- `'COMPLETED'` — Sesi telah selesai.
- `'SKIPPED'` — Sesi dibatalkan atau digabung.

---

## 3. Fitur Inti & Alur Kerja Lapangan (Core Workflows)

### 3.1 Live Clock & Timekeeper Countdown
Dashboard membandingkan waktu lokal perangkat operator dengan rentang `start_time` dan `end_time` sesi aktif:
- **Visual Progress Bar:** Batang progres visual berwarna hijau bergerak maju sesuai berjalannya waktu sesi.
- **Peringatan Waktu Ambang Batas:**
  - 🟢 Normal: Waktu berjalan aman.
  - 🟡 Sisa 10 Menit: Mengingatkan MC untuk membuka sesi tanya jawab.
  - 🔴 Overtime: Jam sesi berkedip merah lembut dan menampilkan durasi lebih (*e.g. "+07:24 overtime"*).

### 3.2 Dynamic Shift Timeline Engine (Stored Procedure)
Ketika terjadi keterlambatan tidak terduga, sistem menyediakan dialog penyesuaian waktu:

```sql
CREATE OR REPLACE FUNCTION shift_schedule_timeline(
    p_schedule_id UUID,
    p_from_item_id UUID,
    p_offset_minutes INT,
    p_absorb_in_breaks BOOLEAN DEFAULT TRUE
) RETURNS JSONB AS $$
...
$$ LANGUAGE plpgsql;
```

### 3.3 Stage Cue & Checklist Logistik per Sesi
Operator panggung dapat memeriksa daftar perlengkapan teknis berupa checklist interaktif pada panel sesi:
- `[x] Mic wireless utama baterai penuh`
- `[x] Slide deck PPT narasumber telah dimuat di laptop operator`
- `[x] Pointer laser & presenter clicker siap di podium`
- `[x] Musik pengiring relaksasi / yoga siap pada channel audio 2`
- `[ ] Balok yoga / matras / phantom bayi tertata di panggung demonstrasi`
- `[ ] Snack coffee break telah siap di meja serbaguna`

### 3.4 Mode Tampilan (Triple-View Mode)
1. **Timeline / Gantt View:** Representasi visual linier sepanjang garis waktu jam 07.00 s/d 18.00 WIB.
2. **Dense Operations Table:** Tabel standar baris dengan sticky header untuk tim sekretariat dan admin pendaftaran.
3. **Stage Manager Teleprompter (Dark Mode):** Tampilan tipografi raksasa dengan latar belakang hitam legam (*pure black*) yang dirancang khusus untuk diletakkan di meja sound engineer, operator panggung, atau tablet MC.

### 3.5 Rundown Template Engine, Bulk CSV/Excel Import & Real-Time Export
Untuk mempercepat panitia dalam menyusun rundown tanpa perlu mengetik satu per satu di form web:
1. **Standardized CSV Template:** Disediakan template CSV berstandar industri dengan header lengkap:
   `hari_ke,kode_sesi,jam_mulai,jam_selesai,durasi_menit,judul_sesi,deskripsi_materi,tipe_sesi,nama_pembicara,pic_tim,daftar_alat,stage_cues`
2. **Interoperabilitas Microsoft Excel (UTF-8 BOM):** Menggunakan injeksi UTF-8 Byte Order Mark (`\uFEFF`) sehingga file CSV langsung terbuka rapi di Microsoft Excel Windows tanpa masalah karakter huruf atau *garbled text*.
3. **Pemisah Cerdas (Smart Delimiter Detection):** Parser secara otomatis mendeteksi apakah file menggunakan koma (`,`) standar internasional atau titik koma (`;`) standar Excel regional Indonesia.
4. **Modal Pratinjau & Validasi (Import Preview Modal):** Sebelum data disimpan ke Supabase, sistem memvalidasi jam mulai/selesai, tipe sesi (enum matching), dan menampilkan tabel pratinjau 10 baris pertama.
5. **Pemetaan Hari Fleksibel:** Pengguna dapat memilih apakah baris diimpor ke jadwal hari aktif saat ini atau dibuatkan baris `event_schedules` baru secara otomatis.
6. **Ekspor 1-Klik:** Jadwal yang sedang aktif dapat langsung diunduh kembali menjadi file CSV siap cetak/arsip.

---

## 4. Hak Akses & Matriks RBAC

| Aksi / Fungsi | OWNER / DIREKTUR | EVENT COORDINATOR | LEAD TRAINER | FIELD OFFICER / MC | AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Buat & Sunting Jadwal** | Full Access | Full Access | Full Access | No Access | Read Only |
| **Trigger Shift Timeline** | Full Access | Full Access | Full Access | No Access | No Access |
| **Ubah Status (Live/Done)**| Full Access | Full Access | Full Access | Full Access | Read Only |
| **Centang Checklist Alat** | Full Access | Full Access | Full Access | Full Access | Read Only |
| **Unduh/Impor Template CSV**| Full Access | Full Access | Full Access | No Access | Read Only |
| **Publikasikan Jadwal** | Full Access | Full Access | View Only | No Access | Read Only |

---

## 5. Pemetaan Implementasi Kode (Code Architecture)

* **Supabase Migration:** 
  * [`supabase/migrations/010_interactive_rundown_and_stage_management.sql`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/supabase/migrations/010_interactive_rundown_and_stage_management.sql)
  * [`supabase/migrations/011_seed_interactive_rundown_schedules.sql`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/supabase/migrations/011_seed_interactive_rundown_schedules.sql)
* **Backend Service & Utilities:** 
  * [`src/services/rundownService.js`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/services/rundownService.js)
  * [`src/utils/csvRundownHelper.js`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/utils/csvRundownHelper.js)
* **Frontend Feature Module:**
  * View Utama: [`src/features/rundown/RundownStageView.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/RundownStageView.jsx)
  * Live Pacing Ticker: [`src/features/rundown/LivePacingBar.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/LivePacingBar.jsx)
  * Shift Timeline Modal: [`src/features/rundown/ShiftTimelineModal.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/ShiftTimelineModal.jsx)
  * Schedule Item Modal: [`src/features/rundown/ScheduleItemModal.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/ScheduleItemModal.jsx)
  * Fullscreen Teleprompter: [`src/features/rundown/TeleprompterModal.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/TeleprompterModal.jsx)
  * Import CSV Modal: [`src/features/rundown/ImportRundownModal.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/rundown/ImportRundownModal.jsx)
* **Navigasi Sidebar:** [`src/components/nav-main.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/components/nav-main.jsx) (Tab `rundown`)
* **Router App:** [`src/App.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/App.jsx)

