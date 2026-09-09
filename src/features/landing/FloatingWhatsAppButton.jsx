import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppHelpUrl } from './landingUtils';

/**
 * FloatingWhatsAppButton
 * Tombol bantuan mengapung di pojok kanan bawah khusus untuk calon peserta yang membutuhkan
 * bantuan panduan pendaftaran atau konfirmasi langsung ke nomor WhatsApp resmi panitia LPK Dignity.
 */
export default function FloatingWhatsAppButton({ eventTitle, adminPhone }) {
  const whatsappUrl = buildWhatsAppHelpUrl(eventTitle, adminPhone);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-2xl shadow-emerald-900/30 border-2 border-white transition-all hover:scale-105 active:scale-95"
        title="Hubungi Layanan Panitia via WhatsApp"
      >
        <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 fill-emerald-600" />
        </div>
        <div className="text-left leading-tight pr-1">
          <div className="text-[10px] text-emerald-100 font-normal uppercase tracking-wider">Layanan CS Resmi</div>
          <div className="text-xs sm:text-sm font-extrabold text-white">Bantuan Pendaftaran WhatsApp</div>
        </div>
      </a>
    </div>
  );
}
