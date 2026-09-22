import React, { useState, useEffect, useMemo } from 'react';
import { AppSidebar } from '../../components/app-sidebar';
import { SidebarProvider, SidebarInset } from '../../components/ui/sidebar';
import { Link2, ArrowRight } from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

// Feature Views
import DashboardOverview from '../dashboard/DashboardOverview';
import RegistrantsView from '../registrations/RegistrantsView';
import PaymentsView from '../payments/PaymentsView';
import TicketsView from '../tickets/TicketsView';
import AttendanceView from '../attendance/AttendanceView';
import RundownStageView from '../rundown/RundownStageView';
import CertificatesView from '../certificates/CertificatesView';
import CommunicationCenter from '../communication/CommunicationCenter';
import BusinessIntelligenceView from '../business/BusinessIntelligenceView';
import ConversionView from '../conversion/ConversionView';
import TemplateStudioView from '../templates/TemplateStudioView';
import EmailLayoutVerificationView from '../communication/EmailLayoutVerificationView';
import RbacManagementView from '../system/RbacManagementView';
import AuditLogView from '../system/AuditLogView';
import VoucherManagementView from '../vouchers/VoucherManagementView';
import EventsPortfolioView from '../events/EventsPortfolioView';
import WebRegistrationSettingsView from '../registrations/WebRegistrationSettingsView';
import SyncDashboard from '../../components/SyncDashboard';
import ExternalSourceModal from '../../components/ExternalSourceModal';
import ConfigModal from '../../components/ConfigModal';

// Context & Hooks
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useAdminData } from './hooks/useAdminData';
import AdminHeader from './components/AdminHeader';
import { externalSourceService } from '../../services/externalSourceService';
import { requestGoogleAccessToken } from '../../services/googleApiService';
import { fetchFromGoogleOAuth } from '../../services/sheetsService';

function ActiveSourceLoader({ eventId, onLoaded }) {
  useEffect(() => {
    if (!eventId) return;
    externalSourceService.getActivePrimary(eventId)
      .then(src => { if (src) onLoaded(src); })
      .catch(e => console.warn('ActiveSourceLoader:', e));
  }, [eventId, onLoaded]);
  return null;
}

/**
 * AdminCommandCenter — Authenticated Operations Shell (Ponytail Edition)
 * Minimal, modular, delegates domain responsibilities to individual view workspaces.
 */
export default function AdminCommandCenter({ currentPath, setCurrentPath }) {
  const { events, activeEvent, activeEventId, setActiveEventId } = useEvent();
  const { user: authUser, profile: authProfile, role: authRole, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSpeaker, setSelectedSpeaker] = useState(() => localStorage.getItem('digniti_react_speaker') || 'diyah');
  const [googleOAuthToken, setGoogleOAuthToken] = useState(() => localStorage.getItem('digniti_google_oauth_token') || null);
  
  // Google Workspace External Source
  const [activeSource, setActiveSource] = useState(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [config, setConfig] = useState({
    gasWebAppUrl: localStorage.getItem('digniti_react_gas_url') || '',
    googleApiKey: localStorage.getItem('digniti_react_google_api_key') || '',
    clientId: localStorage.getItem('digniti_react_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: localStorage.getItem('digniti_react_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    spreadsheetId: localStorage.getItem('digniti_react_spreadsheet_id') || '',
    tabRegistrasi: localStorage.getItem('digniti_sheet_tab_registrasi') || '',
    tabPresensi: localStorage.getItem('digniti_sheet_tab_presensi') || '',
    adminPhone: localStorage.getItem('digniti_react_admin_phone') || import.meta.env.VITE_ADMIN_WHATSAPP || '',
    adminToken: localStorage.getItem('digniti_react_admin_token') || '',
    hargaIndividu: localStorage.getItem('digniti_react_harga_individu') || '',
    hargaMabar: localStorage.getItem('digniti_react_harga_mabar') || '',
    honorDiyah: localStorage.getItem('digniti_react_honor_diyah') || '',
    honorWilly: localStorage.getItem('digniti_react_honor_willy') || '',
    biayaZoom: localStorage.getItem('digniti_react_biaya_zoom') || '',
    defaultSpeaker: localStorage.getItem('digniti_react_speaker') || ''
  });

  // SSOT Admin Data
  const {
    registrants,
    setRegistrants,
    attendances,
    isSyncing,
    setIsSyncing,
    toast,
    showToast,
    refreshRegistrantsFromDb,
    refreshAttendances,
    kpiStats
  } = useAdminData(activeEventId);

  const currentUser = useMemo(() => ({
    type: 'supabase_auth',
    email: authUser?.email || authProfile?.full_name || 'Staf Internal',
    role: authRole === 'OWNER' ? 'Super Admin (Owner)' : (authRole || 'Staf Dignity'),
    token: googleOAuthToken
  }), [authUser, authProfile, authRole, googleOAuthToken]);

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Sesi staf telah ditutup.', 'info');
    } catch (err) {
      console.warn('Gagal logout:', err);
    }
  };

  const handleRefreshAll = async () => {
    if (!activeEventId) {
      showToast('Pilih acara terlebih dahulu.', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      await Promise.all([
        refreshRegistrantsFromDb(activeEventId),
        refreshAttendances()
      ]);
      showToast('Data berhasil disegarkan dari Supabase Database!', 'success');
    } catch (err) {
      showToast(`Gagal menyegarkan data: ${err.message}`, 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      Object.entries(updated).forEach(([k, v]) => {
        if (v !== undefined && v !== null) localStorage.setItem(`digniti_react_${k}`, String(v));
      });
      return updated;
    });
    showToast('Konfigurasi sistem berhasil diperbarui!', 'success');
  };

  const handleGoogleOAuthLogin = () => {
    if (!config.clientId) {
      showToast('Client ID belum terisi di pengaturan.', 'warning');
      return;
    }
    requestGoogleAccessToken(config.clientId, async (token) => {
      setGoogleOAuthToken(token);
      localStorage.setItem('digniti_google_oauth_token', token);
      showToast('Login Google Berhasil via OAuth!', 'success');
    }, (err) => showToast(`Otorisasi Google: ${err}`, 'warning'));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    if (googleOAuthToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleOAuthToken}` }
        });
        if (res.ok) {
          const userinfo = await res.json();
          showToast(`Koneksi Google OAuth Aktif (${userinfo.email})!`, 'success');
        } else {
          showToast('Token kadaluarsa, silakan login ulang akun Google.', 'warning');
        }
      } catch (err) {
        showToast(`Error OAuth: ${err.message}`, 'warning');
      }
    } else {
      showToast('Token Google belum terhubung.', 'info');
    }
    setIsTesting(false);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-[100dvh] w-full bg-slate-50 text-slate-900 selection:bg-amber-500/20 selection:text-amber-900 font-sans">
        
        {/* Sidebar */}
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          adminPhone={config.adminPhone}
          currentUser={currentUser}
          onLogout={handleLogout}
          registrantsCount={kpiStats.totalRegistrants}
          pendingVerifyCount={kpiStats.pendingCount}
          unsentTicketsCount={kpiStats.unsentTicketsCount}
          attendancesCount={attendances.length}
          readyCertificatesCount={kpiStats.readyCertificatesCount}
          selectedSpeaker={selectedSpeaker}
          setSelectedSpeaker={setSelectedSpeaker}
          config={config}
          hasGoogleToken={Boolean(googleOAuthToken)}
        />

        {/* Dynamic Main Inset */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-slate-50/70 overflow-hidden">
          
          {/* Header */}
          <AdminHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            googleOAuthToken={googleOAuthToken}
            isSyncing={isSyncing}
            onRefreshFromSupabase={handleRefreshAll}
            onOpenAdd={() => setActiveTab('registrants')}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            
            {/* Context Sub-header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2 flex-wrap">
                  <span>{activeEvent?.title || 'Pusat Komando Operasional Webinar'}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                    {activeEvent?.date_start 
                      ? new Date(activeEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) 
                      : '14 Nov 2026'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase font-mono">
                    {activeEvent?.event_type || 'WEBINAR'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  {activeEvent?.venue ? `Lokasi: ${activeEvent.venue}` : 'Live Pre-Event Webinar "Mastering Stage Confidence" ➔ Bootcamp Offline Sala View Hotel Solo'}
                </p>
              </div>
            </div>

            {/* Funnel Chaining Banner */}
            {activeTab !== 'events-portfolio' && (activeEvent?.next_event_id || activeEvent?.parent_event_id) && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/70 to-slate-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>Rantai Funnel Ekosistem:</span>
                      {activeEvent.parent_event_id && (
                        <span className="text-slate-500 font-normal">
                          Bersumber dari <strong>{events.find(e => e.id === activeEvent.parent_event_id)?.title || 'Acara Induk'}</strong> ➔
                        </span>
                      )}
                      <span className="text-amber-900 font-extrabold">{activeEvent.title}</span>
                      {activeEvent.next_event_id && (
                        <span className="text-emerald-700 font-normal">
                          ➔ Disambungkan ke <strong>{events.find(e => e.id === activeEvent.next_event_id)?.title || 'Acara Lanjutan'}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('events-portfolio')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                  >
                    Buka Peta Pipeline
                  </button>
                  {activeEvent.next_event_id && (
                    <button
                      onClick={() => {
                        setActiveEventId(activeEvent.next_event_id);
                        setActiveTab('dashboard');
                      }}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Buka Acara Lanjutan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Active Tab Workspace Router ── */}
            {activeTab === 'events-portfolio' && (
              <EventsPortfolioView
                onOpenEventCommandCenter={(evtId) => {
                  setActiveEventId(evtId);
                  setActiveTab('dashboard');
                }}
                registrants={registrants}
                attendances={attendances}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardOverview
                registrants={registrants}
                attendances={attendances}
                activeEvent={activeEvent}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'web-registration-settings' && (
              <WebRegistrationSettingsView
                onOpenPublicRegistration={() => {
                  const slug = activeEvent?.slug || 'msc-nov-2026';
                  window.location.hash = `#/daftar?event=${slug}`;
                  setCurrentPath(`/daftar?event=${slug}`);
                }}
              />
            )}

            {(activeTab === 'registrants' || activeTab === 'registrasi') && (
              <RegistrantsView
                registrants={registrants}
                setRegistrants={setRegistrants}
                activeEvent={activeEvent}
                googleOAuthToken={googleOAuthToken}
                setGoogleOAuthToken={setGoogleOAuthToken}
                config={config}
                currentUser={currentUser}
                onRefresh={() => refreshRegistrantsFromDb(activeEventId)}
                onShowToast={showToast}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsView
                registrants={registrants}
                setRegistrants={setRegistrants}
                googleOAuthToken={googleOAuthToken}
                setGoogleOAuthToken={setGoogleOAuthToken}
                config={config}
              />
            )}

            {activeTab === 'tickets' && (
              <TicketsView
                registrants={registrants}
                setRegistrants={setRegistrants}
                activeEvent={activeEvent}
                googleOAuthToken={googleOAuthToken}
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView
                attendances={attendances}
                registrants={registrants}
                onAttendanceUpdated={refreshAttendances}
              />
            )}

            {activeTab === 'rundown' && (
              <RundownStageView />
            )}

            {(activeTab === 'certificates' || activeTab === 'sertifikat') && (
              <CertificatesView
                attendances={attendances}
                registrants={registrants}
                onAttendanceUpdated={refreshAttendances}
                hasGoogleToken={Boolean(googleOAuthToken)}
                selectedSpeaker={selectedSpeaker}
              />
            )}

            {activeTab === 'communication' && (
              <CommunicationCenter />
            )}

            {(activeTab === 'revenue' || activeTab === 'finansial') && (
              <BusinessIntelligenceView
                registrants={registrants}
                attendances={attendances}
                activeEvent={activeEvent}
                selectedSpeaker={selectedSpeaker}
                setSelectedSpeaker={setSelectedSpeaker}
              />
            )}

            {activeTab === 'conversion' && (
              <ConversionView
                registrants={registrants}
                attendances={attendances}
                activeEvent={activeEvent}
              />
            )}

            {activeTab === 'templates' && (
              <TemplateStudioView
                activeEvent={activeEvent}
                sampleParticipant={registrants[0] || null}
              />
            )}

            {activeTab === 'email-preview' && (
              <EmailLayoutVerificationView
                registrants={registrants}
                attendances={attendances}
                activeEvent={activeEvent}
                googleOAuthToken={googleOAuthToken}
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'rbac' && <RbacManagementView />}
            {activeTab === 'audit' && <AuditLogView />}

            {activeTab === 'vouchers' && (
              <div className="p-6">
                <VoucherManagementView events={events || []} />
              </div>
            )}

            {/* Google Sync */}
            {activeTab === 'sync' && (
              <div style={{ padding: '24px', maxWidth: 860 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🔄 Google Workspace Sync</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      Sinkronisasi 2-arah antara Google Sheets dan Supabase
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSourceModalOpen(true)}
                    style={{
                      background: 'var(--glass)', border: '1px solid var(--border)',
                      color: 'var(--text)', borderRadius: 8, padding: '8px 16px',
                      cursor: 'pointer', fontSize: 13
                    }}>
                    ⚙️ Kelola Binding Sheets
                  </button>
                </div>

                {!activeSource && activeEvent?.id && (
                  <ActiveSourceLoader eventId={activeEvent.id} onLoaded={setActiveSource} />
                )}

                {activeSource ? (
                  <SyncDashboard
                    eventId={activeEvent?.id}
                    spreadsheetId={activeSource?.external_sheet_id || config.spreadsheetId}
                    googleAccessToken={googleOAuthToken}
                    activeSourceId={activeSource?.id}
                    onSyncComplete={(result) => {
                      showToast(`Sync selesai! ↓${result.sheetsToDb?.inserted || 0} baru, ↑${result.dbToSheets?.updated || 0} write-back.`, 'success');
                      if (activeEvent?.id) refreshRegistrantsFromDb(activeEvent.id);
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <p style={{ fontSize: 15, marginBottom: 16 }}>Belum ada Google Sheets yang dihubungkan ke event ini.</p>
                    <button
                      onClick={() => setIsSourceModalOpen(true)}
                      style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                      + Tambah Binding Google Sheets
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pengaturan' && (
              <ConfigModal
                config={config}
                onSaveConfig={handleSaveConfig}
                onTestConnection={handleTestConnection}
                onGoogleOAuthLogin={handleGoogleOAuthLogin}
                isTesting={isTesting}
                hasGoogleToken={Boolean(googleOAuthToken)}
              />
            )}
          </main>
        </SidebarInset>

        {/* Source Modal */}
        {isSourceModalOpen && activeEvent?.id && (
          <ExternalSourceModal
            eventId={activeEvent.id}
            googleAccessToken={googleOAuthToken}
            onClose={() => setIsSourceModalOpen(false)}
            onSaved={(saved) => {
              setActiveSource(saved);
              showToast(`Binding "${saved.label || 'Google Sheets'}" berhasil disimpan.`, 'success');
            }}
          />
        )}

        {/* Toast Alert */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
            <div className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-white border-emerald-300 text-emerald-800'
                : toast.type === 'warning'
                ? 'bg-white border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
