import React from 'react';
import { 
  Users, 
  Award, 
  TrendingUp, 
  Settings, 
  ShieldCheck, 
  PhoneCall, 
  ExternalLink 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, adminPhone }) {
  const operasionalItems = [
    { id: 'registrasi', label: 'Registrasi & Verifikasi', icon: Users },
    { id: 'sertifikat', label: 'Presensi & E-Sertifikat', icon: Award },
    { id: 'finansial', label: 'Monitor Finansial (P&L)', icon: TrendingUp },
  ];

  const settingItems = [
    { id: 'pengaturan', label: 'Pengaturan Sistem (.env)', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 p-6 flex flex-col fixed h-[100dvh] z-40">
      {/* Brand Identity Header */}
      <div className="flex items-center gap-3.5 pb-6 border-b border-slate-800/80 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-lg tracking-wider shadow-gold-subtle">
          ID
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            DIGNITY ADMIN
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
          </div>
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider font-mono">
            COMMAND CENTER
          </div>
        </div>
      </div>

      {/* Navigation Links: Operasional Webinar */}
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-3">
        Operasional Webinar
      </div>

      <nav className="space-y-1.5 mb-6">
        {operasionalItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left active:scale-[0.98] ${
                isActive
                  ? 'bg-slate-800/80 text-white border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon 
                className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-500'}`} 
                strokeWidth={1.75} 
              />
              <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Navigation Links: Pengaturan */}
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-3">
        Pengaturan
      </div>

      <nav className="space-y-1.5 flex-1">
        {settingItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left active:scale-[0.98] ${
                isActive
                  ? 'bg-slate-800/80 text-white border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon 
                className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-500'}`} 
                strokeWidth={1.75} 
              />
              <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Support Liaison */}
      <div className="pt-4 border-t border-slate-800/80 mt-auto">
        <a
          href={`https://wa.me/${adminPhone}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-slate-850 border border-slate-800 hover:border-emerald-500/40 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Hotline CS Admin</div>
              <div className="text-xs font-mono font-semibold text-slate-200">
                +{adminPhone}
              </div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </a>
      </div>
    </aside>
  );
}
