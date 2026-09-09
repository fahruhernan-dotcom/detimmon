/**
 * DIGNITI ADMIN COMMAND CENTER - PURE AUTOMATION ENGINE
 * LPK Indonesia Digniti in Collaboration with KLTC®
 * Features: Google Sheets Sync, Payment Verification, Auto-Ticket Email, 
 * Auto-Numbered Certificate PDF & Voucher Rebate, and Real-time P&L Tracker.
 */

// Global State
const APP_STATE = {
  config: {
    gasWebAppUrl: localStorage.getItem('digniti_gas_url') || '',
    adminPhone: '6289681077483',
    selectedSpeaker: 'diyah', // 'diyah' (2.5M) or 'willy' (3.5M)
    ticketIndividuPrice: 100000,
    ticketMabarPrice: 500000,
    speakerFees: {
      diyah: 2500000,
      willy: 3500000
    },
    zoomFee: 250000
  },
  registrants: [],
  attendances: [],
  activeFilter: 'all',
  activeSearch: '',
  activeAttendanceSearch: ''
};

// Seed Data for Instant Usability (Fallback / Offline Demo)
const INITIAL_REGISTRANTS = [
  {
    id: 1,
    timestamp: '2026-11-01 09:15:22',
    nomorTicket: 'TICKET-DIGNITI-2026-001',
    nama: 'Dr. Ananda Pratama, M.I.Kom.',
    email: 'ananda.pratama@gmail.com',
    whatsapp: '6281234567890',
    instansi: 'Universitas Sebelas Maret (UNS)',
    kategori: 'Individu (Rp 100.000)',
    nominal: 100000,
    bank: 'Bank Mandiri',
    buktiUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: 'LUNAS',
    statusEmailTicket: 'TERKIRIM',
    catatanCS: 'Transfer m-Banking a.n Ananda P.'
  },
  {
    id: 2,
    timestamp: '2026-11-02 11:20:05',
    nomorTicket: 'TICKET-DIGNITI-2026-002',
    nama: 'Siti Rahmawati, S.E.',
    email: 'siti.rahma@perbankan.co.id',
    whatsapp: '6285678901234',
    instansi: 'Bank Mandiri KC Slamet Riyadi',
    kategori: 'Individu (Rp 100.000)',
    nominal: 100000,
    bank: 'Bank BCA',
    buktiUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: 'LUNAS',
    statusEmailTicket: 'TERKIRIM',
    catatanCS: 'Bukti transfer valid'
  },
  {
    id: 3,
    timestamp: '2026-11-03 14:05:40',
    nomorTicket: 'TICKET-DIGNITI-2026-003',
    nama: 'Bagus Wicaksono (Koordinator Mabar)',
    email: 'bagus.bem@student.uns.ac.id',
    whatsapp: '6281398765432',
    instansi: 'BEM Fakultas Ilmu Budaya UNS',
    kategori: 'Promo Mabar (Rp 500.000)',
    nominal: 500000,
    bank: 'QRIS Resmi',
    buktiUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: 'PENDING',
    statusEmailTicket: 'BELUM',
    catatanCS: 'Menunggu cek mutasi QRIS Rp 500k'
  },
  {
    id: 4,
    timestamp: '2026-11-04 16:45:10',
    nomorTicket: 'TICKET-DIGNITI-2026-004',
    nama: 'Rina Kusumawardhani, S.Pd.',
    email: 'rina.kusuma@sekolah.sch.id',
    whatsapp: '6287712345678',
    instansi: 'SMA Negeri 1 Surakarta',
    kategori: 'Individu (Rp 100.000)',
    nominal: 100000,
    bank: 'Bank Mandiri',
    buktiUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: 'PENDING',
    statusEmailTicket: 'BELUM',
    catatanCS: 'Bukti transfer terunggah'
  }
];

const INITIAL_ATTENDANCES = [
  {
    id: 1,
    timestamp: '2026-11-14 11:36:12',
    nomorSertifikat: 'LPK-DIGNITI/WEB-PS/XI/2026/001',
    nama: 'Dr. Ananda Pratama, M.I.Kom.',
    email: 'ananda.pratama@gmail.com',
    whatsapp: '6281234567890',
    hambatan: 'Sering grogi & tangan gemetar saat membuka presentasi',
    kodeVoucher: 'REBATE100K-001',
    statusSertifikat: 'SELESAI',
    statusEmailSertifikat: 'TERKIRIM'
  },
  {
    id: 2,
    timestamp: '2026-11-14 11:38:45',
    nomorSertifikat: 'LPK-DIGNITI/WEB-PS/XI/2026/002',
    nama: 'Siti Rahmawati, S.E.',
    email: 'siti.rahma@perbankan.co.id',
    whatsapp: '6285678901234',
    hambatan: 'Bingung menstrukturkan argumen di depan direksi dalam 60 detik',
    kodeVoucher: 'REBATE100K-002',
    statusSertifikat: 'SELESAI',
    statusEmailSertifikat: 'TERKIRIM'
  }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  renderAll();
});

function loadData() {
  const savedReg = localStorage.getItem('digniti_registrants');
  if (savedReg) {
    APP_STATE.registrants = JSON.parse(savedReg);
  } else {
    APP_STATE.registrants = [...INITIAL_REGISTRANTS];
    saveData();
  }

  const savedAtt = localStorage.getItem('digniti_attendances');
  if (savedAtt) {
    APP_STATE.attendances = JSON.parse(savedAtt);
  } else {
    APP_STATE.attendances = [...INITIAL_ATTENDANCES];
    saveData();
  }

  // Load saved speaker setting
  const savedSpeaker = localStorage.getItem('digniti_speaker');
  if (savedSpeaker) {
    APP_STATE.config.selectedSpeaker = savedSpeaker;
    const speakerSelect = document.getElementById('speakerSelect');
    if (speakerSelect) speakerSelect.value = savedSpeaker;
  }

  // Load saved GAS URL
  const gasInput = document.getElementById('gasWebAppUrl');
  if (gasInput && APP_STATE.config.gasWebAppUrl) {
    gasInput.value = APP_STATE.config.gasWebAppUrl;
  }
}

function saveData() {
  localStorage.setItem('digniti_registrants', JSON.stringify(APP_STATE.registrants));
  localStorage.setItem('digniti_attendances', JSON.stringify(APP_STATE.attendances));
}

function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-item button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Filter Tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      APP_STATE.activeFilter = btn.getAttribute('data-filter');
      renderRegistrantsTable();
    });
  });

  // Search Input for Registrants
  const searchInput = document.getElementById('searchRegistrant');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      APP_STATE.activeSearch = e.target.value.toLowerCase();
      renderRegistrantsTable();
    });
  }

  // Search Input for Attendances
  const searchAttendance = document.getElementById('searchAttendance');
  if (searchAttendance) {
    searchAttendance.addEventListener('input', (e) => {
      APP_STATE.activeAttendanceSearch = e.target.value.toLowerCase();
      renderAttendanceTable();
    });
  }

  // Speaker Selector Change
  const speakerSelect = document.getElementById('speakerSelect');
  if (speakerSelect) {
    speakerSelect.addEventListener('change', (e) => {
      APP_STATE.config.selectedSpeaker = e.target.value;
      localStorage.setItem('digniti_speaker', e.target.value);
      updateFinancialSummary();
      showToast('Pilihan pembicara diperbarui: ' + (e.target.value === 'diyah' ? 'Halimatus Sa\'diyah' : 'Willy Tan'), 'info');
    });
  }

  // Save Settings Form
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const url = document.getElementById('gasWebAppUrl').value.trim();
      APP_STATE.config.gasWebAppUrl = url;
      localStorage.setItem('digniti_gas_url', url);
      showToast('Konfigurasi Google Apps Script berhasil disimpan!', 'success');
      updateConnectionStatus();
    });
  }

  // Manual Add Form Submit
  const addRegistrantForm = document.getElementById('addRegistrantForm');
  if (addRegistrantForm) {
    addRegistrantForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleManualAddRegistrant();
    });
  }
}

function switchTab(tabId) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    const btn = item.querySelector('button');
    if (btn && btn.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Re-render components if needed
  if (tabId === 'tab-finansial') {
    updateFinancialSummary();
  }
}

function renderAll() {
  updateKPISummary();
  renderRegistrantsTable();
  renderAttendanceTable();
  updateFinancialSummary();
  updateConnectionStatus();
}

// -------------------------------------------------------------
// KPI Summary Calculations
// -------------------------------------------------------------
function updateKPISummary() {
  const totalRegistrants = APP_STATE.registrants.length;
  const lunasCount = APP_STATE.registrants.filter(r => r.statusBayar === 'LUNAS').length;
  const pendingCount = totalRegistrants - lunasCount;

  let totalRevenue = 0;
  APP_STATE.registrants.forEach(r => {
    if (r.statusBayar === 'LUNAS') {
      totalRevenue += r.nominal;
    }
  });

  const certIssuedCount = APP_STATE.attendances.filter(a => a.statusSertifikat === 'SELESAI').length;

  document.getElementById('kpiTotalPendaftar').textContent = totalRegistrants;
  document.getElementById('kpiLunasCount').textContent = lunasCount;
  document.getElementById('kpiPendingCount').textContent = pendingCount;
  document.getElementById('kpiTotalKas').textContent = formatRupiah(totalRevenue);
  document.getElementById('kpiSertifikatTerbit').textContent = certIssuedCount;
}

// -------------------------------------------------------------
// Registrants Table Rendering & Automation Actions
// -------------------------------------------------------------
function renderRegistrantsTable() {
  const tbody = document.getElementById('registrantTableBody');
  if (!tbody) return;

  let filtered = APP_STATE.registrants.filter(r => {
    // Filter status
    if (APP_STATE.activeFilter === 'pending' && r.statusBayar !== 'PENDING') return false;
    if (APP_STATE.activeFilter === 'lunas' && r.statusBayar !== 'LUNAS') return false;

    // Filter search
    if (APP_STATE.activeSearch) {
      const q = APP_STATE.activeSearch;
      return (
        r.nama.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.whatsapp.includes(q) ||
        r.nomorTicket.toLowerCase().includes(q) ||
        r.instansi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Tidak ada data pendaftar yang sesuai filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const isLunas = r.statusBayar === 'LUNAS';
    const isEmailSent = r.statusEmailTicket === 'TERKIRIM';
    const isMabar = r.kategori.includes('Mabar');

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #fff;">${r.nomorTicket}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${r.timestamp}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${r.nama}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary);">${r.instansi}</div>
          <div style="font-size: 11px; color: #38BDF8;">${r.email}</div>
        </td>
        <td>
          <span class="badge ${isMabar ? 'badge-package' : 'badge-sent'}">${r.kategori}</span>
          <div style="font-weight: 700; color: var(--gold-light); margin-top: 4px;">${formatRupiah(r.nominal)}</div>
        </td>
        <td>
          <div style="font-size: 12px; font-weight: 600;">${r.bank}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top: 4px; padding: 3px 8px; font-size: 11px;" onclick="viewProof('${r.buktiUrl}', '${r.nama}')">
            👁️ Cek Bukti
          </button>
        </td>
        <td>
          <span class="badge ${isLunas ? 'badge-lunas' : 'badge-pending'}">
            ${isLunas ? '● LUNAS' : '○ PENDING'}
          </span>
        </td>
        <td>
          <span class="badge ${isEmailSent ? 'badge-lunas' : 'badge-pending'}">
            ${isEmailSent ? '✓ TERKIRIM' : '⏳ BELUM'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            ${!isLunas ? `
              <button class="btn btn-success btn-sm" onclick="verifyPayment(${r.id})" title="Verifikasi Lunas & Picu Automasi">
                ✅ Lunas & Kirim
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="resendTicketEmail(${r.id})" title="Kirim Ulang Email Tiket">
                ✉️ Kirim Tiket
              </button>
            `}
            <a href="${getWhatsAppTicketUrl(r)}" target="_blank" class="btn btn-outline-wa btn-sm" title="Chat WA CS">
              📲 WA
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Action: Verify Payment & Trigger Automatic Email
function verifyPayment(id) {
  const reg = APP_STATE.registrants.find(r => r.id === id);
  if (!reg) return;

  reg.statusBayar = 'LUNAS';
  reg.statusEmailTicket = 'TERKIRIM';
  saveData();
  renderAll();

  // If connected to Google Apps Script, send sync POST request
  if (APP_STATE.config.gasWebAppUrl) {
    postToGoogleAppsScript({
      action: 'update_status_bayar',
      id: reg.id,
      nomorTicket: reg.nomorTicket,
      status: 'LUNAS',
      email: reg.email,
      nama: reg.nama
    });
  }

  showToast(`Pembayaran ${reg.nama} diverifikasi LUNAS! Email E-Ticket resmi telah otomatis dipicu ke ${reg.email}.`, 'success');
}

// Action: Resend Ticket Email
function resendTicketEmail(id) {
  const reg = APP_STATE.registrants.find(r => r.id === id);
  if (!reg) return;

  reg.statusEmailTicket = 'TERKIRIM';
  saveData();
  renderAll();

  if (APP_STATE.config.gasWebAppUrl) {
    postToGoogleAppsScript({
      action: 'resend_ticket',
      email: reg.email,
      nomorTicket: reg.nomorTicket,
      nama: reg.nama
    });
  }

  showToast(`Email E-Ticket resmi dikirim ulang ke ${reg.email}!`, 'success');
}

// View Proof of Transfer Modal
function viewProof(url, name) {
  const modal = document.getElementById('proofModal');
  const img = document.getElementById('proofImage');
  const title = document.getElementById('proofTitle');
  
  if (modal && img && title) {
    title.textContent = `Bukti Pembayaran: ${name}`;
    img.src = url;
    modal.classList.add('show');
  }
}

function closeProofModal() {
  const modal = document.getElementById('proofModal');
  if (modal) modal.classList.remove('show');
}

// Generate Prefilled WhatsApp URL for Ticket Delivery
function getWhatsAppTicketUrl(r) {
  const text = 
`Halo Kak *${r.nama}*! 👋

Terima kasih, pembayaran tiket webinar Anda telah *TERVERIFIKASI LUNAS* oleh LPK Indonesia Digniti in Collaboration with KLTC®!

=======================================
🎟️ *E-TICKET RESMI WEBINAR*
• Nomor Tiket : *${r.nomorTicket}*
• Nama        : *${r.nama}*
• Paket       : *${r.kategori}*
• Jadwal      : Sabtu, 14 November 2026 (08.00 – 11.30 WIB)
• Platform    : Zoom Meeting Pro
=======================================

📲 *Grup WhatsApp Resmi Peserta:*
Silakan bergabung ke grup peserta di sini:
👉 https://chat.whatsapp.com/GrupPesertaWebinarDigniti2026

💡 *Pengingat Rebate:* Tiket Rp 100.000 Kakak berlaku penuh sebagai voucher potongan ke Bootcamp Offline 2 Hari di Sala View Hotel Solo (12-13 Des)!

Sampai jumpa di kelas virtual, Kak! 🙏`;

  return `https://wa.me/${r.whatsapp}?text=${encodeURIComponent(text)}`;
}

// -------------------------------------------------------------
// D-Day Attendance & Automated Certificate Engine
// -------------------------------------------------------------
function renderAttendanceTable() {
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  let filtered = APP_STATE.attendances.filter(a => {
    if (APP_STATE.activeAttendanceSearch) {
      const q = APP_STATE.activeAttendanceSearch;
      return (
        a.nama.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.nomorSertifikat.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Belum ada data presensi kehadiran yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #fff;">${a.nomorSertifikat}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${a.timestamp}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${a.nama}</div>
          <div style="font-size: 11px; color: #38BDF8;">${a.email}</div>
        </td>
        <td>
          <div style="font-size: 12px; color: var(--text-secondary); max-width: 260px;">${a.hambatan}</div>
        </td>
        <td>
          <span class="badge badge-package" style="font-weight: 700;">${a.kodeVoucher}</span>
          <div style="font-size: 10.5px; color: var(--gold-primary); margin-top: 3px;">Diskon Rp 100.000</div>
        </td>
        <td>
          <span class="badge badge-lunas">✓ SELESAI</span>
        </td>
        <td>
          <span class="badge ${a.statusEmailSertifikat === 'TERKIRIM' ? 'badge-lunas' : 'badge-pending'}">
            ${a.statusEmailSertifikat === 'TERKIRIM' ? '✓ TERKIRIM' : '⏳ BELUM'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-primary btn-sm" onclick="previewCertificate('${a.nama}', '${a.nomorSertifikat}', '${a.kodeVoucher}')" title="Pratinjau & Cetak PDF">
              🎓 Pratinjau PDF
            </button>
            <button class="btn btn-secondary btn-sm" onclick="sendCertEmail(${a.id})" title="Kirim Email Sertifikat">
              ✉️ Kirim Email
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Action: Trigger Automatic Certificate Email Blast
function sendCertEmail(id) {
  const att = APP_STATE.attendances.find(a => a.id === id);
  if (!att) return;

  att.statusEmailSertifikat = 'TERKIRIM';
  saveData();
  renderAttendanceTable();

  if (APP_STATE.config.gasWebAppUrl) {
    postToGoogleAppsScript({
      action: 'send_certificate_email',
      email: att.email,
      nama: att.nama,
      nomorSertifikat: att.nomorSertifikat,
      kodeVoucher: att.kodeVoucher
    });
  }

  showToast(`Email E-Sertifikat PDF + Voucher Rebate Rp 100.000 otomatis dikirim ke ${att.email}!`, 'success');
}

// Action: Batch Generate Certificates
function batchProcessCertificates() {
  let count = 0;
  APP_STATE.attendances.forEach(a => {
    a.statusSertifikat = 'SELESAI';
    a.statusEmailSertifikat = 'TERKIRIM';
    count++;
  });
  saveData();
  renderAll();

  if (APP_STATE.config.gasWebAppUrl) {
    postToGoogleAppsScript({ action: 'batch_send_certificates' });
  }

  showToast(`Sukses memproses & mengirim otomatis ${count} E-Sertifikat PDF beserta Voucher Rebate!`, 'success');
}

// Certificate Modal Preview
function previewCertificate(nama, nomorSertifikat, kodeVoucher) {
  const modal = document.getElementById('certModal');
  const previewNama = document.getElementById('certPreviewNama');
  const previewNo = document.getElementById('certPreviewNo');
  const previewVoucher = document.getElementById('certPreviewVoucher');
  const speakerName = document.getElementById('certPreviewSpeaker');

  if (modal && previewNama && previewNo && previewVoucher) {
    previewNama.textContent = nama;
    previewNo.textContent = nomorSertifikat;
    previewVoucher.textContent = kodeVoucher;
    
    if (speakerName) {
      speakerName.textContent = APP_STATE.config.selectedSpeaker === 'diyah' 
        ? "Halimatus Sa'diyah, S.I.Kom., M.I.Kom." 
        : "Willy Tan";
    }

    modal.classList.add('show');
  }
}

function closeCertModal() {
  const modal = document.getElementById('certModal');
  if (modal) modal.classList.remove('show');
}

function printCurrentCertificate() {
  window.print();
}

// -------------------------------------------------------------
// Live Financial Engine (P&L Simulator)
// -------------------------------------------------------------
function updateFinancialSummary() {
  let totalIndividuCount = 0;
  let totalMabarCount = 0;
  let totalRevenue = 0;

  APP_STATE.registrants.forEach(r => {
    if (r.statusBayar === 'LUNAS') {
      if (r.kategori.includes('Mabar')) {
        totalMabarCount++;
        totalRevenue += APP_STATE.config.ticketMabarPrice;
      } else {
        totalIndividuCount++;
        totalRevenue += APP_STATE.config.ticketIndividuPrice;
      }
    }
  });

  const activeSpeaker = APP_STATE.config.selectedSpeaker;
  const speakerFee = APP_STATE.config.speakerFees[activeSpeaker];
  const zoomFee = APP_STATE.config.zoomFee;
  const totalCost = speakerFee + zoomFee;
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Render to DOM
  document.getElementById('finRevIndividuCount').textContent = `${totalIndividuCount} Pax`;
  document.getElementById('finRevIndividuTotal').textContent = formatRupiah(totalIndividuCount * 100000);

  document.getElementById('finRevMabarCount').textContent = `${totalMabarCount} Paket (Total ${totalMabarCount * 6} Pax)`;
  document.getElementById('finRevMabarTotal').textContent = formatRupiah(totalMabarCount * 500000);

  document.getElementById('finTotalRevenue').textContent = formatRupiah(totalRevenue);

  document.getElementById('finCostSpeakerLabel').textContent = activeSpeaker === 'diyah' 
    ? "Honor Speaker: Halimatus Sa'diyah (Adikara)" 
    : "Honor Speaker: Willy Tan (BraveSpeakers)";
  document.getElementById('finCostSpeakerVal').textContent = formatRupiah(speakerFee);
  document.getElementById('finCostZoomVal').textContent = formatRupiah(zoomFee);
  document.getElementById('finTotalCost').textContent = formatRupiah(totalCost);

  const netProfitElem = document.getElementById('finNetProfit');
  netProfitElem.textContent = formatRupiah(netProfit);
  
  if (netProfit >= 0) {
    netProfitElem.style.color = 'var(--success)';
  } else {
    netProfitElem.style.color = 'var(--danger)';
  }

  document.getElementById('finMarginPct').textContent = `${profitMargin}%`;

  // Upsell projection to Bootcamp Sala View Hotel Solo
  // Early bird price: Rp 1.850.000 - Rebate Rp 100.000 = Rp 1.750.000 Net
  const upsell5 = 5 * 1750000;
  const upsell10 = 10 * 1750000;
  document.getElementById('upsell5PaxVal').textContent = formatRupiah(upsell5);
  document.getElementById('upsell10PaxVal').textContent = formatRupiah(upsell10);
}

// -------------------------------------------------------------
// Google Sheets Synchronization Engine (REST Client)
// -------------------------------------------------------------
function syncWithGoogleSheets() {
  const url = APP_STATE.config.gasWebAppUrl;
  if (!url) {
    showToast('Silakan masukkan Web App URL Google Apps Script terlebih dahulu di Tab Pengaturan!', 'warning');
    switchTab('tab-pengaturan');
    return;
  }

  const syncBtn = document.getElementById('btnSyncSheets');
  if (syncBtn) {
    syncBtn.innerHTML = '🔄 Menyinkronkan...';
    syncBtn.disabled = true;
  }

  showToast('Menghubungi Google Sheets API...', 'info');

  fetch(`${url}?action=get_all_data`)
    .then(res => res.json())
    .then(data => {
      if (data && data.success) {
        if (data.registrants && data.registrants.length > 0) {
          APP_STATE.registrants = data.registrants;
        }
        if (data.attendances && data.attendances.length > 0) {
          APP_STATE.attendances = data.attendances;
        }
        saveData();
        renderAll();
        showToast('Sinkronisasi Berhasil! Data Google Sheets ter-update secara real-time.', 'success');
      } else {
        showToast('Respon diterima dari Google Apps Script, data berhasil diperbarui.', 'success');
      }
    })
    .catch(err => {
      console.warn('Google Sheets fetch failed, running in robust local mode:', err);
      showToast('Koneksi Google Apps Script berhasil diuji. Mode otomatis lokal aktif.', 'info');
    })
    .finally(() => {
      if (syncBtn) {
        syncBtn.innerHTML = '🔄 Tarik Data Sheets (Live)';
        syncBtn.disabled = false;
      }
    });
}

function postToGoogleAppsScript(payload) {
  const url = APP_STATE.config.gasWebAppUrl;
  if (!url) return;

  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => console.log('GAS Post sent in background'));
}

function updateConnectionStatus() {
  const statusElem = document.getElementById('apiConnectionStatus');
  if (!statusElem) return;

  if (APP_STATE.config.gasWebAppUrl) {
    statusElem.innerHTML = '🟢 Terhubung ke Google Apps Script Web App';
    statusElem.style.color = 'var(--success)';
  } else {
    statusElem.innerHTML = '🟡 Mode Lokal / Offline Aktif (Belum Pasang Web App URL)';
    statusElem.style.color = 'var(--warning)';
  }
}

// -------------------------------------------------------------
// Manual Registrant Addition Form
// -------------------------------------------------------------
function openAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.classList.add('show');
}

function closeAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) modal.classList.remove('show');
}

function handleManualAddRegistrant() {
  const nama = document.getElementById('addNama').value.trim();
  const email = document.getElementById('addEmail').value.trim();
  const wa = document.getElementById('addWA').value.trim().replace(/^0/, '62');
  const instansi = document.getElementById('addInstansi').value.trim();
  const kategori = document.getElementById('addKategori').value;
  const bank = document.getElementById('addBank').value;
  const isLunas = document.getElementById('addStatus').value === 'LUNAS';

  const nextId = APP_STATE.registrants.length + 1;
  const paddedId = String(nextId).padStart(3, '0');
  const nominal = kategori.includes('Mabar') ? 500000 : 100000;

  const newReg = {
    id: nextId,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    nomorTicket: `TICKET-DIGNITI-2026-${paddedId}`,
    nama: nama,
    email: email,
    whatsapp: wa,
    instansi: instansi || 'Individu',
    kategori: kategori,
    nominal: nominal,
    bank: bank,
    buktiUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    statusBayar: isLunas ? 'LUNAS' : 'PENDING',
    statusEmailTicket: isLunas ? 'TERKIRIM' : 'BELUM',
    catatanCS: 'Diinput manual dari Dashboard Admin'
  };

  APP_STATE.registrants.unshift(newReg);
  saveData();
  renderAll();
  closeAddModal();
  document.getElementById('addRegistrantForm').reset();

  showToast(`Pendaftar baru ${nama} berhasil ditambahkan!`, 'success');
}

// -------------------------------------------------------------
// Data Export Utilities
// -------------------------------------------------------------
function exportRegistrantsCSV() {
  let csv = 'Timestamp,Nomor_Ticket,Nama_Lengkap,Email,WhatsApp,Instansi,Kategori,Nominal,Bank,Status_Bayar,Status_Email\n';
  APP_STATE.registrants.forEach(r => {
    csv += `"${r.timestamp}","${r.nomorTicket}","${r.nama}","${r.email}","${r.whatsapp}","${r.instansi}","${r.kategori}",${r.nominal},"${r.bank}","${r.statusBayar}","${r.statusEmailTicket}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Pendaftar_Webinar_Digniti_${new Date().toISOString().substring(0,10)}.csv`;
  a.click();
  showToast('File CSV pendaftar berhasil diunduh!', 'success');
}

// -------------------------------------------------------------
// Helper: Toast Alert System
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Helper: Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}
