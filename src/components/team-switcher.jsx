import * as React from "react";
import { ChevronsUpDown, ShieldCheck, Check, Calendar, Layers } from "lucide-react";
import { useEvent } from "@/context/EventContext";
import {
  DropdownMenu,
  DropdownMenuContent,
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

export function TeamSwitcher({ setActiveTab }) {
  const { isMobile } = useSidebar();
  const { events, activeEvent, setActiveEventId } = useEvent();

  const currentEventTitle = activeEvent?.title || "Pilih Acara";
  const currentEventType = activeEvent?.event_type || (activeEvent?.title?.toLowerCase().includes('webinar') ? 'WEBINAR' : 'BOOTCAMP');
  const currentBadge = currentEventType === 'WEBINAR' ? 'Online' : 'Offline';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-slate-100 hover:bg-slate-100/80 transition-colors group"
            >
              {/* Dignity Gold Monogram */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-amber-400 to-amber-200 text-slate-950 font-black text-sm tracking-wider shadow-sm shrink-0">
                ID
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold text-slate-900 tracking-tight">
                    DIGNITY ADMIN
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="truncate text-[11px] font-medium text-slate-600 max-w-[120px]" title={currentEventTitle}>
                    {currentEventTitle}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 font-mono border border-amber-200 shrink-0">
                    {currentBadge}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-72 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xl p-1.5"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={6}
          >
            <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2.5 py-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Pilih Acara Aktif</span>
              </span>
              <span className="text-[10px] font-mono font-normal text-slate-400">
                {events?.length || 0} Program
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            
            <div className="max-h-60 overflow-y-auto space-y-1">
              {events && events.length > 0 ? (
                events.map((evt) => {
                  const isSelected = evt.id === activeEvent?.id;
                  const isWebinar = evt.event_type === 'WEBINAR' || evt.title?.toLowerCase().includes('webinar');
                  return (
                    <DropdownMenuItem
                      key={evt.id}
                      onClick={() => setActiveEventId(evt.id)}
                      className={`flex items-start justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-50/80 text-amber-900 font-semibold border border-amber-200/80"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex flex-col pr-2 min-w-0">
                        <span className="text-xs font-semibold truncate">
                          {evt.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span className={`px-1 rounded ${isWebinar ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {evt.event_type || (isWebinar ? 'WEBINAR' : 'PELATIHAN')}
                          </span>
                          <span className="truncate">&bull; {evt.venue || 'Online Zoom'}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                      )}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Belum ada acara di database.
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="bg-slate-100 my-1" />
            
            {setActiveTab && (
              <DropdownMenuItem
                onClick={() => setActiveTab('portfolio')}
                className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Kelola Portfolio Semua Acara</span>
              </DropdownMenuItem>
            )}

            <div className="px-2 pt-1 text-[9.5px] text-slate-400 font-mono text-center">
              LPK Indonesia Dignity &bull; Multi-Event Ready
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
