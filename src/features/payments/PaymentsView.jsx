import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Filter, 
  Search, 
  AlertCircle, 
  Clock, 
  Check, 
  ChevronRight, 
  FileCheck2, 
  Receipt,
  FileQuestion,
  Sparkles
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';

/**
 * PaymentsView — Payment verification workspace
 * Strictly implements PHASE_03_UI_UX_PAYMENTS.md:
 * - Default tab: Pending
 * - Inline proof thumbnail & quick verify
 * - Speed-Queue Fast Verification Modal integration
 * - Rejection dialog with required reason category
 * - Deep ledger access
 */
export default function PaymentsView({
  registrants = [],
  onSelectParticipant,
  onOpenFastVerify,
  onVerifyPayment,
  onRejectPaymentWithReason,
  onViewProof,
  onOpenLedger,
  initialTab = 'pending'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [proofFilter, setProofFilter] = useState('all');

  // Rejection Dialog State
  const [rejectingParticipant, setRejectingParticipant] = useState(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState('Bukti Buram / Tidak Terbaca');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // Counts for tabs
  const pendingCount = registrants.filter(r => r.statusBayar === 'PENDING').length;
  const verifiedCount = registrants.filter(r => r.statusBayar === 'LUNAS').length;
  const rejectedCount = registrants.filter(r => r.statusBayar === 'DITOLAK' || r.statusBayar === 'REJECTED').length;

  const filteredData = useMemo(() => {
    return registrants.filter((item) => {
      // Tab filter
      if (activeTab === 'pending' && item.statusBayar !== 'PENDING') return false;
      if (activeTab === 'verified' && item.statusBayar !== 'LUNAS') return false;
      if (activeTab === 'rejected' && item.statusBayar !== 'DITOLAK' && item.statusBayar !== 'REJECTED') return false;

      // Package filter
      if (packageFilter === 'individu' && !item.kategori?.toLowerCase().includes('individu') && item.nominal !== 100000) return false;
      if (packageFilter === 'mabar' && !item.kategori?.toLowerCase().includes('mabar') && item.nominal !== 500000) return false;

      // Proof filter
      if (proofFilter === 'has_proof' && !item.buktiBayar) return false;
      if (proofFilter === 'no_proof' && Boolean(item.buktiBayar)) return false;

      // Search query
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
  }, [registrants, activeTab, packageFilter, proofFilter, search]);

  const handleConfirmReject = () => {
    if (!rejectingParticipant) return;
    const fullReason = rejectCustomNote.trim() 
      ? `${rejectReasonCategory}: ${rejectCustomNote.trim()}`
      : rejectReasonCategory;

    if (onRejectPaymentWithReason) {
      onRejectPaymentWithReason(rejectingParticipant.id, fullReason);
    }
    setRejectingParticipant(null);
    setRejectCustomNote('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── TOP CONTROL & TAB BAR ───────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'pending' 
                  ? 'bg-white text-amber-900 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Menunggu Verifikasi (Pending)</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'verified' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Lunas Terverifikasi ({verifiedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'rejected' 
                  ? 'bg-white text-rose-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ditolak ({rejectedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'all' 
                  ? 'bg-white text-slate-950 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({registrants.length})
            </button>
          </div>

          {/* Mode Verifikasi Kilat CTA */}
          {pendingCount > 0 && onOpenFastVerify && (
            <button
              onClick={() => onOpenFastVerify(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-[0.98]"
              title="Buka Mode Verifikasi Kilat (Speed Queue) untuk semua transaksi pending"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verifikasi Kilat ({pendingCount})</span>
            </button>
          )}

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pembayar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* ── PAYMENT TRANSACTIONS TABLE ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Pendaftar & Paket</th>
                <th className="py-3.5 px-4 font-semibold">Nominal Pembayaran</th>
                <th className="py-3.5 px-4 font-semibold">Status Bukti</th>
                <th className="py-3.5 px-4 font-semibold hidden md:table-cell">Waktu Submit</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Tindakan Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
                      <div className="font-semibold text-slate-600">Semua tugas di tab ini selesai!</div>
                      <div className="text-[11px] text-slate-400">Tidak ada pendaftaran yang perlu diverifikasi pada filter ini.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isLunas = item.statusBayar === 'LUNAS';
                  const isPending = item.statusBayar === 'PENDING';
                  const isRejected = item.statusBayar === 'DITOLAK' || item.statusBayar === 'REJECTED';
                  const hasProof = Boolean(item.buktiBayar);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-500/5 transition-colors group"
                    >
                      {/* Name & Package */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => onSelectParticipant(item)}
                      >
                        <div className="font-semibold text-slate-950 group-hover:text-amber-800 transition-colors">
                          {item.nama}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.kategori || 'Tiket Individu'}
                        </div>
                      </td>

                      {/* Nominal */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => onSelectParticipant(item)}
                      >
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatRupiah(item.nominal || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.bank || 'Transfer Bank'}
                        </div>
                      </td>

                      {/* Proof Status */}
                      <td className="py-3.5 px-4">
                        {hasProof ? (
                          <button
                            onClick={() => {
                              if (isPending && onOpenFastVerify) {
                                onOpenFastVerify(item.id);
                              } else {
                                onViewProof(item.buktiBayar, item.nama, item.rawBuktiBayar || item.buktiBayar);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                              isPending
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                                : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800'
                            }`}
                            title={isPending ? "Pratinjau Bukti & Verifikasi Kilat" : "Lihat Bukti Transfer"}
                          >
                            <Eye className="w-3 h-3 text-current" />
                            <span>{isPending ? "Cek & Verif" : "Lihat Bukti"}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                            <FileQuestion className="w-3 h-3" />
                            <span>Belum Ada</span>
                          </span>
                        )}
                      </td>

                      {/* Waktu Submit */}
                      <td 
                        className="py-3.5 px-4 hidden md:table-cell text-[11px] text-slate-500 cursor-pointer"
                        onClick={() => onSelectParticipant(item)}
                      >
                        {item.timestamp ? formatDate(item.timestamp) : '14 Nov 2026'}
                      </td>

                      {/* Status Badge */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => onSelectParticipant(item)}
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider font-mono border ${
                          isLunas 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPending
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {item.statusBayar}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => onVerifyPayment(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors"
                                title="Verifikasi LUNAS & Terbitkan Tiket"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verifikasi</span>
                              </button>

                              <button
                                onClick={() => setRejectingParticipant(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors"
                                title="Tolak Pembayaran dengan Alasan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          {onOpenLedger && (
                            <button
                              onClick={() => onOpenLedger(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Buka Buku Kas (Ledger)"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectParticipant(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-slate-100 transition-colors"
                            title="Buka Detail"
                          >
                            <ChevronRight className="w-4 h-4" />
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

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredData.length}</strong> transaksi di tab <strong>{activeTab.toUpperCase()}</strong></span>
          <span className="text-[11px] text-slate-400">Verifikasi pembayaran akan otomatis menyiapkan nomor tiket peserta</span>
        </div>
      </div>

      {/* ── REJECTION DIALOG (REQUIRED CATEGORY) ─────────────── */}
      {rejectingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tolak Bukti Pembayaran</h3>
                <p className="text-xs text-slate-500">Peserta: {rejectingParticipant.nama}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Kategori Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectReasonCategory}
                  onChange={(e) => setRejectReasonCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 text-xs font-medium"
                >
                  <option value="Bukti Buram / Tidak Terbaca">Bukti Buram / Tidak Terbaca</option>
                  <option value="Salah Nominal (Kurang/Lebih)">Salah Nominal (Kurang/Lebih)</option>
                  <option value="Salah Rekening Tujuan">Salah Rekening Tujuan</option>
                  <option value="Duplikasi Pembayaran">Duplikasi Pembayaran</option>
                  <option value="Transaksi Dibatalkan Bank">Transaksi Dibatalkan Bank</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  Catatan Tambahan untuk Admin (Opsional)
                </label>
                <textarea
                  value={rejectCustomNote}
                  onChange={(e) => setRejectCustomNote(e.target.value)}
                  placeholder="Contoh: Transfer tercatat Rp 50.000 padahal tiket individu Rp 100.000..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectingParticipant(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Tolak Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
