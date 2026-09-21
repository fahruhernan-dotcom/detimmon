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

/**
 * TicketsView — Ticket & MABAR issuance workspace
 * Strictly implements PHASE_04_UI_UX_TICKET_MABAR.md:
 * - Ticket Delivery state (SENT / NOT SENT)
 * - MABAR expandable tree view
 * - Guardrail batch sending
 * - Preview ticket modal trigger
 */
export default function TicketsView({
  registrants = [],
  onSelectParticipant,
  onOpenTicketPreview,
  onPreviewEmailTicket,
  onOpenMembers,
  onResendTicket,
  onBatchSendTickets,
  hasGoogleToken,
  initialFilter = 'all'
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [expandedMabar, setExpandedMabar] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);

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

  // Only consider verified / lunas participants for ticket issuance (exclude soft-deleted)
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

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── TOP CONTROL & BATCH ACTIONS ─────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'all' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Tiket Lunas ({lunasRegistrants.length})
            </button>
            <button
              onClick={() => setFilter('unsent')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                filter === 'unsent' ? 'bg-white text-amber-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                filter === 'sent' ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sudah Terkirim ({sentCount})</span>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari peserta atau tiket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>

            {/* Batch Send Tickets */}
            {onBatchSendTickets && (
              <button
                onClick={onBatchSendTickets}
                disabled={!hasGoogleToken || unsentCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs transition-colors disabled:opacity-40 shrink-0"
                title={unsentCount === 0 ? "Semua tiket sudah terkirim" : "Kirim tiket massal via Gmail API"}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim {unsentCount} Tiket Belum Terkirim</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── TICKETS & MABAR GROUPS TABLE ────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Nomor Tiket & Kode</th>
                <th className="py-3.5 px-4 font-semibold">Pemegang / Pendaftar</th>
                <th className="py-3.5 px-4 font-semibold">Tipe Paket</th>
                <th className="py-3.5 px-4 font-semibold">Status Pengiriman</th>
                <th className="py-3.5 px-4 font-semibold text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada tiket yang ditemukan pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isSent = item.statusEmailTicket === 'TERKIRIM';
                  const isMabar = (item.kategori || '').toLowerCase().includes('mabar') || (item.nominal === 500000);
                  const isExpanded = Boolean(expandedMabar[item.id]);

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-amber-500/5 transition-colors group">
                        
                        {/* Nomor Tiket */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {isMabar && (
                              <button
                                onClick={() => toggleExpand(item.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                title="Buka detail rombongan MABAR"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {item.nomorTicket || 'TICKET-DIGNITY-PENDING'}
                            </span>

                            {item.nomorTicket && (
                              <button
                                onClick={() => handleCopy(item.nomorTicket)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title="Salin kode tiket"
                              >
                                {copiedCode === item.nomorTicket ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Pemegang / Pendaftar */}
                        <td 
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => onSelectParticipant(item)}
                        >
                          <div className="font-semibold text-slate-950 group-hover:text-amber-800 transition-colors">
                            {item.nama}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.email}
                          </div>
                        </td>

                        {/* Tipe Paket */}
                        <td className="py-3.5 px-4">
                          {isMabar ? (
                            <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              <Users className="w-3 h-3" /> MABAR (6 Tiket Suffix A-F)
                            </span>
                          ) : (
                            <span className="text-slate-700 text-xs">Tiket Individu (1 Pax)</span>
                          )}
                        </td>

                        {/* Status Pengiriman */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider font-mono border ${
                            isSent 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            {isSent ? '✓ TERKIRIM (GMAIL)' : 'BELUM KIRIM'}
                          </span>
                        </td>

                        {/* Tindakan */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenTicketPreview(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                              title="Preview Tiket QR Dignity"
                            >
                              <Ticket className="w-3.5 h-3.5 text-slate-500" />
                              <span>Preview QR</span>
                            </button>

                            {onPreviewEmailTicket && (
                              <button
                                onClick={() => onPreviewEmailTicket(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-semibold text-xs transition-colors shadow-2xs"
                                title="Lihat Layout Email HTML Tiket"
                              >
                                <Mail className="w-3.5 h-3.5 text-amber-600" />
                                <span>Preview Email</span>
                              </button>
                            )}

                            <button
                              onClick={() => onResendTicket(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs"
                              title={isSent ? "Kirim ulang tiket ke email" : "Kirim tiket resmi ke email"}
                            >
                              <Send className="w-3 h-3 text-amber-400" />
                              <span>{isSent ? 'Kirim Ulang' : 'Kirim Tiket'}</span>
                            </button>

                            {isMabar && onOpenMembers && (
                              <button
                                onClick={() => onOpenMembers(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-semibold text-xs transition-colors"
                                title="Kelola 6 Anggota Rombongan"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Kelola Anggota</span>
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>

                      {/* ── EXPANDABLE MABAR MEMBERS TREE VIEW ───── */}
                      {isMabar && isExpanded && (
                        <tr className="bg-slate-50/80 border-y border-slate-200/80">
                          <td colSpan={5} className="p-4 pl-12">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                                <span>Rincian 6 Tiket Anggota Rombongan:</span>
                                <button
                                  onClick={() => onOpenMembers(item)}
                                  className="text-indigo-600 hover:underline font-semibold"
                                >
                                  Edit Nama Anggota &rarr;
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {['A', 'B', 'C', 'D', 'E', 'F'].map((suffix, idx) => {
                                  const memberCode = `${item.nomorTicket || 'TICKET-DIGNITY'}-${suffix}`;
                                  return (
                                    <div 
                                      key={suffix}
                                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                                          {memberCode}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                          {idx === 0 ? `${item.nama} (Ketua)` : `Anggota #${idx + 1}`}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => onOpenTicketPreview({ ...item, selectedSuffix: suffix })}
                                        className="p-1 text-slate-400 hover:text-amber-700"
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
          <span className="text-[11px] text-slate-400">Pengiriman batch selalu otomatis mengecualikan tiket yang sudah berstatus terkirim</span>
        </div>
      </div>

    </div>
  );
}
