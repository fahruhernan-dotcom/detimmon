import React from 'react';
import { Folder, ExternalLink, Sparkles, Loader2 } from 'lucide-react';

/**
 * EditEventTab4Ops — Tab 4: Drive & Integrasi Operasional
 */
export default function EditEventTab4Ops({
  waGroupUrl, setWaGroupUrl,
  driveFolderId, setDriveFolderId,
  zoomMeetingUrl, setZoomMeetingUrl,
  gdriveFolderId,
  gdriveFolderUrl,
  gdriveSubfolders,
  isGeneratingDrive,
  isAuthorizing,
  onGenerateDriveWorkspace
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-sky-600" />
            <span>Google Drive Event Workspace</span>
          </div>
          {gdriveFolderUrl ? (
            <a
              href={gdriveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition"
            >
              <span>Buka Folder Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onGenerateDriveWorkspace}
              disabled={isGeneratingDrive || isAuthorizing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition shadow-2xs"
            >
              {isGeneratingDrive || isAuthorizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAuthorizing ? 'Otorisasi...' : 'Membuat Folder...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Buat Folder di Google Drive (1-Klik)</span>
                </>
              )}
            </button>
          )}
        </div>

        {gdriveFolderUrl && gdriveSubfolders && Object.keys(gdriveSubfolders).length > 0 && (
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">
              Struktur Subfolder Teratur:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              {Object.entries(gdriveSubfolders).map(([key, sub]) => (
                <a
                  key={key}
                  href={sub.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between bg-slate-50 hover:bg-sky-50 px-2 py-1.5 rounded border border-slate-200/80 text-slate-700 hover:text-sky-800 transition"
                >
                  <span className="truncate font-mono">{sub.name || key}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ID Folder Bukti Bayar (G-Drive)
            </label>
            <input
              type="text"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              placeholder="ID folder berkas..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Link Akses Zoom Meeting
            </label>
            <input
              type="text"
              value={zoomMeetingUrl}
              onChange={(e) => setZoomMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/... pwd=..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Link Undangan Grup WhatsApp Peserta
          </label>
          <input
            type="url"
            value={waGroupUrl}
            onChange={(e) => setWaGroupUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
