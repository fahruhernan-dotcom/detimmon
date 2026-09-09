# Dignity Admin & Public Web Rules

## STRICT POLICY: DILARANG HARDCODE & MOCKUP DATA DI FILE KODE
1. **Single Source of Truth:** Seluruh data (Events, Registrants, Payments, Vouchers, Bank Accounts, Web Registration Config) harus bersumber dari **PostgreSQL Supabase**.
2. **Dilarang Menulis Array Mock:** Hapus dan jangan pernah buat array statis seperti `DEFAULT_CHAINED_EVENTS` atau mock registrants di file kode.
3. **Dilarang Menyimpan Replika DB di `localStorage`:** Tidak boleh melakukan `localStorage.setItem('digniti_events_portfolio')`. State harus selalu live dari query database.
4. **Semua Konfigurasi Masuk ke Kolom Database:** Rekening bank, waktu acara, harga tiket, kuota, URL WA, dan status buka/tutup pendaftaran disimpan di kolom tabel `events` (`web_registration_config`).
5. **Error Checking Wajib:** Setiap panggilan ke Supabase (`.update()`, `.insert()`, `.rpc()`) wajib mengecek `{ error }`. Jangan tampilkan notifikasi sukses jika database menolak transaksi.
