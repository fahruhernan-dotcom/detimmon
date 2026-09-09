# 📄 PRD 15: SECURITY ARCHITECTURE, RLS HARDENING & PUBLIC ENDPOINTS
## Dignity Event Operations Command Center

---

## 1. Ringkasan Eksekutif & Objektif Produk

### 1.1 Latar Belakang
Sistem Dignity Command Center melayani dua kelompok audiens dengan karakteristik keamanan yang bertolak belakang:
1. **Publik Eksternal (Unauthenticated):** Ribuan calon peserta yang mengakses landing page, mendaftar via wizard `/daftar`, melakukan absensi via `/presensi`, dan memverifikasi keaslian sertifikat via `/verify/:code`.
2. **Staf Operasional Internal (Authenticated):** Tim EO, Admin CS, Finance, dan Pimpinan yang mengelola mutasi uang, menerbitkan tiket, dan mengakses data identitas sensitif ribuan peserta.

Arsitektur sistem harus menjamin isolasi data yang kedap (*zero-leakage*), proteksi dari manipulasi kuota tiket/kupon (*race condition prevention*), serta perlindungan penuh terhadap kerentanan OWASP Top 10.

### 1.2 Sasaran Keamanan (Security Goals)
1. **Pemisahan Batas Sistem (Security Perimeter Decoupling):** Memisahkan akses publik tanpa otentikasi dari portal staf internal yang terlindungi gerbang tersembunyi (*stealth gateway*).
2. **Penegakan Row Level Security (RLS) PostgreSQL:** Seluruh 26 tabel database Supabase wajib menerapkan kebijakan RLS ketat. Peran `anon` tidak boleh membaca langsung tabel pendaftar.
3. **Pemberkasan Aman Bukti Transfer:** Membatasi unggahan bukti bayar hanya untuk ekstensi gambar/dokumen resmi dengan batas ukuran `5 MB` di Supabase Storage.
4. **Integritas Transaksi Finansial & Idempotensi Kupon:** Mencegah *double-spending* voucher rebate dan duplikasi nomor tiket menggunakan *pessimistic locking* (`FOR UPDATE`) pada Stored Procedures (RPC).

---

## 2. Pemetaan Batas Rute Publik vs Internal

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC UNPROTECTED ZONE                         │
│  • Dynamic Landing Page:        / atau /event/:slug                    │
│  • Public Registration Wizard:  /daftar atau /register                 │
│  • Public Attendance Intake:    /presensi atau /absen                  │
│  • Public Verification Portal:  /verify/:code                          │
│                                                                        │
│  * Interaksi database HANYA melalui Stored Procedures (RPC):           │
│    - submit_web_registration()                                         │
│    - submit_public_attendance()                                        │
│    - verify_certificate_public()                                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Stealth Admin Entry
                     (Ctrl+Shift+A / #/portal-dignity)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       INTERNAL RESTRICTED ZONE                         │
│  • Admin Command Center:        /#/portal-dignity                      │
│  • Autentikasi Staf:            Supabase Auth / Google OAuth 2.0       │
│  • Akses Berbasis Peran:        6 Level RBAC (OWNER s/d AUDITOR)       │
│  • RLS Database:                Service Role & Authenticated Policies  │
│  • Forensik:                    Pencatatan Audit Trail Forensik        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Keamanan Storage (Supabase Storage Bucket)

### 3.1 Bucket `payment-proofs`
Menampung berkas tangkapan layar struk transfer bank dari peserta pendaftar:
- **Kebijakan Akses:** `Private` (Tidak dapat di-browse publik secara bebas). Hanya staf terotentikasi atau pemegang token bertanda tangan (*Signed URL*) yang dapat membuka berkas.
- **Batasan MIME Type:** HANYA mengizinkan `image/jpeg`, `image/png`, `image/webp`, dan `application/pdf`.
- **Maksimum Ukuran:** `5.242.880 bytes` (5 MB per berkas).
- **Format Penamaan Path:**  
  `proofs/{event_id}/{registration_id}_{timestamp}.{ext}`

### 3.2 Bucket `event-assets` & `certificates`
- Menampung aset visual logo acara, QRIS master, dan arsip PDF E-Sertifikat resmi.

---

## 4. Penegakan Row Level Security (RLS) PostgreSQL

Berdasarkan migrasi [`001_initial_schema.sql`](file:///d:/Dokumen/02_Kerja_Profesional/Pelatihan%20Publik%20Speaking/04_Sistem_Aplikasi_Web_Admin/supabase/migrations/001_initial_schema.sql), `006_fix_events_rls_and_update_rpc.sql`, dan `009_fix_public_registration_rls_and_tickets.sql`:

1. **Tabel `events`:**
   - Publik (`anon`): `SELECT` diizinkan hanya untuk baris dengan `is_active = true`.
   - Staf (`authenticated`): `SELECT`, `INSERT`, `UPDATE` sesuai peran RBAC.
2. **Tabel `registrations`, `persons`, `payments`:**
   - Publik (`anon`): **TIDAK ADA** hak akses langsung `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Pendaftaran baru wajib melalui RPC `submit_web_registration()` dengan klausul `SECURITY DEFINER`.
   - Staf (`authenticated`): Hak akses membaca dan memperbarui diverifikasi oleh tabel `staff_roles`.
3. **Tabel `vouchers`:**
   - Perlindungan anti-double-claim: RPC `redeem_voucher()` mengeksekusi `SELECT ... FOR UPDATE` dalam blok transaksi atomik. Jika kupon telah berstatus `REDEEMED`, transaksi di-rollback seketika.

---

## 5. Stealth Admin Access & Mekanisme Anti-Bruteforce

Untuk menjaga estetika minimalis bagi peserta umum yang membuka domain utama:
1. **Stealth Shortcut:** Menekan kombinasi tombol `Ctrl + Shift + A` atau `Ctrl + Alt + D` langsung mengarahkan tampilan ke gerbang otentikasi admin `#/portal-dignity`.
2. **Zero Default Admin Link:** Halaman depan publik tidak menampilkan tombol "Login Admin" mencolok yang mengundang upaya peretasan (*automated credential stuffing*).
3. **Rate Limiting & Session Eviction:** Percobaan autentikasi yang gagal secara berulang diblokir secara otomatis oleh Supabase Auth Rate Limiter.
