import React from 'react';
import { X, Users, MessageSquare, Ticket, Mail, UserCheck, Clock, Edit3, CheckCircle2, Send } from 'lucide-react';
import { normalizeCertificateName, normalizeWhatsApp } from '../../utils/normalizers';

export default function RegistrationMembersModal({
  isOpen,
  onClose,
  registrant,
  onOpenTicketPreview,
  onEdit
}) {
  if (!isOpen || !registrant) return null;

  // 1. Deteksi jenis paket rombongan (11 Pax Komunitas vs 6 Pax MABAR)
  const isKomunitas = 
    registrant.packageType === 'MABAR_11' || 
    registrant.packageType === 'GROUP_11' || 
    registrant.kategori?.includes('11') || 
    registrant.kategori?.includes('Komunitas') || 
    parseInt(registrant.nominal, 10) === 1000000;

  const totalPax = isKomunitas ? 11 : 6;
  const packageTitle = isKomunitas ? 'Promo Komunitas (11 Pax • 10+1)' : 'Paket Promo MABAR (6 Pax • 5+1)';
  const suffixRange = isKomunitas ? '-A s/d -K' : '-A s/d -F';

  // 2. Petakan seluruh slot rombongan (Slot 1: Leader, Slot 2..N: Anggota / Menyusul)
  const regMembers = Array.isArray(registrant.registration_members) ? registrant.registration_members : [];
  const localMabarNames = Array.isArray(registrant.mabarMembers) ? registrant.mabarMembers : [];

  // Cari leader
  const dbLeader = regMembers.find(m => m.member_role === 'LEADER' || m.ticket_suffix === 'A');
  const leaderSlot = {
    id: dbLeader?.id || 'lead-1',
    member_role: 'LEADER',
    ticket_suffix: 'A',
    isPendingData: false,
    persons: {
      full_name: registrant.nama || dbLeader?.persons?.full_name || 'Ketua Rombongan',
      email: registrant.email || dbLeader?.persons?.email || '-',
      whatsapp: registrant.whatsapp || dbLeader?.persons?.whatsapp || ''
    }
  };

  // Filter anggota tambahan (selain leader)
  const additionalMembers = regMembers.filter(m => m.member_role !== 'LEADER' && m.ticket_suffix !== 'A');

  const memberSlots = Array.from({ length: totalPax - 1 }).map((_, idx) => {
    const slotIndex = idx + 1; // 1, 2, ...
    const suffix = String.fromCharCode(65 + slotIndex); // B, C, D, ...

    // Cek di registration_members database berdasarkan suffix atau index
    const dbMember = additionalMembers.find(m => m.ticket_suffix === suffix) || additionalMembers[idx];
    
    // Cek juga di localMabarNames (fallback jika baru diinput via form/wizard)
    const localVal = localMabarNames[idx];
    const localName = typeof localVal === 'string' ? localVal.trim() : (localVal?.nama || '').trim();

    const fullName = dbMember?.persons?.full_name || localName || '';
    const isFilled = Boolean(fullName && fullName.trim().length > 0);

    if (isFilled) {
      return {
        id: dbMember?.id || `member-slot-${slotIndex}`,
        member_role: 'MEMBER',
        ticket_suffix: suffix,
        isPendingData: false,
        persons: {
          full_name: fullName,
          email: dbMember?.persons?.email || (typeof localVal === 'object' ? localVal?.email : '') || '-',
          whatsapp: dbMember?.persons?.whatsapp || (typeof localVal === 'object' ? localVal?.whatsapp : '') || registrant.whatsapp
        }
      };
    }

    // Slot belum diisi (Menyusul)
    return {
      id: `pending-slot-${slotIndex}`,
      member_role: 'MEMBER',
      ticket_suffix: suffix,
      isPendingData: true,
      persons: {
        full_name: '(Data Anggota Menyusul • Belum Diisi)',
        email: '-',
        whatsapp: registrant.whatsapp
      }
    };
  });

  const allSlots = [leaderSlot, ...memberSlots];
  const filledCount = allSlots.filter(s => !s.isPendingData).length;
  const pendingCount = totalPax - filledCount;

  // Helper kirim notif tiket ke peserta yang sudah ada datanya
  const getWaMemberLink = (slot) => {
    const p = slot.persons || {};
    const name = normalizeCertificateName(p.full_name || '');
    const wa = normalizeWhatsApp(p.whatsapp || registrant.whatsapp || '');
    const ticketCode = `${registrant.nomorTicket}-${slot.ticket_suffix}`;
    const text = `Halo Kak *${name}*! Tiket rombongan Anda untuk Webinar Public Speaking LPK Indonesia Dignity adalah *${ticketCode}*. Sampai jumpa di kelas!`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  };

  // Helper kirim reminder ke Ketua Rombongan untuk meminta data slot yang menyusul
  const getWaRequestLink = (slot) => {
    const leaderWa = normalizeWhatsApp(registrant.whatsapp || '');
    const leaderName = normalizeCertificateName(registrant.nama || '');
    const text = `Halo Kak *${leaderName}*!\n\nKami dari panitia Webinar Public Speaking LPK Indonesia Dignity.\n\nUntuk melengkapi penerbitan E-Ticket resmi rombongan *${packageTitle}* (No. Registrasi: *${registrant.nomorTicket}*), mohon bantuan mengirimkan data peserta untuk *Slot ${slot.ticket_suffix}*:\n1. Nama Lengkap & Gelar:\n2. Nomor WhatsApp Aktif:\n3. Alamat Email:\n\nData ini akan kami gunakan untuk pencetakan E-Ticket & E-Sertifikat resmi ber-barcode. Terima kasih Kak!`;
    return `https://wa.me/${leaderWa}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {packageTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                  {suffixRange}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tiket Induk: <strong className="font-mono text-slate-700">{registrant.nomorTicket}</strong> • Koordinator: <strong className="text-slate-700">{registrant.nama}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status Kapasitas & Penjelasan Fleksibilitas Data */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-200/80 text-purple-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pendingCount === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-bold text-xs">
                  {pendingCount === 0 
                    ? 'Data Seluruh Anggota Rombongan Lengkap' 
                    : `Slot Rombongan Terisi Sebagian (${pendingCount} Slot Menyusul)`}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] font-mono border ${
                pendingCount === 0 
                  ? 'bg-emerald-600 text-white border-emerald-700' 
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {filledCount} / {totalPax} Kursi
              </span>
            </div>
            
            <p className="text-[11px] text-purple-800/90 leading-relaxed">
              💡 <strong>Aturan Pengisian Fleksibel:</strong> Koordinator pendaftar berhak membayar terlebih dahulu untuk mengamankan kuota/harga promo. Nama anggota rombongan <strong>tidak wajib diisi semua di awal</strong> dan dapat disetorkan menyusul melalui WhatsApp Panitia.
            </p>
          </div>

          {/* List of Slots */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {allSlots.map((slot, idx) => {
              const p = slot.persons || {};
              const ticketCode = `${registrant.nomorTicket}-${slot.ticket_suffix}`;
              const isLead = slot.member_role === 'LEADER';
              const isPending = slot.isPendingData;

              return (
                <div 
                  key={slot.id || idx} 
                  className={`p-3.5 flex items-center justify-between gap-3 transition ${
                    isPending ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Suffix Badge */}
                    <div className={`w-8 h-8 rounded-xl border font-mono font-bold flex items-center justify-center text-xs shrink-0 ${
                      isLead 
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                        : isPending 
                        ? 'bg-slate-100 text-slate-400 border-slate-200 border-dashed' 
                        : 'bg-purple-100 text-purple-800 border-purple-300'
                    }`}>
                      {slot.ticket_suffix}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs truncate ${
                          isPending ? 'text-slate-400 italic' : 'text-slate-900'
                        }`}>
                          {p.full_name}
                        </span>

                        {isLead && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            Ketua Rombongan
                          </span>
                        )}

                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Boleh Menyusul</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-600 font-semibold">{ticketCode}</span>
                        <span>•</span>
                        <span>{p.email !== '-' ? p.email : 'Email Belum Ada'}</span>
                        {p.whatsapp && (
                          <>
                            <span>•</span>
                            <span>WA: {p.whatsapp}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions per Slot */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending ? (
                      /* Action untuk Slot Menyusul: Hubungi Ketua */
                      <a
                        href={getWaRequestLink(slot)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-[11px] font-bold cursor-pointer"
                        title="Kirim template WhatsApp ke Ketua untuk meminta data anggota ini"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-600" />
                        <span>Minta Data via WA</span>
                      </a>
                    ) : (
                      /* Action untuk Slot Terisi: E-Ticket & Info WA */
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenTicketPreview && onOpenTicketPreview(registrant, slot.ticket_suffix)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition text-[11px] font-bold cursor-pointer"
                          title="Lihat E-Ticket Resmi Anggota Ini"
                        >
                          <Ticket className="w-3.5 h-3.5 text-purple-600" />
                          <span>E-Ticket</span>
                        </button>
                        <a
                          href={getWaMemberLink(slot)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                          title="Kirim Tiket Resmi via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {pendingCount > 0 ? (
              <span>💡 Butuh mengisi data baru? Klik tombol di samping.</span>
            ) : (
              <span>✓ Seluruh data peserta telah tersimpan.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(registrant)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Lengkapi / Edit Anggota</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
