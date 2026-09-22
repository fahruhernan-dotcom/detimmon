import React from 'react';
import { SidebarTrigger } from '../../../components/ui/sidebar';
import { Separator } from '../../../components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../components/ui/breadcrumb';
import EventSelector from '../../events/EventSelector';
import { RefreshCw, UserPlus } from 'lucide-react';

export const TAB_BREADCRUMB_TITLES = {
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

export default function AdminHeader({
  activeTab,
  setActiveTab,
  googleOAuthToken,
  isSyncing,
  onRefreshFromSupabase,
  onOpenAdd
}) {
  return (
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
                {TAB_BREADCRUMB_TITLES[activeTab] || 'Dashboard'}
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
          />
          <span className="text-slate-700 font-medium">
            {googleOAuthToken ? 'Google OAuth Active' : 'API Key Live'}
          </span>
        </div>

        {/* Segarkan Data Supabase Button */}
        <button
          type="button"
          onClick={onRefreshFromSupabase}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
          type="button"
          onClick={onOpenAdd}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span className="hidden xs:inline">Tambah Manual</span>
        </button>
      </div>
    </header>
  );
}
