import React from 'react';
import { Sparkles, BookOpen, Award, HelpCircle, Plus, Trash2, Clock, Eye, EyeOff } from 'lucide-react';

/**
 * EditEventTab3CMS — Tab 3: Konten Landing Page (CMS)
 */
export default function EditEventTab3CMS({
  heroKicker, setHeroKicker,
  landingHeadline, setLandingHeadline,
  landingSubheadline, setLandingSubheadline,
  curriculumPillars, setCurriculumPillars,
  facilities, setFacilities,
  faqs, setFaqs,
  showRundown, setShowRundown,
  rundownPublishDate, setRundownPublishDate,
  rundownTeaserNote, setRundownTeaserNote,
  onApplyPreset
}) {
  return (
    <div className="space-y-5">

      {/* Preset Template Bar */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Template Konten Siap Pakai (1-Klik):</span>
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">
            Otomatis mengisi draft pilar kurikulum, fasilitas, dan FAQ sesuai format pelatihan.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onApplyPreset('WEBINAR')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs btn-press"
          >
            ⚡ Template Webinar
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('BOOTCAMP')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs btn-press"
          >
            ⚡ Template Bootcamp
          </button>
        </div>
      </div>

      {/* Hero Kicker & Headline */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="text-xs font-bold text-slate-900">Header & Hero Headline</div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Label Kicker / Badge Teratas
          </label>
          <input
            type="text"
            value={heroKicker}
            onChange={(e) => setHeroKicker(e.target.value)}
            placeholder="Contoh: Program Sertifikasi Kompetensi Resmi"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Judul Utama Headline Penawaran
          </label>
          <input
            type="text"
            value={landingHeadline}
            onChange={(e) => setLandingHeadline(e.target.value)}
            placeholder="Judul besar penarik perhatian di layar utama..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Sub-Headline / Deskripsi Penjelasan
          </label>
          <textarea
            rows={2}
            value={landingSubheadline}
            onChange={(e) => setLandingSubheadline(e.target.value)}
            placeholder="Penjelasan ringkas manfaat pelatihan..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      {/* Pengaturan Visibilitas & Penjadwalan Rundown */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Visibilitas &amp; Penjadwalan Rundown Publik</h3>
              <p className="text-[11px] text-slate-500">Atur apakah susunan jadwal kegiatan langsung tampil atau ditunda rilisnya</p>
            </div>
          </div>

          {/* Status Badge Realtime */}
          <div>
            {!showRundown ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                <EyeOff className="w-3 h-3" /> Jangan Tampilkan Dulu
              </span>
            ) : rundownPublishDate && new Date(rundownPublishDate).getTime() > Date.now() ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                <Clock className="w-3 h-3 text-amber-600" /> Terjadwal Otomatis
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <Eye className="w-3 h-3 text-emerald-600" /> Tampil ke Publik
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3.5">
          {/* Toggle: Izinkan Tampil */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>Izinkan Rundown Tampil di Landing Page</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {showRundown
                  ? 'Rundown diizinkan tampil ke calon peserta (mengikuti jadwal rilis otomatis di bawah jika diatur).'
                  : 'Rundown disembunyikan sementara dari publik (Draft/Kurasi). Landing page akan menampilkan kartu pengumuman kurasi.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={showRundown}
                onChange={(e) => setShowRundown(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Input Tanggal & Jam */}
          <div className="pt-2.5 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Mulai Tampilkan Tanggal &amp; Jam Berapa (Otomatis Rilis)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={rundownPublishDate}
                onChange={(e) => setRundownPublishDate(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
              {rundownPublishDate && (
                <button
                  type="button"
                  onClick={() => setRundownPublishDate('')}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                  title="Hapus jadwal (langsung tampilkan sekarang)"
                >
                  Reset (Langsung Tampil)
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Kosongkan jika ingin langsung tampil tanpa jadwal rilis. Jika ditentukan tanggal masa depan, sistem secara otomatis merilis rundown saat waktu tersebut tiba.
            </p>
          </div>

          {/* Pesan Teaser */}
          <div className="pt-2.5 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Pesan Pengumuman / Catatan Teaser (Saat Rundown Belum Rilis)
            </label>
            <textarea
              rows={2}
              value={rundownTeaserNote}
              onChange={(e) => setRundownTeaserNote(e.target.value)}
              placeholder="Contoh: Susunan detail agenda menit-ke-menit sedang difinalisasi bersama Master Trainer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Pesan pengumuman ini akan dibaca oleh pengunjung landing page pada seksi rundown sebelum dirilis resmi.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Pilar Kurikulum */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>3 Pilar Kurikulum Pembelajaran</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextNum = String(curriculumPillars.length + 1).padStart(2, '0');
              setCurriculumPillars([...curriculumPillars, { number: nextNum, title: 'Materi Baru', description: '', focus: 'Fokus Kompetensi' }]);
            }}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Tambah Pilar
          </button>
        </div>

        <div className="space-y-3">
          {curriculumPillars.map((pillar, idx) => (
            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 relative">
              <div className="flex items-center justify-between gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 font-mono text-[11px] font-extrabold flex items-center justify-center text-slate-700">
                  {pillar.number || `0${idx + 1}`}
                </span>
                <input
                  type="text"
                  value={pillar.title}
                  onChange={(e) => {
                    const updated = [...curriculumPillars];
                    updated[idx].title = e.target.value;
                    setCurriculumPillars(updated);
                  }}
                  placeholder="Judul Pilar Kompetensi..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                {curriculumPillars.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurriculumPillars(curriculumPillars.filter((_, pIdx) => pIdx !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={pillar.description}
                onChange={(e) => {
                  const updated = [...curriculumPillars];
                  updated[idx].description = e.target.value;
                  setCurriculumPillars(updated);
                }}
                placeholder="Deskripsi detail apa yang dipelajari peserta..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 focus:outline-none focus:border-amber-500 resize-none"
              />
              <input
                type="text"
                value={pillar.focus || ''}
                onChange={(e) => {
                  const updated = [...curriculumPillars];
                  updated[idx].focus = e.target.value;
                  setCurriculumPillars(updated);
                }}
                placeholder="Label fokus (Contoh: Fokus: Penguasaan Mental & Demam Panggung)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-500 font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fasilitas Acara */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          <span>Fasilitas yang Diterima Peserta</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {facilities.map((fac, idx) => (
            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <input
                type="text"
                value={fac.title}
                onChange={(e) => {
                  const updated = [...facilities];
                  updated[idx].title = e.target.value;
                  setFacilities(updated);
                }}
                placeholder="Nama fasilitas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <textarea
                rows={2}
                value={fac.description}
                onChange={(e) => {
                  const updated = [...facilities];
                  updated[idx].description = e.target.value;
                  setFacilities(updated);
                }}
                placeholder="Keterangan fasilitas..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tanya Jawab (FAQ) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Tanya Jawab Umum (FAQ)</span>
          </div>
          <button
            type="button"
            onClick={() => setFaqs([...faqs, { q: 'Pertanyaan baru?', a: 'Jawaban penjelasan...' }])}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Tambah FAQ
          </button>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={faq.q}
                  onChange={(e) => {
                    const updated = [...faqs];
                    updated[idx].q = e.target.value;
                    setFaqs(updated);
                  }}
                  placeholder="Pertanyaan..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                {faqs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFaqs(faqs.filter((_, fIdx) => fIdx !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={faq.a}
                onChange={(e) => {
                  const updated = [...faqs];
                  updated[idx].a = e.target.value;
                  setFaqs(updated);
                }}
                placeholder="Jawaban penjelasan ramah untuk peserta..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
