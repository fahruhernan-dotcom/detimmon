/**
 * ==============================================================================
 * DIGNITI EVENT AUTOMATION ENGINE - GOOGLE APPS SCRIPT (BACKEND API)
 * Penyelenggara: LPK Indonesia Digniti in Collaboration with KLTC®
 * 
 * PANDUAN PEMASANGAN:
 * 1. Buka Google Spreadsheet Database Anda.
 * 2. Klik menu: Ekstensi > Apps Script.
 * 3. Hapus semua kode default, lalu salin dan tempel SELURUH naskah kode ini.
 * 4. Klik tombol "Simpan" (ikon disket).
 * 5. Klik menu: "Deploy" (Terapkan) > "New deployment" (Penerapan baru).
 * 6. Pilih tipe: "Web app" (Aplikasi Web).
 * 7. Setel:
 *    - Description: Digniti Automation Web App v1
 *    - Execute as: Me (email akun Anda)
 *    - Who has access: Anyone (Siapa saja)
 * 8. Klik "Deploy", lalu salin Web App URL yang dihasilkan.
 * 9. Tempelkan URL tersebut ke dalam file .env dan menu Konfigurasi Dashboard Admin!
 * ==============================================================================
 */

const CONFIG = {
  sheetRegistrasiName: 'DB_Registrasi_Webinar',
  sheetPresensiName: 'DB_Presensi_&_Sertifikat',
  adminWhatsApp: '+62 896-8107-7483',
  adminWaLink: 'https://wa.me/6289681077483',
  zoomMeetingLink: 'https://zoom.us/j/98765432100?pwd=WebinarDigniti2026',
  zoomMeetingId: '987 6543 2100',
  zoomPasscode: 'DIGNITI2026',
  wagPesertaLink: 'https://chat.whatsapp.com/GrupPesertaWebinarDigniti2026'
};

/**
 * Handle HTTP GET Request from Admin Dashboard
 * Returns JSON containing all rows from both sheets
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Fetch Registrants
    const regSheet = ss.getSheetByName(CONFIG.sheetRegistrasiName);
    let registrants = [];
    if (regSheet) {
      const regData = regSheet.getDataRange().getValues();
      if (regData.length > 1) {
        for (let i = 1; i < regData.length; i++) {
          const row = regData[i];
          if (row[1]) { // If Nomor Ticket exists
            registrants.push({
              id: i,
              timestamp: row[0] ? String(row[0]) : '',
              nomorTicket: String(row[1] || ''),
              nama: String(row[2] || ''),
              email: String(row[3] || ''),
              whatsapp: String(row[4] || ''),
              instansi: String(row[5] || ''),
              kategori: String(row[6] || 'Individu (Rp 100.000)'),
              nominal: String(row[6] || '').includes('Mabar') ? 500000 : 100000,
              bank: String(row[7] || ''),
              buktiUrl: String(row[8] || ''),
              statusBayar: String(row[9] || 'PENDING'),
              statusEmailTicket: String(row[10] || 'BELUM'),
              catatanCS: String(row[11] || '')
            });
          }
        }
      }
    }

    // 2. Fetch Attendances
    const attSheet = ss.getSheetByName(CONFIG.sheetPresensiName);
    let attendances = [];
    if (attSheet) {
      const attData = attSheet.getDataRange().getValues();
      if (attData.length > 1) {
        for (let i = 1; i < attData.length; i++) {
          const row = attData[i];
          if (row[1]) {
            attendances.push({
              id: i,
              timestamp: row[0] ? String(row[0]) : '',
              nomorSertifikat: String(row[1] || ''),
              nama: String(row[2] || ''),
              email: String(row[3] || ''),
              whatsapp: String(row[4] || ''),
              hambatan: String(row[5] || ''),
              kodeVoucher: String(row[7] || `REBATE100K-${String(i).padStart(3, '0')}`),
              statusSertifikat: String(row[8] || 'SELESAI'),
              statusEmailSertifikat: String(row[10] || 'TERKIRIM')
            });
          }
        }
      }
    }

    const output = {
      success: true,
      registrants: registrants,
      attendances: attendances,
      serverTime: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Request from Admin Dashboard
 * Updates payment status and triggers automated emails
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Action 1: Update Status Bayar & Kirim Email Tiket
    if (action === 'update_status_bayar') {
      const regSheet = ss.getSheetByName(CONFIG.sheetRegistrasiName);
      if (regSheet) {
        const data = regSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]) === String(postData.nomorTicket)) {
            // Update Kolom J (Status Bayar = LUNAS)
            regSheet.getRange(i + 1, 10).setValue('LUNAS');
            
            // Kirim Email Tiket Otomatis
            kirimEmailTiketOtomatis({
              nama: postData.nama || data[i][2],
              email: postData.email || data[i][3],
              nomorTicket: postData.nomorTicket,
              kategori: data[i][6] || 'Individu (Rp 100.000)'
            });

            // Update Kolom K (Status Email Ticket = TERKIRIM)
            regSheet.getRange(i + 1, 11).setValue('TERKIRIM');
            break;
          }
        }
      }
    }

    // Action 2: Kirim Email E-Sertifikat
    if (action === 'send_certificate_email') {
      kirimEmailSertifikatOtomatis({
        nama: postData.nama,
        email: postData.email,
        nomorSertifikat: postData.nomorSertifikat,
        kodeVoucher: postData.kodeVoucher
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Automasi berhasil dieksekusi di Google Apps Script'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FUNGSI AUTOMASI EMAIL 1: Pengiriman E-Ticket Resmi & Link Zoom
 */
function kirimEmailTiketOtomatis(data) {
  const subject = `🎟️ [E-TICKET RESMI] Pendaftaran Lunas Webinar Public Speaking: ${data.nama}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A192F; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #D4AF37;">
      <div style="background: #080E1A; padding: 24px; text-align: center; border-bottom: 2px solid #D4AF37;">
        <h2 style="color: #D4AF37; margin: 0; font-size: 20px; letter-spacing: 1px;">LPK INDONESIA DIGNITI</h2>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0;">IN OFFICIAL COLLABORATION WITH KLTC®</p>
      </div>
      
      <div style="padding: 28px; background: #0D1B2A;">
        <h3 style="color: #38BDF8; margin-top: 0;">Pembayaran Anda Telah Terverifikasi LUNAS! ✅</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0;">
          Halo <strong>${data.nama}</strong>,<br>
          Selamat! Kursi dan seminar kit virtual Anda telah resmi terkunci dalam Live Morning Workshop:
          <strong>"Mastering Stage Confidence & Workplace Communication"</strong>.
        </p>

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #D4AF37; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h4 style="color: #D4AF37; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">Detail E-Ticket Resmi Anda:</h4>
          <table style="width: 100%; font-size: 13px; color: #E2E8F0;">
            <tr><td style="padding: 4px 0; color: #94A3B8;">Nomor Tiket:</td><td><strong style="color: #F3E5AB;">${data.nomorTicket}</strong></td></tr>
            <tr><td style="padding: 4px 0; color: #94A3B8;">Kategori:</td><td>${data.kategori}</td></tr>
            <tr><td style="padding: 4px 0; color: #94A3B8;">Hari, Tanggal:</td><td><strong>Sabtu, 14 November 2026</strong></td></tr>
            <tr><td style="padding: 4px 0; color: #94A3B8;">Waktu:</td><td>08.00 – 11.30 WIB (Pagi)</td></tr>
          </table>
        </div>

        <div style="background: rgba(37, 99, 235, 0.15); border-left: 4px solid #38BDF8; padding: 14px; border-radius: 4px; margin-bottom: 24px;">
          <h4 style="color: #38BDF8; margin: 0 0 6px 0; font-size: 13px;">🔗 AKSES ZOOM MEETING PRO:</h4>
          <p style="font-size: 12.5px; margin: 0; color: #E2E8F0;">
            • Link: <a href="${CONFIG.zoomMeetingLink}" style="color: #38BDF8; word-break: break-all;">${CONFIG.zoomMeetingLink}</a><br>
            • Meeting ID: <strong>${CONFIG.zoomMeetingId}</strong><br>
            • Passcode: <strong>${CONFIG.zoomPasscode}</strong>
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${CONFIG.wagPesertaLink}" style="background: #25D366; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
            📲 GABUNG GRUP WHATSAPP PESERTA
          </a>
        </div>

        <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;">
          💡 <strong>Pengingat Jaminan Rebate 100%:</strong> Seluruh investasi tiket Anda (Rp 100.000) berlaku PENUH sebagai potongan harga untuk upgrade ke <i>Certified Bootcamp Offline 2 Hari di Sala View Hotel Solo (12-13 Desember 2026)</i>!
        </p>
      </div>

      <div style="background: #080E1A; padding: 16px; text-align: center; font-size: 11px; color: #64748B;">
        Butuh bantuan darurat? Hubungi Hotline Admin WhatsApp: <a href="${CONFIG.adminWaLink}" style="color: #38BDF8;">${CONFIG.adminWhatsApp}</a>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * FUNGSI AUTOMASI EMAIL 2: Pengiriman E-Sertifikat Resmi & Kupon Rebate Rp 100.000
 */
function kirimEmailSertifikatOtomatis(data) {
  const subject = `🎓 [E-SERTIFIKAT RESMI] Penghargaan Kehadiran Webinar Public Speaking: ${data.nama}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A192F; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #D4AF37;">
      <div style="background: #080E1A; padding: 24px; text-align: center; border-bottom: 2px solid #D4AF37;">
        <h2 style="color: #D4AF37; margin: 0; font-size: 20px; letter-spacing: 1px;">LPK INDONESIA DIGNITI × KLTC®</h2>
        <p style="color: #94A3B8; font-size: 11px; margin: 4px 0 0 0;">CERTIFICATE OF RECOGNITION & PARTICIPATION</p>
      </div>

      <div style="padding: 28px; background: #0D1B2A;">
        <h3 style="color: #F3E5AB; margin-top: 0;">Selamat Atas Kelulusan Sesi Webinar Anda! 🎓</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0;">
          Yth. <strong>${data.nama}</strong>,<br>
          Terima kasih atas partisipasi aktif Anda dalam Live Interactive Morning Workshop <i>"Mastering Stage Confidence & Workplace Communication"</i>.
        </p>

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #D4AF37; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #94A3B8;">Nomor Registrasi Sertifikat Resmi:</p>
          <div style="font-size: 16px; font-weight: bold; color: #F3E5AB; margin: 4px 0 12px 0;">${data.nomorSertifikat}</div>
          <p style="margin: 0; font-size: 12px; color: #E2E8F0;">
            Sertifikat resmi Anda telah terdaftar dalam basis data kelulusan LPK Indonesia Digniti.
          </p>
        </div>

        <!-- Voucher Rebate Strip -->
        <div style="background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(13,27,42,0.9)); border: 1px dashed #D4AF37; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; color: #D4AF37; font-weight: bold; text-transform: uppercase;">🎟️ VOUCHER POTONGAN 100% REBATE RP 100.000</div>
          <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin: 8px 0;">${data.kodeVoucher}</div>
          <p style="font-size: 12px; color: #E2E8F0; margin: 0;">
            Gunakan kode ini saat mendaftar <strong>Certified Bootcamp Offline 2 Hari di Sala View Hotel Solo (12-13 Desember 2026)</strong> untuk mendapatkan diskon langsung Rp 100.000!
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${CONFIG.adminWaLink}?text=Halo%20Admin%20Digniti%2C%20saya%20ingin%20klaim%20Voucher%20Rebate%20${data.kodeVoucher}%20untuk%20Bootcamp%20Sala%20View%20Hotel%20Solo" style="background: #D4AF37; color: #080E1A; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
            📲 KLAIM VOUCHER REBATE KE CS
          </a>
        </div>
      </div>

      <div style="background: #080E1A; padding: 16px; text-align: center; font-size: 11px; color: #64748B;">
        Customer Care LPK Indonesia Digniti: <a href="${CONFIG.adminWaLink}" style="color: #38BDF8;">${CONFIG.adminWhatsApp}</a>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody
  });
}
