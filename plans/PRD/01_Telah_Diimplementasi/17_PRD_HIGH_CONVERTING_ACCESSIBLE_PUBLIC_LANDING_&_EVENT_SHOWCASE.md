# 📄 PRD 17: HIGH-CONVERTING ACCESSIBLE PUBLIC LANDING PAGE & EVENT SHOWCASE ENGINE
## Standardisasi Antarmuka Publik Ramah Usia 50+ (Senior-Friendly UI/UX), Showcase Rundown Multi-Hari, & Konversi Pendaftaran

---

## 1. Ringkasan Eksekutif & Analisis Kebutuhan

### 1.1 Latar Belakang Masalah
Berdasarkan evaluasi pengujian pengguna (*user testing*) dan temuan lapangan:
1. **Antarmuka Publik Lama Terlalu Gelap & Ramai (*Cyberpunk/Dark-Mode Overload*):** Efek pendaran latar belakang (*ambient glow*), teks abu-abu redup di atas latar hitam pekat (`text-slate-500` di atas `bg-slate-950`), dan animasi futuristik terbukti menyulitkan calon peserta segmen matang/dewasa (usia 45–55+ tahun) seperti pejabat instansi, tenaga medis/dokter, akademisi, dosen, dan pimpinan perusahaan.
2. **Tidak Ada Tampilan Rundown Acara di Landing Page:** Calon peserta tidak dapat melihat jadwal menit-ke-menit, topik sesi per jam, siapa pemateri per sesi, dan alur istirahat/makan siang. Informasi yang tampil hanya silabus kurikulum abstrak tanpa kepastian waktu riil.
3. **Alur Pengguna Tercecer (*Disjointed User Flow*):** Navigasi antar event belum terhubung secara intuitif. Tombol ajakan bertindak (*Call to Action*) belum memandu pengguna langkah demi langkah secara runtut dari pemahaman acara hingga pengisian formulir.

### 1.2 Target Pengguna & Persona Kritis (Standar Usia 50+ / *Silver Surfer Accessibility*)
Platform publik Dignity Indonesia menargetkan peserta publik yang memiliki profil berikut:
- **Demografi:** Usia 22 s/d 58 tahun (dengan fokus keterbacaan tertinggi untuk usia 45–55+ tahun).
- **Karakteristik Penggunaan:** Membaca teks di layar ponsel dengan kacamata baca (+), membutuhkan teks berukuran besar (minimal 16–18px), menyukai kontras warna tinggi (teks gelap di atas latar terang bersih), membutuhkan tombol aksi yang besar dan tidak berdempetan (*touch target* >= 48px), serta sangat menghargai kontak bantuan WhatsApp panitia yang mudah dihubungi jika mengalami kendala saat mendaftar.

### 1.3 Objektif Produk (Product Goals)
1. **Desain Ramah Semua Usia (Universal Accessibility - WCAG 2.1 AAA):** Latar belakang terang yang bersih (*Clean Corporate Elegance* bernuansa Royal Navy Dignity, Warm Amber/Gold, dan Pure White/Slate-50) yang menyejukkan mata dan mudah dibaca tanpa silau.
2. **Showcase Detail Acara Komprehensif (5W1H):** Menyajikan informasi pokok acara secara instan pada pandangan pertama: *Nama Pelatihan, Tanggal & Hari, Jam Pelaksanaan, Lokasi Fisik/Link Zoom, Profil Trainer Kredibel, Rincian Fasilitas (Dapat Apa Saja), serta Kuota Kursi Tersisa*.
3. **Showcase Rundown Publik Interaktif Multi-Hari:** Mengintegrasikan data jadwal dari tabel `event_schedules` dan `schedule_items` (PRD 16) ke halaman depan, sehingga calon peserta dapat memeriksa rincian jam per jam untuk Hari ke-1, Hari ke-2, hingga Hari ke-4 dengan label sesi yang jelas (Teori, Praktik Panggung, Simulasi, Coffee Break, Makan Siang).
4. **Pilihan Paket Harga & Transparansi Biaya:** Menampilkan kartu paket investasi (Individu vs Rombongan Mabar) dengan rincian fasilitas konkret tanpa ada biaya tersembunyi.
5. **Jalur Bantuan WhatsApp Panitia 1-Klik (*Floating Help Button*):** Bantuan langsung ke WhatsApp CS dengan pesan otomatis (*prefilled text*) agar calon peserta yang kesulitan mendaftar online tetap dapat dibantu oleh panitia admin.

---

## 2. Arsitektur Informasi & Alur Pengguna (User Journey)

Alur halaman dirancang **linear, runtut, dan menuntun pengguna secara tenang** tanpa lompatan informasi yang membingungkan:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER RESMI & LEGALITAS                                                 │
│    • Logo LPK Indonesia Dignity • Legalitas Akreditasi Resmi                │
│    • Tombol Navigasi Cepat (Jadwal, Biaya, FAQ, Kontak)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. HERO SECTION & RINGKASAN VITAL ACARA (EVENT VITAL CARD)                  │
│    • Judul Acara Jelas & Subjudul Berbobot                                  │
│    • Kartu Vital: 📅 Tanggal & Hari | ⏰ Jam | 📍 Lokasi/Venue | 👥 Sisa Kursi│
│    • Tombol Utama Ganda: [📋 DAFTAR SEKARANG] dan [👀 LIHAT JADWAL LENGKAP] │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. SWITCHER KATALOG EVENT (JIKA MULTI-EVENT PUBLISHED)                      │
│    • Tab besar mudah diklik: [Pelatihan Tatap Muka Hotel] [Webinar Online]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. DETAIL MANFAAT & KOMPETENSI (APA YANG AKAN DIPEROLEH)                    │
│    • Poin-poin praktis: Mengatasi grogi, teknik vokal, bahasa tubuh, slide  │
│    • Sertifikat resmi: SKKNI / BNSP / Akreditasi Kemnaker                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. PROFIL PEMATERI & MASTER TRAINER KREDIBEL                                │
│    • Foto profesional asli, nama lengkap bergelar, rekam jejak, kredibilitas│
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. SHOWCASE RUNDOWN & AGENDA INTERAKTIF (TERHUBUNG KE PRD 16)               │
│    • Tab Pemilihan Hari: [Hari ke-1 (Sabtu)] [Hari ke-2 (Minggu)]           │
│    • Tabel/Kartu Jadwal Menit-ke-Menit: Jam, Topik Materi, Metode & Rehat  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. FASILITAS LENGKAP (SEMINAR KIT, MAKAN SIANG, MODUL, DOKUMENTASI)         │
│    • Rincian visual apa saja yang dibawa pulang peserta                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 8. PILIHAN PAKET BIAYA & INVESTASI PELATIHAN                                │
│    • Kartu Paket Individu vs Rombongan (Mabar 10 Gratis 1)                  │
│    • Perbandingan harga jelas, diskon periode Early Bird                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 9. CARA MUDAH MENDAFTAR (3 LANGKAH RAMAH ORANG TUA)                         │
│    • Langkah 1: Klik Daftar • Langkah 2: Isi Nama & WA • Langkah 3: Tiket   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 10. TANYA JAWAB UMUM (FAQ ACCORDION)                                        │
│     • Pertanyaan lazim seputar sertifikat, izin kantor, akomodasi, invoice │
├─────────────────────────────────────────────────────────────────────────────┤
│ 11. FOOTER & BANTUAN PANITIA WHATSAPP MENGAPUNG (FLOATING CS)               │
│     • Tombol hijau WhatsApp mengapung di pojok kanan bawah setiap saat      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Komponen & Antarmuka Ramah Usia 50+

### 3.1 Panduan Tipografi & Kontras Warna (WCAG AAA)
| Aspek Desain | Standar Ramah Usia 50+ | Alasan Desain |
| :--- | :--- | :--- |
| **Warna Latar Belakang** | Putih Bersih (`#FFFFFF`) & Soft Cream/Slate (`#F8FAFC`) | Mata dewasa mudah lelah pada latar hitam (*eye strain*) saat membaca teks panjang. |
| **Warna Teks Utama** | Biru Gelap Deep Navy (`#0F172A` / `#0F2C59`) | Menghasilkan rasio kontras > 10:1 (melebihi standar minimum WCAG AAA 7:1). |
| **Aksen Utama** | Royal Dignity Blue (`#1E40AF`) & Warm Amber Gold (`#D97706`) | Memberikan kesan lembaga resmi, terpercaya, bermartabat, dan berwibawa. |
| **Ukuran Teks Body** | Minimal `16px` s/d `18px` (bukan 12px atau 14px) | Tidak memaksa pengguna memicingkan mata atau mencari tombol zoom browser. |
| **Tinggi Baris (*Line Height*)** | `1.6` s/d `1.8` | Memberikan ruang pandang yang lega antar baris teks. |
| **Ukuran Target Sentuh (*Tap Target*)** | Minimal tinggi `48px` s/d `56px` | Mencegah salah klik (*fat-finger error*) di layar sentuh ponsel. |

---

### 3.2 Seksi Rundown Publik Interaktif (`EventRundownShowcase`)
Komponen ini menjadi nilai jual utama dan menjawab langsung kebutuhan peserta untuk mengetahui jadwal:
- **Pengambilan Data Real-Time:** Memanggil API `rundownService.getEventSchedules(eventId)` yang terhubung ke Supabase.
- **Tab Pemilihan Hari:**
  - Jika acara 1 hari (Webinar): Menampilkan langsung jadwal hari tersebut.
  - Jika acara multi-hari (Bootcamp 2–4 hari): Menampilkan tab horizontal yang tebal:
    `[ 📅 Hari 1: Sabtu, 12 Des ]` `[ 📅 Hari 2: Minggu, 13 Des ]`
- **Tampilan Jadwal Berbasis Kartu Waktu (*Timeline Card*):**
  - **Kolom Jam:** Font tebal dan kontras (contoh: `08.30 - 10.00 WIB`) berlatar belakang lencana (*badge*).
  - **Judul Sesi:** Teks ukuran 18px berbobot *semi-bold* (contoh: *Menguasai Demam Panggung & Olah Pernafasan Diafragma*).
  - **Narasumber:** Menampilkan nama pembicara jika berbeda antar sesi.
  - **Lencana Kategori Sesi (*Session Type Badge*):**
    - 🔵 *Kuliah Teori & Framework* (Keynote)
    - 🟢 *Praktik Panggung Langsung* (Practice)
    - 🟠 *Simulasi Lab & Rekaman Video* (Demo)
    - ☕ *Rehat Kopi & Teh* (Coffee Break)
    - 🍽️ *Makan Siang & Sholat* (Ishoma)
  - **Deskripsi Ringkas Materi:** 1–2 kalimat penjelasan apa yang didapatkan peserta pada jam tersebut.
- **Tombol Unduh Rundown:** Tombol satu-klik `[📥 Unduh Rundown PDF]` untuk dicetak atau diajukan ke atasan/kantor.

---

### 3.3 Kartu Ringkasan Vital Acara (*Event Vital Card*)
Tepat di bawah judul utama (Hero), calon peserta langsung disajikan kotak ringkasan berbingkai elegan:
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ LPK INDONESIA DIGNITY • PELATIHAN PUBLIK SPEAKING TATAP MUKA             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📅 HARI & TANGGAL : Sabtu & Minggu, 12 - 13 Desember 2026                   │
│ ⏰ WAKTU LENGKAP  : Pukul 08.30 s/d 17.00 WIB (Tepat Waktu)                 │
│ 📍 TEMPAT / VENUE : Ballroom Sala View Hotel, Surakarta (Solo)              │
│                     Jl. Brigjend Slamet Riyadi No. 450 [🗺️ Buka Google Maps] │
│ 🎓 SERTIFIKASI    : Sertifikat Resmi Ber-QR Code LPK Dignity / BNSP         │
│ 👥 STATUS KUOTA   : Tersisa 14 Kursi dari Maksimal 30 Peserta (Eksklusif)   │
├─────────────────────────────────────────────────────────────────────────────┤
│   [  📋 DAFTAR SEKARANG  ]        [  💬 TANYA PANITIA VIA WHATSAPP  ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Bantuan WhatsApp Terintegrasi (*Floating WhatsApp Help Button*)
- Tombol WhatsApp hijau mengapung di pojok kanan bawah layar.
- Dilengkapi teks berbunyi: *"Butuh Bantuan Pendaftaran? Hubungi Panitia"*.
- Mengarahkan ke WhatsApp resmi panitia dengan pesan *prefilled*:
  ```text
  Halo Panitia LPK Indonesia Dignity, saya ingin menanyakan informasi dan pendaftaran untuk acara: [Nama Event]. Mohon bantuannya.
  ```

---

## 4. Pemetaan Implementasi Kode (Codebase Mapping)

* **View Utama:** [`src/features/landing/DynamicEventLandingPage.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/landing/DynamicEventLandingPage.jsx)
* **Subkomponen Pendukung:**
  * Kartu Vital Acara: [`src/features/landing/EventVitalCard.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/landing/EventVitalCard.jsx)
  * Showcase Rundown Multi-Hari: [`src/features/landing/PublicRundownShowcase.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/landing/PublicRundownShowcase.jsx)
  * Tombol Bantuan Mengapung: [`src/features/landing/FloatingWhatsAppButton.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/features/landing/FloatingWhatsAppButton.jsx)
* **Backend Services & Database:**
  * Rundown API: [`src/services/rundownService.js`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/services/rundownService.js)
  * Skema DB: [`supabase/migrations/010_interactive_rundown_and_stage_management.sql`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/supabase/migrations/010_interactive_rundown_and_stage_management.sql)
  * Seed Jadwal Riil: [`supabase/migrations/011_seed_interactive_rundown_schedules.sql`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/supabase/migrations/011_seed_interactive_rundown_schedules.sql)

---

## 5. Kriteria Penerimaan & Keberhasilan (Acceptance Criteria)

- [x] Halaman depan menggunakan palet cerah (*Clean High-Contrast Light Mode*) dengan rasio kontras teks minimal 7:1.
- [x] Ukuran font teks penjelasan minimal 16px dan judul utama minimal 28px–36px.
- [x] Terdapat seksi Rundown Acara yang menampilkan jadwal jam-ke-jam per hari dengan tab hari yang mudah diklik.
- [x] Terdapat Kartu Ringkasan Acara (Tanggal, Jam, Lokasi fisik dengan tautan peta, dan Fasilitas).
- [x] Tombol pendaftaran berukuran besar (tinggi minimal 48px), berwarna kontras, dan langsung mengarahkan ke formulir pendaftaran.
- [x] Tombol WhatsApp mengapung selalu terlihat di layar dan membuka obrolan langsung ke nomor admin dengan pesan pembuka otomatis.
- [x] Pengguna usia 50+ dapat memahami informasi acara dan menemukan tombol daftar tanpa kebingungan.
