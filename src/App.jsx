import React, { useState, useEffect, useMemo } from 'react';
import { AppSidebar } from './components/app-sidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './components/ui/breadcrumb';
import { Separator } from './components/ui/separator';
import { RefreshCw, UserPlus, Link2, ArrowRight } from 'lucide-react';
import KpiBento from './components/KpiBento';
import RegistrantTable from './components/RegistrantTable';
import RegistrantsView from './features/registrations/RegistrantsView';
import PaymentsView from './features/payments/PaymentsView';
import TicketsView from './features/tickets/TicketsView';
import DashboardOverview from './features/dashboard/DashboardOverview';
import ParticipantDetailDrawer from './components/ParticipantDetailDrawer';
import AttendanceSection from './components/AttendanceSection';
import AttendanceView from './features/attendance/AttendanceView';
import RundownStageView from './features/rundown/RundownStageView';
import CertificatesView from './features/certificates/CertificatesView';
import FinancialPnl from './components/FinancialPnl';
import BusinessIntelligenceView from './features/business/BusinessIntelligenceView';
import ConversionView from './features/conversion/ConversionView';
import TemplateStudioView from './features/templates/TemplateStudioView';
import ParticipantProfile360Modal from './features/registrations/ParticipantProfile360Modal';
import PublicRegistrationWizard from './features/public_registration/PublicRegistrationWizard';
import PublicAttendanceForm from './features/public_registration/PublicAttendanceForm';
import WebRegistrationSettingsView from './features/registrations/WebRegistrationSettingsView';
import RbacManagementView from './features/system/RbacManagementView';
import AuditLogView from './features/system/AuditLogView';
import VoucherManagementView from './features/vouchers/VoucherManagementView';
import ConfigModal from './components/ConfigModal';
import ProofModal from './components/ProofModal';
import AddModal from './components/AddModal';
import EditRegistrantModal from './components/EditRegistrantModal';
import CertificateModal from './components/CertificateModal';
import LoginPage from './components/LoginPage';
import AdminLoginGate from './features/auth/AdminLoginGate';
import { useAuth } from './context/AuthContext';
import CommunicationCenter from './features/communication/CommunicationCenter';
import EmailLayoutVerificationView from './features/communication/EmailLayoutVerificationView';
import EventsPortfolioView from './features/events/EventsPortfolioView';
import EventSelector from './features/events/EventSelector';
import CertificateVerification from './features/verify/CertificateVerification';
import DynamicEventLandingPage from './features/landing/DynamicEventLandingPage';
import PaymentLedgerModal from './features/payments/PaymentLedgerModal';
import RegistrationMembersModal from './features/registrations/RegistrationMembersModal';
import TicketPreviewModal from './features/tickets/TicketPreviewModal';
import EmailPreviewModal from './features/communication/EmailPreviewModal';
import FastVerifyModal from './features/payments/FastVerifyModal';
import SyncDashboard from './components/SyncDashboard';
import ExternalSourceModal from './components/ExternalSourceModal';
import { externalSourceService } from './services/externalSourceService';
import { useEvent } from './context/EventContext';
import { registrationService } from './services/registrationService';
import { paymentService } from './services/paymentService';
import { attendanceService } from './services/attendanceService';
import { certificateService } from './services/certificateService';
import { fetchFromGoogleOAuth } from './services/sheetsService';

import { 
  requestGoogleAccessToken,
  sendEmailViaGmail, 
  buildTicketEmailHtml, 
  buildCertificateEmailHtml, 
  uploadBackupToDrive 
} from './services/googleApiService';
import { 
  formatRupiah,
  generateNextTicketNumber, 
  generateNextCertNumber, 
  generateVoucherCode 
} from './utils/formatters';
import { 
  normalizeCertificateName, 
  normalizeEmail, 
  normalizeWhatsApp 
} from './utils/normalizers';

/**
 * ActiveSourceLoader — Side-effect component: auto-load primary active source for event
 */
function ActiveSourceLoader({ eventId, onLoaded }) {
  useEffect(() => {
    if (!eventId) return;
    externalSourceService.getActivePrimary(eventId)
      .then(src => { if (src) onLoaded(src); })
      .catch(e => console.warn('ActiveSourceLoader:', e));
  }, [eventId]);
  return null;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname + window.location.hash);
  const { activeEvent } = useEvent();
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Stealth Keyboard Shortcut: Ctrl + Shift + A or Ctrl + Alt + D opens hidden admin portal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (e.ctrlKey && e.altKey && (e.key === 'D' || e.key === 'd'))
      ) {
        e.preventDefault();
        window.location.hash = '#/portal-dignity';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Standalone Public Certificate Verification route (e.g. /verify/:code or #/verify/:code)
  if (currentPath.includes('/verify/')) {
    const extractedCode = currentPath.split('/verify/')[1]?.split('?')[0]?.split('/')[0] || '';
    return <CertificateVerification initialCode={decodeURIComponent(extractedCode)} />;
  }

  // 2. Standalone Public Registration Intake route (e.g. /daftar or #/daftar or /register or #/register)
  if (currentPath.includes('/daftar') || currentPath.includes('/register')) {
    return (
      <>
        <PublicRegistrationWizard activeEvent={activeEvent} />
        {authUser && (
          <div className="fixed bottom-4 right-4 z-50">
            <a
              href="#/portal-dignity"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-amber-400 border border-amber-500/40 text-[11px] font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>👑 Kembali ke Command Center</span>
            </a>
          </div>
        )}
      </>
    );
  }

  // 3. Standalone Public Attendance Intake route (e.g. /presensi or #/presensi or /absen or #/absen)
  if (currentPath.includes('/presensi') || currentPath.includes('/absen')) {
    return (
      <>
        <PublicAttendanceForm />
        {authUser && (
          <div className="fixed bottom-4 right-4 z-50">
            <a
              href="#/portal-dignity"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-amber-400 border border-amber-500/40 text-[11px] font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
            >
              <span>👑 Kembali ke Command Center</span>
            </a>
          </div>
        )}
      </>
    );
  }

  // 4. Secret Admin Route (e.g. /portal-dignity, /command-center, /admin-access, /admin)
  const isAdminRoute = currentPath.includes('/portal-dignity') || 
                       currentPath.includes('/command-center') || 
                       currentPath.includes('/admin-access') ||
                       currentPath.includes('/admin');

  if (isAdminRoute) {
    if (authLoading) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-amber-400 font-mono text-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Memverifikasi Otorisasi Sesi Staf...</span>
          </div>
        </div>
      );
    }

    if (!authUser) {
      return <AdminLoginGate onBackToPublic={() => window.location.hash = '#/'} />;
    }

    return <AdminCommandCenter currentPath={currentPath} setCurrentPath={setCurrentPath} />;
  }

  // 5. Default Public Route (e.g. / or #/ or /event/:slug) -> Dynamic Landing Page
  return (
    <>
      <DynamicEventLandingPage />
      {authUser && (
        <div className="fixed bottom-4 right-4 z-50">
          <a
            href="#/portal-dignity"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-amber-400 border border-amber-500/40 text-xs font-bold shadow-xl backdrop-blur-md transition-all hover:scale-105"
          >
            <span>👑 Mode Staf: Buka Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </>
  );
}

/**
 * AdminCommandCenter — Authenticated Staff Operations Dashboard
 * Rendered only when staff is authenticated and on internal admin routes.
 * All internal dashboard hooks run unconditionally with zero rule-of-hooks violations.
 */
function AdminCommandCenter({ currentPath, setCurrentPath }) {
  const { events, activeEvent, activeEventId, setActiveEventId, refreshEvents } = useEvent();
  const { user: authUser, profile: authProfile, role: authRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentSubTab, setPaymentSubTab] = useState('pending');
  const [ticketSubFilter, setTicketSubFilter] = useState('all');
  const [activeDrawerParticipant, setActiveDrawerParticipant] = useState(null);
  const [activeLedgerRegistrant, setActiveLedgerRegistrant] = useState(null);
  const [activeMabarRegistrant, setActiveMabarRegistrant] = useState(null);
  const [activeTicketRegistrant, setActiveTicketRegistrant] = useState(null);
  const [activeEmailPreviewRegistrant, setActiveEmailPreviewRegistrant] = useState(null);
  const [activeProfile360Participant, setActiveProfile360Participant] = useState(null);
  const [fastVerifyParticipantId, setFastVerifyParticipantId] = useState(null);
  const [isFastVerifyOpen, setIsFastVerifyOpen] = useState(false);
  // Phase 7: Google Workspace Sync
  const [activeSource, setActiveSource] = useState(null);       // external_sources record
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  // Phase 10: Pure Supabase SSOT — No stale localStorage fallback
  const [registrants, setRegistrants] = useState([]);
  const [attendances, setAttendances] = useState([]);

  // Clean stale localStorage caches on mount so outdated browser cache never persists
  useEffect(() => {
    try {
      localStorage.removeItem('digniti_react_registrants');
      localStorage.removeItem('digniti_react_attendances');
    } catch {}
  }, []);
  const [selectedSpeaker, setSelectedSpeaker] = useState(() => {
    return localStorage.getItem('digniti_react_speaker') || 'diyah';
  });

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


  const [googleOAuthToken, setGoogleOAuthToken] = useState(() => {
    return localStorage.getItem('digniti_google_oauth_token') || null;
  });

  // Keep sheet metadata (tab name, column mapping, headers) for direct writes
  const [sheetMeta, setSheetMeta] = useState(() => ({
    tabName: localStorage.getItem('digniti_sheet_tab') || 'Form Responses 1',
    colMap: null,
    rawHeaders: null
  }));

  // Active authenticated staff session
  const currentUser = useMemo(() => ({
    type: 'supabase_auth',
    email: authUser?.email || authProfile?.full_name || 'Staf Internal',
    role: authRole === 'OWNER' ? 'Super Admin (Owner)' : (authRole || 'Staf Dignity'),
    token: googleOAuthToken
  }), [authUser, authProfile, authRole, googleOAuthToken]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeProof, setActiveProof] = useState(null);
  const [activeCert, setActiveCert] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRegistrant, setEditingRegistrant] = useState(null);
  const [toast, setToast] = useState(null);

  // Phase 10: refreshRegistrantsFromDb — reload langsung dari Supabase sebagai SSOT
  const refreshRegistrantsFromDb = async (eventId) => {
    if (!eventId) return;
    try {
      const dbRows = await registrationService.getRegistrationsByEvent(eventId);
      const mapped = (dbRows || []).map(reg => {
        const p = reg.persons || {};
        const pmt = reg.payments?.[0] || {};
        const isLunas = reg.status === 'CONFIRMED' || reg.payments?.some(item => item.status === 'VERIFIED');
        const nominal = reg.total_due || (reg.package_type === 'MABAR_6' ? 500000 : 100000);
        const ticketNo = reg.registration_members?.[0]?.ticket_suffix 
          ? `TICKET-${reg.registration_members[0].ticket_suffix}`
          : `TICKET-DIGNITY-${reg.id.substring(0, 6).toUpperCase()}`;

        return {
          id: reg.id,
          timestamp: reg.created_at?.replace('T', ' ').substring(0, 19) || '',
          nomorTicket: ticketNo,
          nama: normalizeCertificateName(p.full_name || ''),
          email: normalizeEmail(p.email || ''),
          whatsapp: normalizeWhatsApp(p.whatsapp || ''),
          instansi: p.institution || 'Individu',
          kota: p.city || '-',
          kategori: reg.package_type === 'MABAR_6' ? 'Promo Mabar (6 Orang) : Rp 500.000' : 'Tiket Individu (1 Peserta) : Rp 100.000',
          nominal,
          bank: pmt.bank_destination || 'Bank Mandiri',
          buktiUrl: pmt.proof_drive_file_id || '',
          rawBukti: pmt.proof_drive_file_id || '',
          statusBayar: isLunas ? 'LUNAS' : 'PENDING',
          statusEmailTicket: reg.registration_members?.[0]?.ticket_suffix ? 'TERKIRIM' : 'BELUM',
          supabaseRegistrationId: reg.id,
          supabasePaymentId: pmt.id,
          registration_members: reg.registration_members || []
        };
      });
      setRegistrants(mapped);
      showToast(`Data diperbarui dari Supabase (${mapped.length} pendaftar).`, 'success');
    } catch (e) {
      console.warn('refreshRegistrantsFromDb error:', e);
    }
  };


  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('digniti_auth_user', JSON.stringify(userData));
    sessionStorage.setItem('digniti_auth_user', JSON.stringify(userData));
    if (userData.token) {
      setGoogleOAuthToken(userData.token);
      localStorage.setItem('digniti_google_oauth_token', userData.token);
    }
    showToast(`Sesi ${userData.email} aktif.`, 'success');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Sesi staf telah ditutup.', 'info');
    } catch (err) {
      console.warn('Gagal logout:', err);
    }
  };

  useEffect(() => {
    if (googleOAuthToken) {
      localStorage.setItem('digniti_google_oauth_token', googleOAuthToken);
    }
  }, [googleOAuthToken]);

  useEffect(() => {
    localStorage.setItem('digniti_react_speaker', selectedSpeaker);
  }, [selectedSpeaker]);

  // Phase 10: Load registrations from Supabase for activeEventId (Strict SSOT)
  useEffect(() => {
    // Reset state immediately so data from previous event NEVER leaks to another event
    setRegistrants([]);
    setAttendances([]);

    if (!activeEventId) return;

    let isMounted = true;
    async function loadEventRegistrations() {
      try {
        const dbRows = await registrationService.getRegistrationsByEvent(activeEventId);
        if (!isMounted) return;

        if (dbRows && dbRows.length > 0) {
          const mapped = dbRows.map(reg => {
            const p = reg.persons || {};
            const pmt = reg.payments?.[0] || {};
            const isLunas = reg.status === 'CONFIRMED' || reg.payments?.some(item => item.status === 'VERIFIED');
            const nominal = reg.total_due || (reg.package_type === 'MABAR_6' ? 500000 : 100000);
            const ticketNo = reg.registration_members?.[0]?.ticket_suffix 
              ? `TICKET-${reg.registration_members[0].ticket_suffix}`
              : `TICKET-DIGNITY-${reg.id.substring(0, 6).toUpperCase()}`;

            return {
              id: reg.id,
              timestamp: reg.created_at?.replace('T', ' ').substring(0, 19) || '',
              nomorTicket: ticketNo,
              nama: normalizeCertificateName(p.full_name || ''),
              email: normalizeEmail(p.email || ''),
              whatsapp: normalizeWhatsApp(p.whatsapp || ''),
              instansi: p.institution || 'Individu',
              kategori: reg.package_type === 'MABAR_6' ? 'Promo Mabar (6 Orang) : Rp 500.000' : 'Tiket Individu (1 Peserta) : Rp 100.000',
              nominal,
              bank: pmt.bank_destination || 'Bank Mandiri',
              buktiUrl: pmt.proof_drive_file_id || '',
              rawBukti: pmt.proof_drive_file_id || '',
              statusBayar: isLunas ? 'LUNAS' : 'PENDING',
              statusEmailTicket: reg.registration_members?.[0]?.ticket_suffix ? 'TERKIRIM' : 'BELUM',
              supabaseRegistrationId: reg.id,
              supabasePaymentId: pmt.id,
              registration_members: reg.registration_members || []
            };
          });
          setRegistrants(mapped);
        } else {
          setRegistrants([]);
        }
      } catch (err) {
        console.warn('Notice loading Supabase registrations:', err.message);
        if (isMounted) setRegistrants([]);
      }
    }

    loadEventRegistrations();
    refreshAttendances();
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const refreshAttendances = async () => {
    if (!activeEventId) return;
    try {
      const data = await attendanceService.getAttendancesByEvent(activeEventId);
      const mapped = (data || []).map(dbAtt => ({
        id: dbAtt.id,
        nama: dbAtt.persons?.full_name || 'Peserta',
        email: dbAtt.persons?.email || '',
        whatsapp: dbAtt.persons?.whatsapp || '',
        timestamp: dbAtt.join_time || new Date().toISOString(),
        nomorSertifikat: `LPK-DIGNITY/CERT/${new Date().getFullYear()}/${dbAtt.id.slice(0, 6).toUpperCase()}`,
        hambatan: 'Presensi Sesi Live Webinar',
        kodeVoucher: `REBATE-${dbAtt.id.slice(0, 4).toUpperCase()}`,
        status: dbAtt.status,
        durationMinutes: dbAtt.duration_minutes
      }));
      setAttendances(mapped);
    } catch (err) {
      console.warn('Notice refreshAttendances:', err);
      setAttendances([]);
    }
  };

  // KPI Stats
  const kpiStats = useMemo(() => {
    const totalRegistrants = registrants.length;
    const lunasCount = registrants.filter(r => r.statusBayar === 'LUNAS').length;
    const pendingCount = registrants.filter(r => r.statusBayar === 'PENDING').length;
    const unsentTicketsCount = registrants.filter(r => r.statusBayar === 'LUNAS' && r.statusEmailTicket !== 'TERKIRIM').length;
    const totalRevenue = registrants
      .filter(r => r.statusBayar === 'LUNAS')
      .reduce((sum, r) => sum + (r.nominal || 0), 0);
    const certCount = attendances.filter(a => a.statusSertifikat === 'SELESAI').length;
    const readyCertificatesCount = attendances.filter(a => a.statusSertifikat !== 'SELESAI').length;

    return {
      totalRegistrants,
      lunasCount,
      pendingCount,
      unsentTicketsCount,
      totalRevenue,
      certCount,
      readyCertificatesCount
    };
  }, [registrants, attendances]);

  // Actions: Payment Verification with Gmail API & Supabase SSOT
  const handleVerifyPayment = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    // Optimistic UI update
    setRegistrants(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          statusBayar: 'LUNAS',
          statusEmailTicket: 'TERKIRIM'
        };
      }
      return item;
    }));

    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? {
        ...prev,
        statusBayar: 'LUNAS',
        statusEmailTicket: 'TERKIRIM'
      } : null);
    }

    showToast(`Memverifikasi pembayaran ${target.nama}...`, 'info');

    // 1. Direct Write status LUNAS to Supabase (Single Source of Truth)
    try {
      if (target.supabasePaymentId) {
        await paymentService.verifyPayment(target.supabasePaymentId, 'Diverifikasi via Admin Command Center');
      }
      if (target.supabaseRegistrationId) {
        await registrationService.updateRegistrationStatus(target.supabaseRegistrationId, 'CONFIRMED');
      }
      showToast(`Pembayaran ${target.nama} LUNAS! Tersimpan di Supabase ✓`, 'success');
    } catch (err) {
      console.warn('Notice Supabase verifyPayment:', err.message);
      showToast(`Peringatan Supabase: ${err.message}`, 'warning');
    }

    // 2. Dispatch E-Ticket via Gmail API (Tetap Aktif)
    if (googleOAuthToken) {
      try {
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${target.nomorTicket}`;
        const htmlBody = buildTicketEmailHtml(target);
        await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: target.email,
          subject,
          htmlBody
        });
        showToast(`E-Ticket resmi telah terkirim via Gmail ke ${target.email}.`, 'success');
      } catch (err) {
        console.warn('Gmail API send error:', err);
        showToast(`E-Ticket Gmail belum terkirim: ${err.message}`, 'warning');
      }
    } else {
      showToast('Login Google belum aktif. Tiket tersimpan di DB, siap dikirim saat akun Google terhubung.', 'info');
    }
  };

  const handleResendTicket = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    if (googleOAuthToken) {
      try {
        showToast(`Mengirim ulang E-Ticket via Gmail ke ${target.email}...`, 'info');
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${target.nomorTicket}`;
        const htmlBody = buildTicketEmailHtml(target);
        await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: target.email,
          subject,
          htmlBody
        });
        showToast(`E-Ticket resmi berhasil dikirim ulang via Gmail API ke ${target.email}!`, 'success');
      } catch (err) {
        showToast(`Gagal kirim via Gmail: ${err.message}`, 'warning');
      }
    } else {
      showToast('Silakan login akun Google terlebih dahulu untuk mengirim E-Ticket via Gmail.', 'warning');
    }
  };

  // Actions: Reject Payment with Required Reason
  const handleRejectPaymentWithReason = async (id, reason) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    setRegistrants(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          statusBayar: 'DITOLAK',
          rejectionReason: reason
        };
      }
      return item;
    }));

    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? {
        ...prev,
        statusBayar: 'DITOLAK',
        rejectionReason: reason
      } : null);
    }

    showToast(`Pembayaran ${target.nama} ditolak: ${reason}`, 'warning');

    // Supabase update if linked
    try {
      if (target.supabasePaymentId) {
        await paymentService.rejectPayment(target.supabasePaymentId, reason);
      }
    } catch (err) {
      console.warn('Notice Supabase rejectPayment:', err);
    }

    // Google Sheets update
    try {
      if (googleOAuthToken && config.spreadsheetId) {
        await updateSheetPaymentStatus({
          spreadsheetId: config.spreadsheetId,
          accessToken: googleOAuthToken,
          tabName: target.sheetTabName || sheetMeta.tabName || 'Form Responses 1',
          rowIndex: target.rowIndex,
          colStatusIndex: target.colMap?.status ?? 12,
          colTicketIndex: target.colMap?.ticket ?? -1,
          colStatusEmailIndex: target.colMap?.statusEmail ?? -1,
          colBuktiIndex: target.colMap?.bukti ?? 6,
          status: 'DITOLAK',
          nomorTicket: target.nomorTicket,
          statusEmail: target.statusEmailTicket,
          gasWebAppUrl: config.gasWebAppUrl
        });
      }
    } catch (err) {
      console.warn('Google Sheets status DITOLAK notice:', err);
    }
  };

  // Actions: Save Internal Admin Notes
  const handleUpdateNotes = (id, note) => {
    setRegistrants(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          adminNotes: note
        };
      }
      return item;
    }));

    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? {
        ...prev,
        adminNotes: note
      } : null);
    }

    showToast('Catatan internal pendaftar tersimpan', 'success');
  };

  // Actions: Manual Toggle Status with Supabase SSOT
  const handleToggleStatus = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    const nextStatus = target.statusBayar === 'LUNAS' ? 'PENDING' : 'LUNAS';

    // Optimistic UI update
    setRegistrants(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          statusBayar: nextStatus
        };
      }
      return item;
    }));

    showToast(`Mengubah status ${target.nama} ke ${nextStatus}...`, 'info');

    // Direct write to Supabase
    try {
      if (target.supabaseRegistrationId) {
        const dbRegStatus = nextStatus === 'LUNAS' ? 'CONFIRMED' : 'PENDING';
        await registrationService.updateRegistrationStatus(target.supabaseRegistrationId, dbRegStatus);
      }
      if (target.supabasePaymentId) {
        if (nextStatus === 'LUNAS') {
          await paymentService.verifyPayment(target.supabasePaymentId, 'Toggle status via Dashboard');
        } else {
          await supabase.from('payments').update({ status: 'PENDING', verified_at: null }).eq('id', target.supabasePaymentId);
        }
      }
      showToast(`Status ${target.nama} (${nextStatus}) berhasil tersimpan di Supabase ✓`, 'success');
    } catch (err) {
      console.warn('Gagal toggle status di Supabase:', err);
      showToast(`Peringatan Supabase: ${err.message}`, 'warning');
    }
  };

  // Actions: Batch Send Tickets via Gmail API
  const handleBatchSendTickets = async () => {
    if (!googleOAuthToken) {
      showToast('Silakan login dengan akun Google terlebih dahulu untuk mengirim blast email.', 'warning');
      return;
    }
    const lunasList = registrants.filter(r => r.statusBayar === 'LUNAS');
    if (lunasList.length === 0) {
      showToast('Tidak ada pendaftar berstatus LUNAS untuk dikirimi tiket.', 'info');
      return;
    }
    showToast(`Memulai pengiriman tiket via Gmail ke ${lunasList.length} peserta...`, 'info');
    let sentCount = 0;
    for (const r of lunasList) {
      try {
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${r.nomorTicket}`;
        const htmlBody = buildTicketEmailHtml(r);
        await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: r.email,
          subject,
          htmlBody
        });
        sentCount++;
      } catch (e) {
        console.warn(`Gagal kirim tiket ke ${r.email}:`, e);
      }
    }
    setRegistrants(prev => prev.map(item => item.statusBayar === 'LUNAS' ? { ...item, statusEmailTicket: 'TERKIRIM' } : item));
    showToast(`Selesai! ${sentCount} E-Ticket resmi berhasil dikirim via Gmail API!`, 'success');
  };

  // Actions: Backup Data to Google Drive
  const handleBackupToDrive = async () => {
    if (!googleOAuthToken) {
      showToast('Silakan login dengan akun Google terlebih dahulu untuk mencadangkan ke Drive.', 'warning');
      return;
    }
    try {
      showToast('Mengunggah data pendaftar ke Google Drive...', 'info');
      let csv = 'Timestamp,Nomor_Ticket,Nama_Lengkap,Email,WhatsApp,Instansi,Kategori,Nominal,Bank,Status_Bayar,Status_Email\n';
      registrants.forEach(r => {
        csv += `"${r.timestamp}","${r.nomorTicket}","${r.nama}","${r.email}","${r.whatsapp}","${r.instansi}","${r.kategori}",${r.nominal},"${r.bank}","${r.statusBayar}","${r.statusEmailTicket}"\n`;
      });
      const fileName = `Backup_Pendaftar_Dignity_${new Date().toISOString().substring(0, 10)}.csv`;
      const res = await uploadBackupToDrive({
        accessToken: googleOAuthToken,
        fileName,
        content: csv,
        mimeType: 'text/csv'
      });
      showToast(`Data berhasil dicadangkan ke Google Drive! (ID Berkas: ${res.id})`, 'success');
    } catch (err) {
      showToast(`Gagal mencadangkan ke Drive: ${err.message}`, 'warning');
    }
  };

  // Actions: Certificate Email with Gmail API
  const handleSendCertEmail = async (id) => {
    setAttendances(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, statusEmailSertifikat: 'TERKIRIM' };
      }
      return item;
    }));

    const target = attendances.find(a => a.id === id);
    if (target) {
      // Phase 6: Ensure certificate record is issued in Supabase
      if (activeEvent?.id && (target.person_id || target.personId)) {
        try {
          const certRecord = await certificateService.issueCertificate({
            eventId: activeEvent.id,
            personId: target.person_id || target.personId,
            rawName: target.nama
          });
          if (certRecord) {
            target.nomorSertifikat = certRecord.certificate_no;
            target.verification_code = certRecord.verification_code;
            target.verificationCode = certRecord.verification_code;
          }
        } catch (cErr) {
          console.warn('Notice Supabase certificate issuance:', cErr.message);
        }
      }

      // Resolve Next Event for alumni rebate voucher
      const nextEvent = activeEvent?.next_event_id ? events.find(e => e.id === activeEvent.next_event_id) : null;
      const nextEventSlug = nextEvent?.slug || 'eb-solo-nov-2026';
      const defaultVoucherCode = target.kodeVoucher || 'REBATE250K-CPSP';
      const registerNextUrl = `${window.location.origin}${window.location.pathname}#/daftar?event=${nextEventSlug}&voucher=${defaultVoucherCode}`;

      if (googleOAuthToken) {
        try {
          showToast(`Mengirim E-Sertifikat & Voucher via Gmail ke ${target.email}...`, 'info');
          const subject = `E-Sertifikat Kelulusan & Voucher Rebate Alumni - ${target.nama}`;
          const htmlBody = buildCertificateEmailHtml(target, {
            eventTitle: activeEvent?.title,
            bootcampTitle: nextEvent?.title || 'Executive Bootcamp Offline 2 Hari di Sala View Hotel Solo',
            bootcampDates: nextEvent?.date_start ? new Date(nextEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '28 - 29 November 2026',
            verifyUrl: `${window.location.origin}${window.location.pathname}#/verify/${encodeURIComponent(target.nomorSertifikat || target.verificationCode || 'cert')}`,
            registerNextUrl,
            voucherDiscount: 'Rp 100.000'
          });
          await sendEmailViaGmail({
            accessToken: googleOAuthToken,
            to: target.email,
            subject,
            htmlBody
          });
          showToast(`E-Sertifikat & Voucher Alumni berhasil dikirim via Gmail ke ${target.email}!`, 'success');
        } catch (err) {
          showToast(`Gagal kirim via Gmail: ${err.message}`, 'warning');
        }
      } else {
        showToast('Login Google belum aktif. Silakan login dengan akun Google di pojok/pengaturan untuk mengirim sertifikat via Gmail API.', 'warning');
      }
    }
  };

  const handleBatchProcessCertificates = async () => {
    if (attendances.length === 0) {
      showToast('Tidak ada data presensi yang tersedia untuk dikirim sertifikat.', 'info');
      return;
    }

    // Phase 6: Batch issue certificates in Supabase for all eligible attendees
    if (activeEvent?.id) {
      try {
        const eligibleAttendees = attendances.filter(a => 
          a.status === 'CERTIFICATE_ELIGIBLE' || 
          !a.status || 
          a.status === 'READY'
        );
        if (eligibleAttendees.length > 0) {
          await certificateService.batchIssueCertificates({
            eventId: activeEvent.id,
            eligibleList: eligibleAttendees
          });
        }
      } catch (bErr) {
        console.warn('Notice batch certificate issuance in Supabase:', bErr.message);
      }
    }

    setAttendances(prev => prev.map(item => ({
      ...item,
      statusSertifikat: 'SELESAI',
      statusEmailSertifikat: 'TERKIRIM'
    })));

    if (googleOAuthToken) {
      showToast(`Memulai pengiriman sertifikat ke ${attendances.length} peserta via Gmail API...`, 'info');
      const nextEvent = activeEvent?.next_event_id ? events.find(e => e.id === activeEvent.next_event_id) : null;
      const nextEventSlug = nextEvent?.slug || 'eb-solo-nov-2026';

      let sentCount = 0;
      for (const item of attendances) {
        try {
          const voucherCode = item.kodeVoucher || 'REBATE250K-CPSP';
          const registerNextUrl = `${window.location.origin}${window.location.pathname}#/daftar?event=${nextEventSlug}&voucher=${voucherCode}`;

          const subject = `E-Sertifikat Kelulusan & Voucher Rebate Alumni - ${item.nama}`;
          const htmlBody = buildCertificateEmailHtml(item, {
            eventTitle: activeEvent?.title,
            bootcampTitle: nextEvent?.title || 'Executive Bootcamp Offline 2 Hari di Sala View Hotel Solo',
            bootcampDates: nextEvent?.date_start ? new Date(nextEvent.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '28 - 29 November 2026',
            verifyUrl: `${window.location.origin}${window.location.pathname}#/verify/${encodeURIComponent(item.nomorSertifikat || item.verificationCode || 'cert')}`,
            registerNextUrl,
            voucherDiscount: 'Rp 100.000'
          });
          await sendEmailViaGmail({
            accessToken: googleOAuthToken,
            to: item.email,
            subject,
            htmlBody
          });
          sentCount++;
        } catch (e) {
          console.warn(`Gagal kirim sertifikat ke ${item.email}:`, e);
        }
      }
      showToast(`Selesai! ${sentCount} E-Sertifikat & Voucher berhasil dikirim via Gmail API resmi.`, 'success');
    } else {
      attendances.forEach(item => {
        postSendCertificateEmail(config.gasWebAppUrl, {
          nomorSertifikat: item.nomorSertifikat,
          nama: item.nama,
          email: item.email,
          kodeVoucher: item.kodeVoucher
        });
      });
      showToast(`Sukses memproses & mengirim otomatis ${attendances.length} E-Sertifikat PDF!`, 'success');
    }
  };

  // Google OAuth Login
  const handleGoogleOAuthLogin = () => {
    if (!config.clientId) {
      showToast('Client ID belum terisi di pengaturan.', 'warning');
      return;
    }
    try {
      requestGoogleAccessToken(
        config.clientId,
        async (token) => {
          setGoogleOAuthToken(token);
          showToast('Login Google Berhasil! Terhubung langsung via OAuth.', 'success');
          if (config.spreadsheetId && !config.spreadsheetId.includes('DIGNIT')) {
            try {
              setIsSyncing(true);
              const data = await fetchFromGoogleOAuth(config.spreadsheetId, token);
              if (data.registrants && data.registrants.length > 0) setRegistrants(data.registrants);
              if (data.attendances && data.attendances.length > 0) setAttendances(data.attendances);
              if (data.tabName) {
                setSheetMeta({
                  tabName: data.tabName,
                  colMap: data.colMap,
                  rawHeaders: data.rawHeaders
                });
                localStorage.setItem('digniti_sheet_tab', data.tabName);
              }
              showToast('Sinkronisasi Google Sheets OAuth Berhasil!', 'success');
            } catch (err) {
              showToast(`Error OAuth: ${err.message}`, 'warning');
            } finally {
              setIsSyncing(false);
            }
          }
        },
        (err) => {
          showToast(`Otorisasi Google: ${err}`, 'warning');
        }
      );
    } catch (err) {
      showToast(err.message, 'warning');
    }
  };

  // Actions: Refresh Data from Supabase (100% SSOT)
  const handleRefreshFromSupabase = async () => {
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
      showToast('Data pendaftar & presensi berhasil disegarkan langsung dari Supabase Database!', 'success');
    } catch (err) {
      console.warn('Refresh error:', err);
      showToast(`Gagal menyegarkan data dari database: ${err.message}`, 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    let tested = false;

    if (googleOAuthToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleOAuthToken}` }
        });
        if (res.ok) {
          const userinfo = await res.json();
          showToast(`Koneksi Google OAuth 2.0 Aktif (${userinfo.email})! Siap blast email via Gmail API ✓`, 'success');
          tested = true;
        } else {
          showToast('Token Google OAuth telah kadaluarsa, silakan login ulang akun Google.', 'warning');
        }
      } catch (err) {
        showToast(`Error OAuth: ${err.message}`, 'warning');
      }
    }

    if (!tested) {
      showToast('Token Google belum terhubung. Silakan klik Login Otorisasi Google untuk blast email.', 'info');
    }

    setIsTesting(false);
  };

  const handleSaveConfig = (newConfig) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      Object.entries(updated).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          localStorage.setItem(`digniti_react_${key}`, String(val));
        }
      });
      // Specific legacy keys for backward compatibility
      if (updated.gasWebAppUrl) localStorage.setItem('digniti_react_gas_url', updated.gasWebAppUrl);
      if (updated.googleApiKey) localStorage.setItem('digniti_react_google_api_key', updated.googleApiKey);
      if (updated.clientId) localStorage.setItem('digniti_react_client_id', updated.clientId);
      if (updated.spreadsheetId) localStorage.setItem('digniti_react_spreadsheet_id', updated.spreadsheetId);
      if (updated.adminPhone) localStorage.setItem('digniti_react_admin_phone', updated.adminPhone);
      if (updated.defaultSpeaker) localStorage.setItem('digniti_react_speaker', updated.defaultSpeaker);
      return updated;
    });
    showToast('Konfigurasi .env & parameter sistem berhasil diperbarui!', 'success');
  };

  // Actions: Manual Registrant Addition with Direct Supabase Insert (100% SSOT)
  const handleAddRegistrant = async (data) => {
    if (!activeEventId) {
      showToast('Pilih acara terlebih dahulu sebelum menambah peserta.', 'warning');
      return;
    }

    const nextTicket = generateNextTicketNumber(registrants.length);
    const cleanNama = normalizeCertificateName(data.nama);
    const cleanEmail = normalizeEmail(data.email);
    const cleanWa = normalizeWhatsApp(data.whatsapp);
    const nominal = parseInt(data.nominal, 10) || 100000;

    showToast(`Menyimpan pendaftar ${cleanNama} ke Supabase...`, 'info');

    try {
      const created = await registrationService.createRegistration({
        eventId: activeEventId,
        personData: {
          full_name: cleanNama,
          email: cleanEmail,
          whatsapp: cleanWa,
          institution: data.instansi || 'Individu',
          city: data.kota || '-'
        },
        packageType: data.kategori?.includes('Mabar') ? 'MABAR_6' : 'INDIVIDU',
        isMabar: data.kategori?.includes('Mabar'),
        totalDue: nominal,
        notes: data.catatanCS || 'Diinput manual dari Dashboard'
      });

      const newEntry = {
        id: created?.id || Date.now(),
        supabaseRegistrationId: created?.id,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        nomorTicket: nextTicket,
        ...data,
        nama: cleanNama,
        email: cleanEmail,
        whatsapp: cleanWa,
        instansi: data.instansi || 'Individu',
        kota: data.kota || '-',
        nominal,
        statusBayar: data.statusBayar || 'PENDING',
        statusEmailTicket: data.statusBayar === 'LUNAS' ? 'TERKIRIM' : 'BELUM'
      };

      setRegistrants(prev => [newEntry, ...prev]);
      showToast(`Pendaftar baru ${cleanNama} berhasil tersimpan di Supabase ✓`, 'success');
      setIsAddOpen(false);
    } catch (err) {
      console.error('Gagal tambah pendaftar ke Supabase:', err);
      showToast(`Gagal menyimpan ke Supabase: ${err.message}`, 'warning');
    }
  };

  // Actions: Save Edited Registrant & Override Nominal with Direct Supabase Update
  const handleSaveEditedRegistrant = async (updated) => {
    const cleanUpdated = {
      ...updated,
      nama: normalizeCertificateName(updated.nama),
      email: normalizeEmail(updated.email),
      whatsapp: normalizeWhatsApp(updated.whatsapp),
      nominal: parseInt(updated.nominal, 10) || 100000
    };

    setRegistrants(prev => prev.map(item => item.id === cleanUpdated.id ? cleanUpdated : item));
    showToast(`Menyimpan perubahan data ${cleanUpdated.nama} ke Supabase...`, 'info');
    setEditingRegistrant(null);

    // Direct write to Supabase
    try {
      if (cleanUpdated.supabaseRegistrationId) {
        await registrationService.updateRegistration(cleanUpdated.supabaseRegistrationId, {
          fullName: cleanUpdated.nama,
          email: cleanUpdated.email,
          whatsapp: cleanUpdated.whatsapp,
          institution: cleanUpdated.instansi,
          city: cleanUpdated.kota,
          packageType: cleanUpdated.kategori?.includes('Mabar') ? 'MABAR_6' : 'INDIVIDU',
          totalDue: cleanUpdated.nominal,
          status: cleanUpdated.statusBayar === 'LUNAS' ? 'CONFIRMED' : 'PENDING'
        });
        showToast(`Perubahan data ${cleanUpdated.nama} berhasil tersimpan di Supabase ✓`, 'success');
      }
    } catch (err) {
      console.warn('Gagal update detail di Supabase:', err);
      showToast(`Peringatan Supabase: ${err.message}`, 'warning');
    }
  };

  // Actions: Delete Registrant with Supabase Delete
  const handleDeleteRegistrant = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;
    if (window.confirm(`Hapus pendaftar "${target.nama}" (${target.nomorTicket}) dari database Supabase secara permanen?`)) {
      try {
        if (target.supabaseRegistrationId) {
          await registrationService.deleteRegistration(target.supabaseRegistrationId);
        }
        setRegistrants(prev => prev.filter(r => r.id !== id));
        showToast(`Data pendaftar ${target.nama} berhasil dihapus dari Supabase.`, 'info');
        setEditingRegistrant(null);
      } catch (err) {
        console.error('Gagal hapus pendaftar dari Supabase:', err);
        showToast(`Gagal menghapus dari database: ${err.message}`, 'warning');
      }
    }
  };

  // Actions: Delete Attendance with Supabase Delete
  const handleDeleteAttendance = async (id) => {
    const target = attendances.find(a => a.id === id);
    if (!target) return;
    if (window.confirm(`Hapus data presensi "${target.nama}" dari database Supabase?`)) {
      try {
        await attendanceService.deleteAttendance(id);
        setAttendances(prev => prev.filter(a => a.id !== id));
        showToast(`Data presensi ${target.nama} berhasil dihapus dari Supabase.`, 'info');
      } catch (err) {
        console.error('Gagal hapus presensi dari Supabase:', err);
        showToast(`Gagal menghapus presensi: ${err.message}`, 'warning');
      }
    }
  };

  // Actions: Export CSV
  const handleExportCsv = () => {
    let csv = 'Timestamp,Nomor_Ticket,Nama_Lengkap,Email,WhatsApp,Instansi,Kategori,Nominal,Bank,Status_Bayar,Status_Email\n';
    registrants.forEach(r => {
      csv += `"${r.timestamp}","${r.nomorTicket}","${r.nama}","${r.email}","${r.whatsapp}","${r.instansi}","${r.kategori}",${r.nominal},"${r.bank}","${r.statusBayar}","${r.statusEmailTicket}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Pendaftar_Webinar_${new Date().toISOString().substring(0,10)}.csv`;
    a.click();
    showToast('File CSV pendaftar berhasil diunduh!', 'success');
  };

  const tabBreadcrumbTitles = {
    'events-portfolio': 'Portfolio & Pipeline Ekosistem Acara',
    dashboard: 'Dashboard Eksekutif & Action Inbox',
    registrants: 'Data Pendaftar (Registrations)',
    registrasi: 'Data Pendaftar (Registrations)',
    payments: 'Verifikasi Pembayaran (Finance)',
    tickets: 'Manajemen Tiket & Grup MABAR',
    attendance: 'Presensi & Kehadiran Peserta',
    rundown: 'Rundown & Stage Management Engine (PRD 16)',
    certificates: 'Penerbitan & Verifikasi E-Sertifikat',
    sertifikat: 'Presensi & E-Sertifikat',
    communication: 'Communication & Delivery Center',
    revenue: 'Monitor Finansial & Simulasi P&L',
    finansial: 'Monitor Finansial & Simulasi P&L',
    conversion: 'Funnel Konversi Bootcamp & Leads',
    templates: 'Template Studio (WhatsApp & Email)',
    'email-preview': 'Verifikasi Layout Email Pengiriman',
    rbac: 'Manajemen Hak Akses & Tim (RBAC)',
    audit: 'Audit Log & Keamanan Sistem',
    vouchers: '🏷️ Manajemen Voucher & Diskon',
    sync: 'Google Workspace 2-Way Sync',
    pengaturan: 'Pengaturan Sistem (.env) & API',
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-[100dvh] w-full bg-slate-50 text-slate-900 selection:bg-amber-500/20 selection:text-amber-900 font-sans">
        {/* Modern Collapsible Sidebar-07 */}
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

        {/* Dynamic Main Content with SidebarInset */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-slate-50/70 overflow-hidden">
          {/* Sticky Modern Top Navigation Bar */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 md:px-6 backdrop-blur-xl transition-[width,height] ease-linear shadow-xs">
            {/* Left: Trigger & Breadcrumbs & Event Selector */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors" />
              <Separator orientation="vertical" className="h-4 bg-slate-200" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden sm:inline-flex">
                    <BreadcrumbLink
                      onClick={() => setActiveTab('dashboard')}
                      className="text-slate-500 hover:text-slate-900 text-xs cursor-pointer font-medium"
                    >
                      Dignity Command
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline-flex text-slate-300" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs font-semibold text-amber-700 font-mono tracking-wide">
                      {tabBreadcrumbTitles[activeTab] || 'Dashboard'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Separator orientation="vertical" className="h-4 bg-slate-200 hidden md:block" />
              <div className="hidden md:block">
                <EventSelector onOpenPortfolio={() => setActiveTab('events-portfolio')} />
              </div>
            </div>

            {/* Right: Sync Status & Quick CTAs */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Google API Status Indicator */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    googleOAuthToken ? 'bg-emerald-500 breathing-dot' : 'bg-amber-500'
                  }`}
                ></span>
                <span className="text-slate-700 font-medium">
                  {googleOAuthToken ? 'Google OAuth Active' : 'API Key Live'}
                </span>
              </div>

              {/* Segarkan Data Supabase Button */}
              <button
                onClick={handleRefreshFromSupabase}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`}
                  strokeWidth={2}
                />
                <span className="hidden sm:inline">
                  {isSyncing ? 'Menyegarkan...' : 'Segarkan Data'}
                </span>
              </button>

              {/* Tambah Manual Button */}
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all duration-200 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span className="hidden xs:inline">Tambah Manual</span>
              </button>
            </div>
          </header>

          {/* Scrollable Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
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

              {/* Mobile Event Selector */}
              <div className="md:hidden">
                <EventSelector onOpenPortfolio={() => setActiveTab('events-portfolio')} />
              </div>
            </div>

            {/* Cross-Event Funnel Chaining Banner */}
            {activeTab !== 'events-portfolio' && (activeEvent?.next_event_id || activeEvent?.parent_event_id) && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/70 to-slate-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>Rantai Funnel Ekosistem:</span>
                      {activeEvent.parent_event_id && (
                        <span className="text-slate-500 font-normal">
                          Bersumber dari{' '}
                          <strong className="text-slate-800">
                            {events.find(e => e.id === activeEvent.parent_event_id)?.title || 'Acara Induk'}
                          </strong>
                          {' '}➔
                        </span>
                      )}
                      <span className="text-amber-900 font-extrabold">
                        {activeEvent.title}
                      </span>
                      {activeEvent.next_event_id && (
                        <span className="text-emerald-700 font-normal">
                          ➔ Disambungkan ke{' '}
                          <strong className="text-emerald-900">
                            {events.find(e => e.id === activeEvent.next_event_id)?.title || 'Acara Lanjutan'}
                          </strong>
                        </span>
                      )}
                    </div>
                    {activeEvent.rebate_voucher_code && (
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Alumni acara ini berhak atas Voucher Rebate{' '}
                        <span className="font-mono font-bold text-amber-700 bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300">
                          {activeEvent.rebate_voucher_code}
                        </span>{' '}
                        (Potongan {formatRupiah(activeEvent.rebate_voucher_amount || 100000)}) untuk pendaftaran acara lanjutan!
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('events-portfolio')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                  >
                    Buka Peta Pipeline
                  </button>
                  {activeEvent.next_event_id && (
                    <button
                      onClick={() => {
                        setActiveEventId(activeEvent.next_event_id);
                        setActiveTab('dashboard');
                      }}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
                    >
                      <span>Buka Acara Lanjutan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Tab Panes */}
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
                onNavigateTab={(tab, filter) => {
                  setActiveTab(tab);
                  if (tab === 'payments' && filter) setPaymentSubTab(filter);
                  if (tab === 'tickets' && filter) setTicketSubFilter(filter);
                }}
                onOpenDrawerWithParticipant={(p) => setActiveDrawerParticipant(p)}
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
                onSelectParticipant={(p) => setActiveDrawerParticipant(p)}
                onOpenFastVerify={(id) => {
                  setFastVerifyParticipantId(id);
                  setIsFastVerifyOpen(true);
                }}
                onOpenAdd={() => setIsAddOpen(true)}
                onExportCsv={handleExportCsv}
                onBackupToDrive={handleBackupToDrive}
                onOpenWebSettings={() => setActiveTab('web-registration-settings')}
                hasGoogleToken={Boolean(googleOAuthToken)}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsView
                registrants={registrants}
                initialTab={paymentSubTab}
                onSelectParticipant={(p) => setActiveDrawerParticipant(p)}
                onOpenFastVerify={(id) => {
                  setFastVerifyParticipantId(id);
                  setIsFastVerifyOpen(true);
                }}
                onVerifyPayment={handleVerifyPayment}
                onRejectPaymentWithReason={handleRejectPaymentWithReason}
                onViewProof={(url, name, rawBukti) => setActiveProof({ 
                  url, 
                  name, 
                  rawBukti, 
                  token: googleOAuthToken,
                  clientId: config.clientId
                })}
                onOpenLedger={(p) => setActiveLedgerRegistrant(p)}
              />
            )}

            {activeTab === 'tickets' && (
              <TicketsView
                registrants={registrants}
                initialFilter={ticketSubFilter}
                onSelectParticipant={(p) => setActiveDrawerParticipant(p)}
                onOpenTicketPreview={(p) => setActiveTicketRegistrant(p)}
                onPreviewEmailTicket={(p) => setActiveEmailPreviewRegistrant(p)}
                onOpenMembers={(p) => setActiveMabarRegistrant(p)}
                onResendTicket={handleResendTicket}
                onBatchSendTickets={handleBatchSendTickets}
                hasGoogleToken={Boolean(googleOAuthToken)}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView
                attendances={attendances}
                registrants={registrants}
                onSelectParticipant={(p) => setActiveDrawerParticipant(p)}
                onPreviewCert={(item) => setActiveCert(item)}
                onDeleteAttendance={handleDeleteAttendance}
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
                onPreviewCert={(item) => setActiveCert(item)}
                onSendCertEmail={handleSendCertEmail}
                onBatchProcessCertificates={handleBatchProcessCertificates}
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
                onSelectParticipant={(p) => setActiveDrawerParticipant(p)}
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

            {activeTab === 'rbac' && (
              <RbacManagementView />
            )}

            {activeTab === 'audit' && (
              <AuditLogView />
            )}

            {activeTab === 'vouchers' && (
              <div className="p-6">
                <VoucherManagementView events={events || []} />
              </div>
            )}

            {/* ── Phase 7: Google Workspace Sync Tab ───────────────── */}
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
                  <ActiveSourceLoader
                    eventId={activeEvent.id}
                    onLoaded={setActiveSource}
                  />
                )}

                {activeSource ? (
                  <>
                    <div style={{
                      background: 'var(--glass)', border: '1px solid var(--accent)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                      fontSize: 13, display: 'flex', alignItems: 'center', gap: 12
                    }}>
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>🟢</span>
                      <div>
                        <strong>{activeSource.label || 'Google Sheets'}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                          ID: {activeSource.external_sheet_id?.substring(0, 28)}...
                        </span>
                      </div>
                      {!googleOAuthToken && (
                        <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: 12 }}>
                          ⚠️ Login Google OAuth diperlukan
                        </span>
                      )}
                    </div>
                    <SyncDashboard
                      eventId={activeEvent?.id}
                      spreadsheetId={activeSource?.external_sheet_id || config.spreadsheetId}
                      googleAccessToken={googleOAuthToken}
                      activeSourceId={activeSource?.id}
                      onSyncComplete={(result) => {
                        showToast(
                          `Sync selesai! ↓${result.sheetsToDb?.inserted || 0} baru, ` +
                          `↑${result.dbToSheets?.updated || 0} write-back ke Sheets.`,
                          'success'
                        );
                        // Refresh registrants dari Supabase setelah sync
                        if (activeEvent?.id) {
                          refreshRegistrantsFromDb(activeEvent.id);
                        }
                      }}
                    />
                  </>
                ) : (
                  <div style={{
                    textAlign: 'center', padding: '60px 0',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <p style={{ fontSize: 15, marginBottom: 16 }}>
                      Belum ada Google Sheets yang dihubungkan ke event ini.
                    </p>
                    <button
                      onClick={() => setIsSourceModalOpen(true)}
                      style={{
                        background: 'var(--accent)', color: '#000', border: 'none',
                        borderRadius: 8, padding: '10px 24px', cursor: 'pointer',
                        fontWeight: 700, fontSize: 14
                      }}>
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

        {/* Modals */}
        <ProofModal
          isOpen={Boolean(activeProof)}
          onClose={() => setActiveProof(null)}
          proofData={activeProof}
          onAuthorizeSuccess={(newToken) => {
            setGoogleOAuthToken(newToken);
            localStorage.setItem('digniti_google_oauth_token', newToken);
            setActiveProof(prev => prev ? { ...prev, token: newToken } : null);
            showToast('Akses Google Drive aktif! Gambar bukti dimuat langsung.', 'success');
          }}
        />

        <CertificateModal
          isOpen={Boolean(activeCert)}
          onClose={() => setActiveCert(null)}
          certData={activeCert}
          selectedSpeaker={selectedSpeaker}
        />

        <AddModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAddRegistrant={handleAddRegistrant}
          activeEventId={activeEvent?.id}
        />

        <EditRegistrantModal
          isOpen={Boolean(editingRegistrant)}
          registrant={editingRegistrant}
          onClose={() => setEditingRegistrant(null)}
          onSave={handleSaveEditedRegistrant}
          onDelete={handleDeleteRegistrant}
        />

        <PaymentLedgerModal
          isOpen={Boolean(activeLedgerRegistrant)}
          onClose={() => setActiveLedgerRegistrant(null)}
          registrant={activeLedgerRegistrant}
          onViewProof={(url, name, rawBukti) => {
            setActiveProof({
              url,
              name,
              rawBukti,
              token: googleOAuthToken,
              clientId: config.clientId
            });
          }}
          onPaymentUpdated={(id, newStatus) => {
            setRegistrants(prev => prev.map(r => r.id === id ? { ...r, statusBayar: newStatus } : r));
            showToast(`Status pembayaran diperbarui ke ${newStatus}`, 'success');
          }}
        />

        <RegistrationMembersModal
          isOpen={Boolean(activeMabarRegistrant)}
          onClose={() => setActiveMabarRegistrant(null)}
          registrant={activeMabarRegistrant}
          onOpenTicketPreview={(item, suffix) => {
            setActiveTicketRegistrant({ ...item, selectedSuffix: suffix });
          }}
        />

        <TicketPreviewModal
          isOpen={Boolean(activeTicketRegistrant)}
          onClose={() => setActiveTicketRegistrant(null)}
          registrant={activeTicketRegistrant}
          activeEvent={activeEvent}
        />

        <EmailPreviewModal
          isOpen={Boolean(activeEmailPreviewRegistrant)}
          onClose={() => setActiveEmailPreviewRegistrant(null)}
          registrant={activeEmailPreviewRegistrant}
          type="ticket"
          activeEvent={activeEvent}
          googleOAuthToken={googleOAuthToken}
          onEmailSent={(p) => handleResendTicket(p.id)}
        />

        {/* Phase 7: External Source Modal */}
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

        {/* Universal Right-Side Detail Drawer (DRAWER_ANATOMY.md) */}
        <ParticipantDetailDrawer
          isOpen={Boolean(activeDrawerParticipant)}
          onClose={() => setActiveDrawerParticipant(null)}
          participant={activeDrawerParticipant}
          onVerifyPayment={(id) => handleVerifyPayment(id)}
          onRejectPayment={(p) => handleRejectPaymentWithReason(p.id, 'Bukti Buram / Tidak Terbaca')}
          onResendTicket={(id) => handleResendTicket(id)}
          onOpenTicketPreview={(p) => setActiveTicketRegistrant(p)}
          onOpenLedger={(p) => setActiveLedgerRegistrant(p)}
          onOpenMembers={(p) => setActiveMabarRegistrant(p)}
          onEditParticipant={(p) => setEditingRegistrant(p)}
          onOpenProfile360={(p) => setActiveProfile360Participant(p)}
          onViewProof={(url, name, rawBukti) => setActiveProof({
            url,
            name,
            rawBukti,
            token: googleOAuthToken,
            clientId: config.clientId
          })}
          onUpdateNotes={(id, note) => handleUpdateNotes(id, note)}
          hasGoogleToken={Boolean(googleOAuthToken)}
        />

        {/* Unified Participant 360 Profile Modal */}
        <ParticipantProfile360Modal
          isOpen={Boolean(activeProfile360Participant)}
          onClose={() => setActiveProfile360Participant(null)}
          participant={activeProfile360Participant}
          activeEvent={activeEvent}
          allRegistrations={registrants.filter(r => 
            (activeProfile360Participant?.email && r.email?.toLowerCase() === activeProfile360Participant.email?.toLowerCase()) ||
            (activeProfile360Participant?.whatsapp && r.whatsapp === activeProfile360Participant.whatsapp)
          )}
          attendances={attendances.filter(a =>
            (activeProfile360Participant?.email && a.email?.toLowerCase() === activeProfile360Participant.email?.toLowerCase()) ||
            (activeProfile360Participant?.nama && a.nama?.toLowerCase() === activeProfile360Participant.nama?.toLowerCase())
          )}
          onOpenLedger={(p) => {
            setActiveProfile360Participant(null);
            setActiveLedgerRegistrant(p);
          }}
          onOpenTicket={(p) => {
            setActiveProfile360Participant(null);
            setActiveTicketRegistrant(p);
          }}
          onOpenCert={(item) => {
            setActiveProfile360Participant(null);
            setActiveCert(item);
          }}
        />

        {/* Fast-Track Speed-Queue Payment Verification Modal */}
        <FastVerifyModal
          isOpen={isFastVerifyOpen}
          onClose={() => {
            setIsFastVerifyOpen(false);
            setFastVerifyParticipantId(null);
          }}
          allRegistrants={registrants}
          pendingRegistrants={registrants.filter(r => r.statusBayar === 'PENDING')}
          initialParticipantId={fastVerifyParticipantId}
          onVerifyPayment={(id) => handleVerifyPayment(id)}
          onRejectPaymentWithReason={(id, reason) => handleRejectPaymentWithReason(id, reason)}
          googleOAuthToken={googleOAuthToken}
          clientId={config.clientId}
          onPreviewEmail={(p) => setActiveEmailPreviewRegistrant(p)}
          activeEvent={activeEvent}
          onAuthorizeSuccess={(newToken) => {
            setGoogleOAuthToken(newToken);
            localStorage.setItem('digniti_google_oauth_token', newToken);
            showToast('Akses Google Drive aktif untuk verifikasi bukti!', 'success');
          }}
        />

        {/* Slide-in Toast Alert */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
            <div
              className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl flex items-center gap-2.5 ${
                toast.type === 'success'
                  ? 'bg-white border-emerald-300 text-emerald-800'
                  : toast.type === 'warning'
                  ? 'bg-white border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  toast.type === 'success'
                    ? 'bg-emerald-500'
                    : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              ></span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}
