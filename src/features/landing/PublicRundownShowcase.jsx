import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Coffee, Utensils, Award, Users, CheckCircle2, Mic2, Sparkles, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import { rundownService } from '../../services/rundownService';

// Konfigurasi visual badge tipe sesi ramah mata (Dignified Neutral & Subtle Accent Palette)
const SESSION_TYPE_CONFIG = {
  CEREMONY: {
    label: 'Pembukaan & Protokoler',
    bg: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: Award
  },
  KEYNOTE: {
    label: 'Kuliah Teori & Materi Utama',
    bg: 'bg-[#0A192F]/5 text-[#0A192F] border-[#0A192F]/20 font-semibold',
    icon: BookOpen
  },
  PRACTICE: {
    label: 'Praktik Panggung Langsung',
    bg: 'bg-[#0A192F] text-amber-300 border-[#0A192F] font-semibold',
    icon: Mic2
  },
  DEMO: {
    label: 'Simulasi & Evaluasi Personal',
    bg: 'bg-slate-100 text-slate-900 border-slate-300 font-medium',
    icon: Sparkles
  },
  BREAK: {
    label: 'Rehat Kopi & Snack',
    bg: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: Coffee
  },
  MEAL: {
    label: 'ISHOMA (Makan Siang & Sholat)',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Utensils
  },
  EVALUATION: {
    label: 'Ujian Mandiri & Post-Test',
    bg: 'bg-amber-50 text-amber-900 border-amber-200 font-semibold',
    icon: CheckCircle2
  }
};

export default function PublicRundownShowcase({ eventId, onRegisterClick }) {
  const [schedules, setSchedules] = useState([]);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Muat data hari acara (event_schedules)
  useEffect(() => {
    async function loadSchedules() {
      setLoading(true);
      try {
        const scheds = await rundownService.getSchedulesByEvent(eventId);
        setSchedules(scheds || []);
        if (scheds && scheds.length > 0) {
          setActiveScheduleId(scheds[0].id);
        }
      } catch (err) {
        console.warn('Gagal memuat jadwal publik:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [eventId]);

  // 2. Muat sesi menit-ke-menit untuk hari yang aktif
  useEffect(() => {
    if (!activeScheduleId) return;
    async function loadItems() {
      try {
        const sessionItems = await rundownService.getItemsBySchedule(activeScheduleId);
        setItems(sessionItems || []);
      } catch (err) {
        console.warn('Gagal memuat sesi jadwal:', err);
      }
    }
    loadItems();
  }, [activeScheduleId]);

  const activeSchedule = schedules.find(s => s.id === activeScheduleId) || schedules[0];

  return (
    <section id="rundown-acara" className="w-full py-12 px-4 sm:px-6 bg-slate-50/70 border-y border-slate-200">
      <div id="printable-rundown" className="max-w-5xl mx-auto">
        
        {/* Header Seksi */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold mb-3 tracking-wide">
            <Clock className="w-3.5 h-3.5 text-[#0A192F]" />
            <span className="uppercase tracking-wider">Jadwal Resmi & Rundown Kegiatan</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            Agenda Kegiatan & Kurikulum Praktik
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Setiap menit dirancang terstruktur agar Anda tidak hanya mendengarkan teori, melainkan langsung mempraktikkan olah vokal, bahasa tubuh, dan presentasi panggung secara terukur.
          </p>
        </div>

        {/* Tab Pilihan Hari (Besar, Jelas, & Nyaman untuk Usia 50+) */}
        {schedules.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
            {schedules.map((sched) => {
              const isActive = sched.id === activeScheduleId;
              return (
                <button
                  key={sched.id}
                  type="button"
                  onClick={() => setActiveScheduleId(sched.id)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm sm:text-base btn-press flex items-center gap-2.5 border transition-all ${
                    isActive
                      ? 'bg-[#0A192F] text-[#D4AF37] border-[#0A192F] shadow-sm'
                      : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Calendar className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                  <span>Hari ke-{sched.day_number}: {sched.title?.split(':')[0] || `Hari ${sched.day_number}`}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Kotak Informasi Hari Terpilih */}
        {activeSchedule && (
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fokus Pembelajaran:</span>
              <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {activeSchedule.title || `Jadwal Hari ke-${activeSchedule.day_number}`}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Ruangan: <strong>{activeSchedule.location_room || 'Ballroom Utama'}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={onRegisterClick}
              className="px-4 py-2 rounded-lg bg-[#0A192F] hover:bg-[#112240] text-[#D4AF37] text-xs sm:text-sm font-bold flex items-center gap-1.5 btn-press shrink-0"
            >
              <span>Amankan Kursi Pelatihan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Daftar Sesi Jam-ke-Jam */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 text-sm">
            <div className="w-8 h-8 border-3 border-[#0A192F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Memuat susunan jadwal terverifikasi...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 text-sm">
            <span>Jadwal untuk hari ini sedang difinalisasi oleh panitia.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, idx) => {
              const typeConfig = SESSION_TYPE_CONFIG[item.session_type] || SESSION_TYPE_CONFIG.KEYNOTE;
              const TypeIcon = typeConfig.icon;
              const isBreak = item.session_type === 'BREAK' || item.session_type === 'MEAL';

              return (
                <div
                  key={item.id || idx}
                  className={`rounded-2xl border card-lift ${
                    isBreak
                      ? 'bg-slate-100/80 border-slate-300'
                      : 'bg-white border-slate-200'
                  } p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  {/* Bagian Kiri: Jam & Lencana Tipe Sesi */}
                  <div className="flex items-start gap-4 min-w-[220px]">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-[#0A192F] shrink-0">
                      <Clock className="w-5 h-5 text-[#0A192F]" />
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                        {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)} WIB
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Durasi: <strong>{item.duration_minutes} Menit</strong>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border mt-2 ${typeConfig.bg}`}>
                        <TypeIcon className="w-3 h-3" />
                        <span>{typeConfig.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Bagian Tengah: Judul Materi & Deskripsi Penjelasan */}
                  <div className="flex-1 md:px-4 md:border-l border-slate-200">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    {item.speaker_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-2">
                        <span>Fasilitator:</span>
                        <strong className="text-slate-900 font-semibold">{item.speaker_name}</strong>
                      </div>
                    )}
                  </div>

                  {/* Bagian Kanan: Indikator & Action */}
                  <div className="shrink-0 flex items-center justify-end md:flex-col md:items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                      Sesi #{idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Rundown: Tombol Download & Ajakan Daftar */}
        <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left no-print print:hidden">
          <div>
            <div className="text-sm font-bold text-slate-900">
              Ingin menyimpan jadwal atau mengajukan izin dinas ke instansi?
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Rundown resmi dan susunan materi lengkap dapat diunduh atau dicetak secara langsung.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold border border-slate-300 btn-press flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onRegisterClick}
              className="px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-[#D4AF37] text-xs sm:text-sm font-bold shadow-xs btn-press flex items-center gap-1.5"
            >
              <span>Daftar Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
