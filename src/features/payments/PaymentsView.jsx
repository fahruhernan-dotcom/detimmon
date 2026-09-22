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
import ProofModal from '../../components/ProofModal';
import PaymentLedgerModal from './PaymentLedgerModal';
import { registrationService } from '../../services/registrationService';
import { paymentService } from '../../services/paymentService';

/**
 * PaymentsView — Payment verification workspace (Autonomous & Self-Contained)
 * Handles its own ProofModal, PaymentLedgerModal, rejection modals, and quick verification.
 */
export default function PaymentsView({
  registrants = [],
  setRegistrants,
  onSelectParticipant,
  onOpenFastVerify,
  onVerifyPayment,
  onRejectPaymentWithReason,
  googleOAuthToken,
  setGoogleOAuthToken,
  config = {},
  initialTab = 'pending'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState('all');
  const [proofFilter, setProofFilter] = useState('all');

  // Co-located modals state
  const [activeProof, setActiveProof] = useState(null);
  const [activeLedgerRegistrant, setActiveLedgerRegistrant] = useState(null);

  // Rejection Dialog State
  const [rejectingParticipant, setRejectingParticipant] = useState(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState('Bukti Buram / Tidak Terbaca');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);

  const pendingCount = activeRegistrants.filter(r => r.statusBayar === 'PENDING').length;
  const verifiedCount = activeRegistrants.filter(r => r.statusBayar === 'LUNAS').length;
  const rejectedCount = activeRegistrants.filter(r => r.statusBayar === 'DITOLAK' || r.statusBayar === 'REJECTED').length;

  const filteredData = useMemo(() => {
    return activeRegistrants.filter((item) => {
      if (activeTab === 'pending' && item.statusBayar !== 'PENDING') return false;
      if (activeTab === 'verified' && item.statusBayar !== 'LUNAS') return false;
      if (activeTab === 'rejected' && item.statusBayar !== 'DITOLAK' && item.statusBayar !== 'REJECTED') return false;

      if (packageFilter === 'individu' && !item.kategori?.toLowerCase().includes('individu') && item.nominal !== 100000) return false;
      if (packageFilter === 'mabar' && !item.kategori?.toLowerCase().includes('mabar') && item.nominal !== 500000) return false;

      if (proofFilter === 'has_proof' && !item.buktiBayar && !item.buktiUrl) return false;
      if (proofFilter === 'no_proof' && Boolean(item.buktiBayar || item.buktiUrl)) return false;

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
  }, [activeRegistrants, activeTab, packageFilter, proofFilter, search]);

  const handleConfirmReject = () => {
    if (!rejectingParticipant) return;
    const fullReason = rejectCustomNote.trim() 
      ? `${rejectReasonCategory}: ${rejectCustomNote.trim()}`
      : rejectReasonCategory;

    if (onRejectPaymentWithReason) {
      onRejectPaymentWithReason(rejectingParticipant.id, fullReason);
    } else {
      // Fallback direct mutation
      if (setRegistrants) {
        setRegistrants(prev => prev.map(item => item.id === rejectingParticipant.id ? { ...item, statusBayar: 'DITOLAK', rejectionReason: fullReason } : item));
      }
      if (rejectingParticipant.supabasePaymentId) {
        paymentService.rejectPayment(rejectingParticipant.supabasePaymentId, fullReason).catch(console.warn);
      }
    }

    setRejectingParticipant(null);
    setRejectReasonCategory('Bukti Buram / Tidak Terbaca');
    setRejectCustomNote('');
  };

  const handleVerify = (id) => {
    if (onVerifyPayment) {
      onVerifyPayment(id);
    } else {
      if (setRegistrants) {
        setRegistrants(prev => prev.map(item => item.id === id ? { ...item, statusBayar: 'LUNAS' } : item));
      }
      const target = registrants.find(r => r.id === id);
      if (target?.supabasePaymentId) {
        paymentService.verifyPayment(target.supabasePaymentId, 'Diverifikasi via PaymentsView').catch(console.warn);
      }
      if (target?.supabaseRegistrationId) {
        registrationService.updateRegistrationStatus(target.supabaseRegistrationId, 'PAID').catch(console.warn);
      }
    }
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
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'verified' 
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Lunas Terverifikasi ({verifiedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rejected' 
                  ? 'bg-white text-rose-800 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ditolak ({rejectedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-white text-slate-950 shadow-2xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({activeRegistrants.length})
            </button>
          </div>

          {/* Mode Verifikasi Kilat CTA */}
          {pendingCount > 0 && onOpenFastVerify && (
            <button
              onClick={() => onOpenFastVerify(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
                  const hasProof = Boolean(item.buktiBayar || item.buktiUrl || item.rawBukti);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-500/5 transition-colors group"
                    >
                      {/* Name & Package */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => onSelectParticipant && onSelectParticipant(item)}
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
                        onClick={() => onSelectParticipant && onSelectParticipant(item)}
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
                            type="button"
                            onClick={() => {
                              setActiveProof({
                                url: item.buktiUrl || item.buktiBayar,
                                name: item.nama,
                                rawBukti: item.rawBukti || item.rawBuktiBayar || item.buktiUrl,
                                token: googleOAuthToken,
                                clientId: config.clientId
                              });
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                              isPending
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                                : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800'
                            }`}
                            title="Lihat Bukti Transfer"
                          >
                            <Eye className="w-3 h-3 text-current" />
                            <span>Lihat Bukti</span>
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
                        onClick={() => onSelectParticipant && onSelectParticipant(item)}
                      >
                        {item.timestamp ? formatDate(item.timestamp) : '14 Nov 2026'}
                      </td>

                      {/* Status Badge */}
                      <td 
                        className="py-3.5 px-4 cursor-pointer"
                        onClick={() => onSelectParticipant && onSelectParticipant(item)}
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
                                type="button"
                                onClick={() => handleVerify(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
                                title="Verifikasi LUNAS"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verifikasi</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setRejectingParticipant(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
                                title="Tolak Pembayaran dengan Alasan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveLedgerRegistrant(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Buka Buku Kas (Ledger)"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {onSelectParticipant && (
                            <button
                              type="button"
                              onClick={() => onSelectParticipant(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Buka Detail"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
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

      {/* ── CO-LOCATED MODALS ── */}
      <ProofModal
        isOpen={Boolean(activeProof)}
        onClose={() => setActiveProof(null)}
        proofData={activeProof}
        onAuthorizeSuccess={(newToken) => {
          if (setGoogleOAuthToken) setGoogleOAuthToken(newToken);
          setActiveProof(prev => prev ? { ...prev, token: newToken } : null);
        }}
      />

      <PaymentLedgerModal
        isOpen={Boolean(activeLedgerRegistrant)}
        onClose={() => setActiveLedgerRegistrant(null)}
        registrant={activeLedgerRegistrant}
        onViewProof={(url, name, rawBukti) => {
          setActiveProof({
            url,
            name,
            rawBukti,
            token: googleOAuthToken,
            clientId: config.clientId
          });
        }}
        onPaymentUpdated={async (id, newStatus) => {
          if (setRegistrants) {
            setRegistrants(prev => prev.map(r => r.id === id ? { ...r, statusBayar: newStatus } : r));
          }
          const target = registrants.find(r => r.id === id);
          if (target?.supabaseRegistrationId) {
            const dbStatus = newStatus === 'LUNAS' ? 'PAID' : 'PENDING_PAYMENT';
            await registrationService.updateRegistrationStatus(target.supabaseRegistrationId, dbStatus).catch(e => console.warn('Sync reg status err:', e));
          }
        }}
      />

      {/* ── REJECTION DIALOG ── */}
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
                type="button"
                onClick={() => setRejectingParticipant(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
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
