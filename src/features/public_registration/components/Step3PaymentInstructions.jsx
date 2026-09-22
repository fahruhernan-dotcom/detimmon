import React from 'react';
import { CheckCircle2, Copy, Check, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { formatRupiah } from '../../../utils/formatters';

/**
 * Step3PaymentInstructions — Bank selector, payment breakdown, voucher display, copy account
 * Extracted from PublicRegistrationWizard step 3 block (lines 1337-1461)
 */
export default function Step3PaymentInstructions({
  priceAmount,
  basePrice,
  isGroupPackage,
  isWebinar,
  groupTotalPax,
  appliedVoucher,
  packageType,
  webConfig,
  primaryData,
  setPrimaryData,
  copiedAccount,
  handleCopyAccount,
  onBack,
  onNext,
}) {
  return (
    <div className="space-y-4 animate-fade-in text-xs">
      <div className="border-b border-stone-200/80 pb-2.5">
        <h3 className="text-base font-normal font-serif text-stone-900">Instruksi Pembayaran Resmi</h3>
        <p className="text-[11px] text-stone-500 font-light mt-0.5">Transfer dilakukan ke rekening resmi lembaga berbadan hukum LPK Indonesia Dignity.</p>
      </div>

      {/* Total Due Card Dossier */}
      <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3 shadow-2xs">
        {appliedVoucher && packageType === 'INDIVIDU' ? (
          <>
            <div className="flex items-center justify-between text-stone-600">
              <span className="text-[11px] font-light">Investasi Normal:</span>
              <span className="font-mono line-through text-stone-400">{formatRupiah(basePrice)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-800 font-medium">
              <span className="text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Voucher Rebate ({appliedVoucher.code}):
              </span>
              <span className="font-mono font-bold">- {formatRupiah(appliedVoucher.discount)}</span>
            </div>
            <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold block">TOTAL WAJIB TRANSFER:</span>
                <div className="text-2xl font-normal font-serif text-stone-900 mt-0.5">{formatRupiah(priceAmount)}</div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-700">
                Tiket Individu
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold block">TOTAL TAGIHAN TRANSFER:</span>
              <div className="text-2xl font-normal font-serif text-stone-900 mt-0.5">{formatRupiah(priceAmount)}</div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-700">
              {isGroupPackage ? (isWebinar ? `Promo Komunitas (${groupTotalPax} Pax)` : `Promo Rombongan (${groupTotalPax} Pax)`) : 'Tiket Individu'}
            </span>
          </div>
        )}
      </div>

      {/* Bank Transfer Details */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold block">
          PILIHAN REKENING BANK RESMI TUJUAN:
        </span>
        
        {webConfig.banks && webConfig.banks.length > 0 ? (
          webConfig.banks.map((b, bIdx) => (
            <div 
              key={bIdx}
              onClick={() => setPrimaryData(d => ({ ...d, bank: b.bank_name }))}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                primaryData.bank === b.bank_name 
                  ? 'border-2 border-[#0A192F] bg-white ring-1 ring-[#0A192F]/10 shadow-xs' 
                  : 'border border-stone-200/90 bg-[#FAF9F6] hover:bg-white hover:border-stone-300'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-stone-900 block text-xs">{b.bank_name}</strong>
                  {primaryData.bank === b.bank_name && (
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                      Dipilih
                    </span>
                  )}
                </div>
                <code className="text-sm font-mono font-bold text-stone-900 block mt-1">{b.account_number}</code>
                <span className="text-[11px] text-stone-500 font-light block mt-0.5">a.n. {b.account_holder}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyAccount(b.account_number);
                }}
                className="p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all active:scale-95 cursor-pointer"
                title="Salin nomor rekening"
              >
                {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))
        ) : (
          <div className="p-4 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-2xs">
            <div>
              <strong className="text-stone-900 block text-xs">Bank Mandiri</strong>
              <code className="text-sm font-mono font-bold text-stone-900 block mt-1">138-00-2455891-2</code>
              <span className="text-[11px] text-stone-500 font-light block mt-0.5">a.n. LPK INDONESIA DIGNITY</span>
            </div>
            <button
              onClick={() => handleCopyAccount('1380024558912')}
              className="p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
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
          onClick={onNext}
          className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
        >
          <span>Saya Sudah Transfer (Konfirmasi)</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
        </button>
      </div>
    </div>
  );
}
