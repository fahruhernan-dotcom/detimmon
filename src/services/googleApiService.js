/**
 * Unified Google Ecosystem Service
 * Integrates:
 * 1. Google Sheets API v4 (Real-time Database)
 * 2. Google Drive API v3 (Proof viewer & Cloud backup)
 * 3. Gmail REST API v1 (Automated ticket & certificate email dispatcher)
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send'
].join(' ');

/**
 * Request Google OAuth 2.0 Access Token with all scopes (Sheets, Drive, Gmail).
 * Supports BOTH Promise pattern and Callback pattern:
 * - await requestGoogleAccessToken() -> returns Promise<string>
 * - requestGoogleAccessToken(clientId, callback, onError) -> calls callback(token)
 */
export function requestGoogleAllAccess(clientIdOrCallback, maybeCallback, maybeOnError) {
  let clientId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID)
    || '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com';
  let callback;
  let onError;

  if (typeof clientIdOrCallback === 'function') {
    callback = clientIdOrCallback;
    onError = maybeCallback;
  } else if (typeof clientIdOrCallback === 'string') {
    clientId = clientIdOrCallback;
    callback = maybeCallback;
    onError = maybeOnError;
  } else if (typeof clientIdOrCallback === 'object' && clientIdOrCallback !== null) {
    if (clientIdOrCallback.clientId) clientId = clientIdOrCallback.clientId;
    callback = maybeCallback;
    onError = maybeOnError;
  }

  // If no callback is provided, return a Promise
  if (typeof callback !== 'function') {
    return new Promise((resolve, reject) => {
      requestGoogleAllAccess(
        clientId,
        (token) => resolve(token),
        (err) => reject(new Error(typeof err === 'string' ? err : 'Gagal otorisasi Google OAuth'))
      );
    });
  }

  if (typeof window === 'undefined' || !window.google || !window.google.accounts) {
    const errorMsg = 'Google Identity Services SDK belum selesai dimuat. Pastikan koneksi internet stabil.';
    if (onError) onError(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_OAUTH_SCOPES,
      prompt: 'consent', // Forces Google to show all permission checkboxes
      callback: (tokenResponse) => {
        console.log('[Google OAuth Unified Token Response]:', tokenResponse);
        if (tokenResponse && tokenResponse.access_token) {
          try {
            localStorage.setItem('digniti_google_oauth_token', tokenResponse.access_token);
          } catch {}
          if (callback) callback(tokenResponse.access_token, tokenResponse.scope || '');
        } else if (tokenResponse && tokenResponse.error) {
          if (onError) onError(tokenResponse.error);
        }
      }
    });

    client.requestAccessToken();
  } catch (err) {
    if (onError) onError(err.message);
  }
}

/**
 * Standard alias for requestGoogleAllAccess
 */
export const requestGoogleAccessToken = requestGoogleAllAccess;

/**
 * Helper: Encode string to Base64URL (RFC 4648 §5) for Gmail API
 */
function base64UrlEncode(str) {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });
  return btoa(utf8Bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email directly via Gmail REST API (v1)
 * POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
 */
export async function sendEmailViaGmail({ accessToken, to, subject, htmlBody, fromName = 'LPK Indonesia Dignity' }) {
  if (!accessToken) {
    throw new Error('OAuth Access Token wajib ada untuk mengirim email melalui Gmail API.');
  }
  if (!to) {
    throw new Error('Alamat email tujuan tidak boleh kosong.');
  }

  // Construct standard RFC 2822 email message
  const rawEmail = [
    `From: "${fromName}" <me>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody
  ].join('\r\n');

  const encodedMessage = base64UrlEncode(rawEmail);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    console.error('[Gmail API Send Error]:', response.status, errJson);
    const msg = errJson.error?.message || '';
    if (response.status === 403) {
      throw new Error(`Gmail API 403: Izin pengiriman email belum aktif atau belum dicentang saat login. (${msg})`);
    }
    throw new Error(`Gagal mengirim email via Gmail API (Status ${response.status}): ${msg}`);
  }

  const result = await response.json();
  console.log('[Gmail API Message Sent Successfully]:', result.id);
  return result;
}

/**
 * Generate Responsive HTML Template for Webinar E-Ticket
 * Supports both 'white' (White Luxury Minimal) and 'dark' (Classic Dark Gold) themes
 */
export function buildTicketEmailHtml(registrant = {}, options = {}) {
  const {
    nama = 'Peserta',
    nomorTicket = 'TICKET-DIGNITY-2026-001',
    kategori = 'Tiket Individu',
    nominal = 100000,
    instansi = 'Umum'
  } = registrant;

  const {
    theme = 'white', // 'white' | 'dark'
    eventTitle = 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
    eventDate = 'Sabtu, 14 November 2026',
    eventTime = '08.30 - 12.00 WIB',
    zoomLink = 'https://zoom.us/j/89241077483?pwd=DIGNITY2026',
    meetingId = '892 4107 7483',
    passcode = 'DIGNITY2026',
    waGroupLink = 'https://chat.whatsapp.com/DignityPublicSpeaking2026',
    helpdeskPhone = '+62 896-8107-7483'
  } = options;

  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(nominal || 100000);

  const isDark = theme === 'dark';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Ticket Resmi Webinar ${eventTitle}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; color: ${isDark ? '#E2E8F0' : '#1E293B'}; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; padding: 30px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${isDark ? '#0B1321' : '#FFFFFF'}; border-radius: 16px; border: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: ${isDark ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'}; padding: 32px 24px; text-align: center; border-bottom: 2px solid #F59E0B; }
    .logo-badge { display: inline-block; background: #F59E0B; color: #FFFFFF; font-weight: 800; font-size: 13px; padding: 4px 14px; border-radius: 20px; margin-bottom: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
    .title { color: ${isDark ? '#FFFFFF' : '#78350F'}; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .subtitle { color: ${isDark ? '#94A3B8' : '#92400E'}; font-size: 12.5px; margin-top: 6px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 15px; color: ${isDark ? '#FFFFFF' : '#0F172A'}; margin-bottom: 12px; }
    .lead-text { font-size: 13px; color: ${isDark ? '#94A3B8' : '#475569'}; line-height: 1.6; margin-bottom: 24px; }
    .ticket-card { background: ${isDark ? '#131E32' : '#FFFDF5'}; border: 2px dashed #F59E0B; border-radius: 14px; padding: 22px; margin: 20px 0; text-align: center; }
    .ticket-label { font-size: 11px; text-transform: uppercase; color: #D97706; font-weight: 700; letter-spacing: 1.5px; }
    .ticket-number { font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 900; color: ${isDark ? '#FFFFFF' : '#1E293B'}; margin: 10px 0; letter-spacing: 2px; }
    .status-badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700; font-size: 11px; padding: 4px 14px; border-radius: 20px; border: 1px solid #10B981; }
    .data-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
    .data-table td { padding: 10px 0; border-bottom: 1px solid ${isDark ? '#1E293B' : '#F1F5F9'}; }
    .data-table td.label { color: ${isDark ? '#94A3B8' : '#64748B'}; width: 42%; font-weight: 500; }
    .data-table td.value { color: ${isDark ? '#F1F5F9' : '#0F172A'}; font-weight: 700; text-align: right; }
    .access-box { background: ${isDark ? 'rgba(59, 130, 246, 0.1)' : '#F0F7FF'}; border: 1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}; border-radius: 14px; padding: 20px; margin: 24px 0; }
    .access-title { color: #1D4ED8; font-size: 14px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; }
    .access-item { margin: 8px 0; font-size: 13px; color: ${isDark ? '#CBD5E1' : '#334155'}; }
    .btn-zoom { display: block; background: #2563EB; color: #FFFFFF !important; text-decoration: none; text-align: center; font-weight: 700; font-size: 14px; padding: 13px 24px; border-radius: 12px; margin: 18px 0 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .btn-wa { display: block; background: #059669; color: #FFFFFF !important; text-decoration: none; text-align: center; font-weight: 700; font-size: 13px; padding: 12px 20px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); }
    .footer { background: ${isDark ? '#080E1A' : '#F8FAFC'}; padding: 24px; text-align: center; font-size: 11.5px; color: #64748B; border-top: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">LPK DIGNITY &bull; WEBINAR RESMI</div>
        <h1 class="title">E-TICKET & AKSES ZOOM</h1>
        <div class="subtitle">${eventTitle}</div>
      </div>
      
      <div class="content">
        <div class="greeting">Halo <strong>${nama}</strong>,</div>
        <p class="lead-text">
          Terima kasih! Pembayaran registrasi Anda telah <strong>berhasil diverifikasi lunas</strong>. Simpan email ini sebagai tiket resmi dan akses masuk ruang pelatihan Anda.
        </p>

        <div class="ticket-card">
          <div class="ticket-label">Nomor Tiket Peserta Resmi</div>
          <div class="ticket-number">${nomorTicket}</div>
          <div class="status-badge">&check; STATUS: TERVERIFIKASI & LUNAS</div>
        </div>

        <table class="data-table">
          <tr><td class="label">Nama Peserta</td><td class="value">${nama}</td></tr>
          <tr><td class="label">Instansi / Asal</td><td class="value">${instansi}</td></tr>
          <tr><td class="label">Kategori Tiket</td><td class="value">${kategori}</td></tr>
          <tr><td class="label">Total Pembayaran</td><td class="value">${formattedNominal}</td></tr>
          <tr><td class="label">Hari / Tanggal</td><td class="value">${eventDate}</td></tr>
          <tr><td class="label">Waktu Acara</td><td class="value">${eventTime}</td></tr>
        </table>

        <div class="access-box">
          <div class="access-title">&bull; Akses Ruangan Live Zoom Meeting</div>
          <div class="access-item"><strong>Meeting ID:</strong> ${meetingId}</div>
          <div class="access-item"><strong>Passcode:</strong> ${passcode}</div>
          <div class="access-item"><strong>Instruksi Masuk:</strong> Harap gunakan format nama: <em>${nomorTicket.split('-').pop()} - ${nama}</em> saat bergabung ke ruang Zoom.</div>
          <a href="${zoomLink}" class="btn-zoom" target="_blank">MASUK RUANG ZOOM WEBINAR</a>
        </div>

        <p style="font-size: 13px; color: ${isDark ? '#CBD5E1' : '#475569'}; margin: 24px 0 8px; line-height: 1.5;">
          Wajib bergabung ke dalam WhatsApp VIP Group untuk koordinasi teknis, presensi live, dan pembagian modul pelatihan:
        </p>
        <a href="${waGroupLink}" class="btn-wa" target="_blank">GABUNG GRUP WHATSAPP VIP PESERTA</a>
      </div>

      <div class="footer">
        <div><strong>LPK Indonesia Dignity &bull; Strategic Training Partner KLTC&reg;</strong></div>
        <div style="margin-top: 4px;">Hotline Helpdesk WhatsApp: ${helpdeskPhone} &bull; Surakarta, Jawa Tengah</div>
        <div style="margin-top: 4px; font-size: 10.5px; color: #94A3B8;">Email ini diterbitkan otomatis oleh Dignity Admin Command Center melalui Gmail API resmi.</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Responsive HTML Template for Webinar E-Certificate & Rebate Voucher
 */
export function buildCertificateEmailHtml(attendance = {}, options = {}) {
  const {
    nama = 'Peserta',
    nomorSertifikat = 'LPK-DIGNITY/WEB-PS/XI/2026/001',
    kodeVoucher = 'REBATE100K-001'
  } = attendance;

  const {
    theme = 'white', // 'white' | 'dark'
    eventTitle = 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
    bootcampTitle = 'Executive Bootcamp Offline 2 Hari di Sala View Hotel Solo',
    bootcampDates = '28 - 29 November 2026',
    verifyUrl = `http://localhost:8080/#/verify/${encodeURIComponent(nomorSertifikat)}`,
    registerNextUrl = null,
    voucherDiscount = 'Rp 100.000',
    helpdeskPhone = '+62 896-8107-7483'
  } = options;

  const isDark = theme === 'dark';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Sertifikat Kelulusan & Voucher Pelatihan - ${nama}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; color: ${isDark ? '#E2E8F0' : '#1E293B'}; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; padding: 30px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${isDark ? '#0B1321' : '#FFFFFF'}; border-radius: 16px; border: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: ${isDark ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'}; padding: 32px 24px; text-align: center; border-bottom: 2px solid #D97706; }
    .logo-badge { display: inline-block; background: #D97706; color: #FFFFFF; font-weight: 800; font-size: 13px; padding: 4px 14px; border-radius: 20px; margin-bottom: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
    .title { color: ${isDark ? '#FFFFFF' : '#78350F'}; font-size: 20px; font-weight: 800; margin: 0; }
    .subtitle { color: ${isDark ? '#94A3B8' : '#92400E'}; font-size: 12.5px; margin-top: 6px; }
    .content { padding: 32px 28px; }
    .cert-card { background: ${isDark ? '#131E32' : '#F8FAFC'}; border: 1px solid ${isDark ? '#334155' : '#E2E8F0'}; border-radius: 14px; padding: 22px; margin: 20px 0; text-align: center; }
    .cert-label { font-size: 11px; text-transform: uppercase; color: #D97706; font-weight: 700; letter-spacing: 1.5px; }
    .cert-number { font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 800; color: ${isDark ? '#F59E0B' : '#B45309'}; margin: 10px 0; }
    .voucher-card { background: ${isDark ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'}; border: 2px dashed #D97706; border-radius: 14px; padding: 22px; margin: 24px 0; text-align: center; }
    .voucher-title { font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 1.5px; }
    .voucher-code { font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 900; color: ${isDark ? '#FFFFFF' : '#78350F'}; margin: 10px 0; letter-spacing: 3px; }
    .voucher-desc { font-size: 12.5px; color: ${isDark ? '#CBD5E1' : '#475569'}; line-height: 1.5; }
    .btn-bootcamp { display: block; background: #D97706; color: #FFFFFF !important; text-decoration: none; text-align: center; font-weight: 800; font-size: 14px; padding: 13px 24px; border-radius: 12px; margin: 18px 0 8px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); }
    .btn-verify { display: inline-block; color: #2563EB; text-decoration: underline; font-weight: 600; font-size: 12px; margin-top: 8px; }
    .footer { background: ${isDark ? '#080E1A' : '#F8FAFC'}; padding: 24px; text-align: center; font-size: 11.5px; color: #64748B; border-top: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">LPK DIGNITY &bull; SERTIFIKASI RESMI</div>
        <h1 class="title">E-SERTIFIKAT KELULUSAN</h1>
        <div class="subtitle">${eventTitle}</div>
      </div>
      
      <div class="content">
        <p style="margin: 0 0 14px; font-size: 15px;">Selamat kepada <strong>${nama}</strong>,</p>
        <p style="margin: 0 0 16px; font-size: 13px; color: ${isDark ? '#94A3B8' : '#475569'}; line-height: 1.6;">
          Atas partisipasi penuh dan kelulusan Anda dalam program pelatihan Public Speaking Profesional. Data presensi Anda telah tervalidasi dan nomor registrasi E-Sertifikat resmi Anda telah tercatat pada database verifikasi publik LPK Dignity.
        </p>

        <div class="cert-card">
          <div class="cert-label">Nomor Registrasi Sertifikat Sah</div>
          <div class="cert-number">${nomorSertifikat}</div>
          <a href="${verifyUrl}" target="_blank" class="btn-verify">Verifikasi Keaslian Sertifikat di Portal Dignity &rarr;</a>
        </div>

        <div class="voucher-card">
          <div class="voucher-title">Voucher Beasiswa / Rebate Alumni</div>
          <div class="voucher-code">${kodeVoucher}</div>
          <div class="voucher-desc">
            Sebagai alumni program ini, Anda berhak mendapatkan potongan langsung sebesar <strong>${voucherDiscount}</strong> untuk pendaftaran <strong>${bootcampTitle}</strong> (${bootcampDates}).
          </div>
          <a href="${registerNextUrl || `https://wa.me/${helpdeskPhone.replace(/[^0-9]/g, '')}?text=Halo%20Admin,%20saya%20ingin%20klaim%20Voucher%20Rebate%20${kodeVoucher}%20untuk%20Bootcamp%20Public%20Speaking`}" class="btn-bootcamp" target="_blank">
            ${registerNextUrl ? 'DAFTAR SEKARANG DENGAN VOUCHER ALUMNI &rarr;' : 'KLAIM VOUCHER KE WHATSAPP ADMIN'}
          </a>
        </div>
      </div>

      <div class="footer">
        <div><strong>LPK Indonesia Dignity &bull; Lembaga Pelatihan Kerja Terakreditasi</strong></div>
        <div style="margin-top: 4px;">Surakarta, Jawa Tengah, Indonesia &bull; Hotline: ${helpdeskPhone}</div>
        <div style="margin-top: 4px; font-size: 10.5px; color: #94A3B8;">Diterbitkan resmi via Dignity Admin Command Center &bull; Gmail API.</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Responsive HTML Template for Custom Broadcast / Announcement
 */
export function buildBroadcastEmailHtml({
  recipientName = 'Peserta',
  title = 'Pengumuman Penting Webinar',
  message = '',
  ctaText = 'Buka Tautan Acara',
  ctaUrl = 'https://zoom.us'
}, options = {}) {
  const {
    theme = 'white',
    eventTitle = 'Webinar Public Speaking LPK Dignity',
    helpdeskPhone = '+62 896-8107-7483'
  } = options;

  const isDark = theme === 'dark';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; color: ${isDark ? '#E2E8F0' : '#1E293B'}; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${isDark ? '#060B13' : '#F8FAFC'}; padding: 30px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${isDark ? '#0B1321' : '#FFFFFF'}; border-radius: 16px; border: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: ${isDark ? '#1E293B' : '#FFFBEB'}; padding: 28px 24px; text-align: center; border-bottom: 2px solid #F59E0B; }
    .title { color: ${isDark ? '#FFFFFF' : '#78350F'}; font-size: 18px; font-weight: 800; margin: 0; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 13.5px; }
    .btn-cta { display: block; background: #D97706; color: #FFFFFF !important; text-decoration: none; text-align: center; font-weight: 700; font-size: 14px; padding: 13px 24px; border-radius: 12px; margin: 24px 0 10px; }
    .footer { background: ${isDark ? '#080E1A' : '#F8FAFC'}; padding: 20px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid ${isDark ? '#1E293B' : '#E2E8F0'}; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="title">${title}</h1>
        <div style="font-size: 12px; color: ${isDark ? '#94A3B8' : '#92400E'}; margin-top: 4px;">${eventTitle}</div>
      </div>
      <div class="content">
        <p>Halo <strong>${recipientName}</strong>,</p>
        <div style="white-space: pre-line; margin: 16px 0;">${message}</div>
        ${ctaUrl ? `<a href="${ctaUrl}" class="btn-cta" target="_blank">${ctaText}</a>` : ''}
      </div>
      <div class="footer">
        <div>LPK Indonesia Dignity &bull; Hotline: ${helpdeskPhone}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Extract Google Drive file ID from various link formats
 */
export function getDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  
  // If user pasted bare file ID (typically 25-45 alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/|[?&]id=)([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(driveRegex);
  return match ? match[1] : null;
}

/**
 * Resolve Google Drive share/view URL into an embeddable image URL
 */
export function resolveDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If it's a numeric string like "100000" or not an http URL, return as is
  if (trimmed === '100000' || (!trimmed.startsWith('http') && !/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed))) {
    return trimmed;
  }

  const fileId = getDriveFileId(trimmed);
  if (fileId) {
    // lh3.googleusercontent.com is the fastest and most reliable Google Drive CDN
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

/**
 * Fetch Google Drive file binary content as a local Blob URL
 * Completely bypasses third-party cookie blocking, CORS, and Google Workspace security
 */
export async function fetchDriveImageBlobUrl(fileIdOrUrl, accessToken) {
  if (!fileIdOrUrl) return null;
  const fileId = getDriveFileId(fileIdOrUrl) || fileIdOrUrl;
  if (!fileId || !fileId.match(/^[a-zA-Z0-9_-]+$/)) return null;

  if (accessToken) {
    try {
      // Gunakan XHR bukan fetch() — gapi interceptor hanya hook window.fetch,
      // sehingga XHR tidak di-route lewat gapi.client.drive (yang belum tentu loaded)
      const blobResult = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve({ ok: true, blob: xhr.response, status: 200 });
          } else {
            resolve({ ok: false, status: xhr.status });
          }
        };
        xhr.onerror = () => reject(new Error('XHR network error'));
        xhr.send();
      });

      if (blobResult.ok) {
        const blob = blobResult.blob;
        const blobUrl = URL.createObjectURL(blob);
        const mimeType = blob.type || 'image/jpeg';
        const isPdf = mimeType.includes('pdf');
        return { blobUrl, mimeType, isPdf, size: blob.size };
      } else {
        console.warn('Google Drive API alt=media error:', blobResult.status);
        return {
          errorStatus: blobResult.status,
          errorMessage: `HTTP ${blobResult.status}`,
          directUrl: `https://lh3.googleusercontent.com/d/${fileId}`
        };
      }
    } catch (err) {
      console.warn('Gagal memuat binary Google Drive via XHR:', err);
      return {
        errorMessage: err.message,
        directUrl: `https://lh3.googleusercontent.com/d/${fileId}`
      };
    }
  }

  // Fallback to direct web CDN
  return {
    directUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
    mimeType: 'image/jpeg'
  };
}

/**
 * Backup Registrants or Attendances data as a JSON/CSV file into Google Drive
 * POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
 */
export async function uploadBackupToDrive({ accessToken, fileName, content, mimeType = 'text/csv' }) {
  if (!accessToken) {
    throw new Error('Access token Google Drive diperlukan.');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Drive Upload Error: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Create a new folder in Google Drive
 * POST https://www.googleapis.com/drive/v3/files
 */
export async function createDriveFolder({ accessToken, folderName, parentFolderId = null }) {
  if (!accessToken) {
    throw new Error('Access token Google Drive diperlukan.');
  }

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gagal membuat folder Google Drive: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Create full organized event workspace in Google Drive
 * Generates:
 * 📁 [LPK Dignity] {eventTitle}
 *    ├── 📁 01_Bukti_Transfer_Pembayaran
 *    ├── 📁 02_Presensi_Kehadiran_Zoom
 *    ├── 📁 03_Sertifikat_Pelatihan
 *    └── 📁 04_Data_Backup_Sheets
 */
export async function createEventDriveWorkspace({ accessToken, eventTitle, parentFolderId = null }) {
  if (!accessToken) {
    throw new Error('Access token Google Drive diperlukan untuk membuat workspace.');
  }

  const cleanTitle = (eventTitle || 'Pelatihan Public Speaking').trim();
  const mainFolderName = `[LPK Dignity] ${cleanTitle}`;

  // 1. Buat folder utama event
  const mainFolder = await createDriveFolder({
    accessToken,
    folderName: mainFolderName,
    parentFolderId
  });

  const mainFolderId = mainFolder.id;
  const mainFolderUrl = mainFolder.webViewLink || `https://drive.google.com/drive/folders/${mainFolderId}`;

  // 2. Buat subfolder terstruktur
  const subfolderDefs = [
    { key: 'proofs', name: '📁 01_Bukti_Transfer_Pembayaran' },
    { key: 'attendance', name: '📁 02_Presensi_Kehadiran_Zoom' },
    { key: 'certificates', name: '📁 03_Sertifikat_Pelatihan' },
    { key: 'backups', name: '📁 04_Data_Backup_Sheets' }
  ];

  const subfolders = {};
  for (const def of subfolderDefs) {
    try {
      const created = await createDriveFolder({
        accessToken,
        folderName: def.name,
        parentFolderId: mainFolderId
      });
      subfolders[def.key] = {
        id: created.id,
        name: def.name,
        url: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
      };
    } catch (err) {
      console.warn(`Peringatan saat membuat subfolder ${def.name}:`, err.message);
    }
  }

  return {
    mainFolderId,
    mainFolderName,
    mainFolderUrl,
    proofFolderId: subfolders.proofs?.id || mainFolderId,
    proofFolderUrl: subfolders.proofs?.url || mainFolderUrl,
    subfolders
  };
}

/**
 * Upload a binary file or Base64 data URL to a designated Google Drive folder
 * POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
 */
export async function uploadFileToDriveFolder({
  accessToken,
  fileName,
  fileBlobOrBase64,
  mimeType = 'image/png',
  parentFolderId = null
}) {
  if (!accessToken) {
    throw new Error('Access token Google Drive diperlukan.');
  }

  let finalBlob;
  let resolvedMime = mimeType;

  // Handle Base64 Data URL (e.g., data:image/png;base64,...)
  if (typeof fileBlobOrBase64 === 'string' && fileBlobOrBase64.startsWith('data:')) {
    const parts = fileBlobOrBase64.split(',');
    const headerMatch = parts[0].match(/:(.*?);/);
    if (headerMatch) resolvedMime = headerMatch[1];
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    finalBlob = new Blob([bytes], { type: resolvedMime });
  } else if (fileBlobOrBase64 instanceof Blob) {
    finalBlob = fileBlobOrBase64;
    resolvedMime = finalBlob.type || resolvedMime;
  } else {
    throw new Error('Format berkas tidak valid untuk diunggah ke Google Drive.');
  }

  const metadata = {
    name: fileName,
    mimeType: resolvedMime
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n';

  const fileHeaderPart = delimiter +
    `Content-Type: ${resolvedMime}\r\n\r\n`;

  const requestBody = new Blob([
    metadataPart,
    fileHeaderPart,
    finalBlob,
    closeDelimiter
  ]);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: requestBody
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Drive File Upload Error: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

