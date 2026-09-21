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
  Check,
  BookOpen,
  Award,
  HelpCircle,
  Plus,
  Trash2,
  Layers,
  FileText,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';
import { getLandingDefaults, resolveLandingConfig } from '../landing/landingContentDefaults';

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
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'speaker' | 'cms' | 'ops'

  // Tab 1: Detail Utama & Jadwal
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
  
  // Tab 2: Profil Speaker
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);
  const [speakerStatusBadge, setSpeakerStatusBadge] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerTitle, setSpeakerTitle] = useState('');
  const [speakerBio, setSpeakerBio] = useState('');

  // Tab 3: Konten Landing Page (CMS)
  const [heroKicker, setHeroKicker] = useState('');
  const [landingHeadline, setLandingHeadline] = useState('');
  const [landingSubheadline, setLandingSubheadline] = useState('');
  const [curriculumPillars, setCurriculumPillars] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [showRundown, setShowRundown] = useState(true);
  const [rundownPublishDate, setRundownPublishDate] = useState('');
  const [rundownTeaserNote, setRundownTeaserNote] = useState('');

  // Tab 4: Operasional & Integrasi
  const [waGroupUrl, setWaGroupUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [zoomMeetingUrl, setZoomMeetingUrl] = useState('');
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

      // Resolve full CMS landing config
      const resolvedLnd = resolveLandingConfig(event);
      const lndCfg = event.landing_page_config || {};

      setHeroKicker(lndCfg.hero?.kicker || resolvedLnd.hero.kicker);
      setLandingHeadline(lndCfg.hero?.headline || lndCfg.hero_headline || resolvedLnd.hero.headline);
      setLandingSubheadline(lndCfg.hero?.subheadline || lndCfg.hero_subheadline || resolvedLnd.hero.subheadline);
      setCurriculumPillars(lndCfg.curriculum_pillars || resolvedLnd.curriculum_pillars);
      setFacilities(lndCfg.facilities || resolvedLnd.facilities);
      setFaqs(lndCfg.faqs || resolvedLnd.faqs);

      const rnd = lndCfg.rundown || resolvedLnd.rundown || {};
      setShowRundown(rnd.is_visible ?? true);
      setRundownPublishDate(toDateTimeLocal(rnd.publish_date));
      setRundownTeaserNote(rnd.teaser_note || '');

      const spk = lndCfg.speaker || resolvedLnd.speaker;
      setSpeakerConfirmed(spk?.is_confirmed ?? Boolean(spk?.name || event.speaker_name));
      setSpeakerStatusBadge(spk?.status_badge || '');
      setSpeakerName(spk?.name || event.speaker_name || '');
      setSpeakerTitle(spk?.title || '');
      setSpeakerBio(spk?.bio || '');

      setError(null);
      setSuccessMsg(null);
      setActiveTab('detail');
    }
  }, [event, isOpen]);

  // Handler: Terapkan template standar 1-klik
  const handleApplyPreset = (type) => {
    const defaults = getLandingDefaults(type, basePrice, promoPrice);
    setHeroKicker(defaults.hero.kicker);
    setLandingHeadline(defaults.hero.headline);
    setLandingSubheadline(defaults.hero.subheadline);
    setCurriculumPillars(defaults.curriculum_pillars);
    setFacilities(defaults.facilities);
    setFaqs(defaults.faqs);
    if (!speakerName) {
      setSpeakerTitle(defaults.speaker.title);
      setSpeakerBio(defaults.speaker.bio);
      setSpeakerStatusBadge(defaults.speaker.status_badge);
    }
    setSuccessMsg(`Template standar ${type} berhasil diterapkan ke editor konten!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

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
        setIsAuthorizing(false);
        setError('Otorisasi Google dibatalkan atau gagal.');
        return;
      }
      setIsAuthorizing(false);
    }

    setIsGeneratingDrive(true);
    setError(null);
    try {
      const workspace = await createEventDriveWorkspace({
        accessToken: token,
        eventTitle: title
      });

      setGdriveFolderId(workspace.rootFolderId);
      setGdriveFolderUrl(workspace.rootFolderUrl);
      setGdriveSubfolders(workspace.subfolders);
      if (workspace.subfolders?.proofs?.id) {
        setDriveFolderId(workspace.subfolders.proofs.id);
      }
      setSuccessMsg('Struktur workspace Google Drive berhasil dibuat!');
    } catch (wsErr) {
      setError(`Gagal membuat folder: ${wsErr.message}`);
    } finally {
      setIsGeneratingDrive(false);
    }
  };

  if (!isOpen || !event) return null;

  const availableTargets = (events || []).filter(e => e.id !== event.id);

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
      hero: {
        kicker: heroKicker.trim() || 'Program Sertifikasi Kompetensi Resmi',
        headline: landingHeadline.trim() || title.trim(),
        subheadline: landingSubheadline.trim()
      },
      hero_headline: landingHeadline.trim() || title.trim(),
      hero_subheadline: landingSubheadline.trim(),
      speaker: {
        is_confirmed: speakerConfirmed,
        name: speakerConfirmed ? speakerName.trim() : '',
        title: speakerTitle.trim() || undefined,
        bio: speakerBio.trim() || undefined,
        status_badge: speakerStatusBadge.trim() || (speakerConfirmed ? 'Instruktur Terverifikasi' : 'Segera Diumumkan (TBA)'),
        photo_url: existingLandingConfig.speaker?.photo_url || '',
        teaser_tags: existingLandingConfig.speaker?.teaser_tags || []
      },
      curriculum_pillars: curriculumPillars,
      facilities: facilities,
      faqs: faqs,
      rundown: {
        is_visible: showRundown,
        publish_date: rundownPublishDate ? new Date(rundownPublishDate).toISOString() : '',
        teaser_note: rundownTeaserNote.trim()
      },
      vital_card: existingLandingConfig.vital_card || {}
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
      if (isSupabaseConfigured()) {
        const { error: sbErr } = await supabase
          .from('events')
          .update(updatedFields)
          .eq('id', event.id);

        if (sbErr) {
          console.warn('Supabase update warning:', sbErr.message);
        }

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

      await updateEvent(event.id, updatedFields);
      if (refreshEvents) {
        await refreshEvents();
      }

      setSuccessMsg('Perubahan program & konten landing page berhasil disimpan!');
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
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Program & Konten Landing Page</h2>
              <p className="text-xs text-slate-500">100% Database-Driven: Kelola jadwal, pembicara, kurikulum, fasilitas, dan FAQ</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition ${
              activeTab === 'detail'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Detail & Jadwal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('speaker')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition ${
              activeTab === 'speaker'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Trainer & Speaker</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cms')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition ${
              activeTab === 'cms'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>3. Konten Landing (CMS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ops')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition ${
              activeTab === 'ops'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>4. Drive & Integrasi</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[72vh] text-xs space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── TAB 1: DETAIL UTAMA & JADWAL ──────────────────────────────── */}
          {activeTab === 'detail' && (
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
                  {availableTargets.map(evt => (
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
          )}

          {/* ── TAB 2: PROFIL TRAINER & SPEAKER ───────────────────────────── */}
          {activeTab === 'speaker' && (
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
          )}

          {/* ── TAB 3: KONTEN LANDING PAGE (CMS) ──────────────────────────── */}
          {activeTab === 'cms' && (
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
                    onClick={() => handleApplyPreset('WEBINAR')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs btn-press"
                  >
                    ⚡ Template Webinar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('BOOTCAMP')}
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
                  {/* Switch Toggle: Jangan Tampilkan Dulu */}
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

                  {/* Input Tanggal & Jam Mulai Tampilkan */}
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

                  {/* Pesan Teaser Saat Belum Rilis */}
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
          )}

          {/* ── TAB 4: OPERASIONAL & DRIVE INTEGRASI ───────────────────────── */}
          {activeTab === 'ops' && (
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
                      onClick={handleGenerateDriveWorkspace}
                      disabled={isGeneratingDrive || isAuthorizing}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingDrive ? 'Membuat Folder...' : '⚡ Buat Folder di Google Drive (1-Klik)'}</span>
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
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Perubahan disimpan langsung ke Supabase PostgreSQL cloud.
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !title}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Perubahan Program</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
