import React from 'react';
import {
  CheckCircle2,
  Clock,
  Ticket,
  Users,
  ArrowRight,
  MessageCircle,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';

/**
 * Step5SuccessReceipt — Post-submission receipt showing ticket status, payment status,
 * WA Group link, print receipt, and group member fill-later CTA
 * Extracted from PublicRegistrationWizard step 5 block (lines 1617-1809)
 */
export default function Step5SuccessReceipt({
  registeredResult,
  eventTitle,
  webConfig,
  sanitizePublicMessage,
}) {
  if (!registeredResult) return null;

  return (
    <div id="printable-receipt-content" className="space-y-5 animate-fade-in text-center py-4">
      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-normal font-serif text-stone-900">Pendaftaran Berhasil Dikirim!</h3>
        <p className="text-xs text-stone-500 font-light mt-1 max-w-sm mx-auto leading-relaxed">
          {webConfig.success_message || "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."}
        </p>
      </div>

      {/* Duplicate Notice Banner if previously registered */}
      {registeredResult.isDuplicate && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-left space-y-1 text-xs text-amber-950">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Pendaftaran Sebelumnya Terdeteksi</span>
          </div>
          <p className="text-[11.5px] font-light leading-relaxed">
            {sanitizePublicMessage(registeredResult.duplicateMessage)}
          </p>
        </div>
      )}

      {/* Box Status Tiket & Registrasi */}
      {registeredResult.statusBayar === 'VERIFIED' ? (
        <div className="p-4.5 bg-emerald-50/70 rounded-2xl border-2 border-emerald-600 shadow-xs flex items-center justify-between text-left">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-800 font-semibold block">
                NOMOR E-TICKET RESMI (AKTIF):
              </span>
            </div>
            <strong className="font-mono text-base sm:text-lg text-emerald-950 font-bold tracking-tight block mt-0.5">
              {registeredResult.nomorTicket || registeredResult.id}
            </strong>
            <span className="text-[11px] text-emerald-800 font-light mt-0.5 block">
              Tiket resmi Anda telah aktif. Tautan Zoom & WhatsApp Group dapat diakses di bawah.
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
            <Ticket className="w-5 h-5 stroke-[1.5]" />
          </div>
        </div>
      ) : (
        <div className="p-4.5 bg-[#FAF9F6] rounded-2xl border border-stone-300 shadow-xs flex items-center justify-between text-left">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 font-semibold block">
                KODE PENDAFTARAN SEMENTARA:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-amber-100 text-amber-900 border border-amber-200">
                TIKET BELUM AKTIF
              </span>
            </div>
            <strong className="font-mono text-base sm:text-lg text-stone-900 font-bold tracking-tight block mt-0.5">
              {registeredResult.nomorTicket || registeredResult.id}
            </strong>
            <p className="text-[11px] text-stone-500 font-light mt-1 leading-snug">
              Status: <strong className="text-stone-700">Menunggu Verifikasi Admin</strong>. Tiket resmi ber-barcode & akses webinar akan diterbitkan otomatis setelah pembayaran dicek & diverifikasi oleh Admin.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 shadow-2xs shrink-0">
            <Clock className="w-5 h-5 stroke-[1.5]" />
          </div>
        </div>
      )}

      {/* Receipt Card */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 text-left space-y-2.5 text-xs shadow-2xs">
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Nama Peserta:</span>
          <strong className="text-stone-900 font-medium">{registeredResult.nama}</strong>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Acara:</span>
          <span className="text-stone-800 font-medium truncate max-w-[200px]">{eventTitle}</span>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Paket:</span>
          <span className="text-stone-800 font-medium">{registeredResult.kategori}</span>
        </div>
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
          <span className="text-stone-500 font-light">Total Tagihan / Pembayaran:</span>
          <strong className="text-stone-900 font-mono font-bold">{formatRupiah(registeredResult.nominal || 0)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500 font-light">Status Pembayaran:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
            registeredResult.statusBayar === 'VERIFIED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-900 border border-amber-200'
          }`}>
            {registeredResult.statusBayar === 'VERIFIED' ? 'Terverifikasi (Lunas)' : 'Menunggu Verifikasi Admin'}
          </span>
        </div>
      </div>

      {/* Notice Langkah Selanjutnya */}
      {registeredResult.statusBayar !== 'VERIFIED' ? (
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 text-left space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900">
            <Clock className="w-4 h-4 text-stone-600 shrink-0" />
            <span>Langkah Selanjutnya: Menunggu Verifikasi Panitia</span>
          </div>
          <p className="text-stone-600 text-[11.5px] font-light leading-relaxed">
            Bukti transfer Anda telah tersimpan di sistem. Panitia akan memvalidasi pembayaran Anda.
            <br />
            Setelah diverifikasi, <strong>Tautan WhatsApp Group Resmi</strong> & <strong>E-Ticket</strong> akan dikirimkan otomatis ke alamat email: <strong className="text-stone-900 font-mono">{registeredResult.email}</strong>.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-left space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pembayaran Terverifikasi Lunas!</span>
          </div>
          <p className="text-emerald-900/80 text-[11.5px] font-light">
            Silakan langsung bergabung ke WhatsApp Group resmi peserta untuk mengakses link Zoom & materi pelatihan.
          </p>
        </div>
      )}

      {/* Khusus Pendaftaran Promo Rombongan dengan Mode Isi Menyusul */}
      {registeredResult.groupFillMode === 'LATER' && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-left space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <Users className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Lengkapi Daftar Anggota Kelompok Anda</span>
          </div>
          <p className="text-[11.5px] font-light text-amber-900/90 leading-relaxed">
            Anda memilih opsi pengisian data anggota menyusul. Mohon kirimkan daftar nama lengkap (beserta gelar untuk sertifikat), alamat email aktif, dan nomor WhatsApp rekan Anda kepada panitia sebelum H-1 acara.
          </p>
          <a
            href={`https://wa.me/6289681077483?text=${encodeURIComponent(
              `Halo Admin Dignity, saya koordinator pendaftar ${registeredResult.nama} (${registeredResult.statusBayar === 'VERIFIED' ? 'No. Tiket' : 'No. Registrasi'}: ${registeredResult.nomorTicket || registeredResult.id}) paket ${registeredResult.kategori}.\n\nBerikut daftar nama, email, dan WhatsApp anggota kelompok saya:\n1. ...\n2. ...\n3. ...`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Kirim Daftar Anggota ke WhatsApp Admin ↗</span>
          </a>
        </div>
      )}

      <div className="pt-2 space-y-2.5 no-print print:hidden">
        {/* HANYA tampilkan Tautan Grup WhatsApp jika sudah VERIFIED/LUNAS */}
        {registeredResult.statusBayar === 'VERIFIED' && webConfig.wa_group_url && (
          <a
            href={webConfig.wa_group_url}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 rounded-xl text-xs font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span>Gabung WhatsApp Group Resmi Peserta</span>
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </a>
        )}

        {/* Tombol Utama saat PENDING: Konfirmasi ke WhatsApp Admin */}
        {registeredResult.statusBayar !== 'VERIFIED' && (
          <a
            href={`https://wa.me/6289681077483?text=${encodeURIComponent(
              `Halo Admin LPK Dignity, saya telah mendaftar acara ${eventTitle} atas nama ${registeredResult.nama} (${registeredResult.statusBayar === 'VERIFIED' ? 'No. Tiket' : 'No. Registrasi'}: ${registeredResult.nomorTicket || registeredResult.id}). Saya telah mengunggah bukti pembayaran via web, mohon dibantu verifikasi. Terima kasih!`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 rounded-xl text-xs font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>Konfirmasi Pembayaran ke WA Admin</span>
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </a>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-xl text-xs font-medium border border-stone-200/90 bg-white hover:bg-stone-50 text-stone-700 transition-all inline-flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-stone-400" />
          <span>Cetak / Simpan Tanda Terima (PDF)</span>
        </button>
      </div>
    </div>
  );
}
