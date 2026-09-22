import React from 'react';
import { Sparkles, Upload, ShieldCheck, ExternalLink, AlertCircle, Check, ArrowLeft } from 'lucide-react';

/**
 * Step4ProofUpload — Proof of transfer (file upload or Google Drive link) + submit
 * Extracted from PublicRegistrationWizard step 4 block (lines 1463-1615)
 */
export default function Step4ProofUpload({
  proofMethod,
  setProofMethod,
  proofDriveUrl,
  setProofDriveUrl,
  proofFile,
  setProofFile,
  proofPreview,
  setProofPreview,
  isSubmitting,
  handleSubmitRegistration,
  onBack,
}) {
  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="border-b border-stone-200/80 pb-2.5">
        <h3 className="text-base font-normal font-serif text-stone-900">Konfirmasi Bukti Pembayaran</h3>
        <p className="text-[11px] text-stone-500 font-light mt-0.5">Lampirkan foto struk m-banking atau tautan bukti transfer Anda.</p>
      </div>
      
      {/* Pilihan Metode Lampiran: Segmented Control */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
        <button
          type="button"
          onClick={() => setProofMethod('UPLOAD')}
          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            proofMethod === 'UPLOAD'
              ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-[#0A192F]" />
          <span>Upload Foto (Instan)</span>
        </button>
        <button
          type="button"
          onClick={() => setProofMethod('GDRIVE')}
          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            proofMethod === 'GDRIVE'
              ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#0A192F]" />
          <span>Link Google Drive</span>
        </button>
      </div>

      {/* Box Input Berdasarkan Metode */}
      {proofMethod === 'GDRIVE' ? (
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3">
          <div className="text-left space-y-1">
            <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-600 font-medium flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
              <span>TAUTAN GOOGLE DRIVE BUKTI TRANSFER:</span>
            </label>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Penting: Buka Izin Akses Berkas</p>
                <p className="text-amber-900/80 mt-0.5 font-light">
                  Pastikan hak akses berkas di Google Drive telah disetel ke <strong>"Siapa saja yang memiliki link dapat melihat"</strong> agar verifikasi berlangsung instan.
                </p>
              </div>
            </div>
          </div>
          <input
            type="url"
            placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
            value={proofDriveUrl}
            onChange={(e) => setProofDriveUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200/90 text-xs font-mono focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none bg-white text-stone-900"
          />
          {proofDriveUrl.trim() && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Tautan siap dilampirkan: {proofDriveUrl.trim()}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-[#FAF9F6] border-2 border-dashed border-stone-300 hover:border-stone-400 text-center space-y-3 transition-colors">
          {proofPreview ? (
            <div className="space-y-3">
              <div className="relative inline-block border border-stone-200 rounded-xl overflow-hidden shadow-xs bg-white max-h-48 max-w-full">
                <img
                  src={proofPreview}
                  alt="Bukti Transfer"
                  className="max-h-44 w-auto object-contain mx-auto"
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-medium text-stone-700 truncate max-w-xs">
                  📎 {proofFile?.name || 'Bukti Transfer Terlampir'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="text-[11px] font-medium text-rose-600 hover:text-rose-700 underline ml-2 cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                <Upload className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <span className="font-medium text-stone-900 block text-xs">Upload Struk Transfer (Disarankan)</span>
                <p className="text-[11px] text-stone-500 font-light max-w-sm mx-auto mt-0.5">
                  Lampirkan tangkapan layar / foto bukti transfer bank Anda untuk verifikasi tiket otomatis.
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProofFile(file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setProofPreview(reader.result);
                    reader.readAsDataURL(file);
                  } else {
                    setProofPreview(null);
                  }
                }}
                className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0A192F] file:text-white hover:file:bg-[#112240] cursor-pointer"
              />
            </>
          )}
        </div>
      )}

      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/90 text-stone-600 text-xs flex items-center gap-2.5 font-light">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Pendaftaran Anda dilindungi enkripsi aman dan nomor tiket resmi akan segera diterbitkan.</span>
      </div>

      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-400" />
          <span>Kembali</span>
        </button>
        <button
          type="button"
          onClick={handleSubmitRegistration}
          disabled={isSubmitting}
          className="flex-1 py-3.5 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.15)] disabled:opacity-50 active:scale-[0.98] cursor-pointer tracking-wide"
        >
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span>{isSubmitting ? 'Memproses Pendaftaran...' : 'Kirim Pendaftaran Sekarang'}</span>
        </button>
      </div>
    </div>
  );
}
