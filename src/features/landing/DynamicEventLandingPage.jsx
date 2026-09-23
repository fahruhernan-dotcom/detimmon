import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Video,
  Award,
  ChevronDown,
  Clock,
  GraduationCap,
  BookOpen,
  Check,
  Utensils,
  ShieldCheck,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEvent } from '../../context/EventContext';
import { formatRupiah } from '../../utils/formatters';
import EventVitalCard from './EventVitalCard';
import PublicRundownShowcase from './PublicRundownShowcase';
import FloatingWhatsAppButton from './FloatingWhatsAppButton';
import DynamicNavbar from './DynamicNavbar';
import { resolveLandingConfig, isRundownPubliclyVisible } from './landingContentDefaults';
import { formatDisplayDateTime } from './landingUtils';

const FACILITY_ICON_MAP = {
  Award,
  BookOpen,
  Utensils,
  Video,
  Users,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  GraduationCap
};

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
          .filter('registrations.deleted_at', 'is', null)
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

  // 100% Database-Driven Configuration via landingContentDefaults
  const landingConfig = useMemo(() => resolveLandingConfig(currentEvent), [currentEvent]);
  const isRundownVisible = useMemo(() => isRundownPubliclyVisible(landingConfig.rundown), [landingConfig.rundown]);

  // Speaker Configuration
  const speakerConfig = landingConfig.speaker || {};
  const isSpeakerConfirmed = Boolean(speakerConfig.is_confirmed && (speakerConfig.name || currentEvent?.speaker_name));
  const speakerName = speakerConfig.name || currentEvent?.speaker_name || '';
  const speakerTitle = speakerConfig.title;
  const speakerBio = speakerConfig.bio;
  const speakerBadge = speakerConfig.status_badge || (isSpeakerConfirmed ? 'Instruktur Terverifikasi' : 'Segera Diumumkan (TBA)');
  const speakerPhoto = speakerConfig.photo_url || '';
  const speakerTeaserTags = speakerConfig.teaser_tags || [];

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

  // Accordion FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Pilihan Paket Biaya Dinamis & FAQ
  const packages = landingConfig.packages || [];
  const faqs = landingConfig.faqs || [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 font-sans selection:bg-stone-200 selection:text-stone-900">
      
      {/* ── 1. DYNAMIC NAVIGATION MENU (SHADCN / RADIX & DIGNITY NAVY/GOLD) ── */}
      <DynamicNavbar
        allEvents={allEvents}
        currentEvent={currentEvent}
        onSelectEvent={(evt) => {
          setLiveEvent(evt);
          setResolvedSlug(evt.slug || evt.id);
          window.location.hash = `#/event/${evt.slug || evt.id}`;
        }}
        onRegisterClick={handleRegisterClick}
        onStealthClick={handleStealthClick}
      />

      {/* ── 2. HERO SECTION EDITORIAL & ELEGAN (TOP PADDING FOR FLOATING NAVBAR) ── */}
      <section className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Editorial Kicker Overline */}
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="w-8 h-[1px] bg-stone-300" />
            <span className="text-[11px] font-mono tracking-[0.25em] text-stone-500 uppercase font-semibold">
              {landingConfig.hero?.kicker || "PROGRAM SERTIFIKASI KOMPETENSI RESMI"}
            </span>
            <span className="w-8 h-[1px] bg-stone-300" />
          </div>

          {/* Judul Utama Editorial Serif (Newsreader) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal text-stone-900 tracking-tight leading-[1.12] max-w-4xl mx-auto font-serif">
            {landingConfig.hero?.headline || currentEvent?.title || "Program Pelatihan Public Speaking"}
          </h1>

          {/* Subjudul Berbobot Editorial */}
          <p className="text-base sm:text-lg text-stone-600 mt-5 max-w-2xl mx-auto leading-relaxed font-light">
            {landingConfig.hero?.subheadline}
          </p>

          {/* ── 3. KARTU VITAL ACARA (EXECUTIVE DOSSIER 5W1H) ──────────────── */}
          <EventVitalCard
            event={currentEvent}
            seatsLeft={seatsLeft}
            isRundownVisible={isRundownVisible}
            onRegisterClick={handleRegisterClick}
          />

        </div>
      </section>

      {/* ── 4. SWITCHER EVENT KATALOG (JIKA ADA LEBIH DARI 1 EVENT AKTIF) ── */}
      {allEvents.length > 1 && (
        <div className="py-5 px-4 bg-white border-b border-stone-200/80">
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-[10px] font-mono font-semibold text-stone-400 uppercase tracking-widest mb-3">
              PROGRAM LAINNYA DALAM KATALOG:
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium btn-press flex items-center gap-2 border transition-colors ${
                      isSelected
                        ? 'bg-[#18181B] text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                    }`}
                  >
                    <span>{evt.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {evt.event_type || 'OFFLINE'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SEKSI KURIKULUM & TRANSFORMASI KOMPETENSI ──────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              KURIKULUM BERBASIS PRAKTIK
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 tracking-tight mt-1.5 font-serif">
              3 Pilar Transformasi Komunikasi Panggung
            </h2>
            <p className="text-sm sm:text-base text-stone-600 mt-2.5 leading-relaxed font-light">
              Metode bimbingan dirancang sistematis untuk melatih ketenangan refleks panggung yang langsung terasa saat Anda memimpin rapat, mengajar, atau berpidato kedinasan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {landingConfig.curriculum_pillars?.map((pillar, idx) => (
              <div
                key={idx}
                className="p-8 rounded-xl bg-[#FAF9F6] border border-stone-200/80 hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-stone-400 font-semibold mb-4 tracking-wider">
                    {pillar.number ? `PILAR ${pillar.number}` : `PILAR 0${idx + 1}`}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-stone-900 mb-2.5 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
                {pillar.focus && (
                  <div className="mt-6 pt-3 border-t border-stone-200/60 text-[11px] font-mono text-stone-500">
                    {pillar.focus}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 6. PROFIL PEMATERI & MASTER TRAINER (QUIET LUXURY DOSSIER) ─────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-stone-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar / Foto Profil / Silhouette TBA */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl bg-stone-900 text-stone-100 flex flex-col items-center justify-center shrink-0 border border-stone-800 shadow-sm relative overflow-hidden">
            {speakerPhoto ? (
              <img src={speakerPhoto} alt={speakerName || "Master Trainer"} className="w-full h-full object-cover" />
            ) : isSpeakerConfirmed ? (
              <>
                <GraduationCap className="w-12 h-12 text-stone-300 mb-1 stroke-[1.5]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Master Trainer</span>
              </>
            ) : (
              <div className="text-center p-3 flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-stone-400 mb-2 stroke-[1.5]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-300 font-semibold">Special Guest</span>
                <span className="text-[9px] font-light text-stone-400 mt-0.5">Master Speaker</span>
              </div>
            )}
            {!isSpeakerConfirmed && (
              <div className="absolute bottom-0 inset-x-0 bg-stone-800/95 py-1 text-center text-[9px] font-mono uppercase text-stone-300 tracking-wider">
                Segera Diumumkan
              </div>
            )}
          </div>

          {/* Biodata & Reputasi */}
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-mono uppercase tracking-wider mb-2.5 border border-stone-200/80">
              <Award className="w-3 h-3 text-stone-500 stroke-[1.5]" />
              <span>{speakerBadge}</span>
            </div>

            {isSpeakerConfirmed ? (
              <>
                <h3 className="text-xl sm:text-2xl font-normal text-stone-900 font-serif">
                  {speakerName}
                </h3>
                <div className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
                  {speakerTitle}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl sm:text-2xl font-normal text-stone-900 font-serif">
                  {speakerTitle}
                </h3>
                <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-50 px-2.5 py-0.5 rounded border border-stone-200 mt-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  Profil Resmi Sedang Dalam Tahap Finalisasi Panitia
                </div>
              </>
            )}

            <p className="text-xs sm:text-sm text-stone-600 mt-3.5 leading-relaxed font-light">
              {speakerBio}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600 font-medium">
              {speakerTeaserTags.map((tag, idx) => (
                <span key={idx} className="flex items-center gap-1.5 text-stone-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-500 stroke-[1.5]" /> {tag}
                </span>
              ))}
            </div>

            {!isSpeakerConfirmed && (
              <p className="text-[11px] text-stone-400 italic mt-3 text-center md:text-left">
                * Pengumuman resmi narasumber dirilis via Instagram <a href="https://www.instagram.com/indonesiadignity/?hl=en" target="_blank" rel="noreferrer" className="text-stone-700 underline font-medium">@indonesiadignity</a> dan grup koordinasi peserta terdaftar.
              </p>
            )}
          </div>

        </div>
      </section>

      {/* ── 7. SHOWCASE RUNDOWN PUBLIK ATAU TEASER KURASI ────────────────────── */}
      {isRundownVisible ? (
        <PublicRundownShowcase
          eventId={currentEvent?.id}
          onRegisterClick={handleRegisterClick}
        />
      ) : (
        <section id="rundown-acara" className="w-full py-16 sm:py-24 px-4 sm:px-6 bg-[#FAF9F6] border-y border-stone-200/80">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-stone-200/90 bg-white p-8 sm:p-14 text-center shadow-xs">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200/80 text-stone-700 text-xs font-semibold mb-5 tracking-wide font-mono">
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                <span className="uppercase tracking-wider">JADWAL RESMI &amp; RUNDOWN KEGIATAN</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 mb-4 font-serif">
                Rundown Sedang Dalam Tahap Kurasi
              </h2>

              <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed font-light mb-7">
                {landingConfig.rundown?.teaser_note || 'Susunan detail agenda menit-ke-menit, sesi praktik panggung, dan evaluasi personal sedang dalam tahap kurasi final bersama Master Trainer berlisensi.'}
              </p>

              {/* Banner Jadwal Rilis Terjadwal di Masa Depan */}
              {landingConfig.rundown?.publish_date && new Date(landingConfig.rundown.publish_date).getTime() > Date.now() && (
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs font-medium mb-7">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Jadwal resmi akan dirilis otomatis pada: <strong className="font-semibold text-amber-950">{formatDisplayDateTime(landingConfig.rundown.publish_date)}</strong>
                  </span>
                </div>
              )}

              <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 stroke-[1.5]" /> Pendaftaran tetap dibuka normal
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 stroke-[1.5]" /> Peserta terdaftar menerima rundown lengkap via WhatsApp
                </span>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="px-6 py-2.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-white text-xs sm:text-sm font-semibold shadow-sm btn-press transition-colors"
                >
                  Amankan Kuota Pendaftaran Sekarang
                </button>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── 8. FASILITAS LENGKAP YANG DIBAWA PULANG PESERTA ──────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              FASILITAS EKSKLUSIF
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 mt-1.5 font-serif">
              Kelengkapan yang Anda Dapatkan
            </h2>
            <p className="text-sm text-stone-600 mt-2 font-light">
              Seluruh kebutuhan kenyamanan belajar dan administrasi kedinasan telah dipersiapkan secara lengkap.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {landingConfig.facilities?.map((fac, idx) => {
              const IconComponent = FACILITY_ICON_MAP[fac.icon] || Award;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-xl bg-[#FAF9F6] border border-stone-200/80 flex flex-col justify-between hover:border-stone-300 transition-all"
                >
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-700 flex items-center justify-center mb-4">
                      <IconComponent className="w-4 h-4 text-stone-700 stroke-[1.5]" />
                    </div>
                    <h4 className="font-semibold text-sm text-stone-900">{fac.title}</h4>
                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-light">
                      {fac.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 9. PILIHAN BIAYA & PAKET INVESTASI PELATIHAN ──────────────────────── */}
      <section id="biaya-fasilitas" className="py-20 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              INVESTASI TRANSPARAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 mt-1.5 font-serif">
              Pilihan Paket Pendaftaran
            </h2>
            <p className="text-sm text-stone-600 mt-2 font-light">
              Biaya transparan tanpa biaya tersembunyi. Termasuk fasilitas sertifikat resmi dan materi lengkap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all flex flex-col justify-between"
              >
                <div>
                  {pkg.badge && (
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-mono uppercase tracking-wider mb-3 border border-stone-200/80">
                      {pkg.badge}
                    </div>
                  )}
                  <h3 className="text-xl font-normal text-stone-900 font-serif">
                    {pkg.name}
                  </h3>
                  <div className="mt-4 pb-4 border-b border-stone-100">
                    <div className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight">
                      {formatRupiah(pkg.price)}
                    </div>
                    {pkg.originalPrice && (
                      <div className="text-xs text-stone-400 line-through mt-0.5 font-light">
                        Harga Normal: {formatRupiah(pkg.originalPrice)}
                      </div>
                    )}
                  </div>

                  <ul className="mt-6 space-y-3">
                    {pkg.features?.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-600 leading-snug font-light">
                        <Check className="w-4 h-4 text-stone-700 shrink-0 mt-0.5 stroke-[1.5]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handleRegisterClick}
                    className="w-full py-3 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-white font-medium text-xs sm:text-sm shadow-xs btn-press flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Pilih Paket & Lanjut</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 10. PANDUAN 3 LANGKAH MUDAH MENDAFTAR ───────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-white border-b border-stone-200/80">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-14">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              ALUR PENDAFTARAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 mt-1.5 font-serif">
              Tiga Langkah Sederhana
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="text-center p-7 rounded-xl bg-[#FAF9F6] border border-stone-200/80">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-mono text-xs font-semibold mx-auto flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="font-semibold text-sm text-stone-900">Pilih Paket Pelatihan</h4>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-light">
                Tentukan paket pendaftaran (Individu atau Rombongan) sesuai kebutuhan Anda.
              </p>
            </div>

            <div className="text-center p-7 rounded-xl bg-[#FAF9F6] border border-stone-200/80">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-mono text-xs font-semibold mx-auto flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="font-semibold text-sm text-stone-900">Lengkapi Data Peserta</h4>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-light">
                Isi nama lengkap dengan gelar untuk cetak sertifikat serta nomor WhatsApp aktif.
              </p>
            </div>

            <div className="text-center p-7 rounded-xl bg-[#FAF9F6] border border-stone-200/80">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-mono text-xs font-semibold mx-auto flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="font-semibold text-sm text-stone-900">Akses & Tiket Terbit</h4>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-light">
                Setelah konfirmasi transfer, tiket resmi beserta QR Code verifikasi langsung terbit otomatis.
              </p>
            </div>

          </div>

          {/* Akses Cepat Cek Status Tiket & Pendaftaran */}
          <div className="mt-10 pt-6 border-t border-stone-200/60 text-center">
            <p className="text-xs text-stone-600 font-light">
              Sudah menyelesaikan formulir pendaftaran sebelumnya?{' '}
              <a
                href="#/cek-tiket"
                className="inline-flex items-center gap-1 font-semibold text-[#0A192F] hover:text-[#D4AF37] underline decoration-stone-300 underline-offset-4 transition-colors"
              >
                <span>Cek Status Pendaftaran &amp; Tiket Anda di Sini</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </p>
          </div>

        </div>
      </section>

      {/* ── 11. TANYA JAWAB UMUM (FAQ ACCORDION MINIMALIS) ───────────────────── */}
      <section id="tanya-jawab" className="py-20 px-4 sm:px-6 bg-[#FAF9F6] border-b border-stone-200/80">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-12">
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold">
              INFORMASI TAMBAHAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-stone-900 mt-1.5 font-serif">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="divide-y divide-stone-200/80 border-y border-stone-200/80">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 font-medium text-sm sm:text-base text-stone-900 hover:text-stone-600 transition-colors py-1"
                  >
                    <span>{faq.q}</span>
                    <span className="text-stone-400 font-mono text-lg font-light shrink-0 ml-2">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light pt-2 pb-2 pr-6">
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
      <footer className="py-14 px-4 sm:px-8 bg-[#18181B] text-stone-400 border-t border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div>
            <div className="text-sm font-semibold text-stone-200 font-mono tracking-wider">
              {currentEvent?.landing_page_config?.institution_name || 'LPK INDONESIA DIGNITY'}
            </div>
            <div className="text-xs text-stone-400 mt-1.5 max-w-md leading-relaxed font-light">
              {currentEvent?.landing_page_config?.institution_tagline || 'Lembaga Pelatihan Kerja Resmi Terakreditasi. Menyelenggarakan sertifikasi kompetensi komunikasi publik, kepemimpinan panggung, dan manajemen acara profesional.'}
            </div>
          </div>

          <div className="text-xs text-stone-400 flex flex-col items-center md:items-end gap-1 font-light">
            <div>Hotline WhatsApp: <strong className="text-stone-200 font-medium">{currentEvent?.landing_page_config?.contact_phone || import.meta.env.VITE_ADMIN_WHATSAPP || '+62 896-8107-7483'}</strong></div>
            <div>Email Layanan: <strong className="text-stone-200 font-medium">{currentEvent?.landing_page_config?.contact_email || 'official@dignityindonesia.id'}</strong></div>
            <div>Instagram: <a href={currentEvent?.landing_page_config?.instagram_url || "https://www.instagram.com/indonesiadignity/?hl=en"} target="_blank" rel="noreferrer" className="text-stone-200 hover:text-[#D4AF37] font-medium transition-colors">@{currentEvent?.landing_page_config?.instagram_handle || 'indonesiadignity'}</a></div>
            <div className="pt-1">
              <a href="#/cek-tiket" className="text-stone-300 hover:text-[#D4AF37] font-medium underline underline-offset-2 transition-colors">
                Portal Cek Status Tiket &amp; Pendaftaran ↗
              </a>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 font-mono">
              &copy; {new Date().getFullYear()} {currentEvent?.landing_page_config?.institution_name || 'LPK Indonesia Dignity'}. All rights reserved.
            </div>
          </div>

        </div>
      </footer>

      {/* ── 13. TOMBOL BANTUAN WHATSAPP MENGAPUNG (FLOATING CONCIERGE) ───────── */}
      <FloatingWhatsAppButton
        eventTitle={currentEvent?.title}
        adminPhone={currentEvent?.landing_page_config?.contact_phone || import.meta.env.VITE_ADMIN_WHATSAPP || ''}
      />

    </div>
  );
}
