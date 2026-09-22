import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../components/ui/alert-dialog';
import { Users, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';

export default function DuplicateWarningModals({
  duplicateModalOpen,
  setDuplicateModalOpen,
  duplicateModalData,
  onProceedDuplicateReceipt,
  onProceedToUpdateProof
}) {
  return (
    <AlertDialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
      <AlertDialogContent className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 shadow-2xl max-w-lg sm:max-w-xl w-[92vw] overflow-hidden">
        {duplicateModalData?.isGroupMember ? (
          /* ── TAMPILAN A: ANGGOTA SUDAH DIDAFTARKAN KOORDINATOR PROMO KOMUNITAS ── */
          <>
            <AlertDialogHeader className="text-left space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Users className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10.5px] font-medium mb-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  <span>Kabar Baik: Kuota Anda Sudah Terdaftar!</span>
                </div>
                <AlertDialogTitle className="text-base sm:text-lg font-serif font-semibold text-stone-900">
                  Anda Sudah Terdaftar dalam Rombongan
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription asChild>
                <div className="text-xs text-stone-600 space-y-3 font-light leading-relaxed w-full">
                  <span>
                    Halo <strong>{duplicateModalData?.nama}</strong>, Anda <strong>tidak perlu membayar</strong> pendaftaran mandiri ini. Anda telah didaftarkan oleh <strong className="text-stone-900">{duplicateModalData?.leaderName || 'Koordinator Kelompok'}</strong> sebagai peserta resmi pada paket <strong className="text-stone-900">{duplicateModalData?.parentPackage || 'Promo Komunitas 10+1'}</strong>.
                  </span>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-xs text-stone-700 space-y-2.5 w-full">
                    <div className="flex items-center justify-between gap-3 border-b border-emerald-200/60 pb-2">
                      <span className="text-stone-500 font-light shrink-0">Koordinator Rombongan:</span>
                      <strong className="text-emerald-950 font-medium">{duplicateModalData?.leaderName || '-'}</strong>
                    </div>
                    {duplicateModalData?.leaderWhatsapp && (
                      <div className="flex items-center justify-between gap-3 border-b border-emerald-200/60 pb-2">
                        <span className="text-stone-500 font-light shrink-0">Kontak Koordinator:</span>
                        <a 
                          href={`https://wa.me/${duplicateModalData.leaderWhatsapp.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-mono underline font-medium"
                        >
                          {duplicateModalData.leaderWhatsapp} ↗
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 border-b border-emerald-200/60 pb-2">
                      <span className="text-stone-500 font-light shrink-0">Status Rombongan:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium ${
                        duplicateModalData?.statusBayar === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {duplicateModalData?.statusBayar === 'VERIFIED' ? 'Terverifikasi (Lunas)' : 'Menunggu Verifikasi Admin'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 font-light shrink-0">Kode Slot Tiket:</span>
                      <code className="font-mono font-bold text-stone-900 text-xs">{duplicateModalData?.nomorTicket || duplicateModalData?.id}</code>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="font-light">
                      <strong>Hemat Uang Anda:</strong> Hak akses webinar & e-sertifikat Anda sudah dijamin oleh koordinator rombongan. Anda tidak perlu mentransfer biaya apa pun.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-3 w-full sm:space-x-0">
              <AlertDialogCancel
                onClick={() => setDuplicateModalOpen(false)}
                className="flex-1 text-xs rounded-xl py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/90 font-medium cursor-pointer"
              >
                Tutup & Kembali
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onProceedDuplicateReceipt}
                className="flex-1 text-xs rounded-xl py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer shadow-xs"
              >
                Lihat Tanda Terima Rombongan ↗
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          /* ── TAMPILAN B: PENDAFTARAN GANDA MANDIRI STANDARD ── */
          <>
            <AlertDialogHeader className="text-left space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <AlertCircle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <AlertDialogTitle className="text-base sm:text-lg font-serif font-semibold text-stone-900">
                  Pendaftaran Sebelumnya Terdeteksi
                </AlertDialogTitle>
                <p className="text-xs text-stone-500 font-light mt-0.5">
                  Data kontak Anda telah tercatat pada database acara ini.
                </p>
              </div>
              <AlertDialogDescription asChild>
                <div className="text-xs text-stone-600 space-y-3 font-light leading-relaxed w-full">
                  <p className="text-xs leading-relaxed text-stone-600">
                    Halo <strong>{duplicateModalData?.nama}</strong>, identitas email (<code className="font-mono text-stone-800 font-semibold">{duplicateModalData?.email}</code>) atau nomor WhatsApp (<code className="font-mono text-stone-800 font-semibold">{duplicateModalData?.whatsapp}</code>) Anda sudah pernah terdaftar pada sistem kami untuk acara ini.
                  </p>
                  
                  {/* Ringkasan Data Database Murni */}
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200/90 text-xs text-stone-700 space-y-2.5 w-full shadow-2xs">
                    <div className="flex items-center justify-between gap-3 border-b border-stone-200/60 pb-2">
                      <span className="text-stone-500 font-light shrink-0">Status Pembayaran:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium ${
                        duplicateModalData?.statusBayar === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {duplicateModalData?.statusBayar === 'VERIFIED' ? 'Terverifikasi (Lunas)' : 'Menunggu Verifikasi Admin'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-b border-stone-200/60 pb-2">
                      <span className="text-stone-500 font-light shrink-0">
                        {duplicateModalData?.statusBayar === 'VERIFIED' ? 'Nomor Tiket Resmi:' : 'No. Registrasi Sementara:'}
                      </span>
                      <code className="font-mono font-bold text-stone-900 text-xs tracking-wide">
                        {duplicateModalData?.nomorTicket || duplicateModalData?.id}
                      </code>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-b border-stone-200/60 pb-2">
                      <span className="text-stone-500 font-light shrink-0">Pilihan Paket:</span>
                      <span className="text-stone-900 font-medium text-right leading-tight">
                        {duplicateModalData?.kategori || 'Tiket Individu'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-500 font-light shrink-0">Total Tagihan:</span>
                      <strong className="font-mono font-bold text-stone-900 text-sm">
                        {formatRupiah(duplicateModalData?.nominal || 100000)}
                      </strong>
                    </div>
                  </div>

                  {/* Notice Edukatif */}
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="font-light">
                      {duplicateModalData?.statusBayar === 'VERIFIED'
                        ? 'Tiket resmi Anda sudah aktif. Anda dapat langsung membuka tanda terima resmi pendaftaran Anda.'
                        : 'Tiket resmi acara belum aktif. Anda tidak perlu mentransfer biaya dua kali. Anda dapat langsung melihat tanda terima resmi atau memperbarui bukti transfer Anda.'}
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col gap-2.5 pt-3 w-full sm:flex-col sm:space-x-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {duplicateModalData?.statusBayar !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={onProceedToUpdateProof}
                    className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs border border-stone-200/90 cursor-pointer transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <span>Perbarui Bukti Bayar</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
                  </button>
                )}
                <AlertDialogAction
                  onClick={onProceedDuplicateReceipt}
                  className={`w-full py-2.5 px-4 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] ${
                    duplicateModalData?.statusBayar === 'VERIFIED' ? 'sm:col-span-2' : ''
                  }`}
                >
                  <span>Buka Tanda Terima</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </AlertDialogAction>
              </div>

              <AlertDialogCancel
                onClick={() => setDuplicateModalOpen(false)}
                className="w-full py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 border-0 cursor-pointer transition-colors text-center mt-0"
              >
                ← Periksa / Ubah Kontak di Langkah 02
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
