import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Award, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageCircle, 
  UserCheck, 
  QrCode 
} from 'lucide-react';
import { normalizeCertificateName } from '../utils/normalizers';

export default function CertificateModal({
  isOpen,
  onClose,
  certData,
  selectedSpeaker: initialSpeaker = 'diyah'
}) {
  if (!isOpen || !certData) return null;

  const [copiedLink, setCopiedLink] = useState(false);

  const recipientName = normalizeCertificateName(certData.nama || certData.normalized_name);
  const certNumber = certData.nomorSertifikat || certData.certificate_no || 'LPK-DIGNITY/CERT/2026/000001';
  const verificationCode = certData.verification_code || certData.verificationCode || certData.id?.slice(0, 8) || 'dgn-verify';
  const voucherCode = certData.kodeVoucher || certData.code || 'REBATE100K-001';

  // Construct absolute verification URL
  const baseUrl = window.location.origin + window.location.pathname;
  const verificationUrl = `${baseUrl}#/verify/${encodeURIComponent(verificationCode)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  const dynamicDefaultSpeakerName = certData.speaker_name || 
    certData.events?.landing_page_config?.speaker?.name || 
    certData.events?.speaker_name ||
    "Master Trainer LPK Dignity";

  const dynamicDefaultSpeakerTitle = certData.speaker_title ||
    certData.events?.landing_page_config?.speaker?.title ||
    "Lead Facilitator & Certified Coach LPK Dignity";

  const [speakerName, setSpeakerName] = useState(dynamicDefaultSpeakerName);
  const [speakerTitle, setSpeakerTitle] = useState(dynamicDefaultSpeakerTitle);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const rawWa = certData.whatsapp || certData.persons?.whatsapp || '';
    const cleanWa = String(rawWa).replace(/[^0-9]/g, '');
    const phone = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;

    const message = `*SELAMAT! E-SERTIFIKAT RESMI TERBIT* 🎓\n\n` +
      `Halo *${recipientName}*,\n` +
      `Terima kasih telah berpartisipasi aktif dalam Live Interactive Workshop:\n` +
      `*"Mastering Stage Confidence: 3 Rahasia Psikologi Bicara Terstruktur & Berwibawa"*\n` +
      `diselenggarakan oleh LPK Indonesia Dignity in official collaboration with KLTC®.\n\n` +
      `📜 *Nomor Sertifikat:* ${certNumber}\n` +
      `🔍 *Verifikasi Keaslian Publik:* ${verificationUrl}\n` +
      `🎟️ *Voucher Potongan Rp 100.000:* *${voucherCode}* (dapat digunakan untuk Bootcamp LPK Dignity)\n\n` +
      `Semoga ilmu yang didapat membawa manfaat besar bagi karier dan prestasi Anda!`;

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:my-0 print:max-w-none">
        
        {/* Header - Hidden on Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-white print:hidden">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Pratinjau E-Sertifikat Kehadiran Resmi A4 Landscape
              </h3>
              <p className="text-[11px] text-slate-500">
                Standar akreditasi LPK Indonesia Dignity in Official Collaboration with KLTC®
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dynamic Speaker Selector / Quick Editor */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl text-xs">
              <span className="text-slate-500 font-medium text-[11px] shrink-0">Narasumber:</span>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                placeholder="Nama & Gelar Narasumber..."
                className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 w-44"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Frame (Printable Container) */}
        <div className="p-4 sm:p-6 bg-slate-100/80 overflow-x-auto print:p-0 print:bg-white">
          <div 
            id="printable-certificate-canvas"
            className="min-w-[760px] max-w-[840px] mx-auto bg-white text-slate-900 p-8 rounded-sm shadow-xl relative border-[8px] border-double border-[#D4AF37] print:shadow-none print:max-w-none print:border-[8px] print:border-[#D4AF37]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {/* Top Border & Meta Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-[#D4AF37] mb-6">
              <div>
                <div className="text-base font-black tracking-wider text-[#0A192F] uppercase">
                  LPK INDONESIA DIGNITY
                </div>
                <div className="text-[10px] font-bold text-[#AA881E] tracking-widest uppercase">
                  IN OFFICIAL COLLABORATION WITH KLTC®
                </div>
              </div>
              <div className="text-right text-[10.5px] text-slate-500 font-mono">
                <div>No. Reg: <strong className="text-[#0A192F]">{certNumber}</strong></div>
                <div>Surakarta, 14 November 2026</div>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="text-center my-6">
              <h1 className="text-2xl font-black text-[#0A192F] tracking-widest uppercase mb-1">
                SERTIFIKAT KEHADIRAN
              </h1>
              <div className="text-[10px] font-bold tracking-[0.25em] text-[#AA881E] uppercase">
                Certificate of Recognition & Participation
              </div>

              <div className="text-xs text-slate-500 italic mt-6">
                Sertifikat ini secara resmi diberikan kepada:
              </div>

              <div className="text-2xl font-bold text-[#0A192F] my-3 px-6 py-1 inline-block border-b border-dashed border-[#D4AF37]">
                {recipientName}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed max-w-xl mx-auto mt-3">
                Sebagai <strong>PESERTA (PARTICIPANT)</strong> dalam Live Interactive Morning Workshop:<br />
                <span className="font-bold text-[#0A192F]">"Mastering Stage Confidence: 3 Rahasia Psikologi Bicara Terstruktur & Berwibawa"</span><br />
                Diselenggarakan oleh LPK Indonesia Dignity bekerja sama dengan KLTC® pada Sabtu, 14 November 2026.
              </p>
            </div>

            {/* Signatures & 3D Gold Seal */}
            <div className="flex justify-between items-end mt-8 px-8">
              {/* Speaker Signature */}
              <div className="text-center w-52">
                <div className="text-[10px] text-slate-400 mb-8 font-medium">Lead Master Speaker</div>
                <div className="text-xs font-bold text-[#0A192F] pb-1 border-b border-slate-400">
                  {speakerName}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-1">{speakerTitle}</div>
              </div>

              {/* 3D Gold Seal Badge */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-2 border-double border-[#D4AF37] bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col items-center justify-center shadow-md mx-auto">
                  <span className="text-[9px] text-[#D4AF37] tracking-widest font-black">★★★</span>
                  <span className="text-[8px] font-black text-amber-900 tracking-tighter">VERIFIED</span>
                  <span className="text-[6.5px] font-bold text-amber-800">EXCELLENCE</span>
                </div>
              </div>

              {/* Dignity Director Signature */}
              <div className="text-center w-52">
                <div className="text-[10px] text-slate-400 mb-8 font-medium">Penyelenggara Resmi</div>
                <div className="text-xs font-bold text-[#0A192F] pb-1 border-b border-slate-400">
                  Dr. K.R.H.T. Puguh Dwi Kuncoro
                </div>
                <div className="text-[9.5px] text-slate-500 mt-1">Direktur Utama KLTC®</div>
              </div>
            </div>

            {/* Public Verification & Coupon Rebate Strip */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-[#D4AF37]/50 rounded flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Verifikasi" 
                    className="w-11 h-11 border border-slate-200 rounded p-0.5 bg-white shrink-0" 
                  />
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Kode Verifikasi QR Resmi</span>
                    <span className="font-mono font-bold text-[#0A192F] text-xs">
                      {verificationCode}
                    </span>
                  </div>
                </div>
                <a
                  href={`#/verify/${encodeURIComponent(verificationCode)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-700 hover:text-amber-800 underline font-semibold flex items-center gap-1 shrink-0 print:hidden"
                >
                  <span>Cek Publik</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 bg-[#0A192F] text-white rounded flex justify-between items-center text-xs">
                <div className="text-[10.5px]">
                  <strong className="text-amber-400">VOUCHER POTONGAN RP 100K:</strong> Bootcamp Sala View
                </div>
                <div className="font-mono font-bold text-amber-300 text-xs tracking-wider">
                  KODE: {voucherCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions - Hidden on Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Verifikasi'}</span>
            </button>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="hidden md:inline">Rasio A4 Landscape</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition active:scale-[0.98]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Kirim WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
