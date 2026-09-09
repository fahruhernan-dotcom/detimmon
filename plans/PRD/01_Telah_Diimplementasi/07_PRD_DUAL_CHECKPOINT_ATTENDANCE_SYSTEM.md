# ⏱️ PRD 07: DUAL-CHECKPOINT ATTENDANCE SYSTEM
## Sistem Presensi Lapangan Dual-Checkpoint & Validasi Kelulusan

---

## 1. 🏛️ Konsep Dual-Checkpoint Presensi (Pagi & Siang)

Untuk menjamin mutu sertifikasi **Certified Public Speaking (LPK Indonesia Dignity in Official Collaboration with KLTC®)**, kehadiran peserta tidak cukup hanya di awal acara. Sistem menerapkan **Dual-Checkpoint Attendance** (Migration `007`):

```text
┌──────────────────────────────────────┐  ┌─────────────────────────────────┐
│     CHECKPOINT 1: SESI PAGI          │  │     CHECKPOINT 2: SESI SIANG      │
│  - Jam: 08.00 - 08.45 WIB            │  │  - Jam: 12.45 - 13.15 WIB (Post-Ishoma│
│  - Tujuan: Registrasi ulang &        │  │  - Tujuan: Verifikasi kesiapan lab│
│    pembagian Training Kit (Totebag,  │  │    praktik & evaluasi kompetensi. │
│    Modul Spiral, Name Tag Sala View).│  │  - Syarat mutlak klaim sertifikat.│
└──────────────────────────────────────┘  └─────────────────────────────────┘
```

---

## 2. 📱 Tiga Moda Antarmuka Presensi

### 2.1 Moda 1: Kamera Scanner QR Cepat (Mobile Field Officer)
* Petugas lapangan di pintu ballroom Sala View Hotel membuka modul presensi di HP / tablet.
* Kamera secara aktif memindai QR code tiket peserta dalam jarak 10–30 cm.
* **Respon Visual & Audio Instan:**
  * **Hijau + Chime Positif:** Tiket valid, menampilkan nama peserta, nomor meja round-table, dan paket tiket.
  * **Merah + Buzzer Error:** Tiket tidak valid, salah event, atau sudah pernah check-in sebelumnya.

### 2.2 Moda 2: Manual Search & Check-in Table (`AttendanceView.jsx`)
* Jika layar ponsel peserta retak, kehabisan baterai, atau tiket tertinggal:
  * Petugas meja registrasi cukup mengetik 3 huruf pertama nama peserta atau nomor WhatsApp di kolom pencarian cepat.
  * Menampilkan tombol toggle 1-klik untuk mencatat kehadiran Sesi Pagi atau Sesi Siang beserta kolom catatan panitia (*notes*).

### 2.3 Moda 3: Form Presensi Publik Webinar Online (`PublicAttendanceForm.jsx`)
* Khusus sesi Webinar Online (14 November 2026):
  * Link dibagikan di kolom chat Zoom 15 menit sebelum webinar berakhir (`/attendance/:event_id`).
  * Peserta memasukkan kode tiket atau nomor WhatsApp untuk mencatat kehadiran live diagnostic dan mengisi kuesioner evaluasi.

---

## 3. 🎓 Kaitan Presensi dengan Penerbitan Sertifikat

1. **Aturan Kelulusan Otomatis (Eligibility Rule):**  
   Hanya peserta yang memiliki status `CHECKPOINT_1 = TRUE` dan `CHECKPOINT_2 = TRUE` yang namanya akan muncul di daftar antrean penerbitan sertifikat (*Eligible for Certificate*).
2. **Pencegahan Sertifikat Siluman:**  
   Sistem secara otomatis mengunci tombol penerbitan sertifikat untuk peserta yang tidak pernah hadir di lapangan, menjaga kredibilitas akreditasi LPK Dignity dan KLTC®.
