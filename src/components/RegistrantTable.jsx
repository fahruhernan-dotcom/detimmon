import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Eye, 
  CheckCircle2, 
  Mail, 
  MessageCircle, 
  AlertCircle,
  HardDrive,
  Send,
  Edit3,
  Trash2,
  CreditCard,
  Users,
  Ticket
} from 'lucide-react';
import { formatRupiah, formatDate } from '../utils/formatters';

export default function RegistrantTable({ 
  registrants, 
  onVerifyPayment, 
  onResendTicket, 
  onToggleStatus,
  onEditRegistrant,
  onDeleteRegistrant,
  onViewProof, 
  onExportCsv,
  onBackupToDrive,
  onBatchSendTickets,
  hasGoogleToken,
  onOpenLedger,
  onOpenMembers,
  onOpenTicketPreview
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);

  const filteredData = useMemo(() => {
    return activeRegistrants.filter((item) => {
      if (filter === 'pending' && item.statusBayar !== 'PENDING') return false;
      if (filter === 'lunas' && item.statusBayar !== 'LUNAS') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.nomorTicket.toLowerCase().includes(q) ||
          item.instansi.toLowerCase().includes(q) ||
          item.whatsapp.includes(q)
        );
      }
      return true;
    });
  }, [activeRegistrants, filter, search]);

  const getWhatsAppTicketUrl = (item) => {
    const text = 
`Halo Kak *${item.nama}*!

Terima kasih, pembayaran tiket webinar Anda telah *TERVERIFIKASI LUNAS* oleh LPK Indonesia Dignity in Collaboration with KLTC!

----------------------------------------
E-TICKET RESMI WEBINAR
• Nomor Tiket : *${item.nomorTicket}*
• Nama        : *${item.nama}*
• Paket       : *${item.kategori}*
• Jadwal      : Sabtu, 14 November 2026 (08.00 - 11.30 WIB)
• Platform    : Zoom Meeting Pro
----------------------------------------

Grup WhatsApp Resmi Peserta:
Silakan bergabung ke tautan grup di bawah ini:
https://chat.whatsapp.com/GrupPesertaWebinarDignity2026

Pengingat Rebate: Tiket Rp 100.000 Kakak berlaku penuh sebagai voucher potongan ke Bootcamp Offline 2 Hari di Sala View Hotel Solo (12-13 Des 2026)!

Sampai jumpa di kelas virtual, Kak!`;

    return `https://wa.me/${item.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs">
      {/* Table Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 font-display">
              Manajemen Responden & Verifikasi Mutasi Bank
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
              {activeRegistrants.length} Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data tersinkronisasi otomatis dengan formulir pendaftaran LPK Indonesia Dignity
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, tiket..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-10 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-mono"
              >
                Clear
              </button>
            )}
          </div>

          {/* Segmented Filter Control */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/60">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({activeRegistrants.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Pending ({activeRegistrants.filter(r => r.statusBayar !== 'LUNAS').length})
            </button>
            <button
              onClick={() => setFilter('lunas')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'lunas'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Lunas ({activeRegistrants.filter(r => r.statusBayar === 'LUNAS').length})
            </button>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2">
            {hasGoogleToken && (
              <button
                onClick={onBatchSendTickets}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-[0.98]"
                title="Kirim E-Ticket via Gmail API ke semua peserta berstatus lunas"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Blast Tiket Gmail</span>
              </button>
            )}

            {hasGoogleToken && (
              <button
                onClick={onBackupToDrive}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Cadangkan database ke Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Drive</span>
              </button>
            )}

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Unduh berkas CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[960px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 w-[15%]">No. Tiket & Waktu</th>
              <th className="py-3 px-4 w-[22%]">Identitas Peserta</th>
              <th className="py-3 px-4 w-[18%]">Paket & Biaya</th>
              <th className="py-3 px-4 w-[18%]">Bank / Bukti</th>
              <th className="py-3 px-4 w-[11%] text-center">Status Bayar</th>
              <th className="py-3 px-4 w-[8%] text-center">Email</th>
              <th className="py-3 px-4 w-[8%] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                    <span className="text-xs">
                      {registrants.length === 0 
                        ? 'Belum ada data pendaftar untuk acara ini. Pendaftar baru dari formulir web atau tambah manual akan otomatis muncul di sini.'
                        : 'Tidak ada pendaftar yang sesuai dengan kata kunci pencarian.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const isLunas = item.statusBayar === 'LUNAS';
                const isEmailSent = item.statusEmailTicket === 'TERKIRIM';
                const isMabar = String(item.kategori || '').toLowerCase().includes('mabar') || item.nominal === 500000;
                const isIndividu = String(item.kategori || '').toLowerCase().includes('individu') || item.nominal === 100000;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Column 1: Ticket & Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenTicketPreview && onOpenTicketPreview(item)}
                        className="group/tkt flex items-center gap-1.5 text-left font-mono font-bold text-slate-900 hover:text-amber-600 text-xs tracking-wide transition cursor-pointer"
                        title="Klik untuk melihat E-Ticket Resmi Peserta"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-500 opacity-70 group-hover/tkt:opacity-100 transition shrink-0" />
                        <span className="group-hover/tkt:underline decoration-amber-500 underline-offset-2">
                          {item.nomorTicket}
                        </span>
                      </button>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatDate(item.timestamp)}
                      </div>
                    </td>

                    {/* Column 2: Participant Identity */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {item.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                        {item.instansi}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                        {item.email}
                      </div>
                    </td>

                    {/* Column 3: Package & Cost */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isMabar ? (
                          <button
                            type="button"
                            onClick={() => onOpenMembers && onOpenMembers(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition shadow-xs"
                            title="Klik untuk lihat 6 anggota rombongan MABAR (-A s/d -F)"
                          >
                            <Users className="w-3 h-3" />
                            <span>Mabar (6 Pax)</span>
                          </button>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                            isIndividu
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {isIndividu ? 'Individu' : 'Kustom'}
                          </span>
                        )}
                      </div>
                      <div 
                        onClick={() => onEditRegistrant && onEditRegistrant(item)}
                        className="font-mono font-bold text-slate-900 text-sm mt-1 cursor-pointer hover:text-amber-600 inline-flex items-center gap-1.5 transition-colors"
                        title="Klik untuk ubah nominal / paket pendaftar"
                      >
                        <span>{formatRupiah(item.nominal)}</span>
                        <Edit3 className="w-3 h-3 text-slate-400 hover:text-amber-600 opacity-60 transition-opacity" />
                      </div>
                    </td>

                    {/* Column 4: Bank & Transfer Proof */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700 text-xs truncate max-w-[180px]">
                        {item.bank}
                      </div>
                      {(() => {
                        const rawProof = item.buktiUrl || item.rawBukti || '';
                        const hasDriveOrHttp = Boolean(rawProof && rawProof.startsWith('http'));
                        const isNumericProof = Boolean(rawProof && (rawProof === '100000' || !isNaN(Number(rawProof))));

                        if (hasDriveOrHttp) {
                          return (
                            <button
                              onClick={() => onViewProof(item.buktiUrl, item.nama, item.rawBukti)}
                              className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-700 hover:text-amber-800 transition-colors font-medium underline underline-offset-2"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Bukti</span>
                            </button>
                          );
                        } else if (isNumericProof) {
                          return (
                            <button
                              onClick={() => onViewProof(rawProof, item.nama, item.rawBukti)}
                              className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-600 hover:text-amber-700 transition-colors font-medium"
                              title="Data tercatat '100000' (Klik untuk bantuan)"
                            >
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                              <span>Cek Bukti ({rawProof})</span>
                            </button>
                          );
                        } else if (rawProof) {
                          return (
                            <button
                              onClick={() => onViewProof(rawProof, item.nama, item.rawBukti)}
                              className="inline-flex items-center gap-1 mt-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors font-medium underline underline-offset-2"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat Bukti</span>
                            </button>
                          );
                        } else {
                          return (
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              Tanpa Bukti
                            </span>
                          );
                        }
                      })()}
                    </td>

                    {/* Column 5: Payment Status Toggle & Ledger */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenLedger && onOpenLedger(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            isLunas
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Buka Ledger & Riwayat Pembayaran 1:M"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          <span>{item.statusBayar}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenLedger && onOpenLedger(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition"
                          title="Buka Ledger & Riwayat Pembayaran 1:M"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Column 6: Email Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                        isEmailSent
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {isEmailSent ? 'TERKIRIM' : 'BELUM'}
                      </span>
                    </td>

                    {/* Column 7: Actions Toolbar */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isLunas ? (
                          <button
                            onClick={() => onVerifyPayment(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
                            title="Verifikasi Lunas & Kirim E-Ticket via Gmail API"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Lunas</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onResendTicket(item.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                            title="Kirim Ulang E-Ticket via Gmail API"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onEditRegistrant && onEditRegistrant(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                          title="Edit Rincian Pendaftar & Nominal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={getWhatsAppTicketUrl(item)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Chat WhatsApp CS"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => onDeleteRegistrant && onDeleteRegistrant(item.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                          title="Hapus Data Pendaftar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
