import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Link2, 
  Ticket,
  Folder,
  ExternalLink,
  Sparkles,
  Key,
  FolderPlus
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';

export default function CreateEventModal({ isOpen, onClose }) {
  const { events, refreshEvents, setActiveEventId, createEvent } = useEvent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('BOOTCAMP');
  const [dateStart, setDateStart] = useState('2026-12-12T09:00');
  const [dateEnd, setDateEnd] = useState('2026-12-13T17:00');
  const [venue, setVenue] = useState('Sala View Hotel Solo');
  const [basePrice, setBasePrice] = useState(1500000);
  const [promoPrice, setPromoPrice] = useState(1400000);
  const [capacity, setCapacity] = useState(50);

  // Chaining fields
  const [parentEventId, setParentEventId] = useState('');
  const [nextEventId, setNextEventId] = useState('');

  // Dynamic Web Registration & Integrations
  const [waGroupUrl, setWaGroupUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [zoomMeetingUrl, setZoomMeetingUrl] = useState('');
  const [autoCreateDrive, setAutoCreateDrive] = useState(true);
  const [googleOAuthToken, setGoogleOAuthToken] = useState(() => localStorage.getItem('digniti_google_oauth_token') || null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [landingHeadline, setLandingHeadline] = useState('');
  const [landingSubheadline, setLandingSubheadline] = useState('');
  const [speakerName, setSpeakerName] = useState("Halimatus Sa'diyah, S.I.Kom., M.I.Kom.");
  const [speakerTitle, setSpeakerTitle] = useState('Certified Public Speaking Master Trainer & Founder Adikara');
  const [speakerBio, setSpeakerBio] = useState('Praktisi dan konsultan komunikasi publik tersertifikasi yang berpengalaman melatih ribuan profesional, eksekutif BUMN, dan akademisi.');

  const handleAuthorizeGoogle = () => {
    setIsAuthorizing(true);
    requestGoogleAccessToken(
      '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com',
      (token) => {
        setIsAuthorizing(false);
        setGoogleOAuthToken(token);
        localStorage.setItem('digniti_google_oauth_token', token);
      },
      (err) => {
        setIsAuthorizing(false);
        console.warn('Google auth notice:', err);
      }
    );
  };

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage('Menyiapkan event baru...');

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + new Date().getFullYear();

    // Generate valid UUID
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `b0000000-${Math.random().toString(16).substring(2, 6)}-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

    // Otomatis Buat Struktur Folder di Google Drive jika diaktifkan & token tersedia
    let workspaceData = null;
    if (autoCreateDrive && googleOAuthToken) {
      setStatusMessage('Membuat struktur folder rapi di Google Drive...');
      try {
        workspaceData = await createEventDriveWorkspace({
          accessToken: googleOAuthToken,
          eventTitle: title
        });
      } catch (dErr) {
        console.warn('Peringatan pembuatan folder Drive:', dErr.message);
      }
    }

    const webRegistrationConfig = {
      is_open: true,
      wa_group_url: waGroupUrl.trim(),
      gdrive_folder_id: workspaceData?.mainFolderId || (driveFolderId.trim() || ''),
      gdrive_folder_url: workspaceData?.mainFolderUrl || (driveFolderId.trim() ? `https://drive.google.com/drive/folders/${driveFolderId.trim()}` : ''),
      gdrive_proof_folder_id: workspaceData?.proofFolderId || (driveFolderId.trim() || ''),
      gdrive_subfolders: workspaceData?.subfolders || {},
      zoom_meeting_url: zoomMeetingUrl.trim(),
      intake_source: 'WEB_NATIVE'
    };

    const landingPageConfig = {
      hero_headline: landingHeadline.trim() || title.trim(),
      hero_subheadline: landingSubheadline.trim() || undefined,
      speaker: {
        name: speakerName.trim() || undefined,
        title: speakerTitle.trim() || undefined,
        bio: speakerBio.trim() || undefined
      }
    };

    const newEventObj = {
      id: newId,
      slug,
      title,
      event_type: eventType,
      date_start: new Date(dateStart).toISOString(),
      date_end: new Date(dateEnd).toISOString(),
      venue,
      base_price: Number(basePrice),
      promo_price: Number(promoPrice),
      status: 'PUBLISHED',
      capacity: Number(capacity),
      parent_event_id: parentEventId || null,
      next_event_id: nextEventId || null,
      rebate_voucher_code: null,
      rebate_voucher_amount: 0,
      funnel_role: eventType === 'WEBINAR' ? 'PRE_EVENT' : (eventType === 'BOOTCAMP' ? 'CORE_BOOTCAMP' : 'ADVANCED_WORKSHOP'),
      funnel_stage_name: eventType === 'WEBINAR' ? 'Pre-Event Funnel' : (eventType === 'BOOTCAMP' ? 'Core Program' : 'Masterclass'),
      web_registration_config: webRegistrationConfig,
      landing_page_config: landingPageConfig,
      enrolled_count: 0
    };

    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from('events')
          .insert({
            id: newId,
            slug,
            title,
            event_type: eventType,
            date_start: new Date(dateStart).toISOString(),
            date_end: new Date(dateEnd).toISOString(),
            venue,
            base_price: Number(basePrice),
            promo_price: Number(promoPrice),
            status: 'PUBLISHED',
            capacity: Number(capacity),
            parent_event_id: parentEventId || null,
            next_event_id: nextEventId || null,
            rebate_voucher_code: null,
            rebate_voucher_amount: 0,
            funnel_role: newEventObj.funnel_role,
            funnel_stage_name: newEventObj.funnel_stage_name,
            web_registration_config: webRegistrationConfig,
            landing_page_config: landingPageConfig
          });

        if (err) {
          console.warn('Notice Supabase insert fallback to local:', err.message);
        } else if (parentEventId) {
          // Update parent event's next_event_id so the link is bidirectional in Supabase
          await supabase
            .from('events')
            .update({ next_event_id: newId })
            .eq('id', parentEventId);
        }
      }

      // Always save to EventContext & localStorage
      createEvent(newEventObj);
      await refreshEvents();
      setActiveEventId(newId);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal membuat event baru');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden text-slate-900">
        
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Buat Program / Acara Baru</h2>
              <p className="text-xs text-slate-500">Daftarkan webinar atau bootcamp dan hubungkan ke funnel</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Event / Pelatihan *
            </label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Public Speaking & Stage Mastery Bootcamp"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Event</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="BOOTCAMP">Bootcamp Offline</option>
                <option value="WEBINAR">Webinar Online</option>
                <option value="WORKSHOP">Workshop Khusus / Masterclass</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas (Pax)</label>
              <input 
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Mulai</label>
              <input 
                type="datetime-local"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Selesai</label>
              <input 
                type="datetime-local"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi / Venue</label>
            <input 
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Contoh: Sala View Hotel Solo atau Zoom Meeting"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Dasar (Rp)</label>
              <input 
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Promo / Alumni (Rp)</label>
              <input 
                type="number"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* ── Keterkaitan Chaining Funnel ── */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Link2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Keterkaitan Rantai Ekosistem (Funnel Chaining)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-amber-800 mb-1">
                  Sangkutkan dari Acara Sumber:
                </label>
                <select
                  value={parentEventId}
                  onChange={(e) => setParentEventId(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Tanpa Induk (Acara Awal) --</option>
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.event_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-800 mb-1">
                  Sangkutkan ke Acara Lanjutan:
                </label>
                <select
                  value={nextEventId}
                  onChange={(e) => setNextEventId(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Belum Ada Target --</option>
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.event_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Integrasi Operasional & Google Drive Workspace */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-sky-600" />
                <span>Google Drive Event Workspace</span>
              </div>
              {googleOAuthToken ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drive Terhubung
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleAuthorizeGoogle}
                  disabled={isAuthorizing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  <Key className="w-3 h-3" />
                  <span>{isAuthorizing ? 'Menghubungkan...' : 'Hubungkan Drive (1-Klik)'}</span>
                </button>
              )}
            </div>

            {/* Checkbox Otomatis Buat Struktur Folder */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateDrive}
                  onChange={(e) => setAutoCreateDrive(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 w-3.5 h-3.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">Otomatis Buat Struktur Folder di Google Drive</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Sistem akan memicu pembuatan folder <strong>[LPK Dignity] {title || 'Nama Event'}</strong> beserta 4 subfolder terstruktur:
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-1.5 pl-6 pt-1 text-[10px] font-mono text-slate-600">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span>📁 01_Bukti_Transfer</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span>📁 02_Presensi_Zoom</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span>📁 03_Sertifikat</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  <span>📁 04_Data_Backup</span>
                </div>
              </div>
            </div>

            {/* Fallback Manual Drive Folder ID (jika tidak otomatis) */}
            {!autoCreateDrive && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ID Folder Google Drive Manual (Opsional)
                </label>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="ID folder di Google Drive..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            )}

            {/* Link WhatsApp & Zoom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Link Grup WhatsApp Peserta
                </label>
                <input
                  type="url"
                  value={waGroupUrl}
                  onChange={(e) => setWaGroupUrl(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Hanya dikirim setelah pembayaran diverifikasi admin.
                </p>
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

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{loading ? (statusMessage || 'Menyimpan...') : 'Simpan & Buka Acara'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
