import React from 'react';
import { Upload, Check, Copy, Printer, MessageCircle } from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';
import { maskEmail, maskWhatsApp } from '../../../utils/normalizers';

/**
 * PendingTicketCard
 * Kartu status pendaftaran sementara ketika tiket masih menunggu verifikasi admin.
 */
export default function PendingTicketCard({
  ticketResult,
  copiedCode,
  onCopyCode,
  showProofUpload,
  setShowProofUpload,
  proofMethod,
  setProofMethod,
  proofPreview,
  setProofFile,
  setProofPreview,
  proofDriveUrl,
  setProofDriveUrl,
  isUpdatingProof,
  onUpdateProofSubmit
}) {
  if (!ticketResult) return null;

  const adminPhone = ticketResult.adminWhatsapp || import.meta.env.VITE_ADMIN_WHATSAPP || '6289681077483';
  const waConfirmationUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
    `Halo Admin Dignity, saya ingin konfirmasi pendaftaran atas nama ${ticketResult.fullName} (${ticketResult.ticketCode}) untuk acara ${ticketResult.eventTitle}. Mohon dicek status verifikasinya. Terima kasih!`
  )}`;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 sm:p-7 space-y-4 shadow-sm text-left animate-fade-in">
      {/* Header Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10.5px] font-mono uppercase tracking-widest text-amber-900 font-bold block">
            KODE PENDAFTARAN SEMENTARA:
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-950 tracking-tight flex items-center gap-2">
            <span>TIKET BELUM AKTIF</span>
          </h2>
        </div>
        <div className="px-3 py-1 rounded-lg bg-white border border-amber-300 shadow-2xs">
          <span className="text-[10px] font-mono font-bold text-amber-900 uppercase">
            STATUS: PENDING
          </span>
        </div>
      </div>

      {/* Nomor Tiket Card Pill */}
      <div className="p-4 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-stone-500 block">NOMOR REGISTRASI / KODE TIKET:</span>
          <code className="text-base sm:text-lg font-mono font-bold text-stone-900 block mt-0.5">
            {ticketResult.ticketCode}
          </code>
        </div>
        <button
          type="button"
          onClick={() => onCopyCode(ticketResult.ticketCode)}
          className="p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Salin Kode"
        >
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>

      {/* Deskripsi Status Resmi */}
      <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200 text-xs sm:text-[13px] text-amber-950 leading-relaxed font-light">
        <strong>Status:</strong> Menunggu Verifikasi Admin. Tiket resmi ber-barcode &amp; akses webinar akan diterbitkan otomatis setelah pembayaran dicek &amp; diverifikasi oleh Admin.
      </div>

      {/* Notice Anggota Rombongan jika terdaftar melalui ketua */}
      {ticketResult.isGroupMember && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
          🎉 <strong>Terdaftar dalam Rombongan:</strong> Anda telah didaftarkan oleh{' '}
          <strong className="text-emerald-900">{ticketResult.leaderName || 'Koordinator Kelompok'}</strong>. Anda tidak perlu mentransfer biaya apa pun.
        </div>
      )}

      {/* Dossier Ringkasan Pendaftaran */}
      <div className="p-5 rounded-xl bg-white border border-stone-200/90 space-y-2.5 text-xs">
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Nama Peserta:</span>
          <strong className="text-stone-900 font-medium">{ticketResult.fullName}</strong>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Alamat Email:</span>
          <span className="font-mono text-stone-800">{maskEmail(ticketResult.email)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Nomor WhatsApp:</span>
          <span className="font-mono text-stone-800">{maskWhatsApp(ticketResult.whatsapp)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Acara:</span>
          <span className="text-stone-800 font-medium truncate max-w-[240px]">{ticketResult.eventTitle}</span>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Pilihan Paket:</span>
          <span className="text-stone-900 font-medium">{ticketResult.kategori}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-light">Total Tagihan:</span>
          <strong className="font-mono font-bold text-stone-900 text-sm">{formatRupiah(ticketResult.nominal)}</strong>
        </div>
      </div>

      {/* Form Re-Upload Bukti Pembayaran (Foldable) */}
      {showProofUpload && (
        <div className="p-4.5 rounded-xl bg-white border border-stone-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#0A192F]" />
              <span>Unggah / Perbarui Bukti Pembayaran</span>
            </span>
            <button
              type="button"
              onClick={() => setShowProofUpload(false)}
              className="text-[11px] text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Batal
            </button>
          </div>

          <form onSubmit={onUpdateProofSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setProofMethod('UPLOAD')}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                  proofMethod === 'UPLOAD'
                    ? 'border-[#0A192F] bg-stone-100 text-stone-900 font-bold'
                    : 'border-stone-200 bg-[#FAF9F6] text-stone-600'
                }`}
              >
                Unggah Gambar
              </button>
              <button
                type="button"
                onClick={() => setProofMethod('GDRIVE')}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                  proofMethod === 'GDRIVE'
                    ? 'border-[#0A192F] bg-stone-100 text-stone-900 font-bold'
                    : 'border-stone-200 bg-[#FAF9F6] text-stone-600'
                }`}
              >
                Tautan Google Drive
              </button>
            </div>

            {proofMethod === 'GDRIVE' ? (
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={proofDriveUrl}
                onChange={(e) => setProofDriveUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono bg-white text-stone-900 outline-none focus:border-[#0A192F]"
              />
            ) : (
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center bg-[#FAF9F6]">
                {proofPreview ? (
                  <div className="space-y-2">
                    <img src={proofPreview} alt="Bukti Transfer" className="max-h-36 mx-auto object-contain rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer"
                    >
                      Ganti Gambar
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-1">
                    <Upload className="w-5 h-5 text-stone-400 mx-auto" />
                    <span className="text-xs text-stone-700 font-medium block">Pilih Berkas Gambar Bukti</span>
                    <span className="text-[10px] text-stone-400 block font-light">Format JPG, PNG, atau WebP (maks. 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setProofFile(f);
                          const reader = new FileReader();
                          reader.onload = () => setProofPreview(reader.result);
                          reader.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingProof}
              className="w-full py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isUpdatingProof ? 'Menyimpan...' : 'Kirim Pembaruan Bukti Transfer'}
            </button>
          </form>
        </div>
      )}

      {/* Tombol Aksi Utama Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 no-print print:hidden">
        <a
          href={waConfirmationUrl}
          target="_blank"
          rel="noreferrer"
          className="py-3 px-4 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
          <span>Konfirmasi ke WA Admin</span>
        </a>

        {!showProofUpload && (
          <button
            type="button"
            onClick={() => setShowProofUpload(true)}
            className="py-3 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Perbarui Bukti Pembayaran ↗</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="sm:col-span-2 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-stone-500" />
          <span>Cetak Bukti Pendaftaran Sementara (PDF)</span>
        </button>
      </div>
    </div>
  );
}
