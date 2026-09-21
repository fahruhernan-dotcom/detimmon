import React, { useState } from 'react';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu';
import {
  Award,
  BookOpen,
  ShieldCheck,
  FileText,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

export default function DynamicNavbar({
  allEvents = [],
  currentEvent,
  onSelectEvent,
  onRegisterClick,
  onStealthClick
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isWebinar = currentEvent?.event_type === 'WEBINAR' || currentEvent?.title?.toLowerCase().includes('webinar');

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 px-3 sm:px-6">
      <div className="w-full max-w-5xl mx-auto backdrop-blur-md bg-white/95 border border-slate-200/90 rounded-2xl sm:rounded-full px-4 sm:px-6 py-2 shadow-[0_10px_35px_rgba(10,25,47,0.07)] flex items-center justify-between transition-all">
        
        {/* Brandmark Kiri */}
        <div 
          onClick={onStealthClick}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          title="LPK Indonesia Dignity"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0A192F] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center font-bold text-xs shadow-xs font-serif group-hover:scale-105 transition-transform">
            ID
          </div>
          <div className="flex flex-col text-left">
            <span className="font-serif font-bold text-xs sm:text-sm tracking-[0.14em] text-[#0A192F] uppercase leading-tight">
              LPK INDONESIA DIGNITY
            </span>
            <span className="text-[9px] font-mono text-stone-400 tracking-wider">
              OFFICIAL TRAINING ACADEMY
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Menu (Shadcn / Radix) */}
        <div className="hidden md:flex items-center">
          <NavigationMenu>
            <NavigationMenuList>
              
              {/* 1. Menu Program Pelatihan (Flyout Mega-Card) */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-xs font-medium text-slate-700 hover:text-[#0A192F]">
                  Program Pelatihan
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[520px] p-4 grid grid-cols-2 gap-3.5 text-left">
                    
                    {/* Kartu Program Aktif */}
                    <div className="p-4 rounded-xl bg-gradient-to-b from-stone-50 to-[#FAF9F6] border border-stone-200/90 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#0A192F] bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/60">
                            SEDANG DIBUKA
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            {isWebinar ? 'Online Zoom' : 'Offline Hotel'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">
                          {currentEvent?.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 line-clamp-2 font-light mb-3">
                          {currentEvent?.funnel_tagline || 'Bimbingan intensif berstandar nasional bersama Master Trainer berlisensi.'}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-stone-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono text-stone-400 block uppercase">INVESTASI</span>
                          <span className="text-xs font-bold text-[#0A192F]">
                            {currentEvent?.promo_price ? formatRupiah(currentEvent.promo_price) : formatRupiah(currentEvent?.base_price)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={onRegisterClick}
                          className="px-2.5 py-1 rounded-md bg-[#0A192F] text-[#D4AF37] text-[10px] font-bold hover:bg-slate-800 transition"
                        >
                          Daftar ↗
                        </button>
                      </div>
                    </div>

                    {/* Kolom Program Lain & Katalog */}
                    <div className="flex flex-col justify-between space-y-2">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-stone-400 font-semibold tracking-wider uppercase px-1">
                          PILIHAN PROGRAM LAINNYA:
                        </span>
                        {allEvents.map((evt) => {
                          const isSelected = evt.id === currentEvent?.id || evt.slug === currentEvent?.slug;
                          const evtWebinar = evt.event_type === 'WEBINAR' || evt.title?.toLowerCase().includes('webinar');
                          return (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => onSelectEvent(evt)}
                              className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                                isSelected
                                  ? 'bg-stone-100/90 border-[#0A192F]/40 shadow-2xs'
                                  : 'bg-white hover:bg-stone-50 border-stone-200/70'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                <GraduationCap className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0A192F]' : 'text-stone-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-slate-800 truncate">
                                  {evt.title}
                                </div>
                                <div className="text-[10px] text-stone-500 flex items-center justify-between mt-0.5">
                                  <span>{evtWebinar ? 'Webinar Online' : 'Bootcamp Tatap Muka'}</span>
                                  <span className="font-semibold text-stone-700">
                                    {evt.promo_price ? formatRupiah(evt.promo_price) : formatRupiah(evt.base_price)}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-500 flex items-center gap-1.5 px-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Sertifikat Ber-QR Code Resmi Terdaftar</span>
                      </div>
                    </div>

                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 2. Menu Lembaga & Mutu (Flyout Kredensial Resmi) */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-xs font-medium text-slate-700 hover:text-[#0A192F]">
                  Lembaga &amp; Mutu
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[420px] p-4 space-y-2.5 text-left">
                    <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-[#0A192F]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Legalitas &amp; Akreditasi Resmi</h4>
                        <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-relaxed">
                          LPK Indonesia Dignity adalah lembaga pelatihan kerja resmi terdaftar dengan legalitas kurikulum kompetensi nasional.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Verifikasi E-Sertifikat Digital (QR)</h4>
                        <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-relaxed">
                          Setiap sertifikat kelulusan dilengkapi Nomor Seri Registrasi dan QR Code publik untuk portofolio kedinasan dan karir.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/80 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Administrasi Kedinasan &amp; SPPD</h4>
                        <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-relaxed">
                          Tersedia Surat Undangan Resmi, Invoice Kantor, dan Kwitansi bermaterai untuk pencairan anggaran instansi/kantor.
                        </p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 3. Direct Anchor Links */}
              <NavigationMenuItem>
                <NavigationMenuLink
                  href="#rundown-acara"
                  className={navigationMenuTriggerStyle()}
                >
                  Rundown
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  href="#biaya-fasilitas"
                  className={navigationMenuTriggerStyle()}
                >
                  Fasilitas
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  href="#tanya-jawab"
                  className={navigationMenuTriggerStyle()}
                >
                  FAQ
                </NavigationMenuLink>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Kanan: Tombol CTA & Mobile Hamburger */}
        <div className="flex items-center gap-2">
          {/* Tombol CTA Utama */}
          <button
            type="button"
            onClick={onRegisterClick}
            className="px-4 sm:px-5 py-2 rounded-full bg-[#0A192F] hover:bg-[#132542] text-white text-xs font-semibold shadow-sm btn-press flex items-center gap-1.5 transition-colors"
          >
            <span>DAFTAR</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37] stroke-[2.5]" />
          </button>

          {/* Toggle Hamburger Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-stone-100 transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Accordion */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-5xl mx-auto backdrop-blur-md bg-white/98 border border-slate-200/90 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 text-left">
          <div className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold mb-1">
            PILIHAN PROGRAM:
          </div>
          <div className="space-y-1.5">
            {allEvents.map((evt) => {
              const isSelected = evt.id === currentEvent?.id || evt.slug === currentEvent?.slug;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => {
                    onSelectEvent(evt);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isSelected ? 'bg-stone-100 font-bold border-stone-400' : 'bg-stone-50/50 border-stone-200'
                  }`}
                >
                  <span className="truncate">{evt.title}</span>
                  <span className="text-[10px] font-mono text-stone-500 shrink-0 ml-2">
                    {evt.promo_price ? formatRupiah(evt.promo_price) : formatRupiah(evt.base_price)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-1 text-center text-xs">
            <a
              href="#rundown-acara"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-1 rounded-lg text-slate-700 hover:bg-stone-100 font-medium"
            >
              Rundown
            </a>
            <a
              href="#biaya-fasilitas"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-1 rounded-lg text-slate-700 hover:bg-stone-100 font-medium"
            >
              Fasilitas
            </a>
            <a
              href="#tanya-jawab"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-1 rounded-lg text-slate-700 hover:bg-stone-100 font-medium"
            >
              FAQ
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
