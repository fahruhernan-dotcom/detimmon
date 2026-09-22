import React from 'react';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';

/**
 * Layar status saat memuat data acara dari database
 */
export function WizardLoadingScreen() {
  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-12 text-center space-y-3 animate-fade-in">
      <div className="w-8 h-8 border-2 border-[#0A192F] border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-medium text-stone-600 font-serif">Memuat Formulir Pendaftaran Resmi...</p>
    </div>
  );
}

/**
 * Layar status saat tautan acara / slug tidak ditemukan di database
 */
export function WizardNotFoundScreen() {
  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-8 text-center space-y-4 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h2 className="text-xl font-normal font-serif text-stone-900">Acara Tidak Ditemukan</h2>
      <p className="text-xs text-stone-600 font-light leading-relaxed max-w-md mx-auto">
        Tautan pendaftaran yang Anda buka tidak ditemukan atau telah kadaluarsa. Silakan periksa kembali tautan Anda atau hubungi Admin LPK Dignity.
      </p>
      <div className="pt-2">
        <a
          href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20saya%20ingin%20menanyakan%20jadwal%20pelatihan%20terbaru."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium shadow-sm transition-all active:scale-95"
        >
          <span>Hubungi Admin via WhatsApp</span>
          <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
        </a>
      </div>
    </div>
  );
}

/**
 * Layar status saat pendaftaran ditutup oleh panitia
 */
export function WizardClosedScreen({ closeMessage }) {
  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-8 text-center space-y-4 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
        <Calendar className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h2 className="text-xl font-normal font-serif text-stone-900">Pendaftaran Ditutup Sementara</h2>
      <p className="text-xs text-stone-600 font-light leading-relaxed max-w-md mx-auto">
        {closeMessage || "Pendaftaran untuk program ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @indonesiadignity."}
      </p>
      <div className="pt-3">
        <a
          href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20apakah%20masih%20ada%20slot%20tersisa%20untuk%20webinar%20ini%3F"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium shadow-sm transition-all active:scale-95"
        >
          <span>Hubungi Admin via WhatsApp</span>
          <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
        </a>
      </div>
    </div>
  );
}
