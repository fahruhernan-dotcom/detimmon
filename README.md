# ⚡ DIGNITY ADMIN COMMAND CENTER
## Executive Web Management System — LPK Indonesia Dignity in Official Collaboration with KLTC®

Sistem aplikasi web internal modern berbasis **React + Vite** yang dirancang sebagai pusat komando operasional seluruh ekosistem webinar *pre-event* dan *funnel* konversi pelatihan tatap muka:
- 🎯 **Pre-Event Webinar:** *"Mastering Stage Confidence"* — 14 November 2026 (Live Zoom)
- 🏢 **Bootcamp Konversi:** *Public Speaking & Stage Mastery Bootcamp* — 12–13 Desember 2026 di **Sala View Hotel Solo**

---

## 🌟 Fitur Utama & Logika Ekosistem Sistem

### 1. Integrasi Google Workspace Terpadu (Direct REST API)
Sistem berkomunikasi langsung dengan Google Cloud REST API tanpa ketergantungan perantara:
- **Google Sheets API v4 (Real-Time Database):**
  - Sinkronisasi dua arah (*Two-Way Live Sync*) untuk membaca dan menulis status pendaftar secara instan.
  - *Admin Columns Auto-Provisioning:* Mendeteksi dan otomatis membuat kolom admin di baris judul spreadsheet jika belum ada: `[Admin] Status`, `[Admin] Nomor Tiket`, `[Admin] Status Email`, dan `[Admin] Nominal Validasi`.
  - *Protected Column Mapping:* Menjamin kolom **Upload Bukti Pembayaran** (Kolom G) terlindungi dari penimpaan nominal pembayaran (`100000`), sehingga tautan struk transfer tetap aman.
- **Google Drive API v3 (Arsitektur Zero-Cookie Streaming):**
  - **Masalah Peramban:** Chrome/Edge/Safari memblokir *third-party cookies* di `localhost`, menyebabkan tag `<img>` biasa yang memuat berkas privat Google Drive gagal tampil.
  - **Solusi Kami (Direct Binary Fetching):** Mengunduh data biner berkas langsung via `https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` menggunakan *OAuth Bearer Token*, kemudian mengubahnya menjadi `blob:` URL lokal di peramban. Hasilnya, bukti transfer (**JPG, PNG, maupun dokumen PDF**) tampil instan 100% bebas blokir *cookie*.
  - **Pratinjau Interaktif Iframe:** Menyediakan penampil resmi Google Drive (`https://drive.google.com/file/d/{fileId}/preview`) di dalam modal.
  - **Otorisasi 1-Klik di Dalam Modal:** Tombol emas `[ 🔑 Hubungkan Drive (1-Klik) ]` langsung di dalam modal untuk otorisasi cepat tanpa meninggalkan halaman.
  - **Cadangan Cloud Otomatis (*Drive Backup*):** Tombol cadangkan seluruh data pendaftar & presensi ke Google Drive dalam format CSV/JSON.
- **Gmail REST API v1 (Automated Ticket & Certificate Dispatcher):**
  - Mengirimkan *E-Ticket* berformat HTML eksekutif langsung dari akun resmi `doniesdaily@gmail.com` menggunakan enkripsi Base64URL (RFC 4648 §5).
  - Mengirimkan *E-Sertifikat PDF* resmi yang dilengkapi kode kupon diskon (*Voucher Rebate*) Rp 100.000 untuk *upsell* ke Bootcamp Offline Solo.
  - Mendukung pengiriman satuan maupun pengiriman massal (*Batch Dispatch*).

---

### 2. Mesin Normalisasi Data Pendaftar (`src/utils/normalizers.js`)
Memastikan keakuratan data saat diterbitkan pada E-Ticket dan E-Sertifikat resmi:
- **`normalizeCertificateName(rawName)`:**
  - Menghapus spasi ganda, karakter liar, dan format huruf acak (misal: `juctitio fatah andri nugroho` ➔ `Juctitio Fatah Andri Nugroho`).
  - Secara cerdas **mempertahankan singkatan gelar akademis, profesi, dan keagamaan** (misal: `S.Kom`, `M.Pd`, `dr.`, `Ir.`, `H.`, `Hj.`, `PhD`, `M.M.`, `S.T.`, `B.A.`, dsb.).
- **`normalizeEmail(rawEmail)`:**
  - Menghapus spasi tersembunyi, mengubah ke huruf kecil (*lowercase*), dan memvalidasi struktur email aktif.
- **`normalizeWhatsApp(rawPhone)`:**
  - Menyeragamkan nomor ponsel lokal (`0812...`, `+62812...`, `812...`) menjadi format internasional resmi (`62812...`) yang siap pakai untuk tautan API WhatsApp.

---

### 3. Arsitektur Antarmuka Baru (shadcn/ui Sidebar-07)
Tata letak navigasi modern dengan pemisahan peran yang tegas dan ergonomis:
- **Operasional Webinar (Alur Acara Inti):**
  1. 👥 **Registrasi & Verifikasi:** Tabel interaktif pendaftar, verifikasi pembayaran 1-klik, deteksi paket otomatis (Individu Rp 100.000 vs Promo Mabar 6 Pax Rp 500.000), pembuatan sub-tiket (`-A` s/d `-F`), pratinjau bukti transfer, dan filter segmented.
  2. 🎓 **Presensi & E-Sertifikat:** Monitor kehadiran peserta live Zoom, pratinjau sertifikat visual dengan nama ternormalisasi, dan blast sertifikat otomatis.
  3. 💰 **Monitor Finansial (P&L):** Analisis kas riil masuk dari peserta `LUNAS`, perbandingan honor pembicara (Mbak Diyah Rp 2,5jt vs Willy Tan Rp 3,5jt), margin laba kotor & bersih, serta proyeksi konversi kupon rebate ke bootcamp offline.
- **Tautan & Alat Cepat:**
  - 📊 Akses langsung Google Spreadsheet Master.
  - 📁 Akses folder Google Drive bukti transfer.
  - 📞 Hotline WhatsApp Admin CS.
- **Pengaturan Sistem (.env) — Terpisah dari Operasional:**
  - Menu khusus terisolasi di sidebar dan profil pengguna untuk konfigurasi lingkungan, kredensial, parameter finansial, dan live generator `.env`.

---

### 4. Pusat Pengaturan Sistem & Variabel Lingkungan (.env)
Halaman pengaturan (`ConfigModal.jsx`) menyediakan panel manajemen konfigurasi komprehensif yang dibagi dalam 4 tab:
1. **Google Sheets & Cloud OAuth:**
   - Spreadsheet ID, Nama Tab Registrasi, Nama Tab Presensi.
   - Google Client ID, Client Secret, API Key, dan Google Apps Script URL.
   - Tombol Uji Koneksi (*Test Connection*) & Login Otorisasi Google.
   - Panduan konfigurasi *Authorized JavaScript origins* (`http://localhost:8080`) dan *Authorized redirect URIs*.
2. **WhatsApp Hotline & Keamanan:**
   - Nomor WhatsApp CS Admin Hotline internasional.
   - Admin Security API Token.
   - Generator tautan pendaftaran & konfirmasi WhatsApp otomatis dengan tombol salin 1-klik.
3. **Parameter Finansial & Tiket:**
   - Harga Tiket Individu & Promo Mabar.
   - Honor Pembicara Diyah & Honor Pembicara Willy.
   - Biaya Zoom Pro & Pilihan Pembicara Utama Default.
4. **File .env Generator (Live Code):**
   - Menampilkan kode teks berkas `.env` lengkap yang ter-generate secara *real-time* dari input form.
   - Tombol 1-klik **"Salin Format .env"** untuk disalin ke berkas proyek.
   - Seluruh perubahan otomatis tersimpan ke `localStorage` dan langsung aktif di aplikasi tanpa *reload*.

---

### 5. Sesi Pengguna Tetap (*Persistent Owner Session*)
- Sesi terkunci permanen pada akun owner: **`doniesdaily@gmail.com`** (*Super Admin*).
- Status autentikasi dan *OAuth Bearer Token* tersimpan di `localStorage` (`digniti_google_oauth_token`).
- Bebas dari interupsi *logout* tak terduga saat melakukan *refresh* browser.

---

## 🚀 Cara Menjalankan Aplikasi

### Metode 1: Sekali Klik via Windows (Rekomendasi)
Cukup klik dua kali berkas:
👉 **`buka_dashboard.bat`**  
Sistem otomatis menjalankan server Vite dan membuka antarmuka di peramban pada **`http://localhost:8080`**.

### Metode 2: Melalui Terminal / PowerShell
```powershell
# 1. Masuk ke direktori web admin
cd "04_Sistem_Aplikasi_Web_Admin"

# 2. Pasang dependensi jika baru pertama kali (atau ada paket baru)
npm install

# 3. Jalankan server lokal
npm run dev

# 4. Buka di browser
http://localhost:8080
```

---

## ⚙️ Variabel Lingkungan Lengkap (`.env`)

Berkas `.env` terletak di root folder aplikasi:

```env
# ==============================================================================
# DIGNITY ADMIN COMMAND CENTER - ENVIRONMENT VARIABLES (.env)
# LPK Indonesia Dignity in Collaboration with KLTC®
# ==============================================================================

# 1. Google Sheets Cloud Database
VITE_GOOGLE_SPREADSHEET_ID=1rBCPX1klMKDeFKfrC8C7I_txb8Q2duD4TEfE3UmmGcI
VITE_GOOGLE_SHEETS_TAB_REGISTRASI=DB_Registrasi_Webinar
VITE_GOOGLE_SHEETS_TAB_PRESENSI=DB_Presensi_&_Sertifikat

# 2. Google Cloud Console OAuth 2.0 Credentials
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# 3. Google Cloud API Key (Alternatif Opsional)
VITE_GOOGLE_API_KEY=

# 4. Google Apps Script (GAS) Web App Endpoint (Two-Way Sync & Fallback)
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx_DIGNITI_GAS_DEPLOYMENT_ID/exec

# 5. Security Token
VITE_ADMIN_API_TOKEN=admin123

# 6. Admin WhatsApp Hotline
VITE_ADMIN_WHATSAPP=6289681077483

# 7. Financial Defaults
VITE_DEFAULT_SPEAKER=diyah
VITE_HARGA_TIKET_INDIVIDU=100000
VITE_HARGA_PROMO_MABAR=500000
VITE_HONOR_SPEAKER_DIYAH=2500000
VITE_HONOR_SPEAKER_WILLY=3500000
VITE_BIAYA_ZOOM_PRO=250000
```

> **Tips:** Anda dapat mengubah seluruh nilai di atas kapan saja secara langsung melalui menu **Pengaturan Sistem (.env)** di dalam aplikasi web tanpa perlu mengedit file secara manual.

---

## 📁 Struktur Direktori Source Code

```
04_Sistem_Aplikasi_Web_Admin/
├── 📄 .env                         <-- Variabel lingkungan aktif proyek
├── 📄 .env.example                 <-- Contoh template variabel lingkungan
├── 🚀 buka_dashboard.bat           <-- Skrip peluncur 1-klik Windows
├── 📦 package.json                 <-- Dependensi React 18, Vite 5, Tailwind CSS, Lucide
├── 📘 README.md                    <-- Dokumentasi teknis sistem
├── ⚙️ vite.config.js               <-- Konfigurasi bundler Vite (:8080)
├── 📁 src/
│   ├── ⚡ App.jsx                  <-- State orchestrator, auth context & view manager
│   ├── 🚀 main.jsx                 <-- Entry point React DOM
│   ├── 🎨 index.css                <-- Desain sistem, specular glow, typography Inter
│   │
│   ├── 📁 components/              <-- Komponen antarmuka pengguna
│   │   ├── 🧭 app-sidebar.jsx      <-- Sidebar-07 (Operasional vs Pengaturan terpisah)
│   │   ├── 📌 nav-main.jsx         <-- Menu Operasional Webinar (Registrasi, Presensi, P&L)
│   │   ├── 🔗 nav-projects.jsx     <-- Menu Tautan Cepat (Sheets, Drive, WhatsApp)
│   │   ├── 👤 nav-user.jsx         <-- Footer profil pengguna doniesdaily & link setting
│   │   ├── 👥 team-switcher.jsx    <-- Pemilih pembicara aktif di header sidebar
│   │   ├── 🧭 Sidebar.jsx          <-- Komponen navigasi sekunder
│   │   ├── 🏷️ Header.jsx           <-- Header navigasi alternatif
│   │   ├── 📊 KpiBento.jsx         <-- Bento Grid 5 metrik analitik operasional utama
│   │   ├── 📋 RegistrantTable.jsx  <-- Tabel pendaftar, pencarian, filter, dan aksi blast
│   │   ├── 🎓 AttendanceSection.jsx<-- Monitoring presensi Zoom & blast e-sertifikat
│   │   ├── 💰 FinancialPnl.jsx     <-- Kalkulator P&L laba rugi riil & simulasi honor
│   │   ├── ⚙️ ConfigModal.jsx      <-- Pusat Pengaturan Sistem & Variabel Lingkungan (.env)
│   │   ├── 🖼️ ProofModal.jsx       <-- Penampil bukti transfer (Zero-Cookie Blob API & Iframe)
│   │   ├── 📜 CertificateModal.jsx <-- Penampil pratinjau E-Sertifikat visual
│   │   ├── ✏️ EditRegistrantModal.jsx<-- Modal edit data peserta, nominal, bukti, dan mabar
│   │   ├── ➕ AddModal.jsx          <-- Modal penambahan peserta manual
│   │   ├── 🔒 LoginPage.jsx        <-- Halaman login autentikasi Google Verified
│   │   └── 📁 ui/                  <-- Komponen primitif UI (Radix UI / Tailwind)
│   │       ├── sidebar.jsx         <-- Primitif Sidebar headless
│   │       ├── breadcrumb.jsx      <-- Breadcrumb path navigasi
│   │       ├── separator.jsx       <-- Garis pemisah visual
│   │       ├── dropdown-menu.jsx   <-- Menu dropdown popover
│   │       ├── sheet.jsx           <-- Modal panel geser
│   │       ├── tooltip.jsx         <-- Label bantuan hover
│   │       └── dialog.jsx          <-- Dialog modal primitif
│   │
│   ├── 📁 services/                <-- Lapisan integrasi data & API
│   │   ├── 📊 sheetsService.js     <-- Integrasi Google Sheets API v4 (Read/Write)
│   │   └── 🌐 googleApiService.js  <-- Integrasi Google Drive API v3 & Gmail REST API v1
│   │
│   ├── 📁 utils/                   <-- Utilitas fungsional
│   │   ├── 🛠️ formatters.js        <-- Format mata uang Rupiah, nominal, tiket sub-id
│   │   └── 🧠 normalizers.js       <-- Mesin normalisasi nama sertifikat, email, dan WA
│   │
│   ├── 📁 hooks/                   <-- Custom React Hooks
│   │   └── use-mobile.jsx          <-- Detektor tampilan layar seluler/desktop
│   │
│   └── 📁 lib/                     <-- Pustaka pembantu
│       └── utils.js                <-- Utilitas penggabung class Tailwind (clsx/twMerge)
```

---

## 🔧 Panduan Konfigurasi Google Cloud Console

Agar otorisasi OAuth 2.0 berjalan tanpa kendala di komputer lokal:

1. Buka [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) pada proyek Anda (`Project ID: 413035723577`).
2. Klik **OAuth 2.0 Client IDs** (Tipe: *Web application*).
3. Tambahkan URL lokal berikut:
   - **Authorized JavaScript origins:**
     `http://localhost:8080`
   - **Authorized redirect URIs:**
     `http://localhost:8080`
4. Pastikan 3 API berikut telah diaktifkan (*Enabled*) di Google Cloud Console:
   - ✅ **Google Sheets API** (v4)
   - ✅ **Google Drive API** (v3)
   - ✅ **Gmail API** (v1)
5. Klik **Save**.

---

## 💡 Tips Akses Bukti Transfer Google Drive (Bebas Login Selamanya)

Secara default, Google Form menyimpan bukti transfer pada folder yang berstatus *"Dibatasi"* (*Restricted*). Agar semua admin atau staf dapat melihat bukti transfer secara instan tanpa perlu menekan tombol login Google:

1. Buka [Google Drive](https://drive.google.com) dengan akun pemilik form (`doniesdaily@gmail.com`).
2. Cari folder tempat form menyimpan berkas unggahan (biasanya bernama *"Upload Bukti Pembayaran... (File responses)"*).
3. **Klik kanan** pada folder tersebut ➔ pilih **Bagikan (Share)**.
4. Pada **Akses umum (General access)**, ubah dari *"Dibatasi"* menjadi **"Siapa saja yang memiliki link"** dengan peran **"Pelihat (Viewer)"**.
5. Klik **Selesai**. Seluruh pratinjau bukti transfer akan langsung muncul secara otomatis di dashboard!

---

## 🛡️ Lisensi & Hak Cipta
Hak cipta © 2026 **LPK Indonesia Dignity** in official collaboration with **KLTC®**.  
Seluruh hak cipta dilindungi undang-undang.
