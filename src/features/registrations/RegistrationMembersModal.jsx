import React from 'react';
import { X, Users, MessageSquare, Ticket, Mail, UserCheck } from 'lucide-react';
import { normalizeCertificateName, normalizeWhatsApp } from '../../utils/normalizers';

export default function RegistrationMembersModal({
  isOpen,
  onClose,
  registrant,
  onOpenTicketPreview
}) {
  if (!isOpen || !registrant) return null;

  const members = registrant.registration_members && registrant.registration_members.length > 0
    ? registrant.registration_members
    : [
        {
          id: 'lead-1',
          member_role: 'LEADER',
          ticket_suffix: 'A',
          persons: {
            full_name: registrant.nama,
            email: registrant.email,
            whatsapp: registrant.whatsapp
          }
        },
        ...Array.from({ length: 5 }).map((_, i) => {
          const suffix = String.fromCharCode(66 + i); // B, C, D, E, F
          return {
            id: `member-${i + 2}`,
            member_role: 'MEMBER',
            ticket_suffix: suffix,
            persons: {
              full_name: `Peserta MABAR #${i + 2} (${registrant.nama.split(' ')[0]} Team)`,
              email: `member${i + 2}.${registrant.email.split('@')[0]}@dignity.id`,
              whatsapp: registrant.whatsapp
            }
          };
        })
      ];

  const getWaLink = (member) => {
    const p = member.persons || {};
    const name = normalizeCertificateName(p.full_name || '');
    const wa = normalizeWhatsApp(p.whatsapp || registrant.whatsapp || '');
    const ticketCode = `${registrant.nomorTicket}-${member.ticket_suffix || 'A'}`;
    const text = `Halo Kak *${name}*! Tiket MABAR Anda untuk Webinar Public Speaking LPK Indonesia Dignity adalah *${ticketCode}*. Sampai jumpa di kelas!`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Daftar Rombongan Paket MABAR (6 Pax)
              </h3>
              <p className="text-[11px] text-slate-500">
                Tiket Induk: <strong>{registrant.nomorTicket}</strong> • Ketua: {registrant.nama}
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold">Paket Promo Rombongan MABAR Terkonfirmasi</div>
              <div className="text-[11px] text-purple-700">
                1 Transaksi mencakup 6 penerima manfaat dengan kode tiket turunan resmi berakhiran <strong>-A</strong> s/d <strong>-F</strong>.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-600 text-white font-bold text-[10px] font-mono">
              6 / 6 Kursi
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {members.map((m, idx) => {
              const p = m.persons || {};
              const ticketCode = `${registrant.nomorTicket}-${m.ticket_suffix || String.fromCharCode(65 + idx)}`;
              const isLead = m.member_role === 'LEADER' || idx === 0;

              return (
                <div key={m.id || idx} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold flex items-center justify-center text-xs">
                      {m.ticket_suffix || String.fromCharCode(65 + idx)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {p.full_name || 'Nama Peserta'}
                        </span>
                        {isLead && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Ketua Rombongan
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>{ticketCode}</span>
                        <span>•</span>
                        <span>{p.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenTicketPreview && onOpenTicketPreview(registrant, m.ticket_suffix || String.fromCharCode(65 + idx))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-[11px] font-semibold"
                      title="Lihat E-Ticket Anggota Ini"
                    >
                      <Ticket className="w-3.5 h-3.5 text-amber-600" />
                      <span>E-Ticket</span>
                    </button>
                    <a
                      href={getWaLink(m)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                      title="Kirim Info Tiket via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
