import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Send, 
  Eye, 
  Edit3, 
  FileText, 
  Copy, 
  Check, 
  Ticket, 
  Award, 
  Users,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { formatRupiah, formatDate } from '../utils/formatters';

/**
 * ParticipantDetailDrawer — Universal right-side detail drawer adhering strictly to DRAWER_ANATOMY.md
 * Desktop: 420px, Mobile: full-width
 * Sections:
 * 1. Identity
 * 2. Status Timeline
 * 3. Context-Sensitive Quick Actions
 * 4. Related Records
 * 5. Internal Admin Notes
 */
export default function ParticipantDetailDrawer({
  isOpen,
  onClose,
  participant,
  onVerifyPayment,
  onRejectPayment,
  onResendTicket,
  onOpenTicketPreview,
  onOpenLedger,
  onOpenMembers,
  onEditParticipant,
  onViewProof,
  onUpdateNotes,
  onOpenProfile360,
  onSoftDelete,
  onRestore,
  hasGoogleToken
}) {
  const [internalNote, setInternalNote] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (participant) {
      setInternalNote(participant.adminNotes || participant.catatan || '');
    }
  }, [participant]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !participant) return null;

  const handleCopyTicket = () => {
    if (participant.nomorTicket) {
      navigator.clipboard.writeText(participant.nomorTicket);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveNotes = () => {
    setIsSavingNote(true);
    if (onUpdateNotes) {
      onUpdateNotes(participant.id, internalNote);
    }
    setTimeout(() => setIsSavingNote(false), 600);
  };

  const isLunas = participant.statusBayar === 'LUNAS';
  const isPending = participant.statusBayar === 'PENDING';
  const isRejected = participant.statusBayar === 'DITOLAK' || participant.statusBayar === 'REJECTED';
  const isTicketSent = participant.statusEmailTicket === 'TERKIRIM';
  const isMabar = (participant.kategori || '').toLowerCase().includes('mabar') || 
                  (participant.nominal === 500000);

  const cleanPhone = (participant.whatsapp || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden animate-fade-in">
      {/* Semi-transparent Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel (420px on desktop, full width on mobile) */}
      <aside 
        className="relative z-10 w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slide-left"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail Peserta: ${participant.nama}`}
      >
        {/* Drawer Header */}
        <div className="shrink-0 p-5 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-base font-bold text-slate-950 truncate tracking-tight">
                  {participant.nama}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider font-mono border ${
                  isLunas 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : isRejected
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {isLunas ? 'LUNAS' : isRejected ? 'DITOLAK' : 'PENDING'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>{participant.nomorTicket || 'NO-TICKET'}</span>
                {participant.nomorTicket && (
                  <button 
                    onClick={handleCopyTicket}
                    className="p-1 hover:text-slate-800 text-slate-400 transition-colors"
                    title="Salin Nomor Tiket"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Tutup Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Deep Action Bar */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                if (onEditParticipant) onEditParticipant(participant);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-amber-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Buka Edit Data Lengkap</span>
            </button>

            {isMabar && onOpenMembers && (
              <button
                onClick={() => onOpenMembers(participant)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Lihat Anggota MABAR</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-700">
          
          {/* Status Tempat Sampah / Soft Deleted Banner */}
          {participant.isDeleted && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Peserta ini berada di <strong>Tempat Sampah</strong></span>
              </div>
              {onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(participant.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Pulihkan</span>
                </button>
              )}
            </div>
          )}

          {/* ── SECTION 1: IDENTITY ─────────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Identitas Peserta</span>
            </h3>
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <a 
                  href={`mailto:${participant.email}`}
                  className="font-medium text-slate-900 hover:text-amber-700 hover:underline truncate max-w-[200px]"
                >
                  {participant.email || '-'}
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp
                </span>
                <a 
                  href={whatsappUrl}
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>{participant.whatsapp || '-'}</span>
                  <ExternalLink className="w-3 h-3 text-emerald-500" />
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Instansi / Kampus
                </span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">
                  {participant.instansi || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Kota Domisili
                </span>
                <span className="font-medium text-slate-800">
                  {participant.domisili || participant.kota || 'Surakarta'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Paket & Tarif
                </span>
                <span className="font-bold text-slate-950 font-mono">
                  {formatRupiah(participant.nominal || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Terdaftar
                </span>
                <span>{participant.timestamp ? formatDate(participant.timestamp) : '14 Nov 2026'}</span>
              </div>
            </div>

            {onOpenProfile360 && (
              <button
                onClick={() => onOpenProfile360(participant)}
                className="w-full mt-2.5 py-2 px-3 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 font-bold text-xs flex items-center justify-between transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Buka Profil Peserta 360</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </section>

          {/* ── SECTION 2: STATUS TIMELINE ──────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Status Timeline</span>
            </h3>
            <div className="relative pl-5 space-y-4 border-l-2 border-slate-200 ml-2 py-1 text-xs">
              
              {/* Step 1: Registered */}
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                <div className="font-semibold text-slate-900">Registrasi Diterima</div>
                <div className="text-[11px] text-slate-500">
                  {participant.timestamp ? formatDate(participant.timestamp) : 'Terdaftar via sistem'}
                </div>
              </div>

              {/* Step 2: Proof Submission */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  participant.buktiBayar ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="font-semibold text-slate-900">
                  {participant.buktiBayar ? 'Bukti Bayar Diunggah' : 'Menunggu Bukti Transfer'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {participant.buktiBayar ? 'Tersedia di Google Drive / Cloud' : 'Belum ada bukti yang dilampirkan'}
                </div>
              </div>

              {/* Step 3: Payment Verification */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  isLunas ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-400'
                }`} />
                <div className="font-semibold text-slate-900">
                  {isLunas ? 'Pembayaran Diverifikasi (LUNAS)' : isRejected ? 'Pembayaran Ditolak' : 'Menunggu Verifikasi Pembayaran'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isLunas 
                    ? 'Diverifikasi Finance / Admin' 
                    : isRejected
                    ? `Alasan: ${participant.rejectionReason || 'Bukti bayar tidak valid'}`
                    : 'Butuh review bukti bayar'
                  }
                </div>
              </div>

              {/* Step 4: Ticket Delivery */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  isTicketSent ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="font-semibold text-slate-900">
                  {isTicketSent ? 'E-Ticket Terkirim' : 'E-Ticket Belum Terkirim'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isTicketSent ? 'Terkirim via Gmail API / Blast' : isLunas ? 'Siap dikirim ke peserta' : 'Menunggu status lunas'}
                </div>
              </div>

              {/* Step 5: Certificate */}
              <div className="relative">
                <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  participant.statusSertifikat === 'SELESAI' ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="font-semibold text-slate-900">
                  {participant.statusSertifikat === 'SELESAI' ? 'E-Sertifikat Diterbitkan' : 'E-Sertifikat Pasca-Event'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {participant.statusSertifikat === 'SELESAI' ? 'Telah dikirim & diarsip di Drive' : 'Diterbitkan setelah presensi webinar'}
                </div>
              </div>

            </div>
          </section>

          {/* ── SECTION 3: QUICK ACTIONS ────────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Tindakan Cepat (Quick Actions)</span>
            </h3>
            <div className="space-y-2">
              {/* Payment Verification / Rejection (if pending) */}
              {isPending && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onVerifyPayment && onVerifyPayment(participant.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi LUNAS</span>
                  </button>
                  <button
                    onClick={() => onRejectPayment && onRejectPayment(participant)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Bukti</span>
                  </button>
                </div>
              )}

              {/* Send / Resend Ticket */}
              {isLunas && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onResendTicket && onResendTicket(participant.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTicketSent ? 'Kirim Ulang Tiket' : 'Kirim E-Ticket (Gmail)'}</span>
                  </button>

                  <button
                    onClick={() => onOpenTicketPreview && onOpenTicketPreview(participant)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5 text-slate-500" />
                    <span>Preview Tiket QR</span>
                  </button>
                </div>
              )}

              {/* Payment Ledger / Installment */}
              {onOpenLedger && (
                <button
                  onClick={() => onOpenLedger(participant)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-medium text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>Buku Kas & Cicilan (Payment Ledger)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Buka &rarr;</span>
                </button>
              )}
            </div>
          </section>

          {/* ── SECTION 4: RELATED RECORDS ──────────────────── */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Arsip & Bukti Terkait</span>
            </h3>
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-3 text-xs">
              {/* Proof record */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Bukti Pembayaran</div>
                  <div className="text-[11px] text-slate-500">
                    {participant.buktiBayar ? 'File terlampir' : 'Tidak ada lampiran'}
                  </div>
                </div>
                {participant.buktiBayar ? (
                  <button
                    onClick={() => {
                      if (onViewProof) {
                        onViewProof(participant.buktiBayar, participant.nama, participant.rawBuktiBayar || participant.buktiBayar);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-amber-700 text-[11px] font-semibold shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Lihat Bukti</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Kosong</span>
                )}
              </div>

              {/* Ticket record */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">E-Ticket Dignity</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {participant.nomorTicket || '-'}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isTicketSent 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {isTicketSent ? 'TERKIRIM' : 'BELUM KIRIM'}
                </span>
              </div>
            </div>
          </section>

          {/* ── SECTION 5: INTERNAL ADMIN NOTES ─────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Catatan Internal Admin</span>
              </h3>
              <span className="text-[10px] text-slate-400">Tidak terlihat oleh peserta</span>
            </div>
            <div className="space-y-2">
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Tulis catatan operasional (misal: janji transfer sisa H-3, request meja khusus, dsb)..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white placeholder:text-slate-400 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isSavingNote ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                  <span>{isSavingNote ? 'Tersimpan!' : 'Simpan Catatan'}</span>
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Drawer Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {participant.isDeleted ? (
              onRestore && (
                <button
                  type="button"
                  onClick={() => onRestore(participant.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pulihkan Peserta</span>
                </button>
              )
            ) : (
              onSoftDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Pindahkan pendaftar "${participant.nama}" ke tempat sampah? Data dapat dipulihkan kapan saja.`)) {
                      onSoftDelete(participant.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Peserta</span>
                </button>
              )
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </aside>
    </div>
  );
}
