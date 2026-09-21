import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Check, Video, Award } from 'lucide-react';
import { formatDisplayDate } from './landingUtils';

/**
 * EventCatalogDropdown
 * Menu Navigasi Katalog Program Pelatihan Resmi LPK Indonesia Dignity.
 * Desain: Minimalist & Classy, hairline styling menyatu dengan navbar.
 */
export default function EventCatalogDropdown({ events = [], activeEventId, onSelectEvent }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!events || events.length === 0) return null;

  const activeEvent = events.find(e => e.id === activeEventId || e.slug === activeEventId) || events[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button Minimalis & Sleek (Dignity Palette) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[#0A192F] text-xs font-medium flex items-center gap-1.5 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-slate-400 font-normal">Program:</span>
        <span className="max-w-[120px] sm:max-w-[170px] truncate text-[#0A192F] font-semibold">
          {activeEvent?.title?.split(':')[0] || activeEvent?.title || 'Pilih Acara'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Modal Minimalis Dignity */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_40px_rgba(10,25,47,0.12)] z-50 overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-150">
          
          {/* Menu Header Dignity Navy & Gold */}
          <div className="bg-[#0A192F] px-4 py-2.5 text-amber-300 border-b border-blue-900/60 flex items-center justify-between text-[10px] font-mono tracking-wider uppercase font-semibold">
            <span>KATALOG PROGRAM DIGNITY</span>
            <span className="text-amber-200/80 font-normal">
              {events.length} Jadwal
            </span>
          </div>

          {/* List of Published Events */}
          <div className="p-1.5 divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {events.map((evt) => {
              const isSelected = evt.id === activeEvent?.id || evt.slug === activeEvent?.slug;
              const isWebinar = evt.event_type === 'WEBINAR' || evt.title?.toLowerCase().includes('webinar');

              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectEvent(evt);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-start gap-3 transition-colors ${
                    isSelected
                      ? 'bg-stone-50 border border-stone-200/80'
                      : 'hover:bg-stone-50/70 border border-transparent'
                  }`}
                >
                  {/* Icon Tipe Acara Minimalis */}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                    isWebinar
                      ? 'bg-stone-100 text-stone-700 border-stone-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                    {isWebinar ? <Video className="w-3.5 h-3.5 stroke-[1.5]" /> : <Award className="w-3.5 h-3.5 stroke-[1.5]" />}
                  </div>

                  {/* Info Acara */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded uppercase bg-stone-100 text-stone-600 border border-stone-200/60">
                        {isWebinar ? 'Webinar Online' : 'Bootcamp Tatap Muka'}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-0.5 font-medium ml-auto">
                          <Check className="w-3 h-3 stroke-[2]" /> Aktif
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-xs text-stone-900 leading-snug mt-1 truncate">
                      {evt.title}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400 stroke-[1.5]" />
                        <span>{formatDisplayDate(evt.date_start)}</span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="bg-stone-50/70 px-3.5 py-2 border-t border-stone-100 text-[10px] text-stone-400 text-center font-mono">
            SERTIFIKASI RESMI LPK INDONESIA DIGNITY
          </div>

        </div>
      )}
    </div>
  );
}
