import React from 'react';
import { Calendar, Clock, MapPin, Users, Award, ArrowRight, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { formatDisplayDate, formatDisplayTime } from './landingUtils';

/**
 * EventVitalCard
 * Kartu Ringkasan 5W1H berukuran besar, kontras tinggi, dan ramah usia 50+.
 * Menyajikan: Tanggal, Waktu, Tempat fisik / Link Zoom, Kuota sisa, Sertifikat resmi, dan CTA besar.
 */
export default function EventVitalCard({ event, onRegisterClick, onRundownScrollClick, seatsLeft }) {
  const isWebinar = event?.event_type === 'WEBINAR' || event?.title?.toLowerCase().includes('webinar');
  const locationText = event?.venue || (isWebinar ? 'Live Zoom Cloud Meeting (Link interaktif via WhatsApp & Email)' : 'Lokasi Pelatihan Tatap Muka');
  const mapsUrl = event?.maps_url || (event?.venue && !isWebinar ? `https://maps.google.com/?q=${encodeURIComponent(event.venue)}` : null);

  return (
    <div className="w-full max-w-5xl mx-auto my-6 bg-white rounded-2xl border-2 border-blue-900/20 shadow-xl shadow-blue-950/5 overflow-hidden">
      {/* Header Bar Kartu Vital */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
            {isWebinar ? '🌐 WEBINAR INTERAKTIF ONLINE' : '🏛️ PELATIHAN TATAP MUKA RESMI (OFFLINE)'}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold border border-white/20">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Sertifikat Resmi Ber-QR Code LPK Dignity</span>
        </div>
      </div>

      {/* Grid Informasi 5W1H (Teks Hitam Deep Navy di atas Putih Bersih) */}
      <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
        {/* 1. Kapan (Tanggal & Jam) */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 border border-blue-200">
            <Calendar className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hari & Tanggal Pelaksanaan</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {formatDisplayDate(event?.date_start)}
              {event?.date_end && event?.date_end !== event?.date_start && (
                <span> s/d {formatDisplayDate(event?.date_end)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 mt-1">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pukul <strong>{formatDisplayTime(event?.date_start)}</strong> s/d Selesai WIB</span>
            </div>
          </div>
        </div>

        {/* 2. Di Mana (Tempat & Lokasi Peta) */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200">
            <MapPin className="w-6 h-6 text-amber-900" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lokasi / Tempat Acara</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {locationText}
            </div>
            {!isWebinar ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline mt-1"
              >
                <span>Lihat Titik Peta Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs sm:text-sm text-slate-600 block mt-1">
                Tautan Zoom & ID akan dikirimkan otomatis ke WhatsApp & Email
              </span>
            )}
          </div>
        </div>

        {/* 3. Fasilitas & Sertifikasi */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 border border-emerald-200">
            <Award className="w-6 h-6 text-emerald-800" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hak Sertifikat & Fasilitas</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {isWebinar ? 'E-Sertifikat Nasional Ber-QR Code' : 'Sertifikat Kelulusan & Seminar Kit Eksklusif'}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {isWebinar
                ? 'Termasuk Modul PDF & Akses Rekaman Video Pelatihan HD 14 Hari.'
                : 'Makan siang prasmanan hotel, 2x rehat kopi, tas totebag, & modul cetak.'}
            </div>
          </div>
        </div>

        {/* 4. Kuota Kursi Tersisa */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center shrink-0 border border-rose-200">
            <Users className="w-6 h-6 text-rose-800" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ketersediaan Tempat</div>
            <div className="text-base sm:text-lg font-bold text-rose-700 mt-0.5 flex items-center gap-2">
              <span>Tersisa {seatsLeft > 0 ? seatsLeft : 'Hanya Beberapa'} Kursi Lagi</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                Terbatas
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">
              Pendaftaran ditutup otomatis jika kuota ruang pelatihan terpenuhi.
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Aksi Utama (Ukuran Besar & Sangat Mudah Ditekan) */}
      <div className="px-6 py-5 bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="text-xs text-slate-500 font-medium">Investasi Pelatihan Terjangkau:</div>
          <div className="text-xl sm:text-2xl font-black text-slate-950 font-display">
            {event?.promo_price ? (
              <div className="flex items-baseline gap-2">
                <span>Rp {Number(event.promo_price).toLocaleString('id-ID')}</span>
                {event.base_price && (
                  <span className="text-xs sm:text-sm line-through text-slate-400 font-normal">
                    Rp {Number(event.base_price).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            ) : event?.base_price ? (
              <span>Rp {Number(event.base_price).toLocaleString('id-ID')}</span>
            ) : (
              <span className="text-emerald-700">Pendaftaran Dibuka</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
          {/* Tombol Scroll ke Rundown */}
          <button
            type="button"
            onClick={onRundownScrollClick}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-blue-950 border-2 border-blue-900/30 text-sm sm:text-base font-bold shadow-sm transition-all hover:border-blue-900 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>👀 Lihat Rundown Acara</span>
          </button>

          {/* Tombol Aksi Utama DAFTAR SEKARANG */}
          <button
            type="button"
            onClick={onRegisterClick}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-sm sm:text-base font-black shadow-lg shadow-blue-900/20 transition-all hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            <span>📋 DAFTAR SEKARANG</span>
            <ArrowRight className="w-5 h-5 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
