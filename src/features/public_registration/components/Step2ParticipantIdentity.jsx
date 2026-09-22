import React from 'react';
import { Users, Clock, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Step2ParticipantIdentity — Leader identity form + MABAR dynamic member roster
 * Extracted from PublicRegistrationWizard step 2 block (lines 1121-1335)
 */
export default function Step2ParticipantIdentity({
  primaryData,
  setPrimaryData,
  isGroupPackage,
  groupFillMode,
  setGroupFillMode,
  groupAdditionalCount,
  groupTotalPax,
  groupPaidCount,
  groupBonusCount,
  mabarMembers,
  handleUpdateMember,
  handleProceedFromStep2,
  isCheckingStep2,
  onBack,
}) {
  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="border-b border-stone-200/80 pb-2.5">
        <h3 className="text-base font-normal font-serif text-stone-900">Identitas Pendaftar Utama</h3>
        <p className="text-[11px] text-stone-500 font-light mt-0.5">Pastikan ejaan nama sesuai untuk pencetakan e-sertifikat resmi.</p>
      </div>
      
      <div>
        <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
          Nama Lengkap & Gelar (Untuk Sertifikat):
        </label>
        <input
          type="text"
          placeholder="Contoh: dr. Budi Santoso, Sp.A / Siti Rahma, S.Tr.Keb."
          value={primaryData.nama}
          onChange={(e) => setPrimaryData({ ...primaryData, nama: e.target.value })}
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
            Alamat Email Aktif:
          </label>
          <input
            type="email"
            placeholder="nama@email.com"
            value={primaryData.email}
            onChange={(e) => setPrimaryData({ ...primaryData, email: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
            Nomor WhatsApp Aktif:
          </label>
          <input
            type="tel"
            placeholder="08123456789"
            value={primaryData.whatsapp}
            onChange={(e) => setPrimaryData({ ...primaryData, whatsapp: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 font-mono text-stone-900 placeholder:text-stone-400 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
            Instansi / Perusahaan / Kampus:
          </label>
          <input
            type="text"
            placeholder="Contoh: RSUD Moewardi / Poltekkes"
            value={primaryData.instansi}
            onChange={(e) => setPrimaryData({ ...primaryData, instansi: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
            Kota Domisili:
          </label>
          <input
            type="text"
            placeholder="Contoh: Surakarta"
            value={primaryData.kota}
            onChange={(e) => setPrimaryData({ ...primaryData, kota: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
          />
        </div>
      </div>

      {/* If Group / MABAR, show dynamic members form */}
      {isGroupPackage && (
        <div className="p-4.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3.5 pt-3.5">
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-2.5">
            <div>
              <span className="font-semibold text-stone-900 text-xs flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0A192F]" />
                <span>Data {groupAdditionalCount} Rekan Tambahan (Total {groupTotalPax} Peserta)</span>
              </span>
              <p className="text-[11px] text-stone-500 font-light mt-0.5">
                Pendaftar utama di atas dihitung otomatis sebagai Peserta #1.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 shrink-0">
              Promo {groupPaidCount}+{groupBonusCount} (Bonus 1)
            </span>
          </div>

          {/* Segmented Control Mode Pengisian: Sekarang vs Nanti */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100/90 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => setGroupFillMode('NOW')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                groupFillMode === 'NOW'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>✍️ Isi Data Rekan Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupFillMode('LATER')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                groupFillMode === 'LATER'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>⏳ Kirim Menyusul (Bayar Dulu)</span>
            </button>
          </div>

          {/* Mode A: Isi Sekarang */}
          {groupFillMode === 'NOW' ? (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                Mohon lengkapi nama lengkap untuk sertifikat, email untuk pengiriman e-ticket, dan nomor WhatsApp untuk akses webinar:
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {mabarMembers.slice(0, groupAdditionalCount).map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white border border-stone-200/90 space-y-2.5 shadow-2xs">
                    <div className="font-medium text-stone-700 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-900">Anggota #{idx + 2}</span>
                      {idx === groupAdditionalCount - 1 ? (
                        <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                          🎁 Tiket Bonus Gratis
                        </span>
                      ) : (
                        <span className="text-stone-400 font-mono text-[10px]">Tiket Akses Penuh</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Nama Lengkap & Gelar (untuk Sertifikat)"
                        value={m.nama}
                        onChange={(e) => handleUpdateMember(idx, 'nama', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white text-stone-900 placeholder:text-stone-400 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="Alamat Email (E-Ticket & Sertifikat)"
                        value={m.email}
                        onChange={(e) => handleUpdateMember(idx, 'email', e.target.value)}
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white text-stone-900 placeholder:text-stone-400 transition-all"
                      />
                      <input
                        type="tel"
                        placeholder="No. WhatsApp (Akses Zoom)"
                        value={m.whatsapp}
                        onChange={(e) => handleUpdateMember(idx, 'whatsapp', e.target.value)}
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white font-mono text-stone-900 placeholder:text-stone-400 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mode B: Lengkapi Menyusul */
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950 space-y-2 text-xs leading-relaxed animate-fade-in">
              <div className="flex items-center gap-2 font-semibold text-amber-900">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Data Anggota Dapat Dilengkapi Menyusul</span>
              </div>
              <p className="text-[11.5px] font-light text-amber-900/90">
                Anda dapat menyelesaikan proses pembayaran untuk <strong>mengunci slot kuota Promo {groupPaidCount}+{groupBonusCount}</strong> sekarang.
              </p>
              <p className="text-[11px] font-light text-amber-800">
                Daftar nama lengkap, email, dan nomor WhatsApp rekan kelompok Anda dapat dikirimkan kepada panitia melalui tautan WhatsApp resmi yang tersedia di tanda terima setelah pendaftaran berhasil.
              </p>
            </div>
          )}
        </div>
      )}

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
          onClick={handleProceedFromStep2}
          disabled={isCheckingStep2}
          className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] disabled:opacity-60 text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
        >
          {isCheckingStep2 ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Memeriksa Status Data...</span>
            </>
          ) : (
            <>
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
