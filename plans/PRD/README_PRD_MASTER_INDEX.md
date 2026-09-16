# 📚 MASTER INDEX: COMPREHENSIVE PRD SUITE
## Dignity Event Operations & Public Speaking Funnel Command Center

---

## 🗺️ Peta Navigasi & Direktori Lengkap PRD

Seluruh spesifikasi teknis, arsitektur data, logika bisnis, dan alur operasional sistem Command Center dikelompokkan secara terstruktur ke dalam dua sub-folder utama:
1. [**`01_Telah_Diimplementasi/`**](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/README.md) — 17 Modul PRD fitur yang sudah aktif berjalan di aplikasi.
2. [**`02_Belum_Diimplementasi/`**](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/02_Belum_Diimplementasi/README.md) — Modul PRD fitur masa depan / backlog terencana.

---

### 🌟 Dokumen Payung & Ringkasan Eksekutif
* [**`00_PRD_MASTER_EXECUTIVE_SUMMARY.md`**](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/00_PRD_MASTER_EXECUTIVE_SUMMARY.md) — Visi produk, latar belakang acara (Webinar 14 Nov & Bootcamp 12-13 Des), persona aktor pengguna, dan metrik KPI kesuksesan.

---

### ✅ Kategori 1: Modul yang Telah Diimplementasi (Sub-Folder: `01_Telah_Diimplementasi/`)

| No | Modul PRD | Topik & Ruang Lingkup Utama | Dokumen Spesifikasi | Status |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **Core Architecture & Data Model** | Arsitektur decoupled, ERD 26 tabel Supabase PostgreSQL, Stored Procedures (RPCs), dan RLS. | [📄 PRD 01](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/01_PRD_CORE_ARCHITECTURE_&_DATA_MODEL.md) | ✅ Active |
| **02** | **Authentication, RBAC & Audit Trail** | Google OAuth 2.0, sesi owner permanen, 6 peran staf, penegakan navigasi, dan log forensik audit. | [📄 PRD 02](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/02_PRD_AUTHENTICATION_RBAC_&_AUDIT_TRAIL.md) | ✅ Active |
| **03** | **Event Portfolio & Funnel Chaining** | Multi-event context, chaining Webinar ke Bootcamp, Google Drive workspace generator 1-klik, dan landing page. | [📄 PRD 03](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/03_PRD_EVENT_PORTFOLIO_&_FUNNEL_CHAINING.md) | ✅ Active |
| **04** | **Public Registration & Intake Engine** | Public Wizard 4 langkah (`/register/:slug`), paket tiket individu vs mabar, upload bukti bayar, dan sync Sheets. | [📄 PRD 04](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/04_PRD_PUBLIC_REGISTRATION_&_INTAKE_ENGINE.md) | ✅ Active |
| **05** | **Payment Ledger & Verification Flow** | Dashboard mutasi kas masuk, Fast-Verify modal (<15 detik), alasan penolakan bayar, dan penyesuaian ledger. | [📄 PRD 05](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/05_PRD_PAYMENT_LEDGER_&_VERIFICATION_FLOW.md) | ✅ Active |
| **06** | **Ticket Management & Mabar Clustering** | Format kode tiket, klaster sub-tiket `-A` s/d `-F`, arsitektur payload QR code, dan lifecycle status tiket. | [📄 PRD 06](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/06_PRD_TICKET_MANAGEMENT_&_MABAR_CLUSTERING.md) | ✅ Active |
| **07** | **Dual-Checkpoint Attendance System** | Presensi Sesi Pagi & Siang, kamera mobile QR scanner, manual search override, dan syarat kelulusan sertifikat. | [📄 PRD 07](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/07_PRD_DUAL_CHECKPOINT_ATTENDANCE_SYSTEM.md) | ✅ Active |
| **08** | **Communication Engine & Template Studio** | Editor template dual-panel, token injeksi, alur anti-blind blast 9-tahap, dan pengiriman via Gmail API OAuth. | [📄 PRD 08](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/08_PRD_COMMUNICATION_ENGINE_&_TEMPLATE_STUDIO.md) | ✅ Active |
| **09** | **Certificate Engine & Public Verification** | Penomoran resmi LPK Dignity x KLTC®, injeksi template A4 lanskap, PDF ke Google Drive, dan portal publik `/verify`. | [📄 PRD 09](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/09_PRD_CERTIFICATE_ENGINE_&_PUBLIC_VERIFICATION.md) | ✅ Active |
| **10** | **Voucher Rebate & Funnel Conversion** | Mekanisme voucher rebate Rp 100k, RPC anti-double spend, lead scoring (HOT/WARM/COLD), dan pelacak konversi. | [📄 PRD 10](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/10_PRD_VOUCHER_REBATE_&_CONVERSION_ENGINE.md) | ✅ Active |
| **11** | **Business Intelligence & P&L Revenue** | Monitoring laba bersih real-time, HPP Sala View Hotel Solo, simulasi sensitivitas honor Mbak Diyah vs Willy Tan. | [📄 PRD 11](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/11_PRD_BUSINESS_INTELLIGENCE_&_PNL_REVENUE.md) | ✅ Active |
| **12** | **Participant 360 & Universal Detail Drawer** | Panel geser profil tunggal 520px, 5 zona kompartemen data, optimistic update, dan aksi cepat operator. | [📄 PRD 12](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/12_PRD_PARTICIPANT_360_&_UNIVERSAL_DRAWER.md) | ✅ Active |
| **13** | **External Sources & Sheets Sync Engine** | Sinkronisasi dua arah Google Sheets, Google Apps Script webhook, pemetaan header dinamis, dan mitigasi konflik. | [📄 PRD 13](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/13_PRD_EXTERNAL_SOURCES_&_SHEETS_SYNC_ENGINE.md) | ✅ Active |
| **14** | **Master Config & Payment Accounts** | Multi-rekening bank dinamis (BCA, Mandiri, QRIS), parameter sistem, integrasi Google Workspace & WhatsApp CS. | [📄 PRD 14](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/14_PRD_SYSTEM_SETTINGS_&_PAYMENT_ACCOUNTS.md) | ✅ Active |
| **15** | **Security Architecture & Public Endpoints** | Proteksi boundary rute publik vs stealth admin portal (`Ctrl+Shift+A`), RLS 28 tabel, MIME storage, row locking. | [📄 PRD 15](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/15_PRD_SECURITY_HARDENING_&_PUBLIC_ENDPOINTS.md) | ✅ Active |
| **16** | **Interactive Rundown & Stage Management** | Multi-day schedule, live countdown, dynamic shift timeline, checklist panggung, fullscreen dark teleprompter. | [📄 PRD 16](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/16_PRD_INTERACTIVE_RUNDOWN_&_STAGE_MANAGEMENT.md) | ✅ Active |
| **17** | **High-Converting Accessible Public Landing & Event Showcase** | Standarisasi antarmuka ramah usia 50+ (Senior-Friendly UI/UX), showcase rundown multi-hari dari DB, kartu ringkasan vital acara (5W1H), dan floating bantuan WhatsApp. | [📄 PRD 17](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/17_PRD_HIGH_CONVERTING_ACCESSIBLE_PUBLIC_LANDING_&_EVENT_SHOWCASE.md) | ✅ Active |
| **CJ** | **End-to-End Customer Journey & User Lifecycle Flow** | Arsitektur lengkap alur calon peserta: Discovery ramah 50+, Intake 4-langkah, Tata Kelola Bukti GDrive, Verifikasi <15s, Presensi Ganda Hari-H, Sertifikat LPK Dignity x KLTC®, Portal Verifikasi /verify, hingga Voucher Rebate Rp 100k. | [📄 PRD Customer Flow](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/PRD/01_Telah_Diimplementasi/PRD_END_TO_END_CUSTOMER_JOURNEY_&_USER_FLOW.md) | ✅ Active |

---

### ⏳ Kategori 2: Modul Belum Diimplementasi (Sub-Folder: `02_Belum_Diimplementasi/`)

| No | Modul PRD Calon | Topik & Ruang Lingkup Utama | Dokumen Spesifikasi | Prioritas |
| :---: | :--- | :--- | :--- | :---: |
| **18** | **B2B Corporate Invoice & Sponsorship** | Penagihan resmi institusi, universitas, & instansi pemerintah dengan faktur pajak & kwitansi bermaterai. | *Backlog* | 🟡 Sedang |
| **19** | **WhatsApp AI Support & Chatbot Intake** | Auto-responder AI 24/7 penjawab FAQ pendaftaran dan konfirmasi pembayaran WhatsApp otomatis. | *Backlog* | 🟡 Sedang |
| **20** | **Mobile Scanner Companion App (PWA)** | Web app PWA mandiri untuk panitia lapangan scan QR tiket di pintu masuk dengan kamera HP. | *Backlog* | 🟢 Rendah |

---

## 🚀 Dokumen Rencana Implementasi Terpadu

Untuk peta jalan eksekusi bertahap (*phased delivery roadmap*) dari Fase 00 hingga Fase 19 yang merangkum seluruh PRD dan UI/UX Plan:
👉 Silakan buka: [**📋 MASTER IMPLEMENTATION PLAN (Roadmap)**](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/plans/IMPLEMENTATION_PLAN.md)

---

## 🔗 Matriks Pemetaan Kode Lengkap (Codebase Mapping)

```text
PRD 01, 02 & 15 (Core DB, Auth, RBAC, Security & Public Endpoints)
├── Migrasi Database: /supabase/migrations/001_initial_schema.sql s/d 009_*.sql
├── Context: /src/context/AuthContext.jsx
├── Public Routes: DynamicEventLandingPage.jsx, PublicRegistrationWizard.jsx, CertificateVerification.jsx
├── Secret Gateway: AdminLoginGate.jsx (Trigger: Ctrl+Shift+A atau #/portal-dignity)
└── RBAC View: /src/features/system/RbacManagementView.jsx & AuditLogView.jsx

PRD 03 (Event Portfolio & Chaining)
├── Context: /src/context/EventContext.jsx
├── UI Views: /src/features/events/EventsPortfolioView.jsx, EventSelector.jsx
└── Chaining Banner: App.jsx (Header navigasi Acara Induk ➔ Acara Lanjutan)

PRD 04, 05 & 12 (Registration, Payment Ledger & Participant 360)
├── Wizard: /src/features/public_registration/PublicRegistrationWizard.jsx
├── Universal Drawer: /src/components/ParticipantDetailDrawer.jsx
├── Profile Modal: /src/features/registrations/ParticipantProfile360Modal.jsx
├── Services: /src/services/registrationService.js, paymentService.js
└── Modals: /src/features/payments/FastVerifyModal.jsx, PaymentLedgerModal.jsx, ProofModal.jsx

PRD 06 & 07 (Tickets, Mabar, Attendance)
├── Views: /src/features/tickets/TicketsView.jsx, AttendanceView.jsx
├── Modals: /src/features/registrations/RegistrationMembersModal.jsx, TicketPreviewModal.jsx
└── Public Form: /src/features/public_registration/PublicAttendanceForm.jsx

PRD 08 (Communication & Template Studio)
├── Studio: /src/features/templates/TemplateStudioView.jsx
├── Preview: /src/features/communication/EmailLayoutVerificationView.jsx, EmailPreviewModal.jsx
├── Blaster: /src/features/communication/CommunicationCenter.jsx, CreateBlastModal.jsx
└── Services: /src/services/googleApiService.js, communicationService.js

PRD 09 (Certificates & Verification)
├── Views: /src/features/certificates/CertificatesView.jsx
├── Portal: /src/features/verify/CertificateVerification.jsx
└── Services: /src/services/certificateService.js

PRD 10 & 11 (Vouchers, Funnel Conversion, P&L)
├── Views: /src/features/vouchers/VoucherManagementView.jsx, ConversionView.jsx
├── P&L: /src/features/business/BusinessIntelligenceView.jsx, FinancialPnl.jsx
└── Services: /src/services/financialService.js

PRD 13 & 14 (Two-Way Sheets Sync & System Settings)
├── Sync UI: /src/components/SyncDashboard.jsx, ExternalSourceModal.jsx
├── Config UI: /src/components/ConfigModal.jsx
├── Webhook GAS: /google_apps_script_backend.js
└── Services: /src/services/sheetsService.js, syncService.js, paymentAccountService.js

PRD 16 (Interactive Rundown, Live Pacing & Stage Management Engine)
├── Migrasi Database: /supabase/migrations/010_interactive_rundown_and_stage_management.sql, 011_*.sql
├── Backend Service:  /src/services/rundownService.js
├── CSV & Excel Tool: /src/utils/csvRundownHelper.js
├── UI Command Center:/src/features/rundown/RundownStageView.jsx
├── Subkomponen Live: /src/features/rundown/LivePacingBar.jsx, TeleprompterModal.jsx
├── Modals:           /src/features/rundown/ShiftTimelineModal.jsx, ScheduleItemModal.jsx, ImportRundownModal.jsx
└── Navigasi & App:   /src/components/nav-main.jsx (Tab rundown), /src/App.jsx

PRD 17 (High-Converting Accessible Public Landing & Event Showcase Engine)
├── Halaman Publik:   /src/features/landing/DynamicEventLandingPage.jsx (Rute: / atau /event/:slug)
├── 5W1H Vital Card:  /src/features/landing/EventVitalCard.jsx (Venue dinamis, Google Maps, Sisa Kuota)
├── Live Rundown View:/src/features/landing/PublicRundownShowcase.jsx (Jadwal real-time dari DB)
└── Floating Bantuan: /src/features/landing/FloatingWhatsAppButton.jsx (Chat WA panitia 1-klik)
```

