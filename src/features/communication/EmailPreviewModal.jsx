import React, { useState } from 'react';
import {
  X,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Check,
  Copy,
  ExternalLink,
  MailCheck,
  AlertCircle
} from 'lucide-react';
import {
  buildTicketEmailHtml,
  buildCertificateEmailHtml,
  sendEmailViaGmail
} from '../../services/googleApiService';

export default function EmailPreviewModal({
  isOpen,
  onClose,
  registrant,
  type = 'ticket', // 'ticket' | 'certificate'
  activeEvent = null,
  googleOAuthToken = null,
  onEmailSent = null
}) {
  if (!isOpen || !registrant) return null;

  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'mobile'
  const [theme, setTheme] = useState('white'); // 'white' | 'dark'
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const eventTitle = activeEvent?.title || 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat';
  const eventDate = activeEvent?.date_start
    ? new Date(activeEvent.date_start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sabtu, 14 November 2026';

  const htmlContent = type === 'ticket'
    ? buildTicketEmailHtml(registrant, {
        theme,
        eventTitle,
        eventDate
      })
    : buildCertificateEmailHtml(
        {
          nama: registrant.nama,
          nomorSertifikat: registrant.nomorSertifikat || registrant.nomorTicket?.replace('TICKET-DIGNITY', 'LPK-DIGNITY/WEB-PS') || 'LPK-DIGNITY/WEB-PS/XI/2026/001',
          kodeVoucher: registrant.kodeVoucher || 'REBATE100K-001'
        },
        {
          theme,
          eventTitle
        }
      );

  const subject = type === 'ticket'
    ? `[E-Ticket Resmi] Webinar ${eventTitle} - ${registrant.nama}`
    : `[E-Sertifikat & Voucher] Selamat atas Kelulusan Webinar - ${registrant.nama}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };

  const handleSendNow = async () => {
    if (!googleOAuthToken) {
      setFeedback({
        success: false,
        message: 'Google OAuth belum terhubung. Silakan login di header atas.'
      });
      return;
    }

    if (!registrant.email) {
      setFeedback({
        success: false,
        message: 'Email peserta tidak ditemukan.'
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      await sendEmailViaGmail({
        accessToken: googleOAuthToken,
        to: registrant.email,
        subject,
        htmlBody: htmlContent,
        fromName: 'LPK Indonesia Dignity Official'
      });

      setFeedback({
        success: true,
        message: `Email berhasil dikirimkan ke ${registrant.email}!`
      });
      if (onEmailSent) onEmailSent(registrant);
    } catch (err) {
      setFeedback({
        success: false,
        message: err.message || 'Gagal mengirim email.'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Preview Email {type === 'ticket' ? 'E-Ticket & Akses Zoom' : 'E-Sertifikat & Voucher'}
              </h2>
              <p className="text-xs text-slate-500">
                Penerima: <span className="font-semibold text-slate-700">{registrant.nama}</span> &lt;{registrant.email || 'Email tidak diset'}&gt;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Toggles */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
              <button
                onClick={() => setViewport('desktop')}
                title="Desktop 600px"
                className={`p-1.5 rounded-lg ${viewport === 'desktop' ? 'bg-amber-50 text-amber-800' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                title="Mobile 360px"
                className={`p-1.5 rounded-lg ${viewport === 'mobile' ? 'bg-amber-50 text-amber-800' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(prev => prev === 'white' ? 'dark' : 'white')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              Tema: {theme === 'white' ? '☀️ White' : '🌙 Dark'}
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
              title="Salin Kode HTML"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Mock Email Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex flex-col items-center">
          {feedback && (
            <div className={`w-full mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {feedback.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <div
            className="rounded-xl shadow-xl overflow-hidden border border-slate-200 transition-all duration-300"
            style={{
              width: viewport === 'desktop' ? '600px' : '360px',
              maxWidth: '100%',
              minHeight: '520px',
              backgroundColor: theme === 'dark' ? '#060B13' : '#FFFFFF'
            }}
          >
            <iframe
              title="Email Modal Preview"
              srcDoc={htmlContent}
              sandbox="allow-same-origin allow-popups"
              className="w-full h-[540px] border-0"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {googleOAuthToken ? (
              <span className="text-emerald-700 font-medium">✓ Gmail API siap mengirim</span>
            ) : (
              <span className="text-amber-700 font-medium">⚠ Hubungkan akun Google untuk kirim langsung</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Tutup Preview
            </button>
            <button
              onClick={handleSendNow}
              disabled={isSending || !googleOAuthToken}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Mengirim...' : 'Kirim ke Peserta Ini'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
