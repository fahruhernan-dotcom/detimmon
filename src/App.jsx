import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useEvent } from './context/EventContext';
import AdminLoginGate from './features/auth/AdminLoginGate';
import AdminCommandCenter from './features/command_center/AdminCommandCenter';
import CertificateVerification from './features/verify/CertificateVerification';
import PublicRegistrationWizard from './features/public_registration/PublicRegistrationWizard';
import PublicAttendanceForm from './features/public_registration/PublicAttendanceForm';
import PublicTicketCheckPage from './features/public_ticket/PublicTicketCheckPage';
import DynamicEventLandingPage from './features/landing/DynamicEventLandingPage';

/**
 * App — Minimal Root Router (Ponytail Architecture)
 * Dispatches public intake routes vs protected staff command center.
 */
export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname + window.location.hash);
  const { activeEvent } = useEvent();
  const { user: authUser, loading: authLoading } = useAuth();

  // Listen to popstate and hashchange
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
    return <PublicRegistrationWizard activeEvent={activeEvent} />;
  }

  // 3. Standalone Public Attendance Intake route (e.g. /presensi or #/presensi or /absen or #/absen)
  if (currentPath.includes('/presensi') || currentPath.includes('/absen')) {
    return <PublicAttendanceForm />;
  }

  // 4. Standalone Public Ticket & Registration Status Check route (e.g. /cek-tiket or #/cek-tiket)
  if (
    currentPath.includes('/cek-tiket') || 
    currentPath.includes('/check-ticket') || 
    currentPath.includes('/status-tiket') || 
    currentPath.includes('/cek-pendaftaran')
  ) {
    return <PublicTicketCheckPage onBackToHome={() => { window.location.hash = '#/'; }} />;
  }

  // 5. Secret Admin Route (e.g. /portal-dignity, /command-center, /admin-access, /admin)
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
      return <AdminLoginGate onBackToPublic={() => { window.location.hash = '#/'; }} />;
    }

    return <AdminCommandCenter currentPath={currentPath} setCurrentPath={setCurrentPath} />;
  }

  // 6. Default Public Route -> Dynamic Event Landing Page
  return <DynamicEventLandingPage />;
}
