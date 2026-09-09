import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Upload,
  User,
  Mail,
  ShieldCheck,
  Video,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Calendar,
  MapPin,
  Lock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { attendanceService } from '../../services/attendanceService';
import { formatDate } from '../../utils/formatters';

export default function PublicAttendanceForm() {
  const { events } = useEvent();

  // Resolusi event dari parameter URL ?event=<slug> atau default ke event pertama yang relevan
  const [eventSlug, setEventSlug] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const slugFromUrl = params.get('event');
    if (slugFromUrl) {
      setEventSlug(slugFromUrl);
    }
  }, []);

  const currentEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    if (eventSlug) {
      return events.find(e => e.slug === eventSlug || e.id === eventSlug) || events[0];
    }
    return events[0];
  }, [events, eventSlug]);

  // State Form
  const [sessionType, setSessionType] = useState('CHECK_IN'); // 'CHECK_IN' | 'CHECK_OUT'
  const [email, setEmail] = useState('');
  const [zoomDisplayName, setZoomDisplayName] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Handle file preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File wajib berupa gambar screenshot (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5 MB.');
      return;
    }

    setErrorMsg('');
    setScreenshotFile(file);

    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessData(null);

    if (!currentEvent?.id) {
      setErrorMsg('Acara tidak ditemukan. Pastikan tautan presensi valid.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Silakan masukkan alamat email yang valid.');
      return;
    }

    if (!zoomDisplayName.trim()) {
      setErrorMsg('Silakan masukkan nama yang Anda gunakan di ruang Zoom.');
      return;
    }

    if (!screenshotFile && !screenshotPreview) {
      setErrorMsg('Wajib mengunggah screenshot bukti layar Zoom Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await attendanceService.submitParticipantAttendance({
        eventId: currentEvent.id,
        email: email.trim(),
        sessionType,
        zoomDisplayName: zoomDisplayName.trim(),
        screenshotUrl: screenshotPreview || ''
      });

      setSuccessData(result);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses presensi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnotherSession = () => {
    setSuccessData(null);
    setScreenshotFile(null);
    setScreenshotPreview('');
    // Toggle to next session for convenience
    setSessionType(prev => prev === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-amber-500/20">
              D
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
                LPK Dignity • KLTC®
              </div>
              <div className="text-[11px] text-amber-400/90 font-medium">
                Portal Presensi Digital Sesi Live
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Fraud Protected</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full p-4 sm:p-6 my-auto z-10 space-y-6">
        {/* Event Banner Card */}
        {currentEvent && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-mono">
                {currentEvent.event_type}
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{new Date(currentEvent.date_start).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
              {currentEvent.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Video className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{currentEvent.venue || 'Zoom Cloud Meeting'}</span>
            </div>
          </div>
        )}

        {/* Success View */}
        {successData ? (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Presensi Tervalidasi ✓
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white pt-2">
                Terima Kasih, {successData.full_name}!
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {successData.message} Kehadiran Anda telah dicatat secara aman pada database verifikasi E-Sertifikat LPK Dignity.
              </p>
            </div>

            {/* Attendance Details Card */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Nama Lengkap:</span>
                <span className="text-slate-200 font-bold">{successData.full_name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Email Terdaftar:</span>
                <span className="text-slate-200">{successData.email}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sesi Presensi:</span>
                <span className="text-amber-400 font-bold">
                  {successData.session_type === 'CHECK_IN' ? 'Sesi 01 (Awal / Masuk)' : 'Sesi 02 (Akhir / Selesai)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Waktu Submit:</span>
                <span className="text-slate-300">
                  {new Date(successData.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </div>
            </div>

            {/* Requirement Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 text-left leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Ketentuan E-Sertifikat & Voucher Alumni:</strong>
                <p className="text-amber-200/90 mt-0.5">
                  E-Sertifikat resmi hanya diterbitkan bagi peserta yang memenuhi <strong>kedua sesi presensi (Awal dan Akhir)</strong>. Pastikan Anda mengisi presensi penutupan saat materi webinar selesai!
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetForAnotherSession}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
              >
                Isi Presensi Sesi Lainnya
              </button>
            </div>
          </div>
        ) : (
          /* Form Input View */
          <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Formulir Presensi Live Peserta</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Lengkapi identitas email terdaftar dan unggah bukti tangkapan layar Zoom Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-3 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Presensi Ditolak:</strong> {errorMsg}
                </div>
              </div>
            )}

            {/* 1. Pilih Sesi Presensi */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pilih Tahap Sesi Presensi:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSessionType('CHECK_IN')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                    sessionType === 'CHECK_IN'
                      ? 'bg-blue-500/15 border-blue-500 text-white ring-2 ring-blue-500/20'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    sessionType === 'CHECK_IN' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    01
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Sesi Awal (Masuk)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Saat bergabung di ruang Zoom</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSessionType('CHECK_OUT')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                    sessionType === 'CHECK_OUT'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    sessionType === 'CHECK_OUT' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    02
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Sesi Akhir (Penutupan)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Saat materi selesai / evaluasi</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Email Terdaftar */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Alamat Email Pendaftaran (Sesuai Saat Membayar): *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono transition"
              />
              <p className="text-[11px] text-slate-500">
                Sistem database akan memverifikasi bahwa email Anda terdaftar dan lunas pada acara ini.
              </p>
            </div>

            {/* 3. Display Name Zoom */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Nama Layar (Display Name) di Zoom: *</span>
              </label>
              <input
                type="text"
                required
                value={zoomDisplayName}
                onChange={(e) => setZoomDisplayName(e.target.value)}
                placeholder="Contoh: Budi Santoso - Solo"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
              <p className="text-[11px] text-slate-500">
                Gunakan nama yang sama dengan nama yang tertera di ruang Zoom meeting Anda.
              </p>
            </div>

            {/* 4. Upload Screenshot Zoom */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Unggah Screenshot Layar Zoom: *</span>
              </label>

              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-2xl p-4 text-center transition">
                {screenshotPreview ? (
                  <div className="space-y-3">
                    <img
                      src={screenshotPreview}
                      alt="Pratinjau Bukti Zoom"
                      className="max-h-48 mx-auto rounded-xl border border-slate-700 object-contain shadow-md"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition border border-slate-700">
                        Ganti Gambar
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-4 space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-amber-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      Klik untuk memilih screenshot layar Zoom
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tampilkan layar Zoom yang memperlihatkan nama Anda (JPG, PNG, WebP maks 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 text-center sm:text-left">
                Proteksi 1x presensi per akun per sesi.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Presensi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-600">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 LPK Indonesia Dignity. Seluruh Hak Cipta Dilindungi.</span>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20LPK%20Dignity,%20saya%20mengalami%20kendala%20presensi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Butuh Bantuan? Hubungi Admin WhatsApp</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
