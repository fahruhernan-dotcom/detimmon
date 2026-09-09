# 📊 PRD 11: BUSINESS INTELLIGENCE & REAL-TIME P&L REVENUE
## Analisis Laba Bersih, Simulasi Sensitivitas Finansial & Unit Economics

---

## 1. 💰 Arsitektur Kalkulasi Finansial Riil (`FinancialPnl.jsx`)

Sistem menyediakan dasbor monitoring finansial real-time yang menghitung laba/rugi bersih (*Net Profit*) secara dinamis berdasarkan mutasi kas riil:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💵 LAPORAN LABA RUGI DINAMIS (REAL-TIME P&L STATEMENT)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ (+) TOTAL PENDAPATAN KAS MASUK (INFLOW)                                      │
│     - Tiket Individu Terverifikasi:      Rp 15.000.000                      │
│     - Tiket Paket Mabar Terverifikasi:   Rp 20.000.000                      │
│     - Tiket B2B Korporat / Kemitraan:    Rp 12.500.000                      │
│     ──────────────────────────────────────────────────                      │
│     SUBTOTAL PENDAPATAN KOTOR:                              Rp 47.500.000   │
│                                                                             │
│ (-) BIAYA VARIABEL (HPP PER PAX)                                            │
│     - Paket Fullboard Meeting Sala View Hotel (Rp 700k/pax): Rp 14.000.000   │
│     - Training Kit Lengkap Vendor Solo (Rp 65k/pax):        Rp  1.300.000   │
│     - Sertifikat Fisik Emboss & Map (Rp 25k/pax):           Rp    500.000   │
│     ──────────────────────────────────────────────────                      │
│     SUBTOTAL BIAYA VARIABEL:                               (Rp 15.800.000)  │
│                                                                             │
│ (-) BIAYA TETAP OPERASIONAL (FIXED COSTS)                                   │
│     - Honor Lead Trainer (Dr. Puguh Dwi Kuncoro):           Rp 12.500.000   │
│     - Honor Fasilitator Pendamping (2 Orang):               Rp  1.000.000   │
│     - Sewa Kamar Trainer (2 Malam Sala View):               Rp  1.200.000   │
│     - Backdrop MMT (3x2m) & Signage:                        Rp    150.000   │
│     - Dokumentasi Video Before-After & Sound:               Rp  1.500.000   │
│     - Anggaran Meta Ads & Promosi WA:                       Rp  1.500.000   │
│     ──────────────────────────────────────────────────                      │
│     SUBTOTAL BIAYA TETAP:                                  (Rp 17.850.000)  │
│                                                                             │
│ (═) ESTIMASI LABA BERSIH BERSIH (NET OPERATING PROFIT):     Rp 13.850.000   │
│     MARGIN LABA BERSIH:                                     29.16%          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🎛️ Simulator Sensitivitas Honor Pembicara Webinar

Pada modul `BusinessIntelligenceView.jsx`, owner dan pimpinan dapat menguji kelayakan batas negosiasi honor pembicara webinar (14 Nov 2026):

| Parameter Komparasi | Opsi A: Mbak Halimatus Sa'diyah (Adikara) | Opsi B: Willy Tan (BraveSpeakers) |
| :--- | :--- | :--- |
| **Honor Pembicara (Estimasi)** | Rp 1.500.000 – Rp 2.000.000 | Rp 3.000.000 – Rp 4.500.000 |
| **Biaya Sewa Zoom 100 Pax** | Rp 15.000 (Harian) | Rp 15.000 (Harian) |
| **Budget Iklan Meta Ads** | Rp 500.000 | Rp 750.000 |
| **Insentif CS & Operasional** | Rp 200.000 | Rp 200.000 |
| **Titik Impas (BEP Pax @ Rp 100k)** | **23 – 28 Pax** | **40 – 55 Pax** |
| **Proyeksi Laba Bersih (50 Pax)** | **+Rp 2.785.000** | **+Rp 485.000** |
| **Proyeksi Laba Bersih (100 Pax)** | **+Rp 7.785.000** | **+Rp 5.485.000** |

---

## 3. 🏨 Unit Economics Bootcamp Sala View Hotel Solo

Kalkulator dinamis mengintegrasikan data penawaran resmi Ballroom Sala View Hotel:
* **HPP Variabel per Pax (2 Hari):**
  * Coffee Break (2x per hari @ Rp 50k x 2 hari) = Rp 200.000.
  * Lunch Buffet Eksklusif (1x per hari @ Rp 125k x 2 hari) = Rp 250.000.
  * Dinner (Khusus paket fullboard @ Rp 125k x 2 hari) = Rp 250.000.
  * Total Konsumsi Hotel = **Rp 700.000 / pax**.
* **HPP Training Kit Vendor UNS/Solo:**
  * Totebag Kanvas Sablon = Rp 25.000.
  * Modul Pelatihan Spiral Kawat A4 (Cover Doff) = Rp 25.000.
  * Blocknote & Pulpen Gel = Rp 10.000.
  * Name Tag Lanyard Hologram = Rp 5.000.
  * Total Kit = **Rp 65.000 / pax**.
* **Total HPP Dasar Peserta = Rp 765.000 / pax**.
* Dengan harga tiket Early Bird **Rp 1.950.000**, kontribusi margin kotor per peserta adalah **Rp 1.185.000 (60.7%)**, memberikan bantalan yang sangat aman untuk menutup biaya tetap trainer dan venue.
