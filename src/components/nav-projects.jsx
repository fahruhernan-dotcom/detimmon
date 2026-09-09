import * as React from "react";
import { FileSpreadsheet, HardDrive, PhoneCall, ExternalLink } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({ config = {}, adminPhone = "6289681077483" }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const sheetsUrl = config.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`
    : "https://docs.google.com/spreadsheets";

  const quickLinks = [
    {
      name: "Google Spreadsheet Live",
      url: sheetsUrl,
      icon: FileSpreadsheet,
      color: "text-emerald-600",
    },
    {
      name: "Google Drive Folder",
      url: "https://drive.google.com",
      icon: HardDrive,
      color: "text-sky-600",
    },
    {
      name: "Hotline CS Admin",
      url: `https://wa.me/${adminPhone}`,
      icon: PhoneCall,
      color: "text-amber-600",
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
        Tautan & Alat Cepat
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1 mt-1">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center w-full">
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} strokeWidth={1.75} />
                  <span className="flex-1 truncate">{item.name}</span>
                  {!isCollapsed && (
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
