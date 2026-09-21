import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Eye,
  Code2,
  Smartphone,
  Monitor,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Palette,
  UserCheck,
  Calendar,
  Video,
  FileCheck,
  Ticket,
  Award,
  Megaphone
} from 'lucide-react';
import {
  buildTicketEmailHtml,
  buildCertificateEmailHtml,
  buildBroadcastEmailHtml,
  sendEmailViaGmail
} from '../../services/googleApiService';

export default function EmailLayoutVerificationView({
  registrants = [],
  attendances = [],
  activeEvent = null,
  googleOAuthToken = null,
  currentUser = null,
  onShowToast = null
}) {
  // 1. Template Type State: 'ticket' | 'certificate' | 'broadcast'
  const [templateType, setTemplateType] = useState('ticket');

  // 2. View Mode State: 'preview' (Iframe) | 'code' (HTML source)
  const [viewMode, setViewMode] = useState('preview');

  // 3. Viewport Size: 'desktop' (600px) | 'mobile' (360px)
  const [viewport, setViewport] = useState('desktop');

  // 4. Design Theme: 'white' (Luxury Minimal) | 'dark' (Classic Dark Gold)
  const [theme, setTheme] = useState('white');

  // Active registrants only (exclude trash)
  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);

  // 5. Selected Participant ID or 'custom'
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    activeRegistrants.length > 0 ? activeRegistrants[0].id : 'custom'
  );

  // 6. Form Parameter State
  const [params, setParams] = useState({
    nama: 'Donies Daily',
    email: 'doniesdaily@gmail.com',
    nomorTicket: 'TICKET-DIGNITY-2026-001',
    kategori: 'Tiket Individu (1 Peserta) : Rp 100.000',
    nominal: 100000,
    instansi: 'LPK Indonesia Dignity',
    eventTitle: activeEvent?.title || 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
    eventDate: activeEvent?.date_start 
      ? new Date(activeEvent.date_start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'Sabtu, 14 November 2026',
    eventTime: '08.30 - 12.00 WIB',
    zoomLink: 'https://zoom.us/j/89241077483?pwd=DIGNITY2026',
    meetingId: '892 4107 7483',
    passcode: 'DIGNITY2026',
    waGroupLink: 'https://chat.whatsapp.com/DignityPublicSpeaking2026',
    helpdeskPhone: '+62 896-8107-7483',
    // Certificate specifics
    nomorSertifikat: 'LPK-DIGNITY/WEB-PS/XI/2026/001',
    kodeVoucher: 'REBATE100K-001',
    bootcampTitle: 'Executive Bootcamp Offline 2 Hari di Sala View Hotel Solo',
    bootcampDates: '28 - 29 November 2026',
    verifyUrl: 'http://localhost:8080/#/verify/LPK-DIGNITY%2FWEB-PS%2FXI%2F2026%2F001',
    // Broadcast specifics
    broadcastTitle: 'Pengingat Penting H-1: Persiapan Masuk Ruang Zoom Webinar',
    broadcastMessage: 'Pelatihan webinar public speaking akan dimulai besok pagi pukul 08.30 WIB. Mohon persiapkan koneksi internet yang stabil, modul materi yang telah dikirimkan, dan gunakan nama Zoom sesuai tiket resmi Anda.',
    ctaText: 'Buka Ruang Zoom Meeting',
    ctaUrl: 'https://zoom.us/j/89241077483?pwd=DIGNITY2026'
  });

  // 7. Test Email Dispatch State
  const [testRecipient, setTestRecipient] = useState(
    currentUser?.email || 'doniesdaily@gmail.com'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);
  const [isCopiedHtml, setIsCopiedHtml] = useState(false);

  // Sync parameters when selected registrant changes
  useEffect(() => {
    if (selectedParticipantId === 'custom') return;
    const found = activeRegistrants.find(r => String(r.id) === String(selectedParticipantId));
    if (found) {
      setParams(prev => ({
        ...prev,
        nama: found.nama || prev.nama,
        email: found.email || prev.email,
        nomorTicket: found.nomorTicket || prev.nomorTicket,
        kategori: found.kategori || prev.kategori,
        nominal: found.nominal || prev.nominal,
        instansi: found.instansi || prev.instansi,
        nomorSertifikat: (found.nomorTicket ? found.nomorTicket.replace('TICKET-DIGNITY', 'LPK-DIGNITY/WEB-PS') : prev.nomorSertifikat),
        verifyUrl: `http://localhost:8080/#/verify/${encodeURIComponent(found.nomorTicket ? found.nomorTicket.replace('TICKET-DIGNITY', 'LPK-DIGNITY/WEB-PS') : prev.nomorSertifikat)}`
      }));
    }
  }, [selectedParticipantId, registrants]);

  // Handle parameter form changes
  const handleParamChange = (field, val) => {
    setParams(prev => ({ ...prev, [field]: val }));
  };

  // Generate Email HTML dynamically
  const generatedHtml = useMemo(() => {
    const options = {
      theme,
      eventTitle: params.eventTitle,
      eventDate: params.eventDate,
      eventTime: params.eventTime,
      zoomLink: params.zoomLink,
      meetingId: params.meetingId,
      passcode: params.passcode,
      waGroupLink: params.waGroupLink,
      helpdeskPhone: params.helpdeskPhone,
      bootcampTitle: params.bootcampTitle,
      bootcampDates: params.bootcampDates,
      verifyUrl: params.verifyUrl
    };

    if (templateType === 'ticket') {
      return buildTicketEmailHtml(
        {
          nama: params.nama,
          nomorTicket: params.nomorTicket,
          kategori: params.kategori,
          nominal: params.nominal,
          instansi: params.instansi
        },
        options
      );
    } else if (templateType === 'certificate') {
      return buildCertificateEmailHtml(
        {
          nama: params.nama,
          nomorSertifikat: params.nomorSertifikat,
          kodeVoucher: params.kodeVoucher
        },
        options
      );
    } else {
      return buildBroadcastEmailHtml(
        {
          recipientName: params.nama,
          title: params.broadcastTitle,
          message: params.broadcastMessage,
          ctaText: params.ctaText,
          ctaUrl: params.ctaUrl
        },
        options
      );
    }
  }, [templateType, theme, params]);

  // Compute Subject Header
  const computedSubject = useMemo(() => {
    if (templateType === 'ticket') {
      return `[E-Ticket Resmi] Webinar ${params.eventTitle} - ${params.nama}`;
    } else if (templateType === 'certificate') {
      return `[E-Sertifikat & Voucher Beasiswa] Kelulusan Pelatihan Public Speaking - ${params.nama}`;
    } else {
      return `[Pemberitahuan Resmi] ${params.broadcastTitle} - LPK Indonesia Dignity`;
    }
  }, [templateType, params.eventTitle, params.nama, params.broadcastTitle]);

  // Copy raw HTML to clipboard
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(generatedHtml);
      setIsCopiedHtml(true);
      setTimeout(() => setIsCopiedHtml(false), 2500);
      if (onShowToast) onShowToast('Kode HTML email berhasil disalin!', 'success');
    } catch {
      alert('Gagal menyalin ke clipboard.');
    }
  };

  // Dispatch Test Email via Gmail API
  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      alert('Mohon masukkan alamat email tujuan pengujian.');
      return;
    }

    if (!googleOAuthToken) {
      setSendFeedback({
        success: false,
        message: 'Google OAuth token belum terhubung. Silakan login atau hubungkan akun Google di pojok kanan atas.'
      });
      return;
    }

    setIsSendingTest(true);
    setSendFeedback(null);

    try {
      const res = await sendEmailViaGmail({
        accessToken: googleOAuthToken,
        to: testRecipient,
        subject: computedSubject,
        htmlBody: generatedHtml,
        fromName: 'LPK Indonesia Dignity Official'
      });

      setSendFeedback({
        success: true,
        message: `Email uji coba berhasil dikirim ke ${testRecipient} (Message ID: ${res.id})!`
      });
      if (onShowToast) {
        onShowToast(`Email uji coba berhasil dikirim ke ${testRecipient}!`, 'success');
      }
    } catch (err) {
      console.error('Test email send failure:', err);
      setSendFeedback({
        success: false,
        message: err.message || 'Gagal mengirim email melalui Gmail API.'
      });
      if (onShowToast) {
        onShowToast(`Gagal kirim: ${err.message}`, 'error');
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Page Header & Info Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Email Layout Verification & Live Inspector Studio</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
              Verifikasi Layout & Tampilan Email Pengiriman
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Pastikan desain, tata letak, kredensial Zoom, tautan grup WhatsApp VIP, dan voucher rebate tampil sempurna di semua email client (Gmail, Apple Mail, Outlook) sebelum disiarkan ke peserta.
            </p>
          </div>

          {/* Quick Stats / OAuth Badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border ${
              googleOAuthToken
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${googleOAuthToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span>{googleOAuthToken ? 'Gmail API Ready (OAuth Aktif)' : 'Gmail API Memerlukan Login'}</span>
            </div>
          </div>
        </div>

        {/* Template Switcher Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setTemplateType('ticket')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              templateType === 'ticket'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 hover:bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${templateType === 'ticket' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Template 1</div>
              <div className="text-sm font-bold text-slate-900">E-Ticket & Akses Zoom</div>
              <div className="text-xs text-slate-500 mt-0.5">Kredensial meeting & grup VIP</div>
            </div>
          </button>

          <button
            onClick={() => setTemplateType('certificate')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              templateType === 'certificate'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 hover:bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${templateType === 'certificate' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Template 2</div>
              <div className="text-sm font-bold text-slate-900">E-Sertifikat & Voucher</div>
              <div className="text-xs text-slate-500 mt-0.5">Kelulusan & rebate Rp 100.000</div>
            </div>
          </button>

          <button
            onClick={() => setTemplateType('broadcast')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              templateType === 'broadcast'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 hover:bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className={`p-2.5 rounded-lg ${templateType === 'broadcast' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200'}`}>
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Template 3</div>
              <div className="text-sm font-bold text-slate-900">Broadcast Pengumuman</div>
              <div className="text-xs text-slate-500 mt-0.5">Notifikasi massal & reminder</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Studio Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Controls, Inspector, & Parameters (5 Cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Box 1: Data Participant Source & Styling Theme */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Konfigurasi & Sumber Data</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live Sync</span>
            </div>

            {/* Select Real Registrant */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Contoh Data Pendaftar Nyata:
              </label>
              <select
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              >
                <option value="custom">-- Data Manual / Kustom --</option>
                {activeRegistrants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama} ({r.nomorTicket || `No. ${r.id}`}) - {r.kategori}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Memilih pendaftar akan otomatis mengisikan nama, tiket, dan instansi asli.
              </p>
            </div>

            {/* Design Theme Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Tema Desain Email (Color Scheme):</span>
                <span className="text-[11px] font-mono text-amber-700 font-bold uppercase">
                  {theme === 'white' ? 'White Luxury' : 'Classic Dark'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('white')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'white'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-500/20 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white border border-slate-300 shadow-xs"></span>
                  <span>White Luxury (Clean)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-800 text-white ring-2 ring-slate-700 font-bold'
                      : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-300"></span>
                  <span>Classic Dark Gold</span>
                </button>
              </div>
            </div>
          </div>

          {/* Box 2: Dynamic Parameters Form */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {templateType === 'ticket' && 'Parameter E-Ticket & Akses Zoom'}
                  {templateType === 'certificate' && 'Parameter E-Sertifikat & Voucher'}
                  {templateType === 'broadcast' && 'Parameter Pengumuman Broadcast'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParams(prev => ({
                    ...prev,
                    nama: 'Donies Daily',
                    nomorTicket: 'TICKET-DIGNITY-2026-001',
                    eventDate: 'Sabtu, 14 November 2026',
                    eventTime: '08.30 - 12.00 WIB',
                    meetingId: '892 4107 7483',
                    passcode: 'DIGNITY2026'
                  }));
                }}
                className="text-[11px] text-amber-700 hover:underline font-semibold"
              >
                Reset Default
              </button>
            </div>

            {/* Common fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Peserta</label>
                  <input
                    type="text"
                    value={params.nama}
                    onChange={(e) => handleParamChange('nama', e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email Peserta</label>
                  <input
                    type="email"
                    value={params.email}
                    onChange={(e) => handleParamChange('email', e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Acara / Webinar</label>
                <input
                  type="text"
                  value={params.eventTitle}
                  onChange={(e) => handleParamChange('eventTitle', e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              {/* Specific to Ticket */}
              {templateType === 'ticket' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Tiket</label>
                      <input
                        type="text"
                        value={params.nomorTicket}
                        onChange={(e) => handleParamChange('nomorTicket', e.target.value)}
                        className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Instansi / Asal</label>
                      <input
                        type="text"
                        value={params.instansi}
                        onChange={(e) => handleParamChange('instansi', e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hari & Tanggal</label>
                      <input
                        type="text"
                        value={params.eventDate}
                        onChange={(e) => handleParamChange('eventDate', e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Waktu Pelaksanaan</label>
                      <input
                        type="text"
                        value={params.eventTime}
                        onChange={(e) => handleParamChange('eventTime', e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2.5">
                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kredensial Ruangan Zoom Meeting</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-blue-800 mb-1">Tautan Direct Zoom</label>
                      <input
                        type="text"
                        value={params.zoomLink}
                        onChange={(e) => handleParamChange('zoomLink', e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-blue-300 px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-800 mb-1">Meeting ID</label>
                        <input
                          type="text"
                          value={params.meetingId}
                          onChange={(e) => handleParamChange('meetingId', e.target.value)}
                          className="w-full text-xs font-mono rounded-lg border border-blue-300 px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-800 mb-1">Passcode</label>
                        <input
                          type="text"
                          value={params.passcode}
                          onChange={(e) => handleParamChange('passcode', e.target.value)}
                          className="w-full text-xs font-mono rounded-lg border border-blue-300 px-2.5 py-1.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Link WhatsApp VIP Group</label>
                    <input
                      type="text"
                      value={params.waGroupLink}
                      onChange={(e) => handleParamChange('waGroupLink', e.target.value)}
                      className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {/* Specific to Certificate */}
              {templateType === 'certificate' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Registrasi Sertifikat</label>
                      <input
                        type="text"
                        value={params.nomorSertifikat}
                        onChange={(e) => handleParamChange('nomorSertifikat', e.target.value)}
                        className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode Voucher Rebate</label>
                      <input
                        type="text"
                        value={params.kodeVoucher}
                        onChange={(e) => handleParamChange('kodeVoucher', e.target.value)}
                        className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Program Lanjutan (Bootcamp)</label>
                    <input
                      type="text"
                      value={params.bootcampTitle}
                      onChange={(e) => handleParamChange('bootcampTitle', e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jadwal Bootcamp</label>
                      <input
                        type="text"
                        value={params.bootcampDates}
                        onChange={(e) => handleParamChange('bootcampDates', e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">URL Verifikasi Publik</label>
                      <input
                        type="text"
                        value={params.verifyUrl}
                        onChange={(e) => handleParamChange('verifyUrl', e.target.value)}
                        className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Specific to Broadcast */}
              {templateType === 'broadcast' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Pengumuman</label>
                    <input
                      type="text"
                      value={params.broadcastTitle}
                      onChange={(e) => handleParamChange('broadcastTitle', e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pesan Utama Pengumuman</label>
                    <textarea
                      rows={4}
                      value={params.broadcastMessage}
                      onChange={(e) => handleParamChange('broadcastMessage', e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Label Tombol CTA</label>
                      <input
                        type="text"
                        value={params.ctaText}
                        onChange={(e) => handleParamChange('ctaText', e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tautan URL CTA</label>
                      <input
                        type="text"
                        value={params.ctaUrl}
                        onChange={(e) => handleParamChange('ctaUrl', e.target.value)}
                        className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Box 3: Test Dispatch via Gmail API */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Kirim Email Uji Coba (Live Gmail API)</h2>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Kirimkan preview template ini langsung ke inbox email Anda untuk menguji rendering di aplikasi Gmail / Outlook / Apple Mail ponsel Anda.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                Alamat Email Penerima Test:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="doniesdaily@gmail.com"
                  className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Send Feedback Alert */}
            {sendFeedback && (
              <div className={`p-3 rounded-xl text-xs border flex items-start gap-2.5 transition-all ${
                sendFeedback.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {sendFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{sendFeedback.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Visual Simulator & Code Inspector (7 Cols) ── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Bar of Preview Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Tabs: Preview vs Code */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Visual Simulator</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Inspect HTML</span>
              </button>
            </div>

            {/* Viewport & Action Controls */}
            <div className="flex items-center gap-2">
              {viewMode === 'preview' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewport('desktop')}
                    title="Desktop Email Client (600px)"
                    className={`p-1.5 rounded-lg transition-all ${
                      viewport === 'desktop'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewport('mobile')}
                    title="Smartphone Client (360px)"
                    className={`p-1.5 rounded-lg transition-all ${
                      viewport === 'mobile'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Salin Kode HTML Button */}
              <button
                type="button"
                onClick={handleCopyHtml}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
              >
                {isCopiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin HTML</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Realistic Email Client Frame */}
          <div className="bg-slate-100 rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-inner">
            {/* Mock Client Top Header */}
            <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-100">
                <span className="font-mono">From: LPK Indonesia Dignity &lt;info@dignity.id&gt;</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono">
                  {viewport === 'desktop' ? 'Standard 600px' : 'Mobile 360px'}
                </span>
              </div>
              <div className="flex items-start gap-2 pt-0.5">
                <span className="text-slate-500 font-semibold shrink-0">Subjek:</span>
                <span className="text-slate-900 font-bold truncate">{computedSubject}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span>Untuk:</span>
                <span className="font-mono text-slate-700 font-semibold">{params.nama} &lt;{params.email}&gt;</span>
              </div>
            </div>

            {/* Workspace: Preview vs HTML */}
            <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden flex justify-center min-h-[640px] relative">
              {viewMode === 'preview' ? (
                <div
                  className="transition-all duration-300 w-full flex justify-center py-4 bg-slate-50/50"
                  style={{
                    backgroundColor: theme === 'dark' ? '#04070C' : '#F1F5F9'
                  }}
                >
                  <iframe
                    title="Email Layout Preview"
                    srcDoc={generatedHtml}
                    sandbox="allow-same-origin allow-popups"
                    className="border-0 shadow-lg rounded-xl transition-all duration-300"
                    style={{
                      width: viewport === 'desktop' ? '600px' : '360px',
                      height: '750px',
                      backgroundColor: theme === 'dark' ? '#060B13' : '#F8FAFC'
                    }}
                  />
                </div>
              ) : (
                <div className="w-full p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-auto max-h-[750px] leading-relaxed select-all">
                  <pre>{generatedHtml}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
