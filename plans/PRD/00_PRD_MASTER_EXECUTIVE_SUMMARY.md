# 🎯 PRD 00: MASTER EXECUTIVE SUMMARY & PRODUCT VISION
## Dignity Event Operations & Public Speaking Funnel Command Center

---

## 1. 🌟 Ringkasan Eksekutif (Executive Summary)

### 1.1 Latar Belakang & Identitas Produk
**Dignity Event Operations Command Center** adalah sistem manajemen operasional, finansial, dan komunikasi event end-to-end yang dibangun untuk mendukung eksekusi dua pilar acara utama LPK Indonesia Dignity (bekerja sama dengan KLTC®):
1. **Pre-Event Tripwire Webinar (Online):**  
   *Waktu:* Sabtu, 14 November 2026 | *Format:* Zoom Live Diagnostic | *Investasi:* Rp 100.000 / pax (atau Promo Mabar 6 Pax Rp 500.000).
2. **Core Offer Offline Bootcamp (2 Hari Tatap Muka):**  
   *Waktu:* 12–13 Desember 2026 | *Lokasi:* Ballroom Sala View Hotel Surakarta | *Lead Trainer:* Dr. K.R.H.T. Puguh Dwi Kuncoro, S.Psi., M.B.A., M.M. | *Investasi:* Rp 2.500.000 (Early Bird: Rp 1.950.000, Rombongan B2B: 10+1 Gratis).

### 1.2 Masalah Operasional yang Dipecahkan (The Problem)
* **Fragmentasi Data:** Data pendaftaran tersebar di Google Form mentah, Google Sheets, mutasi rekening bank mobile, dan chat WhatsApp personal CS.
* **Risiko Human Error:** Verifikasi bukti transfer manual rawan memicu tiket ganda (*double booking*), salah catat kode tiket, atau kehilangan jejak transfer unik.
* **Bottleneck Mabar (Grup):** Pembeli paket rombongan (misal 6 pax) seringkali hanya mendaftarkan 1 nama pemesan utama, sehingga 5 nama anggota lainnya hilang dari daftar presensi dan penerbitan sertifikat.
* **Blind Email Blasting:** Pengiriman massal email tiket/sertifikat sering kali terkirim ke orang yang belum bayar atau terkirim berulang kali (*spamming*).
* **Kebocoran Funnel Konversi:** Alumni webinar berbayar (Rp 100k) memiliki hak voucher rebate 100% (potongan Rp 100k untuk daftar bootcamp), namun tanpa sistem otomatis, voucher ini sering dipalsukan atau tidak terdistribusi dengan baik.

### 1.3 Solusi: Dignity Unified Command Center
Sistem ini bertindak sebagai **Pusat Komando Operasional Tunggal (*Single Source of Truth*)** dengan prinsip arsitektur:
* **Database-First PostgreSQL:** Seluruh status transaksi, tiket, rekening, dan konfigurasi hidup di Supabase, tanpa hardcode.
* **White Luxury Minimal Executive UI:** Antarmuka operasional berkelas tinggi dengan navigasi `sidebar-07` (shadcn-inspired), action inbox 30-detik, dan right-side detail drawer.
* **Integrasi Workspace Google 1-Klik:** Terhubung langsung ke Google Drive API (auto-generate folder event & backup bukti transfer) dan Gmail API OAuth 2.0 (tiket resmi & sertifikat instan).

---

## 2. 👥 Persona Pengguna & Aktor Sistem

| Persona / Aktor | Peran Utama | Kebutuhan Antarmuka |
| :--- | :--- | :--- |
| **Owner / Direktur Event** | Memantau laba bersih riil, arus kas inflow, konversi funnel, dan persetujuan kebijakan strategis. | Bento KPI Laba/Rugi, Real-time P&L vs Honor Pembicara, Audit Trail. |
| **Admin CS & Registrasi** | Memverifikasi pendaftar baru, mencocokkan mutasi bank, menghubungi peserta via WhatsApp 1-klik. | Action Inbox, Fast-Verify Modal, Right-side Drawer Profil 360. |
| **Finance Officer** | Rekonsiliasi mutasi rekening, verifikasi nominal unik, penyesuaian diskon/refund, dan rekonsiliasi vendor Sala View. | Payment Ledger, Payment Adjustments, Skenario BEP. |
| **Field Coordinator / PIC Lapangan** | Menangani alur check-in peserta di Ballroom Sala View Hotel, validasi QR tiket, pembagian kit pelatihan. | Dual-Checkpoint Attendance Scanner, Manual Override Presensi. |
| **Tim Kreatif & Komunikasi** | Mengatur template pesan resmi, memverifikasi tata letak email sebelum dikirim, memantau riwayat pengiriman. | Template Studio Editor Dual-Panel, Blast Center with Preview & Review. |
| **Peserta Publik** | Mendaftar acara, mengunggah bukti bayar, mengecek status tiket, memvalidasi keaslian sertifikat digital. | Public Registration Wizard, E-Ticket Mobile-Friendly, Public Verify Portal (`/verify`). |

---

## 3. 🎯 KPI & Metrik Kesuksesan Produk

1. **Kecepatan Verifikasi Transaksi:**  
   Waktu dari peserta submit bukti bayar hingga E-Ticket terkirim berkurang dari rata-rata 4 jam (manual WA) menjadi **< 60 detik** (Fast-Verify).
2. **Nol Tiket / Sertifikat Bodong (100% Data Integrity):**  
   Nomor tiket dan sertifikat dihasilkan secara deterministik dengan UUID dan hash checksum, divalidasi publik melalui portal `/verify`.
3. **Konversi Corong Funnel (Tripwire ke Bootcamp):**  
   Mencapai target konversi minimal **20% peserta webinar** mengambil tiket bootcamp tatap muka di Sala View dengan utilisasi voucher rebate Rp 100.000.
4. **Zero Blind-Blasting Incident:**  
   Sistem mewajibkan alur *Review & Approve* sebelum tombol blast Gmail aktif, mencegah salah sasaran pengiriman 100%.

---

## 4. 🗺️ Peta Navigasi & Hubungan Modul PRD

Dokumentasi spesifikasi teknis lengkap dibagi menjadi **17 Modul Spesifik** yang dikelompokkan ke dalam 2 sub-folder status implementasi:

```text
PRD 00: Master Executive Summary (Dokumen ini)
│
├── 📂 01_Telah_Diimplementasi/ (Fitur yang Sudah Aktif di Aplikasi Web)
│   ├── PRD 01: Core Architecture & Data Model (Supabase ERD 28 Tabel & RPCs)
│   ├── PRD 02: Authentication, RBAC & Forensic Audit Trail
│   ├── PRD 03: Event Portfolio & Funnel Chaining Engine
│   ├── PRD 04: Public Registration & Intake Engine (Wizard vs Sheets)
│   ├── PRD 05: Payment Ledger & Fast Verification Flow
│   ├── PRD 06: Ticket Management & Mabar Clustering (-A s/d -F)
│   ├── PRD 07: Dual-Checkpoint Attendance System (Pagi & Siang)
│   ├── PRD 08: Communication Engine & Template Studio
│   ├── PRD 09: Certificate Engine & Public Verification Portal
│   ├── PRD 10: Voucher Rebate & Funnel Conversion Engine
│   ├── PRD 11: Business Intelligence & Real-Time P&L Revenue
│   ├── PRD 12: Participant 360 Profile & Universal Detail Drawer (5 Zona Data)
│   ├── PRD 13: Google Workspace Two-Way Sync & External Sources Engine
│   ├── PRD 14: Master Configuration & Payment Accounts Engine (Multi-Bank & QRIS)
│   ├── PRD 15: Security Architecture, RLS Hardening & Public Endpoints
│   └── PRD 16: Interactive Rundown, Timeline & Stage Management Engine
│
└── 📂 02_Belum_Diimplementasi/ (Backlog & Roadmap Masa Depan)
    ├── PRD 17: B2B Corporate Invoice & Sponsorship Ledger (Backlog)
    ├── PRD 18: WhatsApp AI Support & Chatbot Intake (Backlog)
    └── PRD 19: Mobile Scanner Companion App PWA (Backlog)

Untuk peta jalan eksekusi bertahap (Fase 00 s/d Fase 19):
👉 Lihat: [plans/IMPLEMENTATION_PLAN.md](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/IMPLEMENTATION_PLAN.md)
```

