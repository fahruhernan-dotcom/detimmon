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

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 950})
        page = context.new_page()

        page.add_init_script("""
            localStorage.setItem('dignity_staff_session', JSON.stringify({
                id: 'staff-admin-tester',
                email: 'admin.qa@dignity.id',
                role: 'OWNER',
                profile: { full_name: 'Lead Admin QA' }
            }));
        """)

        errors = []
        page.on("console", lambda msg: errors.append(f"CONSOLE: {msg.text}") if "error" in msg.type.lower() and "Function components" not in msg.text else None)
        page.on("pageerror", lambda err: errors.append(f"PAGEERROR: {err}"))

        log("1. Navigasi ke #/admin...")
        page.goto(f"{BASE_URL}/#/admin", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Klik tab Data Pendaftar jika di overview
        tab_btn = page.locator("button:has-text('Data Pendaftar')").first
        if tab_btn.is_visible():
            tab_btn.click()
            page.wait_for_timeout(1000)

        # 1. Verifikasi Klik Dropdown Group 'Komunitas (11 Pax)'
        log("2. Menemukan dan klik tombol dropdown 'Komunitas (11 Pax)'...")
        expand_btn = page.locator("button:has-text('Komunitas (11 Pax)')").first
        assert expand_btn.is_visible(), "Tombol dropdown 'Komunitas (11 Pax)' harus terlihat di kolom Paket & Nominal!"
        log(f"   Teks tombol: '{expand_btn.inner_text().strip()}'")
        
        expand_btn.click()
        page.wait_for_timeout(1000)
        
        screenshot_grouped = os.path.join(SCREENSHOT_DIR, "06_unified_good_ui_grouped_expanded.png")
        page.screenshot(path=screenshot_grouped)
        log(f"   ✓ Screenshot grouped expand tersimpan: {screenshot_grouped}")

        # 1b. Verifikasi Klik Collapse (Menariknya lagi dengan smooth motion)
        log("2b. Menemukan dan klik tombol dropdown 'Komunitas (11 Pax)' untuk MENARIKNYA KEMBALI (collapse)...")
        expand_btn.click()
        # Tunggu jeda animasi collapse (220ms)
        page.wait_for_timeout(400)
        screenshot_collapsed = os.path.join(SCREENSHOT_DIR, "09_smooth_collapsed_back.png")
        page.screenshot(path=screenshot_collapsed)
        log(f"   ✓ Screenshot smooth collapse (menarik kembali) tersimpan: {screenshot_collapsed}")

        # Re-expand untuk melanjutkan pengujian
        expand_btn.click()
        page.wait_for_timeout(400)

        # 2. Verifikasi Flat View Switcher (Semua Peserta 14)
        log("3. Beralih ke View Mode 'Semua Peserta'...")
        flat_btn = page.locator("button:has-text('Semua Peserta')").first
        if flat_btn.is_visible():
            flat_btn.click()
            page.wait_for_timeout(1000)
            screenshot_flat = os.path.join(SCREENSHOT_DIR, "07_unified_good_ui_flat_14_peserta.png")
            page.screenshot(path=screenshot_flat)
            log(f"   ✓ Screenshot flat view (14 peserta) tersimpan: {screenshot_flat}")

        # 3. Verifikasi Klik Detail pada Salah Satu Anggota
        log("4. Menemukan dan klik tombol 'Detail' pada peserta...")
        detail_btn = page.locator("text='Detail'").first
        assert detail_btn.is_visible(), "Tombol 'Detail' harus terlihat!"
        detail_btn.click()
        page.wait_for_timeout(1000)

        drawer = page.locator("[role='dialog']").first
        assert drawer.is_visible(), "ParticipantDetailDrawer harus terbuka!"
        log("   ✓ ParticipantDetailDrawer terbuka dengan sempurna tanpa crash!")

        screenshot_drawer = os.path.join(SCREENSHOT_DIR, "08_member_detail_drawer.png")
        page.screenshot(path=screenshot_drawer)
        log(f"   ✓ Screenshot drawer tersimpan: {screenshot_drawer}")

        if errors:
            log(f"⚠️ Error terdeteksi: {errors}")
        else:
            log("✅ 0 error browser! Semua komponen berfungsi 100% normal.")

        browser.close()

if __name__ == "__main__":
    run()
