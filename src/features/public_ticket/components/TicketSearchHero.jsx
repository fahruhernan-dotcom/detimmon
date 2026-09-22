import React from 'react';
import { Search, Ticket, ArrowLeft, AlertCircle } from 'lucide-react';

/**
 * TicketSearchHero
 * Navigasi atas, identitas lembaga, dan formulir pencarian tiket publik real-time.
 */
export default function TicketSearchHero({
  queryInput,
  setQueryInput,
  isLoading,
  searchError,
  onSearch,
  onBackToHome
}) {
  return (
    <>
      {/* ── TOP FLOATING HEADER ───────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-stone-200/80 px-4 sm:px-8 py-3.5 shadow-2xs no-print print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome || (() => (window.location.hash = '#/'))}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-stone-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex items-center gap-2 select-none">
            <div className="w-7 h-7 rounded-lg bg-[#0A192F] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center font-bold text-xs font-serif shadow-xs">
              ID
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-serif font-bold text-xs tracking-wider text-[#0A192F] uppercase block leading-none">
                LPK INDONESIA DIGNITY
              </span>
              <span className="text-[9px] font-mono text-stone-400 tracking-wider block mt-0.5">
                PORTAL STATUS TIKET RESMI
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO SEARCH CONTAINER ─────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 space-y-8">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto no-print print:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-mono font-medium">
            <Ticket className="w-3.5 h-3.5 text-[#0A192F]" />
            <span>VERIFIKASI &amp; PENGECEKAN STATUS TIKET</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 tracking-tight leading-tight">
            Cek Status Pendaftaran &amp; E-Ticket
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
            Periksa status validasi pembayaran, nomor registrasi sementara, hingga akses webinar dan e-ticket resmi yang terdata di sistem LPK Dignity.
          </p>
        </div>

        {/* ── SEARCH INPUT DOSSIER ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-6 shadow-sm max-w-2xl mx-auto space-y-3 no-print print:hidden">
        <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Contoh: TICKET-DIGNITY-880, email, atau no. WhatsApp"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F] bg-[#FAF9F6] focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="py-3 px-6 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs sm:text-sm font-medium transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0 tracking-wide active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memeriksa Database...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Cek Status</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-stone-400 font-light px-1 pt-1">
          <span>Mendukung pencarian via No. Tiket, No. Registrasi, Email, atau WhatsApp.</span>
          <span className="font-mono text-[10px] text-stone-400">100% Real-Time DB</span>
        </div>

        {searchError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-fade-in text-left">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block mb-0.5">Data Tidak Ditemukan</span>
              <span className="text-red-800/90 font-light">{searchError}</span>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
