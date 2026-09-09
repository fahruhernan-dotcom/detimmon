import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  SlidersHorizontal, 
  DollarSign, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Tag, 
  Sparkles,
  TrendingUp,
  Building2
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';
import { EXPENSE_CATEGORIES, DEFAULT_FINANCIAL_TEMPLATES, financialService } from '../../services/financialService';

export default function FinancialSettingsModal({
  isOpen,
  onClose,
  activeEvent,
  financialConfig,
  onSaveConfig
}) {
  if (!isOpen) return null;

  const eventId = activeEvent?.id || 'default';
  const eventType = activeEvent?.event_type || 'WEBINAR';

  const [expenses, setExpenses] = useState(() => {
    return (financialConfig?.expenses || []).map(e => ({ ...e }));
  });

  const [upsellConfig, setUpsellConfig] = useState(() => ({
    targetTitle: financialConfig?.upsellConfig?.targetTitle || 'Executive Bootcamp Offline Sala View Hotel Solo',
    targetPrice: financialConfig?.upsellConfig?.targetPrice ?? 1850000,
    rebateAmount: financialConfig?.upsellConfig?.rebateAmount ?? 100000,
    scenarios: financialConfig?.upsellConfig?.scenarios || [5, 10, 15]
  }));

  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses', 'upsell', 'presets'
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (financialConfig?.expenses) {
      setExpenses(financialConfig.expenses.map(e => ({ ...e })));
    }
    if (financialConfig?.upsellConfig) {
      setUpsellConfig({ ...financialConfig.upsellConfig });
    }
  }, [financialConfig]);

  // Add new expense row
  const handleAddExpense = () => {
    const newId = `exp-custom-${Date.now()}`;
    setExpenses(prev => [
      ...prev,
      {
        id: newId,
        title: '',
        category: 'OPERATIONAL',
        amount: 0,
        isEnabled: true
      }
    ]);
  };

  // Update existing row
  const handleUpdateExpense = (id, field, value) => {
    setExpenses(prev => prev.map(item => {
      if (item.id === id) {
        let val = value;
        if (field === 'amount') {
          val = parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;
        }
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  // Remove row
  const handleRemoveExpense = (id) => {
    setExpenses(prev => prev.filter(item => item.id !== id));
  };

  // Apply template preset
  const handleApplyPreset = (typeKey) => {
    const preset = DEFAULT_FINANCIAL_TEMPLATES[typeKey];
    if (preset) {
      setExpenses(preset.expenses.map(e => ({ ...e })));
      setUpsellConfig({ ...preset.upsellConfig });
    }
  };

  // Reset to original event default
  const handleResetToDefault = () => {
    if (confirm('Kembalikan konfigurasi finansial ke template default acara ini?')) {
      const reset = financialService.resetToDefault(eventId, eventType);
      setExpenses(reset.expenses);
      setUpsellConfig(reset.upsellConfig);
    }
  };

  // Save changes
  const handleSave = () => {
    const payload = {
      expenses: expenses.filter(e => e.title.trim() !== ''),
      upsellConfig: {
        ...upsellConfig,
        targetPrice: Number(upsellConfig.targetPrice) || 0,
        rebateAmount: Number(upsellConfig.rebateAmount) || 0
      }
    };
    financialService.saveFinancialConfig(eventId, payload);
    if (onSaveConfig) onSaveConfig(payload);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  // Calculate live total active expenses
  const activeExpenseTotal = expenses
    .filter(e => e.isEnabled)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Kustomisasi Parameter Finansial &amp; Beban</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase font-mono">
                  {eventType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                {activeEvent?.title || 'Pengaturan Beban & Pendapatan Acara'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'expenses'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pos Beban Operasional ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('upsell')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'upsell'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Target &amp; Proyeksi Upsell</span>
          </button>

          <button
            onClick={() => setActiveSubTab('presets')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeSubTab === 'presets'
                ? 'border-amber-500 text-amber-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Template Cepat</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">

          {/* ── TAB 1: POS BEBAN OPERASIONAL ─────────────────────── */}
          {activeSubTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Daftar Pos Pengeluaran Riil
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Centang aktif/nonaktif untuk melakukan simulasi biaya tanpa menghapus data.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pos Biaya</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <p className="text-xs text-slate-500">Belum ada pos pengeluaran yang didaftarkan untuk acara ini.</p>
                  <button
                    onClick={handleAddExpense}
                    className="text-xs font-bold text-amber-700 hover:underline"
                  >
                    + Buat Pos Pengeluaran Pertama
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {expenses.map((item, idx) => {
                    const catMeta = EXPENSE_CATEGORIES[item.category] || EXPENSE_CATEGORIES.OTHER;
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                          item.isEnabled 
                            ? 'bg-white border-slate-200 shadow-2xs' 
                            : 'bg-slate-100/70 border-slate-200/60 opacity-60'
                        }`}
                      >
                        {/* Checkbox Enable */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={item.isEnabled}
                            onChange={(e) => handleUpdateExpense(item.id, 'isEnabled', e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                          />
                        </div>

                        {/* Title Input */}
                        <div className="flex-1 min-w-[180px]">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateExpense(item.id, 'title', e.target.value)}
                            placeholder="Nama pos biaya (misal: Sewa Hall, Honor Trainer...)"
                            className="w-full text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-amber-500 focus:outline-none py-1 transition"
                          />
                        </div>

                        {/* Category Select */}
                        <div className="shrink-0">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateExpense(item.id, 'category', e.target.value)}
                            className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-amber-500"
                          >
                            {Object.entries(EXPENSE_CATEGORIES).map(([catKey, catVal]) => (
                              <option key={catKey} value={catKey}>
                                {catVal.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount Input */}
                        <div className="shrink-0 w-36">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                              onChange={(e) => handleUpdateExpense(item.id, 'amount', e.target.value)}
                              className="w-full text-right font-mono text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:bg-white focus:outline-none focus:border-amber-500 transition"
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="shrink-0 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Hapus pos biaya ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Live Summary Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between mt-4">
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                    Total Beban Aktif:
                  </span>
                  <span className="text-xs text-slate-400">
                    {expenses.filter(e => e.isEnabled).length} pos biaya aktif
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {formatRupiah(activeExpenseTotal)}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PROYEKSI UPSELL ──────────────────────────── */}
          {activeSubTab === 'upsell' && (
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Konfigurasi Penjualan Acara Lanjutan (Upsell Funnel)
              </h4>
              <p className="text-[11px] text-slate-500">
                Nilai ini digunakan untuk menghitung potensi laba tambahan dari konversi alumni ke jenjang berikutnya.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Program Lanjutan:
                  </label>
                  <input
                    type="text"
                    value={upsellConfig.targetTitle}
                    onChange={(e) => setUpsellConfig(prev => ({ ...prev, targetTitle: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Harga Normal Program Lanjutan:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">Rp</span>
                      <input
                        type="text"
                        value={upsellConfig.targetPrice ? Number(upsellConfig.targetPrice).toLocaleString('id-ID') : '0'}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                          setUpsellConfig(prev => ({ ...prev, targetPrice: val }));
                        }}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nilai Voucher Rabat Alumni:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">Rp</span>
                      <input
                        type="text"
                        value={upsellConfig.rebateAmount ? Number(upsellConfig.rebateAmount).toLocaleString('id-ID') : '0'}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                          setUpsellConfig(prev => ({ ...prev, rebateAmount: val }));
                        }}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs flex items-center justify-between">
                  <span className="text-amber-950 font-semibold">Harga Bersih per Pax Alumni (Setelah Diskon):</span>
                  <span className="font-mono font-bold text-amber-900 text-sm">
                    {formatRupiah(Math.max(0, (upsellConfig.targetPrice || 0) - (upsellConfig.rebateAmount || 0)))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: PRESET TEMPLATES ─────────────────────────── */}
          {activeSubTab === 'presets' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Pilih Paket Preset Cepat
              </h4>
              <p className="text-[11px] text-slate-500">
                Gunakan template standar industri untuk mengisi pos pengeluaran secara instan sesuai format acara Anda.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Preset Webinar Online</div>
                    <p className="text-[11px] text-slate-500">
                      Honor Trainer (2.5jt), Zoom Pro (250k), Meta Ads (500k), IT &amp; Sertifikat Digital.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('WEBINAR')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-800 text-xs font-bold transition"
                  >
                    Terapkan Preset Webinar
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Preset Bootcamp Offline</div>
                    <p className="text-[11px] text-slate-500">
                      Sewa Hotel Sala View (3.5jt), Honor Trainer 2 Hari (5jt), Konsumsi &amp; Lunch (2.5jt), Seminar Kit (800k).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('BOOTCAMP')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-800 text-xs font-bold transition"
                  >
                    Terapkan Preset Bootcamp
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Preset Workshop Sertifikasi</div>
                    <p className="text-[11px] text-slate-500">
                      Lisensi &amp; Asesor Ujian CPSP (4jt), Master Trainer (4.5jt), Venue Bintang 4 (2.5jt), F&amp;B.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('WORKSHOP')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-800 text-xs font-bold transition"
                  >
                    Terapkan Preset Workshop
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Default Acara</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Parameter Finansial</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
