import { useState, useEffect, useRef } from 'react';
import { formatRupiah } from '../../../utils/formatters';
import { normalizeCertificateName, normalizeEmail, normalizeWhatsApp, isValidUuid } from '../../../utils/normalizers';
import { registrationService, voucherService } from '../../../services/registrationService';
import { supabase } from '../../../lib/supabaseClient';
import { DEFAULT_WEB_REGISTRATION_CONFIG } from '../../../context/EventContext';

/**
 * Custom Hook: useRegistrationWizard
 * Mengelola seluruh state bisnis, validasi multi-step, integrasi Supabase SSOT,
 * kupon voucher rebate, dan pencegahan duplikasi pendaftaran publik.
 */
export function useRegistrationWizard({ activeEvent = null }) {
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

  // Dynamic Event Type & Group (Mabar) Package Rules
  const isWebinar = currentEvent?.event_type === 'WEBINAR' || 
    (!currentEvent?.event_type && (currentEvent?.title?.toLowerCase().includes('webinar') || currentEvent?.slug?.includes('msc')));

  const groupPaidCount = isWebinar ? 10 : 5;
  const groupBonusCount = 1;
  const groupTotalPax = groupPaidCount + groupBonusCount;
  const groupAdditionalCount = groupTotalPax - 1;
  const groupPackageKey = isWebinar ? 'MABAR_11' : 'MABAR_6';

  const [packageType, setPackageType] = useState('INDIVIDU');

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

  // Dynamic MABAR Additional Members
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

  // Mode Pengisian Anggota Rombongan: 'NOW' | 'LATER'
  const [groupFillMode, setGroupFillMode] = useState('NOW');

  // ── Voucher Rebate State ──────────────────────────────
  const [voucherInput, setVoucherInput]     = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
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
      const baseForPreview = currentEvent?.promo_price || currentEvent?.base_price || 0;
      voucherService.validateVoucher(code, currentEvent.id, baseForPreview)
        .then(result => {
          if (result?.valid) setAppliedVoucher(result);
          else setVoucherError(result?.message || 'Kode voucher tidak valid.');
        })
        .catch(() => {});
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

  const [proofMethod, setProofMethod] = useState('UPLOAD');
  const [proofDriveUrl, setProofDriveUrl] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredResult, setRegisteredResult] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Duplicate Registration Alert Dialog State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [isCheckingStep2, setIsCheckingStep2] = useState(false);

  // Helper sanitasi teks publik agar istilah internal panitia tidak bocor ke peserta
  const sanitizePublicMessage = (msg) => {
    if (!msg) return 'Data nama, email, atau nomor WhatsApp Anda sudah pernah tercatat pada sistem kami untuk acara ini.';
    return msg
      .replace(/dari tempat sampah/gi, 'dalam sistem')
      .replace(/tempat sampah/gi, 'arsip sistem')
      .replace(/dipulihkan/gi, 'diperbarui');
  };

  const handleProceedDuplicateReceipt = () => {
    if (duplicateModalData) {
      setRegisteredResult(duplicateModalData);
      setStep(5);
    }
    setDuplicateModalOpen(false);
  };

  const handleProceedToUpdateProof = () => {
    if (duplicateModalData) {
      setRegisteredResult(duplicateModalData);
      setStep(4);
    }
    setDuplicateModalOpen(false);
  };

  // ── Derived Values ──────────────────────────────
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

  // ── [EARLY WARNING DI LANGKAH 02 - 100% DATABASE DRIVEN] ──────
  const handleProceedFromStep2 = async () => {
    // 1. Validasi Nama Lengkap
    const cleanName = normalizeCertificateName(primaryData.nama);
    if (!cleanName || cleanName.length < 3) {
      alert('Mohon masukkan Nama Lengkap Anda dengan benar (minimal 3 karakter).');
      return;
    }

    // 2. Validasi Nomor WhatsApp
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

    // 4. Validasi Instansi jika diwajibkan
    if (webConfig.form_fields?.institution_required && !primaryData.instansi?.trim()) {
      alert('Mohon isi nama Instansi / Perusahaan Anda.');
      return;
    }

    // 5. Validasi khusus Promo Rombongan (Mode Isi Sekarang)
    if (isGroupPackage && groupFillMode === 'NOW') {
      const activeMembers = mabarMembers.slice(0, groupAdditionalCount);

      for (let i = 0; i < activeMembers.length; i++) {
        const m = activeMembers[i];
        const memberPhone = normalizeWhatsApp(m.whatsapp);
        const memberEmail = normalizeEmail(m.email);

        if (memberPhone && cleanWa && memberPhone === cleanWa) {
          alert(`Nomor WhatsApp Anggota #${i+2} sama dengan nomor Anda (Pendaftar Utama). Anda sudah otomatis terdaftar sebagai Peserta #1. Mohon masukkan nomor rekan anggota Anda.`);
          return;
        }
        if (memberEmail && cleanEmail && memberEmail === cleanEmail) {
          alert(`Alamat Email Anggota #${i+2} sama dengan email Anda (Pendaftar Utama). Anda sudah otomatis terdaftar sebagai Peserta #1. Mohon masukkan email rekan anggota Anda.`);
          return;
        }
      }

      const seenPhones = new Set();
      const seenEmails = new Set();
      for (let i = 0; i < activeMembers.length; i++) {
        const m = activeMembers[i];
        const memberPhone = normalizeWhatsApp(m.whatsapp);
        const memberEmail = normalizeEmail(m.email);

        if (memberPhone) {
          if (seenPhones.has(memberPhone)) {
            alert(`Terdapat duplikasi nomor WhatsApp pada daftar anggota rombongan Anda (Anggota #${i+2}). Mohon pastikan setiap anggota memiliki nomor yang unik.`);
            return;
          }
          seenPhones.add(memberPhone);
        }

        if (memberEmail) {
          if (seenEmails.has(memberEmail)) {
            alert(`Terdapat duplikasi alamat email pada daftar anggota rombongan Anda (Anggota #${i+2}). Mohon pastikan setiap anggota memiliki email yang unik.`);
            return;
          }
          seenEmails.add(memberEmail);
        }
      }
    }

    // 6. [100% SSOT DATABASE CHECK] Pemeriksaan Database Supabase Real-Time
    setIsCheckingStep2(true);
    try {
      if (currentEvent?.id) {
        const orFilter = [
          cleanEmail ? `email_normalized.eq.${cleanEmail.toLowerCase()}` : null,
          cleanWa ? `whatsapp_normalized.eq.${cleanWa.replace(/[^0-9]/g, '')}` : null
        ].filter(Boolean).join(',');

        const { data: matchedPersons } = await supabase
          .from('persons')
          .select('id, full_name, email, whatsapp')
          .or(orFilter);

        if (matchedPersons && matchedPersons.length > 0) {
          const personIds = matchedPersons.map(p => p.id);

          const { data: activeRegs } = await supabase
            .from('registrations')
            .select('id, event_id, person_id, package_type, is_mabar, total_due, gross_amount, net_amount, status, custom_notes')
            .eq('event_id', currentEvent.id)
            .in('person_id', personIds)
            .neq('status', 'CANCELLED')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          let existingReg = activeRegs?.[0];
          let isGroupMemberOfOther = false;
          let leaderInfo = null;

          if (!existingReg) {
            const { data: memberRows } = await supabase
              .from('registration_members')
              .select(`
                id,
                ticket_suffix,
                member_role,
                registrations!inner (
                  id,
                  event_id,
                  package_type,
                  total_due,
                  gross_amount,
                  net_amount,
                  status,
                  deleted_at,
                  persons ( full_name, whatsapp )
                )
              `)
              .in('person_id', personIds)
              .is('registrations.deleted_at', null)
              .neq('registrations.status', 'CANCELLED');

            const matchedMember = memberRows?.find(m => m.registrations?.event_id === currentEvent.id);
            if (matchedMember) {
              isGroupMemberOfOther = true;
              existingReg = matchedMember.registrations;
              leaderInfo = matchedMember.registrations?.persons;
            }
          }

          if (existingReg) {
            const { data: ticketRow } = await supabase
              .from('tickets')
              .select('ticket_code, status')
              .eq('registration_id', existingReg.id)
              .order('issued_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const realTicket = ticketRow?.ticket_code || `TICKET-DIGNITY-${existingReg.id.slice(0, 6).toUpperCase()}`;
            const realStatus = existingReg.status === 'PAID' || existingReg.status === 'CONFIRMED' || existingReg.status === 'ATTENDED'
              ? 'VERIFIED'
              : 'PENDING';

            const realNominal = Number(existingReg.total_due ?? existingReg.net_amount ?? existingReg.gross_amount ?? 100000);
            const realPkg = existingReg.package_type || 'INDIVIDU';

            let realKategori = `Tiket Individu : ${formatRupiah(realNominal)}`;
            if (realPkg === 'MABAR_11' || realPkg === 'GROUP_11') {
              realKategori = `Promo Komunitas (11 Orang • 10+1) : ${formatRupiah(realNominal)}`;
            } else if (realPkg === 'MABAR_6' || realPkg === 'GROUP') {
              realKategori = `Promo Mabar (6 Orang • 5+1) : ${formatRupiah(realNominal)}`;
            } else if (realPkg !== 'INDIVIDU') {
              realKategori = `${realPkg} : ${formatRupiah(realNominal)}`;
            }

            const duplicatePayload = {
              id: existingReg.id,
              nama: cleanName || matchedPersons[0]?.full_name,
              email: cleanEmail || matchedPersons[0]?.email,
              whatsapp: cleanWa || matchedPersons[0]?.whatsapp,
              instansi: primaryData.instansi || 'Peserta Mandiri',
              kota: primaryData.kota || 'Surakarta',
              kategori: realKategori,
              packageType: realPkg,
              nominal: realNominal,
              bank: primaryData.bank,
              buktiUrl: '',
              rawBukti: '',
              statusBayar: realStatus,
              statusEmailTicket: realStatus === 'VERIFIED' ? 'TERKIRIM' : 'BELUM',
              nomorTicket: realTicket,
              timestamp: new Date().toISOString(),
              isDuplicate: true,
              isGroupMember: isGroupMemberOfOther,
              leaderName: leaderInfo?.full_name || null,
              leaderWhatsapp: leaderInfo?.whatsapp || null,
              parentPackage: isGroupMemberOfOther ? realKategori : null,
              duplicateMessage: isGroupMemberOfOther
                ? `Anda sudah didaftarkan oleh ${leaderInfo?.full_name || 'Koordinator'} pada paket ${realKategori}.`
                : 'Data pendaftaran Anda sudah pernah tercatat pada sistem kami untuk acara ini dan sedang menunggu verifikasi pembayaran oleh panitia.'
            };

            setDuplicateModalData(duplicatePayload);
            setDuplicateModalOpen(true);
            setIsCheckingStep2(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Notice check existing on Step 2 exception:', err);
    } finally {
      setIsCheckingStep2(false);
    }

    setStep(3);
  };

  // ── SUBMIT REGISTRATION ──────────────────────────────
  const handleSubmitRegistration = async () => {
    if (!webConfig.is_open) {
      alert(webConfig.close_message || 'Pendaftaran untuk acara ini saat ini telah ditutup.');
      return;
    }

    const cleanName = normalizeCertificateName(primaryData.nama);
    if (!cleanName || cleanName.length < 3) {
      alert('Mohon masukkan Nama Lengkap Anda dengan benar (minimal 3 karakter).');
      return;
    }

    const cleanWa = normalizeWhatsApp(primaryData.whatsapp);
    if (!cleanWa || cleanWa.length < 10 || cleanWa.length > 15) {
      alert('Nomor WhatsApp tidak valid. Masukkan nomor aktif Anda (contoh: 08123456789 atau 628123456789).');
      return;
    }

    const cleanEmail = normalizeEmail(primaryData.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      alert('Format alamat email tidak valid. Masukkan alamat email aktif Anda.');
      return;
    }

    if (webConfig.form_fields?.institution_required && !primaryData.instansi?.trim()) {
      alert('Mohon isi nama Instansi / Perusahaan Anda.');
      return;
    }

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

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const regId = `REG-${Date.now().toString().slice(-6)}`;
      const defaultTicketNo = `TICKET-DIGNITY-${Math.floor(100 + Math.random() * 900)}`;

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
        groupFillMode,
        mabarNotes: isGroupPackage 
          ? (groupFillMode === 'LATER'
              ? '[DATA ANGGOTA MENYUSUL VIA WA/PANITIA]'
              : mabarMembers.slice(0, groupAdditionalCount).filter(m => m.nama.trim()).map((m, i) => `${i+1}. ${m.nama} (${m.whatsapp}${m.email ? ' • ' + m.email : ''})`).join(', ') || '[DATA ANGGOTA MENYUSUL VIA WA/PANITIA]')
          : '',
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: voucherDiscount || 0
      };

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
            mabarMembers: (isGroupPackage && groupFillMode === 'NOW')
              ? mabarMembers.slice(0, groupAdditionalCount).filter(m => m.nama.trim())
              : [],
            voucherCode: appliedVoucher?.valid ? voucherInput : null
          });

          if (rpcRes && rpcRes.success === false) {
            alert(rpcRes.message || 'Pendaftaran tidak dapat diproses saat ini.');
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
          }

          if (rpcRes?.is_duplicate) {
            newRegistration.isDuplicate = true;
            newRegistration.isGroupMember = Boolean(rpcRes.is_group_member);
            newRegistration.leaderName = rpcRes.leader_name || null;
            newRegistration.leaderWhatsapp = rpcRes.leader_whatsapp || null;
            newRegistration.parentPackage = rpcRes.parent_package || null;
            newRegistration.duplicateMessage = sanitizePublicMessage(rpcRes.message);

            let dbReg = null;
            let dbTicket = null;

            if (rpcRes.registration_id) {
              try {
                const { data: regRow } = await supabase
                  .from('registrations')
                  .select('id, package_type, is_mabar, total_due, gross_amount, net_amount, status, custom_notes')
                  .eq('id', rpcRes.registration_id)
                  .maybeSingle();

                dbReg = regRow;

                const { data: ticketRow } = await supabase
                  .from('tickets')
                  .select('ticket_code, status')
                  .eq('registration_id', rpcRes.registration_id)
                  .order('issued_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                dbTicket = ticketRow;
              } catch (dbFetchErr) {
                console.warn('Notice fetch real registration from DB:', dbFetchErr);
              }
            }

            const realTicket = dbTicket?.ticket_code || rpcRes.ticket_number;
            if (realTicket) {
              newRegistration.nomorTicket = realTicket;
            }

            const realStatus = dbReg?.status || rpcRes.status;
            if (realStatus === 'PAID' || realStatus === 'CONFIRMED' || realStatus === 'ATTENDED') {
              newRegistration.statusBayar = 'VERIFIED';
            } else {
              newRegistration.statusBayar = 'PENDING';
            }

            const realPkg = dbReg?.package_type || rpcRes.package_type;
            const realNominal = dbReg?.total_due ?? dbReg?.net_amount ?? dbReg?.gross_amount ?? rpcRes.total_due;

            if (realPkg) {
              newRegistration.packageType = realPkg;
            }
            if (realNominal !== undefined && realNominal !== null) {
              newRegistration.nominal = Number(realNominal);
            }

            const nominalFormatted = formatRupiah(newRegistration.nominal || 0);
            if (newRegistration.packageType === 'MABAR_11' || newRegistration.packageType === 'GROUP_11') {
              newRegistration.kategori = `Promo Komunitas (11 Orang • 10+1) : ${nominalFormatted}`;
            } else if (newRegistration.packageType === 'MABAR_6' || newRegistration.packageType === 'GROUP') {
              newRegistration.kategori = `Promo Mabar (6 Orang • 5+1) : ${nominalFormatted}`;
            } else if (newRegistration.packageType === 'INDIVIDU') {
              newRegistration.kategori = `Tiket Individu : ${nominalFormatted}`;
            } else {
              newRegistration.kategori = `${newRegistration.packageType || 'Paket Acara'} : ${nominalFormatted}`;
            }

            setDuplicateModalData(newRegistration);
            setDuplicateModalOpen(true);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
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
            newRegistration.duplicateMessage = 'Nomor WhatsApp atau email Anda sudah pernah tercatat pada sistem kami untuk acara ini. Data pendaftaran Anda aman dan sedang menunggu verifikasi oleh panitia.';

            try {
              const { data: personMatch } = await supabase
                .from('persons')
                .select('id')
                .or(`email_normalized.eq.${cleanEmail.toLowerCase()},whatsapp_normalized.eq.${cleanWa.replace(/[^0-9]/g, '')}`)
                .maybeSingle();

              if (personMatch?.id && currentEvent?.id) {
                const { data: activeReg } = await supabase
                  .from('registrations')
                  .select('id, package_type, total_due, gross_amount, net_amount, status')
                  .eq('event_id', currentEvent.id)
                  .eq('person_id', personMatch.id)
                  .is('deleted_at', null)
                  .maybeSingle();

                if (activeReg) {
                  const { data: ticketRow } = await supabase
                    .from('tickets')
                    .select('ticket_code')
                    .eq('registration_id', activeReg.id)
                    .maybeSingle();

                  if (ticketRow?.ticket_code) newRegistration.nomorTicket = ticketRow.ticket_code;
                  newRegistration.packageType = activeReg.package_type;
                  newRegistration.nominal = Number(activeReg.total_due ?? activeReg.net_amount ?? activeReg.gross_amount);
                  if (activeReg.status === 'CONFIRMED' || activeReg.status === 'PAID') {
                    newRegistration.statusBayar = 'VERIFIED';
                  }
                  const nomStr = formatRupiah(newRegistration.nominal || 0);
                  if (activeReg.package_type === 'MABAR_11' || activeReg.package_type === 'GROUP_11') {
                    newRegistration.kategori = `Promo Komunitas (11 Orang • 10+1) : ${nomStr}`;
                  } else if (activeReg.package_type === 'MABAR_6' || activeReg.package_type === 'GROUP') {
                    newRegistration.kategori = `Promo Mabar (6 Orang • 5+1) : ${nomStr}`;
                  } else {
                    newRegistration.kategori = `Tiket Individu : ${nomStr}`;
                  }
                }
              }
            } catch (queryErr) {
              console.warn('Notice fallback query existing registration:', queryErr);
            }

            setDuplicateModalData(newRegistration);
            setDuplicateModalOpen(true);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
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
      setStep(5);
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

  return {
    // Event & config
    currentEvent,
    webConfig,
    isRegistrationOpen,
    isLoadingEvent,
    eventNotFound,
    eventTitle,
    eventDate,
    eventVenue,
    eventTime,

    // Step state
    step,
    setStep,

    // Package & pricing
    packageType,
    setPackageType,
    isWebinar,
    isGroupPackage,
    groupPackageKey,
    groupPaidCount,
    groupBonusCount,
    groupTotalPax,
    groupAdditionalCount,
    singlePrice,
    groupPrice,
    basePrice,
    voucherDiscount,
    priceAmount,

    // Registrant data
    primaryData,
    setPrimaryData,
    mabarMembers,
    setMabarMembers,
    groupFillMode,
    setGroupFillMode,
    handleUpdateMember,

    // Voucher
    voucherInput,
    setVoucherInput,
    appliedVoucher,
    voucherError,
    voucherValidating,
    handleApplyVoucher,
    handleRemoveVoucher,

    // Proof & submit
    proofMethod,
    setProofMethod,
    proofDriveUrl,
    setProofDriveUrl,
    proofFile,
    setProofFile,
    proofPreview,
    setProofPreview,
    isSubmitting,
    registeredResult,
    copiedAccount,
    handleCopyAccount,
    handleProceedFromStep2,
    isCheckingStep2,
    handleSubmitRegistration,

    // Duplicate detection modal
    duplicateModalOpen,
    setDuplicateModalOpen,
    duplicateModalData,
    handleProceedDuplicateReceipt,
    handleProceedToUpdateProof,
    sanitizePublicMessage,

    // Navigation
    handleBackToLanding,
  };
}
