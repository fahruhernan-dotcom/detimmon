import * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  activeTab,
  setActiveTab,
  adminPhone,
  currentUser,
  onLogout,
  registrantsCount = 0,
  pendingVerifyCount = 0,
  unsentTicketsCount = 0,
  attendancesCount = 0,
  readyCertificatesCount = 0,
  selectedSpeaker,
  setSelectedSpeaker,
  config = {},
  hasGoogleToken = false,
  ...props
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-white text-slate-800"
      {...props}
    >
      <SidebarHeader className="border-b border-slate-100 p-3 bg-white">
        <TeamSwitcher
          setActiveTab={setActiveTab}
        />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-4 bg-white overflow-y-auto">
        <NavMain
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          registrantsCount={registrantsCount}
          pendingVerifyCount={pendingVerifyCount}
          unsentTicketsCount={unsentTicketsCount}
          attendancesCount={attendancesCount}
          readyCertificatesCount={readyCertificatesCount}
          hasGoogleToken={hasGoogleToken}
        />
        <NavProjects config={config} adminPhone={adminPhone} />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-2 bg-white">
        <NavUser
          currentUser={currentUser}
          onLogout={onLogout}
          setActiveTab={setActiveTab}
        />
      </SidebarFooter>

      <SidebarRail className="hover:after:bg-amber-500/40" />
    </Sidebar>
  );
}
export default AppSidebar;
