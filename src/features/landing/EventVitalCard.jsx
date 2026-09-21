import React from 'react';
import { Calendar, Clock, MapPin, Users, Award, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatEventDateRange, formatDisplayTimeRange } from './landingUtils';
import { formatRupiah } from '../../utils/formatters';
import { resolveLandingConfig } from './landingContentDefaults';

/**
 * EventVitalCard
 * Kartu Ringkasan Eksekutif (Executive Dossier) berstandar institusi resmi LPK Indonesia Dignity.
 * Desain: Utilitarian Minimalism & Quiet Luxury.
 * Tanpa banner spanduk tebal, bebas kotak pastel pelangi, hairline dividers presisi.
 */
export default function EventVitalCard({ event, onRegisterClick, seatsLeft, isRundownVisible = true }) {
  const landingConfig = resolveLandingConfig(event);
  const vital = landingConfig.vital_card;
  const isWebinar = event?.event_type === 'WEBINAR' || event?.title?.toLowerCase().includes('webinar');
  const locationText = event?.venue || (isWebinar ? 'Live Zoom Cloud Meeting (Interaktif Langsung)' : 'Lokasi Pelatihan Tatap Muka');
  const mapsUrl = event?.maps_url || (event?.venue && !isWebinar ? `https://maps.google.com/?q=${encodeURIComponent(event.venue)}` : null);

  const dateRangeDisplay = formatEventDateRange(event?.date_start, event?.date_end);
  const timeDisplay = formatDisplayTimeRange(event?.date_start, event?.date_end);

  return (
    <div className="w-full max-w-5xl mx-auto my-10 bg-white rounded-2xl border border-stone-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden text-left">
      
      {/* ── 1. DOSSIER HEADER (CLEAN HAIRLINE BAR) ──────────────────────────── */}
      <div className="px-6 sm:px-8 py-3.5 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] sm:text-xs font-mono tracking-widest text-stone-500 uppercase font-semibold">
            LPK INDONESIA DIGNITY // DOSSIER ACARA
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-stone-300" />
          <span className="hidden sm:inline-block text-[11px] font-medium text-stone-600">
            {isWebinar ? 'Format: Webinar Daring Interaktif' : 'Format: Pelatihan Tatap Muka Hotel'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-200/60 text-stone-700 text-[10px] sm:text-[11px] font-medium tracking-wide">
            <ShieldCheck className="w-3 h-3 text-stone-600" />
            <span>Terakreditasi Resmi</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium text-stone-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 breathing-dot" />
            <span>Pendaftaran Terbuka</span>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE ITINERARY GRID (2x2 MONOCHROME HAIRLINE) ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 border-b border-stone-200 bg-white">
        
        {/* Kolom 1: Kapan (Hari, Tanggal, & Jam) */}
        <div className="p-6 sm:p-8 flex items-start gap-4 hover:bg-stone-50/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-4 h-4 text-stone-700 stroke-[1.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest">
                01 / JADWAL & WAKTU
              </span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight mt-1">
              {dateRangeDisplay}
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-500 mt-1">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>Pukul <strong className="text-stone-700 font-semibold">{timeDisplay}</strong></span>
            </div>
          </div>
        </div>

        {/* Kolom 2: Di Mana (Tempat / Platform Pelatihan) */}
        <div className="p-6 sm:p-8 flex items-start gap-4 hover:bg-stone-50/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-stone-700 stroke-[1.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest">
                02 / VENUE & PLATFORM
              </span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight mt-1">
              {locationText}
            </div>
            {!isWebinar ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2 mt-1.5 font-medium"
              >
                <span>Petunjuk Lokasi Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-xs text-stone-500 block mt-1 leading-relaxed">
                {vital?.location_note || 'Tautan resmi Zoom & ID koordinasi dikirimkan ke WhatsApp & Email'}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Baris Bawah Grid 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 border-b border-stone-200 bg-white">
        
        {/* Kolom 3: Hak Sertifikat & Fasilitas Resmi */}
        <div className="p-6 sm:p-8 flex items-start gap-4 hover:bg-stone-50/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
            <Award className="w-4 h-4 text-stone-700 stroke-[1.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest">
                03 / SERTIFIKASI & MATERI
              </span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight mt-1">
              {vital?.certificate_title || (isWebinar ? 'E-Sertifikat Nasional Ber-QR Code' : 'Sertifikat Kelulusan & Seminar Kit Lengkap')}
            </div>
            <div className="text-xs text-stone-500 mt-1 leading-relaxed">
              {vital?.certificate_desc || (isWebinar
                ? 'Termasuk Modul Ringkasan & Checklist Panggung (PDF) serta Akses Rekaman Video Pelatihan HD 14 Hari Penuh.'
                : 'Makan siang prasmanan hotel bintang empat, 2x rehat kopi, seminar kit totebag, & modul cetak.')}
            </div>
          </div>
        </div>

        {/* Kolom 4: Ketersediaan Kursi */}
        <div className="p-6 sm:p-8 flex items-start gap-4 hover:bg-stone-50/40 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-4 h-4 text-stone-700 stroke-[1.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest">
                04 / KETERSEDIAAN KUOTA
              </span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-stone-900 tracking-tight mt-1 flex items-center gap-2">
              <span>Tersisa {seatsLeft > 0 ? seatsLeft : 'Kuota Terbatas'} Kursi</span>
            </div>
            <div className="text-xs text-stone-500 mt-1 leading-relaxed">
              Kapasitas peserta dibatasi agar sesi bimbingan dan interaksi berjalan intensif.
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. ACTION BAR (INVESTASI BERSIH & TOMBOL CHARCOAL) ───────────────── */}
      <div className="px-6 sm:px-8 py-5 bg-stone-50/60 flex flex-col sm:flex-row items-center justify-between gap-5">
        
        <div className="text-center sm:text-left">
          <div className="text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest">
            INVESTASI PROGRAM:
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight mt-0.5">
            {event?.promo_price ? (
              <div className="flex items-baseline gap-2.5">
                <span className="font-semibold text-stone-900">{formatRupiah(event.promo_price)}</span>
                {event.base_price && (
                  <span className="text-sm line-through text-stone-400 font-normal">
                    {formatRupiah(event.base_price)}
                  </span>
                )}
              </div>
            ) : event?.base_price ? (
              <span className="font-semibold text-stone-900">{formatRupiah(event.base_price)}</span>
            ) : (
              <span className="text-stone-900 font-semibold">Pendaftaran Dibuka</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
          {/* Tombol Anchor Rundown */}
          <a
            href="#rundown-acara"
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs sm:text-sm font-medium shadow-2xs btn-press flex items-center justify-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-stone-600" />
            <span>{isRundownVisible ? 'Lihat Rundown' : 'Info Jadwal & Rundown'}</span>
          </a>

          {/* Tombol Aksi Utama Charcoal */}
          <button
            type="button"
            onClick={onRegisterClick}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-white text-xs sm:text-sm font-semibold shadow-sm btn-press flex items-center justify-center gap-2 transition-colors"
          >
            <span>Daftar Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
          </button>
        </div>

      </div>

    </div>
  );
}
