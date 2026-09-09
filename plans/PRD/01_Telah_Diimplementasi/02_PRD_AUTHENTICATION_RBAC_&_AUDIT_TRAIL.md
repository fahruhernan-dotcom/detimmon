# 🔐 PRD 02: AUTHENTICATION, RBAC & FORENSIC AUDIT TRAIL
## Manajemen Hak Akses Staf, Keamanan Sesi & Pelacakan Audit

---

## 1. 🛡️ Alur Autentikasi Staf (Staff Authentication Flow)

### 1.1 Dual-Gate Authentication
Sistem Dignity Command Center menerapkan mekanisme autentikasi berlapis:
1. **Google Workspace OAuth 2.0 (Primary):**
   * Staf login menggunakan akun Google resmi organisasi.
   * Mendapatkan token akses OAuth dengan cakupan (*scopes*):
     * `https://www.googleapis.com/auth/gmail.send` (Kirim blast tiket & sertifikat).
     * `https://www.googleapis.com/auth/drive.file` (Backup bukti bayar & generate folder event).
     * `https://www.googleapis.com/auth/spreadsheets` (Sinkronisasi Sheets legacy).
   * Token disimpan secara aman di `localStorage` (`dignity_google_token`) dan diperbarui secara otomatis tanpa meminta login berulang saat reload (`Ctrl + F5`).
2. **Admin Login Gate / Staff Session (`AdminLoginGate.jsx`):**
   * Gate keamanan internal aplikasi untuk memvalidasi apakah email Google terdaftar di tabel `profiles` dan memiliki peran aktif di `user_roles`.
   * **Super-Admin / Persistent Owner:** Akun owner resmi (`doniesdaily@gmail.com`) memiliki sesi persisten yang dijamin tidak pernah terkunci secara mendadak saat pemeliharaan server.

---

## 2. 🎭 Role-Based Access Control (RBAC) 6-Peran

Sistem membagi operasional menjadi 6 peran tegas yang dikelola melalui tabel `roles` dan `user_roles`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HIERARKI PERAN (RBAC)                           │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ PERAN (ROLE)      │ HAK AKSES DAN CAKUPAN MODUL OPERASIONAL                 │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 👑 OWNER          │ Akses tak terbatas: P&L finansial, honor trainer,       │
│                   │ pengelolaan RBAC staf, system settings, dan audit log. │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 🛡️ ADMIN          │ Registrasi peserta, verifikasi bayar, tiket, presensi,  │
│                   │ sertifikat, template studio, dan blast komunikasi.      │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 💳 FINANCE        │ Khusus verifikasi mutasi bank, fast-verify payment,     │
│                   │ rekonsiliasi kas, penyesuaian nominal, laporan revenue. │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 🎯 COORDINATOR    │ Manajemen portofolio event, jadwal kurikulum, link WA,   │
│                   │ penugasan trainer/pembicara, dan blast pengumuman.      │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 📱 FIELD OFFICER  │ Akses mobile lapangan: QR Attendance Scanner sesi pagi/ │
│                   │ siang, cek tiket di pintu ballroom Sala View Hotel.     │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 📜 AUDITOR        │ Akses Read-Only: Seluruh log audit, mutasi pembayaran,  │
│                   │ dan riwayat penerbitan tiket/sertifikat tanpa aksi edit.│
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### 2.1 Penegakan Akses pada UI (UI Enforcement)
* Navigasi `sidebar-07` memfilter item menu secara dinamis berdasarkan array peran pengguna:
  ```javascript
  const canAccessFinance = ['owner', 'finance'].includes(currentUserRole);
  const canAccessRBAC = currentUserRole === 'owner';
  ```
* Aksi tombol sensitif (seperti: *Delete Registrant*, *Reject Payment*, *Override Ticket*) dilindungi oleh permission guard pada level komponen dan Stored Procedure database.

---

## 3. 🔍 Sistem Forensik Audit Trail (`audit_logs`)

Setiap tindakan staf yang mengubah state data sistem dicatat secara otomatis, permanen, dan tidak dapat dimanipulasi (*immutable append-only log*).

### 3.1 Skema Data Log Audit
Setiap entri log di tabel `audit_logs` menyimpan:
* `id`: UUID unik entri audit.
* `user_id`: UUID staf pelaksana aksi.
* `user_email`: Email staf (misal: `operator@dignity.id`).
* `action`: Tipe tindakan (daftar lengkap di bawah).
* `entity_type`: Tabel atau domain objek yang diubah (`REGISTRATION`, `PAYMENT`, `TICKET`, `ATTENDANCE`, `CERTIFICATE`, `VOUCHER`, `CONFIG`).
* `entity_id`: ID rekaman yang dimodifikasi.
* `before_state`: Snapshot JSON data sebelum diubah.
* `after_state`: Snapshot JSON data setelah diubah.
* `ip_address` & `user_agent`: Data perangkat staf untuk kebutuhan investigasi keamanan.
* `created_at`: Timestamp waktu presisi tinggi.

### 3.2 Daftar Aksi yang Wajib Tercatat di Audit Log
1. `AUTH_LOGIN` / `AUTH_LOGOUT`: Sesi masuk dan keluar staf.
2. `PAYMENT_VERIFY`: Verifikasi mutasi lunas dan penerbitan tiket otomatis.
3. `PAYMENT_REJECT`: Penolakan transfer disertai alasan spesifik.
4. `PAYMENT_ADJUST`: Modifikasi nilai nominal tiket atau penyesuaian kode unik.
5. `MEMBER_OVERRIDE`: Penambahan atau penggantian nama anggota mabar.
6. `ATTENDANCE_CHECKIN`: Presensi berhasil (baik via QR scanner maupun manual).
7. `CERTIFICATE_ISSUE`: Penerbitan nomor sertifikat resmi.
8. `BLAST_DISPATCH`: Eksekusi pengiriman massal email tiket/sertifikat.
9. `EVENT_CONFIG_UPDATE`: Perubahan jam acara, kuota, atau status buka/tutup pendaftaran.
