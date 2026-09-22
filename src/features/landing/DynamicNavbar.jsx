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
  GraduationCap,
  Ticket
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

        {/* Center: Desktop Navigation Menu (Shadcn / Radix dengan Animasi Halus) */}
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

              {/* 2. Menu Informasi Acara (Flyout Interaktif: Rundown, Fasilitas, FAQ) */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-xs font-medium text-slate-700 hover:text-[#0A192F]">
                  Informasi Acara
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[460px] p-4 space-y-2.5 text-left">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="text-[10px] font-mono text-stone-400 font-semibold tracking-wider uppercase">
                        DETAIL &amp; AGENDA PELATIHAN:
                      </span>
                      <span className="text-[9px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {isWebinar ? 'Webinar Online' : 'Bootcamp Tatap Muka'}
                      </span>
                    </div>

                    {/* Item 1: Rundown */}
                    <NavigationMenuLink asChild>
                      <a
                        href="#rundown-acara"
                        className="p-3 rounded-xl bg-white hover:bg-stone-50/90 border border-stone-200/80 hover:border-[#0A192F]/30 transition-all flex items-start gap-3 group/link block"
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-[#0A192F] flex items-center justify-center shrink-0 group-hover/link:bg-[#0A192F] group-hover/link:text-[#D4AF37] transition-colors">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover/link:text-[#0A192F] transition-colors">
                              Rundown &amp; Susunan Sesi
                            </h4>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#0A192F] bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300/60">
                              Timeline
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-snug">
                            Alur jam per jam, durasi materi narasumber, workshop panggung, dan sesi interaktif.
                          </p>
                        </div>
                      </a>
                    </NavigationMenuLink>

                    {/* Item 2: Fasilitas & Paket */}
                    <NavigationMenuLink asChild>
                      <a
                        href="#biaya-fasilitas"
                        className="p-3 rounded-xl bg-white hover:bg-stone-50/90 border border-stone-200/80 hover:border-[#0A192F]/30 transition-all flex items-start gap-3 group/link block"
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-[#0A192F] flex items-center justify-center shrink-0 group-hover/link:bg-[#0A192F] group-hover/link:text-[#D4AF37] transition-colors">
                          <Sparkles className="w-4 h-4 text-amber-600 group-hover/link:text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover/link:text-[#0A192F] transition-colors">
                              Paket Investasi &amp; Fasilitas
                            </h4>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300/60">
                              Benefit
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-snug">
                            E-Sertifikat resmi, modul PDF eksklusif, rekaman full HD, dan voucher potongan kelas lanjutan.
                          </p>
                        </div>
                      </a>
                    </NavigationMenuLink>

                    {/* Item 3: FAQ */}
                    <NavigationMenuLink asChild>
                      <a
                        href="#tanya-jawab"
                        className="p-3 rounded-xl bg-white hover:bg-stone-50/90 border border-stone-200/80 hover:border-[#0A192F]/30 transition-all flex items-start gap-3 group/link block"
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 text-[#0A192F] flex items-center justify-center shrink-0 group-hover/link:bg-[#0A192F] group-hover/link:text-[#D4AF37] transition-colors">
                          <BookOpen className="w-4 h-4 text-sky-600 group-hover/link:text-[#D4AF37]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover/link:text-[#0A192F] transition-colors">
                              Tanya Jawab &amp; Bantuan (FAQ)
                            </h4>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                              Panduan
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-light mt-0.5 leading-snug">
                            Ketentuan promo rombongan, tata cara pembayaran, teknis Zoom, dan pengiriman sertifikat.
                          </p>
                        </div>
                      </a>
                    </NavigationMenuLink>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 px-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Format Pelatihan Aplikatif &amp; Terstruktur
                      </span>
                      <span className="text-stone-400 font-mono">Dignity Standard</span>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* 3. Menu Layanan Peserta (Flyout Portal Cek Tiket Mandiri + Kredensial Mutu) */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-xs font-medium text-slate-700 hover:text-[#0A192F]">
                  Layanan Peserta
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[480px] p-4 space-y-3 text-left">
                    
                    {/* Featured Card: Cek Status Tiket & Registrasi */}
                    <NavigationMenuLink asChild>
                      <a
                        href="#/cek-tiket"
                        className="p-3.5 rounded-xl bg-gradient-to-b from-[#0A192F]/5 via-white to-amber-50/20 border border-[#0A192F]/15 hover:border-[#0A192F]/40 hover:shadow-xs transition-all flex flex-col gap-2 group/card block"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#0A192F] text-[#D4AF37] flex items-center justify-center shadow-xs">
                              <Ticket className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0A192F]">
                              PORTAL MANDIRI PESERTA
                            </span>
                          </div>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300/50 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            100% Real-Time DB
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 group-hover/card:text-[#0A192F] transition-colors flex items-center gap-1">
                              <span>Cek Status Pendaftaran &amp; E-Ticket</span>
                            </h4>
                            <span className="text-[11px] font-semibold text-[#0A192F] flex items-center gap-0.5 group-hover/card:translate-x-0.5 transition-transform">
                              Buka Portal <ArrowUpRight className="w-3 h-3 text-[#D4AF37] stroke-[2.5]" />
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-light mt-1 leading-relaxed">
                            Periksa status validasi pembayaran, nomor registrasi sementara, hingga e-ticket barcode resmi dan akses link Zoom webinar.
                          </p>
                        </div>
                      </a>
                    </NavigationMenuLink>

                    {/* Grid 3 Kredensial & Mutu Lembaga */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100">
                      <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200/70">
                        <div className="w-6 h-6 rounded-md bg-white border border-stone-200 text-[#0A192F] flex items-center justify-center mb-1.5">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <h5 className="text-[11px] font-bold text-slate-800 leading-tight">Legalitas Resmi</h5>
                        <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                          LPK resmi terakreditasi kompetensi kerja.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200/70">
                        <div className="w-6 h-6 rounded-md bg-white border border-stone-200 text-emerald-600 flex items-center justify-center mb-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <h5 className="text-[11px] font-bold text-slate-800 leading-tight">QR E-Sertifikat</h5>
                        <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                          Sertifikat digital untuk portofolio karir.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-stone-200/70">
                        <div className="w-6 h-6 rounded-md bg-white border border-stone-200 text-sky-600 flex items-center justify-center mb-1.5">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <h5 className="text-[11px] font-bold text-slate-800 leading-tight">SPPD &amp; Invoice</h5>
                        <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                          Undangan dinas &amp; kuitansi bermaterai.
                        </p>
                      </div>
                    </div>

                  </div>
                </NavigationMenuContent>
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

          <div className="pt-2 border-t border-stone-100">
            <a
              href="#/cek-tiket"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-[#0A192F] hover:text-white text-stone-800 text-xs font-semibold flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#D4AF37]" />
                <span>Cek Status Tiket &amp; Pendaftaran</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
