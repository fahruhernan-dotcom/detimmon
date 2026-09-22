import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * UnfilledGroupAlertBanner
 * Peringatan prominen di atas kartu tiket jika rombongan masih memiliki slot anggota yang belum diisi.
 */
export default function UnfilledGroupAlertBanner({ roster, onScrollToRoster }) {
  if (!roster || roster.total_pax <= 1 || roster.pending_count <= 0) {
    return null;
  }

  const fillPercentage = Math.round((roster.filled_count / roster.total_pax) * 100);

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-50 p-5 sm:p-6 shadow-md text-left space-y-4 animate-fade-in no-print">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-200 text-amber-950 border border-amber-300 uppercase tracking-wider">
                ⚠️ PERHATIAN KETUA ROMBONGAN
              </span>
              <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                {roster.filled_count} dari {roster.total_pax} Kursi Terisi ({roster.pending_count} Slot Belum Dilengkapi)
              </span>
            </div>
            <h3 className="text-lg font-serif font-bold text-amber-950">
              {roster.pending_count} Slot Anggota Rombongan Belum Diisi
            </h3>
            <p className="text-xs text-amber-900/90 font-light leading-relaxed max-w-xl">
              Paket <strong>{roster.package_label}</strong> Anda telah terdaftar resmi di sistem, namun saat ini baru data <strong>Ketua ({roster.leader?.full_name || 'Ketua Rombongan'})</strong> yang tercatat. Mohon lengkapi nama &amp; kontak {roster.pending_count} anggota rombongan pada formulir tabel di bawah agar e-tiket mereka segera terbit dan aktif.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onScrollToRoster}
          className="py-2.5 px-4 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 self-stretch sm:self-auto cursor-pointer active:scale-[0.98]"
        >
          <span>Lengkapi Data Anggota ↓</span>
        </button>
      </div>

      {/* Mini Progress Indicator inside banner */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-amber-900 font-mono">
          <span>Progres Kursi Rombongan:</span>
          <span>{fillPercentage}% ({roster.filled_count}/{roster.total_pax} Terisi)</span>
        </div>
        <div className="w-full h-2 rounded-full bg-amber-200/80 overflow-hidden">
          <div
            className="h-full bg-amber-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(8, fillPercentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
