# 🎫 PRD 06: TICKET MANAGEMENT & MABAR CLUSTERING
## Tata Kelola Tiket Resmi, Klasterisasi Paket Mabar & Spesifikasi QR Code

---

## 1. 🎟️ Struktur & Format Penomoran Tiket

Setiap tiket yang terbit di Dignity Command Center memiliki identitas deterministik dan terproteksi dari pemalsuan.

### 1.1 Format Penomoran Kode Tiket
1. **Paket Tiket Individu (1 Pax):**
   * Format: `TKT-[YYYYMM]-[SEKUENSAL]`  
   * Contoh: `TKT-202611-0012`
2. **Paket Promo Mabar 5+1 Free (6 Pax Cluster):**
   * Format: `TKT-[YYYYMM]-[SEKUENSAL]-[SUBTIKET]`
   * Sub-tiket menggunakan sufiks alfabetis:
     * `TKT-202611-0045-A` (Pemesan Utama / Leader)
     * `TKT-202611-0045-B` (Anggota ke-2)
     * `TKT-202611-0045-C` (Anggota ke-3)
     * `TKT-202611-0045-D` (Anggota ke-4)
     * `TKT-202611-0045-E` (Anggota ke-5)
     * `TKT-202611-0045-F` (Anggota ke-6 / Free Pax)

---

## 2. 👥 Logika Klaster Mabar (`RegistrationMembersModal.jsx`)

### 2.1 Tantangan Operasional
Pada paket rombongan (Mabar), pemesan sering kali belum memiliki daftar lengkap 5 nama temannya saat melakukan transfer awal, atau ada teman yang berhalangan dan digantikan oleh orang lain pada hari-H.

### 2.2 Solusi Manajemen Anggota Mabar
* Admin dapat membuka **Modal Manajemen Anggota Mabar** kapan saja:
  * Melihat 6 slot tiket yang berada di bawah satu nomor registrasi induk.
  * Mengedit nama lengkap dan nomor WhatsApp masing-masing sub-tiket (`-A` s/d `-F`).
  * Mengirimkan E-Ticket langsung ke nomor WhatsApp atau email masing-masing anggota secara terpisah.
  * Menjamin saat presensi dan cetak sertifikat, nama yang tercetak adalah nama anggota aktual, bukan nama si pembeli paket mabar.

---

## 3. 📱 Spesifikasi Payload & Keamanan QR Code

Setiap tiket merender kode QR standar industri untuk dipindai oleh kamera panitia di pintu masuk:

### 3.1 Struktur Payload QR
```text
dignity://ticket/{ticket_id}?code={ticket_code}&event={event_id}&sig={hmac_sha256}
```

### 3.2 Lapisan Validasi Anti-Pemalsuan
* **Kamera Scanner Memvalidasi Tiga Kunci:**
  1. Apakah `event_id` cocok dengan event yang sedang berlangsung hari ini?
  2. Apakah signature `sig` valid (dibuat dari kombinasi kode tiket + secret key)?
  3. Apakah status tiket di database masih `ISSUED` (belum pernah check-in sebelumnya)?
* **Pencegahan Tiket Ganda (*Anti-Double Checkin*):**  
  Jika kode QR yang sama dipindai untuk kedua kalinya pada checkpoint yang sama, scanner langsung membunyikan alarm merah: **"PERINGATAN: Tiket sudah dipindai pada pukul HH:mm!"**.

---

## 4. 🔄 Siklus Hidup Status Tiket (Ticket Lifecycle)

```text
[ ISSUED ] ──(Scan Checkpoint 1)──> [ ATTENDED_CHECKPOINT_1 ]
                                              │
                                     (Scan Checkpoint 2)
                                              ▼
                                    [ FULLY_ATTENDED ]
                                              │
                                    (Penerbitan Sertifikat)
                                              ▼
                                    [ CERTIFICATE_ISSUED ]
```
* **Status `CANCELLED`:** Digunakan jika registrasi dibatalkan karena refund atau bukti transfer palsu. Tiket yang dibatalkan otomatis ditolak oleh scanner lapangan.
