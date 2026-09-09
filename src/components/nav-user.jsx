import * as React from "react";
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({ currentUser, onLogout, setActiveTab }) {
  const { isMobile } = useSidebar();

  const user = currentUser || {
    email: "doniesdaily@gmail.com",
    role: "Super Admin (Owner)",
    name: "Owner Dignity",
  };

  const getInitials = (email) => {
    if (!email) return "DD";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-slate-100 hover:bg-slate-100/80 transition-colors group"
            >
              <Avatar className="h-8 w-8 rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
                <AvatarFallback className="rounded-xl bg-slate-100 text-slate-800 font-bold text-xs font-mono">
                  {getInitials(user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <div className="flex items-center gap-1">
                  <span className="truncate font-semibold text-slate-900">
                    {user.role || "Super Admin (Owner)"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                </div>
                <span className="truncate text-[10.5px] text-slate-500 font-mono mt-0.5">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-3 font-normal border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100">
                  <AvatarFallback className="rounded-xl bg-slate-100 text-slate-800 font-bold text-xs font-mono">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {user.role || "Super Admin (Owner)"}
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                  <span className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem className="gap-2.5 px-2.5 py-2 text-xs text-slate-700 focus:bg-slate-50 cursor-default">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-[11px] text-emerald-700">Google OAuth Terhubung</span>
                  <span className="text-[9.5px] text-slate-400 font-mono">Sheets, Drive & Gmail API</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setActiveTab?.("pengaturan")}
                className="gap-2.5 px-2.5 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer rounded-lg transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Konfigurasi & Pengaturan API</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-slate-100" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={onLogout}
                className="gap-2.5 px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Sesi Tetap Aktif</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
