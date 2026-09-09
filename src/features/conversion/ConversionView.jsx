import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Tag, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  MessageCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  Flame, 
  Sparkles, 
  Phone, 
  ChevronRight,
  Send,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { useEvent } from '../../context/EventContext';
import { supabase } from '../../lib/supabaseClient';

/**
 * ConversionView — Webinar-to-Bootcamp Conversion Funnel Workspace
 * Strictly implements PHASE_12_UI_UX_CONVERSION.md:
 * - Funnel visualization: Registered → Attended → Certificate/Voucher → Hot Lead → Enrolled Bootcamp
 * - Lead scoring & classification (HOT, WARM, COLD)
 * - Voucher status tracking (Active, Claimed, Expired)
 * - 1-Click WhatsApp consultation / closing message generator
 * - White Luxury Minimal aesthetic
 */
export default function ConversionView({
  registrants = [],
  attendances = [],
  onSelectParticipant
}) {
  const { activeEvent } = useEvent();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hot', 'warm', 'enrolled'
  const [search, setSearch] = useState('');
  const [copiedVoucher, setCopiedVoucher] = useState(null);

  // ── Cross-Event Matching: Ambil pendaftar event lanjutan (next_event_id) ──
  const [nextEventRegistrants, setNextEventRegistrants] = useState([]);

  useEffect(() => {
    if (!activeEvent?.next_event_id) {
      setNextEventRegistrants([]);
      return;
    }
    supabase
      .from('registrations')
      .select('persons(email_normalized, whatsapp_normalized)')
      .eq('event_id', activeEvent.next_event_id)
      .neq('status', 'CANCELLED')
      .then(({ data }) => {
        if (data) setNextEventRegistrants(data);
      })
      .catch(() => {});
  }, [activeEvent?.next_event_id]);

  // Set email & WA dari pendaftar next-event untuk look-up cepat
  const nextEventEmailSet = useMemo(() => {
    const s = new Set();
    nextEventRegistrants.forEach(r => {
      if (r.persons?.email_normalized) s.add(r.persons.email_normalized);
      if (r.persons?.whatsapp_normalized) s.add(r.persons.whatsapp_normalized);
    });
    return s;
  }, [nextEventRegistrants]);

  // ── 1. Derive Conversion Leads ────────────────────────────
  const attendedEmails = useMemo(() => {
    return new Set(attendances.map(a => (a.email || '').toLowerCase().trim()));
  }, [attendances]);

  const certificateMap = useMemo(() => {
    const map = {};
    attendances.forEach(a => {
      const emailKey = (a.email || '').toLowerCase().trim();
      const certNo = a.nomorSertifikat || a.certificate_no;
      const voucher = a.kodeVoucher || `REBATE100K-${(a.id || '').slice(0, 4).toUpperCase()}`;
      if (emailKey) {
        map[emailKey] = {
          hasCert: Boolean(certNo),
          certNo,
          voucher,
          duration: a.durationMinutes ?? a.duration_minutes ?? 90
        };
      }
    });
    return map;
  }, [attendances]);

  // Transform registrants into enriched leads
  const leads = useMemo(() => {
    return registrants.map((r, idx) => {
      const emailKey = (r.email || '').toLowerCase().trim();
      const waKey = String(r.whatsapp || '').replace(/[^0-9]/g, '');
      const attData = certificateMap[emailKey] || null;
      const hasAttended = attendedEmails.has(emailKey);
      const isLunas = r.statusBayar === 'LUNAS';

      // Deteksi apakah peserta sudah terdaftar di event lanjutan (cross-event matching)
      const isEnrolledNextEvent = nextEventEmailSet.has(emailKey) || (waKey && nextEventEmailSet.has(waKey));

      // Lead Scoring Algorithm:
      // - ENROLLED: Sudah mendaftar lanjutan (dari notes ATAU deteksi cross-event otomatis)
      // - HOT: Lunas + Hadir + Durasi >=60m (Berhak Sertifikat & Voucher)
      // - WARM: Lunas + Hadir (Durasi <60m) atau Lunas tapi belum hadir
      // - COLD: Belum lunas / ditolak
      let leadTier = 'COLD';
      const voucherCode = activeEvent?.rebate_voucher_code || attData?.voucher || `REBATE100K-${String(idx + 1).padStart(3, '0')}`;
      const discountAmount = activeEvent?.rebate_voucher_amount || 100000;

      const notesLower = (r.adminNotes || r.catatan || r.custom_notes || '').toLowerCase();
      const isEnrolledByNotes = notesLower.includes('bootcamp') || notesLower.includes('enrolled') || notesLower.includes('alumni');

      if (isEnrolledNextEvent || isEnrolledByNotes) {
        leadTier = 'ENROLLED';
      } else if (isLunas && hasAttended && (attData?.duration ?? 0) >= 60) {
        leadTier = 'HOT';
      } else if (isLunas && (hasAttended || r.nominal >= 100000)) {
        leadTier = 'WARM';
      } else {
        leadTier = 'COLD';
      }

      return {
        ...r,
        leadTier,
        hasAttended,
        durationMinutes: attData?.duration ?? (hasAttended ? 90 : 0),
        hasCert: Boolean(attData?.hasCert),
        certNo: attData?.certNo || null,
        voucherCode,
        voucherStatus: leadTier === 'ENROLLED' ? 'CLAIMED' : 'ACTIVE',
        discountAmount
      };
    });
  }, [registrants, attendedEmails, certificateMap, nextEventEmailSet, activeEvent]);

  // ── 2. Metric Calculations ────────────────────────────────
  const totalLeads = leads.length;
  const hotCount = leads.filter(l => l.leadTier === 'HOT').length;
  const warmCount = leads.filter(l => l.leadTier === 'WARM').length;
  const enrolledCount = leads.filter(l => l.leadTier === 'ENROLLED').length;
  const totalVoucherValue = (hotCount + warmCount) * 100000;

  // ── 3. Filter Leads ───────────────────────────────────────
  const filteredData = useMemo(() => {
    return leads.filter((item) => {
      if (activeTab === 'hot' && item.leadTier !== 'HOT') return false;
      if (activeTab === 'warm' && item.leadTier !== 'WARM') return false;
      if (activeTab === 'enrolled' && item.leadTier !== 'ENROLLED') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          (item.instansi && item.instansi.toLowerCase().includes(q)) ||
          item.voucherCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, activeTab, search]);

  // ── 4. 1-Click WhatsApp Follow-Up CTA with Voucher Deep Link ──
  const handleFollowUpWhatsApp = (lead) => {
    const rawWa = lead.whatsapp || '';
    const cleanWa = String(rawWa).replace(/[^0-9]/g, '');
    const phone = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;

    // Buat link pendaftaran event lanjutan dengan voucher auto-fill
    const baseUrl = window.location.origin + window.location.pathname;
    const nextEventSlug = activeEvent?.next_event_slug || '';
    const regLink = nextEventSlug
      ? `${baseUrl}#/daftar?event=${nextEventSlug}&voucher=${lead.voucherCode}`
      : `${baseUrl}#/daftar?voucher=${lead.voucherCode}`;

    const message = `*KONSULTASI SPESIAL ALUMNI WEBINAR LPK DIGNITY* 🌟\n\n` +
      `Halo Kak *${lead.nama}*,\n` +
      `Terima kasih telah antusias mengikuti sesi Webinar Public Speaking LPK Indonesia Dignity.\n\n` +
      `Sebagai apresiasi kelulusan dan keaktifan Kakak, Kakak berhak atas:\n` +
      `🎟️ *Voucher Beasiswa Potongan Langsung ${formatRupiah(lead.discountAmount)}*: *${lead.voucherCode}*\n` +
      `untuk pendaftaran Program Intensif *Executive Bootcamp Public Speaking* (Sertifikasi BNSP).\n\n` +
      `Daftar langsung dengan potongan otomatis:\n` +
      `🔗 ${regLink}\n\n` +
      `Apakah Kakak ingin konsultasi jadwal kelas intensif atau simulasi kurikulum praktiknya bersama tim instruktur kami?`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyVoucher = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── 1. FUNNEL CONVERSION PIPELINE ───────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Funnel Konversi: Webinar &rarr; Bootcamp</h3>
                <p className="text-xs text-slate-500">Pipeline prospek peserta webinar menuju kelas intensif bootcamp bersertifikat</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Potensi Rebate Beredar:</span>
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {formatRupiah(totalVoucherValue)}
            </span>
          </div>
        </div>

        {/* 5-Step Funnel Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Step 1: Total Leads */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              1. Pendaftar Webinar
            </span>
            <div className="text-xl font-bold font-mono text-slate-800">{totalLeads}</div>
            <span className="text-[10.5px] text-slate-500 mt-0.5 block">100% total intake</span>
          </div>

          {/* Step 2: Engaged & Attended */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
              2. Hadir Webinar
            </span>
            <div className="text-xl font-bold font-mono text-blue-900">
              {attendances.length}
            </div>
            <span className="text-[10.5px] text-blue-700 mt-0.5 block">
              {totalLeads > 0 ? Math.round((attendances.length / totalLeads) * 100) : 0}% rasio kehadiran
            </span>
          </div>

          {/* Step 3: Hot Leads (Eligible Voucher) */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                3. Prospek Panas (Hot)
              </span>
              <Flame className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-950">{hotCount}</div>
            <span className="text-[10.5px] text-amber-800 mt-0.5 block">
              Berhak Voucher Rp 100k
            </span>
          </div>

          {/* Step 4: Converted to Bootcamp */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                4. Ikut Bootcamp
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-900">{enrolledCount}</div>
            <span className="text-[10.5px] text-emerald-700 mt-0.5 block">
              {attendances.length > 0 ? Math.round((enrolledCount / attendances.length) * 100) : 0}% rasio konversi closing
            </span>
          </div>

        </div>
      </div>

      {/* ── 2. FILTER TABS & SEARCH BAR ──────────────────────── */}
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
              <span>Semua Prospek ({totalLeads})</span>
            </button>
            <button
              onClick={() => setActiveTab('hot')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'hot' 
                  ? 'bg-white text-amber-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Hot Leads ({hotCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('warm')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'warm' 
                  ? 'bg-white text-blue-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Warm Leads ({warmCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'enrolled' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Alumni Bootcamp ({enrolledCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari prospek, instansi, kode voucher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-slate-400 outline-none transition-all"
            />
          </div>

        </div>
      </div>

      {/* ── 3. LEADS & CONVERSION TABLE ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Calon Alumni & Kontak</th>
                <th className="py-3 px-4">Skor Prospek</th>
                <th className="py-3 px-4">Kode Voucher Rebate</th>
                <th className="py-3 px-4">Aktivitas Webinar</th>
                <th className="py-3 px-4 text-right">Follow-Up WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <TrendingUp className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada prospek konversi yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan filter di atas untuk meninjau status prospek lainnya.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((lead) => {
                  const isCopied = copiedVoucher === lead.voucherCode;

                  return (
                    <tr 
                      key={lead.id}
                      className="hover:bg-amber-500/[0.02] transition-colors group cursor-pointer"
                      onClick={() => onSelectParticipant && onSelectParticipant(lead)}
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-amber-950 transition-colors">
                          {lead.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{lead.email || '-'}</span>
                          {lead.instansi && lead.instansi !== '-' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 truncate max-w-[150px]">{lead.instansi}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Lead Tier Badge */}
                      <td className="py-3.5 px-4">
                        {lead.leadTier === 'HOT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>HOT LEAD</span>
                          </span>
                        ) : lead.leadTier === 'WARM' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>WARM</span>
                          </span>
                        ) : lead.leadTier === 'ENROLLED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ALUMNI BOOTCAMP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>COLD</span>
                          </span>
                        )}
                      </td>

                      {/* Voucher Code */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {lead.voucherCode}
                          </span>
                          <button
                            onClick={() => handleCopyVoucher(lead.voucherCode)}
                            title="Salin kode voucher"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                          Nilai: Rp 100.000
                        </span>
                      </td>

                      {/* Webinar Activity */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {lead.hasAttended ? (
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Hadir ({lead.durationMinutes}m)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Absen / No-Show</span>
                          </div>
                        )}
                        {lead.hasCert && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            Sertifikat: {lead.certNo || 'Terbit ✓'}
                          </span>
                        )}
                      </td>

                      {/* 1-Click WhatsApp Follow-up */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleFollowUpWhatsApp(lead)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Closing Bootcamp</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
