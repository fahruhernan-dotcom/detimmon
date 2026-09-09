import React, { useState } from 'react';
import { Calendar, ChevronDown, Plus, Check, Layers, Link2 } from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import CreateEventModal from './CreateEventModal';

export default function EventSelector({ onOpenPortfolio }) {
  const { events, activeEvent, activeEventId, setActiveEventId } = useEvent();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.98]"
        title="Ganti Event Aktif atau Buka Portfolio"
      >
        <Calendar className="w-3.5 h-3.5 text-amber-600" />
        <span className="max-w-[180px] sm:max-w-[220px] truncate text-slate-900 font-bold">
          {activeEvent?.title || 'Pilih Event'}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-mono font-bold ${
          activeEvent?.event_type === 'WEBINAR'
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : activeEvent?.event_type === 'BOOTCAMP'
            ? 'bg-amber-50 text-amber-900 border border-amber-200'
            : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
        }`}>
          {activeEvent?.event_type || 'WEBINAR'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
            {/* Top Shortcut to Macro Portfolio */}
            {onOpenPortfolio && (
              <div className="pb-1.5 border-b border-slate-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPortfolio();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 text-amber-950 font-bold text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Portfolio & Pipeline Acara (Makro)</span>
                  </div>
                  <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-amber-800 border border-amber-200 font-mono">
                    POV Luas
                  </span>
                </button>
              </div>
            )}

            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pilih Command Center Acara:
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {events.map((evt) => {
                const isActive = evt.id === activeEventId;
                const nextEvt = evt.next_event_id ? events.find(e => e.id === evt.next_event_id) : null;

                return (
                  <button
                    key={evt.id}
                    onClick={() => {
                      setActiveEventId(evt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start justify-between gap-2 p-2.5 rounded-xl text-left text-xs transition ${
                      isActive 
                        ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300 shadow-2xs' 
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-mono font-extrabold ${
                          evt.event_type === 'WEBINAR' ? 'bg-blue-100 text-blue-800' :
                          evt.event_type === 'BOOTCAMP' ? 'bg-amber-100 text-amber-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {evt.event_type}
                        </span>
                        <span className="block truncate text-slate-900 font-bold">{evt.title}</span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{new Date(evt.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <span>•</span>
                        <span className="truncate">{evt.venue}</span>
                      </div>

                      {nextEvt && (
                        <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 truncate font-medium">
                          <Link2 className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">Tersambung ke: {nextEvt.title}</span>
                        </div>
                      )}
                    </div>
                    {isActive && <Check className="w-4 h-4 text-amber-600 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buat Acara Baru</span>
              </button>
            </div>
          </div>
        </>
      )}

      <CreateEventModal 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
