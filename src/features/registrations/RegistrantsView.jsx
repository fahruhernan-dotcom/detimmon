import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  HardDrive, 
  UserPlus, 
  Filter, 
  CreditCard, 
  ChevronRight, 
  Ticket,
  Users,
  Eye,
  Sparkles,
  Globe
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';

/**
 * RegistrantsView — Focused registration workspace
 * Per Phase 2: replaces the dense all-in-one table with a crisp, minimal table
 * where row click opens the universal right-side detail drawer.
 * Enhanced: Speed-Queue Fast Verification inline trigger.
 */
export default function RegistrantsView({
  registrants = [],
  onSelectParticipant,
  onOpenFastVerify,
  onOpenAdd,
  onExportCsv,
  onBackupToDrive,
  onOpenWebSettings,
  hasGoogleToken,
  initialFilter = 'all'
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [packageFilter, setPackageFilter] = useState('all');

  const filteredData = useMemo(() => {
    return registrants.filter((item) => {
      // Status filter
      if (statusFilter === 'pending' && item.statusBayar !== 'PENDING') return false;
      if (statusFilter === 'lunas' && item.statusBayar !== 'LUNAS') return false;
      if (statusFilter === 'rejected' && item.statusBayar !== 'DITOLAK' && item.statusBayar !== 'REJECTED') return false;

      // Package filter
      if (packageFilter === 'individu' && !item.kategori?.toLowerCase().includes('individu') && item.nominal !== 100000) return false;
      if (packageFilter === 'mabar' && !item.kategori?.toLowerCase().includes('mabar') && item.nominal !== 500000) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          (item.nomorTicket && item.nomorTicket.toLowerCase().includes(q)) ||
          (item.instansi && item.instansi.toLowerCase().includes(q)) ||
          (item.whatsapp && item.whatsapp.includes(q))
        );
      }
      return true;
    });
  }, [registrants, statusFilter, packageFilter, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── TOP ACTIONS & FILTER BAR ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor tiket, atau instansi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Badges & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({registrants.length})
            </button>
            <button
              onClick={() => setStatusFilter('lunas')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'lunas' ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lunas ({registrants.filter(r => r.statusBayar === 'LUNAS').length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'pending' ? 'bg-white text-amber-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({registrants.filter(r => r.statusBayar === 'PENDING').length})
            </button>
          </div>

          {/* Mode Verifikasi Kilat (Speed Queue CTA) - Selalu Tampil */}
          {onOpenFastVerify && (
            <button
              onClick={() => onOpenFastVerify(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all duration-200 active:scale-[0.98]"
              title="Buka Mode Verifikasi Kilat: preview bukti & verifikasi beruntun 1-klik"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verifikasi Kilat {registrants.filter(r => r.statusBayar === 'PENDING').length > 0 ? `(${registrants.filter(r => r.statusBayar === 'PENDING').length} Pending)` : ''}</span>
            </button>
          )}

          {/* Quick link to Web Form Settings */}
          {onOpenWebSettings && (
            <button
              onClick={onOpenWebSettings}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs transition-colors"
              title="Pengaturan Formulir Web Pendaftaran Mandiri"
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Pengaturan Form Web</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Backup to Drive */}
          <button
            onClick={onBackupToDrive}
            disabled={!hasGoogleToken}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors disabled:opacity-40"
            title={hasGoogleToken ? "Backup ke Google Drive" : "Login OAuth dibutuhkan untuk Backup Drive"}
          >
            <HardDrive className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Backup Drive</span>
          </button>
        </div>
      </div>

      {/* ── CLEAN PARTICIPANT TABLE ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Peserta</th>
                <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Instansi & Domisili</th>
                <th className="py-3.5 px-4 font-semibold">Paket / Tarif</th>
                <th className="py-3.5 px-4 font-semibold">Status Bayar</th>
                <th className="py-3.5 px-4 font-semibold">Bukti Bayar</th>
                <th className="py-3.5 px-4 font-semibold hidden sm:table-cell">E-Ticket</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data pendaftar yang sesuai filter atau pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isLunas = item.statusBayar === 'LUNAS';
                  const isPending = item.statusBayar === 'PENDING';
                  const isMabar = (item.kategori || '').toLowerCase().includes('mabar') || (item.nominal === 500000);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectParticipant(item)}
                      className="hover:bg-amber-500/5 transition-colors cursor-pointer group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-950 group-hover:text-amber-800 transition-colors">
                          {item.nama}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {item.email}
                        </div>
                      </td>

                      {/* Instansi & Domisili */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="text-slate-800 font-medium truncate max-w-[180px]">
                          {item.instansi || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.domisili || item.kota || 'Surakarta'}
                        </div>
                      </td>

                      {/* Paket / Nominal */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {formatRupiah(item.nominal || 0)}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-1 flex-wrap mt-0.5">
                          {isMabar ? (
                            <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                              <Users className="w-3 h-3" /> MABAR (6 Pax)
                            </span>
                          ) : (
                            <span>Individu</span>
                          )}
                          {/* Badge Voucher Rebate */}
                          {(item.kategori || '').toLowerCase().includes('rebate') || (item.nomorTicket || '').toLowerCase().includes('voucher') ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] uppercase tracking-wide">
                              🏷️ Rebate
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Status Bayar */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                          isLunas 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPending
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {item.statusBayar}
                        </span>
                      </td>

                      {/* Bukti Transfer / Pratinjau Cepat */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenFastVerify) onOpenFastVerify(item.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            isPending 
                              ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold shadow-2xs' 
                              : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs'
                          }`}
                          title="Pratinjau bukti transfer & mode verifikasi kilat"
                        >
                          <Eye className={`w-3.5 h-3.5 ${isPending ? 'text-amber-700' : 'text-slate-500'}`} />
                          <span>{isPending ? 'Cek & Verif' : 'Lihat Bukti'}</span>
                        </button>
                      </td>

                      {/* E-Ticket */}
                      <td className="py-3.5 px-4 hidden sm:table-cell font-mono text-[11px]">
                        <div className="text-slate-700">{item.nomorTicket || '-'}</div>
                        <div className={`text-[10px] ${item.statusEmailTicket === 'TERKIRIM' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {item.statusEmailTicket === 'TERKIRIM' ? '✓ Terkirim' : 'Belum kirim'}
                        </div>
                      </td>

                      {/* Chevron Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-amber-700 transition-colors text-xs font-medium">
                          <span className="hidden lg:inline">Detail</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredData.length}</strong> dari <strong>{registrants.length}</strong> peserta</span>
          <span className="text-[11px] text-slate-400">Klik baris peserta untuk membuka panel detail di sebelah kanan</span>
        </div>
      </div>

    </div>
  );
}
