import React, { useState, useMemo } from 'react';
import {
  Layers,
  Calendar,
  MapPin,
  TrendingUp,
  Users,
  ArrowRight,
  Sparkles,
  Link2,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  Ticket,
  Award,
  Video,
  Building2,
  Filter,
  DollarSign,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Pencil,
  Folder
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';
import EventChainingModal from './EventChainingModal';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';

export default function EventsPortfolioView({
  onOpenEventCommandCenter,
  registrants = [],
  attendances = []
}) {
  const { events, activeEventId, setActiveEventId, deleteEvent, updateWebRegistrationConfig, refreshEvents } = useEvent();

  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'WEBINAR' | 'BOOTCAMP' | 'WORKSHOP'
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [chainSourceId, setChainSourceId] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [generatingDriveId, setGeneratingDriveId] = useState(null);

  // ── Calculate Macro Ecosystem Metrics ──────────────────────
  const ecosystemStats = useMemo(() => {
    const totalEvents = events.length;
    const webinarCount = events.filter(e => e.event_type === 'WEBINAR').length;
    const bootcampCount = events.filter(e => e.event_type === 'BOOTCAMP').length;
    const workshopCount = events.filter(e => e.event_type === 'WORKSHOP').length;

    // Total participants strictly derived from real data
    const totalEcosystemPax = events.reduce((sum, e) => {
      const count = (e.id === activeEventId)
        ? registrants.length
        : (e.enrolled_count || 0);
      return sum + count;
    }, 0);

    const totalGrossRevenue = events.reduce((sum, e) => {
      const paxLunas = (e.id === activeEventId)
        ? registrants.filter(r => r.statusBayar === 'LUNAS').length
        : 0;
      return sum + (paxLunas * (e.promo_price || e.base_price || 0));
    }, 0);

    // Calculate conversion rate dynamically from real participant counts
    const webinarEvt = events.find(e => e.event_type === 'WEBINAR');
    const bootcampEvt = events.find(e => e.event_type === 'BOOTCAMP');
    const webinarPax = webinarEvt ? (webinarEvt.id === activeEventId ? registrants.length : (webinarEvt.enrolled_count || 0)) : 0;
    const bootcampPax = bootcampEvt ? (bootcampEvt.id === activeEventId ? registrants.length : (bootcampEvt.enrolled_count || 0)) : 0;
    const avgConversionRate = webinarPax > 0 ? Math.round((bootcampPax / webinarPax) * 100) : 0;

    return {
      totalEvents,
      webinarCount,
      bootcampCount,
      workshopCount,
      totalEcosystemPax,
      totalGrossRevenue,
      avgConversionRate
    };
  }, [events, activeEventId, registrants]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    return events.filter(e => e.event_type === filterType);
  }, [events, filterType]);

  // Order events by pipeline sequence if possible
  const pipelineSequence = useMemo(() => {
    // Start with root events (no parent_event_id)
    const roots = events.filter(e => !e.parent_event_id);
    const ordered = [];
    const visited = new Set();

    roots.forEach(root => {
      let curr = root;
      while (curr && !visited.has(curr.id)) {
        visited.add(curr.id);
        ordered.push(curr);
        curr = curr.next_event_id ? events.find(e => e.id === curr.next_event_id) : null;
      }
    });

    // Add any remaining unconnected events
    events.forEach(e => {
      if (!visited.has(e.id)) ordered.push(e);
    });

    return ordered;
  }, [events]);

  const handleOpenCommand = (evtId) => {
    setActiveEventId(evtId);
    if (onOpenEventCommandCenter) {
      onOpenEventCommandCenter(evtId);
    }
  };

  const handleConfigureChaining = (evtId) => {
    setChainSourceId(evtId);
    setIsChainModalOpen(true);
  };

  const eventsWithoutDrive = useMemo(() => {
    return events.filter(e => !e.web_registration_config?.gdrive_folder_url);
  }, [events]);

  const handleGenerateDriveForEvent = async (evt) => {
    setGeneratingDriveId(evt.id);
    try {
      let token = localStorage.getItem('digniti_google_oauth_token');
      if (!token) {
        token = await requestGoogleAccessToken({ promptConsent: false });
        localStorage.setItem('digniti_google_oauth_token', token);
      }
      const workspace = await createEventDriveWorkspace({
        accessToken: token,
        eventTitle: evt.title
      });
      await updateWebRegistrationConfig(evt.id, {
        gdrive_folder_id: workspace.mainFolderId,
        gdrive_folder_url: workspace.mainFolderUrl,
        gdrive_proof_folder_id: workspace.proofFolderId,
        gdrive_subfolders: workspace.subfolders
      });
      setToastMessage({
        type: 'success',
        text: `Struktur Google Drive untuk "${evt.title}" berhasil dibuat!`,
        url: workspace.mainFolderUrl
      });
      if (refreshEvents) refreshEvents();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: `Gagal membuat folder Google Drive: ${err.message}`
      });
    } finally {
      setGeneratingDriveId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── 1. Page Header & Macro Summary ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-400/15 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Pusat Komando Makro & Multi-Event Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Portfolio Acara & Ekosistem Funnel
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
              Pandangan menyeluruh (*Macro POV*) seluruh lini program pelatihan LPK Dignity. Hubungkan webinar pengantar ke bootcamp tatap muka intensif, lalu sambungkan ke sertifikasi masterclass tingkat lanjut secara berkesinambungan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setChainSourceId(null);
                setIsChainModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs active:scale-[0.98]"
            >
              <Link2 className="w-4 h-4 text-amber-600" />
              <span>Atur Hubungan Rantai</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Acara Baru</span>
            </button>
          </div>
        </div>

        {/* Macro KPI Bento Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Rangkaian Acara</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {ecosystemStats.totalEvents} <span className="text-xs font-sans font-semibold text-slate-400">Acara</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="text-blue-600">{ecosystemStats.webinarCount} Web</span> •
              <span className="text-amber-600">{ecosystemStats.bootcampCount} Boot</span> •
              <span className="text-indigo-600">{ecosystemStats.workshopCount} Cert</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Ekosistem Peserta</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
              {ecosystemStats.totalEcosystemPax} <span className="text-xs font-sans font-semibold text-slate-400">Pax</span>
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
              +100% Database Terkoneksi
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Estimasi Gross Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
              {formatRupiah(ecosystemStats.totalGrossRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Akumulasi Semua Program
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
              <span>Rasio Konversi Funnel</span>
              <Flame className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
              {ecosystemStats.avgConversionRate}%
            </div>
            <div className="text-[11px] text-amber-800 mt-1 font-medium">
              Webinar ➔ Bootcamp Solo
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Interactive Visual Funnel Chaining Map (The Roadmap) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Peta Alur Rantai Acara (Funnel Chaining Roadmap)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi alur peserta dari pendaftaran webinar awal hingga sertifikasi masterclass
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-semibold font-mono">
            {events.length}-Tier Connected Pipeline
          </span>
        </div>

        {/* Pipeline Nodes Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative pt-2">
          {pipelineSequence.map((evt, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === pipelineSequence.length - 1;
            const isActive = evt.id === activeEventId;

            return (
              <div
                key={evt.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                  isActive
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-md'
                    : 'bg-slate-50/80 hover:bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Pipeline Step Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-mono">
                      Tahap 0{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        evt.event_type === 'WEBINAR'
                          ? 'bg-blue-100 text-blue-800'
                          : evt.event_type === 'BOOTCAMP'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-indigo-100 text-indigo-900'
                      }`}>
                        {evt.event_type}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingEvent(evt)}
                        title="Edit Informasi Acara Ini"
                        className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                    {evt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {evt.funnel_tagline || evt.venue}
                  </p>
                </div>

                {/* Chaining Incentive Badge */}
                <div className="my-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Jadwal Acara:</span>
                    <span className="text-slate-800 font-mono text-[11px]">
                      {new Date(evt.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Node Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleOpenCommand(evt.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] ${
                      isActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-800'
                    }`}
                  >
                    <span>{isActive ? '✓ Sedang Terpilih' : 'Buka Command Center'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Grid Kartu Seluruh Acara (Detail Portfolio) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>Daftar Seluruh Program Pelatihan ({filteredEvents.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Pilih acara untuk mengelola operasional spesifik atau atur keterkaitan</p>
          </div>

          {/* Filter Types */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'WEBINAR', 'BOOTCAMP', 'WORKSHOP'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterType === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'ALL' ? 'Semua Tipe' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Drive Sync Notice Banner if any event missing Drive folder */}
        {eventsWithoutDrive.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/5 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 shrink-0">
                <Folder className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <span>{eventsWithoutDrive.length} Program Belum Memiliki Folder Google Drive</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">Perhatian</span>
                </h4>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Klik tombol <strong>"⚡ Buat Folder Drive (1-Klik)"</strong> pada kartu acara di bawah untuk langsung membuat folder utama & 4 subfolder otomatis di Google Drive Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(evt => {
            const isActive = evt.id === activeEventId;
            const parent = evt.parent_event_id ? events.find(e => e.id === evt.parent_event_id) : null;
            const next = evt.next_event_id ? events.find(e => e.id === evt.next_event_id) : null;

            const enrolled = (evt.id === activeEventId)
              ? registrants.length
              : (evt.enrolled_count || 0);
            const capacity = evt.capacity || 50;
            const progressPercent = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

            return (
              <div
                key={evt.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  isActive ? 'border-amber-400 ring-2 ring-amber-500/20' : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Card Header: Type & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                      evt.event_type === 'WEBINAR'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : evt.event_type === 'BOOTCAMP'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}>
                      {evt.event_type}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      evt.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : evt.status === 'ONGOING'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {evt.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {evt.title}
                  </h3>

                  {/* Location & Dates */}
                  <div className="space-y-1.5 mt-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700">
                        {new Date(evt.date_start).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100">
                    <span className="text-slate-500">Harga Program:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatRupiah(evt.promo_price || evt.base_price)}
                    </span>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Kapasitas Kursi</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {enrolled} / {capacity} Pax ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Chaining Relation Badges */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                    {parent && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <span className="text-slate-400">🔗 Sumber:</span>
                        <span className="font-semibold text-slate-700 truncate">{parent.title}</span>
                      </div>
                    )}
                    {next ? (
                      <div className="flex items-center gap-1.5 text-amber-800 truncate font-medium">
                        <span className="text-amber-600 font-bold">🎯 Lanjutan:</span>
                        <span className="truncate">{next.title}</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-[10px]">
                        Belum disambungkan ke acara lanjutan
                      </div>
                    )}
                  </div>

                  {/* Google Drive Workspace Integration Status */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    {evt.web_registration_config?.gdrive_folder_url ? (
                      <div className="flex items-center justify-between bg-sky-50/80 border border-sky-200/90 rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 text-sky-800 font-semibold truncate">
                          <Folder className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate text-[11px]">Drive Workspace Aktif</span>
                        </div>
                        <a
                          href={evt.web_registration_config.gdrive_folder_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 transition underline shrink-0"
                        >
                          <span>Buka Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-900 font-medium truncate">
                          <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate text-[11px]">Drive Belum Dibuat</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGenerateDriveForEvent(evt)}
                          disabled={generatingDriveId === evt.id}
                          className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg transition disabled:opacity-50 shrink-0 shadow-2xs active:scale-[0.98]"
                        >
                          {generatingDriveId === evt.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Membuat...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Buat 1-Klik</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfigureChaining(evt.id)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                    title="Atur Keterkaitan Chaining"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(evt)}
                    className="p-2 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                    title="Edit Informasi Program Pelatihan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingEvent(evt);
                    }}
                    className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                    title="Hapus Acara Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCommand(evt.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] ${
                      isActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>{isActive ? 'Buka Dashboard Aktif' : 'Buka Command Center'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chaining Configuration Modal */}
      <EventChainingModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        initialSourceEventId={chainSourceId}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
      />

      {/* Delete Event Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Acara</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeleting) {
                        setDeletingEvent(null);
                        setDeleteError(null);
                      }
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan menghapus data acara dari sistem dan database.
                </p>
              </div>
            </div>

            {/* Event Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {deletingEvent.event_type}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(deletingEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {deletingEvent.title}
              </h4>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200">
                <span>Kapasitas: {deletingEvent.capacity || 100} Pax</span>
                <span className="font-semibold text-slate-700">
                  Terdaftar: {deletingEvent.enrolled_count || 0} Pax
                </span>
              </div>
            </div>

            {/* Impact Details */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Dampak Penghapusan:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-1 pl-1">
                <li>Acara akan dihapus permanen dari portofolio dan Supabase.</li>
                <li>Keterkaitan <em>chaining pipeline</em> dengan acara sebelum/sesudahnya akan dilepas secara aman.</li>
                <li>Seluruh formulir registrasi web publik untuk acara ini akan ditutup.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800 font-medium">
                {deleteError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingEvent(null);
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await deleteEvent(deletingEvent.id);
                    setToastMessage(`Acara "${deletingEvent.title}" berhasil dihapus.`);
                    setDeletingEvent(null);
                    setTimeout(() => setToastMessage(null), 4000);
                  } catch (err) {
                    setDeleteError(err.message || 'Gagal menghapus acara.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Acara</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl text-xs font-bold shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 max-w-md ${
          typeof toastMessage === 'object' && toastMessage.type === 'error'
            ? 'bg-rose-900 border border-rose-700 text-white'
            : 'bg-slate-900 border border-slate-700 text-white'
        }`}>
          <div className="shrink-0 mt-0.5">
            {typeof toastMessage === 'object' && toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <span>{typeof toastMessage === 'object' ? toastMessage.text : toastMessage}</span>
            {typeof toastMessage === 'object' && toastMessage.url && (
              <a
                href={toastMessage.url}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Buka Google Drive Baru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
