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
          console.error('Error submit pendaftaran ke database:', dbErr);
          alert(`Gagal memproses pendaftaran ke database: ${dbErr.message}`);
          setIsSubmitting(false);
          isSubmittingRef.current = false;
          return;
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 flex flex-col justify-center items-center font-sans">
      
      {/* Top Navigation Bar with Back Affordance */}
      <div className="w-full max-w-xl flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handleBackToLanding}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="Kembali ke Halaman Detail Acara"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Kembali ke Detail Acara</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Official Intake</span>
        </div>
      </div>

      {/* Top Brand Bar */}
      <div className="w-full max-w-xl text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
          Formulir Pendaftaran Webinar Nasional
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {eventTitle}
        </p>
      </div>

      {/* Loading State Screen */}
      {isLoadingEvent ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-12 text-center space-y-3 animate-fade-in">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Memuat Formulir Pendaftaran Resmi...</p>
        </div>
      ) : eventNotFound ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Acara Tidak Ditemukan</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Tautan pendaftaran yang Anda buka tidak ditemukan atau telah kadaluarsa. Silakan periksa kembali tautan Anda atau hubungi Admin LPK Dignity.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20saya%20ingin%20menanyakan%20jadwal%20pelatihan%20terbaru."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              <span>Hubungi Admin via WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : !isRegistrationOpen ? (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Pendaftaran Ditutup Sementara</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            {webConfig.close_message || "Pendaftaran untuk program ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @lpkdignity."}
          </p>
          <div className="pt-3">
            <a
              href="https://wa.me/6289681077483?text=Halo%20Admin%20LPK%20Dignity%2C%20apakah%20masih%20ada%20slot%20tersisa%20untuk%20webinar%20ini%3F"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              <span>Hubungi Admin via WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
      /* Main Wizard Card */
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-fade-in">
        
        {/* Step Progress Bar */}
        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Langkah {step} dari 4</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all ${
                  step === s ? 'w-6 bg-amber-500' : step > s ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">

          {/* ── STEP 1: EVENT INFO & PACKAGE SELECTION ───────── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">Jadwal & Lokasi Pelaksanaan:</div>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{eventDate}</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{eventTime}</span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{eventVenue}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Pilih Paket Pendaftaran:
                </label>
                <div className={`grid grid-cols-1 ${webConfig.allow_mabar ? 'sm:grid-cols-2' : ''} gap-3`}>
                  
                  {/* Paket Individu */}
                  <div
                    onClick={() => setPackageType('INDIVIDU')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                      packageType === 'INDIVIDU'
                        ? 'border-amber-500 bg-amber-50/20 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Tiket Individu</span>
                      <User className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-lg font-bold font-mono text-slate-950">
                      {formatRupiah(currentEvent?.promo_price || currentEvent?.base_price || 100000)}
                    </div>
                    <p className="text-[11px] text-slate-500">Akses penuh pelatihan, e-sertifikat resmi & materi</p>
                  </div>

                  {/* Paket Promo Rombongan (Mabar) Dinamis */}
                  {webConfig.allow_mabar && (
                    <div
                      onClick={() => setPackageType(groupPackageKey)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                        isGroupPackage
                          ? 'border-amber-500 bg-amber-50/20 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {isWebinar ? 'Promo Komunitas (10+1 Gratis)' : 'Promo Rombongan (5+1 Gratis)'}
                        </span>
                        <Users className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-800">
                        {formatRupiah(groupPrice)}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Hemat {formatRupiah(singlePrice)}! Bayar {groupPaidCount} tiket untuk total {groupTotalPax} peserta.
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* ── Voucher Rebate Input ── */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Kode Voucher Rebate Alumni (Opsional):
                </label>

                {appliedVoucher ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Voucher Aktif: {voucherInput}</p>
                        <p className="text-[11px] text-emerald-700">Potongan {formatRupiah(appliedVoucher.discount_applied)} — {appliedVoucher.message}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: REBATE100K-ALUMNI"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={voucherValidating}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                    >
                      {voucherValidating ? '...' : 'Terapkan'}
                    </button>
                  </div>
                )}

                {voucherError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {voucherError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBackToLanding}
                  className="px-4 py-3 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] cursor-pointer"
                >
                  <span>Lanjutkan Isi Data Peserta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: PARTICIPANT IDENTITY DETAILS ─────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="text-sm font-bold text-slate-900">Identitas Pendaftar Utama</h3>
              
              <div>
                <label className="text-slate-600 font-medium block mb-1">Nama Lengkap & Gelar (Untuk Sertifikat):</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso, S.Kom."
                  value={primaryData.nama}
                  onChange={(e) => setPrimaryData({ ...primaryData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Alamat Email Aktif:</label>
                  <input
                    type="email"
                    placeholder="nama@gmail.com"
                    value={primaryData.email}
                    onChange={(e) => setPrimaryData({ ...primaryData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Nomor WhatsApp Aktif:</label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={primaryData.whatsapp}
                    onChange={(e) => setPrimaryData({ ...primaryData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Instansi / Kampus / Perusahaan:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Universitas Sebelas Maret"
                    value={primaryData.instansi}
                    onChange={(e) => setPrimaryData({ ...primaryData, instansi: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Kota Domisili:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Surakarta"
                    value={primaryData.kota}
                    onChange={(e) => setPrimaryData({ ...primaryData, kota: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* If Group / MABAR, show dynamic members form */}
              {isGroupPackage && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 block">
                      Daftar {groupAdditionalCount} Anggota Tambahan (Total {groupTotalPax} Peserta):
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      Bonus 1 Gratis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pendaftar utama di atas dihitung sebagai Peserta #1. Mohon lengkapi data {groupAdditionalCount} peserta lainnya:
                  </p>
                  {mabarMembers.slice(0, groupAdditionalCount).map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="font-semibold text-slate-700 flex items-center justify-between text-[11px]">
                        <span>Anggota #{idx + 2}</span>
                        {idx === groupAdditionalCount - 1 && (
                          <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Tiket Bonus Gratis
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nama Lengkap Sesuai Sertifikat"
                          value={m.nama}
                          onChange={(e) => handleUpdateMember(idx, 'nama', e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-amber-500"
                        />
                        <input
                          type="tel"
                          placeholder="Nomor WhatsApp"
                          value={m.whatsapp}
                          onChange={(e) => handleUpdateMember(idx, 'whatsapp', e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    if (!primaryData.nama || !primaryData.email || !primaryData.whatsapp) {
                      alert('Mohon isi nama, email, dan WhatsApp Anda.');
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PAYMENT INSTRUCTIONS ─────────────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="text-sm font-bold text-slate-900">Instruksi Pembayaran Resmi</h3>

              {/* Total Due Card — with voucher breakdown if applicable */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                {appliedVoucher && packageType === 'INDIVIDU' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Harga Normal:</span>
                      <span className="font-mono text-slate-600 line-through">{formatRupiah(basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Voucher {appliedVoucher.code}:
                      </span>
                      <span className="font-mono font-bold text-emerald-700">- {formatRupiah(appliedVoucher.discount)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-amber-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Wajib Transfer:</span>
                      <div className="text-xl font-bold font-mono text-slate-950">{formatRupiah(priceAmount)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Total Tagihan:</span>
                      <div className="text-xl font-bold font-mono text-slate-950 mt-0.5">{formatRupiah(priceAmount)}</div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                      {isGroupPackage ? (isWebinar ? `Promo Komunitas (${groupTotalPax} Pax)` : `Promo Rombongan (${groupTotalPax} Pax)`) : 'Tiket Individu'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bank Transfer Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pilihan Rekening Transfer Resmi LPK Indonesia Dignity:
                </span>
                
                {webConfig.banks && webConfig.banks.length > 0 ? (
                  webConfig.banks.map((b, bIdx) => (
                    <div 
                      key={bIdx}
                      onClick={() => setPrimaryData(d => ({ ...d, bank: b.bank_name }))}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        primaryData.bank === b.bank_name 
                          ? 'border-amber-500 bg-white ring-2 ring-amber-500/20' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 block text-xs">{b.bank_name}</strong>
                          {primaryData.bank === b.bank_name && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Dipilih</span>
                          )}
                        </div>
                        <code className="text-sm font-mono font-bold text-amber-900 block mt-0.5">{b.account_number}</code>
                        <span className="text-[11px] text-slate-500 block">a.n. {b.account_holder}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(b.account_number);
                        }}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Salin nomor rekening"
                      >
                        {copiedAccount ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 block">Bank Mandiri</strong>
                      <code className="text-sm font-mono font-bold text-slate-800">138-00-2455891-2</code>
                      <span className="text-[11px] text-slate-500 block">a.n. LPK INDONESIA DIGNITY</span>
                    </div>
                    <button
                      onClick={() => handleCopyAccount('1380024558912')}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Kembali
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>Saya Sudah Transfer (Konfirmasi)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: CONFIRMATION & SUBMIT ─────────────────── */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Bukti Pembayaran</h3>
              
              {/* Pilihan Metode Lampiran: Upload Foto vs Google Drive Link */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setProofMethod('UPLOAD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    proofMethod === 'UPLOAD'
                      ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Upload Foto (Instan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProofMethod('GDRIVE')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    proofMethod === 'GDRIVE'
                      ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                  <span>Link Google Drive</span>
                </button>
              </div>

              {/* Box Input Berdasarkan Metode */}
              {proofMethod === 'GDRIVE' ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-left space-y-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tautan Google Drive Bukti Transfer</span>
                    </label>
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">Penting: Buka Izin Akses Berkas</p>
                        <p className="text-amber-800 mt-0.5">
                          Pastikan hak akses berkas di Google Drive telah disetel ke <strong>"Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view)</strong> agar admin finance dapat memverifikasi pembayaran Anda dalam &lt;15 detik.
                        </p>
                      </div>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    value={proofDriveUrl}
                    onChange={(e) => setProofDriveUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white text-slate-800"
                  />
                  {proofDriveUrl.trim() && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Tautan siap dilampirkan: {proofDriveUrl.trim()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  {proofPreview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white max-h-48 max-w-full">
                        <img
                          src={proofPreview}
                          alt="Bukti Transfer"
                          className="max-h-44 w-auto object-contain mx-auto"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-xs">
                          📎 {proofFile?.name || 'Bukti Transfer Terlampir'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProofFile(null);
                            setProofPreview(null);
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline ml-2"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-slate-400" />
                      <span className="font-bold text-slate-800 block">Upload Struk Transfer (Disarankan)</span>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Lampirkan tangkapan layar / foto bukti transfer bank Anda agar verifikasi tiket berlangsung otomatis.
                      </p>
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
                        className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                      />
                    </>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pendaftaran Anda dilindungi enkripsi aman dan nomor tiket akan segera diterbitkan.</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memproses Pendaftaran...' : 'Kirim Pendaftaran Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: SUCCESS RECEIPT ───────────────────────── */}
          {step === 5 && registeredResult && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Pendaftaran Berhasil Dikirim!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  {webConfig.success_message || "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."}
                </p>
              </div>

              {/* Duplicate Notice Banner if previously registered */}
              {registeredResult.isDuplicate && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-1 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Pendaftaran Sebelumnya Terdeteksi</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed">
                    {registeredResult.duplicateMessage || "Data nama/email/nomor WhatsApp Anda sudah pernah tercatat pada sistem kami untuk acara ini."}
                  </p>
                </div>
              )}

              {/* Official Ticket Box */}
              <div className="p-3.5 bg-white rounded-2xl border-2 border-amber-400/80 shadow-xs flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider block">Nomor E-Ticket Resmi:</span>
                  <strong className="font-mono text-base text-slate-950 font-bold tracking-tight">
                    {registeredResult.nomorTicket || registeredResult.id}
                  </strong>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              {/* Receipt Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Nama Peserta:</span>
                  <strong className="text-slate-900">{registeredResult.nama}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Acara:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[200px]">{eventTitle}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Paket:</span>
                  <span className="text-slate-800 font-medium">{registeredResult.kategori}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status Pembayaran:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    registeredResult.statusBayar === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {registeredResult.statusBayar === 'VERIFIED' ? 'Terverifikasi (Lunas)' : 'Menunggu Verifikasi Admin'}
                  </span>
                </div>
              </div>

              {/* Notice Langkah Selanjutnya: Jika Menunggu Verifikasi */}
              {registeredResult.statusBayar !== 'VERIFIED' ? (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-left space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Langkah Selanjutnya: Menunggu Verifikasi Panitia</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    Bukti transfer Anda telah tersimpan di sistem. Panitia akan memvalidasi pembayaran Anda.
                    <br />
                    Setelah diverifikasi, <strong>Tautan WhatsApp Group Resmi Peserta</strong> & <strong>E-Ticket</strong> akan dikirimkan otomatis ke alamat email Anda: <strong className="text-slate-800">{registeredResult.email}</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-left space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pembayaran Terverifikasi Lunas!</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px]">
                    Silakan langsung bergabung ke WhatsApp Group resmi peserta untuk mengakses link Zoom & materi pelatihan.
                  </p>
                </div>
              )}

              <div className="pt-2 space-y-2">
                {/* HANYA tampilkan Tautan Grup WhatsApp jika sudah VERIFIED/LUNAS */}
                {registeredResult.statusBayar === 'VERIFIED' && webConfig.wa_group_url && (
                  <a
                    href={webConfig.wa_group_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>Gabung WhatsApp Group Resmi Peserta</span>
                    <ArrowRight className="w-4 h-4" />
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
                    className="w-full py-3.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Konfirmasi Pembayaran ke WA Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
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
