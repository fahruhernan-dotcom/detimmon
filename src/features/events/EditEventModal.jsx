import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Users,
  CheckCircle2,
  Pencil,
  Loader2,
  AlertCircle,
  Folder,
  Sparkles
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';
import { getLandingDefaults, resolveLandingConfig } from '../landing/landingContentDefaults';
import EditEventTab1Detail from './components/EditEventTab1Detail';
import EditEventTab2Speaker from './components/EditEventTab2Speaker';
import EditEventTab3CMS from './components/EditEventTab3CMS';
import EditEventTab4Ops from './components/EditEventTab4Ops';

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

  const TAB_CLASS_ACTIVE = 'border-amber-500 text-amber-950 bg-white shadow-2xs';
  const TAB_CLASS_IDLE = 'border-transparent text-slate-500 hover:text-slate-900';

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
              <h2 className="text-base font-bold text-slate-900">Edit Program &amp; Konten Landing Page</h2>
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
          {[
            { id: 'detail', icon: <Calendar className="w-3.5 h-3.5" />, label: '1. Detail & Jadwal' },
            { id: 'speaker', icon: <Users className="w-3.5 h-3.5" />, label: '2. Trainer & Speaker' },
            { id: 'cms', icon: <Sparkles className="w-3.5 h-3.5 text-amber-600" />, label: '3. Konten Landing (CMS)' },
            { id: 'ops', icon: <Folder className="w-3.5 h-3.5" />, label: '4. Drive & Integrasi' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 flex items-center gap-2 transition ${
                activeTab === tab.id ? TAB_CLASS_ACTIVE : TAB_CLASS_IDLE
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
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

          {/* Tab 1 */}
          {activeTab === 'detail' && (
            <EditEventTab1Detail
              title={title} setTitle={setTitle}
              funnelTagline={funnelTagline} setFunnelTagline={setFunnelTagline}
              eventType={eventType} setEventType={setEventType}
              status={status} setStatus={setStatus}
              dateStart={dateStart} setDateStart={setDateStart}
              dateEnd={dateEnd} setDateEnd={setDateEnd}
              venue={venue} setVenue={setVenue}
              basePrice={basePrice} setBasePrice={setBasePrice}
              promoPrice={promoPrice} setPromoPrice={setPromoPrice}
              capacity={capacity} setCapacity={setCapacity}
              nextEventId={nextEventId} setNextEventId={setNextEventId}
              availableTargets={availableTargets}
            />
          )}

          {/* Tab 2 */}
          {activeTab === 'speaker' && (
            <EditEventTab2Speaker
              speakerConfirmed={speakerConfirmed} setSpeakerConfirmed={setSpeakerConfirmed}
              speakerName={speakerName} setSpeakerName={setSpeakerName}
              speakerTitle={speakerTitle} setSpeakerTitle={setSpeakerTitle}
              speakerBio={speakerBio} setSpeakerBio={setSpeakerBio}
              speakerStatusBadge={speakerStatusBadge} setSpeakerStatusBadge={setSpeakerStatusBadge}
            />
          )}

          {/* Tab 3 */}
          {activeTab === 'cms' && (
            <EditEventTab3CMS
              heroKicker={heroKicker} setHeroKicker={setHeroKicker}
              landingHeadline={landingHeadline} setLandingHeadline={setLandingHeadline}
              landingSubheadline={landingSubheadline} setLandingSubheadline={setLandingSubheadline}
              curriculumPillars={curriculumPillars} setCurriculumPillars={setCurriculumPillars}
              facilities={facilities} setFacilities={setFacilities}
              faqs={faqs} setFaqs={setFaqs}
              showRundown={showRundown} setShowRundown={setShowRundown}
              rundownPublishDate={rundownPublishDate} setRundownPublishDate={setRundownPublishDate}
              rundownTeaserNote={rundownTeaserNote} setRundownTeaserNote={setRundownTeaserNote}
              onApplyPreset={handleApplyPreset}
            />
          )}

          {/* Tab 4 */}
          {activeTab === 'ops' && (
            <EditEventTab4Ops
              waGroupUrl={waGroupUrl} setWaGroupUrl={setWaGroupUrl}
              driveFolderId={driveFolderId} setDriveFolderId={setDriveFolderId}
              zoomMeetingUrl={zoomMeetingUrl} setZoomMeetingUrl={setZoomMeetingUrl}
              gdriveFolderId={gdriveFolderId}
              gdriveFolderUrl={gdriveFolderUrl}
              gdriveSubfolders={gdriveSubfolders}
              isGeneratingDrive={isGeneratingDrive}
              isAuthorizing={isAuthorizing}
              onGenerateDriveWorkspace={handleGenerateDriveWorkspace}
            />
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
