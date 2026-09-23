import React, { useState } from 'react';
import { 
  Users, 
  ChevronDown, 
  MessageSquare, 
  Mail, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Settings2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/**
 * GroupRosterDropdown — Compact, Interactive Dropdown Menu for Group Members
 * Replaces cumbersome wrapping tag pills with an elegant floating list of slots.
 */
export default function GroupRosterDropdown({
  item,
  activeEvent,
  filledPaxCount,
  totalPax,
  onOpenMembersModal,
  toggleExpandRow,
  isExpanded,
  onResendMemberTicket,
  onShowToast
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [sendingSuffix, setSendingSuffix] = useState(null);

  const additionalMembers = item.registration_members || [];

  const handleCopy = (text, key, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (onShowToast) onShowToast(`Nomor tiket ${text} disalin!`, 'success');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSendWa = (name, phone, ticketCode, e) => {
    if (e) e.stopPropagation();
    if (!phone) {
      if (onShowToast) onShowToast('Nomor WhatsApp peserta belum tersedia.', 'warning');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const eventTitle = activeEvent?.title || 'Webinar Public Speaking LPK Dignity';
    const message = `Halo Kak ${name},\n\nTerima kasih telah bergabung di *${eventTitle}*!\n\nBerikut adalah *E-Ticket resmi* Anda:\n🎫 *Kode Tiket:* ${ticketCode}\n👤 *Nama:* ${name}\n\nUntuk memeriksa tiket & informasi rundown terbaru, silakan buka tautan berikut:\n${window.location.origin}/#/cek-tiket?code=${encodeURIComponent(ticketCode)}\n\nSampai jumpa di sesi webinar!\n*Tim Dignity Indonesia*`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = async (suffix, slotName, slotEmail, subTicket, e) => {
    if (e) e.stopPropagation();
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

  const isAllFilled = filledPaxCount >= totalPax;

  return (
    <div className="mt-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
              isAllFilled
                ? 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-800 border-indigo-200/90'
                : 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border-amber-200/90'
            }`}
            title="Klik untuk membuka daftar anggota rombongan"
          >
            <Users className={`w-3.5 h-3.5 ${isAllFilled ? 'text-indigo-600' : 'text-amber-700'}`} />
            <span>{filledPaxCount}/{totalPax} Kursi Terisi</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="start" 
          sideOffset={6} 
          className="w-80 sm:w-96 p-2 rounded-2xl shadow-xl border border-slate-200 bg-white z-50 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Info */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Roster Anggota ({totalPax} Pax)</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isAllFilled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {isAllFilled ? 'LENGKAP' : `${totalPax - filledPaxCount} Belum Diisi`}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              Kode Induk: <strong className="font-mono text-slate-600">{item.nomorTicket || item.id?.slice(0, 8)}</strong>
            </p>
          </div>

          {/* List of Slots (Scrollable) */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100/80 py-1 pr-0.5 space-y-0.5 text-xs">
            {Array.from({ length: totalPax }).map((_, idx) => {
              const suffix = String.fromCharCode(65 + idx);
              const isLeader = idx === 0;
              const isBonus = idx === totalPax - 1 && totalPax === 11;
              const subTicket = `${item.nomorTicket || 'TICKET'}-${suffix}`;
              
              let slotName = '';
              let slotEmail = '';
              let slotPhone = '';
              let isFilled = false;
              let isEmailSent = false;

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
                  isEmailSent = Boolean(m.ticket_sent_at) || 
                                (Array.isArray(item.email_logs) && item.email_logs.some(l => l.recipient_email === m.persons?.email && l.status === 'SENT'));
                } else {
                  slotName = '(Belum Diisi)';
                  isFilled = false;
                }
              }

              return (
                <div 
                  key={suffix} 
                  className={`p-2 rounded-xl transition-colors flex items-center justify-between gap-2 ${
                    isFilled ? 'hover:bg-slate-50' : 'bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Suffix Badge */}
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-mono font-bold ${
                      isLeader 
                        ? 'bg-amber-500 text-white shadow-2xs' 
                        : isFilled 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {suffix}
                    </span>

                    {/* Member Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold truncate text-[11.5px] ${isFilled ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                          {slotName}
                        </span>
                        {isLeader && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                            KETUA
                          </span>
                        )}
                        {isBonus && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            BONUS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        <span>{subTicket}</span>
                        {isFilled && slotEmail && slotEmail !== '-' && (
                          <>
                            <span>•</span>
                            <span className="truncate">{slotEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for filled slots */}
                  {isFilled && (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* WhatsApp Button */}
                      {slotPhone && (
                        <button
                          type="button"
                          onClick={(e) => handleSendWa(slotName, slotPhone, subTicket, e)}
                          className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Kirim tiket via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Resend Email Button */}
                      {slotEmail && slotEmail !== '-' && (
                        <button
                          type="button"
                          disabled={sendingSuffix === suffix}
                          onClick={(e) => handleSendEmail(suffix, slotName, slotEmail, subTicket, e)}
                          className="p-1 rounded-md text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Kirim ulang e-ticket ke email"
                        >
                          {sendingSuffix === suffix ? (
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Copy Sub-Ticket Button */}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(subTicket, suffix, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Salin nomor sub-tiket"
                      >
                        {copiedKey === suffix ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-1" />

          {/* Footer Actions */}
          <div className="p-1.5 flex items-center justify-between gap-2">
            {onOpenMembersModal && (
              <button
                type="button"
                onClick={() => onOpenMembersModal(item)}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Kelola Data Lengkap</span>
              </button>
            )}

            {toggleExpandRow && (
              <button
                type="button"
                onClick={() => toggleExpandRow(item.id)}
                className="py-1.5 px-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? 'Tutup Kartu' : 'Tampilan Kartu'}</span>
              </button>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
