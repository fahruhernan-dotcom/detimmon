# 📋 MASTER IMPLEMENTATION PLAN: DIGNITY EVENT COMMAND CENTER
## Comprehensive Phased Delivery Roadmap & System Execution Blueprint
**Penyelenggara:** LPK Indonesia Digniti in Official Collaboration with KLTC®  
**Basis Kode:** React (Vite + Tailwind CSS + shadcn) + Supabase PostgreSQL + Google APIs  
**Lokasi Dokumen:** `04_Sistem_Aplikasi_Web_Admin/plans/IMPLEMENTATION_PLAN.md`  
**Indeks PRD Terkait:** [`plans/PRD/README_PRD_MASTER_INDEX.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/README_PRD_MASTER_INDEX.md)

---

## 1. Visi Arsitektur & Prinsip Non-Negotiable

Master Implementation Plan ini merangkum peta jalan eksekusi bertahap (*phased delivery roadmap*) yang menyelaraskan **16 Modul PRD** dengan basis kode aplikasi web admin di `src/` serta kebutuhan operasional riil dari pilar acara:
1. **Pre-Event Tripwire Webinar Online:** Sabtu, 14 November 2026 (Zoom Live Diagnostic).
2. **Core Offer Offline Bootcamp Sala View Hotel Solo:** 12–13 Desember 2026 (2 Hari Tatap Muka).
3. **Corong Pemasaran & Bank Konten:** Target konversi 20–30% peserta webinar ke bootcamp menggunakan voucher rebate Rp 100.000.

### 5 Prinsip Mutlak Desain & Rekayasa:
1. **White Luxury Minimal:** Antarmuka operasional tenang, bersih (*calm*), berbasis permukaan putih/off-white dengan tipografi gelap tegas dan aksen emas (*restrained gold*) eksklusif Dignity. Hindari visual dashboard murah yang penuh warna-warni badge tak perlu.
2. **Strict Database-First SSOT:** Seluruh data peserta, pembayaran, status tiket, presensi, konfigurasi rekening, dan audit trail hidup di database Supabase PostgreSQL (26 tabel & 9 migrasi). Dilarang keras melakukan *hardcode* nilai atau bergantung pada cache *stale* `localStorage`.
3. **Action-Driven Ergonomics:** Layar utama menjawab pertanyaan eksekutif dalam 30 detik: *"Apa yang perlu saya tindak sekarang?"*. Interaksi detail didukung oleh panel geser sisi kanan (*right-side drawer* selebar 520px) tanpa me-reload tabel utama.
4. **Zero Blind-Blasting:** Pengiriman massal email tiket/sertifikat mewajibkan alur *Audience ➔ Template ➔ Preview ➔ Review ➔ Approval ➔ Queue ➔ Send ➔ Track ➔ Retry*.
5. **Decoupled Architecture:** Pemisahan tegas antara rute publik bebas akses (`/daftar`, `/presensi`, `/verify/:code`, landing page) dan portal komando staf internal yang dilindungi gerbang tersembunyi (*stealth gateway* `Ctrl + Shift + A` / `#/portal-dignity`).

---

## 2. Peta Jalan Eksekusi Bertahap (Phased Delivery Roadmap: Fase 00 s/d 18)

Setiap fase berikut dirancang modular dengan kriteria penerimaan (*acceptance criteria*) yang terukur dan memetakan langsung ke dokumen spesifikasi UI/UX di [`plans/UIUX PLAN/`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/UIUX%20PLAN/) serta modul PRD di [`plans/PRD/`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FONDASI & ARSITEKTUR SHELL                     │
│  [Phase 00] UI/UX Lock ────> [Phase 01] Foundation ────> [Phase 01.5]  │
│  (IA & Tokens)               (Design System)            (Comm Guard)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        OPERASIONAL INTI & PEMBAYARAN                   │
│  [Phase 02] Core Ops   ────> [Phase 03] Payments   ────> [Phase 04]    │
│  (Registrant Table)          (Fast-Verify Ledger)       (Ticket & Mabar│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     PRESENSI, SERTIFIKAT & WORKSPACE                   │
│  [Phase 05] Attendance ────> [Phase 06] Certificate ───> [Phase 07-08] │
│  (Dual-Checkpoint)           (Canva / SVG / Verify)     (Sheets & Drive│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      KOMUNIKASI, INTAKE & FUNNEL                       │
│  [Phase 09-10] Comms   ────> [Phase 11] Public Reg ────> [Phase 12-13] │
│  (Gmail OAuth & WA)          (Intake Wizard)            (Funnel & P&L) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       360 VIEW, TATA KELOLA & SCALE                    │
│  [Phase 14] 360 Drawer ────> [Phase 15-16] RBAC/Sec ───> [Phase 17-18] │
│  (Universal Drawer)          (Audit & RLS Shield)       (QA & Template)│
└────────────────────────────────────────────────────────────────────────┘
```

---

### Detail Spesifikasi Tiap Fase:

#### 🏛️ FASE 00: UI/UX Architecture Lock
- **Fokus Dokumen:** `PHASE_00_UI_UX_ARCHITECTURE_LOCK.md` | `PRD 00` & `PRD 01`
- **Cakupan Teknis:** Mengunci Information Architecture (IA), navigasi collapsible `sidebar-07` (shadcn), selektor context acara persisten, dan 7 hukum UX (*Hick's, Fitts's, Jakob's, Miller's, Von Restorff, Tesler's, Aesthetic-Usability*).
- **Status Kode:** Terimplementasi di `src/components/app-sidebar.jsx` dan `src/context/EventContext.jsx`.

#### 🎨 FASE 01: UI/UX Foundation & Design Tokens
- **Fokus Dokumen:** `PHASE_01_UI_UX_FOUNDATION.md`
- **Cakupan Teknis:** Konfigurasi token CSS Tailwind, palet *White Luxury Minimal* (latar putih bersih, border halus `slate-200`, aksen `amber-500` Dignity Gold), typography scale, dan komponen dasar UI (Button, Card, Dialog, Badge, Tooltip).
- **Status Kode:** Terimplementasi di `tailwind.config.js`, `src/index.css`, dan folder `src/components/ui/`.

#### 🛡️ FASE 01.5: Communication Delivery & Pre-Send Validation Guard
- **Fokus Dokumen:** `PHASE_01_5_UI_UX_COMMUNICATION_DELIVERY.md` | `PRD 08`
- **Cakupan Teknis:** Sistem pencegah *blind blast*. Membangun tahapan verifikasi sebelum email dikirim: Pratinjau layout responsif (desktop vs mobile), filter audiens exclude-sent, dan modal approval.
- **Status Kode:** Terimplementasi di `src/features/communication/EmailLayoutVerificationView.jsx`.

#### 📋 FASE 02: Core Operations & Registrants Management
- **Fokus Dokumen:** `PHASE_02_UI_UX_CORE_OPERATIONS.md` | `PRD 04`
- **Cakupan Teknis:** Tabel pendaftar utama dengan sticky header, filter instan (Status Bayar, Paket, Sesi), pencarian fuzzy multi-kolom, quick actions baris, dan ekspor CSV/Drive.
- **Status Kode:** Terimplementasi di `src/features/registrations/RegistrantsView.jsx` dan `src/components/RegistrantTable.jsx`.

#### 💳 FASE 03: Payments Ledger & Fast-Verify Flow
- **Fokus Dokumen:** `PHASE_03_UI_UX_PAYMENTS.md` & `PHASE_03_UI_UX_PAYMENT_LEDGER.md` | `PRD 05`
- **Cakupan Teknis:** Modal Fast-Verify (<15 detik), viewer bukti transfer beresolusi tinggi dengan zoom/rotasi, dialog penolakan terstruktur dengan alasan wajib, dan penyesuaian buku besar mutasi bank.
- **Status Kode:** Terimplementasi di `src/features/payments/FastVerifyModal.jsx`, `PaymentLedgerModal.jsx`, dan `ProofModal.jsx`.

#### 🎟️ FASE 04: Ticket Management & Mabar Clustering
- **Fokus Dokumen:** `PHASE_04_UI_UX_TICKET_MABAR.md` | `PRD 06`
- **Cakupan Teknis:** Generator nomor tiket deterministik, klaster sub-tiket mabar 5+1 gratis (`-A` s/d `-F`), preview kartu tiket digital, regenerasi QR payload, dan broadcast tiket massal.
- **Status Kode:** Terimplementasi di `src/features/tickets/TicketsView.jsx`, `TicketPreviewModal.jsx`, dan `RegistrationMembersModal.jsx`.

#### ⏱️ FASE 05: Dual-Checkpoint Attendance System
- **Fokus Dokumen:** `PHASE_05_UI_UX_ATTENDANCE.md` | `PRD 07`
- **Cakupan Teknis:** Pemindai kamera QR scanner responsif untuk handphone panitia lapangan, check-in ganda (Sesi 1 Pagi 08:30 & Sesi 2 Siang 13:00), manual search override, dan rekapitulasi persentase kehadiran real-time.
- **Status Kode:** Terimplementasi di `src/features/attendance/AttendanceView.jsx` dan `src/components/AttendanceSection.jsx`.

#### 🎓 FASE 06: Certificate Engine & Public Verification Portal
- **Fokus Dokumen:** `PHASE_06_UI_UX_CERTIFICATE.md` | `PRD 09`
- **Cakupan Teknis:** Mesin injeksi data dinamis ke template A4 Canva/SVG, penomoran resmi LPK Dignity x KLTC®, upload otomatis PDF ke Google Drive, dan portal publik verifikasi keaslian di `/verify/:code`.
- **Status Kode:** Terimplementasi di `src/features/certificates/CertificatesView.jsx`, `CertificateModal.jsx`, dan `src/features/verify/CertificateVerification.jsx`.

#### 🔄 FASE 07: Google Workspace Two-Way Sync Engine
- **Fokus Dokumen:** `PHASE_07_UI_UX_GOOGLE_WORKSPACE.md` | `PRD 13`
- **Cakupan Teknis:** Sinkronisasi dua arah real-time antara Google Sheets master pendaftaran/presensi dan Supabase PostgreSQL. Pemetaan kolom dinamis, webhook Apps Script, dan rekonsiliasi status `LUNAS` & `TERKIRIM`.
- **Status Kode:** Terimplementasi di `src/components/SyncDashboard.jsx`, `ExternalSourceModal.jsx`, `sheetsService.js`, dan `google_apps_script_backend.js`.

#### 📁 FASE 08: Google Drive Workspace Automation
- **Fokus Dokumen:** `PHASE_08_UI_UX_DRIVE.md` | `PRD 03`
- **Cakupan Teknis:** Pembuatan struktur hierarki folder Google Drive resmi untuk acara baru dengan 1-klik, upload arsip struk bukti bayar ke subfolder Drive, dan backup CSV pendaftar berkala.
- **Status Kode:** Terimplementasi di `src/services/googleApiService.js` fungsi `uploadBackupToDrive`.

#### 📧 FASE 09: Gmail Communication Engine
- **Fokus Dokumen:** `PHASE_09_UI_UX_GMAIL_COMMUNICATION_ENGINE.md` | `PRD 08`
- **Cakupan Teknis:** Integrasi Gmail API OAuth 2.0 resmi, pengiriman email transaksional tiket ber-QR code, pengiriman E-Sertifikat, antrian pengiriman (*rate-limited queue*), dan penanganan token refresh.
- **Status Kode:** Terimplementasi di `src/features/communication/CommunicationCenter.jsx` dan `googleApiService.js`.

#### 💬 FASE 10: WhatsApp Communication Gateway & Hotline CS
- **Fokus Dokumen:** `PHASE_10_UI_UX_WHATSAPP.md` | `PRD 14`
- **Cakupan Teknis:** Generator tautan obrolan prefilled WhatsApp resmi CS Solo (`+62 896-8107-7483`) untuk menyapa peserta, konfirmasi kekurangan transfer, dan mengirim pengingat H-1 webinar.
- **Status Kode:** Terimplementasi di utilitas `formatters.js` dan tombol kontak drawer.

#### 🌐 FASE 11: Public Registration & Dynamic Intake Wizard
- **Fokus Dokumen:** `PHASE_11_UI_UX_PUBLIC_REGISTRATION.md` | `PRD 04`
- **Cakupan Teknis:** Portal pendaftaran mandiri publik 4-tahap (`/daftar` atau `#/daftar`), pemilihan paket (Individu vs Mabar), form anggota grup dinamis, kalkulator harga otomatis, dan drag-and-drop upload bukti bayar ke Supabase Storage.
- **Status Kode:** Terimplementasi di `src/features/public_registration/PublicRegistrationWizard.jsx` dan `WebRegistrationSettingsView.jsx`.

#### 📈 FASE 12: Funnel Chaining & Voucher Rebate Tracker
- **Fokus Dokumen:** `PHASE_12_UI_UX_CONVERSION.md` | `PRD 10`
- **Cakupan Teknis:** Penautan funnel Acara Induk (Webinar 14 Nov) ke Acara Lanjutan (Bootcamp Sala View 12-13 Des). Pengelolaan voucher rebate Rp 100.000, lead scoring peserta (HOT / WARM / COLD), dan pelacak konversi ROI.
- **Status Kode:** Terimplementasi di `src/features/conversion/ConversionView.jsx` dan `VoucherManagementView.jsx`.

#### 📊 FASE 13: Business Intelligence & Real-Time P&L
- **Fokus Dokumen:** `PHASE_13_UI_UX_BUSINESS_INTELLIGENCE.md` | `PRD 11`
- **Cakupan Teknis:** Dashboard bento finansial eksekutif. Menghitung pemasukan riil dari tiket lunas, simulasi sensitivitas honor narasumber (Mbak Halimatus Sa'diyah Rp 2,5jt vs Willy Tan Rp 3,5jt), analisis margin Sala View Hotel, dan skenario BEP.
- **Status Kode:** Terimplementasi di `src/features/business/BusinessIntelligenceView.jsx` dan `src/components/FinancialPnl.jsx`.

#### 👤 FASE 14: Participant 360 Profile & Universal Detail Drawer
- **Fokus Dokumen:** `PHASE_14_UI_UX_PARTICIPANT_360.md` & `DRAWER_ANATOMY.md` | `PRD 12`
- **Cakupan Teknis:** Sliding drawer sisi kanan selebar 520px yang mengonsolidasikan 5 zona data: Status Header, Profil Diri & Instansi, Ledger Pembayaran & Bukti Struk, Sub-Tiket Mabar & Presensi Dual-Session, serta Histori Email Blast & Voucher Rebate.
- **Status Kode:** Terimplementasi di `src/components/ParticipantDetailDrawer.jsx`.

#### 🔐 FASE 15: Role-Based Access Control (RBAC) & Staff Security
- **Fokus Dokumen:** `PHASE_15_UI_UX_RBAC.md` | `PRD 02`
- **Cakupan Teknis:** Penegakan 6 tingkatan hak akses staf (OWNER, ADMIN, FINANCE, EVENT_COORDINATOR, FIELD_OFFICER, AUDITOR), restriksi navigasi tab, dan audit log forensik aktivitas mutasi data penting.
- **Status Kode:** Terimplementasi di `src/features/system/RbacManagementView.jsx` dan `src/context/AuthContext.jsx`.

#### 🛡️ FASE 16: Security Audit, RLS Policies & Storage Hardening
- **Fokus Dokumen:** `PHASE_16_UI_UX_SECURITY_AUDIT.md` | `PRD 15`
- **Cakupan Teknis:** Penerapan RLS ketat pada 26 tabel PostgreSQL, isolasi rute publik vs stealth admin shortcut (`Ctrl + Shift + A`), validasi MIME berkas unggahan bukti transfer (maks 5MB), dan transaksi aman `FOR UPDATE` anti race-condition.
- **Status Kode:** Terimplementasi di migrasi Supabase `001_initial_schema.sql` s/d `009_*.sql` dan `App.jsx`.

#### 🧪 FASE 17: QA, Stress Testing & Scalability Hardening
- **Fokus Dokumen:** `PHASE_17_UI_UX_QA_SCALE.md`
- **Cakupan Teknis:** Uji beban volume tinggi (1.000+ pendaftar), verifikasi state rendering bebas lag, pengujian pemadaman koneksi internet (*offline resilience*), dan validasi responsivitas di layar tablet/mobile panitia lapangan.
- **Status Kode:** Diuji melalui batching RPC Supabase dan pagination server-side.

#### 🎨 FASE 18: Template Studio & Dynamic Injections
- **Fokus Dokumen:** `PHASE_18_UI_UX_TEMPLATE_STUDIO.md` | `PRD 08`
- **Cakupan Teknis:** Editor template dual-panel visual untuk merancang draf pesan email dan broadcast WhatsApp, injeksi variabel dinamis (`{{nama}}`, `{{nomor_tiket}}`, `{{link_zoom}}`), dan versioning template.
- **Status Kode:** Terimplementasi di `src/features/templates/TemplateStudioView.jsx`.

#### ⏱️ FASE 19: Interactive Rundown & Stage Management Engine
- **Fokus Dokumen:** `PRD 16: Interactive Rundown, Timeline & Stage Management Engine` | Analisis Standar Dignity (`05_Referensi_Dokumen_Dignity/`)
- **Cakupan Teknis:** Modul timeline rundown multi-hari dan multi-track, pelacak hitungan mundur live session, tombol *Shift Timeline (+X min)* mitigasi delay, checklist alat panggung per sesi (sound, clicker, matras), dan teleprompter dark mode untuk meja MC/operator.
- **Status Kode:** Didesain pada PRD 16 untuk integrasi ke dalam dashboard tab `Schedule / Rundown`.

---

## 3. Integrasi Logika Operasional Lintas Pilar Acara

Master Implementation Plan ini menghubungkan modul perangkat lunak dengan dokumen kerja operasional riil di folder utama proyek:

| Pilar Acara | Dokumen Sumber Lapangan | Integrasi Teknis pada Aplikasi Web |
| :--- | :--- | :--- |
| **01. Webinar Pre-Event (14 Nov 2026)** | [`01_BLUEPRINT_&_RUNDOWN_WEBINAR.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/01_Webinar_Pre_Event_Online/01_BLUEPRINT_&_RUNDOWN_WEBINAR.md)<br>[`03_KOMPARASI_PEMBICARA_&_TOR_OUTREACH.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/01_Webinar_Pre_Event_Online/03_KOMPARASI_PEMBICARA_&_TOR_OUTREACH.md) | Form intake khusus tripwire, selektor narasumber live P&L (Mbak Diyah vs Willy Tan), timer countdown di landing page, dan auto-ticket Zoom link. |
| **02. Bootcamp Offline (12-13 Des 2026)** | [`01_MASTER_EVENT_BLUEPRINT.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Bootcamp_Offline/01_Konsep_&_Kurikulum/01_MASTER_EVENT_BLUEPRINT.md)<br>[`07_ANALISIS_HPP_KIT_&_SKENARIO_MINIMAL_10_PAX.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Bootcamp_Offline/02_Finansial_&_RAB/07_ANALISIS_HPP_KIT_&_SKENARIO_MINIMAL_10_PAX.md) | Dual-checkpoint scanner presensi Sala View Hotel, verifikasi kuota minimal 10-pax (HPP Kit Rp 680k/pax), dan pencetakan batch sertifikat tatap muka. |
| **03. Marketing & Corong Penjualan** | [`01_STRATEGI_FUNNEL_WEBINAR_KE_BOOTCAMP.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/03_Marketing_&_Corong_Penjualan/01_STRATEGI_FUNNEL_WEBINAR_KE_BOOTCAMP.md)<br>[`03_DAFTAR_LINK_PREFILLED_WHATSAPP_ADMIN.md`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/03_Marketing_&_Corong_Penjualan/03_DAFTAR_LINK_PREFILLED_WHATSAPP_ADMIN.md) | Penerbitan otomatis kupon rebate Rp 100.000 bagi alumni webinar yang hadir, lead scoring konversi, dan integrasi tautan chat WhatsApp admin CS. |
| **05. Referensi Dokumen Dignity** | [`05_Referensi_Dokumen_Dignity/01_Contoh_Rundown_Acara/`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/05_Referensi_Dokumen_Dignity/01_Contoh_Rundown_Acara/) | Analisis benchmark rundown multi-hari Poltekkes Palembang, matriks rotasi paralel 3 kelas, dan standarisasi checklist logistik panggung. |

---

## 4. Kriteria Kelulusan Sistem (Definition of Done)

Aplikasi Command Center dinyatakan siap pakai penuh (*Production Ready*) apabila:
1. **Verifikasi End-to-End Berhasil:** Calon peserta dapat mendaftar di `/daftar` ➔ mengunggah bukti transfer ➔ diverifikasi oleh admin di Fast-Verify Modal ➔ menerima email tiket ber-QR Code ➔ di-scan presensi saat acara ➔ menerima E-Sertifikat dan Kupon Rebate ➔ sertifikat dapat diverifikasi di `/verify/:code`.
2. **Nol Anomali Data:** Tidak ada data pendaftar yang hilang, dobel, atau tertimpa saat sinkronisasi dua arah Google Sheets dilakukan.
3. **Kepatuhan Privasi & Akses:** Tidak ada celah bagi pengguna publik untuk mengakses portal staf atau melihat data identitas peserta lain tanpa izin otentikasi.
4. **Dokumentasi Lengkap:** Seluruh 17 modul PRD, repositori referensi dokumen (`05_Referensi_Dokumen_Dignity`), dan berkas arsitektur tersinkronisasi tanpa ada `TODO` atau parameter palsu.
