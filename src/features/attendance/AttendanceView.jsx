import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  QrCode, 
  Eye, 
  Edit3, 
  Trash2, 
  Award, 
  Users, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  Camera, 
  X, 
  Maximize2, 
  HardDrive,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { attendanceService } from '../../services/attendanceService';
import { useEvent } from '../../context/EventContext';

/**
 * AttendanceView — Dual-Checkpoint Live Attendance Command Center
 * End-to-End Engine:
 * - Sesi 1 (Awal/Masuk) & Sesi 2 (Akhir/Penutupan) Checkpoints
 * - Anti-Fraud Screenshot Evidence Viewer (Zoom Display Name & Live SS)
 * - Automatic Certificate Eligibility: Lulus Penuh (2/2 Hadir) vs Tidak Lengkap vs Alpha
 * - Quick Link Copy for Zoom Chat / WhatsApp Blast
 * - Manual Admin Override with Audit Reason
 */
export default function AttendanceView({
  attendances = [],
  registrants = [],
  onSelectParticipant,
  onPreviewCert,
  onDeleteAttendance,
  onAttendanceUpdated,
  initialTab = 'all'
}) {
  const { activeEvent } = useEvent();
  const [activeTab, setActiveTab] = useState(initialTab); // 'all' | 'lulus' | 'partial' | 'alpha'
  const [search, setSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick Check-In Bar State (untuk admin yang ingin check-in kan manual dari panel)
  const [ticketInput, setTicketInput] = useState('');
  const [sessionInput, setSessionInput] = useState('CHECK_IN'); // 'CHECK_IN' | 'CHECK_OUT'
  const [durationInput, setDurationInput] = useState('90');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(null);
  const [checkInError, setCheckInError] = useState('');

  // Screenshot Lightbox Modal State
  const [activeScreenshot, setActiveScreenshot] = useState(null);

  // Manual Status Override Modal State
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('CERTIFICATE_ELIGIBLE');
  const [overrideReason, setOverrideReason] = useState('Dispensasi Khusus Panitia / Hadir Fisik');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // ── 1. Map Attendances by Participant Key ───────────────────
  const attendanceMap = useMemo(() => {
    const map = new Map();

    attendances.forEach(att => {
      const emailKey = (att.persons?.email || att.email || '').toLowerCase().trim();
      const personIdKey = att.person_id || att.personId;
      const key = emailKey || personIdKey || att.id;

      if (!map.has(key)) {
        map.set(key, { checkIn: null, checkOut: null, items: [] });
      }

      const entry = map.get(key);
      entry.items.push(att);

      if (att.session_type === 'CHECK_IN') {
        entry.checkIn = att;
      } else if (att.session_type === 'CHECK_OUT') {
        entry.checkOut = att;
      } else {
        // Fallback untuk catatan lama tanpa kolom session_type
        if (!entry.checkIn) entry.checkIn = att;
        else if (!entry.checkOut) entry.checkOut = att;
      }
    });

    return map;
  }, [attendances]);

  // ── 2. Build Dual-Checkpoint Matrix ─────────────────────────
  const matrixParticipants = useMemo(() => {
    const list = [];
    const processedKeys = new Set();

    // A. Peserta dari database registrasi (hanya peserta aktif non-deleted)
    registrants.filter(r => !r.isDeleted).forEach(reg => {
      const emailKey = (reg.email || '').toLowerCase().trim();
      const personIdKey = reg.person_id || reg.personId || reg.id;
      const key = emailKey || personIdKey;
      processedKeys.add(key);

      const attRecord = (emailKey && attendanceMap.get(emailKey)) || 
                        (personIdKey && attendanceMap.get(personIdKey)) || 
                        null;

      const checkIn = attRecord?.checkIn || null;
      const checkOut = attRecord?.checkOut || null;

      const hasS1 = Boolean(checkIn);
      const hasS2 = Boolean(checkOut);

      // Manual override flag
      const isManualOverride = checkIn?.status === 'CERTIFICATE_ELIGIBLE' || 
                               checkOut?.status === 'CERTIFICATE_ELIGIBLE' ||
                               reg.statusPresensi === 'CERTIFICATE_ELIGIBLE';

      let statusKelayakan = 'ALPHA'; // 'LULUS' | 'PARTIAL' | 'ALPHA'
      if (isManualOverride || (hasS1 && hasS2)) {
        statusKelayakan = 'LULUS';
      } else if (hasS1 || hasS2) {
        statusKelayakan = 'PARTIAL';
      }

      list.push({
        id: reg.id,
        registrantId: reg.id,
        nama: reg.nama,
        email: reg.email,
        whatsapp: reg.whatsapp,
        instansi: reg.instansi,
        nomorTicket: reg.nomorTicket,
        statusBayar: reg.statusBayar || 'PENDING',
        checkIn,
        checkOut,
        hasS1,
        hasS2,
        statusKelayakan,
        isManualOverride,
        originalRegistrant: reg
      });
    });

    // B. Peserta yang tercatat di attendances tetapi belum ada di array registrants
    attendanceMap.forEach((attRecord, key) => {
      if (!processedKeys.has(key)) {
        const sample = attRecord.checkIn || attRecord.checkOut || attRecord.items[0];
        const hasS1 = Boolean(attRecord.checkIn);
        const hasS2 = Boolean(attRecord.checkOut);
        const isManualOverride = attRecord.checkIn?.status === 'CERTIFICATE_ELIGIBLE' || attRecord.checkOut?.status === 'CERTIFICATE_ELIGIBLE';

        let statusKelayakan = 'ALPHA';
        if (isManualOverride || (hasS1 && hasS2)) {
          statusKelayakan = 'LULUS';
        } else if (hasS1 || hasS2) {
          statusKelayakan = 'PARTIAL';
        }

        list.push({
          id: sample.id,
          registrantId: null,
          nama: sample.persons?.full_name || sample.nama || 'Peserta Live',
          email: sample.persons?.email || sample.email || key,
          whatsapp: sample.persons?.whatsapp || sample.whatsapp || '',
          instansi: sample.persons?.institution || sample.instansi || '-',
          nomorTicket: sample.nomorTicket || '-',
          statusBayar: 'LUNAS',
          checkIn: attRecord.checkIn,
          checkOut: attRecord.checkOut,
          hasS1,
          hasS2,
          statusKelayakan,
          isManualOverride,
          originalRegistrant: null
        });
      }
    });

    return list;
  }, [registrants, attendanceMap]);

  // ── 3. Calculate Metric Counters ────────────────────────────
  const totalParticipants = matrixParticipants.length;
  const lulusCount = matrixParticipants.filter(p => p.statusKelayakan === 'LULUS').length;
  const partialCount = matrixParticipants.filter(p => p.statusKelayakan === 'PARTIAL').length;
  const alphaCount = matrixParticipants.filter(p => p.statusKelayakan === 'ALPHA').length;

  // ── 4. Filter List by Active Tab & Search ───────────────────
  const filteredData = useMemo(() => {
    let list = matrixParticipants;

    if (activeTab === 'lulus') {
      list = list.filter(p => p.statusKelayakan === 'LULUS');
    } else if (activeTab === 'partial') {
      list = list.filter(p => p.statusKelayakan === 'PARTIAL');
    } else if (activeTab === 'alpha') {
      list = list.filter(p => p.statusKelayakan === 'ALPHA');
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p => 
      (p.nama || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.nomorTicket || '').toLowerCase().includes(q) ||
      (p.instansi || '').toLowerCase().includes(q) ||
      (p.checkIn?.zoom_display_name || '').toLowerCase().includes(q) ||
      (p.checkOut?.zoom_display_name || '').toLowerCase().includes(q)
    );
  }, [matrixParticipants, activeTab, search]);

  // ── 5. Public Attendance Link Handler ───────────────────────
  const publicPresensiUrl = useMemo(() => {
    const slug = activeEvent?.slug || 'msc-nov-2026';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#/presensi?event=${slug}`;
  }, [activeEvent?.slug]);

  const handleCopyPresensiLink = () => {
    navigator.clipboard.writeText(publicPresensiUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // ── 6. Quick Check-In Handler (Admin Panel Direct) ──────────
  const handleQuickCheckIn = async (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) {
      setCheckInError('Masukkan nomor tiket atau email peserta.');
      return;
    }

    setCheckInLoading(true);
    setCheckInError('');
    setCheckInSuccess(null);

    try {
      const cleanCode = ticketInput.trim();
      const duration = parseInt(durationInput, 10) || 90;

      if (activeEvent?.id) {
        // Coba panggil service check-in
        await attendanceService.checkInParticipant({
          eventId: activeEvent.id,
          ticketCode: cleanCode.includes('@') ? null : cleanCode.toUpperCase(),
          durationMinutes: duration
        });
      }

      setCheckInSuccess({
        target: cleanCode,
        session: sessionInput === 'CHECK_IN' ? 'Sesi 1 (Awal)' : 'Sesi 2 (Akhir)'
      });
      setTicketInput('');
      if (onAttendanceUpdated) onAttendanceUpdated();
    } catch (err) {
      setCheckInError(err.message || 'Gagal mencatat check-in peserta.');
    } finally {
      setCheckInLoading(false);
    }
  };

  // ── 7. Manual Override Save ─────────────────────────────────
  const handleSaveOverride = async () => {
    if (!overrideTarget) return;

    setIsSavingOverride(true);
    try {
      const attId = overrideTarget.checkIn?.id || overrideTarget.checkOut?.id;
      if (attId) {
        await attendanceService.updateAttendanceStatus({
          attendanceId: attId,
          status: overrideStatus,
          notes: overrideReason
        });
      }
      setOverrideTarget(null);
      if (onAttendanceUpdated) onAttendanceUpdated();
    } catch (err) {
      alert(`Gagal menyimpan koreksi manual: ${err.message}`);
    } finally {
      setIsSavingOverride(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* ── 1. LIVE ATTENDANCE BROADCAST & QUICK SHARE BAR ──── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider font-mono">
              Live Hari-H Dual Checkpoint
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Fraud System Aktif</span>
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Formulir Presensi Mandiri Peserta: {activeEvent?.title || 'Webinar'}</span>
          </h2>

          <p className="text-xs text-slate-400 max-w-xl line-clamp-1">
            Tautan presensi mandiri untuk dibagikan ke ruang Zoom chat pada Sesi 01 (Awal) & Sesi 02 (Akhir).
          </p>
        </div>

        {/* Action Buttons for Presensi Link */}
        <div className="flex items-center flex-wrap gap-2.5 z-10 w-full md:w-auto">
          <button
            onClick={handleCopyPresensiLink}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Link Presensi Zoom</span>
              </>
            )}
          </button>

          <a
            href={publicPresensiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <span>Buka Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {activeEvent?.web_registration_config?.drive_folder_url && (
            <a
              href={activeEvent.web_registration_config.drive_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition flex items-center gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Drive Acara</span>
            </a>
          )}
        </div>
      </div>

      {/* ── 2. KPI METRICS CARDS ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Peserta Terdaftar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Target Peserta
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {totalParticipants}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Pendaftar terverifikasi
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Lulus Penuh (2/2 Hadir) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
              Lulus Penuh (2/2 Hadir)
            </span>
            <div className="text-2xl font-bold tracking-tight text-emerald-900 font-mono">
              {lulusCount}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Berhak E-Sertifikat Resmi</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Tidak Lengkap (1/2 Hadir) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
              Tidak Lengkap (1/2 Hadir)
            </span>
            <div className="text-2xl font-bold tracking-tight text-amber-900 font-mono">
              {partialCount}
            </div>
            <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
              Hanya Masuk atau Penutupan
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Alpha (0/2 Hadir) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-0.5">
              Alpha (0/2 Hadir)
            </span>
            <div className="text-2xl font-bold tracking-tight text-rose-800 font-mono">
              {alphaCount}
            </div>
            <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
              Belum mengisi kedua sesi
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
            <AlertCircle className="w-5 h-5" />
          </div>
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
              <span>Semua Peserta ({totalParticipants})</span>
            </button>
            <button
              onClick={() => setActiveTab('lulus')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'lulus' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Lulus (2/2 Hadir)</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                {lulusCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('partial')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'partial' 
                  ? 'bg-white text-amber-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>1/2 Hadir ({partialCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('alpha')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'alpha' 
                  ? 'bg-white text-rose-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Alpha ({alphaCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, email, tiket, nama Zoom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-slate-400 outline-none transition-all"
            />
          </div>

        </div>
      </div>

      {/* ── 4. DUAL-CHECKPOINT ATTENDANCE TABLE ───────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Peserta & Kontak</th>
                <th className="py-3 px-4">Nomor Tiket</th>
                <th className="py-3 px-4">Sesi 01: Masuk (Awal)</th>
                <th className="py-3 px-4">Sesi 02: Penutupan (Akhir)</th>
                <th className="py-3 px-4">Kelayakan E-Sertifikat</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <UserCheck className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada data kehadiran yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? 'Coba kata kunci pencarian lain.' : 'Peserta dapat mengisi form presensi hari-H via link di atas.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const checkIn = item.checkIn;
                  const checkOut = item.checkOut;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-amber-500/[0.02] transition-colors group cursor-pointer"
                      onClick={() => {
                        if (item.originalRegistrant && onSelectParticipant) {
                          onSelectParticipant(item.originalRegistrant);
                        }
                      }}
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-950 transition-colors">
                          {item.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{item.email || '-'}</span>
                          {item.instansi && item.instansi !== '-' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 truncate max-w-[150px]">{item.instansi}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Ticket Code */}
                      <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700">
                        {item.nomorTicket && item.nomorTicket !== '-' ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {item.nomorTicket}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* SESI 01: Masuk (Awal) */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {checkIn ? (
                          <div className="flex items-center gap-2.5">
                            {/* Thumbnail Screenshot */}
                            {checkIn.screenshot_url ? (
                              <button
                                type="button"
                                onClick={() => setActiveScreenshot({
                                  url: checkIn.screenshot_url,
                                  nama: item.nama,
                                  zoomName: checkIn.zoom_display_name,
                                  sessionTitle: 'Presensi Sesi 01: Masuk',
                                  timestamp: checkIn.attended_at
                                })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group/img shrink-0 hover:ring-2 hover:ring-amber-500 transition"
                                title="Klik untuk memperbesar bukti tangkapan layar Zoom"
                              >
                                <img
                                  src={checkIn.screenshot_url}
                                  alt="Bukti Sesi 1"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition">
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Hadir S1</span>
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {checkIn.attended_at ? new Date(checkIn.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              {checkIn.zoom_display_name && (
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]" title={checkIn.zoom_display_name}>
                                  Zoom: <strong>{checkIn.zoom_display_name}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                            <span>Belum Absen</span>
                          </span>
                        )}
                      </td>

                      {/* SESI 02: Penutupan (Akhir) */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {checkOut ? (
                          <div className="flex items-center gap-2.5">
                            {/* Thumbnail Screenshot */}
                            {checkOut.screenshot_url ? (
                              <button
                                type="button"
                                onClick={() => setActiveScreenshot({
                                  url: checkOut.screenshot_url,
                                  nama: item.nama,
                                  zoomName: checkOut.zoom_display_name,
                                  sessionTitle: 'Presensi Sesi 02: Penutupan',
                                  timestamp: checkOut.attended_at
                                })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group/img shrink-0 hover:ring-2 hover:ring-amber-500 transition"
                                title="Klik untuk memperbesar bukti tangkapan layar Zoom"
                              >
                                <img
                                  src={checkOut.screenshot_url}
                                  alt="Bukti Sesi 2"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition">
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Hadir S2</span>
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {checkOut.attended_at ? new Date(checkOut.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              {checkOut.zoom_display_name && (
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]" title={checkOut.zoom_display_name}>
                                  Zoom: <strong>{checkOut.zoom_display_name}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                            <span>Belum Absen</span>
                          </span>
                        )}
                      </td>

                      {/* Kelayakan E-Sertifikat */}
                      <td className="py-3.5 px-4">
                        {item.statusKelayakan === 'LULUS' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                              <Award className="w-3 h-3 text-emerald-600" />
                              <span>LULUS (2/2 Hadir)</span>
                            </span>
                            {item.isManualOverride && (
                              <span className="text-[9px] text-amber-700 italic">
                                *Override Khusus Panitia
                              </span>
                            )}
                          </div>
                        ) : item.statusKelayakan === 'PARTIAL' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Kurang 1 Sesi ({item.hasS1 ? 'Sesi 1 Only' : 'Sesi 2 Only'})</span>
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Sertifikat ditahan sementara
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Alpha (0/2)</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          {/* Preview Cert if Lulus */}
                          {item.statusKelayakan === 'LULUS' && onPreviewCert && (
                            <button
                              type="button"
                              onClick={() => onPreviewCert({
                                ...item,
                                nomorSertifikat: `LPK-DIGNITY/CERT/2026/${item.nomorTicket?.replace(/[^0-9]/g, '') || '001'}`,
                                verificationCode: `dgn-${item.nomorTicket?.toLowerCase() || 'cert'}`
                              })}
                              title="Pratinjau Sertifikat Resmi"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Override Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideTarget(item);
                              setOverrideStatus(item.statusKelayakan === 'LULUS' ? 'SHORT_DURATION' : 'CERTIFICATE_ELIGIBLE');
                            }}
                            title="Koreksi / Dispensasi Status Kehadiran"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Attendance if exists */}
                          {(checkIn || checkOut) && onDeleteAttendance && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetAttId = checkIn?.id || checkOut?.id;
                                if (targetAttId) onDeleteAttendance(targetAttId);
                              }}
                              title="Hapus Presensi"
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* ── 5. SCREENSHOT LIGHTBOX MODAL ─────────────────────── */}
      {activeScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveScreenshot(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 space-y-4 shadow-2xl text-white relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Bukti Screenshot Zoom Peserta</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {activeScreenshot.sessionTitle} • {activeScreenshot.nama}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveScreenshot(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center max-h-[60vh]">
              <img
                src={activeScreenshot.url}
                alt="Zoom Screenshot Detail"
                className="max-h-[60vh] w-auto object-contain mx-auto"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-mono bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              <div>
                <span>Nama Layar Zoom: </span>
                <strong className="text-amber-400 font-sans">{activeScreenshot.zoomName || '-'}</strong>
              </div>
              <div>
                <span>Waktu Catat: </span>
                <span className="text-slate-300">
                  {activeScreenshot.timestamp ? formatDate(activeScreenshot.timestamp) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MANUAL OVERRIDE DIALOG ────────────────────────── */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Koreksi Kehadiran Manual (Admin)</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Peserta: <strong>{overrideTarget.nama}</strong> ({overrideTarget.nomorTicket})
                </p>
              </div>
              <button 
                onClick={() => setOverrideTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Status Kelayakan E-Sertifikat:</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-amber-500"
                >
                  <option value="CERTIFICATE_ELIGIBLE">Lulus Penuh & Berhak Sertifikat (CERTIFICATE_ELIGIBLE)</option>
                  <option value="ATTENDED">Hadir Biasa (Tanpa Sertifikat)</option>
                  <option value="SHORT_DURATION">Durasi Kurang / Tidak Lengkap</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Alasan Penyesuaian (Audit Log):</label>
                <input
                  type="text"
                  placeholder="Contoh: Dispensasi panitia / kendala jaringan Zoom"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={isSavingOverride}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-2xs disabled:opacity-50"
              >
                {isSavingOverride ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
