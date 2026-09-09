import React, { useEffect } from 'react';
import { 
  X, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  Radio, 
  Flame 
} from 'lucide-react';

export default function TeleprompterModal({
  isOpen,
  onClose,
  pacingData,
  activeScheduleTitle = '',
  onNextSession
}) {
  if (!isOpen) return null;

  const { activeItem, nextItem, pacingStatus, remainingSeconds, progressPercent, currentTimeStr } = pacingData;

  const isOvertime = remainingSeconds < 0;
  const isUrgent = remainingSeconds >= 0 && remainingSeconds <= 600;

  const formatCountdown = (totalSec) => {
    const absSec = Math.abs(totalSec);
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const sign = totalSec < 0 ? '+' : '';
    return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-between p-6 lg:p-12 overflow-hidden select-none animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs lg:text-sm font-mono tracking-widest text-slate-300 uppercase font-bold">
              STAGE TELEPROMPTER • {activeScheduleTitle || 'DIGNITY LIVE STAGE'}
            </span>
          </div>

          <div className="text-sm font-mono text-slate-400">
            Waktu Sekarang: <strong className="text-white text-base">{currentTimeStr} WIB</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            <Minimize2 className="w-4 h-4" /> Keluar Fullscreen (ESC)
          </button>
        </div>
      </div>

      {/* Main Center Stage: Massive Countdown & Active Cue */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-5xl mx-auto w-full">
        {activeItem ? (
          <>
            {/* Status Pill */}
            <div className="mb-4">
              {isOvertime ? (
                <span className="px-6 py-2 rounded-full text-sm font-black tracking-wider uppercase bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse">
                  ⚠️ SESI MELEWATI BATAS WAKTU (+OVERTIME)
                </span>
              ) : isUrgent ? (
                <span className="px-6 py-2 rounded-full text-sm font-black tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-bounce">
                  ⚡ SISA WAKTU KURANG DARI 10 MENIT (SIAPKAN KESIMPULAN / Q&amp;A)
                </span>
              ) : (
                <span className="px-6 py-2 rounded-full text-sm font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                  ● SESI SEDANG BERLANGSUNG
                </span>
              )}
            </div>

            {/* Giant Countdown Clock */}
            <div className={`font-mono text-7xl sm:text-8xl lg:text-[140px] font-black tracking-tighter leading-none my-2 transition-colors ${
              isOvertime ? 'text-rose-500 animate-pulse drop-shadow-[0_0_35px_rgba(244,63,94,0.6)]' :
              isUrgent ? 'text-amber-400 drop-shadow-[0_0_35px_rgba(251,191,36,0.6)]' :
              'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.4)]'
            }`}>
              {formatCountdown(remainingSeconds)}
            </div>

            {/* Active Session Title & Speaker */}
            <div className="mt-4 max-w-3xl">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {activeItem.title}
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 font-semibold mt-2">
                🎙️ {activeItem.speaker_name || 'Pembicara'} • <span className="text-slate-400 font-normal">{activeItem.start_time} - {activeItem.end_time} WIB</span>
              </p>
            </div>

            {/* Stage Cue Card for Operator */}
            {activeItem.stage_cues && (
              <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 max-w-2xl w-full text-left shadow-2xl">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400 flex items-center gap-1.5 mb-1">
                  <Volume2 className="w-3.5 h-3.5" /> Catatan Operator Panggung / Audio:
                </span>
                <p className="text-sm sm:text-base font-mono text-slate-200 leading-relaxed">
                  "{activeItem.stage_cues}"
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 font-mono text-xl">
            Tidak ada sesi aktif di panggung.
          </div>
        )}
      </div>

      {/* Bottom Footer: Next Upcoming Cue */}
      <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border">
        {nextItem ? (
          <div className="flex items-center gap-3 text-left">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400">
              <ArrowRight className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-semibold">
                Sesi Selanjutnya Siap-Siap:
              </span>
              <span className="text-sm sm:text-base font-bold text-white">
                {nextItem.title}
              </span>
              <span className="text-xs text-slate-400 block">
                Jam {nextItem.start_time} WIB ({nextItem.duration_minutes}m) • {nextItem.speaker_name || '-'}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Sesi ini adalah sesi penutup hari ini.</span>
        )}

        {activeItem && (
          <button
            type="button"
            onClick={() => onNextSession?.(activeItem.id)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Tandai Selesai &amp; Pindah Sesi
          </button>
        )}
      </div>
    </div>
  );
}
