import * as React from "react";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Ticket, 
  UserCheck, 
  Award, 
  Send, 
  TrendingUp, 
  RefreshCw, 
  Settings,
  CalendarDays,
  Flame,
  LayoutTemplate,
  ShieldCheck,
  FileText,
  MailCheck,
  Layers,
  Globe,
  Tag,
  Timer
} from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  activeTab,
  setActiveTab,
  registrantsCount = 0,
  pendingVerifyCount = 0,
  unsentTicketsCount = 0,
  attendancesCount = 0,
  readyCertificatesCount = 0,
  hasGoogleToken = false,
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const getBadgeClass = (type) => {
    switch (type) {
      case "warning":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "amber":
        return "bg-amber-50 text-amber-900 border-amber-200";
      case "success":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "indigo":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "blue":
        return "bg-blue-50 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const navGroups = [
    {
      label: "Overview",
      items: [
        {
          id: "events-portfolio",
          title: "Portfolio & Pipeline Acara",
          icon: Layers,
          badge: "Makro",
          badgeType: "indigo",
        },
        {
          id: "dashboard",
          title: "Command Center Acara",
          icon: LayoutDashboard,
          badge: pendingVerifyCount > 0 ? "Aksi Butuh" : null,
          badgeType: "warning",
        },
      ],
    },
    {
      label: "Operasional Event",
      items: [
        {
          id: "web-registration-settings",
          title: "Pengaturan Form Web",
          icon: Globe,
          badge: "Direct",
          badgeType: "success",
        },
        {
          id: "registrants",
          title: "Data Pendaftar",
          icon: Users,
          badge: `${registrantsCount}`,
          badgeType: "neutral",
        },
        {
          id: "payments",
          title: "Verifikasi Pembayaran",
          icon: CreditCard,
          badge: pendingVerifyCount > 0 ? `${pendingVerifyCount} pending` : null,
          badgeType: "warning",
        },
        {
          id: "tickets",
          title: "Tiket & MABAR",
          icon: Ticket,
          badge: unsentTicketsCount > 0 ? `${unsentTicketsCount} belum` : null,
          badgeType: "amber",
        },
        {
          id: "attendance",
          title: "Presensi Peserta",
          icon: UserCheck,
          badge: `${attendancesCount} hadir`,
          badgeType: "indigo",
        },
        {
          id: "certificates",
          title: "Penerbitan Sertifikat",
          icon: Award,
          badge: readyCertificatesCount > 0 ? `${readyCertificatesCount} siap` : null,
          badgeType: "success",
        },
        {
          id: "rundown",
          title: "Rundown & Stage Cue",
          icon: Timer,
          badge: "Live",
          badgeType: "indigo",
        },
      ],
    },
    {
      label: "Komunikasi & Blast",
      items: [
        {
          id: "communication",
          title: "Communication Center",
          icon: Send,
          badge: "Blast",
          badgeType: "success",
        },
        {
          id: "templates",
          title: "Template Studio",
          icon: LayoutTemplate,
          badge: "Studio",
          badgeType: "neutral",
        },
        {
          id: "email-preview",
          title: "Verifikasi Layout Email",
          icon: MailCheck,
          badge: "Live",
          badgeType: "indigo",
        },
      ],
    },
    {
      label: "Bisnis & Revenue",
      items: [
        {
          id: "revenue",
          title: "Monitor Finansial (P&L)",
          icon: TrendingUp,
          badge: "P&L",
          badgeType: "neutral",
        },
        {
          id: "conversion",
          title: "Funnel Konversi Bootcamp",
          icon: Flame,
          badge: "Funnel",
          badgeType: "amber",
        },
      ],
    },
    {
      label: "Sistem & Integrasi",
      items: [
        {
          id: "sync",
          title: "Google Workspace Sync",
          icon: RefreshCw,
          badge: "2-Way",
          badgeType: "blue",
        },
        {
          id: "rbac",
          title: "Manajemen Akses Tim",
          icon: ShieldCheck,
          badge: "RBAC",
          badgeType: "neutral",
        },
        {
          id: "audit",
          title: "Log Audit Keamanan",
          icon: FileText,
          badge: "Audit",
          badgeType: "neutral",
        },
        {
          id: "vouchers",
          title: "Voucher & Diskon",
          icon: Tag,
          badge: "Baru",
          badgeType: "success",
        },
        {
          id: "pengaturan",
          title: "Pengaturan Sistem (.env)",
          icon: Settings,
          badge: hasGoogleToken ? "OAuth OK" : ".env",
          badgeType: hasGoogleToken ? "success" : "neutral",
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {navGroups.map((group) => (
        <SidebarGroup key={group.label} className="p-0">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            {group.label}
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-0.5 mt-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={`${item.title} ${item.badge ? `(${item.badge})` : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-slate-100 text-slate-950 font-semibold border-l-2 border-amber-600 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? "text-amber-600" : "text-slate-400"
                      }`}
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                    <span className="flex-1 truncate">{item.title}</span>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md border shrink-0 font-medium ${getBadgeClass(
                          item.badgeType
                        )}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}
