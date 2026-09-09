import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  CheckCircle2,
  Link2,
  Pencil,
  Loader2,
  Tag,
  AlertCircle,
  Folder,
  ExternalLink,
  Sparkles,
  Key,
  Check
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';

// Helper to convert date to datetime-local input format using local timezone
function toDateTimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function EditEventModal({ isOpen, onClose, event }) {
  const { events, refreshEvents, updateEvent } = useEvent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [title, setTitle] = useState('');
  const [funnelTagline, setFunnelTagline] = useState('');
  const [eventType, setEventType] = useState('BOOTCAMP');
  const [status, setStatus] = useState('PUBLISHED');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [venue, setVenue] = useState('');
  const [basePrice, setBasePrice] = useState(0);
  const [promoPrice, setPromoPrice] = useState(0);
  const [capacity, setCapacity] = useState(50);
  const [nextEventId, setNextEventId] = useState('');
  
  // Dynamic Web Registration & Integrations
  const [waGroupUrl, setWaGroupUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [zoomMeetingUrl, setZoomMeetingUrl] = useState('');
  const [landingHeadline, setLandingHeadline] = useState('');
  const [landingSubheadline, setLandingSubheadline] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerTitle, setSpeakerTitle] = useState('');
  const [speakerBio, setSpeakerBio] = useState('');
  const [googleOAuthToken, setGoogleOAuthToken] = useState(() => localStorage.getItem('digniti_google_oauth_token') || null);
  const [isGeneratingDrive, setIsGeneratingDrive] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [gdriveFolderId, setGdriveFolderId] = useState('');
  const [gdriveFolderUrl, setGdriveFolderUrl] = useState('');
  const [gdriveSubfolders, setGdriveSubfolders] = useState({});

  // Populate form when event changes or modal opens
  useEffect(() => {
    if (event && isOpen) {
      setTitle(event.title || '');
      setFunnelTagline(event.funnel_tagline || '');
      setEventType(event.event_type || 'BOOTCAMP');
      setStatus(event.status || 'PUBLISHED');
      setDateStart(toDateTimeLocal(event.date_start));
      setDateEnd(toDateTimeLocal(event.date_end));
      setVenue(event.venue || '');
      setBasePrice(event.base_price ?? 0);
      setPromoPrice(event.promo_price ?? (event.base_price ?? 0));
      setCapacity(event.capacity ?? 50);
      setNextEventId(event.next_event_id || '');

      const webCfg = event.web_registration_config || {};
      setWaGroupUrl(webCfg.wa_group_url || '');
      setDriveFolderId(webCfg.gdrive_proof_folder_id || '');
      setGdriveFolderId(webCfg.gdrive_folder_id || '');
      setGdriveFolderUrl(webCfg.gdrive_folder_url || (webCfg.gdrive_folder_id ? `https://drive.google.com/drive/folders/${webCfg.gdrive_folder_id}` : ''));
      setGdriveSubfolders(webCfg.gdrive_subfolders || {});
      setZoomMeetingUrl(webCfg.zoom_meeting_url || '');

      const lndCfg = event.landing_page_config || {};
      setLandingHeadline(lndCfg.hero_headline || '');
      setLandingSubheadline(lndCfg.hero_subheadline || '');
      setSpeakerName(lndCfg.speaker?.name || '');
      setSpeakerTitle(lndCfg.speaker?.title || '');
      setSpeakerBio(lndCfg.speaker?.bio || '');

      setError(null);
      setSuccessMsg(null);
    }
  }, [event, isOpen]);

  const handleGenerateDriveWorkspace = async () => {
    let token = googleOAuthToken;
    if (!token) {
      setIsAuthorizing(true);
      try {
        token = await new Promise((resolve, reject) => {
          requestGoogleAccessToken(
            '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com',
            (t) => resolve(t),
            (err) => reject(new Error(typeof err === 'string' ? err : 'Gagal otorisasi'))
          );
        });
        setGoogleOAuthToken(token);
        localStorage.setItem('digniti_google_oauth_token', token);
      } catch (authErr) {
        setError('Gagal menghubungkan Google Drive: ' + authErr.message);
        setIsAuthorizing(false);
        return;
      } finally {
        setIsAuthorizing(false);
      }
    }

    setIsGeneratingDrive(true);
    setError(null);
    try {
      const workspace = await createEventDriveWorkspace({
        accessToken: token,
        eventTitle: title || event.title
      });

      setDriveFolderId(workspace.proofFolderId);
      setGdriveFolderId(workspace.mainFolderId);
      setGdriveFolderUrl(workspace.mainFolderUrl);
      setGdriveSubfolders(workspace.subfolders);

      // Sinkronkan langsung ke database Supabase & context
      await updateWebRegistrationConfig(event.id, {
        gdrive_folder_id: workspace.mainFolderId,
        gdrive_folder_url: workspace.mainFolderUrl,
        gdrive_proof_folder_id: workspace.proofFolderId,
        gdrive_subfolders: workspace.subfolders
      });

      setSuccessMsg('Struktur folder Google Drive berhasil dibuat dan ditautkan ke event ini!');
    } catch (err) {
      setError('Gagal membuat struktur folder Google Drive: ' + err.message);
    } finally {
      setIsGeneratingDrive(false);
    }
  };

  if (!isOpen || !event) return null;

  const availableTargets = events.filter(e => e.id !== event.id);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const existingWebConfig = (event.web_registration_config && typeof event.web_registration_config === 'object') ? event.web_registration_config : {};
    const updatedWebConfig = {
      ...existingWebConfig,
      wa_group_url: waGroupUrl.trim(),
      gdrive_folder_id: gdriveFolderId || existingWebConfig.gdrive_folder_id || '',
      gdrive_folder_url: gdriveFolderUrl || existingWebConfig.gdrive_folder_url || '',
      gdrive_proof_folder_id: driveFolderId.trim(),
      gdrive_subfolders: Object.keys(gdriveSubfolders).length > 0 ? gdriveSubfolders : (existingWebConfig.gdrive_subfolders || {}),
      zoom_meeting_url: zoomMeetingUrl.trim()
    };

    const existingLandingConfig = (event.landing_page_config && typeof event.landing_page_config === 'object') ? event.landing_page_config : {};
    const updatedLandingConfig = {
      ...existingLandingConfig,
      hero_headline: landingHeadline.trim() || title.trim(),
      hero_subheadline: landingSubheadline.trim() || undefined,
      speaker: {
        name: speakerName.trim() || undefined,
        title: speakerTitle.trim() || undefined,
        bio: speakerBio.trim() || undefined
      }
    };

    const updatedFields = {
      title,
      funnel_tagline: funnelTagline,
      event_type: eventType,
      status,
      date_start: dateStart ? new Date(dateStart).toISOString() : event.date_start,
      date_end: dateEnd ? new Date(dateEnd).toISOString() : event.date_end,
      venue,
      base_price: Number(basePrice) || 0,
      promo_price: Number(promoPrice) || 0,
      capacity: Number(capacity) || 50,
      next_event_id: nextEventId || null,
      funnel_role: eventType === 'WEBINAR' ? 'PRE_EVENT' : (eventType === 'BOOTCAMP' ? 'CORE_BOOTCAMP' : 'ADVANCED_WORKSHOP'),
      funnel_stage_name: eventType === 'WEBINAR' ? 'Pre-Event Funnel' : (eventType === 'BOOTCAMP' ? 'Core Program' : 'Masterclass'),
      web_registration_config: updatedWebConfig,
      landing_page_config: updatedLandingConfig
    };

    try {
      // 1. Sync to Supabase if configured
      if (isSupabaseConfigured()) {
        const { error: sbErr } = await supabase
          .from('events')
          .update(updatedFields)
          .eq('id', event.id);

        if (sbErr) {
          console.warn('Supabase update warning:', sbErr.message);
        }

        // Handle bidirectional link for next_event_id
        if (nextEventId && nextEventId !== event.next_event_id) {
          await supabase
              .from('events')
              .update({ parent_event_id: event.id })
              .eq('id', nextEventId);
          } else if (!nextEventId && event.next_event_id) {
            await supabase
              .from('events')
              .update({ parent_event_id: null })
              .eq('id', event.next_event_id);
          }
        }

      // 2. Update context state
      await updateEvent(event.id, updatedFields);
      if (refreshEvents) {
        await refreshEvents();
      }

      setSuccessMsg('Perubahan program berhasil disimpan!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan acara');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Program Pelatihan</h2>
              <p className="text-xs text-slate-500">Perbarui informasi judul, jadwal, harga, kapasitas, dan status acara</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Judul Acara */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Program / Pelatihan *
            </label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Mastering Stage Confidence..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Tagline / Subtitle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tagline Singkat / Funnel Description
            </label>
            <input 
              type="text"
              value={funnelTagline}
              onChange={(e) => setFunnelTagline(e.target.value)}
              placeholder="Contoh: Penyaring antusiasme & pengantar keahlian panggung awal"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Tipe & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Acara</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
              >
                <option value="WEBINAR">Webinar Online</option>
                <option value="BOOTCAMP">Bootcamp Offline</option>
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
                <option value="PUBLISHED">PUBLISHED (Aktif Terbuka)</option>
                <option value="DRAFT">DRAFT (Konsep / Tertutup)</option>
                <option value="ONGOING">ONGOING (Sedang Berjalan)</option>
                <option value="COMPLETED">COMPLETED (Selesai)</option>
                <option value="ARCHIVED">ARCHIVED (Arsip)</option>
              </select>
            </div>
          </div>

          {/* Jadwal Waktu */}
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

          {/* Lokasi / Venue */}
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

          {/* Pricing & Kapasitas */}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Program / Promo (Rp)</label>
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
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-700" />
              <span>Sangkutkan ke Acara Sasaran Lanjutan (Funnel Bridge):</span>
            </label>
            <select
              value={nextEventId}
              onChange={(e) => setNextEventId(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">-- Belum Ada Target Lanjutan --</option>
              {availableTargets.map(evt => (
                <option key={evt.id} value={evt.id}>
                  [{evt.event_type}] {evt.title} ({evt.venue || 'Offline'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-amber-800">
              Peserta yang menyelesaikan acara ini akan diarahkan ke acara lanjutan tersebut.
            </p>
          </div>

          {/* Integrasi Operasional & Google Drive Workspace */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
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
                  onClick={handleGenerateDriveWorkspace}
                  disabled={isGeneratingDrive || isAuthorizing}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingDrive ? 'Membuat Folder...' : '⚡ Buat Folder di Google Drive (1-Klik)'}</span>
                </button>
              )}
            </div>

            {/* Subfolders badges if exists */}
            {gdriveFolderUrl && gdriveSubfolders && Object.keys(gdriveSubfolders).length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Struktur Subfolder Teratur (Dignity Auto-Sorted):
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

            {!gdriveFolderUrl && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Event ini belum memiliki folder khusus di Google Drive. Klik tombol <strong>"⚡ Buat Folder di Google Drive"</strong> di atas untuk otomatis membuat folder utama dan 4 subfolder rapi (Bukti Transfer, Presensi, Sertifikat, Backup).
              </div>
            )}

            {/* ID Folder Bukti Bayar & Link Zoom */}
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
              <p className="text-[10px] text-slate-400 mt-1">
                Otomatis dikirim setelah pembayaran diverifikasi admin.
              </p>
            </div>
          </div>

          {/* Brosur & Landing Page Dinamis */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900">
              Pengaturan Konten Landing Page Dinamis
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Headline Utama Penawaran
              </label>
              <input
                type="text"
                value={landingHeadline}
                onChange={(e) => setLandingHeadline(e.target.value)}
                placeholder="Contoh: Mastering Stage Confidence: Bicara Memikat, Karir Melesat"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sub-Headline / Ringkasan Manfaat
              </label>
              <textarea
                rows={2}
                value={landingSubheadline}
                onChange={(e) => setLandingSubheadline(e.target.value)}
                placeholder="Deskripsi singkat yang memikat calon peserta di halaman depan..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>

          {/* Profil Fasilitator / Master Trainer Dinamis */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>Profil Fasilitator / Master Trainer</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap &amp; Gelar Trainer
                </label>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Contoh: Halimatus Sa'diyah, S.I.Kom., M.I.Kom."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gelar / Jabatan Profesional
                </label>
                <input
                  type="text"
                  value={speakerTitle}
                  onChange={(e) => setSpeakerTitle(e.target.value)}
                  placeholder="Contoh: Certified Public Speaking Master Trainer"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Bio / Kredensial Singkat Trainer
              </label>
              <textarea
                rows={2}
                value={speakerBio}
                onChange={(e) => setSpeakerBio(e.target.value)}
                placeholder="Pengalaman, rekam jejak, dan keahlian pelatih..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
