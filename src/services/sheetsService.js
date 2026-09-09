import { GOOGLE_OAUTH_SCOPES, resolveDriveImageUrl } from './googleApiService';
import { parseRawNominal, detectPackageType } from '../utils/formatters';
import { normalizeCertificateName, normalizeEmail, normalizeWhatsApp } from '../utils/normalizers';

/**
 * Request Access Token using Google Identity Services (OAuth 2.0)
 * Scopes: Sheets, Drive, Gmail
 */
export function requestGoogleAccessToken(clientId, callback, onError) {
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
        console.log('[Google OAuth Token Response]:', tokenResponse);
        if (tokenResponse && tokenResponse.access_token) {
          if (tokenResponse.scope && !tokenResponse.scope.includes('spreadsheets')) {
            const scopeErr = 'Perhatian: Kotak centang izin akses Google Sheets tidak dicentang saat login. Silakan login ulang dan centang izin Google Sheets.';
            if (onError) onError(scopeErr);
            return;
          }
          callback(tokenResponse.access_token);
        } else if (tokenResponse.error) {
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
 * Fetch data using OAuth 2.0 Bearer Access Token
 */
/**
 * Fetch data using OAuth 2.0 Bearer Access Token with dynamic sheet tab & header detection
 */
export async function fetchFromGoogleOAuth(spreadsheetId, accessToken) {
  if (!spreadsheetId || !accessToken) {
    throw new Error('Spreadsheet ID dan OAuth Access Token wajib ada.');
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  };

  // 1. Fetch metadata to detect real sheet names
  let regTabName = '';
  let presTabName = '';

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, { headers });
  
  if (!metaRes.ok) {
    const metaErr = await metaRes.json().catch(() => ({}));
    console.error('[Google Sheets API Error Details - Metadata]:', metaRes.status, metaErr);
    const rawMsg = metaErr.error?.message || '';
    const errStatus = metaErr.error?.status || '';

    if (metaRes.status === 403) {
      if (rawMsg.toLowerCase().includes('disabled') || rawMsg.toLowerCase().includes('not been used')) {
        throw new Error('Google Sheets API belum diaktifkan di Google Cloud Console. Buka: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=413035723577 lalu klik tombol ENABLE.');
      }
      if (rawMsg.toLowerCase().includes('insufficient') || errStatus === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
        throw new Error('Izin Google Sheets belum dicentang saat popup Google muncul. Silakan klik Login lagi dan centang izin "See, edit, create and delete your spreadsheets".');
      }
      if (rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('caller')) {
        throw new Error(`Google Sheets: Akun email yang dipilih belum memiliki hak akses pada spreadsheet ini (${rawMsg}). Pastikan file spreadsheet dibagikan ke email tersebut atau ubah akses link menjadi "Siapa saja yang memiliki link: Pelihat".`);
      }
    }
    throw new Error(`Google Sheets API (Status ${metaRes.status}): ${rawMsg || errStatus || 'Akses ditolak'}`);
  }

  const meta = await metaRes.json();
  const sheetList = meta.sheets || [];
  if (sheetList.length > 0) {
    // Find sheet matching gid 1351232283 or first sheet
    const targetSheet = sheetList.find(s => s.properties?.sheetId === 1351232283) || sheetList[0];
    regTabName = targetSheet?.properties?.title || '';

    // Find attendance/presensi sheet if exists
    const presSheet = sheetList.find(s => 
      s.properties?.title?.toLowerCase().includes('presensi') ||
      s.properties?.title?.toLowerCase().includes('sertifikat')
    );
    if (presSheet) {
      presTabName = presSheet.properties.title;
    }
  }

  if (!regTabName) {
    regTabName = sheetList[0]?.properties?.title || 'Form Responses 1';
  }

  const rangeReg = `'${regTabName.replace(/'/g, "''")}'!A1:Z500`;
  const urlReg = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeReg)}`;
  const resReg = await fetch(urlReg, { headers });

  if (!resReg.ok) {
    const err = await resReg.json().catch(() => ({}));
    console.error('[Google Sheets API Error Details - Values]:', resReg.status, err);
    const rawMsg = err.error?.message || '';
    throw new Error(`Gagal membaca data sheet "${regTabName}": ${rawMsg}`);
  }

  const dataReg = await resReg.json();
  const allRows = dataReg.values || [];

  if (allRows.length === 0) {
    return { registrants: [], attendances: [], source: 'google_oauth_bearer' };
  }

  // Header inspection & Admin column auto-provisioning
  let headerRow = (allRows[0] || []).map(h => String(h || '').trim());
  try {
    headerRow = await ensureAdminHeadersExist(spreadsheetId, accessToken, regTabName, headerRow);
  } catch (e) {
    console.warn('ensureAdminHeadersExist warn:', e);
  }

  const headerRowLower = headerRow.map(h => h.toLowerCase().trim());
  const findCol = (keywords, excludeKeywords = []) => {
    const idx = headerRowLower.findIndex(h => {
      const matches = keywords.some(k => h.includes(k));
      const excluded = excludeKeywords.some(e => h.includes(e));
      return matches && !excluded;
    });
    return idx >= 0 ? idx : -1;
  };

  const colTimestamp = findCol(['timestamp', 'waktu', 'tanggal']);
  const colNama = findCol(['nama lengkap', 'nama peserta', 'nama', 'name'], ['rekan', 'rombongan']);
  const colEmail = findCol(['alamat email', 'email aktif', 'surel'], []);
  const colWa = findCol(['nomor whatsapp', 'whatsapp', 'wa', 'telepon', 'phone', 'hp'], ['rekan', 'rombongan']);
  const colInstansi = findCol(['instansi', 'institusi', 'perusahaan', 'kampus', 'universitas', 'sekolah', 'asal']);
  const colKota = findCol(['domisili', 'kota', 'kabupaten']);
  
  // PROTECTED: Upload Bukti Pembayaran Webminar (Never treat as nominal!)
  const colBukti = findCol(['upload bukti', 'bukti pembayaran', 'bukti transfer', 'bukti', 'struk', 'lampiran']);

  const colKategori = findCol(['pilihan paket', 'paket tiket', 'paket webinar', 'kategori', 'paket']);
  const colMabar = findCol(['mabar', 'rombongan', 'rekan']);
  const colSumber = findCol(['sumber informasi', 'informasi sumber']);
  const colBank = findCol(['rekening tujuan', 'tujuan pembayaran', 'bank tujuan', 'bank', 'metode']);
  const colEmailAlt = findCol(['email address'], []);

  // Dedicated Admin columns (Columns M, N, O, P)
  const colStatus = findCol(['validasi pembayaran', '[admin] status', 'status pembayaran', 'status bayar', 'status verifikasi']);
  const colTicket = findCol(['[admin] nomor tiket', 'nomor tiket', 'ticket id', 'kode tiket', 'no tiket']);
  const colStatusEmail = findCol(['[admin] status email', 'status email tiket', 'status email', 'status kirim']);
  const colNominal = findCol(['[admin] nominal', 'nominal validasi', 'nominal terverifikasi', 'jumlah bayar'], ['upload', 'bukti', 'paket']);

  const colMap = {
    timestamp: colTimestamp >= 0 ? colTimestamp : 0,
    nama: colNama >= 0 ? colNama : 1,
    email: colEmail >= 0 ? colEmail : (colEmailAlt >= 0 ? colEmailAlt : 2),
    whatsapp: colWa >= 0 ? colWa : 3,
    instansi: colInstansi >= 0 ? colInstansi : 4,
    kota: colKota >= 0 ? colKota : 5,
    bukti: colBukti >= 0 ? colBukti : 6,
    kategori: colKategori >= 0 ? colKategori : 7,
    mabar: colMabar >= 0 ? colMabar : 8,
    sumber: colSumber >= 0 ? colSumber : 9,
    bank: colBank >= 0 ? colBank : 10,
    emailAlt: colEmailAlt >= 0 ? colEmailAlt : 11,
    status: colStatus >= 0 ? colStatus : 12,
    ticket: colTicket >= 0 ? colTicket : (headerRow.length > 13 ? 13 : -1),
    statusEmail: colStatusEmail >= 0 ? colStatusEmail : -1,
    nominal: colNominal >= 0 ? colNominal : -1
  };

  const dataRows = allRows.slice(1);
  const registrants = dataRows
    .map((row, idx) => {
      const rawNama = (colNama >= 0 ? row[colNama] : row[1]) || '';
      const nama = normalizeCertificateName(rawNama);
      const rawEmail = (colEmail >= 0 ? row[colEmail] : '') || (colEmailAlt >= 0 ? row[colEmailAlt] : '') || row[2] || '';
      const email = normalizeEmail(rawEmail);
      const rawWa = (colWa >= 0 ? row[colWa] : row[3]) || '';
      const whatsapp = normalizeWhatsApp(rawWa);
      const instansi = (colInstansi >= 0 ? row[colInstansi] : row[4]) || '-';
      const kota = (colKota >= 0 ? row[colKota] : row[5]) || '-';
      const rawCat = (colKategori >= 0 ? row[colKategori] : row[7]) || '';
      const mabarNotes = (colMabar >= 0 ? row[colMabar] : row[8]) || '';
      const bank = (colBank >= 0 ? row[colBank] : row[10]) || 'Bank Mandiri';

      // CRITICAL: Proof URL is strictly from colBukti (Col 6 / Column G)
      const rawBukti = (colBukti >= 0 ? row[colBukti] : '') || '';
      const buktiUrl = resolveDriveImageUrl(rawBukti);

      // Determine nominal: If dedicated nominal column has a number, use it; otherwise deduce from package
      let nominal = 100000;
      if (colNominal >= 0 && colNominal !== colBukti && row[colNominal]) {
        nominal = parseRawNominal(row[colNominal]);
      } else {
        const catLower = rawCat.toLowerCase();
        if (catLower.includes('mabar') || catLower.includes('500') || mabarNotes.trim().length > 0) {
          nominal = 500000;
        } else {
          nominal = parseRawNominal(rawCat);
        }
      }
      if (!nominal || nominal <= 0) {
        nominal = 100000;
      }

      const kategori = rawCat || detectPackageType(nominal, rawCat);

      // Status: From Validasi Pembayaran (colStatus, e.g. Col 12 / M)
      const statusRaw = (colStatus >= 0 && colStatus !== colBukti ? String(row[colStatus] || '').trim() : '');
      const statusBayar = statusRaw.toUpperCase().includes('LUNAS') ? 'LUNAS' : 'PENDING';

      // Ticket guard
      const candidateTicket = (colTicket >= 0 && colTicket !== colBukti) ? String(row[colTicket] || '').trim() : '';
      const isPhoneNumber = /^08|^62|^\+62|\d{10,}/.test(candidateTicket);
      const nomorTicket = (candidateTicket && !isPhoneNumber)
        ? candidateTicket
        : `TICKET-DIGNITY-2026-${String(idx + 1).padStart(3, '0')}`;

      // Status email
      const rawEmailStatus = (colStatusEmail >= 0 && colStatusEmail !== colBukti) ? String(row[colStatusEmail] || '').trim() : '';
      const statusEmailTicket = rawEmailStatus.toUpperCase().includes('TERKIRIM') 
        ? 'TERKIRIM' 
        : (statusBayar === 'LUNAS' ? 'TERKIRIM' : 'BELUM');

      return {
        id: idx + 1,
        rowIndex: idx + 2, // 1-indexed row number in Google Sheets
        sheetTabName: regTabName,
        colMap,
        rawHeaders: headerRow,
        timestamp: (colTimestamp >= 0 ? row[colTimestamp] : row[0]) || '',
        nomorTicket,
        nama,
        email,
        whatsapp,
        instansi,
        kota,
        kategori,
        nominal,
        bank,
        buktiUrl,
        rawBukti,
        mabarNotes,
        statusBayar,
        statusEmailTicket
      };
    })
    .filter(r => r.nama.trim().length > 0);

  // Fetch attendances if separate sheet tab exists
  let attendances = [];
  if (presTabName && presTabName !== regTabName) {
    try {
      const rangePres = `'${presTabName.replace(/'/g, "''")}'!A2:H200`;
      const urlPres = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangePres)}`;
      const resPres = await fetch(urlPres, { headers });
      if (resPres.ok) {
        const dataPres = await resPres.json();
        attendances = (dataPres.values || [])
          .map((row, idx) => ({
            id: idx + 1,
            rowIndex: idx + 2,
            sheetTabName: presTabName,
            timestamp: row[0] || '',
            nomorSertifikat: row[1] || `LPK-DIGNITY/WEB-PS/XI/2026/${String(idx + 1).padStart(3, '0')}`,
            nama: normalizeCertificateName(row[2] || ''),
            email: normalizeEmail(row[3] || ''),
            whatsapp: normalizeWhatsApp(row[4] || ''),
            hambatan: row[5] || '',
            kodeVoucher: row[6] || `REBATE100K-${String(idx + 1).padStart(3, '0')}`,
            statusSertifikat: 'SELESAI',
            statusEmailSertifikat: 'TERKIRIM'
          }))
          .filter(a => a.nama.trim().length > 0);
      }
    } catch (err) {
      console.warn('Presensi tab fetch error:', err);
    }
  }

  return { 
    registrants, 
    attendances, 
    source: 'google_oauth_bearer', 
    tabName: regTabName,
    colMap,
    rawHeaders: headerRow
  };
}

/**
 * Fetch data directly from Google Cloud Console Google Sheets API v4 via API Key
 */
export async function fetchFromGoogleConsoleApi(spreadsheetId, apiKey, sheetTabs = ['DB_Registrasi_Webinar', 'DB_Presensi_&_Sertifikat']) {
  if (!spreadsheetId || !apiKey) {
    throw new Error('Spreadsheet ID dan Google Console API Key wajib diisi.');
  }

  const [regTab, presTab] = sheetTabs;
  
  const urlReg = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(regTab)}!A2:K100?key=${apiKey}`;
  const urlPres = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(presTab)}!A2:H100?key=${apiKey}`;

  const [resReg, resPres] = await Promise.all([
    fetch(urlReg),
    fetch(urlPres)
  ]);

  if (!resReg.ok) {
    const err = await resReg.json().catch(() => ({}));
    throw new Error(`Google Console API Error (Status ${resReg.status}): ${err.error?.message || 'Gagal menarik data sheet pendaftaran'}`);
  }

  const dataReg = await resReg.json();
  const dataPres = resPres.ok ? await resPres.json() : { values: [] };

  const registrants = (dataReg.values || []).map((row, idx) => ({
    id: idx + 1,
    timestamp: row[0] || '',
    nomorTicket: row[1] || `TICKET-DIGNITY-2026-${String(idx + 1).padStart(3, '0')}`,
    nama: normalizeCertificateName(row[2] || ''),
    email: normalizeEmail(row[3] || ''),
    whatsapp: normalizeWhatsApp(row[4] || ''),
    instansi: row[5] || '',
    kategori: row[6] || 'Individu (Rp 100.000)',
    nominal: parseInt(String(row[7] || '').replace(/[^0-9]/g, '')) || 100000,
    bank: row[8] || 'Bank Mandiri',
    buktiUrl: row[9] || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: (row[10] || 'PENDING').toUpperCase(),
    statusEmailTicket: (row[10] || '').toUpperCase() === 'LUNAS' ? 'TERKIRIM' : 'BELUM'
  }));

  const attendances = (dataPres.values || []).map((row, idx) => ({
    id: idx + 1,
    timestamp: row[0] || '',
    nomorSertifikat: row[1] || `LPK-DIGNITY/WEB-PS/XI/2026/${String(idx + 1).padStart(3, '0')}`,
    nama: normalizeCertificateName(row[2] || ''),
    email: normalizeEmail(row[3] || ''),
    whatsapp: normalizeWhatsApp(row[4] || ''),
    hambatan: row[5] || 'Kendala grogi & tidak percaya diri',
    kodeVoucher: row[6] || `REBATE100K-${String(idx + 1).padStart(3, '0')}`,
    statusSertifikat: 'SELESAI',
    statusEmailSertifikat: 'TERKIRIM'
  }));

  return { registrants, attendances, source: 'google_console_api' };
}

/**
 * Fetch data via Google Apps Script Web App
 */
export async function fetchGoogleSheetsLive(gasWebAppUrl) {
  if (!gasWebAppUrl) {
    throw new Error('URL Google Apps Script belum dikonfigurasi.');
  }

  const endpoint = `${gasWebAppUrl}?action=get_all_data&t=${Date.now()}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Gagal menghubungi Google Apps Script (Status: ${response.status})`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Respon Google Apps Script menandakan error.');
  }

  return data;
}

/**
 * Update Payment Status via Google Apps Script
 */
export async function postUpdateStatusBayar(gasWebAppUrl, payload) {
  if (!gasWebAppUrl) return;

  try {
    await fetch(gasWebAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_status_bayar',
        ...payload
      })
    });
  } catch (err) {
    console.warn('Background GAS sync notification error:', err);
  }
}

/**
 * Trigger Certificate Dispatch via Google Apps Script
 */
export async function postSendCertificateEmail(gasWebAppUrl, payload) {
  if (!gasWebAppUrl) return;

  try {
    await fetch(gasWebAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_certificate_email',
        ...payload
      })
    });
  } catch (err) {
    console.warn('Background GAS cert dispatch error:', err);
  }
}

/**
 * Convert 0-indexed column number to Google Sheets A1 letter
 * 0 -> A, 1 -> B, ..., 10 -> K, 12 -> M, 25 -> Z, 26 -> AA
 */
export function colIndexToA1Letter(index) {
  if (index === undefined || index < 0) return 'A';
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Auto-creates dedicated Admin Columns in Row 1 if they do not exist yet.
 * Never touches existing Google Form native columns!
 */
export async function ensureAdminHeadersExist(spreadsheetId, accessToken, tabName, existingHeaders) {
  if (!spreadsheetId || !accessToken || !existingHeaders || existingHeaders.length === 0) {
    return existingHeaders;
  }

  const safeTab = tabName.replace(/'/g, "''");
  const headersLower = existingHeaders.map(h => String(h || '').toLowerCase().trim());

  // Check which admin headers already exist
  const hasStatus = headersLower.some(h => 
    h.includes('validasi pembayaran') || 
    h.includes('status pembayaran') || 
    h.includes('status bayar') ||
    h === 'status'
  );
  const hasTicket = headersLower.some(h => 
    h.includes('nomor tiket') || 
    h.includes('ticket id') || 
    h.includes('kode tiket') ||
    h.includes('no tiket')
  );
  const hasEmailStatus = headersLower.some(h => 
    h.includes('status email') || 
    h.includes('email tiket') ||
    h.includes('status kirim')
  );
  const hasNominal = headersLower.some(h => 
    (h.includes('nominal validasi') || h.includes('nominal terverifikasi') || h.includes('[admin] nominal')) &&
    !h.includes('bukti') && !h.includes('upload')
  );

  const missingHeaders = [];
  if (!hasStatus) missingHeaders.push('Validasi Pembayaran');
  if (!hasTicket) missingHeaders.push('[ADMIN] Nomor Tiket');
  if (!hasEmailStatus) missingHeaders.push('[ADMIN] Status Email Tiket');
  if (!hasNominal) missingHeaders.push('[ADMIN] Nominal Validasi');

  if (missingHeaders.length === 0) {
    return existingHeaders;
  }

  // Provision missing headers at the next available columns
  const startColIdx = existingHeaders.length;
  const startColLetter = colIndexToA1Letter(startColIdx);
  const endColLetter = colIndexToA1Letter(startColIdx + missingHeaders.length - 1);
  const range = `'${safeTab}'!${startColLetter}1:${endColLetter}1`;

  console.log(`[Google Sheets API v4] Provisioning ${missingHeaders.length} new admin headers at ${range}:`, missingHeaders);

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        values: [missingHeaders]
      })
    });
    if (res.ok) {
      console.log(`[Google Sheets API v4] Successfully created admin headers at ${range}!`);
      return [...existingHeaders, ...missingHeaders];
    }
  } catch (err) {
    console.warn('[Google Sheets API] Header provisioning notice:', err);
  }

  return existingHeaders;
}

/**
 * Update Payment Status directly in Google Sheets via API v4
 * Writes to dedicated Admin Column 'Validasi Pembayaran' (Col 12 / M), NEVER Col G (Upload Bukti)!
 */
export async function updateSheetPaymentStatus({
  spreadsheetId,
  accessToken,
  tabName = 'Form Responses 1',
  rowIndex,
  colStatusIndex = 12,
  colTicketIndex = -1,
  colStatusEmailIndex = -1,
  colBuktiIndex = -1,
  status = 'LUNAS',
  nomorTicket = '',
  statusEmail = '',
  gasWebAppUrl = ''
}) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID belum dikonfigurasi.');
  }

  // 1. Primary: Direct Google Sheets API v4 using OAuth Bearer Token
  if (accessToken && rowIndex) {
    // CRITICAL PROTECTION: colStatusIndex must not equal colBuktiIndex!
    if (colBuktiIndex >= 0 && colStatusIndex === colBuktiIndex) {
      console.error('[Google Sheets Protection] Blocked write to colBukti to protect Google Drive link!');
      throw new Error('Keamanan Sheet: Kolom status bentrok dengan kolom link bukti. Pembaruan dibatalkan.');
    }

    const colLetter = colIndexToA1Letter(colStatusIndex);
    const safeTab = tabName.replace(/'/g, "''");
    const range = `'${safeTab}'!${colLetter}${rowIndex}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    console.log(`[Google Sheets API v4] Updating status cell ${range} to:`, status);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        values: [[status]]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Google Sheets API Error - updatePaymentStatus]:', res.status, err);
      throw new Error(`Gagal update status di Google Sheets: ${err.error?.message || res.statusText}`);
    }

    // Also update ticket column if ticket exists, mapped, and not colBukti
    if (nomorTicket && colTicketIndex >= 0 && colTicketIndex !== colBuktiIndex) {
      const ticketColLetter = colIndexToA1Letter(colTicketIndex);
      const ticketRange = `'${safeTab}'!${ticketColLetter}${rowIndex}`;
      const ticketUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ticketRange)}?valueInputOption=USER_ENTERED`;
      fetch(ticketUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[nomorTicket]]
        })
      }).catch(err => console.warn('Ticket column update notice:', err));
    }

    // Also update email status column if mapped and not colBukti
    if (statusEmail && colStatusEmailIndex >= 0 && colStatusEmailIndex !== colBuktiIndex) {
      const emailColLetter = colIndexToA1Letter(colStatusEmailIndex);
      const emailRange = `'${safeTab}'!${emailColLetter}${rowIndex}`;
      const emailUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(emailRange)}?valueInputOption=USER_ENTERED`;
      fetch(emailUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[statusEmail]]
        })
      }).catch(err => console.warn('Email status column update notice:', err));
    }

    return { success: true, method: 'google_sheets_api_v4', range, status };
  }

  // 2. Fallback: Google Apps Script Web App
  if (gasWebAppUrl) {
    await postUpdateStatusBayar(gasWebAppUrl, {
      nomorTicket,
      status
    });
    return { success: true, method: 'gas_web_app' };
  }

  throw new Error('OAuth Token tidak aktif atau baris sheet tidak terdeteksi. Silakan Login Google OAuth.');
}

/**
 * Update Registrant Details (Nama, Email, WhatsApp, Instansi, Kategori, Bank, Status, Nominal)
 * via Google Sheets API v4 batchUpdate
 * STRICT PROTECTION: Never writes to Col G (Upload Bukti Pembayaran)!
 */
export async function updateSheetRegistrantDetails({
  spreadsheetId,
  accessToken,
  tabName = 'Form Responses 1',
  rowIndex,
  colMap = {},
  registrant = {},
  gasWebAppUrl = ''
}) {
  if (!spreadsheetId || !accessToken || !rowIndex) {
    if (gasWebAppUrl) {
      return postUpdateStatusBayar(gasWebAppUrl, {
        nomorTicket: registrant.nomorTicket,
        nama: registrant.nama,
        email: registrant.email,
        nominal: registrant.nominal,
        status: registrant.statusBayar
      });
    }
    throw new Error('Spreadsheet ID, OAuth Access Token, dan Baris Sheet diperlukan untuk memperbarui data.');
  }

  const safeTab = tabName.replace(/'/g, "''");
  const data = [];

  const addCell = (colIdx, val) => {
    if (colIdx !== undefined && colIdx >= 0 && val !== undefined && val !== null) {
      // STRICT PROTECTION: NEVER WRITE TO COLBUKTI!
      if (colIdx === colMap.bukti) {
        console.warn('[Google Sheets Protection] Blocked write to colBukti to protect Google Drive link!');
        return;
      }
      const letter = colIndexToA1Letter(colIdx);
      data.push({
        range: `'${safeTab}'!${letter}${rowIndex}`,
        values: [[val]]
      });
    }
  };

  addCell(colMap.nama, registrant.nama);
  addCell(colMap.email, registrant.email);
  addCell(colMap.whatsapp, registrant.whatsapp);
  addCell(colMap.instansi, registrant.instansi);
  addCell(colMap.kategori, registrant.kategori);
  addCell(colMap.bank, registrant.bank);
  addCell(colMap.status, registrant.statusBayar);

  // If a dedicated admin nominal column exists and is not colBukti, write nominal
  if (colMap.nominal !== undefined && colMap.nominal >= 0 && colMap.nominal !== colMap.bukti) {
    addCell(colMap.nominal, registrant.nominal);
  }

  // If admin provided a valid http URL for bukti, write it to colMap.bukti safely
  if (colMap.bukti !== undefined && colMap.bukti >= 0 && registrant.buktiUrl && typeof registrant.buktiUrl === 'string' && registrant.buktiUrl.startsWith('http')) {
    const letter = colIndexToA1Letter(colMap.bukti);
    data.push({
      range: `'${safeTab}'!${letter}${rowIndex}`,
      values: [[registrant.buktiUrl]]
    });
  }

  if (data.length === 0) {
    return { success: true, updatedCells: 0 };
  }

  console.log(`[Google Sheets API v4] Batch updating ${data.length} cells at row ${rowIndex}...`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Google Sheets API Error - batchUpdate]:', res.status, err);
    throw new Error(`Gagal memperbarui rincian pendaftar di Google Sheets: ${err.error?.message || res.statusText}`);
  }

  return { success: true, method: 'google_sheets_api_v4_batch', updatedCells: data.length };
}

/**
 * Append New Registrant Row to Google Sheets
 * Matches Google Form column structure precisely!
 */
export async function appendSheetRegistrantRow({
  spreadsheetId,
  accessToken,
  tabName = 'Form Responses 1',
  colMap = {},
  registrant = {},
  rawHeaders = [],
  gasWebAppUrl = ''
}) {
  if (!spreadsheetId || !accessToken) {
    if (gasWebAppUrl) {
      return postUpdateStatusBayar(gasWebAppUrl, {
        action: 'add_registrant',
        ...registrant
      });
    }
    throw new Error('Spreadsheet ID dan OAuth Access Token diperlukan untuk menambah baris ke Google Sheets.');
  }

  const safeTab = tabName.replace(/'/g, "''");
  const numCols = Math.max(rawHeaders?.length || 0, 16);
  const rowValues = new Array(numCols).fill('');

  const setCol = (idx, fallbackIdx, val) => {
    const targetIdx = (idx !== undefined && idx >= 0) ? idx : fallbackIdx;
    if (targetIdx >= 0 && targetIdx < numCols) {
      rowValues[targetIdx] = val;
    }
  };

  // Google Form precise columns mapping:
  setCol(colMap.timestamp, 0, registrant.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19));
  setCol(colMap.nama, 1, registrant.nama || '');
  setCol(colMap.email, 2, registrant.email || '');
  setCol(colMap.whatsapp, 3, registrant.whatsapp || '');
  setCol(colMap.instansi, 4, registrant.instansi || '-');
  setCol(colMap.kota, 5, registrant.kota || '-');
  setCol(colMap.bukti, 6, registrant.buktiUrl || 'Input Manual Admin Web Dashboard');
  setCol(colMap.kategori, 7, registrant.kategori || 'Tiket Individu (1 Peserta) : Rp 100.000');
  setCol(colMap.mabar, 8, registrant.mabarNotes || '-');
  setCol(colMap.sumber, 9, 'Admin Web Dashboard Dignity');
  setCol(colMap.bank, 10, registrant.bank || 'Bank Mandiri');
  setCol(colMap.emailAlt, 11, registrant.email || '');
  setCol(colMap.status, 12, registrant.statusBayar || 'LUNAS');
  setCol(colMap.ticket, 13, registrant.nomorTicket || '');
  setCol(colMap.statusEmail, 14, registrant.statusEmailTicket || 'TERKIRIM');
  setCol(colMap.nominal, 15, registrant.nominal || 100000);

  const range = `'${safeTab}'!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  console.log(`[Google Sheets API v4] Appending new registrant row to ${range}:`, rowValues);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Google Sheets API Error - appendRow]:', res.status, err);
    throw new Error(`Gagal menambahkan pendaftar ke Google Sheets: ${err.error?.message || res.statusText}`);
  }

  const result = await res.json();
  const updatedRange = result.updates?.updatedRange || '';
  const match = updatedRange.match(/![A-Za-z]+(\d+):/);
  const newRowIndex = match ? parseInt(match[1], 10) : undefined;

  return { 
    success: true, 
    method: 'google_sheets_api_v4_append', 
    updatedRange,
    newRowIndex
  };
}
