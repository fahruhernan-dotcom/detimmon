import React, { useState } from 'react';
import {
  Users,
  Check,
  Share2,
  Crown,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Save,
  Edit3,
  X,
  Copy,
  MessageCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { maskEmail, maskWhatsApp, normalizeWhatsApp } from '../../../utils/normalizers';

/**
 * GroupRosterMatrix (UI/UX Pro Edition)
 * Matriks roster pengisian mandiri rombongan (Slot A s/d K atau A s/d F).
 * - Auto-Locking: Slot yang sudah tersimpan otomatis terkunci (Read-Only Verified View).
 * - Edit Toggle: Ketua terverifikasi dapat membuka kunci (✏️ Ubah Data) kapan saja.
 * - Share Superpower: Tombol 1-klik untuk kirim link e-tiket langsung ke WhatsApp anggota.
 * - Zero Hardcode: Sepenuhnya dinamis berbasis database Supabase.
 */
export default function GroupRosterMatrix({
  activeRoster,
  isLeaderVerified,
  memberInputs = {},
  editingSlots = {},
  savingSlot,
  rosterError,
  rosterSuccess,
  copiedShareLink,
  leaderAuthInput,
  leaderAuthError,
  setLeaderAuthInput,
  onVerifyLeaderAuth,
  onRequestLeaderModal,
  onToggleEditSlot,
  onMemberInputChange,
  onSaveSingleSlot,
  onSaveAllSlots,
  onCopyShareLink
}) {
  const [copiedSlotCode, setCopiedSlotCode] = useState(null);

  if (!activeRoster || activeRoster.total_pax <= 1) {
    return null;
  }

  const fillPercentage = Math.round((activeRoster.filled_count / activeRoster.total_pax) * 100);

  // Helper untuk membuat tautan e-tiket spesifik anggota
  const getMemberTicketUrl = (ticketCode) => {
    if (!ticketCode) return window.location.href;
    const origin = window.location.origin || '';
    const pathname = window.location.pathname || '';
    return `${origin}${pathname}#/cek-tiket?code=${encodeURIComponent(ticketCode)}`;
  };

  // Salin tautan tiket khusus satu anggota
  const handleCopyMemberTicketLink = (ticketCode) => {
    if (!ticketCode) return;
    const url = getMemberTicketUrl(ticketCode);
    navigator.clipboard.writeText(url);
    setCopiedSlotCode(ticketCode);
    setTimeout(() => setCopiedSlotCode(null), 2500);
  };

  // Kirim e-tiket langsung ke WhatsApp anggota
  const handleSendToMemberWhatsApp = (slot) => {
    if (!slot) return;
    const ticketUrl = getMemberTicketUrl(slot.ticket_code);
    const cleanPhone = normalizeWhatsApp(slot.whatsapp || '');
    const participantName = slot.full_name || 'Rekan Peserta';
    const message = `Halo ${participantName},\n\nBerikut adalah E-Ticket resmi Anda untuk *${activeRoster.event_title || 'Pelatihan Public Speaking LPK Dignity'}*:\n\n🎫 *Nomor Tiket:* ${slot.ticket_code}\n📦 *Paket:* ${activeRoster.package_label}\n🔗 *Akses Tiket & Webinar:* ${ticketUrl}\n\nSilakan simpan tautan di atas untuk presensi dan akses materi. Sampai jumpa di ruang pelatihan!`;

    const waLink = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="tabel-anggota-rombongan"
      className="rounded-2xl border border-stone-300/80 bg-white p-5 sm:p-7 space-y-6 shadow-sm text-left no-print animate-fade-in scroll-mt-20"
    >
      {/* ── 1. HEADER & OVERVIEW STATS ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/90 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A192F] text-[#D4AF37] border border-[#D4AF37]/30 text-[11px] font-mono font-semibold tracking-wide">
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>ROSTER ANGGOTA ROMBONGAN • {activeRoster.total_pax} PAX</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Data Anggota &amp; Distribusi E-Tiket Resmi
          </h3>
          <p className="text-xs text-stone-600 font-normal leading-relaxed">
            {activeRoster.package_label} •{' '}
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activeRoster.filled_count} Terisi &amp; Terkunci
            </span>{' '}
            {activeRoster.pending_count > 0 ? (
              <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 ml-1">
                {activeRoster.pending_count} Slot Terbuka
              </span>
            ) : (
              <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded ml-1">
                ✓ Seluruh Kuota Terpenuhi
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopyShareLink}
            className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Salin tautan formulir rombongan untuk dibagikan ke WhatsApp grup"
          >
            {copiedShareLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Tautan Rombongan Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-stone-600" />
                <span>Bagikan Link Rombongan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. LEADER SECURITY GUARD BANNER ───────────────────────── */}
      {isLeaderVerified ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-white border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <span className="font-bold text-emerald-900 tracking-wide block sm:inline">
                👑 AKSES KETUA TERVERIFIKASI:{' '}
              </span>
              <span className="font-normal text-emerald-900/90">
                Halo <strong>{activeRoster.leader?.full_name}</strong> ({maskEmail(activeRoster.leader?.email)}). Anda memiliki hak akses penuh untuk melengkapi atau merevisi data e-tiket anggota.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-200/90 text-emerald-950 font-mono text-[10.5px] font-bold shrink-0 border border-emerald-300">
            OTORISASI AKTIF
          </span>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300 text-amber-950 text-xs space-y-3.5 shadow-2xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <strong className="text-amber-950 font-bold text-sm block">
                  🔒 Mode Pratinjau Aman • Terkunci Khusus Ketua Rombongan
                </strong>
                <p className="text-amber-900/90 font-normal text-xs leading-relaxed max-w-2xl">
                  Sesuai protokol keamanan data, pengisian dan pengubahan identitas peserta (Slot B s/d {String.fromCharCode(64 + activeRoster.total_pax)}){' '}
                  <strong>hanya dapat dikelola oleh Ketua Rombongan</strong> ({activeRoster.leader?.full_name}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestLeaderModal}
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 text-amber-200" />
              <span>Verifikasi Email Ketua ↗</span>
            </button>
          </div>

          {/* Quick Unlock Form */}
          <form onSubmit={onVerifyLeaderAuth} className="pt-2.5 border-t border-amber-200/90 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={leaderAuthInput}
                onChange={(e) => setLeaderAuthInput(e.target.value)}
                placeholder={`Ketik email (${maskEmail(activeRoster.leader?.email)}) atau WhatsApp Ketua untuk membuka akses pengisian`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
            >
              <Unlock className="w-4 h-4 text-[#D4AF37]" />
              <span>Buka Akses Pengisian</span>
            </button>
          </form>
          {leaderAuthError && (
            <p className="text-red-600 text-xs font-medium animate-fade-in flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{leaderAuthError}</span>
            </p>
          )}
        </div>
      )}

      {/* ── 3. VISUAL PROGRESS BAR ────────────────────────────────── */}
      <div className="space-y-2 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Kelengkapan E-Tiket Rombongan:</span>
          </span>
          <span className="font-mono font-bold text-stone-900">
            {fillPercentage}% ({activeRoster.filled_count}/{activeRoster.total_pax} Kursi Siap)
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-stone-200 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              activeRoster.filled_count >= activeRoster.total_pax
                ? 'bg-emerald-600'
                : 'bg-gradient-to-r from-amber-500 via-[#0A192F] to-emerald-600'
            }`}
            style={{ width: `${Math.max(6, fillPercentage)}%` }}
          />
        </div>
      </div>

      {/* Feedback Alerts */}
      {rosterSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{rosterSuccess}</span>
        </div>
      )}

      {rosterError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{rosterError}</span>
        </div>
      )}

      {/* ── 4. DESKTOP VIEW: TABEL ROSTER EXECUTIVE DIGNITY ───────── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-stone-300/90 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0A192F] text-stone-100 font-mono text-[11px] tracking-wider uppercase border-b-2 border-[#D4AF37]/50">
              <th className="py-3.5 px-3 text-center w-14">Slot</th>
              <th className="py-3.5 px-3 w-40">Peran &amp; Kota</th>
              <th className="py-3.5 px-4 min-w-[210px]">Nama Lengkap (Sertifikat)</th>
              <th className="py-3.5 px-4 min-w-[250px]">Kontak Peserta</th>
              <th className="py-3.5 px-3 w-44 text-center">Status &amp; E-Tiket</th>
              <th className="py-3.5 px-4 w-52 text-right">Aksi Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80 text-xs">
            {(activeRoster.slots || []).map((slot) => {
              const isLeader = slot.role === 'LEADER' || slot.suffix === 'A';
              const isFilled = Boolean(slot.is_filled);
              const isEditing = Boolean(editingSlots && editingSlots[slot.suffix]);
              const isSavingThis = savingSlot === slot.suffix || savingSlot === 'ALL';
              const isCopied = copiedSlotCode === slot.ticket_code;

              // ═══════════════════════════════════════════════════════
              // STATE 1: 👑 KETUA ROMBONGAN (SLOT A - TERKUNCI PERMANEN)
              // ═══════════════════════════════════════════════════════
              if (isLeader) {
                return (
                  <tr
                    key="slot-A-table"
                    className="bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-amber-400 transition-colors"
                  >
                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-200 text-amber-950 text-xs font-bold font-mono shadow-2xs">
                        👑 A
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="font-bold text-[#0A192F] flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Ketua Rombongan</span>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold font-mono text-[10px] mt-1 border border-amber-200">
                        📍 {slot.city || activeRoster.leader?.city || 'Kota Induk'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <strong className="text-stone-900 text-sm font-serif block">
                        {slot.full_name}
                      </strong>
                      <span className="text-[10.5px] text-amber-900 font-medium block mt-0.5">
                        Identitas Pemesan Terverifikasi (Akun Utama)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-stone-800 text-[11.5px] flex items-center gap-1.5">
                          <span className="text-stone-400 text-[10px]">✉</span>
                          <span>{maskEmail(slot.email)}</span>
                        </div>
                        <div className="font-mono text-stone-700 text-[11px] flex items-center gap-1.5">
                          <span className="text-stone-400 text-[10px]">📱</span>
                          <span>{maskWhatsApp(slot.whatsapp)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>✓ Tiket Induk</span>
                      </span>
                      <code className="block font-mono font-bold text-[#0A192F] text-[11px] mt-1">
                        {slot.ticket_code}
                      </code>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Terkunci Permanen</span>
                      </span>
                    </td>
                  </tr>
                );
              }

              // ═══════════════════════════════════════════════════════
              // STATE 2: 🔒 ANGGOTA TERISI & TERKUNCI (READ-ONLY VIEW)
              // ═══════════════════════════════════════════════════════
              if (isFilled && !isEditing) {
                return (
                  <tr
                    key={`slot-${slot.suffix}-locked`}
                    className="hover:bg-emerald-50/25 border-l-4 border-emerald-500 bg-white transition-colors"
                  >
                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0A192F] text-[#D4AF37] text-xs font-bold font-mono shadow-2xs">
                        {slot.suffix}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-semibold text-stone-800 block">👥 Anggota {slot.suffix}</span>
                      <span className="text-[10.5px] text-stone-400 block font-mono">Ikut Rombongan</span>
                    </td>
                    <td className="py-4 px-4">
                      <strong className="text-stone-900 text-sm font-serif block">
                        {slot.full_name}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-medium inline-flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Nama Resmi untuk Sertifikat Terdaftar</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-stone-800 text-[11.5px] flex items-center gap-1.5">
                          <span className="text-stone-400 text-[10px]">✉</span>
                          <span>{slot.email || '-'}</span>
                        </div>
                        <div className="font-mono text-stone-700 text-[11px] flex items-center gap-1.5">
                          <span className="text-stone-400 text-[10px]">📱</span>
                          <span>{slot.whatsapp || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>✓ E-Tiket Aktif</span>
                      </span>
                      <code className="block font-mono font-bold text-stone-800 text-[11px] mt-1 tracking-wider tabular-nums">
                        {slot.ticket_code}
                      </code>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isLeaderVerified ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Bagikan ke WhatsApp Anggota */}
                          <button
                            type="button"
                            onClick={() => handleSendToMemberWhatsApp(slot)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-medium transition-transform duration-150 ease-out shadow-2xs flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                            title={`Kirim E-Tiket ${slot.ticket_code} langsung ke WhatsApp ${slot.full_name}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden xl:inline">Kirim WA</span>
                          </button>

                          {/* Tombol Salin Link Tiket Anggota */}
                          <button
                            type="button"
                            onClick={() => handleCopyMemberTicketLink(slot.ticket_code)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-[11px] font-medium transition-transform duration-150 ease-out shadow-2xs flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                            title="Salin Tautan E-Tiket Member"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-stone-600" />
                            )}
                            <span className="hidden xl:inline">{isCopied ? 'Tersalin' : 'Link'}</span>
                          </button>

                          {/* Tombol Ubah Data (Membuka Mode Edit) */}
                          <button
                            type="button"
                            onClick={() => onToggleEditSlot(slot.suffix, true)}
                            className="py-1.5 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-[11px] font-semibold transition-transform duration-150 ease-out shadow-2xs flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                            title={`Ubah data Slot ${slot.suffix}`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-stone-700" />
                            <span>Ubah</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={onRequestLeaderModal}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-200 transition-transform duration-150 ease-out active:scale-[0.97] cursor-pointer"
                          title="Buka Otorisasi Ketua untuk Mengubah Data"
                        >
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Terkunci</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }

              // ═══════════════════════════════════════════════════════
              // STATE 3: ✏️ MODE EDIT / PENGISIAN SLOT (INPUT ACTIVE)
              // ═══════════════════════════════════════════════════════
              return (
                <tr
                  key={`slot-${slot.suffix}-edit`}
                  className={`border-l-4 transition-colors ${
                    isFilled
                      ? 'bg-blue-50/30 border-blue-500'
                      : 'bg-amber-50/15 border-amber-300 hover:bg-amber-50/30'
                  }`}
                >
                  <td className="py-4 px-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold font-mono">
                      {slot.suffix}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-semibold text-stone-800 block">👥 Anggota {slot.suffix}</span>
                    <span className="text-[10px] text-amber-700 font-mono block">
                      {isFilled ? '🔄 Mode Revisi' : '⏳ Slot Kosong'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="text"
                      disabled={!isLeaderVerified || isSavingThis}
                      placeholder="Nama &amp; Gelar Lengkap (Sertifikat)*"
                      value={memberInputs[slot.suffix]?.nama || ''}
                      onChange={(e) => onMemberInputChange(slot.suffix, 'nama', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs text-stone-900 placeholder:text-stone-400 transition-all font-sans ${
                        isLeaderVerified
                          ? 'border-stone-300 bg-white focus:border-[#0A192F] focus:ring-2 focus:ring-[#0A192F]/15'
                          : 'border-stone-200 bg-stone-100/70 text-stone-500 cursor-not-allowed opacity-80'
                      }`}
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1.5">
                      <input
                        type="email"
                        disabled={!isLeaderVerified || isSavingThis}
                        placeholder="Alamat Email (opsional)"
                        value={memberInputs[slot.suffix]?.email || ''}
                        onChange={(e) => onMemberInputChange(slot.suffix, 'email', e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono text-stone-900 placeholder:text-stone-400 transition-all ${
                          isLeaderVerified
                            ? 'border-stone-300 bg-white focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F]'
                            : 'border-stone-200 bg-stone-100/70 text-stone-500 cursor-not-allowed opacity-80'
                        }`}
                      />
                      <input
                        type="tel"
                        disabled={!isLeaderVerified || isSavingThis}
                        placeholder="No. WhatsApp: 0812..."
                        value={memberInputs[slot.suffix]?.whatsapp || ''}
                        onChange={(e) => onMemberInputChange(slot.suffix, 'whatsapp', e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono text-stone-900 placeholder:text-stone-400 transition-all ${
                          isLeaderVerified
                            ? 'border-stone-300 bg-white focus:border-[#0A192F] focus:ring-1 focus:ring-[#0A192F]'
                            : 'border-stone-200 bg-stone-100/70 text-stone-500 cursor-not-allowed opacity-80'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-3 text-center">
                    {isFilled ? (
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Revisi Slot
                        </span>
                        <code className="block font-mono text-[10.5px] text-stone-600 mt-1">
                          {slot.ticket_code}
                        </code>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        ⏳ Belum Terisi
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {isLeaderVerified ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => onSaveSingleSlot(slot.suffix)}
                          className="py-2 px-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                          title={`Simpan Data Slot ${slot.suffix}`}
                        >
                          {isSavingThis ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Simpan</span>
                            </>
                          )}
                        </button>

                        {/* Jika sedang merevisi slot yang sudah terisi sebelumnya, beri opsi Batal */}
                        {isFilled && (
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={() => onToggleEditSlot(slot.suffix, false)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all border border-stone-300"
                            title="Batal Revisi"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onRequestLeaderModal}
                        className="py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer ml-auto"
                        title="Buka Otorisasi Ketua"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kunci</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 5. MOBILE VIEW: KARTU DIGITAL CREDENTIAL RESPONSIF ────── */}
      <div className="md:hidden space-y-3.5">
        {(activeRoster.slots || []).map((slot) => {
          const isLeader = slot.role === 'LEADER' || slot.suffix === 'A';
          const isFilled = Boolean(slot.is_filled);
          const isEditing = Boolean(editingSlots && editingSlots[slot.suffix]);
          const isSavingThis = savingSlot === slot.suffix || savingSlot === 'ALL';
          const isCopied = copiedSlotCode === slot.ticket_code;

          // 👑 Mobile: Ketua Card
          if (isLeader) {
            return (
              <div
                key="slot-A-mobile"
                className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-3 text-left shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                  <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-amber-200 text-amber-950 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-700" />
                    <span>SLOT A • KETUA ROMBONGAN</span>
                  </span>
                  <code className="font-mono text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {slot.ticket_code}
                  </code>
                </div>
                <div>
                  <h4 className="text-sm font-serif font-bold text-stone-900">{slot.full_name}</h4>
                  <p className="text-[11px] text-amber-900 font-medium mt-0.5">
                    📍 Asal Kota: {slot.city || activeRoster.leader?.city || 'Surakarta'} (Data Induk)
                  </p>
                </div>
                <div className="text-xs font-mono text-stone-700 bg-white/70 p-2.5 rounded-xl border border-amber-200 space-y-1">
                  <div>✉ {maskEmail(slot.email)}</div>
                  <div>📱 {maskWhatsApp(slot.whatsapp)}</div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500 font-mono">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> E-Tiket Utama Aktif
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" /> Terkunci Permanen
                  </span>
                </div>
              </div>
            );
          }

          // 🔒 Mobile: Anggota Terkunci Card (Digital Pass)
          if (isFilled && !isEditing) {
            return (
              <div
                key={`slot-${slot.suffix}-mobile-locked`}
                className="p-4 rounded-2xl border-2 border-emerald-300 bg-white space-y-3 text-left shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-[#0A192F] text-[#D4AF37]">
                      SLOT {slot.suffix}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ E-Tiket Aktif
                    </span>
                  </div>
                  <code className="font-mono text-xs font-bold text-stone-800">
                    {slot.ticket_code}
                  </code>
                </div>

                <div>
                  <h4 className="text-base font-serif font-bold text-stone-900">{slot.full_name}</h4>
                  <p className="text-[10.5px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" /> Nama Resmi Sertifikat
                  </p>
                </div>

                <div className="text-xs font-mono text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200 space-y-1">
                  <div>✉ {slot.email || '-'}</div>
                  <div>📱 {slot.whatsapp || '-'}</div>
                </div>

                {isLeaderVerified ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendToMemberWhatsApp(slot)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleEditSlot(slot.suffix, true)}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-700" />
                      <span>Ubah Data</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestLeaderModal}
                    className="w-full py-2.5 px-3 rounded-xl bg-stone-100 text-stone-600 text-xs font-medium flex items-center justify-center gap-1.5 border border-stone-200 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Terkunci (Buka Otorisasi Ketua)</span>
                  </button>
                )}
              </div>
            );
          }

          // ✏️ Mobile: Mode Edit / Input
          return (
            <div
              key={`slot-${slot.suffix}-mobile-edit`}
              className={`p-4 rounded-2xl border-2 space-y-3.5 text-left transition-all ${
                isFilled ? 'bg-sky-50/40 border-sky-300' : 'bg-amber-50/30 border-amber-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-200 text-amber-950">
                  SLOT {slot.suffix} {isFilled ? '(REVISI)' : '(BELUM DIISI)'}
                </span>
                <span className="text-[11px] font-mono text-stone-500 tabular-nums">
                  {slot.ticket_code}
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Nama Lengkap (Sesuai Sertifikat)*
                  </label>
                  <input
                    type="text"
                    disabled={!isLeaderVerified || isSavingThis}
                    placeholder="Nama &amp; Gelar Lengkap"
                    value={memberInputs[slot.suffix]?.nama || ''}
                    onChange={(e) => onMemberInputChange(slot.suffix, 'nama', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-stone-600 block mb-0.5">
                      Email
                    </label>
                    <input
                      type="email"
                      disabled={!isLeaderVerified || isSavingThis}
                      placeholder="peserta@gmail.com"
                      value={memberInputs[slot.suffix]?.email || ''}
                      onChange={(e) => onMemberInputChange(slot.suffix, 'email', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-mono text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-stone-600 block mb-0.5">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      disabled={!isLeaderVerified || isSavingThis}
                      placeholder="0812..."
                      value={memberInputs[slot.suffix]?.whatsapp || ''}
                      onChange={(e) => onMemberInputChange(slot.suffix, 'whatsapp', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-mono text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {isLeaderVerified ? (
                  <>
                    <button
                      type="button"
                      disabled={isSavingThis}
                      onClick={() => onSaveSingleSlot(slot.suffix)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      {isSavingThis ? 'Menyimpan...' : `Simpan Slot ${slot.suffix}`}
                    </button>
                    {isFilled && (
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => onToggleEditSlot(slot.suffix, false)}
                        className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium border border-stone-300 transition-transform duration-150 ease-out active:scale-[0.97]"
                      >
                        Batal
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onRequestLeaderModal}
                    className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Buka Otorisasi Ketua</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 6. BOTTOM ACTION BAR: BATCH SAVE ──────────────────────── */}
      <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3.5">
        <div className="text-xs text-stone-600 text-center sm:text-left space-y-0.5">
          <p className="font-semibold text-stone-800">
            💡 Tips Pengisian Efisien:
          </p>
          <p className="font-light text-stone-500">
            Anda dapat mengisi beberapa nama sekaligus, lalu klik tombol simpan di samping. Slot yang sudah tersimpan otomatis terkunci aman.
          </p>
        </div>

        <button
          type="button"
          disabled={savingSlot === 'ALL'}
          onClick={() => {
            if (!isLeaderVerified) {
              onRequestLeaderModal();
              return;
            }
            onSaveAllSlots();
          }}
          className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-bold transition-transform duration-150 ease-out flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-md active:scale-[0.97]"
        >
          {savingSlot === 'ALL' ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Menyimpan Seluruh Data...</span>
            </>
          ) : isLeaderVerified ? (
            <>
              <Save className="w-4 h-4 text-[#D4AF37]" />
              <span>Simpan Seluruh Data Anggota Sekaligus</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Buka Kunci Ketua untuk Menyimpan Semua</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
