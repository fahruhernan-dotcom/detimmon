# 🎟️ PRD 10: VOUCHER REBATE & FUNNEL CONVERSION ENGINE
## Mesin Kupon Diskon, Alur Rebate 100% & Pelacakan Konversi Funnel

---

## 1. 🌉 Strategi Jembatan Nilai (The Value Bridge)

Strategi bisnis utama dalam rangkaian acara ini adalah **Tripwire Funnel**:
* Peserta membayar **Rp 100.000** untuk mengikuti Webinar Pre-Event (14 November 2026).
* Peserta yang hadir dan menyelesaikan webinar berhak mendapatkan **Voucher Rebate 100% senilai Rp 100.000**.
* Voucher ini dapat digunakan sebagai potongan harga langsung saat mendaftar **Bootcamp Offline 2 Hari di Sala View Hotel Solo** (12–13 Desember 2026):
  * Harga Early Bird: Rp 1.950.000 ➔ Menjadi **Rp 1.850.000**.
  * Harga Normal: Rp 2.500.000 ➔ Menjadi **Rp 2.400.000**.
* **Dampak Psikologis:** Bagi peserta yang upgrade ke bootcamp, webinar pre-event menjadi seolah-olah **100% GRATIS**.

---

## 2. ⚙️ Arsitektur Penerbitan & Validasi Voucher (`vouchers`)

### 2.1 Format Kode Kupon
* Format: `REBATE100K-[ALPHANUMERIC-4]`  
* Contoh: `REBATE100K-9X7P`, `REBATE100K-M3K2`
* Dihasilkan secara deterministik oleh Stored Procedure PostgreSQL saat presensi webinar ditutup.

### 2.2 Keamanan & Anti-Double Spend (`redeem_voucher` RPC)
Untuk mencegah penggunaan voucher berulang kali:
1. Prosedur database melakukan row-level lock (`SELECT ... FOR UPDATE`).
2. Memverifikasi apakah `is_redeemed === false`.
3. Memeriksa apakah tanggal transaksi belum melampaui `expires_at` (12 Desember 2026).
4. Menandai `is_redeemed = true`, mencatat timestamp `redeemed_at`, dan menautkan ID registrasi bootcamp pada kolom `redeemed_in_registration_id`.

---

## 3. 📈 Dasbor Analitik Konversi (`ConversionView.jsx`)

Modul **Conversion** memantau efektivitas corong penjualan secara real-time:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNNEL CONVERSION MONITOR: WEBINAR ➔ BOOTCAMP SALA VIEW                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ 100 PAX ] Peserta Webinar Terdaftar (Inflow: Rp 10.000.000)               │
│     │                                                                       │
│     ▼ (Tingkat Kehadiran: 85%)                                              │
│ [  85 PAX ] Peserta Hadir & Menerima Voucher Rebate Rp 100.000              │
│     │                                                                       │
│     ▼ (Target Konversi: 20% - 25%)                                          │
│ [  20 PAX ] Alumni Webinar Upgrade ke Bootcamp Sala View Hotel              │
│     │                                                                       │
│     ▼ (Total Potongan Rebate: Rp 2.000.000)                                 │
│ [ 💰 RP 37.000.000 ] Tambahan Kas Masuk Bootcamp dari Corong Webinar        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Segmentasi Lead Scoring Alumni
Sistem secara otomatis mengelompokkan alumni webinar ke dalam 3 level prospek untuk difollow-up tim CS:
* 🔥 **HOT Leads:** Alumni yang sudah mengklaim voucher atau membuka form registrasi bootcamp.
* ⚡ **WARM Leads:** Alumni yang hadir penuh di webinar namun belum mengklik link voucher.
* ❄️ **COLD Leads:** Peserta terdaftar webinar yang tidak hadir saat sesi diagnostic.
