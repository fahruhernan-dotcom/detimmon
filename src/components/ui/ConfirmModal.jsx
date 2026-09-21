import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info, X, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

/**
 * ConfirmModal
 * Modal konfirmasi interaktif bergaya modern untuk menggantikan window.confirm bawaan peramban.
 * Mendukung varian 'warning' (soft delete), 'danger' (permanent delete), dan 'info' (aksi umum).
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  description = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  note = null,
  confirmText = 'Lanjutkan',
  cancelText = 'Batalkan',
  variant = 'warning', // 'warning' | 'danger' | 'info'
  isLoading = false
}) {
  const confirmBtnRef = useRef(null);

  // Auto focus ke tombol confirm saat modal terbuka & handle tombol keyboard Esc / Enter
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Konfigurasi visual berdasarkan varian
  const config = {
    warning: {
      icon: Trash2,
      iconBg: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40',
      badgeIcon: RotateCcw,
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 focus:ring-amber-500',
      headerGlow: 'bg-amber-500/10'
    },
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40',
      badgeIcon: ShieldAlert,
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus:ring-rose-500',
      headerGlow: 'bg-rose-500/10'
    },
    info: {
      icon: Info,
      iconBg: 'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700/50',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40',
      badgeIcon: CheckCircle2,
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 focus:ring-indigo-500',
      headerGlow: 'bg-indigo-500/10'
    }
  }[variant] || {
    icon: Info,
    iconBg: 'bg-slate-100 text-slate-700 border border-slate-300',
    badgeBg: 'bg-slate-50 text-slate-700 border border-slate-200',
    badgeIcon: Info,
    confirmBtn: 'bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-500',
    headerGlow: 'bg-slate-500/10'
  };

  const IconComponent = config.icon;
  const BadgeIconComponent = config.badgeIcon;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Click outside backdrop overlay */}
      <div 
        className="absolute inset-0" 
        onClick={() => { if (!isLoading) onClose(); }} 
      />

      {/* Card Dialog Modal */}
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 transition-all transform animate-in zoom-in-95 duration-200"
      >
        {/* Glow accent bar at top */}
        <div className={`h-1.5 w-full ${variant === 'danger' ? 'bg-rose-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`} />

        <div className="p-6">
          {/* Header with Icon & Close button */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${config.iconBg}`}>
              <IconComponent className="w-6 h-6" />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 
              id="confirm-dialog-title" 
              className="text-lg font-bold text-slate-900 dark:text-white leading-snug tracking-tight"
            >
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Context Note Badge (e.g. "Data dapat dipulihkan kapan saja") */}
          {note && (
            <div className={`mt-4 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${config.badgeBg}`}>
              <BadgeIconComponent className="w-4 h-4 shrink-0" />
              <span>{note}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {cancelText}
            </button>

            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.confirmBtn} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
