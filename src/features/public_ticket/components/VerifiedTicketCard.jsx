import React from 'react';
import { ShieldCheck, Users, ArrowRight, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * VerifiedTicketCard
 * Kartu E-Ticket resmi berstatus lunas / aktif dengan barcode dan akses grup webinar.
 */
export default function VerifiedTicketCard({ ticketResult, activeRoster, onScrollToRoster }) {
  if (!ticketResult) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 sm:p-8 space-y-5 shadow-executive text-left animate-fade-in">
      {/* Header Status Terverifikasi */}
      <div className="flex items-start justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10.5px] font-medium mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>TIKET RESMI TERVERIFIKASI AKTIF</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            E-Ticket Acara Resmi
          </h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-stone-400 block uppercase">STATUS AKUN</span>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            LUNAS / VERIFIED
          </span>
        </div>
      </div>

      {/* Barcode & Official Ticket Dossier (Quiet Luxury Executive Palette) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0A192F] to-[#112240] text-white space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#D4AF37] text-[#0A192F] font-bold text-xs flex items-center justify-center font-serif">
              ID
            </div>
            <span className="text-xs font-serif tracking-wider text-stone-200 uppercase font-semibold">
              LPK INDONESIA DIGNITY
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-400 border border-emerald-400/30">
            AKSES PENUH WEBINAR
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-stone-400 block">NOMOR TIKET RESMI:</span>
          <code className="text-xl sm:text-2xl font-mono font-bold text-[#D4AF37] tracking-wider block mt-0.5">
            {ticketResult.ticketCode}
          </code>
        </div>

        {/* Pseudo Barcode Representation */}
        <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center space-y-1 shadow-inner">
          <div className="font-mono text-[9px] text-stone-400 tracking-[0.3em] select-none">
            ||| | | |||| || | ||| |||| | ||| || | |||| || | |||
          </div>
          <span className="font-mono text-[10px] text-stone-700 font-bold tracking-widest">
            {ticketResult.ticketCode}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/10 text-stone-300">
          <div>
            <span className="text-[10px] text-stone-400 block">Nama Peserta:</span>
            <strong className="text-white block truncate">{ticketResult.fullName}</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block">Paket Terdaftar:</span>
            <strong className="text-white block truncate">{ticketResult.kategori}</strong>
          </div>
        </div>
      </div>

      {/* ⚠️ Peringatan In-Ticket: Slot Anggota Belum Diisi */}
      {activeRoster && activeRoster.total_pax > 1 && activeRoster.pending_count > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>PERHATIAN: DATA ANGGOTA BELUM DIISI ({activeRoster.filled_count}/{activeRoster.total_pax} KURSI)</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 font-mono">
              {activeRoster.pending_count} Kursi Kosong
            </span>
          </div>
          <p className="text-xs text-amber-900/90 font-light leading-relaxed">
            Anda terdaftar pada paket <strong>{activeRoster.package_label}</strong>. Saat ini baru e-tiket Ketua yang aktif. Kursi untuk {activeRoster.pending_count} anggota rombongan Anda belum diisi. Silakan lengkapi formulir tabel di bawah ini.
          </p>
          <button
            type="button"
            onClick={onScrollToRoster}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-amber-200" />
            <span>Buka Kolom Pengisian {activeRoster.pending_count} Anggota Rombongan ↓</span>
          </button>
        </div>
      )}

      {/* Akses Webinar & WhatsApp Group */}
      <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-xs text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Akses Pelatihan &amp; Komunitas Resmi</span>
        </div>
        <p className="text-xs text-emerald-900/90 font-light leading-relaxed">
          Pembayaran Anda telah diverifikasi oleh bendahara lembaga. Silakan langsung bergabung ke WhatsApp Group resmi peserta untuk menerima tautan ruang Zoom, materi modul pelatihan, dan jadwal gladi resik.
        </p>

        {ticketResult.waGroupUrl && (
          <a
            href={ticketResult.waGroupUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold transition-transform duration-150 ease-out flex items-center justify-center gap-2 shadow-sm active:scale-[0.97]"
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span>Gabung WhatsApp Group Resmi Peserta</span>
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </a>
        )}
      </div>

      {/* Tombol Cetak PDF */}
      <div className="pt-2 no-print print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-transform duration-150 ease-out flex items-center justify-center gap-2 shadow-2xs active:scale-[0.97] cursor-pointer"
        >
          <Printer className="w-4 h-4 text-stone-500" />
          <span>Cetak / Simpan E-Ticket Resmi (PDF)</span>
        </button>
      </div>
    </div>
  );
}
