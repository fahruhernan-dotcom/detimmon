import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppHelpUrl } from './landingUtils';

/**
 * FloatingWhatsAppButton
 * Tombol concierge mengapung minimalis di pojok kanan bawah untuk konsultasi pendaftaran.
 * Desain: Quiet Luxury, graphite/charcoal badge dengan aksen status hijau bersahaja.
 */
export default function FloatingWhatsAppButton({ eventTitle, adminPhone }) {
  const whatsappUrl = buildWhatsAppHelpUrl(eventTitle, adminPhone);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#18181B] hover:bg-[#27272A] text-stone-200 border border-stone-700/60 shadow-[0_8px_25px_rgba(0,0,0,0.18)] transition-all"
        title="Hubungi Layanan Panitia via WhatsApp"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 breathing-dot" />
        <MessageCircle className="w-3.5 h-3.5 text-stone-300 stroke-[1.8]" />
        <span className="text-xs font-medium text-stone-200 tracking-wide pr-1">
          Konsultasi Panitia
        </span>
      </a>
    </div>
  );
}
