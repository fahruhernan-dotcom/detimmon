import React from 'react';
import { Crown, Unlock, AlertCircle } from 'lucide-react';
import { maskEmail } from '../../../utils/normalizers';

/**
 * LeaderAuthModal
 * Modal dialog verifikasi otorisasi ketua rombongan sebelum mengisi atau menyimpan data anggota rombongan.
 */
export default function LeaderAuthModal({
  isOpen,
  onClose,
  leader,
  leaderAuthInput,
  setLeaderAuthInput,
  leaderAuthError,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-left animate-scale-up">
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A192F] text-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs">
            <Crown className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-serif font-bold text-stone-900">
            Otorisasi Ketua Rombongan
          </h3>
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Untuk melindungi privasi tiket dan mencegah perubahan tanpa izin, pengisian data anggota{' '}
            <strong>hanya dapat dilakukan oleh Ketua Rombongan</strong> yang terdaftar.
          </p>
        </div>

        {/* Info Ketua Terdaftar */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
          <div className="font-bold text-amber-950">Data Ketua Terdaftar:</div>
          <div className="font-semibold text-stone-900">{leader?.full_name || 'Ketua Rombongan'}</div>
          <div className="font-mono text-[11px] text-amber-900 flex items-center justify-between flex-wrap gap-1">
            <span>Email: {maskEmail(leader?.email)}</span>
            <span className="font-bold bg-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">
              Kota: {leader?.city || '-'}
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-800 block">
              Masukkan Email atau No. WhatsApp Terdaftar Ketua:
            </label>
            <input
              type="text"
              value={leaderAuthInput}
              onChange={(e) => setLeaderAuthInput(e.target.value)}
              placeholder="Contoh: ketua.komunitas@gmail.com atau 081234567890"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono text-stone-900 bg-white focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F]"
              autoFocus
            />
          </div>

          {leaderAuthError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{leaderAuthError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Verifikasi &amp; Buka Akses</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
