import React, { useState, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Eye, 
  FileCheck2,
  Clock,
  ShieldCheck,
  Receipt,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { registrationService } from '../../services/registrationService';
import { paymentAccountService } from '../../services/paymentAccountService';
import { formatRupiah, formatDate } from '../../utils/formatters';

export default function PaymentLedgerModal({
  isOpen,
  onClose,
  registrant,
  onViewProof,
  onPaymentUpdated
}) {
  if (!isOpen || !registrant) return null;

  const [ledger, setLedger] = useState(null);
  const [payments, setPayments] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Add Payment / Cicilan
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('BANK_TRANSFER');
  const [newBank, setNewBank] = useState('');
  const [newProofId, setNewProofId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // State for Adjustments
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjType, setAdjType] = useState('DISCOUNT');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const regId = registrant.supabaseRegistrationId || registrant.id;

  useEffect(() => {
    loadLedgerData();
  }, [regId]);

  async function loadLedgerData() {
    setLoading(true);
    setErrorMsg('');
    try {
      // Load active bank accounts dynamically (no hardcoded accounts)
      const accounts = await paymentAccountService.getActiveAccounts(registrant.eventId || null);
      setActiveAccounts(accounts);
      if (accounts.length > 0 && !newBank) {
        setNewBank(accounts[0].account_name || accounts[0].bank_name);
      }

      if (registrant.supabaseRegistrationId) {
        const [ledgerData, paymentsData, adjustmentsData] = await Promise.all([
          paymentService.getRegistrationLedger(registrant.supabaseRegistrationId),
          paymentService.getPayments(registrant.supabaseRegistrationId),
          paymentService.getAdjustments(registrant.supabaseRegistrationId)
        ]);
        setLedger(ledgerData);
        setPayments(paymentsData || []);
        setAdjustments(adjustmentsData || []);
      } else {
        // Fallback for local / sheet items
        const isLunas = registrant.statusBayar === 'LUNAS';
        const totalDue = registrant.nominal || 100000;
        const totalPaid = isLunas ? totalDue : 0;
        setLedger({
          total_due: totalDue,
          total_paid: totalPaid,
          balance_due: totalDue - totalPaid,
          registration_status: registrant.statusBayar
        });
        setPayments([
          {
            id: 'mock-pmt-1',
            amount: totalDue,
            status: isLunas ? 'VERIFIED' : 'PENDING',
            bank_destination: registrant.bank || 'Transfer Bank',
            proof_drive_file_id: registrant.buktiUrl || registrant.rawBukti || '',
            submitted_at: registrant.timestamp
          }
        ]);
        setAdjustments([]);
      }
    } catch (err) {
      console.warn('Notice loading ledger from Supabase:', err);
      // Fallback
      const isLunas = registrant.statusBayar === 'LUNAS';
      const totalDue = registrant.nominal || 100000;
      setLedger({
        total_due: totalDue,
        total_paid: isLunas ? totalDue : 0,
        balance_due: isLunas ? 0 : totalDue,
        registration_status: registrant.statusBayar
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(paymentId) {
    setActionLoading(true);
    try {
      if (registrant.supabaseRegistrationId && !paymentId.startsWith('mock-')) {
        await paymentService.verifyPayment(paymentId, 'Diverifikasi manual oleh Finance');
        await registrationService.updateRegistrationStatus(registrant.supabaseRegistrationId, 'PAID');
      }
      onPaymentUpdated?.(registrant.id, 'LUNAS');
      await loadLedgerData();
    } catch (err) {
      setErrorMsg(`Gagal verifikasi pembayaran: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(paymentId) {
    const reason = prompt('Masukkan alasan penolakan bukti transfer:', 'Bukti transfer tidak terbaca / tidak sesuai mutasi');
    if (!reason) return;

    setActionLoading(true);
    try {
      if (registrant.supabaseRegistrationId && !paymentId.startsWith('mock-')) {
        await paymentService.rejectPayment(paymentId, reason);
        await registrationService.updateRegistrationStatus(registrant.supabaseRegistrationId, 'PENDING_PAYMENT');
      }
      onPaymentUpdated?.(registrant.id, 'PENDING');
      await loadLedgerData();
    } catch (err) {
      setErrorMsg(`Gagal menolak pembayaran: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih dari 0');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      if (registrant.supabaseRegistrationId) {
        await paymentService.addPayment({
          registrationId: registrant.supabaseRegistrationId,
          amount: Number(newAmount),
          paymentMethod: newMethod,
          bankDestination: newBank || (activeAccounts[0]?.account_name || 'Bank Transfer'),
          proofDriveFileId: newProofId || null,
          notes: newNotes || 'Pembayaran cicilan / termin via Admin',
          status: 'PENDING'
        });
      } else {
        setPayments(prev => [
          ...prev,
          {
            id: `mock-pmt-${Date.now()}`,
            amount: Number(newAmount),
            status: 'PENDING',
            bank_destination: newBank || 'Transfer Bank',
            proof_drive_file_id: newProofId,
            notes: newNotes,
            submitted_at: new Date().toISOString()
          }
        ]);
      }

      setIsAddingPayment(false);
      setNewAmount('');
      setNewProofId('');
      setNewNotes('');
      await loadLedgerData();
      onPaymentUpdated?.(registrant.id);
    } catch (err) {
      setErrorMsg(`Gagal menambahkan pembayaran: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddAdjustment(e) {
    e.preventDefault();
    if (!adjAmount || !adjReason) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      if (registrant.supabaseRegistrationId) {
        await paymentService.addAdjustment({
          registrationId: registrant.supabaseRegistrationId,
          amount: parseInt(adjAmount, 10),
          adjustmentType: adjType,
          reason: adjReason
        });
      } else {
        setAdjustments(prev => [
          ...prev,
          {
            id: `mock-adj-${Date.now()}`,
            amount: parseInt(adjAmount, 10),
            adjustment_type: adjType,
            reason: adjReason,
            created_at: new Date().toISOString()
          }
        ]);
      }
      setIsAdjusting(false);
      setAdjAmount('');
      setAdjReason('');
      await loadLedgerData();
      onPaymentUpdated?.(registrant.id);
    } catch (err) {
      setErrorMsg(`Gagal menambah penyesuaian: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Calculated ledger figures (authoritative, never manually edited)
  const totalDue = ledger?.total_due ?? registrant.nominal ?? 100000;
  
  // Total paid is derived from verified payments + adjustments (discounts reduce balance due)
  const verifiedPaymentsTotal = payments
    .filter(p => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const adjustmentsNet = adjustments.reduce((sum, a) => {
    const amt = Number(a.amount || 0);
    if (a.adjustment_type === 'DISCOUNT' || a.adjustment_type === 'REFUND') {
      return sum + amt;
    } else if (a.adjustment_type === 'SURCHARGE') {
      return sum - amt;
    }
    return sum + amt;
  }, 0);

  const totalPaid = ledger?.total_paid ?? (verifiedPaymentsTotal + (adjustmentsNet > 0 ? adjustmentsNet : 0));
  const balanceDue = ledger?.balance_due ?? Math.max(0, totalDue - totalPaid);
  const isSettled = balanceDue <= 0 && totalPaid > 0;
  const isPartial = totalPaid > 0 && balanceDue > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Ledger Finansial &amp; Riwayat Pembayaran (1:M)
              </h3>
              <p className="text-[11px] text-slate-500">
                {registrant.nomorTicket || 'NO-TICKET'} • {registrant.nama}
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ledger Summary Cards (Computed, Read-Only) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Tagihan
              </span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-1">
                {formatRupiah(totalDue)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Paket: {registrant.kategori?.split(':')[0] || 'Individu'}
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isSettled 
                ? 'bg-emerald-50/60 border-emerald-200' 
                : isPartial
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10.5px] font-bold uppercase tracking-wider block ${
                isSettled ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-500'
              }`}>
                Total Terbayar
              </span>
              <span className={`text-base font-bold font-mono block mt-1 ${
                isSettled ? 'text-emerald-900' : isPartial ? 'text-amber-900' : 'text-slate-900'
              }`}>
                {formatRupiah(totalPaid)}
              </span>
              <span className={`text-[10px] block mt-0.5 font-semibold ${
                isSettled ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-slate-400'
              }`}>
                {isSettled ? '✓ LUNAS LENGKAP' : isPartial ? 'Cicilan / Sebagian' : 'Belum Ada Pembayaran'}
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isSettled 
                ? 'bg-slate-50 border-slate-200' 
                : 'bg-rose-50/60 border-rose-200'
            }`}>
              <span className={`text-[10.5px] font-bold uppercase tracking-wider block ${
                isSettled ? 'text-slate-500' : 'text-rose-800'
              }`}>
                Sisa Saldo (Due)
              </span>
              <span className={`text-base font-bold font-mono block mt-1 ${
                isSettled ? 'text-slate-600' : 'text-rose-900'
              }`}>
                {formatRupiah(balanceDue > 0 ? balanceDue : 0)}
              </span>
              <span className={`text-[10px] block mt-0.5 font-semibold ${
                isSettled ? 'text-emerald-600' : 'text-rose-700'
              }`}>
                {isSettled ? 'Nihil (0)' : 'Menunggu Pelunasan'}
              </span>
            </div>
          </div>

          {/* Action Header: Add Payment / Add Adjustment */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-slate-500" />
              Transaksi Pembayaran (1:M)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingPayment(!isAddingPayment);
                  setIsAdjusting(false);
                }}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAddingPayment ? 'Tutup Form' : '+ Catat Cicilan / DP'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdjusting(!isAdjusting);
                  setIsAddingPayment(false);
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAdjusting ? 'Tutup Form' : 'Penyesuaian Saldo'}
              </button>
            </div>
          </div>

          {/* Collapsible Form: Add Payment (Installment / Partial) */}
          {isAddingPayment && (
            <form onSubmit={handleAddPayment} className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  Catat Pembayaran Masuk Baru (Cicilan / Termin / DP)
                </span>
                <span className="text-[10px] text-amber-700">Tersimpan ke Ledger</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder={`Contoh: ${balanceDue > 0 ? balanceDue : 50000}`}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Metode Pembayaran:</label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="QRIS">QRIS</option>
                    <option value="MANUAL_CASH">Tunai / Manual Cash</option>
                    <option value="WAIVED">Dibebaskan (Waived)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rekening / Saluran Tujuan:</label>
                  {activeAccounts.length > 0 ? (
                    <select
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    >
                      {activeAccounts.map(acc => (
                        <option key={acc.id} value={`${acc.bank_name} - ${acc.account_number}`}>
                          {acc.bank_name} ({acc.account_number} a.n {acc.account_holder})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      placeholder="Contoh: Bank Transfer / Tunai"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ID File Bukti Drive (Opsional):</label>
                  <input
                    type="text"
                    value={newProofId}
                    onChange={(e) => setNewProofId(e.target.value)}
                    placeholder="Link Drive / File ID"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Contoh: DP Termin 1 via Rekening Operasional"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingPayment(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          )}

          {/* Collapsible Form: Adjusting Finance (Discount, Extra Fee, Refund) */}
          {isAdjusting && (
            <form onSubmit={handleAddAdjustment} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Penyesuaian Saldo Finance (Diskon / Refund / Biaya Tambahan)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jenis Penyesuaian:</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  >
                    <option value="DISCOUNT">Diskon Khusus (Mengurangi Tagihan)</option>
                    <option value="SURCHARGE">Biaya Tambahan (Menambah Tagihan)</option>
                    <option value="REFUND">Refund (Pengembalian Dana)</option>
                    <option value="MANUAL_CORRECTION">Koreksi Manual Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal (Rp):</label>
                  <input
                    type="number"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Penyesuaian (Audit Log):</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Contoh: Potongan khusus alumni MSC Batch 1"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdjusting(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs"
                >
                  Terapkan Penyesuaian
                </button>
              </div>
            </form>
          )}

          {/* List of Adjustments (if any) */}
          {adjustments.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Histori Penyesuaian Saldo ({adjustments.length})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                {adjustments.map((adj, idx) => (
                  <div key={adj.id || idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{adj.reason}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          adj.adjustment_type === 'DISCOUNT'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : adj.adjustment_type === 'REFUND'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {adj.adjustment_type}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {adj.created_at ? formatDate(adj.created_at) : 'Koreksi Finance'}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      {adj.adjustment_type === 'DISCOUNT' ? '-' : '+'} {formatRupiah(adj.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Table / List (1:M) */}
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
              Memuat data ledger pembayaran...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
              Belum ada bukti pembayaran yang masuk untuk pendaftaran ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {payments.map((pmt, idx) => {
                const isPmtVerified = pmt.status === 'VERIFIED';
                const isPmtRejected = pmt.status === 'REJECTED';
                const proofRef = pmt.proof_drive_file_id || registrant.buktiUrl || registrant.rawBukti;

                return (
                  <div key={pmt.id || idx} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formatRupiah(pmt.amount || totalDue)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isPmtVerified 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPmtRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {pmt.status || 'PENDING'}
                        </span>
                        {pmt.notes && (
                          <span className="text-[11px] text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded-md">
                            {pmt.notes}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Saluran: <strong>{pmt.bank_destination || registrant.bank || 'Transfer'}</strong></span>
                        <span>•</span>
                        <span>Waktu: {pmt.submitted_at ? formatDate(pmt.submitted_at) : 'Sesuai formulir'}</span>
                        
                        {/* Verifier Audit Trail */}
                        {isPmtVerified && pmt.verified_at && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Diverifikasi: {formatDate(pmt.verified_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {proofRef && (
                        <button
                          type="button"
                          onClick={() => onViewProof(proofRef, registrant.nama, proofRef)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti</span>
                        </button>
                      )}

                      {!isPmtVerified && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleVerify(pmt.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verifikasi</span>
                        </button>
                      )}

                      {!isPmtRejected && !isPmtVerified && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleReject(pmt.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Audit Ledger: Seluruh perubahan diverifikasi dan tercatat dalam sistem audit
          </div>
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
