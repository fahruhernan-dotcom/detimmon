import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Users, 
  Award, 
  UserCheck, 
  ArrowUpRight, 
  Printer, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Building2,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Plus,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { useEvent } from '../../context/EventContext';
import { financialService, EXPENSE_CATEGORIES } from '../../services/financialService';
import FinancialSettingsModal from './FinancialSettingsModal';

/**
 * BusinessIntelligenceView — Executive Analytics & Dynamic Financial P&L Workspace
 * Provides complete flexibility to configure:
 * - Dynamic operational expenses (Honors, Zoom, Venue, Ads, Logistics, F&B)
 * - Custom upsell conversion models per event
 * - Live real-time gross revenue, net profit, and margin recalculation
 */
export default function BusinessIntelligenceView({
  registrants = [],
  attendances = []
}) {
  const { activeEvent } = useEvent();

  // Dynamic Financial Configuration per Active Event
  const [financialConfig, setFinancialConfig] = useState(() => {
    return financialService.getFinancialConfig(activeEvent?.id, activeEvent?.event_type);
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync when activeEvent changes
  useEffect(() => {
    if (activeEvent?.id) {
      setFinancialConfig(financialService.getFinancialConfig(activeEvent.id, activeEvent.event_type));
    }
  }, [activeEvent?.id, activeEvent?.event_type]);

  // ── 1. Financial Inflow Calculation ────────────────────────
  const verifiedList = useMemo(() => {
    return registrants.filter(r => !r.isDeleted && r.statusBayar === 'LUNAS');
  }, [registrants]);

  const pendingList = useMemo(() => {
    return registrants.filter(r => !r.isDeleted && r.statusBayar === 'PENDING');
  }, [registrants]);

  const verifiedRevenue = verifiedList.reduce((acc, r) => acc + (r.nominal || 0), 0);
  const pendingRevenue = pendingList.reduce((acc, r) => acc + (r.nominal || 0), 0);

  // Package breakdown
  const individuList = verifiedList.filter(r => (r.nominal === 100000) || r.kategori?.toLowerCase().includes('individu'));
  const mabarList = verifiedList.filter(r => (r.nominal === 500000) || r.kategori?.toLowerCase().includes('mabar'));
  const customList = verifiedList.filter(r => 
    r.nominal !== 100000 && 
    r.nominal !== 500000 && 
    !r.kategori?.toLowerCase().includes('individu') && 
    !r.kategori?.toLowerCase().includes('mabar')
  );

  const individuRevenue = individuList.reduce((acc, r) => acc + (r.nominal || 0), 0);
  const mabarRevenue = mabarList.reduce((acc, r) => acc + (r.nominal || 0), 0);
  const customRevenue = customList.reduce((acc, r) => acc + (r.nominal || 0), 0);

  // ── 2. Dynamic Operational Expenses ────────────────────────
  const activeExpenses = useMemo(() => {
    return (financialConfig?.expenses || []).filter(e => e.isEnabled);
  }, [financialConfig]);

  const totalExpenses = useMemo(() => {
    return activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [activeExpenses]);

  // Net Operating Profit & Margin
  const netProfit = verifiedRevenue - totalExpenses;
  const netMarginPercent = verifiedRevenue > 0 ? Math.round((netProfit / verifiedRevenue) * 100) : 0;

  // ── 3. Upsell Projection Calculation ───────────────────────
  const upsell = financialConfig?.upsellConfig || {
    targetTitle: 'Executive Bootcamp Offline Sala View Hotel Solo',
    targetPrice: 1850000,
    rebateAmount: 100000,
    scenarios: [5, 10, 15]
  };

  const netUpsellPaxPrice = Math.max(0, (upsell.targetPrice || 0) - (upsell.rebateAmount || 0));

  // ── 4. Operational Funnel Ratios ───────────────────────────
  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);
  const totalRegistrants = activeRegistrants.length;
  const paidRatio = totalRegistrants > 0 ? Math.round((verifiedList.length / totalRegistrants) * 100) : 0;
  
  const totalAttended = attendances.length;
  const attendanceRatio = verifiedList.length > 0 ? Math.round((totalAttended / verifiedList.length) * 100) : 0;

  const eligibleCerts = attendances.filter(a => 
    a.status === 'CERTIFICATE_ELIGIBLE' || 
    (a.durationMinutes !== undefined && a.durationMinutes >= 60) ||
    !a.status
  ).length;
  const certRatio = totalAttended > 0 ? Math.round((eligibleCerts / totalAttended) * 100) : 0;

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* ── TOP EXECUTIVE CONTROLS ───────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">Executive Business Intelligence &amp; P&amp;L</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase font-mono">
                  {activeEvent?.event_type || 'WEBINAR'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {activeEvent?.title ? `Finansial untuk: ${activeEvent.title}` : 'Analisis laba rugi, beban operasional dinamis, dan marjin kotor'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Action: Open Flexible Financial Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition active:scale-[0.98]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Kustomisasi Beban &amp; Finansial</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* ── 1. FINANCIAL P&L HERO TILES ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Gross Verified Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Pendapatan Terverifikasi (Lunas)
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800 tracking-tight">
            {formatRupiah(verifiedRevenue)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">
            Dari {verifiedList.length} transaksi kas masuk
          </span>
        </div>

        {/* Total Operational Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Beban Operasional
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[10.5px] font-bold text-amber-700 hover:underline"
            >
              Ubah
            </button>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 tracking-tight">
            {formatRupiah(totalExpenses)}
          </div>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {activeExpenses.length} pos biaya aktif terpasang
          </span>
        </div>

        {/* Net Profit (EBIT) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Laba Bersih Operasional
          </span>
          <div className={`text-2xl font-bold font-mono tracking-tight ${
            netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatRupiah(netProfit)}
          </div>
          <span className={`text-[11px] font-medium block ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {netProfit >= 0 ? `Surplus Bersih (${netMarginPercent}% margin)` : 'Defisit Operasional'}
          </span>
        </div>

        {/* Pending Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Piutang Belum Terverifikasi
          </span>
          <div className="text-2xl font-bold font-mono text-amber-900 tracking-tight">
            {formatRupiah(pendingRevenue)}
          </div>
          <span className="text-[11px] text-amber-800 font-medium block">
            {pendingList.length} pendaftar menunggu verifikasi
          </span>
        </div>

      </div>

      {/* ── 2. DETAILED P&L LEDGER & FUNNEL RATIOS ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Financial Statement Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Rincian Laporan Laba Rugi Operasional (P&amp;L Ledger)
            </h4>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola Beban</span>
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Revenue Items */}
            <div className="pt-1 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              1. Penerimaan Kas Masuk (Inflow Riil):
            </div>

            <div className="flex items-center justify-between py-1 text-slate-700 font-medium pl-2 border-l-2 border-emerald-400">
              <span>Tiket Satuan / Individu</span>
              <span className="font-mono font-bold text-slate-900">
                {formatRupiah(individuRevenue)} ({individuList.length} tiket)
              </span>
            </div>

            {mabarList.length > 0 && (
              <div className="flex items-center justify-between py-1 text-slate-700 font-medium pl-2 border-l-2 border-emerald-400">
                <span>Paket Promo MABAR (6 Orang)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(mabarRevenue)} ({mabarList.length} grup / {mabarList.length * 6} pax)
                </span>
              </div>
            )}

            {customList.length > 0 && (
              <div className="flex items-center justify-between py-1 text-slate-700 font-medium pl-2 border-l-2 border-emerald-400">
                <span>Paket Khusus / Kode Unik Pembayaran</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(customRevenue)} ({customList.length} tiket)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-t border-slate-200 font-bold text-slate-900">
              <span>Total Pendapatan Kotor (Gross Inflow)</span>
              <span className="font-mono text-emerald-800 text-sm">{formatRupiah(verifiedRevenue)}</span>
            </div>

            {/* Expense Items */}
            <div className="pt-3 flex items-center justify-between text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <span>2. Beban Pokok &amp; Operasional Penyelenggaraan:</span>
              <span className="text-slate-500">{activeExpenses.length} Pos Aktif</span>
            </div>

            {activeExpenses.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 text-slate-400 text-center italic text-xs">
                Tidak ada beban operasional yang dicatat. Klik "Kelola Beban" untuk mendaftarkan biaya.
              </div>
            ) : (
              <div className="space-y-1.5">
                {activeExpenses.map((exp, idx) => {
                  const catMeta = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.OTHER;
                  return (
                    <div 
                      key={exp.id || idx}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-slate-700 hover:bg-slate-100/60 transition"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${catMeta.color} shrink-0`}>
                          {catMeta.label}
                        </span>
                        <span className="truncate font-medium text-slate-800">{exp.title}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-700 shrink-0">
                        ({formatRupiah(exp.amount)})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between py-1.5 border-t border-slate-200 text-slate-700 font-semibold">
              <span>Total Beban Operasional</span>
              <span className="font-mono text-rose-700 font-bold">({formatRupiah(totalExpenses)})</span>
            </div>

            {/* Net Operating Profit */}
            <div className="flex items-center justify-between py-3 border-t-2 border-slate-900 font-bold text-sm text-slate-950">
              <div>
                <span>Hasil Bersih (Net Operating Profit)</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Setelah seluruh beban operasional riil</span>
              </div>
              <span className={`font-mono text-base ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {formatRupiah(netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Funnel Performance (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
            Rasio Efisiensi Konversi Event
          </h4>

          <div className="space-y-3 text-xs">
            {/* Payment Ratio */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Rasio Pembayaran Lunas</span>
                <span className="font-mono font-bold text-slate-900">{paidRatio}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${paidRatio}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{verifiedList.length} dari {totalRegistrants} pendaftar lunas</span>
            </div>

            {/* Attendance Ratio */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Rasio Kehadiran (Show Rate)</span>
                <span className="font-mono font-bold text-slate-900">{attendanceRatio}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${attendanceRatio}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{totalAttended} dari {verifiedList.length} peserta berbayar hadir</span>
            </div>

            {/* Certificate Ratio */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Rasio Kelayakan Sertifikat</span>
                <span className="font-mono font-bold text-slate-900">{certRatio}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${certRatio}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{eligibleCerts} dari {totalAttended} yang hadir memenuhi syarat</span>
            </div>
          </div>

          {/* Quick Summary Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 space-y-1">
            <span className="font-bold block">💡 Fleksibilitas Finansial Aktif</span>
            <p className="text-[11px] leading-relaxed text-amber-900/80">
              Anda bebas menambah, mengurangi, atau mengganti pos beban operasional (honor pembicara, venue, konsumsi, ads) sesuai rancangan anggaran acara ini.
            </p>
          </div>
        </div>

      </div>

      {/* ── 3. BOTTOM: DYNAMIC UPSELL PROJECTIONS ─────────────── */}
      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Potensi Tambahan Omzet: {upsell.targetTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">
              Investasi Bersih: <strong className="text-slate-800">{formatRupiah(netUpsellPaxPrice)}</strong> / pax (Rebate: {formatRupiah(upsell.rebateAmount || 0)})
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              Ubah Parameter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(upsell.scenarios || [5, 10, 15]).map((count, i) => {
            const pct = totalRegistrants > 0 ? ((count / totalRegistrants) * 100).toFixed(1) : 0;
            return (
              <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-slate-500 text-[11px]">
                  Skenario {count} Orang Alumni {pct > 0 ? `(~${pct}%)` : ''}:
                </div>
                <div className="font-mono text-base font-bold text-slate-900 mt-1">
                  {formatRupiah(count * netUpsellPaxPrice)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. FINANCIAL SETTINGS MODAL ──────────────────────── */}
      <FinancialSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeEvent={activeEvent}
        financialConfig={financialConfig}
        onSaveConfig={(newCfg) => setFinancialConfig(newCfg)}
      />

    </div>
  );
}
