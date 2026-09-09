# 🎓 PRD 09: CERTIFICATE ENGINE & PUBLIC VERIFICATION PORTAL
## Mesin E-Sertifikat Terakreditasi, Injeksi Dinamis & Portal Validasi Publik

---

## 1. 📜 Tata Kelola Penomoran Sertifikat Resmi

Sertifikat yang diterbitkan adalah sertifikasi resmi hasil kolaborasi **LPK Indonesia Dignity dan KLTC® (Kuncoro Leadership & Training Center)**:

### 1.1 Format Standar Penomoran Sertifikat
```text
CERT/DIGNITY-KLTC/[YYYY]/[KODE_EVENT]/[NOMOR_URUT]
```
* **Contoh Sertifikat Webinar:** `CERT/DIGNITY-KLTC/2026/WBN-PS/0085`
* **Contoh Sertifikat Bootcamp:** `CERT/DIGNITY-KLTC/2026/BTC-PS/0024`

Setiap nomor dijamin unik dan dihasilkan secara sekuensial melalui Stored Procedure PostgreSQL untuk mencegah nomor ganda (*zero collision guarantee*).

---

## 2. 🎨 Mesin Injeksi Template Dinamis (Dynamic Rendering)

Desain sertifikat mengacu pada master template A4 Lanskap eksekutif (`05_DESAIN_E_SERTIFIKAT_WEBINAR.html`):
* **Elemen yang Diinjeksi Secara Dinamis:**
  1. **Nama Lengkap & Gelar:** Dicetak dengan tipografi elegan (*Playfair Display* / *Great Vibes*), mendukung sanitasi gelar profesional.
  2. **Predikat Kelulusan:** *"Sebagai Peserta Aktif & Lulus Uji Kompetensi Dasar Public Speaking"*.
  3. **Nomor Sertifikat & Tanggal Terbit:** Dicetak di area bawah sertifikat.
  4. **Tanda Tangan & Segel Resmi:** Menampilkan tanda tangan digital Dr. K.R.H.T. Puguh Dwi Kuncoro, S.Psi., M.B.A., M.M. beserta segel emas resmi LPK Dignity.
  5. **Dynamic QR Code:** Kode QR resolusi tinggi yang mengarah langsung ke halaman verifikasi online.
* **Format Output & Penyimpanan:**  
  File dikonversi menjadi PDF siap cetak (300 DPI) dan diunggah otomatis ke Google Drive event di subfolder `03_E_Sertifikat_Terbit_PDF/`.

---

## 3. 🔍 Portal Verifikasi Publik (`CertificateVerification.jsx` di `/verify`)

Peserta, pimpinan instansi, maupun pihak HRD dapat memverifikasi keaslian sertifikat kapan saja secara independen:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ LPK INDONESIA DIGNITY — PORTAL VERIFIKASI SERTIFIKAT RESMI               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Masukkan Nomor Sertifikat: [ CERT/DIGNITY-KLTC/2026/BTC-PS/0024 ]  [CARI]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ HASIL VERIFIKASI SISTEM:                                                    │
│                                                                             │
│  STATUS: ✅ RESMI & TERDAFTAR                                               │
│                                                                             │
│  - Nama Pemilik: Bpk. Muhammad Arifin, S.T., M.M.                           │
│  - Program: Certified Basic & Intermediate Public Speaking Bootcamp         │
│  - Durasi / Beban Belajar: 16 Jam Pelatihan (JP) Tatap Muka                 │
│  - Tanggal Pelaksanaan: 12 - 13 Desember 2026                               │
│  - Lokasi Acara: Ballroom Sala View Hotel, Surakarta                        │
│  - Lead Trainer: Dr. K.R.H.T. Puguh Dwi Kuncoro (KLTC®)                     │
│  - Penerbit: LPK Indonesia Dignity                                          │
│                                                                             │
│  [📥 Unduh Salinan PDF Asli dari Google Drive]                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

Jika sertifikat tidak terdaftar atau telah dibatalkan, sistem menampilkan banner merah tegas: **"Sertifikat Tidak Ditemukan atau Tidak Valid"**.
