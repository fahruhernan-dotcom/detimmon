import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Mail, 
  MessageSquare, 
  Eye, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';

/**
 * GroupRosterAccordion — Detailed Roster Dropdown for Group Leader (Ketua)
 * Renders all slots (A to K or A to F), sub-ticket codes, individual member delivery status,
 * and single-click administrative actions (Send Ticket Email, Send WhatsApp, Preview Ticket).
 */
export default function GroupRosterAccordion({
  item,
  activeEvent,
  googleOAuthToken,
  onResendMemberTicket,
  onOpenTicketPreview,
  onOpenEmailPreview,
  onOpenMembersModal,
  onShowToast
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [sendingSuffix, setSendingSuffix] = useState(null);

  const isMabar11 = item.packageType === 'MABAR_11' || 
                    item.packageType === 'GROUP_11' || 
                    item.kategori?.includes('11') || 
                    item.kategori?.includes('Komunitas') || 
                    item.nominal === 1000000;
  const isMabar6 = item.packageType === 'MABAR_6' || 
                   item.packageType === 'GROUP' || 
                   item.kategori?.includes('6') || 
                   item.kategori?.includes('Mabar') || 
                   item.nominal === 500000;
  const totalPax = isMabar11 ? 11 : isMabar6 ? 6 : 1;
  const additionalMembers = item.registration_members || [];

  const handleCopyText = (text, key, successMsg) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (onShowToast && successMsg) onShowToast(successMsg, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendWa = (name, phone, ticketCode) => {
    if (!phone) {
      if (onShowToast) onShowToast('Nomor WhatsApp peserta belum tersedia.', 'warning');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const eventTitle = activeEvent?.title || 'Webinar Public Speaking LPK Dignity';
    const message = `Halo Kak ${name},\n\nTerima kasih telah bergabung di *${eventTitle}*!\n\nBerikut adalah *E-Ticket resmi* Anda:\n🎫 *Kode Tiket:* ${ticketCode}\n👤 *Nama:* ${name}\n\nUntuk memeriksa tiket & informasi rundown terbaru, silakan buka tautan berikut:\n${window.location.origin}/#/cek-tiket?code=${encodeURIComponent(ticketCode)}\n\nSampai jumpa di sesi webinar!\n*Tim Dignity Indonesia*`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = async (suffix, slotName, slotEmail, subTicket) => {
    if (!slotEmail || slotEmail === '-') {
      if (onShowToast) onShowToast('Alamat email peserta belum diisi.', 'warning');
      return;
    }
    if (onResendMemberTicket) {
      setSendingSuffix(suffix);
      try {
        await onResendMemberTicket(item.id, suffix, {
          nama: slotName,
          email: slotEmail,
          subTicket
        });
      } finally {
        setSendingSuffix(null);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* ── Accordion Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Roster Tiket Rombongan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {isMabar11 ? 'Paket Komunitas (11 Pax)' : 'Paket MABAR (6 Pax)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Kode Induk: <strong className="text-slate-700">{item.nomorTicket || 'TICKET'}</strong> • Slot Suffix {isMabar11 ? 'A s/d K' : 'A s/d F'}
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
              const shareUrl = `${origin}/#/cek-tiket?code=${encodeURIComponent(item.nomorTicket)}`;
              handleCopyText(shareUrl, `link-${item.id}`, 'Tautan formulir pengisian mandiri disalin!');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer active:scale-95"
            title="Salin tautan formulir pengisian mandiri untuk dikirim ke ketua via WhatsApp"
          >
            {copiedKey === `link-${item.id}` ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin Form Mandiri</span>
              </>
            )}
          </button>

          {onOpenMembersModal && (
            <button
              type="button"
              onClick={() => onOpenMembersModal(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Data Anggota</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Slot Grid Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: totalPax }).map((_, idx) => {
          const suffix = String.fromCharCode(65 + idx);
          const isLeader = idx === 0;
          const subTicket = `${item.nomorTicket || 'TICKET'}-${suffix}`;
          
          let slotName = '';
          let slotEmail = '';
          let slotPhone = '';
          let isFilled = false;
          let isEmailSent = false;
          let memberData = null;

          if (isLeader) {
            slotName = item.nama;
            slotEmail = item.email;
            slotPhone = item.whatsapp;
            isFilled = true;
            isEmailSent = item.statusEmailTicket === 'TERKIRIM';
          } else {
            const m = additionalMembers.find(member => member.ticket_suffix === suffix);
            if (m?.persons?.full_name && m.persons.full_name.trim().length > 0) {
              slotName = m.persons.full_name;
              slotEmail = m.persons.email || '-';
              slotPhone = m.persons.whatsapp || '';
              isFilled = true;
              memberData = m;
              // Check email sent status for this specific member slot
              isEmailSent = Boolean(m.ticket_sent_at) || 
                            (Array.isArray(item.email_logs) && item.email_logs.some(l => l.recipient_email === m.persons?.email && l.status === 'SENT'));
            } else {
              slotName = '(Data Belum Diisi • Menunggu Anggota)';
              isFilled = false;
            }
          }

          return (
            <div 
              key={suffix} 
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                isFilled 
                  ? 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300' 
                  : 'bg-amber-50/20 border-dashed border-amber-200/90'
              }`}
            >
              {/* Header: Suffix badge, Ticket code, & Status badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold min-w-0">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10.5px] shrink-0 font-mono ${
                    isLeader 
                      ? 'bg-amber-500 text-white shadow-2xs font-extrabold' 
                      : isFilled 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {suffix}
                  </span>
                  <span className="text-slate-800 truncate font-mono text-[11px]">{subTicket}</span>
                </div>

                {/* Email Delivery Status Badge */}
                {isFilled ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono tracking-tight shrink-0 border ${
                    isEmailSent 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    {isEmailSent ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Email Terkirim</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Email Belum Kirim</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                    Slot Kosong
                  </span>
                )}
              </div>

              {/* Body: Participant Name, Email, & Phone */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs truncate ${isFilled ? 'font-bold text-slate-900' : 'text-amber-800/80 italic'}`}>
                    {slotName}
                  </span>
                  {isLeader && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase font-mono tracking-wider shrink-0">
                      Ketua
                    </span>
                  )}
                </div>

                {isFilled && (
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {slotEmail && slotEmail !== '-' ? slotEmail : '(Email tidak tersedia)'}
                    {slotPhone ? ` • ${slotPhone}` : ''}
                  </div>
                )}
              </div>

              {/* Footer Actions per Slot */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                {isFilled ? (
                  <>
                    <div className="flex items-center gap-1">
                      {/* 1. Kirim Email Tiket */}
                      <button
                        type="button"
                        onClick={() => handleSendEmail(suffix, slotName, slotEmail, subTicket)}
                        disabled={sendingSuffix === suffix || !slotEmail || slotEmail === '-'}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                          isEmailSent 
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200' 
                            : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                        } disabled:opacity-50`}
                        title={isEmailSent ? "Kirim ulang tiket ke email ini" : "Kirim tiket resmi ke email ini"}
                      >
                        <Send className={`w-3 h-3 ${sendingSuffix === suffix ? 'animate-spin' : ''}`} />
                        <span>{sendingSuffix === suffix ? 'Mengirim...' : isEmailSent ? 'Kirim Ulang' : 'Kirim Email'}</span>
                      </button>

                      {/* 2. Kirim WhatsApp */}
                      {slotPhone && (
                        <button
                          type="button"
                          onClick={() => handleSendWa(slotName, slotPhone, subTicket)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                          title="Kirim tiket langsung via WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WA</span>
                        </button>
                      )}
                    </div>

                    {/* 3. Pratinjau Tiket QR */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenTicketPreview) {
                          onOpenTicketPreview({
                            ...item,
                            nama: slotName,
                            email: slotEmail,
                            nomorTicket: subTicket,
                            selectedSuffix: suffix
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Lihat pratinjau tiket & QR code resmi"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>Tiket</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-amber-700/80 italic">
                      Menunggu pengisian mandiri
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
                        const shareUrl = `${origin}/#/cek-tiket?code=${encodeURIComponent(item.nomorTicket)}`;
                        handleCopyText(shareUrl, `slot-${suffix}`, `Tautan Slot ${suffix} disalin!`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedKey === `slot-${suffix}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Salin Link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
