import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  Award,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Clock,
  Star,
  Zap,
  HelpCircle,
  GraduationCap,
  BookOpen,
  Layers,
  ChevronRight,
  Check,
  Phone,
  Building,
  CheckCheck,
  Utensils
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { formatRupiah, formatDate } from '../../utils/formatters';
import EventVitalCard from './EventVitalCard';
import PublicRundownShowcase from './PublicRundownShowcase';
import FloatingWhatsAppButton from './FloatingWhatsAppButton';
import { formatDisplayDate, formatDisplayTime, buildWhatsAppHelpUrl } from './landingUtils';

export default function DynamicEventLandingPage({ initialSlug }) {
  const { events: contextEvents, activeEvent: contextActiveEvent } = useEvent();

  // ── 1. ROUTING & SLUG RESOLUTION ─────────────────────────────────────
  const [resolvedSlug, setResolvedSlug] = useState(() => {
    if (initialSlug) return initialSlug;
    const hash = window.location.hash;
    if (hash.includes('/event/')) {
      return hash.split('/event/')[1]?.split('?')[0]?.split('/')[0] || '';
    }
    const params = new URLSearchParams(hash.split('?')[1] || window.location.search);
    return params.get('event') || '';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('/event/')) {
        setResolvedSlug(hash.split('/event/')[1]?.split('?')[0]?.split('/')[0] || '');
      } else {
        const params = new URLSearchParams(hash.split('?')[1] || window.location.search);
        setResolvedSlug(params.get('event') || '');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // ── 2. DATABASE QUERY (Supabase Published Events) ─────────────────────
  const [publishedEvents, setPublishedEvents] = useState([]);
  const [liveEvent, setLiveEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    async function fetchPublishedEvents() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, registrations(count)')
          .in('status', ['PUBLISHED', 'ONGOING'])
          .order('date_start', { ascending: true });

        if (!error && data) {
          const formatted = data.map((evt) => {
            const count = Array.isArray(evt.registrations) && evt.registrations.length > 0
              ? (evt.registrations[0]?.count ?? 0)
              : (evt.enrolled_count ?? 0);
            return {
              ...evt,
              real_enrolled_count: count
            };
          });
          setPublishedEvents(formatted);

          if (resolvedSlug) {
            const match = formatted.find(e => e.slug === resolvedSlug || e.id === resolvedSlug);
            if (match) setLiveEvent(match);
          } else if (formatted.length > 0) {
            setLiveEvent(formatted[0]);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat katalog event publik:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublishedEvents();
  }, [resolvedSlug]);

  const allEvents = publishedEvents.length > 0 ? publishedEvents : contextEvents;
  const currentEvent = liveEvent || (resolvedSlug ? allEvents.find(e => e.slug === resolvedSlug || e.id === resolvedSlug) : null) || allEvents[0];

  const landingConfig = currentEvent?.landing_page_config || {};
  const webConfig = currentEvent?.web_registration_config || {};

  const isWebinar = currentEvent?.event_type === 'WEBINAR' || 
    currentEvent?.title?.toLowerCase().includes('webinar') || 
    currentEvent?.slug?.includes('msc');

  // Kuota Sisa
  const capacity = currentEvent?.capacity || 30;
  const enrolled = currentEvent?.real_enrolled_count ?? currentEvent?.enrolled_count ?? 0;
  const seatsLeft = Math.max(0, capacity - enrolled);

  // ── 3. STEALTH ADMIN GATE EASTER EGG (3 KLIK LOGO = MASUK PORTAL ADMIN) ──
  const stealthClicksRef = useRef(0);
  const stealthTimerRef = useRef(null);

  const handleStealthClick = (e) => {
    if (e?.preventDefault) e.preventDefault();
    stealthClicksRef.current += 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (stealthClicksRef.current >= 3) {
      if (stealthTimerRef.current) clearTimeout(stealthTimerRef.current);
      stealthClicksRef.current = 0;
      window.location.hash = '#/portal-dignity';
      return;
    }

    if (stealthTimerRef.current) clearTimeout(stealthTimerRef.current);
    stealthTimerRef.current = setTimeout(() => {
      stealthClicksRef.current = 0;
    }, 900);
  };

  // Navigasi Pendaftaran
  const registrationUrl = `#/daftar?event=${encodeURIComponent(currentEvent?.slug || currentEvent?.id || '')}`;
  const handleRegisterClick = () => {
    window.location.hash = registrationUrl;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRundownScroll = () => {
    const el = document.getElementById('rundown-acara');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Accordion FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Pilihan Paket Biaya Dinamis
  const packages = useMemo(() => {
    if (webConfig.packages && Array.isArray(webConfig.packages) && webConfig.packages.length > 0) {
      return webConfig.packages;
    }
    const unitPrice = currentEvent?.promo_price || currentEvent?.base_price || (isWebinar ? 100000 : 1850000);
    const regularPrice = currentEvent?.base_price || (isWebinar ? 150000 : 2250000);

    if (isWebinar) {
      return [
        {
          id: 'INDIVIDU',
          name: 'Paket Regular Individu',
          price: unitPrice,
          originalPrice: regularPrice,
          badge: 'Paling Diminati',
          features: [
            '1 Akses Live Zoom Eksklusif & Sesi Tanya Jawab',
            'E-Sertifikat Resmi Ber-QR Code LPK Dignity',
            'Modul Ringkasan & Checklist Panggung (PDF)',
            'Akses Rekaman Video Pelatihan HD 14 Hari Penuh'
          ]
        },
        {
          id: 'MABAR_11',
          name: 'Paket Rombongan (10 + 1 Gratis)',
          price: unitPrice * 10,
          originalPrice: regularPrice * 11,
          badge: 'Hemat Perusahaan',
          features: [
            '11 Akses Live Zoom Lengkap untuk Tim/Instansi',
            '1 Peserta Gratis 100% (Hemat Biaya Pendaftaran)',
            '11 E-Sertifikat Mandiri Resmi Masing-Masing',
            'Invoice Resmi atas Nama Lembaga/Perusahaan'
          ]
        }
      ];
    }

    return [
      {
        id: 'BOOTCAMP_EARLY',
        name: 'Paket Early Bird (Peserta Tunggal)',
        price: unitPrice,
        originalPrice: regularPrice,
        badge: 'Diskon Terbatas',
        features: [
          'Akses Penuh 2 Hari Bootcamp di Sala View Hotel Solo',
          'Sertifikat Kelulusan Resmi Terakreditasi BNSP/Dignity',
          'Makan Siang Prasmanan Hotel 2 Hari & 4x Coffee Break',
          'Seminar Kit Eksklusif (Tas Totebag, Modul Buku, Nametag)',
          'Simulasi Panggung Langsung & Rekaman Video Penampilan'
        ]
      },
      {
        id: 'BOOTCAMP_MABAR_6',
        name: 'Paket Kolektif Instansi (Daftar 5 Gratis 1)',
        price: unitPrice * 5,
        originalPrice: regularPrice * 6,
        badge: 'Rekomendasi BUMN & Instansi',
        features: [
          '6 Pax Tiket Peserta Resmi Bootcamp',
          'Gratis Biaya 1 Orang Sepenuhnya (Hemat Jutaan Rupiah)',
          'Fasilitas Lengkap Hotel & 6 Set Seminar Kit Mewah',
          'Invoice & Kwitansi Resmi untuk Pelaporan Kantor/SPPD',
          'Konsultasi Evaluasi Performa Tim Pasca Acara'
        ]
      }
    ];
  }, [currentEvent, isWebinar, webConfig.packages]);

  // Data FAQ
  const faqs = [
    {
      q: 'Apakah pelatihan ini cocok untuk orang tua atau yang belum pernah berbicara di depan umum?',
      a: 'Sangat cocok! Lebih dari 60% peserta kami adalah pejabat, dokter, akademisi, dan profesional senior yang sebelumnya merasa cemas atau kaku berbicara di depan umum. Metode pengajaran dirancang bertahap, santai, menyenangkan, dan didampingi langsung oleh Master Trainer berpengalaman.'
    },
    {
      q: 'Bagaimana cara pendaftarannya jika saya kesulitan mengisi formulir online?',
      a: 'Jangan khawatir! Anda dapat langsung menekan tombol hijau "Bantuan Pendaftaran WhatsApp" di pojok kanan bawah layar. Tim admin panitia kami siap membantu memandu atau mencatatkan pendaftaran Anda secara langsung.'
    },
    {
      q: 'Apakah sertifikat yang diberikan resmi dan dapat digunakan untuk portofolio kedinasan?',
      a: 'Ya, resmi. LPK Indonesia Dignity adalah lembaga pelatihan kerja resmi terdaftar dengan legalitas akreditasi. Setiap sertifikat memiliki Nomor Registrasi Seri dan QR Code unik yang dapat diverifikasi secara publik online di portal resmi kami.'
    },
    {
      q: 'Bagaimana jika instansi/perusahaan saya membutuhkan Invoice, Surat Penawaran, atau Kwitansi SPPD?',
      a: 'Panitia kami dapat langsung menerbitkan Surat Undangan Resmi, Invoice, dan Kwitansi bermaterai atas nama instansi/perusahaan Anda untuk keperluan administrasi pencairan dana kantor.'
    },
    {
      q: 'Apakah peserta mendapatkan konsumsi dan fasilitas seminar kit di lokasi hotel?',
      a: 'Tentu saja! Untuk pelatihan tatap muka (offline), seluruh peserta mendapatkan makan siang prasmanan lezat hotel bintang empat, 2 kali rehat kopi/teh per hari, modul materi cetak eksklusif, tas seminar kit kain tebal, pulpen, dan nametag resmi.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-amber-100 selection:text-blue-950">
      
      {/* ── 1. TOP HEADER RESMI & LEGALITAS ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo Brand & Stealth Portal Gate */}
          <div className="flex items-center gap-3.5">
            <div
              onClick={handleStealthClick}
              className="w-11 h-11 rounded-xl bg-blue-950 flex items-center justify-center text-amber-300 font-black text-base shadow-md cursor-pointer select-none transition-transform active:scale-95 border border-blue-900"
              title="LPK Indonesia Dignity"
            >
              ID
            </div>
            <div onClick={handleStealthClick} className="cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-blue-950 tracking-tight leading-none">
                  LPK Indonesia Dignity
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-800">
                  Resmi Terakreditasi
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold">Pendaftaran Terbuka</span>
                <span className="hidden md:inline text-slate-400">&bull; Kuota Terbatas</span>
              </div>
            </div>
          </div>

          {/* Navigasi Desktop & Tombol Kontak */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={handleRundownScroll}
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-blue-900 transition-colors"
            >
              <Clock className="w-4 h-4 text-blue-800" />
              <span>Jadwal Rundown</span>
            </button>
            <a
              href="#biaya-fasilitas"
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-blue-900 transition-colors"
            >
              <Award className="w-4 h-4 text-blue-800" />
              <span>Biaya & Fasilitas</span>
            </a>
            <a
              href="#tanya-jawab"
              className="hidden lg:inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-blue-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-blue-800" />
              <span>Bantuan FAQ</span>
            </a>

            {/* Tombol Daftar di Header */}
            <button
              type="button"
              onClick={handleRegisterClick}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-amber-300 border border-blue-950 font-black text-xs sm:text-sm shadow-sm transition-all hover:scale-102 active:scale-95 flex items-center gap-1.5"
            >
              <span>Daftar Sekarang</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>

        </div>
      </header>

      {/* ── 2. HERO SECTION RAMAH USIA 50+ ─────────────────────────────────── */}
      <section className="pt-8 pb-12 px-4 sm:px-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Lencana Kategori Acara */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm font-extrabold mb-4 shadow-2xs">
            <Award className="w-4 h-4 text-blue-900" />
            <span>PELATIHAN RESMI BERSERTIFIKAT KOMPETENSI</span>
          </div>

          {/* Judul Utama (Font Besar & Kontras Tinggi) */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 tracking-tight leading-tight max-w-4xl mx-auto font-display">
            {currentEvent?.title || "Pelatihan Public Speaking: Bicara Percaya Diri, Berwibawa & Memikat"}
          </h1>

          {/* Subjudul Jelas Tanpa Jargon Rumit */}
          <p className="text-base sm:text-lg text-slate-700 mt-4 max-w-3xl mx-auto leading-relaxed font-normal">
            Bimbingan praktik langsung bersama Master Trainer teruji untuk menaklukkan rasa gugup, menguasai olah vokal berwibawa, dan membawakan presentasi yang meyakinkan audiens dalam berbagai forum formal.
          </p>

          {/* ── 3. KARTU VITAL ACARA (5W1H) ────────────────────────────────── */}
          <EventVitalCard
            event={currentEvent}
            seatsLeft={seatsLeft}
            onRegisterClick={handleRegisterClick}
            onRundownScrollClick={handleRundownScroll}
          />

        </div>
      </section>

      {/* ── 4. SWITCHER EVENT KATALOG (JIKA ADA LEBIH DARI 1 EVENT AKTIF) ── */}
      {allEvents.length > 1 && (
        <div className="py-6 px-4 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Pilihan Program Pelatihan Lainnya:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {allEvents.map((evt) => {
                const isSelected = evt.id === currentEvent?.id || evt.slug === currentEvent?.slug;
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => {
                      setLiveEvent(evt);
                      setResolvedSlug(evt.slug || evt.id);
                      window.location.hash = `#/event/${evt.slug || evt.id}`;
                    }}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-blue-950 text-white border-blue-950 shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    <span>{evt.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                      {evt.event_type || 'OFFLINE'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SEKSI MANFAAT NYATA (APA YANG AKAN DIPEROLEH) ──────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Hasil Pembelajaran Terukur</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-1">
              Mengapa Pelatihan Ini Sangat Bermanfaat Bagi Anda?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Kami tidak mengajari teori menghafal materi, melainkan melatih refleks panggung nyata yang langsung dapat diterapkan saat Anda memimpin pertemuan kantor, mengajar, atau berpidato.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-900/30 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-950 flex items-center justify-center mb-4 font-bold">
                01
              </div>
              <h3 className="text-lg font-bold text-blue-950 mb-2">Menghilangkan Grogi & Demam Panggung</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Kuasai teknik pernapasan diafragma dan ketenangan mental dalam 3 menit pertama agar jantung tidak berdebar dan pikiran tetap jernih di depan audiens banyak.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-900/30 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-950 flex items-center justify-center mb-4 font-bold">
                02
              </div>
              <h3 className="text-lg font-bold text-blue-950 mb-2">Olah Vokal Mantap & Berwibawa</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pelajari cara mengatur intonasi nada, jeda strategis (*power of pause*), serta artikulasi jelas agar suara terdengar berbobot, didengarkan, dan tidak membosankan.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-900/30 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-950 flex items-center justify-center mb-4 font-bold">
                03
              </div>
              <h3 className="text-lg font-bold text-blue-950 mb-2">Struktur Gagasan yang Meyakinkan</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Menyusun pembuka presentasi yang memikat, menyampaikan poin inti secara runtut tanpa berbelit-belit, dan menutup dengan kalimat berkesan yang menggerakkan tindakan.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── 6. PROFIL PEMATERI & MASTER TRAINER TERPERCAYA ──────────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border-2 border-blue-900/20 shadow-md p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar / Foto Profil */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-tr from-blue-950 to-indigo-900 text-amber-300 flex flex-col items-center justify-center shrink-0 border-4 border-white shadow-lg">
            <GraduationCap className="w-16 h-16 text-amber-300 mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Master Trainer</span>
          </div>

          {/* Biodata & Reputasi */}
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-950 text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5 text-blue-900" />
              <span>Instruktur Utama Berlisensi</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-blue-950">
              {landingConfig.speaker?.name || currentEvent?.speaker_name || (isWebinar ? "Halimatus Sa'diyah, S.I.Kom., M.I.Kom." : "Tim Master Trainer LPK Dignity")}
            </h3>
            <div className="text-sm font-bold text-amber-700 mt-0.5">
              {landingConfig.speaker?.title || (isWebinar ? "Certified Public Speaking Master Trainer & Founder Adikara" : "Lead Facilitator & Certified Coach LPK Dignity")}
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {landingConfig.speaker?.bio || (isWebinar ? "Praktisi dan konsultan komunikasi publik tersertifikasi yang berpengalaman melatih ribuan profesional, pimpinan instansi BUMN, dan akademisi dalam seni komunikasi panggung berbobot." : "Fasilitator tatap muka berpengalaman membimbing eksekutif dan profesional dalam praktek panggung intensif dan evaluasi personal 1-on-1.")}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> 100% Praktik Didampingi
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Evaluasi Personal 1-on-1
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 7. SHOWCASE RUNDOWN PUBLIK INTERAKTIF (FITUR PRD 16 & 17) ───────── */}
      <PublicRundownShowcase
        eventId={currentEvent?.id}
        onRegisterClick={handleRegisterClick}
      />

      {/* ── 8. FASILITAS LENGKAP YANG DIBAWA PULANG PESERTA ──────────────────── */}
      <section className="py-14 px-4 sm:px-6 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Fasilitas Nyata</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-1">
              Fasilitas Eksklusif yang Anda Dapatkan
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Seluruh kebutuhan kenyamanan belajar dan administrasi kedinasan telah kami persiapkan secara lengkap.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-950 flex items-center justify-center mb-3">
                <Award className="w-5 h-5 text-blue-900" />
              </div>
              <h4 className="font-bold text-base text-blue-950">Sertifikat Resmi Ber-QR</h4>
              <p className="text-xs text-slate-600 mt-1">
                E-Sertifikat dan sertifikat cetak berlisensi resmi yang dapat diverifikasi online.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-950 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-amber-900" />
              </div>
              <h4 className="font-bold text-base text-blue-950">Buku Modul & Checklist</h4>
              <p className="text-xs text-slate-600 mt-1">
                Panduan praktis siap bawa panggung yang dapat Anda pelajari kembali sewaktu-waktu.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-950 flex items-center justify-center mb-3">
                <Utensils className="w-5 h-5 text-emerald-900" />
              </div>
              <h4 className="font-bold text-base text-blue-950">Konsumsi Buffet Hotel</h4>
              <p className="text-xs text-slate-600 mt-1">
                Makan siang prasmanan lezat hotel bintang empat serta 2x rehat kopi dan teh per hari.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-950 flex items-center justify-center mb-3">
                <Video className="w-5 h-5 text-indigo-900" />
              </div>
              <h4 className="font-bold text-base text-blue-950">Rekaman Video Penampilan</h4>
              <p className="text-xs text-slate-600 mt-1">
                File rekaman video penampilan Anda di panggung untuk evaluasi perkembangan diri.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── 9. PILIHAN BIAYA & PAKET INVESTASI PELATIHAN ──────────────────────── */}
      <section id="biaya-fasilitas" className="py-14 px-4 sm:px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Investasi Berharga</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-1">
              Pilihan Paket Pendaftaran
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Biaya transparan tanpa biaya tambahan tersembunyi. Dapatkan tarif hemat untuk pendaftaran rombongan instansi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="bg-white rounded-3xl border-2 border-blue-900/20 p-6 sm:p-8 shadow-md flex flex-col justify-between relative hover:border-blue-900 transition-all"
              >
                <div>
                  {pkg.badge && (
                    <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold mb-3">
                      {pkg.badge}
                    </div>
                  )}
                  <h3 className="text-xl font-extrabold text-blue-950">
                    {pkg.name}
                  </h3>
                  <div className="mt-4 pb-4 border-b border-slate-100">
                    <div className="text-3xl sm:text-4xl font-black text-slate-900">
                      Rp {Number(pkg.price).toLocaleString('id-ID')}
                    </div>
                    {pkg.originalPrice && (
                      <div className="text-sm text-slate-400 line-through mt-0.5">
                        Harga Normal: Rp {Number(pkg.originalPrice).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3">
                    {pkg.features?.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-sm text-slate-700 leading-snug">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleRegisterClick}
                    className="w-full py-3.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-amber-300 font-extrabold text-base shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Pilih Paket & Daftar</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 10. PANDUAN 3 LANGKAH MUDAH MENDAFTAR (RAMAH USIA 50+) ──────────── */}
      <section className="py-14 px-4 sm:px-6 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Sangat Mudah</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-1">
              Cara Mudah Mendaftar dalam 3 Langkah
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-300 font-black text-lg mx-auto flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-base text-blue-950">Klik Tombol Daftar</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Pilih paket yang diinginkan lalu tekan tombol "Daftar Sekarang" di layar.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-300 font-black text-lg mx-auto flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-base text-blue-950">Isi Nama & Nomor WhatsApp</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Lengkapi formulir dengan nama yang ingin dicetak pada sertifikat dan nomor WhatsApp aktif.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-300 font-black text-lg mx-auto flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-base text-blue-950">Tiket Resmi Terbit</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Lakukan transfer biaya investasi dan tiket resmi beserta QR Code langsung dikirim ke WhatsApp Anda.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── 11. TANYA JAWAB UMUM (FAQ ACCORDION) ─────────────────────────────── */}
      <section id="tanya-jawab" className="py-14 px-4 sm:px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Pertanyaan Umum</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-1">
              Hal yang Sering Ditanyakan (FAQ)
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-slate-900 hover:text-blue-900 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-900' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 12. FOOTER RESMI & KONTAK LEMBAGA ─────────────────────────────────── */}
      <footer className="py-12 px-4 sm:px-8 bg-blue-950 text-white border-t border-blue-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div>
            <div className="text-lg font-black text-amber-300">
              LPK INDONESIA DIGNITY
            </div>
            <div className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
              Lembaga Pelatihan Kerja Resmi Terakreditasi. Menyelenggarakan sertifikasi kompetensi komunikasi publik, kepemimpinan panggung, dan manajemen acara profesional di seluruh Indonesia.
            </div>
          </div>

          <div className="text-xs text-slate-300 flex flex-col items-center md:items-end gap-1.5">
            <div>Hotline Resmi WhatsApp: <strong>+62 896-8107-7483</strong></div>
            <div>Email Layanan: <strong>official@dignityindonesia.id</strong></div>
            <div className="text-[11px] text-slate-400 mt-2">
              &copy; 2026 LPK Indonesia Dignity. Seluruh hak cipta dilindungi undang-undang.
            </div>
          </div>

        </div>
      </footer>

      {/* ── 13. TOMBOL BANTUAN WHATSAPP MENGAPUNG (FLOATING CS) ──────────────── */}
      <FloatingWhatsAppButton
        eventTitle={currentEvent?.title}
        adminPhone="6289681077483"
      />

    </div>
  );
}
