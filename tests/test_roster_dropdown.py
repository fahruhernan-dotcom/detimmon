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
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots", "roster_dropdown")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def log(msg):
    print(msg, flush=True)

def run_test():
    log("🚀 Memulai pengujian GroupRosterDropdown pada RegistrantsView...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 950})
        
        # Inject staff session
        page = context.new_page()
        page.add_init_script("""
            localStorage.setItem('dignity_staff_session', JSON.stringify({
                id: 'staff-admin-tester',
                email: 'admin.qa@dignity.id',
                role: 'OWNER',
                profile: { full_name: 'Lead Admin QA' }
            }));
        """)
        
        log(f"1. Membuka URL: {BASE_URL}/#/admin ...")
        page.goto(f"{BASE_URL}/#/admin", wait_until="networkidle")
        page.wait_for_timeout(2000)
        
        # Pastikan berada di tab Pendaftar
        log("2. Memastikan tab Pendaftar aktif...")
        pendaftar_tab = page.locator("button:has-text('Pendaftar')").first
        if pendaftar_tab.is_visible():
            pendaftar_tab.click()
            page.wait_for_timeout(1000)
        
        # Cari baris Siti Rahmawati
        log("3. Mencari baris grup 'Siti Rahmawati'...")
        search_input = page.locator("input[placeholder*='Cari nama, email, tiket, instansi']").first
        if search_input.is_visible():
            search_input.fill("Siti Rahmawati")
            page.wait_for_timeout(800)
        
        # Screenshot baris tabel dalam keadaan ringkas
        compact_path = os.path.join(SCREENSHOT_DIR, "01_table_compact_row.png")
        page.screenshot(path=compact_path)
        log(f"  ✓ Screenshot baris ringkas tersimpan: {compact_path}")
        
        # Cari trigger dropdown roster
        roster_trigger = page.locator("button:has-text('Kursi Terisi')").first
        if not roster_trigger.is_visible():
            # Coba cari tanpa search filter jika data belum muncul
            if search_input.is_visible():
                search_input.fill("")
                page.wait_for_timeout(800)
            roster_trigger = page.locator("button:has-text('Kursi Terisi')").first
        
        if roster_trigger.is_visible():
            log(f"4. Menemukan trigger dropdown: '{roster_trigger.inner_text().strip()}'")
            roster_trigger.click()
            page.wait_for_timeout(600)
            
            # Screenshot dropdown terbuka
            open_dropdown_path = os.path.join(SCREENSHOT_DIR, "02_dropdown_roster_open.png")
            page.screenshot(path=open_dropdown_path)
            log(f"  ✓ Screenshot dropdown terbuka tersimpan: {open_dropdown_path}")
            
            # Verifikasi elemen di dalam dropdown
            roster_header = page.locator("text='Roster Anggota'").first
            if roster_header.is_visible():
                log(f"  ✓ Dropdown content valid: {roster_header.inner_text()}")
            
            # Periksa slot ketua [A] dan bonus [K]
            ketua_badge = page.locator("text='KETUA'").first
            bonus_badge = page.locator("text='BONUS'").first
            log(f"  ✓ Slot KETUA visible: {ketua_badge.is_visible()}")
            log(f"  ✓ Slot BONUS visible: {bonus_badge.is_visible()}")
            
            # Coba klik tombol Kelola Data Lengkap jika ada
            kelola_btn = page.locator("button:has-text('Kelola Data Lengkap')").first
            if kelola_btn.is_visible():
                log("5. Menguji tombol 'Kelola Data Lengkap'...")
                kelola_btn.click()
                page.wait_for_timeout(1000)
                modal_path = os.path.join(SCREENSHOT_DIR, "03_modal_kelola_anggota.png")
                page.screenshot(path=modal_path)
                log(f"  ✓ Screenshot modal kelola anggota tersimpan: {modal_path}")
        else:
            log("  ⚠️ Trigger dropdown 'Kursi Terisi' tidak ditemukan di tampilan awal.")
        
        browser.close()
        log("🎉 Pengujian selesai dengan sukses!")

if __name__ == "__main__":
    run_test()
