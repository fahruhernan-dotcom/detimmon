import React, { useState, useMemo } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  Send, 
  Eye, 
  Search, 
  Filter, 
  ExternalLink, 
  QrCode, 
  FileCheck2, 
  RefreshCw, 
  AlertCircle, 
  HardDrive, 
  Share2, 
  Copy, 
  Check, 
  ChevronRight,
  MessageCircle,
  Sparkles,
  Printer
} from 'lucide-react';
import { normalizeCertificateName } from '../../utils/normalizers';
import { formatDate } from '../../utils/formatters';
import { certificateService } from '../../services/certificateService';
import { useEvent } from '../../context/EventContext';
import CertificateModal from '../../components/CertificateModal';

/**
 * CertificatesView — Dedicated operational workspace for Certificate lifecycle
 * Strictly implements PHASE_06_UI_UX_CERTIFICATE.md:
 * - Eligibility Queue → Preview Sample → Issue/Generate → Drive Archive → Send → Public Verify
 * - Clear delivery status: Belum Terbit / Siap Kirim / Terkirim
 * - Guardrail batch generation & batch sending
 * - Direct public verification link & QR
 * - White Luxury Minimal aesthetic
 */
export default function CertificatesView({
  attendances = [],
  registrants = [],
  onPreviewCert,
  onSendCertEmail,
  onBatchProcessCertificates,
  onAttendanceUpdated,
  hasGoogleToken = false,
  selectedSpeaker = 'diyah',
  initialTab = 'all'
}) {
  const { activeEvent } = useEvent();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [isIssuingBatch, setIsIssuingBatch] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeCert, setActiveCert] = useState(null);

  // ── 1. Map & Standardize Unique Certificate Items ──────────
  const certItems = useMemo(() => {
    // Group attendance records by unique participant (email or person_id)
    const groupedMap = new Map();

    attendances.forEach(item => {
      const emailKey = (item.persons?.email || item.email || '').toLowerCase().trim();
      const personIdKey = item.person_id || item.personId;
      const key = emailKey || personIdKey || item.id;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          item,
          sessions: new Set(),
          hasOverride: false
        });
      }

      const group = groupedMap.get(key);
      if (item.session_type) group.sessions.add(item.session_type);
      else group.sessions.add('LEGACY');

      if (item.status === 'CERTIFICATE_ELIGIBLE' || item.status === 'READY') {
        group.hasOverride = true;
      }
      // If one of the rows has cert details, preserve them
      if (item.nomorSertifikat || item.certificate_no) {
        group.item = { ...group.item, ...item };
      }
    });

    const list = [];
    let idx = 0;

    groupedMap.forEach((group, key) => {
      idx++;
      const item = group.item;
      const cleanName = normalizeCertificateName(item.nama || item.persons?.full_name || '');
      
      // Dual-checkpoint eligibility: Hadir Sesi 1 & Sesi 2 (atau override/legacy)
      const hasBothSessions = group.sessions.has('CHECK_IN') && group.sessions.has('CHECK_OUT');
      const duration = item.durationMinutes ?? item.duration_minutes ?? 90;
      const isEligible = group.hasOverride || hasBothSessions || (group.sessions.has('LEGACY') && duration >= 60);

      const certNo = item.nomorSertifikat || item.certificate_no || `LPK-DIGNITY/CERT/${new Date().getFullYear()}/${String(idx).padStart(6, '0')}`;
      const verifCode = item.verification_code || item.verificationCode || `dgn-${String(idx).padStart(6, '0')}`;
      const voucherCode = item.kodeVoucher || `REBATE250K-${String(idx).padStart(3, '0')}`;

      const isIssued = Boolean(item.nomorSertifikat || item.statusSertifikat === 'SELESAI' || item.status === 'GENERATED' || item.certificate_no);
      const isSent = item.statusEmailSertifikat === 'TERKIRIM' || item.status === 'SENT';

      // Find matching registrant for additional details (prefer active registrant)
      const matchedReg = registrants.find(r => 
        !r.isDeleted && (
          (r.nomorTicket && r.nomorTicket === item.nomorTicket) ||
          (r.email && r.email.toLowerCase() === (item.email || '').toLowerCase())
        )
      );

      list.push({
        ...item,
        cleanName,
        duration,
        isEligible,
        sessionsCount: group.sessions.size,
        certNo,
        verifCode,
        voucherCode,
        isIssued,
        isSent,
        institution: item.instansi || matchedReg?.instansi || 'Peserta Pelatihan',
        phone: item.whatsapp || matchedReg?.whatsapp || '',
        driveFileId: item.drive_file_id || item.driveFileId || null
      });
    });

    return list;
  }, [attendances, registrants]);

  // ── 2. Metric Calculations ────────────────────────────────
  const totalEligible = certItems.filter(c => c.isEligible).length;
  const pendingIssueCount = certItems.filter(c => c.isEligible && !c.isIssued).length;
  const readyToSendCount = certItems.filter(c => c.isEligible && c.isIssued && !c.isSent).length;
  const sentCount = certItems.filter(c => c.isSent).length;

  // ── 3. Filter Records ─────────────────────────────────────
  const filteredData = useMemo(() => {
    return certItems.filter((item) => {
      // Tab filter
      if (activeTab === 'eligibility_queue') {
        if (!item.isEligible || item.isIssued) return false;
      } else if (activeTab === 'ready_to_send') {
        if (!item.isEligible || !item.isIssued || item.isSent) return false;
      } else if (activeTab === 'sent') {
        if (!item.isSent) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.cleanName.toLowerCase().includes(q) ||
          (item.email || '').toLowerCase().includes(q) ||
          item.certNo.toLowerCase().includes(q) ||
          item.verifCode.toLowerCase().includes(q) ||
          (item.institution || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [certItems, activeTab, search]);

  // ── 4. Batch Issue Handler ────────────────────────────────
  const handleBatchIssueEligible = async () => {
    const unissuedEligible = certItems.filter(c => c.isEligible && !c.isIssued);
    if (unissuedEligible.length === 0) {
      alert('Semua peserta yang berhak sudah diterbitkan nomor sertifikatnya.');
      return;
    }

    if (!confirm(`Terbitkan resmi ${unissuedEligible.length} sertifikat untuk peserta yang berhak?`)) {
      return;
    }

    setIsIssuingBatch(true);
    try {
      if (activeEvent?.id) {
        await certificateService.batchIssueCertificates({
          eventId: activeEvent.id,
          eligibleList: unissuedEligible
        });
      }

      // Update LocalStorage
      const saved = localStorage.getItem('digniti_react_attendances');
      if (saved) {
        let currentArr = JSON.parse(saved);
        unissuedEligible.forEach(item => {
          const idx = currentArr.findIndex(a => a.id === item.id);
          if (idx >= 0) {
            currentArr[idx] = {
              ...currentArr[idx],
              nomorSertifikat: item.certNo,
              verification_code: item.verifCode,
              kodeVoucher: item.voucherCode,
              status: 'CERTIFICATE_ELIGIBLE',
              statusSertifikat: 'SELESAI'
            };
          }
        });
        localStorage.setItem('digniti_react_attendances', JSON.stringify(currentArr));
      }

      if (onAttendanceUpdated) onAttendanceUpdated();
    } catch (err) {
      alert(`Gagal menerbitkan sertifikat: ${err.message}`);
    } finally {
      setIsIssuingBatch(false);
    }
  };

  // ── 5. Copy Link / Share WA ───────────────────────────────
  const handleCopyVerifUrl = (verifCode) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}#/verify/${encodeURIComponent(verifCode)}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(verifCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShareWhatsApp = (item) => {
    const rawWa = item.phone || '';
    const cleanWa = String(rawWa).replace(/[^0-9]/g, '');
    const phone = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;

    const baseUrl = window.location.origin + window.location.pathname;
    const verifUrl = `${baseUrl}#/verify/${encodeURIComponent(item.verifCode)}`;
    const nextEventSlug = activeEvent?.next_event_slug || 'eb-solo-nov-2026';
    const nextRegisterUrl = `${baseUrl}#/daftar?event=${nextEventSlug}&voucher=${encodeURIComponent(item.voucherCode)}`;

    const message = `*SELAMAT! E-SERTIFIKAT RESMI TERBIT* 🎓\n\n` +
      `Halo *${item.cleanName}*,\n` +
      `Terima kasih telah berpartisipasi aktif dalam sesi pelatihan:\n` +
      `*${activeEvent?.title || 'Webinar Public Speaking LPK Dignity'}*\n\n` +
      `📜 *Nomor Sertifikat:* ${item.certNo}\n` +
      `🔍 *Verifikasi Publik Resmi:* ${verifUrl}\n` +
      `🎟️ *Voucher Beasiswa Lanjutan:* *${item.voucherCode}*\n` +
      `🚀 *Klaim Kupon Diskon Bootcamp:* ${nextRegisterUrl}\n\n` +
      `Simpan nomor sertifikat dan kode verifikasi Anda untuk keperluan portofolio karier profesional.`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── 1. KPI OPERATIONAL OVERVIEW TILES ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Berhak */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Berhak Sertifikat
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {totalEligible}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Peserta terverifikasi hadir &ge;60m
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Antrean Belum Terbit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Antrean Belum Terbit
            </span>
            <div className="text-2xl font-bold tracking-tight text-amber-900 font-mono">
              {pendingIssueCount}
            </div>
            <span className="text-[11px] text-amber-800 font-medium mt-0.5 block">
              Menunggu penerbitan nomor seri
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Siap Kirim Email */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Siap Dikirim (Pending Email)
            </span>
            <div className="text-2xl font-bold tracking-tight text-blue-900 font-mono">
              {readyToSendCount}
            </div>
            <span className="text-[11px] text-blue-800 font-medium mt-0.5 block">
              Nomor terbit, belum dispatch email
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Selesai Terkirim */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Selesai Terkirim
            </span>
            <div className="text-2xl font-bold tracking-tight text-emerald-800 font-mono">
              {sentCount}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
              Terkirim resmi via Gmail / GAS
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ── 2. WORKSPACE CONTROL & BATCH ACTIONS ─────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pusat Penerbitan & Distribusi E-Sertifikat</h3>
              <p className="text-xs text-slate-500">Standar resmi LPK Indonesia Dignity dengan kode verifikasi tamper-proof</p>
            </div>
          </div>
        </div>

        {/* Batch Actions with Guardrails */}
        <div className="flex items-center flex-wrap gap-2.5">
          {pendingIssueCount > 0 && (
            <button
              onClick={handleBatchIssueEligible}
              disabled={isIssuingBatch}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{isIssuingBatch ? 'Menerbitkan...' : `Terbitkan Massal (${pendingIssueCount} Peserta)`}</span>
            </button>
          )}

          {readyToSendCount > 0 && onBatchProcessCertificates && (
            <button
              onClick={async () => {
                if (confirm(`Kirim e-sertifikat via email ke ${readyToSendCount} peserta yang siap?`)) {
                  setIsSendingBatch(true);
                  try {
                    await onBatchProcessCertificates();
                  } finally {
                    setIsSendingBatch(false);
                  }
                }
              }}
              disabled={isSendingBatch}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingBatch ? 'Mengirim...' : `Kirim Email Massal (${readyToSendCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. FILTER TABS & SEARCH BAR ──────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tab Filter */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'all' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Semua ({certItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('eligibility_queue')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'eligibility_queue' 
                  ? 'bg-white text-amber-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Antrean Belum Terbit</span>
              {pendingIssueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingIssueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ready_to_send')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ready_to_send' 
                  ? 'bg-white text-blue-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Siap Dikirim</span>
              {readyToSendCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-blue-100 text-blue-800 border border-blue-300">
                  {readyToSendCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'sent' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Terkirim ({sentCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama resmi, nomor seri, kode QR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-slate-400 outline-none transition-all"
            />
          </div>

        </div>
      </div>

      {/* ── 4. CERTIFICATES TABLE ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Resmi Penerima</th>
                <th className="py-3 px-4">Nomor Seri Sertifikat</th>
                <th className="py-3 px-4">Verifikasi QR / Voucher</th>
                <th className="py-3 px-4">Status Distribusi</th>
                <th className="py-3 px-4 text-right">Aksi Terpandu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <Award className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada data sertifikat yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? 'Coba kata kunci pencarian lain.' : 'Pastikan ada peserta yang memenuhi durasi presensi.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isCopied = copiedCode === item.verifCode;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-amber-500/[0.02] transition-colors group cursor-pointer"
                      onClick={() => onPreviewCert && onPreviewCert(item)}
                    >
                      {/* Recipient Full Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-950 transition-colors flex items-center gap-1.5">
                          <span>{item.cleanName}</span>
                          {item.driveFileId && (
                            <HardDrive className="w-3 h-3 text-blue-500 shrink-0" title="Arsip Drive Tersedia" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{item.email || '-'}</span>
                          {item.institution && item.institution !== '-' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 truncate max-w-[160px]">{item.institution}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Certificate Serial Number */}
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700">
                        {item.isIssued ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 w-fit">
                              {item.certNo}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Terbit: {formatDate(item.timestamp)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-700 italic text-[11px]">
                            Belum Diterbitkan (Antrean)
                          </span>
                        )}
                      </td>

                      {/* Verification Code & Voucher */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyVerifUrl(item.verifCode)}
                            title="Salin tautan verifikasi ke clipboard"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
                          >
                            <QrCode className="w-3 h-3 text-slate-400" />
                            <span>{item.verifCode}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          <a
                            href={`#/verify/${encodeURIComponent(item.verifCode)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Buka Halaman Verifikasi Publik"
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 mt-1 block">
                          Voucher: {item.voucherCode}
                        </span>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3.5 px-4">
                        {item.isSent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terkirim Resmi</span>
                          </span>
                        ) : item.isIssued ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Siap Dikirim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Antrean Kelayakan</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          {/* Preview Modal Button */}
                          <button
                            onClick={() => {
                              setActiveCert(item);
                              if (onPreviewCert) onPreviewCert(item);
                            }}
                            title="Pratinjau Desain E-Sertifikat Resmi"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Send / Resend Email */}
                          {onSendCertEmail && (
                            <button
                              onClick={() => onSendCertEmail(item.id)}
                              title={item.isSent ? 'Kirim Ulang E-Sertifikat' : 'Kirim E-Sertifikat ke Email'}
                              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                item.isSent
                                  ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Share via WhatsApp */}
                          <button
                            onClick={() => handleShareWhatsApp(item)}
                            title="Kirim via WhatsApp Langsung"
                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Drive Archive Link if available */}
                          {item.driveFileId && (
                            <a
                              href={`https://drive.google.com/file/d/${item.driveFileId}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka Berkas di Google Drive"
                              className="p-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CertificateModal
        isOpen={Boolean(activeCert)}
        onClose={() => setActiveCert(null)}
        certData={activeCert}
        selectedSpeaker={selectedSpeaker}
      />
    </div>
  );
}
