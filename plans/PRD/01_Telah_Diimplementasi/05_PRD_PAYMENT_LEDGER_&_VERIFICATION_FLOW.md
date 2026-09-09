# 💳 PRD 05: PAYMENT LEDGER & VERIFICATION FLOW
## Buku Besar Pembayaran, Verifikasi Cepat & Penanganan Bukti Transfer

---

## 1. 📊 Arsitektur Buku Besar Keuangan (Financial Inflow Ledger)

Modul **Payments** (`PaymentsView.jsx`) bertindak sebagai pusat kendali verifikasi mutasi kas masuk untuk setiap event.

### 1.1 Metrik Ringkasan Kas (Inflow Bento KPI)
1. **Total Kas Masuk Terverifikasi (Verified Inflow):** Akumulasi dana riil yang sudah valid di rekening bank.
2. **Menunggu Verifikasi (Pending Queue):** Jumlah transaksi dan estimasi nominal yang membutuhkan tindakan admin segera.
3. **Transaksi Ditolak (Rejected Count):** Jumlah bukti bayar tidak valid.
4. **Tingkat Kelunasan (Collection Rate):** Rasio transaksi lunas dibandingkan total registrasi masuk.

---

## 2. ⚡ Alur Kerja Fast-Verify Modal (`FastVerifyModal.jsx`)

Modal verifikasi cepat dirancang untuk memangkas waktu kerja staf finance dari hitungan menit menjadi **< 15 detik per transaksi**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ FAST VERIFY MODAL                                                           │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ PANEL KIRI: BUKTI TRANSFER           │ PANEL KANAN: DETAIL & AKSI VERIFIKASI│
│                                      │                                      │
│ [Pratinjau Gambar Bukti Bayar]       │ - No. Registrasi: REG-202611-0042    │
│ - Fitur Zoom In / Out                │ - Nama Pemesan: Bpk. Hendra Wijaya   │
│ - Rotasi Gambar (90° / 180°)         │ - Paket: Mabar 5+1 Free (6 Pax)      │
│ - Buka Asli di Storage / Drive       │ - Tagihan Sistem: Rp 500.854         │
│                                      │ - Nominal Transfer: [Rp 500.854]     │
│                                      │ - Rekening Tujuan: BCA - 0461829...  │
│                                      │                                      │
│                                      │ [❌ TOLAK BUKTI]    [✅ VERIFIKASI]  │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### 2.1 Tahapan Saat Tombol "Verifikasi" Diklik:
1. **Pembaruan Status Database:**
   * Record `payments.status` diubah menjadi `VERIFIED`.
   * Record `registrations.payment_status` diubah menjadi `VERIFIED`.
   * Kolom `verified_by` mencatat staf aktif dan `verified_at` mencatat waktu verifikasi.
2. **Penerbitan Tiket Otomatis (Auto-Emission):**
   * Stored Procedure langsung memicu pembuatan record di tabel `tickets`.
   * Jika paket Individu: terbit 1 tiket (`TKT-XXXXXX`).
   * Jika paket Mabar 6 Pax: terbit 6 tiket berurutan (`TKT-XXXXXX-A` s/d `-F`).
3. **Backup Otomatis ke Google Drive:**
   * Script background mengunggah salinan gambar bukti transfer ke folder `01_Bukti_Transfer_Pembayaran/` di Google Drive event.
4. **Trigger Notifikasi E-Ticket:**
   * Modal menawarkan opsi pengiriman E-Ticket instan via Gmail API atau salin draf WhatsApp.

---

## 3. ❌ Alur Penolakan Pembayaran (Payment Rejection Flow)

Jika bukti transfer bermasalah, admin memilih tombol **Tolak Bukti**:
* **Daftar Alasan Standar:**
  1. *Bukti transfer buram / resolusi rendah sehingga detail teks tidak terbaca.*
  2. *Nominal transfer tidak sesuai dengan jumlah tagihan.*
  3. *Rekening bank tujuan salah (bukan rekening resmi LPK Indonesia Dignity).*
  4. *Bukti transfer terindikasi manipulasi / palsu.*
  5. *Alasan lainnya (Admin mengetik alasan spesifik).*
* **Dampak Sistem:**
  * Status transaksi berubah menjadi `REJECTED`.
  * Tiket **TIDAK TERBIT**.
  * Sistem secara otomatis menyusun tautan WhatsApp CS 1-klik yang memuat pesan penolakan sopan beserta instruksi upload ulang bukti yang benar ke nomor WhatsApp peserta.

---

## 4. 📝 Penyesuaian Buku Besar (`PaymentLedgerModal.jsx`)

Untuk mengakomodasi kasus khusus:
* Pembayaran tunai *on-the-spot* di lokasi Ballroom Sala View Hotel.
* Biaya transfer antar-bank atau selisih kode unik.
* Penyesuaian diskon khusus kemitraan instansi / B2B.
Admin dengan hak akses `finance` atau `owner` dapat mencatat record `payment_adjustments` dengan catatan audit wajib.
