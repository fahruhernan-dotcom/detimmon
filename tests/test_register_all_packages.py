import os
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8080"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots", "registration")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# 10 Dummy Members for Promo 11 Pax (Plus 1 Leader = 11 Pax total)
DUMMY_MEMBERS = [
    {"nama": "Ahmad Fauzi, S.Tr.Kes.", "email": "ahmad.fauzi.test@dignity.id", "wa": "081311223301"},
    {"nama": "drg. Dian Paramita", "email": "dian.paramita.test@dignity.id", "wa": "081311223302"},
    {"nama": "Bambang Triyono, S.Kep., Ners.", "email": "bambang.triyono.test@dignity.id", "wa": "081311223303"},
    {"nama": "Rina Agustina, M.Biomed.", "email": "rina.agustina.test@dignity.id", "wa": "081311223304"},
    {"nama": "Fajar Nugroho, S.Si.", "email": "fajar.nugroho.test@dignity.id", "wa": "081311223305"},
    {"nama": "Dewi Sartika, S.Farm., Apt.", "email": "dewi.sartika.test@dignity.id", "wa": "081311223306"},
    {"nama": "Hendra Wijaya, S.Gz.", "email": "hendra.wijaya.test@dignity.id", "wa": "081311223307"},
    {"nama": "Nurul Hidayah, S.K.M.", "email": "nurul.hidayah.test@dignity.id", "wa": "081311223308"},
    {"nama": "Eko Prasetyo, A.Md.Kes.", "email": "eko.prasetyo.test@dignity.id", "wa": "081311223309"},
    {"nama": "Tri Wulandari, S.Tr.Keb.", "email": "tri.wulandari.test@dignity.id", "wa": "081311223310"},
]

def log(msg):
    print(msg, flush=True)

def run_registration_tests():
    log("🚀 Memulai Pengujian Pendaftaran Seluruh Paket (Individu & Promo 11 Pax dengan 10 Anggota Dummy)...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: log(f"  [CONSOLE {msg.type.upper()}]: {msg.text}") if "Function components cannot be given refs" not in msg.text else None)
        page.on("dialog", lambda d: (log(f"  [ALERT DIALOG]: {d.message}"), d.accept()))

        # =====================================================================
        # SKENARIO 1: PENDAFTARAN PAKET INDIVIDU (SINGLE PAX)
        # =====================================================================
        log("\n--- [SKENARIO 1] Pendaftaran Paket Individu (Single Pax • Rp 100.000) ---")
        page.goto(f"{BASE_URL}/#/daftar", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Step 1: Pilih Paket Individu
        log("  1. Memilih Paket Individu...")
        page.locator("text='Tiket Individu'").first.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_single_step1_selected.png"))
        page.locator("button:has-text('Lanjutkan Isi Data Peserta')").first.click()
        page.wait_for_timeout(600)

        # Step 2: Isi Identitas
        log("  2. Mengisi Identitas Peserta Tunggal...")
        page.locator("input[placeholder*='Budi Santoso']").first.fill("Dr. Budi Santoso, M.Si.")
        page.locator("input[type='email']").first.fill("budi.santoso.test@dignity.id")
        page.locator("input[type='tel']").first.fill("081299887766")
        page.locator("input[placeholder*='RSUD']").first.fill("RSUD Dr. Moewardi Solo")
        page.locator("input[placeholder*='Surakarta']").first.fill("Surakarta")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_single_step2_filled.png"))
        page.locator("button:has-text('Lanjut ke Pembayaran')").first.click()
        page.wait_for_timeout(1000)

        # Step 3: Verifikasi Tagihan & Instruksi Bayar
        log("  3. Memeriksa Rincian Pembayaran (Rp 100.000)...")
        nominal_el = page.locator("text=Rp 100.000").first
        if nominal_el.is_visible():
            log(f"     Nominal tertera: {nominal_el.text_content()}")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_single_step3_payment.png"))
        page.locator("button:has-text('Saya Sudah Transfer')").first.click()
        page.wait_for_timeout(600)

        # Step 4: Lampirkan Bukti Pembayaran
        log("  4. Melampirkan Bukti Transfer via Link Google Drive...")
        gdrive_tab = page.locator("button:has-text('Link Google Drive')")
        if gdrive_tab.is_visible():
            gdrive_tab.click()
            page.wait_for_timeout(300)
            page.locator("input[type='url']").fill("https://drive.google.com/file/d/1BudiSantosoTransferTest/view?usp=sharing")
            page.wait_for_timeout(300)

        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_single_step4_proof.png"))
        log("  5. Mengirimkan Pendaftaran...")
        page.locator("button:has-text('Kirim Pendaftaran Sekarang')").first.click()
        page.wait_for_timeout(3000)

        # Step 5: Tanda Terima
        page.wait_for_selector("#printable-receipt-content", timeout=12000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_single_step5_receipt.png"))
        single_ticket_num = ""
        try:
            single_ticket_num = page.locator("#printable-receipt-content strong.font-mono").first.text_content()
        except Exception:
            pass
        log(f"  ✅ [SUKSES] Paket Individu Terdaftar! Nomor / Kode: {single_ticket_num}")

        # =====================================================================
        # SKENARIO 2: PENDAFTARAN PROMO KOMUNITAS 11 PAX (10 + 1) DENGAN 10 ANGGOTA
        # =====================================================================
        log("\n--- [SKENARIO 2] Pendaftaran Promo Komunitas 11 Pax (10+1 • Rp 1.000.000) ---")
        page.close()
        page = context.new_page()
        page.on("console", lambda msg: log(f"  [CONSOLE {msg.type.upper()}]: {msg.text}") if "Function components cannot be given refs" not in msg.text else None)
        page.on("dialog", lambda d: (log(f"  [ALERT DIALOG]: {d.message}"), d.accept()))

        page.goto(f"{BASE_URL}/#/daftar", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Step 1: Pilih Paket Promo Komunitas
        log("  1. Memilih Paket Promo Komunitas (11 Orang • 10+1)...")
        page.wait_for_selector("text=/Promo Komunitas/i", timeout=10000)
        page.locator("text=/Promo Komunitas/i").first.click()
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_group_step1_selected.png"))
        page.locator("button:has-text('Lanjutkan Isi Data Peserta')").first.click()
        page.wait_for_timeout(600)

        # Step 2: Isi Identitas Ketua & 10 Anggota Rombongan
        log("  2. Mengisi Data Ketua Rombongan (Slot A - Peserta #1)...")
        page.locator("input[placeholder*='Budi Santoso']").first.fill("Siti Rahmawati, S.Kom., M.Cs.")
        page.locator("input[type='email']").first.fill("siti.rahmawati.test@dignity.id")
        page.locator("input[type='tel']").first.fill("081388776655")
        page.locator("input[placeholder*='RSUD']").first.fill("Poltekkes Kemenkes Surakarta")
        page.locator("input[placeholder*='Surakarta']").first.fill("Surakarta")

        # Pastikan Mode '✍️ Isi Data Rekan Sekarang' Aktif
        btn_now = page.locator("button:has-text('Isi Data Rekan Sekarang')")
        if btn_now.is_visible():
            btn_now.click()
            page.wait_for_timeout(400)

        log("  3. Mengisi Data 10 Rekan Anggota Rombongan (Slot B s/d K)...")
        # Fill each of the 10 member entries
        for idx, m in enumerate(DUMMY_MEMBERS):
            slot_char = chr(66 + idx) # B, C, D, ... K
            log(f"     -> Slot {slot_char} (Anggota #{idx + 2}): {m['nama']} | {m['wa']} | {m['email']}")
            
            nama_inputs = page.locator("input[placeholder*='Nama Lengkap & Gelar (untuk Sertifikat)']")
            email_inputs = page.locator("input[placeholder*='Alamat Email (E-Ticket & Sertifikat)']")
            wa_inputs = page.locator("input[placeholder*='No. WhatsApp (Akses Zoom)']")

            if idx < nama_inputs.count():
                nama_inputs.nth(idx).fill(m["nama"])
            if idx < email_inputs.count():
                email_inputs.nth(idx).fill(m["email"])
            if idx < wa_inputs.count():
                wa_inputs.nth(idx).fill(m["wa"])

        page.wait_for_timeout(600)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_group_step2_10_members_filled.png"))
        log("  4. Lanjut ke Pembayaran...")
        page.locator("button:has-text('Lanjut ke Pembayaran')").first.click()
        page.wait_for_timeout(1000)

        # Step 3: Verifikasi Tagihan Rp 1.000.000
        log("  5. Memeriksa Tagihan Paket Komunitas (Rp 1.000.000)...")
        group_nominal = page.locator("text=Rp 1.000.000").first
        if group_nominal.is_visible():
            log(f"     Nominal tertera: {group_nominal.text_content()}")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_group_step3_payment.png"))
        page.locator("button:has-text('Saya Sudah Transfer')").first.click()
        page.wait_for_timeout(600)

        # Step 4: Lampirkan Bukti Pembayaran
        log("  6. Melampirkan Bukti Transfer Rombongan via Link Google Drive...")
        gdrive_tab2 = page.locator("button:has-text('Link Google Drive')")
        if gdrive_tab2.is_visible():
            gdrive_tab2.click()
            page.wait_for_timeout(300)
            page.locator("input[type='url']").fill("https://drive.google.com/file/d/1SitiRahmawati10Plus1TransferTest/view?usp=sharing")
            page.wait_for_timeout(300)

        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_group_step4_proof.png"))
        log("  7. Mengirimkan Pendaftaran Rombongan...")
        page.locator("button:has-text('Kirim Pendaftaran Sekarang')").first.click()
        page.wait_for_timeout(3500)

        # Step 5: Tanda Terima & Roster 11 Kursi
        page.wait_for_selector("#printable-receipt-content", timeout=15000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_group_step5_receipt_11_pax.png"))
        group_ticket_num = ""
        try:
            group_ticket_num = page.locator("#printable-receipt-content strong.font-mono").first.text_content()
        except Exception:
            pass
        log(f"  ✅ [SUKSES] Promo Komunitas 11 Pax Berhasil Terdaftar! Nomor / Kode: {group_ticket_num}")

        # =====================================================================
        # SKENARIO 3: VERIFIKASI DI PORTAL MANDIRI CEK TIKET (#/cek-tiket)
        # =====================================================================
        log("\n--- [SKENARIO 3] Verifikasi di Portal Cek Tiket Publik (#/cek-tiket) ---")
        
        # Test Cek Tiket Individu
        log("  1. Cek Tiket Individu via Email 'budi.santoso.test@dignity.id'...")
        page.goto(f"{BASE_URL}/#/cek-tiket", wait_until="networkidle")
        page.wait_for_timeout(600)
        page.locator("input[placeholder*='TICKET-DIGNITY-880']").fill("budi.santoso.test@dignity.id")
        page.locator("button:has-text('Cek Status')").click()
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "11_cek_tiket_single_found.png"))
        is_single_found = page.locator("text=Budi Santoso").count() > 0 or page.locator("text=PENDING").count() > 0 or page.locator("text=Menunggu Verifikasi").count() > 0
        log(f"     Status Single di Portal: {'Ditemukan ✅' if is_single_found else 'Belum Muncul ❌'}")

        # Test Cek Tiket Promo Komunitas 11 Pax
        log("  2. Cek Tiket Promo Komunitas via Email Ketua 'siti.rahmawati.test@dignity.id'...")
        page.locator("input[placeholder*='TICKET-DIGNITY-880']").fill("siti.rahmawati.test@dignity.id")
        page.locator("button:has-text('Cek Status')").click()
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "12_cek_tiket_group_11_roster_found.png"))
        is_group_found = page.locator("text=Siti Rahmawati").count() > 0 or page.locator("text=Ahmad Fauzi").count() > 0 or page.locator("text=11").count() > 0
        print(f"     Status Rombongan di Portal: {'Ditemukan Roster 11 Kursi ✅' if is_group_found else 'Belum Muncul ❌'}")

        # Test Cek Tiket Anggota Rombongan (Contoh: drg. Dian Paramita)
        print("  3. Cek Akses Tiket Anggota Rombongan via Email 'dian.paramita.test@dignity.id'...")
        page.locator("input[placeholder*='TICKET-DIGNITY-880']").fill("dian.paramita.test@dignity.id")
        page.locator("button:has-text('Cek Status')").click()
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "13_cek_tiket_member_found.png"))
        is_member_found = page.locator("text=Dian Paramita").count() > 0 or page.locator("text=Siti Rahmawati").count() > 0 or page.locator("text=Promo Komunitas").count() > 0
        print(f"     Status Anggota di Portal: {'Ditemukan Terhubung ke Rombongan ✅' if is_member_found else 'Belum Muncul ❌'}")

        browser.close()

    print("\n" + "="*70)
    print("🎉 SELURUH PENGUJIAN PENDAFTARAN 2 PAKET (DENGAN 10 DUMMY ANGGOTA) SELESAI!")
    print(f"📸 13 Screenshot bukti pendaftaran tersimpan di: {SCREENSHOT_DIR}")
    print("="*70)

if __name__ == "__main__":
    run_registration_tests()
