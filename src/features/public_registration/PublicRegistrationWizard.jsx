import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Users, 
  User, 
  CreditCard, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  ShieldCheck, 
  Copy, 
  Check, 
  ChevronRight,
  Send,
  Ticket,
  Printer,
  AlertCircle,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';
import { normalizeCertificateName, normalizeEmail, normalizeWhatsApp, isValidUuid } from '../../utils/normalizers';
import { registrationService, voucherService } from '../../services/registrationService';
import { supabase } from '../../lib/supabaseClient';
import { DEFAULT_WEB_REGISTRATION_CONFIG } from '../../context/EventContext';

/**
 * PublicRegistrationWizard — Mobile-First Public Web Registration Experience
 * Standalone intake portal: Public Web → Supabase
 * - 100% Isolated from Admin Command Center
 * - Dynamic per-event configuration & URL routing
 * - Atomic anti-duplication protection
 */
export default function PublicRegistrationWizard({ activeEvent = null }) {
  const [resolvedEvent, setResolvedEvent] = useState(activeEvent);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [eventNotFound, setEventNotFound] = useState(false);
  const isSubmittingRef = useRef(false);

  // Dynamic Event Resolution from URL param ?event=[slug_or_id] — Selalu tarik data fresh dari Supabase
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const urlSlug = params.get('event') || activeEvent?.slug || 'msc-nov-2026';

    setIsLoadingEvent(true);
    let query = supabase.from('events').select('*');
    if (isValidUuid(urlSlug)) {
      query = query.or(`slug.eq.${urlSlug},id.eq.${urlSlug}`);
    } else {
      query = query.eq('slug', urlSlug);
    }

    query
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          setResolvedEvent(data);
          setEventNotFound(false);
        } else if (activeEvent) {
          setResolvedEvent(activeEvent);
          setEventNotFound(false);
        } else {
          setEventNotFound(true);
        }
      })
      .catch(() => {
        if (activeEvent) setResolvedEvent(activeEvent);
        else setEventNotFound(true);
      })
      .finally(() => setIsLoadingEvent(false));
  }, [activeEvent?.slug]);

  const currentEvent = resolvedEvent || activeEvent;

  // Prioritaskan konfigurasi database sejati, fallback aman ke DEFAULT_WEB_REGISTRATION_CONFIG
  const webConfig = (currentEvent?.web_registration_config && typeof currentEvent.web_registration_config === 'object')
    ? { ...DEFAULT_WEB_REGISTRATION_CONFIG, ...currentEvent.web_registration_config }
    : DEFAULT_WEB_REGISTRATION_CONFIG;

  // Cek apakah pendaftaran buka: baik dari flag kolom is_open maupun web_registration_config.is_open
  const isRegistrationOpen = (currentEvent?.is_open !== false) && (webConfig.is_open !== false);

  const [step, setStep] = useState(1);

  // Dynamic Event Type & Group (Mabar) Package Rules:
  // - WEBINAR: 10 bayar + 1 bonus gratis (Total 11 Pax) -> 10 anggota tambahan
  // - BOOTCAMP / PELATIHAN: 5 bayar + 1 bonus gratis (Total 6 Pax) -> 5 anggota tambahan
  const isWebinar = currentEvent?.event_type === 'WEBINAR' || 
    (!currentEvent?.event_type && (currentEvent?.title?.toLowerCase().includes('webinar') || currentEvent?.slug?.includes('msc')));

  const groupPaidCount = isWebinar ? 10 : 5;
  const groupBonusCount = 1;
  const groupTotalPax = groupPaidCount + groupBonusCount; // 11 pax (webinar) atau 6 pax (bootcamp)
  const groupAdditionalCount = groupTotalPax - 1; // 10 anggota tambahan untuk webinar, 5 untuk bootcamp
  const groupPackageKey = isWebinar ? 'MABAR_11' : 'MABAR_6';

  const [packageType, setPackageType] = useState('INDIVIDU'); // 'INDIVIDU' or groupPackageKey

  // Primary Registrant Form
  const [primaryData, setPrimaryData] = useState({
    nama: '',
    email: '',
    whatsapp: '',
    instansi: '',
    profesi: '',
    kota: '',
    bank: webConfig.banks?.[0]?.bank_name || 'Bank Mandiri'
  });

  // Dynamic MABAR Additional Members (10 for Webinar, 5 for Bootcamp)
  const [mabarMembers, setMabarMembers] = useState(() => 
    Array.from({ length: 10 }, () => ({ nama: '', email: '', whatsapp: '' }))
  );

  // Sync mabarMembers length when event changes
  useEffect(() => {
    setMabarMembers(prev => {
      if (prev.length === groupAdditionalCount) return prev;
      return Array.from({ length: groupAdditionalCount }, (_, i) => 
        prev[i] || { nama: '', email: '', whatsapp: '' }
      );
    });
  }, [groupAdditionalCount]);

  // ── Voucher Rebate State ──────────────────────────────
  const [voucherInput, setVoucherInput]     = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null); // response dari validate_voucher RPC
  const [voucherError, setVoucherError]     = useState('');
  const [voucherValidating, setVoucherValidating] = useState(false);

  // Auto-select package dari URL ?package=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const pkgFromUrl = params.get('package');
    if (pkgFromUrl) {
      setPackageType(pkgFromUrl);
    }
  }, [groupPackageKey]);

  // Auto-fill voucher dari URL ?voucher=... lalu validasi ke server
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const urlVoucher = params.get('voucher');
    if (urlVoucher && currentEvent?.id) {
      const code = urlVoucher.toUpperCase().trim();
      setVoucherInput(code);
      // Validasi ke server (gross amount 0 untuk preview — server akan hitung saat submit)
      const baseForPreview = currentEvent?.promo_price || currentEvent?.base_price || 0;
      voucherService.validateVoucher(code, currentEvent.id, baseForPreview)
        .then(result => {
          if (result?.valid) setAppliedVoucher(result);
          else setVoucherError(result?.message || 'Kode voucher tidak valid.');
        })
        .catch(() => {}); // silent — tidak block halaman
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.id]);

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) { setVoucherError('Masukkan kode voucher terlebih dahulu.'); return; }
    if (!currentEvent?.id) { setVoucherError('Event belum dimuat.'); return; }

    setVoucherValidating(true);
    setVoucherError('');
    setAppliedVoucher(null);

    try {
      const basePrice = currentEvent?.promo_price || currentEvent?.base_price || 0;
      const result = await voucherService.validateVoucher(code, currentEvent.id, basePrice);
      if (result?.valid) {
        setAppliedVoucher(result);
        setVoucherError('');
      } else {
        setVoucherError(result?.message || `Kode voucher "${code}" tidak valid untuk acara ini.`);
      }
    } catch (err) {
      setVoucherError('Gagal memvalidasi voucher. Coba lagi.');
    } finally {
      setVoucherValidating(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  };
  // ──────────────────────────────────────────────────────

  const [proofMethod, setProofMethod] = useState('UPLOAD'); // 'UPLOAD' | 'GDRIVE'
  const [proofDriveUrl, setProofDriveUrl] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredResult, setRegisteredResult] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const eventTitle = currentEvent?.title || "Pelatihan Public Speaking Dignity";
  const eventDate = currentEvent?.date_start 
    ? new Date(currentEvent.date_start).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) 
    : "Segera Diumumkan";
  const eventVenue = currentEvent?.venue || "Zoom Cloud Meeting";
  
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.') : '';
  const startTimeStr = formatTime(currentEvent?.date_start);
  const endTimeStr = formatTime(currentEvent?.date_end);
  const eventTime = startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr} WIB` : (startTimeStr ? `${startTimeStr} WIB` : '08.00 - 11.30 WIB');

  const singlePrice = currentEvent?.promo_price || currentEvent?.base_price || 100000;
  const groupPrice = singlePrice * groupPaidCount;
  const isGroupPackage = packageType === 'MABAR_6' || packageType === 'MABAR_11' || packageType === groupPackageKey || packageType === 'GROUP';
  const basePrice = isGroupPackage ? groupPrice : singlePrice;
  // Gunakan nilai dari server (discount_applied) — bukan kalkulasi frontend
  const voucherDiscount = (!isGroupPackage && appliedVoucher?.valid) ? (appliedVoucher.discount_applied || 0) : 0;
  const priceAmount = Math.max(0, basePrice - voucherDiscount);

  const handleUpdateMember = (index, field, value) => {
    setMabarMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCopyAccount = (accNo) => {
    navigator.clipboard.writeText(accNo.replace(/[^0-9]/g, ''));
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSubmitRegistration = async () => {
    // 0. Strict Gate Penutupan Pendaftaran dari DB
    if (!webConfig.is_open) {
      alert(webConfig.close_message || 'Pendaftaran untuk acara ini saat ini telah ditutup.');
      return;
    }

    // 1. Validasi Nama Lengkap
    const cleanName = normalizeCertificateName(primaryData.nama);
    if (!cleanName || cleanName.length < 3) {
      alert('Mohon masukkan Nama Lengkap Anda dengan benar (minimal 3 karakter).');
      return;
    }

    // 2. Validasi Nomor WhatsApp Indonesia
    const cleanWa = normalizeWhatsApp(primaryData.whatsapp);
    if (!cleanWa || cleanWa.length < 10 || cleanWa.length > 15) {
      alert('Nomor WhatsApp tidak valid. Masukkan nomor aktif Anda (contoh: 08123456789 atau 628123456789).');
      return;
    }

    // 3. Validasi Format Email
    const cleanEmail = normalizeEmail(primaryData.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      alert('Format alamat email tidak valid. Masukkan alamat email aktif Anda.');
      return;
    }

    // 4. Validasi Instansi jika diwajibkan oleh konfigurasi event
    if (webConfig.form_fields?.institution_required && !primaryData.instansi?.trim()) {
      alert('Mohon isi nama Instansi / Perusahaan Anda.');
      return;
    }

    // 5. Validasi Berkas Bukti Transfer (File Upload atau Link Google Drive)
    let finalProofData = '';
    if (proofMethod === 'GDRIVE') {
      const trimmedDrive = proofDriveUrl.trim();
      if (webConfig.form_fields?.proof_upload_required && !trimmedDrive) {
        alert('Mohon masukkan tautan Google Drive bukti transfer Anda.');
        return;
      }
      finalProofData = trimmedDrive;
    } else {
      if (proofFile) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(proofFile.type)) {
          alert('Format berkas bukti transfer tidak didukung. Harap unggah berkas gambar JPG, PNG, atau WebP.');
          return;
        }
        if (proofFile.size > 5 * 1024 * 1024) {
          alert('Ukuran berkas bukti transfer terlalu besar (maksimal 5 MB).');
          return;
        }
      }
    }

    // 6. Proteksi Double-Click / Race Condition
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const regId = `REG-${Date.now().toString().slice(-6)}`;
      const defaultTicketNo = `TICKET-DIGNITY-${Math.floor(100 + Math.random() * 900)}`;

      // Encode uploaded proof image to Base64 data URL if UPLOAD
      let resolvedProof = finalProofData;
      if (proofMethod === 'UPLOAD' && proofFile) {
        try {
          resolvedProof = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(proofFile);
          });
        } catch (readErr) {
          console.warn('Notice proof file read error:', readErr);
        }
      }

      // Bangun keterangan voucher untuk dicatat di notes
      const voucherNotesStr = appliedVoucher?.valid
        ? `[VOUCHER:${appliedVoucher.code || voucherInput}|POTONGAN:${appliedVoucher.discount_applied}|HARGA_NORMAL:${basePrice}|BAYAR_BERSIH:${priceAmount}]`
        : '';

      const newRegistration = {
        id: regId,
        nama: cleanName,
        email: cleanEmail,
        whatsapp: cleanWa,
        instansi: primaryData.instansi || 'Peserta Mandiri',
        profesi: primaryData.profesi || '-',
        kota: primaryData.kota || 'Surakarta',
        kategori: isGroupPackage 
          ? (isWebinar 
              ? `Promo Komunitas (${groupTotalPax} Orang • 10+1) : ${formatRupiah(groupPrice)}` 
              : `Promo Rombongan (${groupTotalPax} Orang • 5+1) : ${formatRupiah(groupPrice)}`)
          : appliedVoucher?.valid
            ? `Tiket Individu (Rebate ${voucherInput}) : ${formatRupiah(priceAmount)}`
            : `Tiket Individu : ${formatRupiah(priceAmount)}`,
        nominal: priceAmount,
        bank: primaryData.bank,
        buktiUrl: resolvedProof || '',
        rawBukti: resolvedProof || '',
        statusBayar: 'PENDING',
        statusEmailTicket: 'BELUM',
        nomorTicket: defaultTicketNo,
        timestamp: new Date().toISOString(),
        isDuplicate: false,
        mabarNotes: isGroupPackage 
          ? mabarMembers.slice(0, groupAdditionalCount).filter(m => m.nama.trim()).map((m, i) => `${i+1}. ${m.nama} (${m.whatsapp})`).join(', ')
          : '',
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount || 0
      };

      // 1. Submit via Atomic RPC ke Supabase (Anti-Duplikasi & Aman RLS)
      if (currentEvent?.id) {
        try {
          const rpcRes = await registrationService.submitPublicRegistration({
            eventId: currentEvent.id,
            fullName: cleanName,
            email: cleanEmail,
            whatsapp: cleanWa,
            institution: primaryData.instansi,
            jobTitle: primaryData.profesi,
            city: primaryData.kota,
            packageType: isGroupPackage ? groupPackageKey : 'INDIVIDU',
            totalDue: priceAmount,
            bankDestination: primaryData.bank,
            proofData: resolvedProof || null,
            notes: [newRegistration.mabarNotes, voucherNotesStr].filter(Boolean).join(' | ') || null,
            mabarMembers: isGroupPackage ? mabarMembers.slice(0, groupAdditionalCount) : [],
            voucherCode: appliedVoucher?.valid ? voucherInput : null  // [v2] server re-validates atomically
          });

          // Jika database menolak (Pendaftaran Ditutup / Quota Habis / dll) -> STOP!
          if (rpcRes && rpcRes.success === false) {
            alert(rpcRes.message || 'Pendaftaran tidak dapat diproses saat ini.');
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
          }

          if (rpcRes?.is_duplicate) {
            newRegistration.isDuplicate = true;
            newRegistration.duplicateMessage = rpcRes.message;
            if (rpcRes.ticket_number) newRegistration.nomorTicket = rpcRes.ticket_number;
            if (rpcRes.status === 'PAID') newRegistration.statusBayar = 'VERIFIED';
          } else if (rpcRes?.ticket_number) {
            newRegistration.nomorTicket = rpcRes.ticket_number;
          }
        } catch (dbErr) {
          console.warn('Notice exception submit pendaftaran ke database:', dbErr);
          const isDuplicateConstraint = dbErr?.message?.includes('idx_registrations_event_person_active') ||
            dbErr?.message?.includes('duplicate key') ||
            dbErr?.message?.includes('violates unique constraint');

          if (isDuplicateConstraint) {
            newRegistration.isDuplicate = true;
            newRegistration.duplicateMessage = 'Nomor WhatsApp atau email Anda sudah pernah tercatat pada sistem kami untuk acara ini. Data pendaftaran Anda aman dan sedang diproses oleh panitia.';
          } else {
            alert(`Pendaftaran belum dapat diproses: ${dbErr.message || 'Silakan coba beberapa saat lagi atau hubungi panitia via WhatsApp.'}`);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
          }
        }
      } else {
        alert('Data acara tidak ditemukan. Silakan muat ulang halaman formulir.');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      setRegisteredResult(newRegistration);
      setStep(5); // Success step
    } catch (err) {
      alert(`Terjadi kesalahan saat memproses pendaftaran: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleBackToLanding = () => {
    const slug = currentEvent?.slug || currentEvent?.id;
    const targetHash = slug ? `#/?event=${encodeURIComponent(slug)}` : '#/';
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      window.location.hash = targetHash;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-10 px-4 sm:px-6 flex flex-col justify-center items-center font-sans selection:bg-[#0A192F] selection:text-white">
      
      {/* Top Navigation Bar & Official Intake Badge */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleBackToLanding}
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-stone-200/90 text-stone-600 hover:text-stone-900 text-xs font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all active:scale-95 cursor-pointer"
          title="Kembali ke Halaman Detail Acara"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Detail Acara</span>
        </button>

        {/* Monogram Badge Official Intake */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-stone-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-4 h-4 rounded-full bg-[#0A192F] flex items-center justify-center text-[8px] font-serif font-bold text-[#D4AF37]">
            ID
          </div>
          <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase font-semibold">
            OFFICIAL INTAKE
          </span>
        </div>
      </div>

      {/* Top Brand Bar */}
      <div className="w-full max-w-xl text-center mb-7">
        <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold block mb-1.5">
          LEMBAGA PELATIHAN KERJA INDONESIA DIGNITY
        </span>
        <h1 className="text-2xl sm:text-3xl font-normal text-stone-900 font-serif tracking-tight leading-snug">
          Formulir Pendaftaran Resmi
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 font-light max-w-md mx-auto line-clamp-2">
          {eventTitle}
        </p>
      </div>

      {/* Loading State Screen */}
      {isLoadingEvent ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-12 text-center space-y-3 animate-fade-in">
          <div className="w-8 h-8 border-2 border-[#0A192F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-stone-600 font-serif">Memuat Formulir Pendaftaran Resmi...</p>
        </div>
      ) : eventNotFound ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-8 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-normal font-serif text-stone-900">Acara Tidak Ditemukan</h2>
          <p className="text-xs text-stone-600 font-light leading-relaxed max-w-md mx-auto">
            Tautan pendaftaran yang Anda buka tidak ditemukan atau telah kadaluarsa. Silakan periksa kembali tautan Anda atau hubungi Admin LPK Dignity.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20saya%20ingin%20menanyakan%20jadwal%20pelatihan%20terbaru."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium shadow-sm transition-all active:scale-95"
            >
              <span>Hubungi Admin via WhatsApp</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </a>
          </div>
        </div>
      ) : !isRegistrationOpen ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_8px_32px_rgba(10,25,47,0.06)] p-8 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-normal font-serif text-stone-900">Pendaftaran Ditutup Sementara</h2>
          <p className="text-xs text-stone-600 font-light leading-relaxed max-w-md mx-auto">
            {webConfig.close_message || "Pendaftaran untuk program ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @lpkdignity."}
          </p>
          <div className="pt-3">
            <a
              href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20apakah%20masih%20ada%20slot%20tersisa%20untuk%20webinar%20ini%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] text-white text-xs font-medium shadow-sm transition-all active:scale-95"
            >
              <span>Hubungi Admin via WhatsApp</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </a>
          </div>
        </div>
      ) : (
      /* Main Wizard Card */
      <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200/90 shadow-[0_12px_40px_rgba(10,25,47,0.06)] overflow-hidden animate-fade-in">
        
        {/* Step Progress Bar - Quiet Luxury 4-Phases */}
        <div className="bg-[#FAF9F6] px-6 sm:px-8 py-3.5 border-b border-stone-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono tracking-wider text-stone-500 uppercase font-semibold">
              Langkah 0{step} <span className="text-stone-300">/</span> 04
            </span>
            <span className="text-xs font-serif text-stone-800 font-medium">
              {step === 1 && "Pilih Paket & Jadwal"}
              {step === 2 && "Identitas Peserta"}
              {step === 3 && "Instruksi Pembayaran"}
              {step === 4 && "Lampiran Bukti Transfer"}
              {step === 5 && "Tanda Terima Resmi"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map(s => {
              const isDone = step > s;
              const isCurrent = step === s;
              return (
                <div 
                  key={s} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-[#0A192F]' 
                      : isDone 
                        ? 'bg-stone-800' 
                        : 'bg-stone-200/80'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">

          {/* ── STEP 1: EVENT INFO & PACKAGE SELECTION ───────── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* Executive Dossier: Event Schedule & Venue */}
              <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2.5">
                  <span className="text-[10px] font-mono tracking-widest text-stone-500 uppercase font-semibold">
                    JADWAL & LOKASI PELAKSANAAN
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                    {isWebinar ? 'LIVE WEBINAR' : 'OFFLINE BOOTCAMP'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-stone-900 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-stone-600 shrink-0 stroke-[1.5]" />
                    <span>{eventDate}</span>
                  </div>
                  <div className="text-xs text-stone-600 flex items-center gap-2.5 font-light">
                    <Clock className="w-4 h-4 text-stone-500 shrink-0 stroke-[1.5]" />
                    <span>{eventTime}</span>
                  </div>
                  <div className="text-xs text-stone-600 flex items-center gap-2.5 font-light">
                    <MapPin className="w-4 h-4 text-stone-500 shrink-0 stroke-[1.5]" />
                    <span>{eventVenue}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-widest text-stone-400 uppercase font-semibold block mb-2.5">
                  PILIH PAKET PENDAFTARAN:
                </label>
                <div className={`grid grid-cols-1 ${webConfig.allow_mabar ? 'sm:grid-cols-2' : ''} gap-3`}>
                  
                  {/* Paket Individu */}
                  <div
                    onClick={() => setPackageType('INDIVIDU')}
                    className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2 ${
                      packageType === 'INDIVIDU'
                        ? 'border-2 border-[#0A192F] bg-[#FAF9F6] shadow-[0_4px_16px_rgba(10,25,47,0.06)] ring-1 ring-[#0A192F]/10'
                        : 'border border-stone-200/90 hover:border-stone-300 hover:bg-[#FAF9F6]/40 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900">Tiket Individu</span>
                      {packageType === 'INDIVIDU' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                          <Check className="w-2.5 h-2.5 text-[#D4AF37]" /> Dipilih
                        </span>
                      ) : (
                        <User className="w-4 h-4 text-stone-400 stroke-[1.5]" />
                      )}
                    </div>
                    <div className="text-xl font-normal font-serif text-stone-900">
                      {formatRupiah(currentEvent?.promo_price || currentEvent?.base_price || 100000)}
                    </div>
                    <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                      Akses penuh bimbingan materi, e-sertifikat resmi, dan e-workbook.
                    </p>
                  </div>

                  {/* Paket Promo Rombongan (Mabar) Dinamis */}
                  {webConfig.allow_mabar && (
                    <div
                      onClick={() => setPackageType(groupPackageKey)}
                      className={`p-4 rounded-2xl transition-all cursor-pointer space-y-2 ${
                        isGroupPackage
                          ? 'border-2 border-[#0A192F] bg-[#FAF9F6] shadow-[0_4px_16px_rgba(10,25,47,0.06)] ring-1 ring-[#0A192F]/10'
                          : 'border border-stone-200/90 hover:border-stone-300 hover:bg-[#FAF9F6]/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900">
                          {isWebinar ? 'Promo Komunitas (10+1)' : 'Promo Rombongan (5+1)'}
                        </span>
                        {isGroupPackage ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                            <Check className="w-2.5 h-2.5 text-[#D4AF37]" /> Dipilih
                          </span>
                        ) : (
                          <Users className="w-4 h-4 text-stone-400 stroke-[1.5]" />
                        )}
                      </div>
                      <div className="text-xl font-normal font-serif text-emerald-800">
                        {formatRupiah(groupPrice)}
                      </div>
                      <div className="space-y-1">
                        <div className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          Bonus 1 Tiket Gratis (Total {groupTotalPax} Pax)
                        </div>
                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                          Hemat {formatRupiah(singlePrice)}! Bayar {groupPaidCount} tiket untuk {groupTotalPax} peserta.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* ── Voucher Rebate Input ── */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold block">
                  KODE VOUCHER REBATE ALUMNI (OPSIONAL):
                </label>

                {appliedVoucher ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-emerald-950">Voucher Aktif: <strong className="font-mono">{voucherInput}</strong></p>
                        <p className="text-[11px] text-emerald-700 font-light">Potongan {formatRupiah(appliedVoucher.discount_applied)} — {appliedVoucher.message}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-[10px] font-mono uppercase tracking-wider text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="CONTOH: REBATE100K-ALUMNI"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 font-mono uppercase text-stone-900 placeholder:text-stone-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={voucherValidating}
                      className="px-4 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#112240] disabled:opacity-50 text-white text-xs font-medium tracking-wide active:scale-95 transition-all cursor-pointer"
                    >
                      {voucherValidating ? 'Memvalidasi...' : 'Terapkan'}
                    </button>
                  </div>
                )}

                {voucherError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{voucherError}</span>
                  </p>
                )}
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBackToLanding}
                  className="px-5 py-3 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
                >
                  <span>Lanjutkan Isi Data Peserta</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: PARTICIPANT IDENTITY DETAILS ─────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="border-b border-stone-200/80 pb-2.5">
                <h3 className="text-base font-normal font-serif text-stone-900">Identitas Pendaftar Utama</h3>
                <p className="text-[11px] text-stone-500 font-light mt-0.5">Pastikan ejaan nama sesuai untuk pencetakan e-sertifikat resmi.</p>
              </div>
              
              <div>
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
                  Nama Lengkap & Gelar (Untuk Sertifikat):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: dr. Budi Santoso, Sp.A / Siti Rahma, S.Tr.Keb."
                  value={primaryData.nama}
                  onChange={(e) => setPrimaryData({ ...primaryData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
                    Alamat Email Aktif:
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={primaryData.email}
                    onChange={(e) => setPrimaryData({ ...primaryData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
                    Nomor WhatsApp Aktif:
                  </label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={primaryData.whatsapp}
                    onChange={(e) => setPrimaryData({ ...primaryData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 font-mono text-stone-900 placeholder:text-stone-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
                    Instansi / Perusahaan / Kampus:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: RSUD Moewardi / Poltekkes"
                    value={primaryData.instansi}
                    onChange={(e) => setPrimaryData({ ...primaryData, instansi: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-500 font-medium block mb-1.5">
                    Kota Domisili:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Surakarta"
                    value={primaryData.kota}
                    onChange={(e) => setPrimaryData({ ...primaryData, kota: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200/90 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white focus:ring-1 focus:ring-stone-400 text-stone-900 placeholder:text-stone-400 transition-all"
                  />
                </div>
              </div>

              {/* If Group / MABAR, show dynamic members form */}
              {isGroupPackage && (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3 pt-3.5">
                  <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                    <span className="font-semibold text-stone-800 text-xs">
                      Daftar {groupAdditionalCount} Anggota Tambahan (Total {groupTotalPax} Peserta)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                      Bonus 1 Gratis
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                    Pendaftar utama di atas dihitung sebagai Peserta #1. Mohon lengkapi data anggota kelompok Anda:
                  </p>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {mabarMembers.slice(0, groupAdditionalCount).map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-stone-200/80 space-y-2 shadow-2xs">
                        <div className="font-medium text-stone-700 flex items-center justify-between text-[11px]">
                          <span>Anggota #{idx + 2}</span>
                          {idx === groupAdditionalCount - 1 && (
                            <span className="text-emerald-700 font-medium text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                              Tiket Bonus Gratis
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nama Lengkap & Gelar"
                            value={m.nama}
                            onChange={(e) => handleUpdateMember(idx, 'nama', e.target.value)}
                            className="px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white text-stone-900"
                          />
                          <input
                            type="tel"
                            placeholder="Nomor WhatsApp"
                            value={m.whatsapp}
                            onChange={(e) => handleUpdateMember(idx, 'whatsapp', e.target.value)}
                            className="px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-[#FAF9F6] outline-none focus:border-stone-400 focus:bg-white font-mono text-stone-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!primaryData.nama || !primaryData.email || !primaryData.whatsapp) {
                      alert('Mohon isi nama lengkap, alamat email, dan nomor WhatsApp Anda.');
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PAYMENT INSTRUCTIONS ─────────────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="border-b border-stone-200/80 pb-2.5">
                <h3 className="text-base font-normal font-serif text-stone-900">Instruksi Pembayaran Resmi</h3>
                <p className="text-[11px] text-stone-500 font-light mt-0.5">Transfer dilakukan ke rekening resmi lembaga berbadan hukum LPK Indonesia Dignity.</p>
              </div>

              {/* Total Due Card Dossier */}
              <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3 shadow-2xs">
                {appliedVoucher && packageType === 'INDIVIDU' ? (
                  <>
                    <div className="flex items-center justify-between text-stone-600">
                      <span className="text-[11px] font-light">Investasi Normal:</span>
                      <span className="font-mono line-through text-stone-400">{formatRupiah(basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-800 font-medium">
                      <span className="text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Voucher Rebate ({appliedVoucher.code}):
                      </span>
                      <span className="font-mono font-bold">- {formatRupiah(appliedVoucher.discount)}</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold block">TOTAL WAJIB TRANSFER:</span>
                        <div className="text-2xl font-normal font-serif text-stone-900 mt-0.5">{formatRupiah(priceAmount)}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-700">
                        Tiket Individu
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold block">TOTAL TAGIHAN TRANSFER:</span>
                      <div className="text-2xl font-normal font-serif text-stone-900 mt-0.5">{formatRupiah(priceAmount)}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-700">
                      {isGroupPackage ? (isWebinar ? `Promo Komunitas (${groupTotalPax} Pax)` : `Promo Rombongan (${groupTotalPax} Pax)`) : 'Tiket Individu'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bank Transfer Details */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold block">
                  PILIHAN REKENING BANK RESMI TUJUAN:
                </span>
                
                {webConfig.banks && webConfig.banks.length > 0 ? (
                  webConfig.banks.map((b, bIdx) => (
                    <div 
                      key={bIdx}
                      onClick={() => setPrimaryData(d => ({ ...d, bank: b.bank_name }))}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        primaryData.bank === b.bank_name 
                          ? 'border-2 border-[#0A192F] bg-white ring-1 ring-[#0A192F]/10 shadow-xs' 
                          : 'border border-stone-200/90 bg-[#FAF9F6] hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900 block text-xs">{b.bank_name}</strong>
                          {primaryData.bank === b.bank_name && (
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#0A192F] text-white">
                              Dipilih
                            </span>
                          )}
                        </div>
                        <code className="text-sm font-mono font-bold text-stone-900 block mt-1">{b.account_number}</code>
                        <span className="text-[11px] text-stone-500 font-light block mt-0.5">a.n. {b.account_holder}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(b.account_number);
                        }}
                        className="p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all active:scale-95 cursor-pointer"
                        title="Salin nomor rekening"
                      >
                        {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-stone-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <strong className="text-stone-900 block text-xs">Bank Mandiri</strong>
                      <code className="text-sm font-mono font-bold text-stone-900 block mt-1">138-00-2455891-2</code>
                      <span className="text-[11px] text-stone-500 font-light block mt-0.5">a.n. LPK INDONESIA DIGNITY</span>
                    </div>
                    <button
                      onClick={() => handleCopyAccount('1380024558912')}
                      className="p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.12)] active:scale-[0.98] cursor-pointer tracking-wide"
                >
                  <span>Saya Sudah Transfer (Konfirmasi)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: CONFIRMATION & SUBMIT ─────────────────── */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="border-b border-stone-200/80 pb-2.5">
                <h3 className="text-base font-normal font-serif text-stone-900">Konfirmasi Bukti Pembayaran</h3>
                <p className="text-[11px] text-stone-500 font-light mt-0.5">Lampirkan foto struk m-banking atau tautan bukti transfer Anda.</p>
              </div>
              
              {/* Pilihan Metode Lampiran: Segmented Control */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setProofMethod('UPLOAD')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    proofMethod === 'UPLOAD'
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-[#0A192F]" />
                  <span>Upload Foto (Instan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProofMethod('GDRIVE')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    proofMethod === 'GDRIVE'
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/90'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0A192F]" />
                  <span>Link Google Drive</span>
                </button>
              </div>

              {/* Box Input Berdasarkan Metode */}
              {proofMethod === 'GDRIVE' ? (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 space-y-3">
                  <div className="text-left space-y-1">
                    <label className="text-[10.5px] font-mono uppercase tracking-wider text-stone-600 font-medium flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                      <span>TAUTAN GOOGLE DRIVE BUKTI TRANSFER:</span>
                    </label>
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-950">Penting: Buka Izin Akses Berkas</p>
                        <p className="text-amber-900/80 mt-0.5 font-light">
                          Pastikan hak akses berkas di Google Drive telah disetel ke <strong>"Siapa saja yang memiliki link dapat melihat"</strong> agar verifikasi berlangsung instan.
                        </p>
                      </div>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    value={proofDriveUrl}
                    onChange={(e) => setProofDriveUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200/90 text-xs font-mono focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none bg-white text-stone-900"
                  />
                  {proofDriveUrl.trim() && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Tautan siap dilampirkan: {proofDriveUrl.trim()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#FAF9F6] border-2 border-dashed border-stone-300 hover:border-stone-400 text-center space-y-3 transition-colors">
                  {proofPreview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block border border-stone-200 rounded-xl overflow-hidden shadow-xs bg-white max-h-48 max-w-full">
                        <img
                          src={proofPreview}
                          alt="Bukti Transfer"
                          className="max-h-44 w-auto object-contain mx-auto"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-medium text-stone-700 truncate max-w-xs">
                          📎 {proofFile?.name || 'Bukti Transfer Terlampir'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProofFile(null);
                            setProofPreview(null);
                          }}
                          className="text-[11px] font-medium text-rose-600 hover:text-rose-700 underline ml-2 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <div>
                        <span className="font-medium text-stone-900 block text-xs">Upload Struk Transfer (Disarankan)</span>
                        <p className="text-[11px] text-stone-500 font-light max-w-sm mx-auto mt-0.5">
                          Lampirkan tangkapan layar / foto bukti transfer bank Anda untuk verifikasi tiket otomatis.
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setProofFile(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setProofPreview(reader.result);
                            reader.readAsDataURL(file);
                          } else {
                            setProofPreview(null);
                          }
                        }}
                        className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#0A192F] file:text-white hover:file:bg-[#112240] cursor-pointer"
                      />
                    </>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/90 text-stone-600 text-xs flex items-center gap-2.5 font-light">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pendaftaran Anda dilindungi enkripsi aman dan nomor tiket resmi akan segera diterbitkan.</span>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3 rounded-xl text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/90 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-5 rounded-xl text-xs sm:text-sm font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,25,47,0.15)] disabled:opacity-50 active:scale-[0.98] cursor-pointer tracking-wide"
                >
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>{isSubmitting ? 'Memproses Pendaftaran...' : 'Kirim Pendaftaran Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: SUCCESS RECEIPT ───────────────────────── */}
          {step === 5 && registeredResult && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-normal font-serif text-stone-900">Pendaftaran Berhasil Dikirim!</h3>
                <p className="text-xs text-stone-500 font-light mt-1 max-w-sm mx-auto leading-relaxed">
                  {webConfig.success_message || "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."}
                </p>
              </div>

              {/* Duplicate Notice Banner if previously registered */}
              {registeredResult.isDuplicate && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-left space-y-1 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Pendaftaran Sebelumnya Terdeteksi</span>
                  </div>
                  <p className="text-[11.5px] font-light leading-relaxed">
                    {registeredResult.duplicateMessage || "Data nama/email/nomor WhatsApp Anda sudah pernah tercatat pada sistem kami untuk acara ini."}
                  </p>
                </div>
              )}

              {/* Official Ticket Box - Quiet Luxury Dossier */}
              <div className="p-4.5 bg-[#FAF9F6] rounded-2xl border-2 border-[#0A192F] shadow-xs flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 font-semibold block">
                    NOMOR E-TICKET RESMI:
                  </span>
                  <strong className="font-mono text-base sm:text-lg text-stone-900 font-bold tracking-tight block mt-0.5">
                    {registeredResult.nomorTicket || registeredResult.id}
                  </strong>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-[#0A192F] shadow-2xs">
                  <Ticket className="w-5 h-5 stroke-[1.5]" />
                </div>
              </div>

              {/* Receipt Card */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200/90 text-left space-y-2.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500 font-light">Nama Peserta:</span>
                  <strong className="text-stone-900 font-medium">{registeredResult.nama}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500 font-light">Acara:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[200px]">{eventTitle}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500 font-light">Paket:</span>
                  <span className="text-stone-800 font-medium">{registeredResult.kategori}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-light">Status Pembayaran:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                    registeredResult.statusBayar === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}>
                    {registeredResult.statusBayar === 'VERIFIED' ? 'Terverifikasi (Lunas)' : 'Menunggu Verifikasi Admin'}
                  </span>
                </div>
              </div>

              {/* Notice Langkah Selanjutnya */}
              {registeredResult.statusBayar !== 'VERIFIED' ? (
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/90 text-left space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                    <Clock className="w-4 h-4 text-stone-600 shrink-0" />
                    <span>Langkah Selanjutnya: Menunggu Verifikasi Panitia</span>
                  </div>
                  <p className="text-stone-600 text-[11.5px] font-light leading-relaxed">
                    Bukti transfer Anda telah tersimpan di sistem. Panitia akan memvalidasi pembayaran Anda.
                    <br />
                    Setelah diverifikasi, <strong>Tautan WhatsApp Group Resmi</strong> & <strong>E-Ticket</strong> akan dikirimkan otomatis ke alamat email: <strong className="text-stone-900 font-mono">{registeredResult.email}</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-left space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pembayaran Terverifikasi Lunas!</span>
                  </div>
                  <p className="text-emerald-900/80 text-[11.5px] font-light">
                    Silakan langsung bergabung ke WhatsApp Group resmi peserta untuk mengakses link Zoom & materi pelatihan.
                  </p>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                {/* HANYA tampilkan Tautan Grup WhatsApp jika sudah VERIFIED/LUNAS */}
                {registeredResult.statusBayar === 'VERIFIED' && webConfig.wa_group_url && (
                  <a
                    href={webConfig.wa_group_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 rounded-xl text-xs font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                    <span>Gabung WhatsApp Group Resmi Peserta</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </a>
                )}

                {/* Tombol Utama saat PENDING: Konfirmasi ke WhatsApp Admin */}
                {registeredResult.statusBayar !== 'VERIFIED' && (
                  <a
                    href={`https://wa.me/6289681077483?text=${encodeURIComponent(
                      `Halo Admin LPK Dignity, saya telah mendaftar acara ${eventTitle} atas nama ${registeredResult.nama} (Tiket: ${registeredResult.nomorTicket || registeredResult.id}). Saya telah mengunggah bukti pembayaran via web, mohon dibantu verifikasi. Terima kasih!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 rounded-xl text-xs font-medium bg-[#0A192F] hover:bg-[#112240] text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
                    <span>Konfirmasi Pembayaran ke WA Admin</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl text-xs font-medium border border-stone-200/90 bg-white hover:bg-stone-50 text-stone-700 transition-all inline-flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-400" />
                  <span>Cetak / Simpan Tanda Terima (PDF)</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
      )}

    </div>
  );
}
