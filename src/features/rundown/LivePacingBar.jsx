import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Timer, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Check, 
  Radio, 
  Zap,
  ArrowRight,
  Flame
} from 'lucide-react';

export default function LivePacingBar({
  pacingData,
  onForceLive,
  onMarkCompleted,
  onOpenShiftModal
}) {
  const { activeItem, nextItem, pacingStatus, remainingSeconds, progressPercent, currentTimeStr } = pacingData;

  // Format seconds to mm:ss or hh:mm:ss
  const formatCountdown = (totalSec) => {
    const absSec = Math.abs(totalSec);
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const sign = totalSec < 0 ? '+' : '';
    return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isOvertime = remainingSeconds < 0;
  const isUrgent = remainingSeconds >= 0 && remainingSeconds <= 600; // < 10 mins

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 shadow-xl mb-6 relative overflow-hidden">
      {/* Dynamic Background Glow based on pacing */}
      <div 
        className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${
          isOvertime ? 'bg-rose-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
        {/* Left: Current Digital Clock & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono text-base font-bold text-white tracking-wider">
              {currentTimeStr} <span className="text-xs text-slate-400 font-sans">WIB</span>
            </span>
          </div>

          {/* Status Pill */}
          {pacingStatus === 'LIVE' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE ON STAGE
            </span>
          )}
          {pacingStatus === 'PREPARING' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              SISA &lt; 10 MENIT (WRAP-UP)
            </span>
          )}
          {pacingStatus === 'OVERTIME' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              SESI OVERTIME
            </span>
          )}
          {pacingStatus === 'SCHEDULED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              STANDBY / BELUM DIMULAI
            </span>
          )}
          {pacingStatus === 'COMPLETED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              AGENDA HARI INI SELESAI
            </span>
          )}
        </div>

        {/* Center: Active Session Name & Speaker */}
        <div className="flex-1 min-w-0 px-0 lg:px-4">
          {activeItem ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {activeItem.session_code || 'SESI'}
                </span>
                <h3 className="text-sm lg:text-base font-bold text-white truncate">
                  {activeItem.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                🎙️ {activeItem.speaker_name || 'Pembicara'} • ⏱️ {activeItem.start_time} - {activeItem.end_time} WIB ({activeItem.duration_minutes}m)
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Tidak ada sesi yang berjalan saat ini. Klik "Set Live" pada tabel di bawah untuk memulai sesi.
            </p>
          )}
        </div>

        {/* Right: Giant Countdown Timer & Shift Shortcut */}
        <div className="flex items-center gap-4">
          {activeItem && (
            <div className="text-right">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 block">
                {isOvertime ? 'Terlewat / Overtime' : 'Sisa Waktu Sesi'}
              </span>
              <div className={`text-2xl lg:text-3xl font-mono font-black tracking-tight ${
                isOvertime ? 'text-rose-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {formatCountdown(remainingSeconds)}
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-2">
            {activeItem && (
              <button
                type="button"
                onClick={() => onMarkCompleted?.(activeItem.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
                title="Tandai sesi ini selesai dan lanjutkan ke sesi berikutnya"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Selesai
              </button>
            )}

            <button
              type="button"
              onClick={onOpenShiftModal}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Sesuaikan jadwal jika acara mengalami keterlambatan"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              ⚡ Geser Waktu
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Pacing Progress Bar */}
      {activeItem && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-3">
          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                isOvertime ? 'bg-rose-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 min-w-[45px] text-right">
            {progressPercent}%
          </span>
          {nextItem && (
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 border-l border-slate-800 pl-3">
              <span className="text-slate-500">Berikutnya:</span>
              <span className="text-slate-300 font-medium truncate max-w-[220px]">
                {nextItem.title} ({nextItem.start_time})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
