import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function ShiftTimelineModal({
  isOpen,
  onClose,
  items = [],
  activeScheduleId,
  onShiftApplied,
  defaultFromItemId = null
}) {
  if (!isOpen) return null;

  const [fromItemId, setFromItemId] = useState(defaultFromItemId || items[0]?.id || '');
  const [offsetMinutes, setOffsetMinutes] = useState(15);
  const [absorbInBreaks, setAbsorbInBreaks] = useState(true);
  const [loading, setLoading] = useState(false);

  const presets = [5, 10, 15, 20, 30, 45];

  const handleApply = async (e) => {
    e.preventDefault();
    if (!fromItemId || offsetMinutes === 0) return;

    setLoading(true);
    try {
      await onShiftApplied({
        scheduleId: activeScheduleId,
        fromItemId,
        offsetMinutes: parseInt(offsetMinutes, 10),
        absorbInBreaks
      });
      onClose();
    } catch (err) {
      console.error('Error shifting schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === fromItemId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Penyelarasan Keterlambatan Rundown</h2>
              <p className="text-xs text-amber-100">Dynamic Shift Timeline Engine (One-Click Sync)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-6 space-y-5">
          {/* Titik Awal Pergeseran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Mulai Digeser Dari Sesi:
            </label>
            <select
              value={fromItemId}
              onChange={(e) => setFromItemId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              required
            >
              {items.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  #{idx + 1} ({item.start_time}) {item.title}
                </option>
              ))}
            </select>
            {selectedItem && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Jam saat ini: <strong>{selectedItem.start_time} - {selectedItem.end_time} WIB</strong>
              </p>
            )}
          </div>

          {/* Besaran Waktu Mundur */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Tambahkan Keterlambatan Waktu (+Menit):
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {presets.map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setOffsetMinutes(p)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    offsetMinutes === p
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{p}m
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="180"
                value={offsetMinutes}
                onChange={(e) => setOffsetMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 pl-10"
                placeholder="Atau masukkan angka menit..."
                required
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Opsi Cerdas: Absorb in Breaks */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={absorbInBreaks}
                onChange={(e) => setAbsorbInBreaks(e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-950 block">
                  Cerdas: Pangkas Waktu ISHOMA / Coffee Break (Disarankan)
                </span>
                <span className="text-amber-800 leading-relaxed block mt-0.5">
                  Keterlambatan {offsetMinutes} menit akan diserap oleh waktu istirahat siang / coffee break terdekat (selama break tidak kurang dari 30 menit), sehingga <strong>jam kepulangan akhir peserta tetap tepat waktu</strong>.
                </span>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {loading ? 'Mengkalkulasi...' : `Terapkan Geser +${offsetMinutes} Menit`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
