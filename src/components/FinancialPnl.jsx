import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, SlidersHorizontal } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import { financialService, EXPENSE_CATEGORIES } from '../services/financialService';
import FinancialSettingsModal from '../features/business/FinancialSettingsModal';
import { useEvent } from '../context/EventContext';

export default function FinancialPnl({ 
  registrants = []
}) {
  const { activeEvent } = useEvent();
  const [financialConfig, setFinancialConfig] = useState(() => {
    return financialService.getFinancialConfig(activeEvent?.id, activeEvent?.event_type);
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (activeEvent?.id) {
      setFinancialConfig(financialService.getFinancialConfig(activeEvent.id, activeEvent.event_type));
    }
  }, [activeEvent?.id, activeEvent?.event_type]);

  // Compute Real-time figures
  let totalIndividuCount = 0;
  let totalMabarCount = 0;
  let totalRevenue = 0;
  let customCount = 0;
  let customRevenue = 0;

  registrants.filter(r => !r.isDeleted).forEach((r) => {
    if (r.statusBayar === 'LUNAS') {
      const nom = typeof r.nominal === 'number' ? r.nominal : (parseInt(String(r.nominal).replace(/[^0-9]/g, '')) || 0);
      totalRevenue += nom;
      const catLower = String(r.kategori || '').toLowerCase();
      if (catLower.includes('mabar') || nom === 500000) {
        totalMabarCount++;
      } else if (nom === 100000) {
        totalIndividuCount++;
      } else {
        customCount++;
        customRevenue += nom;
      }
    }
  });

  const activeExpenses = useMemo(() => {
    return (financialConfig?.expenses || []).filter(e => e.isEnabled);
  }, [financialConfig]);

  const totalCost = useMemo(() => {
    return activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [activeExpenses]);

  const netProfit = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Upsell calculation
  const upsell = financialConfig?.upsellConfig || {
    targetTitle: 'Bootcamp Offline Sala View Hotel Solo',
    targetPrice: 1850000,
    rebateAmount: 100000,
    scenarios: [5, 10, 15]
  };
  const netUpsellPax = Math.max(0, (upsell.targetPrice || 0) - (upsell.rebateAmount || 0));

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs font-sans">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 font-display">
            Command Center Finansial &amp; Pos Biaya Operasional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Perhitungan laba kotor, beban langsung dinamis, dan laba bersih riil berdasarkan kas yang telah LUNAS
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Kustomisasi Beban Finansial</span>
          </button>
        </div>
      </div>

      {/* Grid: Inflow & Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Inflow Breakdown */}
        <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 pb-2 border-b border-slate-200">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Rincian Penerimaan Kas Riil (Inflow)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Tiket Individu:</span>
                <span className="font-mono text-slate-900 font-semibold">{totalIndividuCount} Pax</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Subtotal Kas Tiket Individu:</span>
                <span className="font-mono text-slate-900 font-bold">{formatRupiah(totalIndividuCount * 100000)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200"></div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Promo Mabar (6 Pax):</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {totalMabarCount} Paket ({totalMabarCount * 6} Pax)
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Subtotal Kas Promo Mabar:</span>
                <span className="font-mono text-slate-900 font-bold">{formatRupiah(totalMabarCount * 500000)}</span>
              </div>

              {customCount > 0 && (
                <>
                  <div className="pt-2 border-t border-slate-200"></div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Pembayaran Kustom / Kode Unik:</span>
                    <span className="font-mono text-slate-900 font-semibold">{customCount} Transaksi</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Subtotal Kas Kustom:</span>
                    <span className="font-mono text-slate-900 font-bold">{formatRupiah(customRevenue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-amber-500/40 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Total Pendapatan Kotor:
            </span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {formatRupiah(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Direct Costs & Net Profit */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                <span>Beban Operasional &amp; Laba</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] text-amber-700 hover:underline normal-case font-bold"
              >
                + Ubah Pos
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {activeExpenses.length === 0 ? (
                <div className="text-slate-400 italic text-center py-2">Belum ada beban operasional aktif.</div>
              ) : (
                activeExpenses.map((exp, idx) => {
                  const catMeta = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.OTHER;
                  return (
                    <div key={exp.id || idx} className="flex justify-between items-center">
                      <span className="text-slate-600 truncate pr-2">{exp.title}:</span>
                      <span className="font-mono text-rose-600 font-semibold shrink-0">
                        {formatRupiah(exp.amount)}
                      </span>
                    </div>
                  );
                })
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-700 font-semibold">Total Biaya Operasional:</span>
                <span className="font-mono text-rose-600 font-bold">{formatRupiah(totalCost)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-amber-500/40">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Sisa Laba Bersih (Net Profit):
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Setelah seluruh beban operasional</div>
              </div>
              <div className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatRupiah(netProfit)}
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center text-xs">
              <span className="text-slate-600">Margin Keuntungan:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono font-bold text-xs border border-amber-200">
                {marginPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Upsell Projections */}
      <div className="mt-6 p-5 rounded-xl bg-slate-50/80 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Potensi Tambahan Omzet: {upsell.targetTitle}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Investasi Bersih: {formatRupiah(netUpsellPax)} / pax (Rebate: {formatRupiah(upsell.rebateAmount || 0)})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(upsell.scenarios || [5, 10, 15]).map((count, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-[11px]">Skenario {count} Orang Alumni:</div>
              <div className="font-mono text-base font-bold text-slate-900 mt-1">
                {formatRupiah(count * netUpsellPax)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Settings Modal */}
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
