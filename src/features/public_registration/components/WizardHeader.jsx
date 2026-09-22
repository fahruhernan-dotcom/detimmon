import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * WizardHeader: Top navigation, Official Intake Badge, and Dignity Brand Header
 */
export default function WizardHeader({ onBack, eventTitle }) {
  return (
    <>
      {/* Top Navigation Bar & Official Intake Badge */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-stone-200/90 text-stone-600 hover:text-stone-900 text-xs font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all active:scale-95 cursor-pointer"
          title="Kembali ke Halaman Detail Acara"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Detail Acara</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-stone-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-4 h-4 rounded-full bg-[#0A192F] flex items-center justify-center text-[8px] font-serif font-bold text-[#D4AF37]">
            ID
          </div>
          <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase font-semibold">
            OFFICIAL INTAKE
          </span>
        </div>
      </div>

      {/* Top Brand Bar */}
      <div className="w-full max-w-xl text-center mb-7">
        <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold block mb-1.5">
          LEMBAGA PELATIHAN KERJA INDONESIA DIGNITY
        </span>
        <h1 className="text-2xl sm:text-3xl font-normal text-stone-900 font-serif tracking-tight leading-snug">
          Formulir Pendaftaran Resmi
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 font-light max-w-md mx-auto line-clamp-2">
          {eventTitle}
        </p>
      </div>
    </>
  );
}
