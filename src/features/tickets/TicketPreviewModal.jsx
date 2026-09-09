import React, { useState, useEffect } from 'react';
import { 
  X, 
  Ticket, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Building2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { formatDate } from '../../utils/formatters';

export default function TicketPreviewModal({
  isOpen,
  onClose,
  registrant,
  activeEvent
}) {
  if (!isOpen || !registrant) return null;

  const isMabar = registrant.kategori?.toLowerCase().includes('mabar') || registrant.is_mabar;
  const [selectedSuffix, setSelectedSuffix] = useState(() => registrant.selectedSuffix || registrant.initialSuffix || 'A');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (registrant.selectedSuffix || registrant.initialSuffix) {
      setSelectedSuffix(registrant.selectedSuffix || registrant.initialSuffix);
    }
  }, [registrant.selectedSuffix, registrant.initialSuffix]);

  const baseTicketCode = registrant.nomorTicket || 'TICKET-DIGNITY-2026-001';

  // Suffixes for MABAR 6 Pax
  const mabarSuffixes = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Member names mapping if available
  const members = registrant.registration_members || registrant.members || [];

  useEffect(() => {
    loadTickets();
  }, [registrant.id, registrant.supabaseRegistrationId]);

  async function loadTickets() {
    setLoading(true);
    try {
      const regId = registrant.supabaseRegistrationId || registrant.id;
      let fetched = await ticketService.getTicketsByRegistration(regId);
      
      // If no tickets issued yet, auto-issue them idempotently
      if (!fetched || fetched.length === 0) {
        fetched = await ticketService.issueTicketsForRegistration({
          registrationId: regId,
          registrant,
          isMabar: Boolean(isMabar),
          members
        });
      }
      setTickets(fetched || []);
    } catch (err) {
      console.warn('Notice loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  // Determine current active ticket data based on selected suffix
  const activeTicket = isMabar
    ? tickets.find(t => t.ticket_code?.endsWith(`-${selectedSuffix}`)) || {
        ticket_code: `${baseTicketCode}-${selectedSuffix}`,
        status: 'ISSUED'
      }
    : tickets[0] || {
        ticket_code: baseTicketCode,
        status: 'ISSUED'
      };

  // Determine member info for active suffix
  const currentMemberIndex = mabarSuffixes.indexOf(selectedSuffix);
  const currentMember = isMabar && members[currentMemberIndex] ? members[currentMemberIndex] : null;
  const activeParticipantName = isMabar
    ? (currentMember?.persons?.full_name || currentMember?.nama || (selectedSuffix === 'A' ? registrant.nama : `Peserta Anggota ${selectedSuffix}`))
    : registrant.nama;

  const activeParticipantPhone = isMabar
    ? (currentMember?.persons?.whatsapp || currentMember?.whatsapp || registrant.whatsapp)
    : registrant.whatsapp;

  const qrPayload = `https://dignity.id/verify?code=${activeTicket.ticket_code}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeTicket.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (activeParticipantPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    
    const message = encodeURIComponent(
      `Halo *${activeParticipantName}*,\n\n` +
      `Berikut adalah *E-Ticket Resmi* Anda untuk event:\n` +
      `📌 *${activeEvent?.title || 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat'}*\n` +
      `🎫 *No. Tiket:* ${activeTicket.ticket_code}\n` +
      `📍 *Venue:* ${activeEvent?.venue || 'Zoom Cloud Meeting'}\n\n` +
      `Silakan simpan tiket ini sebagai tanda masuk resmi sesi. Terima kasih!\n\n` +
      `_LPK Indonesia Dignity in Collaboration with KLTC®_`
    );

    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Pratinjau E-Ticket Resmi Peserta
              </h3>
              <p className="text-[11px] text-slate-500">
                {isMabar ? 'Paket Promo MABAR 6 Pax (Suffix A–F)' : 'Tiket Individu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Suffix Switcher for MABAR */}
          {isMabar && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Pilih Tiket Anggota Rombongan:
                </span>
                <span className="text-amber-700 text-[11px] font-semibold">
                  6 Tiket Diterbitkan
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                {mabarSuffixes.map((sfx) => {
                  const isLeader = sfx === 'A';
                  const isSelected = selectedSuffix === sfx;
                  return (
                    <button
                      key={sfx}
                      type="button"
                      onClick={() => setSelectedSuffix(sfx)}
                      className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center ${
                        isSelected
                          ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <span>-{sfx}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {isLeader ? 'Ketua' : `Angg ${sfx}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Digital Event Pass (The Boarding Pass) */}
          <div className="relative rounded-3xl border border-slate-200 overflow-hidden shadow-lg bg-gradient-to-br from-white via-slate-50 to-amber-50/30">
            {/* Top Pass Header */}
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  OFFICIAL ACCESS PASS
                </span>
                <h4 className="text-sm font-bold mt-0.5 font-display text-white">
                  LPK INDONESIA DIGNITY
                </h4>
                <p className="text-[10.5px] text-slate-400">
                  in Official Collaboration with KLTC®
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isMabar ? `MABAR - ${selectedSuffix}` : 'INDIVIDU'}
                </span>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIED ACCESS</span>
                </div>
              </div>
            </div>

            {/* Middle Perforation / Cut Line */}
            <div className="relative flex items-center justify-between px-2 bg-slate-50 py-1">
              <div className="w-4 h-4 rounded-full bg-slate-200 -ml-4"></div>
              <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2"></div>
              <div className="w-4 h-4 rounded-full bg-slate-200 -mr-4"></div>
            </div>

            {/* Pass Body */}
            <div className="p-6 space-y-5">
              
              {/* Event Title */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Program Pelatihan / Webinar
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5 font-display leading-snug">
                  {activeEvent?.title || 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat'}
                </h3>
              </div>

              {/* Event Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-100">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Tanggal</span>
                    <span className="font-bold text-slate-800">
                      {activeEvent?.date_start ? formatDate(activeEvent.date_start) : '14 Nov 2026'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-100">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Lokasi / Venue</span>
                    <span className="font-bold text-slate-800">
                      {activeEvent?.venue || 'Zoom Cloud Meeting'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participant Details & QR Code Grid */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-2 text-left flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nama Peserta
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 font-display">
                      {activeParticipantName}
                    </h5>
                    <span className="text-[11px] text-slate-500 block">
                      {registrant.instansi || 'Umum'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kode Tiket Resmi
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-sm text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {activeTicket.ticket_code}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Salin Kode Tiket"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="shrink-0 p-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
                  <img
                    src={qrImageUrl}
                    alt="QR Verification"
                    className="w-28 h-28 object-contain rounded-lg"
                  />
                  <span className="text-[9px] font-mono text-slate-400 mt-1">
                    Scan for Gate Check-In
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Kirim via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
