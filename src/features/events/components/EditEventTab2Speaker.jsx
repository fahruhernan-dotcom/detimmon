import React from 'react';

/**
 * EditEventTab2Speaker — Tab 2: Profil Trainer & Speaker
 */
export default function EditEventTab2Speaker({
  speakerConfirmed, setSpeakerConfirmed,
  speakerName, setSpeakerName,
  speakerTitle, setSpeakerTitle,
  speakerBio, setSpeakerBio,
  speakerStatusBadge, setSpeakerStatusBadge
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-900">Konfirmasi Kehadiran Trainer</div>
          <div className="text-[11px] text-slate-500">Tentukan apakah nama instruktur sudah resmi atau masih dirahasiakan (TBA).</div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={speakerConfirmed}
            onChange={(e) => setSpeakerConfirmed(e.target.checked)}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-800">
            {speakerConfirmed ? '✅ Terkonfirmasi' : '⏳ Dalam Tahap Finalisasi (TBA)'}
          </span>
        </label>
      </div>

      {!speakerConfirmed && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-ping" />
          <span>Mode <strong>Segera Diumumkan (TBA)</strong> aktif. Landing page akan menampilkan kartu Special Guest Trainer yang elegan tanpa menyebut nama orang sembarangan.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Lengkap &amp; Gelar Trainer {speakerConfirmed ? '(Wajib)' : '(Draft/Opsional)'}
          </label>
          <input
            type="text"
            value={speakerName}
            onChange={(e) => setSpeakerName(e.target.value)}
            placeholder={speakerConfirmed ? "Contoh: Dr. Budi Santoso, M.Si, C.PS" : "Kosongkan jika masih TBA"}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Gelar / Jabatan Profesional
          </label>
          <input
            type="text"
            value={speakerTitle}
            onChange={(e) => setSpeakerTitle(e.target.value)}
            placeholder="Contoh: Certified Master Trainer & Communication Specialist"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Label Lencana Status
          </label>
          <input
            type="text"
            value={speakerStatusBadge}
            onChange={(e) => setSpeakerStatusBadge(e.target.value)}
            placeholder={speakerConfirmed ? "Instruktur Terverifikasi" : "Segera Diumumkan (TBA)"}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Bio Singkat &amp; Kredensial
          </label>
          <input
            type="text"
            value={speakerBio}
            onChange={(e) => setSpeakerBio(e.target.value)}
            placeholder="Pengalaman membimbing eksekutif & profesional..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </div>
  );
}
