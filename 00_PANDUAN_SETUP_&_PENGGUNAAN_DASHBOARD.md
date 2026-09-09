# 📘 PANDUAN PENGGUNAAN & SETUP DIGNITI ADMIN COMMAND CENTER
## Aplikasi Web Lokal Internal Tim EO: Sinkronisasi Google Sheets, Automasi Email & Live P&L
**Penyelenggara:** LPK Indonesia Digniti in Official Collaboration with KLTC®  
**Hotline Admin CS:** `+62 896-8107-7483` (Surakarta, Solo)  

---

## 1. Cara Menjalankan Aplikasi Web Admin

### Cara 1: Menggunakan Perintah Terminal (Rekomendasi)
Buka terminal / PowerShell di folder ini, lalu ketik:
```bash
npm run dev
```
Aplikasi akan langsung aktif di browser pada alamat:  
👉 **`http://localhost:8080`**

### Cara 2: Sekali Klik via Windows Batch File
Cukup klik dua kali (*double-click*) file:  
👉 **`buka_dashboard.bat`**  
Sistem akan otomatis membuka terminal, menjalankan server, dan meluncurkan Google Chrome / Microsoft Edge ke alamat dashboard.

---

## 2. Struktur Variabel Lingkungan (`.env`)

File `.env` di folder ini mengatur seluruh parameter integrasi:

```env
# 1. ID Google Spreadsheet Anda (dari URL spreadsheet)
GOOGLE_SPREADSHEET_ID=1A2B3C4D5E6F7G8H9I0J_DIGNITI_SHEET_ID
GOOGLE_SHEETS_TAB_REGISTRASI=DB_Registrasi_Webinar
GOOGLE_SHEETS_TAB_PRESENSI=DB_Presensi_&_Sertifikat

# 2. URL Web App Google Apps Script (Untuk Automasi Email & Sinkronisasi Dua Arah)
GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/AKfycbx_DIGNITI_GAS_DEPLOYMENT_ID/exec

# 3. Kontak Hotline WhatsApp Admin
ADMIN_WHATSAPP_NUMBER=6289681077483

# 4. Port Server Lokal
PORT=8080
```

---

## 3. Langkah Menghubungkan Google Sheets & Automasi Email

1. Buka file Google Spreadsheet Anda yang menampung respons Google Form pendaftaran.
2. Buat 2 Sheet dengan nama persis:
   * **`DB_Registrasi_Webinar`** (Menampung respons Google Form 1 Pendaftaran)
   * **`DB_Presensi_&_Sertifikat`** (Menampung respons Google Form 2 Presensi di Zoom)
3. Di Google Spreadsheet, klik menu: **Ekstensi ➔ Apps Script**.
4. Buka file `google_apps_script_backend.js` di folder ini, salin seluruh kodenya, lalu tempelkan (*paste*) ke editor Apps Script.
5. Klik ikon **Simpan (Disket)**.
6. Klik tombol **Deploy (Terapkan) ➔ New deployment (Penerapan baru)**.
7. Pilih jenis: **Web app (Aplikasi Web)**:
   * *Execute as:* **Me (Saya)**
   * *Who has access:* **Anyone (Siapa saja)**
8. Klik **Deploy**, izinkan akses akun Google (*Grant permissions*), lalu salin **Web App URL** yang muncul.
9. Tempelkan Web App URL tersebut ke:
   * File `.env` pada variabel `GOOGLE_APPS_SCRIPT_WEB_APP_URL`.
   * Atau langsung masukkan di Tab **⚙️ Konfigurasi .env & API** di dashboard web Anda.

---

## 4. Alur Kerja Operasional Harian Admin di Dashboard

### A. Verifikasi Pendaftar Baru (Pre-Event)
1. Buka dashboard `http://localhost:8080` ➔ Masuk ke tab **📋 Registrasi & Verifikasi**.
2. Klik tombol **🔄 Tarik Data Sheets (Live)** untuk menarik data transferan terbaru.
3. Klik tombol **👁️ Cek Bukti** untuk memeriksa mutasi bank / struk transfer peserta.
4. Jika uang sudah masuk, klik tombol hijau **✅ Lunas & Kirim**.
   * Status di Google Sheet otomatis berubah menjadi `LUNAS`.
   * Sistem Google Apps Script langsung mengirimkan **Email Resmi E-Ticket + Link Zoom + Link Grup WhatsApp** ke email peserta.
   * Status email otomatis berubah menjadi `✓ TERKIRIM`.
5. Jika butuh menyapa peserta di WhatsApp, klik tombol hijau **📲 WA** untuk membuka chat dengan draf teks tiket yang sudah otomatis terisi.

### B. Hari-H Webinar (Sabtu, 14 November 2026 - Pukul 11.35 WIB)
1. Setelah peserta mengisi formulir presensi di Zoom, buka tab **🎓 Presensi & E-Sertifikat**.
2. Klik tombol **⚡ Proses & Blast Semua Sertifikat**.
   * Nomor registrasi resmi diterbitkan (`LPK-DIGNITI/WEB-PS/XI/2026/001` dst).
   * Kode Kupon Rebate Rp 100.000 diterbitkan (`REBATE100K-001` dst).
   * Email resmi berisi E-Sertifikat dan Kupon Potongan Rp 100.000 terkirim ke seluruh peserta hadir.
3. Anda bisa mengklik tombol **🎓 Pratinjau PDF** pada nama peserta mana saja untuk melihat tampilan sertifikat berstempel emas dan mencetaknya langsung ke PDF (`Ctrl + P`).

### C. Pemantauan Finansial & Laba Bersih (Tab 3)
* Buka tab **💰 Monitor Finansial (P&L)**.
* Pilih opsi pembicara yang digunakan: **Mbak Diyah (Rp 2.500.000)** atau **Willy Tan (Rp 3.500.000)**.
* Dashboard akan menghitung pendapatan riil dari tiket yang berstatus LUNAS, mengurangkan biaya pembicara & Zoom, lalu menampilkan **Laba Bersih Riil** dan **Potensi Omzet Tambahan** dari konversi alumni ke Bootcamp Offline Sala View Hotel Solo!
