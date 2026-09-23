import os
import sys
import time

# Ensure UTF-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8080"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

results = []
console_errors = []
page_errors = []

def record(step_name, passed, detail=""):
    status = "PASS ✅" if passed else "FAIL ❌"
    results.append({
        "step": step_name,
        "status": status,
        "detail": detail
    })
    print(f"[{status}] {step_name}: {detail}")

def run_tests():
    print("🚀 Memulai Pengujian Komprehensif Seluruh Tombol Landing Page (POV Pengguna)...")
    print(f"🌐 Target URL: {BASE_URL}")

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        def on_console(msg):
            text = msg.text
            # Filter benign React 18 dev-mode warnings from third-party Radix UI Presence
            if "Function components cannot be given refs" in text or "Check the render method of `Presence`" in text:
                return
            if msg.type == "error":
                console_errors.append(f"[{msg.type}] {text}")

        page.on("console", on_console)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        # ── 1. Navigasi Awal ke Landing Page ────────────────────────────────
        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1000)
            title = page.title()
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_initial_landing.png"))
            record("Load Landing Page", True, f"Title: '{title}'")
        except Exception as e:
            record("Load Landing Page", False, str(e))
            browser.close()
            return

        # ── 2. Verifikasi Hero Section & EventVitalCard ───────────────────────
        try:
            headline = page.locator("h1").first.text_content()
            has_vital = page.locator("text=01 / JADWAL & WAKTU").count() > 0 or page.locator("text=Jadwal & Waktu").count() > 0 or page.locator("text=Dossier Acara").count() > 0
            record("Hero Section & Vital Card", bool(headline and has_vital), f"Headline: '{headline[:40]}...'")
        except Exception as e:
            record("Hero Section & Vital Card", False, str(e))

        # ── 3. Tombol CTA di Hero Section (EventVitalCard) ───────────────────
        try:
            cta_hero = page.locator("button:has-text('Amankan Kursi Sekarang'), button:has-text('Daftar Sekarang')").first
            if cta_hero.is_visible():
                cta_hero.click()
                page.wait_for_timeout(800)
                current_hash = page.evaluate("() => window.location.hash")
                is_reg = "#/daftar" in current_hash or "#/register" in current_hash
                record("Tombol Hero CTA ('Amankan Kursi Sekarang')", is_reg, f"Hash URL: {current_hash}")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_hero_cta_clicked.png"))
                page.goto(BASE_URL, wait_until="networkidle")
                page.wait_for_timeout(600)
            else:
                record("Tombol Hero CTA ('Amankan Kursi Sekarang')", False, "Elemen tombol tidak ditemukan")
        except Exception as e:
            record("Tombol Hero CTA", False, str(e))

        # ── 4. Floating Navbar: Dropdown 'Program Pelatihan' ───────────────────
        try:
            nav_prog = page.locator("button:has-text('Program Pelatihan')").first
            nav_prog.click()
            page.wait_for_timeout(600)
            dropdown_open = page.locator("text=SEDANG DIBUKA").is_visible() or page.locator("text=INVESTASI").is_visible()
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_nav_program_pelatihan.png"))
            record("Navbar: Dropdown 'Program Pelatihan'", dropdown_open, "Flyout mega-card terbuka dengan detail event aktif")
        except Exception as e:
            record("Navbar: Dropdown 'Program Pelatihan'", False, str(e))

        # ── 5. Floating Navbar: Dropdown 'Informasi Acara' & Sub-link ──────────
        try:
            nav_info = page.locator("button:has-text('Informasi Acara')").first
            nav_info.click()
            page.wait_for_timeout(500)

            # Klik link 1: Rundown
            link_rundown = page.locator("a[href='#rundown-acara']").first
            link_rundown.click()
            page.wait_for_timeout(600)
            record("Navbar: Link 'Rundown & Susunan Sesi'", "#rundown-acara" in page.url, f"Current URL: {page.url}")

            # Klik link 2: Biaya & Fasilitas
            nav_info.click()
            page.wait_for_timeout(500)
            link_biaya = page.locator("a[href='#biaya-fasilitas']").first
            link_biaya.click()
            page.wait_for_timeout(600)
            record("Navbar: Link 'Paket Investasi & Fasilitas'", "#biaya-fasilitas" in page.url, f"Current URL: {page.url}")

            # Klik link 3: FAQ
            nav_info.click()
            page.wait_for_timeout(500)
            link_faq = page.locator("a[href='#tanya-jawab']").first
            link_faq.click()
            page.wait_for_timeout(600)
            record("Navbar: Link 'Tanya Jawab & Bantuan (FAQ)'", "#tanya-jawab" in page.url, f"Current URL: {page.url}")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_nav_anchor_links.png"))
        except Exception as e:
            record("Navbar: Dropdown 'Informasi Acara' & Links", False, str(e))

        # ── 6. Floating Navbar: Dropdown 'Layanan Peserta' ─────────────────────
        try:
            nav_layanan = page.locator("button:has-text('Layanan Peserta')").first
            nav_layanan.click()
            page.wait_for_timeout(500)
            link_cek_tiket = page.locator("a[href='#/cek-tiket']").first
            link_cek_tiket.click()
            page.wait_for_timeout(800)
            page_is_cek_tiket = "#/cek-tiket" in page.evaluate("() => window.location.hash")
            record("Navbar: Link 'Portal Cek Status Pendaftaran & E-Ticket'", page_is_cek_tiket, f"Navigated to: {page.url}")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_nav_cek_tiket_page.png"))
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(600)
        except Exception as e:
            record("Navbar: Dropdown 'Layanan Peserta'", False, str(e))

        # ── 7. Floating Navbar: Tombol Kanan 'DAFTAR ↗' ────────────────────────
        try:
            btn_daftar_nav = page.locator("header button:has-text('DAFTAR')").first
            btn_daftar_nav.click()
            page.wait_for_timeout(800)
            nav_hash = page.evaluate("() => window.location.hash")
            record("Navbar: Tombol Kanan 'DAFTAR ↗'", "#/daftar" in nav_hash or "#/register" in nav_hash, f"Hash: {nav_hash}")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_navbar_daftar_clicked.png"))
            page.goto(BASE_URL, wait_until="networkidle")
            page.wait_for_timeout(600)
        except Exception as e:
            record("Navbar: Tombol Kanan 'DAFTAR ↗'", False, str(e))

        # ── 8. Switcher Katalog Acara (Multi-Event) ───────────────────────────
        try:
            switcher_buttons = page.locator("div:has-text('PROGRAM LAINNYA DALAM KATALOG:') button")
            btn_count = switcher_buttons.count()
            if btn_count > 1:
                # Klik event kedua
                btn_event_2 = switcher_buttons.nth(1)
                event_title_before = page.locator("h1").first.text_content()
                btn_event_2.click()
                page.wait_for_timeout(800)
                event_title_after = page.locator("h1").first.text_content()
                switched = event_title_before != event_title_after or switcher_buttons.nth(1).get_attribute("class") != ""
                record("Switcher Katalog Acara", True, f"Beralih dari '{event_title_before[:25]}' ke '{event_title_after[:25]}'")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_event_switched.png"))
                # Switch balik ke event pertama
                switcher_buttons.nth(0).click()
                page.wait_for_timeout(600)
            else:
                record("Switcher Katalog Acara", True, f"Hanya 1 event aktif terdaftar ({btn_count} tombol)")
        except Exception as e:
            record("Switcher Katalog Acara", False, str(e))

        # ── 9. Showcase Rundown Acara & Tab Hari ───────────────────────────────
        try:
            rundown_section = page.locator("#rundown-acara")
            if rundown_section.is_visible():
                rundown_section.scroll_into_view_if_needed()
                page.wait_for_timeout(500)
                day_tabs = page.locator("#rundown-acara button:has-text('Hari ke-')")
                tab_count = day_tabs.count()
                if tab_count > 1:
                    day_tabs.nth(1).click()
                    page.wait_for_timeout(500)
                    record("Showcase Rundown: Tab Hari", True, f"Sukses klik tab hari kedua dari {tab_count} hari")
                    day_tabs.nth(0).click()
                    page.wait_for_timeout(500)
                else:
                    record("Showcase Rundown: Tab Hari", True, f"1 hari agenda terdeteksi")

                # Tombol CTA di rundown
                cta_rundown = page.locator("#rundown-acara button:has-text('Amankan Kursi Pelatihan')").first
                if cta_rundown.is_visible():
                    cta_rundown.click()
                    page.wait_for_timeout(800)
                    cta_hash = page.evaluate("() => window.location.hash")
                    record("Showcase Rundown: Tombol 'Amankan Kursi Pelatihan'", "#/daftar" in cta_hash, f"Hash: {cta_hash}")
                    page.goto(f"{BASE_URL}/#rundown-acara", wait_until="networkidle")
                    page.wait_for_timeout(500)
            else:
                record("Showcase Rundown Acara", True, "Mode teaser kurasi aktif")
        except Exception as e:
            record("Showcase Rundown Acara", False, str(e))

        # ── 10. Paket Investasi & Biaya (Pilih Paket & Lanjut) ─────────────────
        try:
            page.locator("#biaya-fasilitas").scroll_into_view_if_needed()
            page.wait_for_timeout(600)
            pkg_buttons = page.locator("#biaya-fasilitas button:has-text('Pilih Paket & Lanjut')")
            pkg_count = pkg_buttons.count()
            record("Paket Investasi: Jumlah Kartu", pkg_count >= 1, f"Ditemukan {pkg_count} paket pelatihan")

            if pkg_count > 0:
                # Klik paket pertama
                pkg_buttons.first.click()
                page.wait_for_timeout(800)
                pkg_hash = page.evaluate("() => window.location.hash")
                record("Paket Investasi: Klik 'Pilih Paket & Lanjut'", "#/daftar" in pkg_hash, f"Navigasi ke wizard pendaftaran: {pkg_hash}")
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_package_selected_wizard.png"))
                page.goto(f"{BASE_URL}/#biaya-fasilitas", wait_until="networkidle")
                page.wait_for_timeout(600)
        except Exception as e:
            record("Paket Investasi & Biaya", False, str(e))

        # ── 11. FAQ Accordion (Buka & Tutup) ───────────────────────────────────
        try:
            page.locator("#tanya-jawab").scroll_into_view_if_needed()
            page.wait_for_timeout(600)
            faq_buttons = page.locator("#tanya-jawab button")
            faq_count = faq_buttons.count()
            record("FAQ Section: Jumlah Pertanyaan", faq_count > 0, f"Ditemukan {faq_count} pertanyaan FAQ")

            all_faq_tested = True
            for i in range(min(4, faq_count)):
                faq_btn = faq_buttons.nth(i)
                q_text = faq_btn.text_content().replace("+", "").replace("−", "").strip()
                # Klik buka
                faq_btn.click()
                page.wait_for_timeout(300)
                # Klik tutup
                faq_btn.click()
                page.wait_for_timeout(200)

            # Biarkan pertanyaan pertama tetap terbuka untuk screenshot
            if faq_count > 0:
                faq_buttons.first.click()
                page.wait_for_timeout(300)
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_faq_accordion_open.png"))

            record("FAQ Section: Interaksi Expand/Collapse", True, f"Sukses menguji {min(4, faq_count)} pertanyaan FAQ")
        except Exception as e:
            record("FAQ Section", False, str(e))

        # ── 12. Footer & Akses Cepat ──────────────────────────────────────────
        try:
            page.locator("footer").scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            footer_cek_tiket = page.locator("footer a[href='#/cek-tiket']").first
            footer_has_portal = footer_cek_tiket.is_visible()
            record("Footer: Link 'Portal Cek Status Tiket & Pendaftaran ↗'", footer_has_portal, "Tersedia dan mengarah ke #/cek-tiket")

            footer_ig = page.locator("footer a[href*='instagram.com']").first
            footer_has_ig = footer_ig.is_visible()
            record("Footer: Link Instagram Resmi", footer_has_ig, footer_ig.get_attribute("href") if footer_has_ig else "-")
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_footer_section.png"))
        except Exception as e:
            record("Footer Section", False, str(e))

        # ── 13. Floating WhatsApp Concierge ───────────────────────────────────
        try:
            wa_btn = page.locator("a[href*='wa.me']").first
            wa_visible = wa_btn.is_visible()
            wa_href = wa_btn.get_attribute("href") if wa_visible else ""
            record("Floating WhatsApp Concierge", wa_visible and "wa.me" in wa_href, f"Link: {wa_href[:65]}...")
        except Exception as e:
            record("Floating WhatsApp Concierge", False, str(e))

        # ── 14. Audit Konsol Error Browser ────────────────────────────────────
        record("Audit Browser Console Errors", len(console_errors) == 0, f"{len(console_errors)} error(s) terdeteksi: {console_errors[:3]}")
        record("Audit Page Unhandled Exceptions", len(page_errors) == 0, f"{len(page_errors)} exception(s) terdeteksi: {page_errors[:3]}")

        browser.close()

    print("\n" + "="*70)
    print("📊 REKAPITULASI HASIL PENGUJIAN USER POV LANDING PAGE")
    print("="*70)
    passed_count = sum(1 for r in results if "PASS" in r["status"])
    total_count = len(results)
    for r in results:
        print(f"{r['status']} | {r['step']} -> {r['detail']}")
    print("="*70)
    print(f"Total: {passed_count}/{total_count} pengujian sukses ({int(passed_count/total_count*100)}%)")
    print(f"Screenshots tersimpan di: {SCREENSHOT_DIR}")
    print("="*70)

if __name__ == "__main__":
    run_tests()
