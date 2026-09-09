import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Unlink,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Ticket,
  Calendar,
  AlertCircle,
  Loader2,
  MapPin,
  Tag,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { formatRupiah } from '../../utils/formatters';

const PRESET_DISCOUNTS = [50000, 100000, 150000, 250000, 500000];

export default function EventChainingModal({
  isOpen,
  onClose,
  initialSourceEventId = null
}) {
  const { events, linkEvents, unlinkEvents } = useEvent();

  const [sourceId, setSourceId] = useState(initialSourceEventId || (events[0]?.id ?? ''));
  const [targetId, setTargetId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSourceEventId) {
      setSourceId(initialSourceEventId);
    } else if (events.length > 0 && !sourceId) {
      setSourceId(events[0].id);
    }
  }, [initialSourceEventId, events]);

  // When sourceId changes, populate current targetId
  useEffect(() => {
    const src = events.find(e => e.id === sourceId);
    if (src) {
      setTargetId(src.next_event_id || '');
    }
  }, [sourceId, events]);

  if (!isOpen) return null;

  const sourceEvent = events.find(e => e.id === sourceId);
  const targetEvent = events.find(e => e.id === targetId);
  const availableTargets = events.filter(e => e.id !== sourceId);

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!sourceId || !targetId) {
      setFeedback({
        type: 'error',
        message: 'Silakan tentukan acara sumber dan acara lanjutan yang ingin dihubungkan.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await linkEvents(sourceId, targetId);

      setFeedback({
        type: 'success',
        message: `Rantai berhasil terhubung! "${sourceEvent?.title?.slice(0, 28)}..." kini tersambung ke "${targetEvent?.title?.slice(0, 28)}...".`
      });

      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1400);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Gagal menghubungkan rantai acara: ' + err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    if (sourceId && targetId) {
      setIsSubmitting(true);
      try {
        await unlinkEvents(sourceId, targetId);
        setTargetId('');
        setFeedback({
          type: 'info',
          message: 'Hubungan rantai acara berhasil diputus di Supabase & lokal.'
        });
      } catch (err) {
        setFeedback({
          type: 'error',
          message: 'Gagal memutuskan rantai: ' + err.message
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Kelola Hubungan Rantai Acara
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase font-mono">
                  Funnel Bridge
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hubungkan alur acara pengantar (Webinar) ke program lanjutan (Bootcamp/Masterclass).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveLink} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {feedback && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs font-medium animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : feedback.type === 'info'
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{feedback.message}</div>
            </div>
          )}

          {/* Source & Target Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Source Event */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-mono flex items-center justify-center">1</span>
                <span>Acara Pintu Masuk (Tahap Awal):</span>
              </label>
              <div className="relative">
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl px-3.5 py-3 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer pr-10 truncate shadow-2xs"
                >
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      [{evt.event_type}] {evt.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Peserta yang menyelesaikan acara ini diarahkan ke program lanjutan.
              </p>
            </div>

            {/* 2. Target Event */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-mono flex items-center justify-center">2</span>
                <span>Sambungkan ke Acara Sasaran:</span>
              </label>
              <div className="relative">
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className={`w-full appearance-none border rounded-2xl px-3.5 py-3 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer pr-10 truncate shadow-2xs ${
                    targetId ? 'bg-amber-50/50 border-amber-300 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <option value="">-- Pilih Acara Sasaran Lanjutan --</option>
                  {availableTargets.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      [{evt.event_type}] {evt.title} ({evt.venue || 'Offline'})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Program lanjutan berikutnya dalam rantai ekosistem funnel.
              </p>
            </div>
          </div>

          {/* Visual Funnel Conversion Bridge Preview */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Alur Konversi Ekosistem Funnel
                </span>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                targetEvent ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {targetEvent ? '● Rantai Terhubung' : '○ Belum Ditautkan'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              {/* Left Box: Source Event */}
              <div className="md:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                    {sourceEvent?.event_type || 'WEBINAR'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {sourceEvent?.date_start ? new Date(sourceEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Nov 2026'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                  {sourceEvent?.title || 'Pilih Acara Sumber'}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate pt-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{sourceEvent?.venue || 'Zoom Cloud Meeting'}</span>
                </div>
              </div>

              {/* Middle: Funnel Arrow & Voucher Pill */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Right Box: Target Event */}
              <div className="md:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-1.5 min-w-0">
                {targetEvent ? (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase font-mono">
                        {targetEvent.event_type || 'BOOTCAMP'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {targetEvent.date_start ? new Date(targetEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Des 2026'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                      {targetEvent.title}
                    </div>
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 truncate pt-1 font-semibold">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{targetEvent.venue || 'Offline Venue'}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-slate-400 border border-dashed border-slate-300 rounded-lg">
                    <span className="text-xs font-medium">Pilih acara sasaran di atas</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {sourceEvent?.next_event_id ? (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 hover:border-rose-300 disabled:opacity-50 transition active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
                <span>Putus Hubungan Rantai</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!targetId || isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Menyimpan ke Supabase...' : 'Simpan Keterkaitan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
