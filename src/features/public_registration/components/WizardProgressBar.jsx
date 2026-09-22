import React from 'react';

/**
 * WizardProgressBar: Quiet Luxury 4-phase step progress indicator
 */
export default function WizardProgressBar({ step }) {
  const stepTitles = {
    1: 'Pilih Paket & Jadwal',
    2: 'Identitas Peserta',
    3: 'Instruksi Pembayaran',
    4: 'Lampiran Bukti Transfer',
    5: 'Tanda Terima Resmi'
  };

  return (
    <div className="bg-[#FAF9F6] px-6 sm:px-8 py-3.5 border-b border-stone-200/80">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono tracking-wider text-stone-500 uppercase font-semibold">
          Langkah 0{step} <span className="text-stone-300">/</span> 04
        </span>
        <span className="text-xs font-serif text-stone-800 font-medium">
          {stepTitles[step] || 'Pendaftaran'}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(s => {
          const isDone = step > s;
          const isCurrent = step === s;
          return (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isCurrent 
                  ? 'bg-[#0A192F]' 
                  : isDone 
                    ? 'bg-stone-800' 
                    : 'bg-stone-200/80'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
