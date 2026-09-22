import React from 'react';
import { Calendar, MapPin, Users, Link2 } from 'lucide-react';

/**
 * EditEventTab1Detail — Tab 1: Detail Utama & Jadwal
 * Props: semua state + setter dari EditEventModal
 */
export default function EditEventTab1Detail({
  title, setTitle,
  funnelTagline, setFunnelTagline,
  eventType, setEventType,
  status, setStatus,
  dateStart, setDateStart,
  dateEnd, setDateEnd,
  venue, setVenue,
  basePrice, setBasePrice,
  promoPrice, setPromoPrice,
  capacity, setCapacity,
  nextEventId, setNextEventId,
  availableTargets
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Judul Program / Pelatihan *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Mastering Stage Confidence: Bicara Memikat, Karir Melesat"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Tagline Singkat / Funnel Description
        </label>
        <input
          type="text"
          value={funnelTagline}
          onChange={(e) => setFunnelTagline(e.target.value)}
          placeholder="Contoh: Bimbingan intensif menaklukkan demam panggung dan vokal wibawa"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Acara</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="WEBINAR">Webinar Online</option>
            <option value="BOOTCAMP">Bootcamp Offline (Tatap Muka)</option>
            <option value="WORKSHOP">Workshop Khusus / Masterclass</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Status Publikasi</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="PUBLISHED">PUBLISHED (Aktif & Terbuka)</option>
            <option value="DRAFT">DRAFT (Konsep / Tertutup)</option>
            <option value="ONGOING">ONGOING (Sedang Berjalan)</option>
            <option value="COMPLETED">COMPLETED (Selesai)</option>
            <option value="ARCHIVED">ARCHIVED (Arsip)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Waktu Mulai</span>
          </label>
          <input
            type="datetime-local"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Waktu Selesai</span>
          </label>
          <input
            type="datetime-local"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>Lokasi / Platform Tempat Acara</span>
        </label>
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Contoh: Zoom Cloud Meeting atau Sala View Hotel Solo"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Harga Normal (Rp)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Harga Promo (Rp)</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={promoPrice}
            onChange={(e) => setPromoPrice(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Kapasitas (Pax)</span>
          </label>
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Rantai Acara Lanjutan */}
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
        <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-amber-700" />
          <span>Sangkutkan ke Acara Sasaran Lanjutan (Funnel Bridge):</span>
        </label>
        <select
          value={nextEventId}
          onChange={(e) => setNextEventId(e.target.value)}
          className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">-- Belum Ada Target Lanjutan --</option>
          {(availableTargets || []).map(evt => (
            <option key={evt.id} value={evt.id}>
              [{evt.event_type}] {evt.title} ({evt.venue || 'Offline'})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-amber-800">
          Peserta yang menyelesaikan acara ini akan diarahkan secara otomatis ke acara lanjutan tersebut.
        </p>
      </div>
    </div>
  );
}
