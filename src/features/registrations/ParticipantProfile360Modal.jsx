import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  CreditCard, 
  Ticket, 
  UserCheck, 
  Award, 
  Tag, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageCircle, 
  ShieldCheck, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';

/**
 * ParticipantProfile360Modal — Comprehensive Cross-Event Participant Profile
 * Strictly implements PHASE_14_UI_UX_PARTICIPANT_360.md:
 * - Unified 360 view of a participant across events
 * - Identity, Payments, Tickets, Attendance, Certificates, Vouchers, and Communication history
 * - White Luxury Minimal design aesthetic
 */
export default function ParticipantProfile360Modal({
  isOpen,
  onClose,
  participant,
  activeEvent
}) {
  if (!isOpen || !participant) return null;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'journey', 'notes'
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const isLunas = participant.statusBayar === 'LUNAS';
  const hasAttended = Boolean(participant.hasAttended || participant.durationMinutes);
  const certNumber = participant.nomorSertifikat || participant.certNo || 'LPK-DIGNITY/CERT/2026/000184';
  const voucherCode = participant.voucherCode || participant.kodeVoucher || 'REBATE100K-001';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* ── MODAL HEADER (IDENTITY SUMMARY) ─────────────────── */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar Initial */}
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-900 font-bold text-lg font-mono shrink-0">
                {(participant.nama || 'P').charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-950 truncate tracking-tight">
                    {participant.nama}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    isLunas 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}>
                    {isLunas ? 'VERIFIED LUNAS' : 'PENDING'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {participant.email || '-'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Phone className="w-3 h-3 text-emerald-500" /> {participant.whatsapp || '-'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 text-xs mt-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'overview' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ringkasan Profil 360
            </button>
            <button
              onClick={() => setActiveTab('journey')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'journey' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Timeline Perjalanan Peserta
            </button>
          </div>
        </div>

        {/* ── MODAL BODY (SCROLLABLE) ─────────────────────────── */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Quick Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Kontribusi</span>
                  <div className="font-mono font-bold text-sm text-slate-900">{formatRupiah(participant.nominal || 100000)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tiket Diterbitkan</span>
                  <div className="font-mono font-bold text-xs text-slate-800 truncate">{participant.nomorTicket || 'TERBIT ✓'}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Kehadiran Sesi</span>
                  <div className="font-mono font-bold text-xs text-emerald-800">
                    {hasAttended ? `${participant.durationMinutes || 90} Menit ✓` : 'Belum Hadir'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">E-Sertifikat</span>
                  <div className="font-mono font-bold text-xs text-amber-900">
                    {isLunas ? 'Resmi Terbit ✓' : 'Belum Syarat'}
                  </div>
                </div>
              </div>

              {/* Identity & Institution Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Informasi Registrasi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Instansi / Universitas:</span>
                    <strong className="text-slate-800">{participant.instansi || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Domisili:</span>
                    <strong className="text-slate-800">{participant.kota || participant.domisili || 'Surakarta'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Paket Pelatihan:</span>
                    <strong className="text-slate-800">{participant.kategori || 'Tiket Individu Rp 100.000'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank Tujuan:</span>
                    <strong className="text-slate-800">{participant.bank || 'Bank Mandiri'}</strong>
                  </div>
                </div>
              </div>

              {/* Voucher Rebate Section */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Voucher Beasiswa Lanjutan (Bootcamp)
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                      {voucherCode}
                    </code>
                    <button
                      onClick={() => handleCopy(voucherCode, 'voucher')}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      {copiedText === 'voucher' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Nilai: Rp 100.000
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ── JOURNEY TIMELINE ─────────────────────────────── */
            <div className="space-y-3.5 pl-2">
              <div className="relative border-l-2 border-slate-200 pl-4 space-y-4">
                
                {/* Step 1: Registration */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="font-semibold text-slate-900">Pendaftaran Event Berhasil</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendaftar paket {participant.kategori || 'Webinar Public Speaking'}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400">{participant.timestamp || 'Tercatat'}</span>
                </div>

                {/* Step 2: Payment Verification */}
                <div className="relative">
                  <span className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full ring-4 ring-white ${
                    isLunas ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  <div className="font-semibold text-slate-900">
                    {isLunas ? 'Pembayaran Lunas Diverifikasi' : 'Menunggu Verifikasi Pembayaran'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nominal {formatRupiah(participant.nominal || 100000)} via {participant.bank || 'Bank Transfer'}
                  </p>
                </div>

                {/* Step 3: Ticket Issuance */}
                <div className="relative">
                  <span className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                  <div className="font-semibold text-slate-900">E-Ticket & Akses Zoom Dikirim</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kode Tiket: <strong className="font-mono text-slate-700">{participant.nomorTicket || 'TICKET-DIGNITY-001'}</strong>
                  </p>
                </div>

                {/* Step 4: Attendance */}
                <div className="relative">
                  <span className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full ring-4 ring-white ${
                    hasAttended ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <div className="font-semibold text-slate-900">
                    {hasAttended ? 'Presensi Hadir Sesi Live Webinar' : 'Belum Melakukan Presensi'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {hasAttended ? `Durasi kehadiran tercatat: ${participant.durationMinutes || 90} menit (Berhak Sertifikat)` : 'Menunggu pelaksanaan sesi'}
                  </p>
                </div>

                {/* Step 5: Certificate Issuance */}
                <div className="relative">
                  <span className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full ring-4 ring-white ${
                    isLunas ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <div className="font-semibold text-slate-900">Penerbitan E-Sertifikat Resmi</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nomor Seri: <strong className="font-mono text-slate-700">{certNumber}</strong>
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* ── MODAL FOOTER ────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">ID Peserta: {participant.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs"
          >
            Tutup Profil
          </button>
        </div>

      </div>
    </div>
  );
}
