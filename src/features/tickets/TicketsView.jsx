import React, { useState, useMemo } from 'react';
import { 
  Ticket, 
  Send, 
  Eye, 
  Search, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';
import TicketPreviewModal from './TicketPreviewModal';
import EmailPreviewModal from '../communication/EmailPreviewModal';
import RegistrationMembersModal from '../registrations/RegistrationMembersModal';
import { sendEmailViaGmail, buildTicketEmailHtml } from '../../services/googleApiService';
import { emailService } from '../../services/emailService';

/**
 * TicketsView — Ticket & MABAR issuance workspace (Autonomous & Self-Contained)
 * Holds its own TicketPreviewModal, EmailPreviewModal, RegistrationMembersModal,
 * and direct batch/resend dispatchers.
 */
export default function TicketsView({
  registrants = [],
  setRegistrants,
  activeEvent,
  googleOAuthToken,
  currentUser,
  onSelectParticipant,
  onShowToast,
  initialFilter = 'all'
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [expandedMabar, setExpandedMabar] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // Co-located modals state
  const [activeTicketRegistrant, setActiveTicketRegistrant] = useState(null);
  const [activeEmailPreviewRegistrant, setActiveEmailPreviewRegistrant] = useState(null);
  const [activeMabarRegistrant, setActiveMabarRegistrant] = useState(null);

  const toast = (msg, type = 'info') => {
    if (onShowToast) onShowToast(msg, type);
  };

  const toggleExpand = (id) => {
    setExpandedMabar(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Only consider verified / lunas participants for ticket issuance
  const lunasRegistrants = useMemo(() => {
    return registrants.filter(r => r.statusBayar === 'LUNAS' && !r.isDeleted);
  }, [registrants]);

  const unsentCount = lunasRegistrants.filter(r => r.statusEmailTicket !== 'TERKIRIM').length;
  const sentCount = lunasRegistrants.filter(r => r.statusEmailTicket === 'TERKIRIM').length;

  const filteredData = useMemo(() => {
    return lunasRegistrants.filter((item) => {
      if (filter === 'unsent' && item.statusEmailTicket === 'TERKIRIM') return false;
      if (filter === 'sent' && item.statusEmailTicket !== 'TERKIRIM') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          (item.nomorTicket && item.nomorTicket.toLowerCase().includes(q)) ||
          (item.instansi && item.instansi.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [lunasRegistrants, filter, search]);

  // Resend Ticket Handler
  const handleResendTicket = async (id, memberSuffix = null) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    let recipientEmail = target.email;
    let recipientName = target.nama;
    let ticketCode = target.nomorTicket;

    if (memberSuffix && memberSuffix !== 'A') {
      const member = target.registration_members?.find(m => m.ticket_suffix === memberSuffix);
      if (member?.persons) {
        recipientEmail = member.persons.email || target.email;
        recipientName = member.persons.full_name || target.nama;
        ticketCode = `${target.nomorTicket}-${memberSuffix}`;
      }
    }

    if (googleOAuthToken) {
      setResendingId(id);
      try {
        toast(`Mengirim E-Ticket ke ${recipientEmail}...`, 'info');
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${ticketCode}`;
        const ticketPayload = {
          ...target,
          nama: recipientName,
          email: recipientEmail,
          nomorTicket: ticketCode
        };
        const htmlBody = buildTicketEmailHtml(ticketPayload);
        const sendRes = await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: recipientEmail,
          subject,
          htmlBody
        });

        await emailService.recordTicketEmailDispatch({
          ticketId: target.supabaseTicketId,
          registrationId: target.supabaseRegistrationId,
          recipientEmail,
          subject,
          providerMessageId: sendRes?.id || null,
          status: 'SENT',
          senderEmail: currentUser?.email || null
        });

        const nowIso = new Date().toISOString();
        if (setRegistrants) {
          setRegistrants(prev => prev.map(item => item.id === id ? { ...item, statusEmailTicket: 'TERKIRIM', ticketSentAt: nowIso } : item));
        }

        toast(`E-Ticket resmi (${ticketCode}) berhasil dikirim via Gmail ke ${recipientEmail}!`, 'success');
      } catch (err) {
        await emailService.recordTicketEmailDispatch({
          ticketId: target.supabaseTicketId,
          registrationId: target.supabaseRegistrationId,
          recipientEmail,
          subject: `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${ticketCode}`,
          status: 'FAILED',
          errorMessage: err.message,
          senderEmail: currentUser?.email || null
        }).catch(() => {});

        toast(`Gagal kirim via Gmail: ${err.message}`, 'warning');
      } finally {
        setResendingId(null);
      }
    } else {
      toast('Silakan login akun Google terlebih dahulu untuk mengirim E-Ticket via Gmail.', 'warning');
    }
  };

  // Batch Send Tickets
  const handleBatchSendTickets = async () => {
    if (!googleOAuthToken) {
      toast('Silakan login dengan akun Google terlebih dahulu untuk mengirim blast email.', 'warning');
      return;
    }
    const unsentList = lunasRegistrants.filter(r => r.statusEmailTicket !== 'TERKIRIM');
    if (unsentList.length === 0) {
      toast('Seluruh tiket peserta lunas sudah terkirim sebelumnya. Antrean kosong.', 'info');
      return;
    }

    setIsSendingBatch(true);
    toast(`Memulai pengiriman tiket via Gmail ke ${unsentList.length} peserta...`, 'info');
    let sent = 0;
    const newlySentIds = [];

    for (const r of unsentList) {
      try {
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${r.nomorTicket}`;
        const htmlBody = buildTicketEmailHtml(r);
        const sendRes = await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: r.email,
          subject,
          htmlBody
        });

        await emailService.recordTicketEmailDispatch({
          ticketId: r.supabaseTicketId,
          registrationId: r.supabaseRegistrationId,
          recipientEmail: r.email,
          subject,
          providerMessageId: sendRes?.id || null,
          status: 'SENT',
          senderEmail: currentUser?.email || null
        });

        newlySentIds.push(r.id);
        sent++;
        await new Promise(res => setTimeout(res, 250));
      } catch (e) {
        console.warn(`Gagal kirim tiket ke ${r.email}:`, e);
      }
    }

    if (newlySentIds.length > 0 && setRegistrants) {
      const nowIso = new Date().toISOString();
      setRegistrants(prev => prev.map(item => newlySentIds.includes(item.id) ? { ...item, statusEmailTicket: 'TERKIRIM', ticketSentAt: nowIso } : item));
    }

    setIsSendingBatch(false);
    toast(`Selesai! ${sent} dari ${unsentList.length} E-Ticket berhasil dikirim via Gmail API!`, 'success');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── TOP CONTROL & FILTER BAR ────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'all' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tiket ({lunasRegistrants.length})
            </button>
            <button
              onClick={() => setFilter('unsent')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'unsent' 
                  ? 'bg-white text-amber-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Belum Terkirim</span>
              {unsentCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300">
                  {unsentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === 'sent' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sudah Terkirim ({sentCount})</span>
            </button>
          </div>

          {/* Quick Actions & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor tiket, nama, instansi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>

            {unsentCount > 0 && (
              <button
                type="button"
                onClick={handleBatchSendTickets}
                disabled={isSendingBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 shrink-0"
                title="Kirim semua tiket yang belum terkirim via Gmail API"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingBatch ? 'animate-spin' : ''}`} />
                <span>{isSendingBatch ? 'Mengirim Batch...' : `Kirim Batch (${unsentCount})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TICKETS TABLE ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Nomor E-Ticket</th>
                <th className="py-3.5 px-4 font-semibold">Pemilik / Instansi</th>
                <th className="py-3.5 px-4 font-semibold">Tipe Tiket</th>
                <th className="py-3.5 px-4 font-semibold">Status Pengiriman</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Ticket className="w-8 h-8 text-slate-300" />
                      <div className="font-semibold text-slate-600">Tidak ada tiket ditemukan</div>
                      <div className="text-[11px] text-slate-400">Hanya peserta berstatus LUNAS yang muncul di halaman ini.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isSent = item.statusEmailTicket === 'TERKIRIM';
                  const isMabar11 = item.packageType === 'MABAR_11' || item.packageType === 'GROUP_11' || item.kategori?.includes('11') || item.kategori?.includes('Komunitas') || item.nominal === 1000000;
                  const isMabar6 = item.packageType === 'MABAR_6' || item.packageType === 'GROUP' || item.kategori?.includes('6') || item.kategori?.includes('Mabar') || item.nominal === 500000;
                  const isGroup = isMabar11 || isMabar6;
                  const groupPax = isMabar11 ? 11 : isMabar6 ? 6 : 1;
                  const additionalMembers = item.registration_members || [];
                  const filledCount = 1 + additionalMembers.filter(m => m.ticket_suffix !== 'A' && m.persons?.full_name).length;
                  const isExpanded = Boolean(expandedMabar[item.id]);

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-amber-500/5 transition-colors group">
                        {/* Ticket Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {item.nomorTicket || 'TICKET-DIGNITY'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.nomorTicket)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="Salin Nomor Tiket"
                            >
                              {copiedCode === item.nomorTicket ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {item.ticketSentAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Terkirim: {formatDate(item.ticketSentAt)}
                            </div>
                          )}
                        </td>

                        {/* Owner & Institution */}
                        <td 
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => onSelectParticipant && onSelectParticipant(item)}
                        >
                          <div className="font-semibold text-slate-950 group-hover:text-amber-800 transition-colors">
                            {item.nama}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.email} {item.instansi ? `• ${item.instansi}` : ''}
                          </div>
                        </td>

                        {/* Ticket Type & Group Badges */}
                        <td className="py-3.5 px-4">
                          {isGroup ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{isMabar11 ? 'Komunitas (11 Pax)' : 'MABAR (6 Pax)'}</span>
                              <span className="font-mono text-[10px] bg-indigo-200/60 px-1 py-0.2 rounded font-bold">
                                {filledCount}/{groupPax}
                              </span>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              Individu (1 Pax)
                            </span>
                          )}
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3.5 px-4">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Terkirim via Gmail</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 font-mono">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Belum Dikirim</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Ticket Modal */}
                            <button
                              type="button"
                              onClick={() => setActiveTicketRegistrant(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Lihat Tampilan Tiket QR"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Email Preview Modal */}
                            <button
                              type="button"
                              onClick={() => setActiveEmailPreviewRegistrant(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Buka Pratinjau Email Resmi"
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {/* Single Send / Resend Ticket */}
                            <button
                              type="button"
                              onClick={() => handleResendTicket(item.id)}
                              disabled={resendingId === item.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isSent
                                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                  : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-2xs font-bold'
                              } disabled:opacity-50`}
                              title={isSent ? "Kirim ulang tiket ke email" : "Kirim tiket sekarang"}
                            >
                              <Send className={`w-3 h-3 ${resendingId === item.id ? 'animate-spin' : ''}`} />
                              <span>{resendingId === item.id ? 'Mengirim...' : isSent ? 'Kirim Ulang' : 'Kirim'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Group Roster Row */}
                      {isGroup && isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200/80">
                          <td colSpan={5} className="p-4 pl-6 md:pl-10">
                            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-800">
                                  Daftar Tiket Anggota Rombongan ({groupPax} Kursi)
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveMabarRegistrant(item)}
                                  className="text-indigo-600 hover:underline font-semibold text-[11px] cursor-pointer"
                                >
                                  Kelola Anggota &rarr;
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {Array.from({ length: groupPax }, (_, i) => String.fromCharCode(65 + i)).map((suffix, idx) => {
                                  const memberCode = `${item.nomorTicket || 'TICKET'}-${suffix}`;
                                  let slotName = '';
                                  let isSlotFilled = false;

                                  if (idx === 0) {
                                    slotName = `${item.nama} (Ketua)`;
                                    isSlotFilled = true;
                                  } else {
                                    const memberObj = additionalMembers.find(m => m.ticket_suffix === suffix);
                                    if (memberObj?.persons?.full_name && memberObj.persons.full_name.trim().length > 0) {
                                      slotName = memberObj.persons.full_name;
                                      isSlotFilled = true;
                                    } else {
                                      slotName = `[Slot ${suffix} - Belum Diisi di Web]`;
                                      isSlotFilled = false;
                                    }
                                  }

                                  return (
                                    <div 
                                      key={suffix}
                                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                                        isSlotFilled 
                                          ? 'bg-slate-50 border-slate-200/80' 
                                          : 'bg-amber-50/50 border-amber-200/70 border-dashed'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-[11px]">
                                          <span>{memberCode}</span>
                                          {isSlotFilled ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Data Terisi" />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Menunggu Pengisian" />
                                          )}
                                        </div>
                                        <div className={`text-[11px] truncate max-w-[160px] ${isSlotFilled ? 'text-slate-700 font-medium' : 'text-amber-800/80 italic'}`}>
                                          {slotName}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setActiveTicketRegistrant({ ...item, nama: slotName, nomorTicket: memberCode, selectedSuffix: suffix })}
                                        className="p-1 text-slate-400 hover:text-amber-700 cursor-pointer"
                                        title={`Preview Tiket Suffix ${suffix}`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Total <strong>{lunasRegistrants.length}</strong> tiket lunas (<strong>{sentCount}</strong> terkirim, <strong>{unsentCount}</strong> belum terkirim)</span>
          <span className="text-[11px] text-slate-400">Pengiriman batch otomatis mengecualikan tiket yang sudah terkirim</span>
        </div>
      </div>

      {/* ── CO-LOCATED MODALS ── */}
      <TicketPreviewModal
        isOpen={Boolean(activeTicketRegistrant)}
        onClose={() => setActiveTicketRegistrant(null)}
        registrant={activeTicketRegistrant}
        activeEvent={activeEvent}
      />

      <EmailPreviewModal
        isOpen={Boolean(activeEmailPreviewRegistrant)}
        onClose={() => setActiveEmailPreviewRegistrant(null)}
        registrant={activeEmailPreviewRegistrant}
        type="ticket"
        activeEvent={activeEvent}
        googleOAuthToken={googleOAuthToken}
        onEmailSent={(p) => {
          const nowIso = new Date().toISOString();
          if (setRegistrants) {
            setRegistrants(prev => prev.map(item => item.id === p.id ? { ...item, statusEmailTicket: 'TERKIRIM', ticketSentAt: nowIso } : item));
          }
          toast(`E-Ticket resmi telah dikirim ke ${p.email}!`, 'success');
        }}
      />

      <RegistrationMembersModal
        isOpen={Boolean(activeMabarRegistrant)}
        onClose={() => setActiveMabarRegistrant(null)}
        registrant={activeMabarRegistrant}
        onOpenTicketPreview={(item, suffix) => {
          setActiveTicketRegistrant({ ...item, selectedSuffix: suffix });
        }}
      />

    </div>
  );
}
