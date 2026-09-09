# 📄 PRD 12: PARTICIPANT 360 PROFILE & UNIVERSAL DETAIL DRAWER
## Dignity Event Operations Command Center

---

## 1. Ringkasan Eksekutif & Objektif Produk

### 1.1 Latar Belakang
Pada operasional penyelenggaraan acara berskala besar (*Webinar Pre-Event* 14 Nov 2026 dan *Bootcamp Offline Sala View* 12–13 Des 2026), admin CS dan tim lapangan sering kali harus memeriksa informasi peserta dari berbagai sudut pandang: status transfer, pembagian anggota mabar, presensi sesi pagi/siang, kelayakan sertifikat, hingga riwayat blast email. 

Membuka halaman terpisah atau memadati satu tabel baris (*dense table*) dengan puluhan kolom terbukti memperlambat waktu verifikasi dan meningkatkan risiko kesalahan operator.

### 1.2 Tujuan Produk (Product Goals)
1. **Single Source of Truth (SSOT) Peserta:** Mengonsolidasikan seluruh lifecycle data peserta ke dalam satu panel geser sisi kanan (*right-side drawer*) selebar 520px tanpa meninggalkan konteks tabel atau halaman aktif.
2. **Efisiensi Aksi Cepat (<10 Detik):** Memberikan akses 1-klik untuk tindakan kritikal: Cek & Verifikasi Bukti Bayar, Terbitkan/Kirim Ulang Tiket, Resend E-Sertifikat, dan Chat WhatsApp langsung via prefilled link.
3. **Optimistic UI Updates:** Perubahan status verifikasi atau tiket di dalam drawer langsung diperbarui seketika (*optimistic mutation*) pada tabel utama tanpa re-render penuh (*full page reload*).

---

## 2. Anatomi 5 Zona Data Drawer (Universal Drawer Anatomy)

Mengacu pada arsitektur [`DRAWER_ANATOMY.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/UIUX%20PLAN/DRAWER_ANATOMY.md) dan komponen [`ParticipantDetailDrawer.jsx`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/src/components/ParticipantDetailDrawer.jsx):

```text
┌────────────────────────────────────────────────────────────┐
│ 1. HEADER & STATUS CHIP                                    │
│    • Avatar / Inisial • Nama Peserta • ID Registrasi       │
│    • Badge Status (PENDING / VERIFIED / REJECTED / CONFIRMED)│
│    • Quick Actions: Fast Verify, WhatsApp, Close           │
├────────────────────────────────────────────────────────────┤
│ 2. IDENTITAS UTAMA & PROFIL PESERTA                        │
│    • Email • WhatsApp (Click-to-Chat)                      │
│    • Institusi / Perusahaan / Kampus • Profesi / Jabatan   │
│    • Domisili Asal • Waktu Pendaftaran Masuk               │
├────────────────────────────────────────────────────────────┤
│ 3. FINANSIAL & BUKU BESAR PEMBAYARAN                       │
│    • Paket Tiket (INDIVIDU Rp 100k / MABAR_6 Rp 500k)       │
│    • Nominal Ditagihkan & Nominal Terbayar                 │
│    • Thumbnail Bukti Transfer (Click-to-Zoom / ProofModal) │
│    • Staf Verifikator • Catatan Alasan Penolakan (Jika Ada)│
├────────────────────────────────────────────────────────────┤
│ 4. TIKET & PRESENSI DUAL-SESSION                           │
│    • Kode Tiket Utama & Sub-Tiket Mabar (-A s/d -F)        │
│    • Status Check-in Sesi 1 (Pagi) [Timestamp & Petugas]  │
│    • Status Check-in Sesi 2 (Siang) [Timestamp & Petugas] │
│    • Tombol Pratinjau Tiket Digital & QR Code Payload      │
├────────────────────────────────────────────────────────────┤
│ 5. HISTORI KOMUNIKASI, E-SERTIFIKAT & VOUCHER REBATE       │
│    • Log Pengiriman Email (Tiket, Reminder H-1, Sertifikat)│
│    • Nomor Seri Sertifikat Resmi LPK Dignity x KLTC®      │
│    • Kode Voucher Rebate Rp 100k (Khusus Alumni Webinar)   │
│    • Status Klaim Acara Lanjutan (Bootcamp Sala View)      │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Logika Interaksi & State Management

### 3.1 Kontrak Props Komponen
Komponen drawer dipasang secara persisten pada level layout `App.jsx` atau `RegistrantsView.jsx`:

```jsx
<ParticipantDetailDrawer
  participant={activeDrawerParticipant}
  isOpen={Boolean(activeDrawerParticipant)}
  onClose={() => setActiveDrawerParticipant(null)}
  onVerifyPayment={(id) => handleFastVerify(id)}
  onRejectPayment={(id, reason) => handleRejectPayment(id, reason)}
  onResendTicket={(p) => handleResendTicketEmail(p)}
  onResendCertificate={(p) => handleSendCertEmail(p)}
  onOpenLedger={(p) => setActiveLedgerRegistrant(p)}
  onOpenMembersModal={(p) => setActiveMabarRegistrant(p)}
  onUpdateParticipant={(updatedData) => handleOptimisticUpdate(updatedData)}
/>
```

### 3.2 Responsive & Keyboard Ergonomics
1. **Desktop (>1024px):** Panel menggeser dari sisi kanan dengan lebar tetap `520px`, latar belakang backdrop transparan dengan blur halus `backdrop-blur-xs`.
2. **Tablet / Mobile (<1024px):** Panel membuka penuh `100vw` (*sheet modal*), dengan header sticky dan tombol *Close* yang mudah dijangkau ibu jari (*Fitts's Law*).
3. **Keyboard Escape:** Menekan tombol `Esc` menutup drawer tanpa membatalkan mutasi data yang sudah berhasil disimpan.
4. **Preservasi Scroll:** Posisi scroll tabel induk dan filter pencarian tetap terjaga (*preserved state*) saat drawer ditutup.

---

## 4. Keamanan & Hak Akses (RBAC Alignment)

| Zona Informasi | OWNER / SUPER ADMIN | ADMIN CS | FINANCE | FIELD OFFICER | AUDITOR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Identitas & Kontak** | Full Access | Full Access | View Only | View Only | View Only |
| **Verifikasi Pembayaran** | Full Access | No (Read Only)| Full Access | No Access | Read Only |
| **Approval / Reject Bayar**| Full Access | No | Full Access | No Access | No Access |
| **Check-in Sesi Pagi/Siang**| Full Access | View Only | No Access | Full Access | View Only |
| **Terbitkan E-Sertifikat** | Full Access | Full Access | No Access | No Access | View Only |
| **Akses Voucher Rebate** | Full Access | Full Access | View Only | No Access | Read Only |

---

## 5. Metrik Kinerja & Acceptance Criteria

1. **Waktu Buka Drawer:** Rata-rata waktu rendering drawer adalah `< 150 ms` setelah baris tabel diklik.
2. **Zero Layout Shift:** Pembukaan drawer tidak menyebabkan tabel utama di sebelah kiri bergeser (*no horizontal jumping*).
3. **Data Freshness:** Saat drawer dibuka, sistem mengambil snapshot relasi terbaru dari Supabase (`registrations` join `payments`, `attendance_logs`, `registration_members`, `certificates`).
