import React from 'react';
import { Calendar, Clock, MapPin, Check, User, Users, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';

/**
 * Step1PackageSelection — Event dossier, package selector, voucher input, and navigation
 * Extracted from PublicRegistrationWizard step 1 block (lines 946-1119)
 */
export default function Step1PackageSelection({
  isWebinar,
  eventDate,
  eventTime,
  eventVenue,
  webConfig,
  packageType,
  setPackageType,
  groupPackageKey,
  isGroupPackage,
  currentEvent,
  singlePrice,
  groupPrice,
  groupTotalPax,
  groupPaidCount,
  groupBonusCount,
  // Voucher props
  voucherInput,
  setVoucherInput,
  appliedVoucher,
  voucherError,
  voucherValidating,
  handleApplyVoucher,
  handleRemoveVoucher,
  // Navigation
  onBack,
  onNext,
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Executive Dossier: Event Schedule & Venue */}
      <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-2.5">
          <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase font-semibold">
            JADWAL & LOKASI PELAKSANAAN
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
            {isWebinar ? 'LIVE WEBINAR' : 'OFFLINE BOOTCAMP'}
          </span>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-stone-900 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-stone-600 shrink-0 stroke-[1.5]" />
            <span>{eventDate}</span>
          </div>
          <div className="text-xs text-stone-600 flex items-center gap-2.5 font-light">
            <Clock className="w-4 h-4 text-stone-500 shrink-0 stroke-[1.5]" />
            <span>{eventTime}</span>
          </div>
          <div className="text-xs text-stone-600 flex items-center gap-2.5 font-light">
            <MapPin className="w-4 h-4 text-stone-500 shrink-0 stroke-[1.5]" />
            <span>{eventVenue}</span>
          </div>
        </div>
      </div>

      {/* Package Selection */}
      <div>
        <label className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold block mb-2.5">
          PILIH PAKET PENDAFTARAN:
        </label>
        <div className={`grid grid-cols-1 ${webConfig?.allow_mabar ? 'sm:grid-cols-2' : ''} gap-3`}>
          
          {/* Paket Individu */}
          <div
            onClick={() => setPackageType('INDIVIDU')}
            className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2 ${
              packageType === 'INDIVIDU'
                ? 'border-2 border-[#0A192F] bg-[#FAF9F6] shadow-[0_4px_16px_rgba(10,25,47,0.06)] ring-1 ring-[#0A192F]/10'
                : 'border border-stone-200/90 hover:border-stone-300 hover:bg-[#FAF9F6]/40 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-900">Tiket Individu</span>
              {packageType === 'INDIVIDU' ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                  <Check className="w-2.5 h-2.5 text-[#D4AF37]" /> Dipilih
                </span>
              ) : (
                <User className="w-4 h-4 text-stone-400 stroke-[1.5]" />
              )}
            </div>
            <div className="text-xl font-normal font-serif text-stone-900">
              {formatRupiah(currentEvent?.promo_price || currentEvent?.base_price || 100000)}
            </div>
            <p className="text-[11px] text-stone-500 font-light leading-relaxed">
              Akses penuh bimbingan materi, e-sertifikat resmi, dan e-workbook.
            </p>
          </div>

          {/* Paket Promo Rombongan (Mabar) Dinamis */}
          {webConfig?.allow_mabar && (
            <div
              onClick={() => setPackageType(groupPackageKey)}
              className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2 ${
                isGroupPackage
                  ? 'border-2 border-[#0A192F] bg-[#FAF9F6] shadow-[0_4px_16px_rgba(10,25,47,0.06)] ring-1 ring-[#0A192F]/10'
                  : 'border border-stone-200/90 hover:border-stone-300 hover:bg-[#FAF9F6]/40 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-900">
                  {isWebinar ? 'Promo Komunitas (10+1)' : 'Promo Rombongan (5+1)'}
                </span>
                {isGroupPackage ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                    <Check className="w-2.5 h-2.5 text-[#D4AF37]" /> Dipilih
                  </span>
                ) : (
                  <Users className="w-4 h-4 text-stone-400 stroke-[1.5]" />
                )}
              </div>
              <div className="text-xl font-normal font-serif text-emerald-800">
                {formatRupiah(groupPrice)}
              </div>
              <div className="space-y-1">
                <div className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  Bonus 1 Tiket Gratis (Total {groupTotalPax} Pax)
                </div>
                <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                  Hemat {formatRupiah(singlePrice)}! Bayar {groupPaidCount} tiket untuk {groupTotalPax} peserta.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Voucher Rebate Input ── */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold block">
          KODE VOUCHER REBATE ALUMNI (OPSIONAL):
        </label>

        {appliedVoucher ? (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-950">Voucher Aktif: <strong className="font-mono">{voucherInput}</strong></p>
                <p className="text-[11px] text-emerald-700 font-light">Potongan {formatRupiah(appliedVoucher.discount_applied)} — {appliedVoucher.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveVoucher}
              className="text-[10px] font-mono uppercase tracking-wider text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Hapus
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CONTOH: REBATE100K-ALUMNI"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 font-mono uppercase text-stone-900 placeholder:text-stone-400 transition-all"
            />
            <button
              type="button"
              onClick={handleApplyVoucher}
              disabled={voucherValidating}
              className="px-4 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] disabled:opacity-50 text-white text-xs font-medium tracking-wide active:scale-95 transition-all cursor-pointer"
            >
              {voucherValidating ? 'Memvalidasi...' : 'Terapkan'}
            </button>
          </div>
        )}

        {voucherError && (
          <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{voucherError}</span>
          </p>
        )}
      </div>

      {/* Step 1 Actions */}
      <div className="flex items-center gap-3 pt-2">
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
          onClick={onNext}
          className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
        >
          <span>Lanjutkan Isi Data Peserta</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
        </button>
      </div>
    </div>
  );
}
