import React from 'react';
import { RefreshCw, UserPlus, LogOut, UserCheck } from 'lucide-react';

export default function Header({ onSync, isSyncing, onOpenAdd, currentUser, onLogout }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-7 mb-8 border-b border-slate-800/80">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">
          Pusat Komando Operasional Webinar
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Live Pre-Event Webinar "Mastering Stage Confidence" (14 Nov 2026) ➔ Bootcamp Offline Sala View Hotel Solo
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* User Auth Badge */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 breathing-dot"></span>
            <div className="text-left leading-tight">
              <div className="text-slate-200 font-semibold">{currentUser.email}</div>
              <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-400 font-medium">Supabase Live</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-sky-400 font-medium">Drive</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-amber-400 font-medium">Gmail API</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2} />
          <span>{isSyncing ? 'Menyegarkan...' : 'Segarkan Data'}</span>
        </button>

        <button
          onClick={onOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-gold-subtle transition-all duration-200 active:scale-[0.98]"
        >
          <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>Tambah Manual</span>
        </button>

        {currentUser && (
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-slate-850 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all active:scale-[0.98]"
            title="Keluar / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
