import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { registrationService } from '../../services/registrationService';
import { formatRupiah } from '../../utils/formatters';
import { normalizeEmail, normalizeWhatsApp } from '../../utils/normalizers';

// Subkomponen Modular
import TicketSearchHero from './components/TicketSearchHero';
import UnfilledGroupAlertBanner from './components/UnfilledGroupAlertBanner';
import PendingTicketCard from './components/PendingTicketCard';
import VerifiedTicketCard from './components/VerifiedTicketCard';
import GroupRosterMatrix from './components/GroupRosterMatrix';
import LeaderAuthModal from './components/LeaderAuthModal';

/**
 * PublicTicketCheckPage
 * Controller utama halaman publik pengecekan tiket & manajemen mandiri rombongan.
 * Modular, terisolasi, bebas hardcoding, dan 100% SSOT database.
 */
export default function PublicTicketCheckPage({ onBackToHome }) {
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Group Self-Service Roster State
  const [groupRoster, setGroupRoster] = useState(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null); // suffix or 'ALL'
  const [rosterError, setRosterError] = useState('');
  const [rosterSuccess, setRosterSuccess] = useState('');
  const [editingSlots, setEditingSlots] = useState({});
  const [memberInputs, setMemberInputs] = useState({});
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Leader Authorization Guard State ("Yang bisa isi ketuanya aja")
  const [isLeaderVerified, setIsLeaderVerified] = useState(false);
  const [authCredential, setAuthCredential] = useState('');
  const [showLeaderAuthModal, setShowLeaderAuthModal] = useState(false);
  const [leaderAuthInput, setLeaderAuthInput] = useState('');
  const [leaderAuthError, setLeaderAuthError] = useState('');

  // Re-upload Bukti Pembayaran State (jika pending)
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [proofMethod, setProofMethod] = useState('UPLOAD'); // UPLOAD | GDRIVE
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofDriveUrl, setProofDriveUrl] = useState('');
  const [isUpdatingProof, setIsUpdatingProof] = useState(false);
  const [updateProofSuccess, setUpdateProofSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-Search jika ada parameter URL: #/cek-tiket?code=TICKET-DIGNITY-880 atau ?q=...
  useEffect(() => {
    const parseAndSearch = () => {
      const rawHash = window.location.hash || '';
      const queryPart = rawHash.includes('?') ? rawHash.split('?')[1] : window.location.search.slice(1);
      const params = new URLSearchParams(queryPart);
      const codeParam = params.get('code') || params.get('q') || params.get('ticket');

      if (codeParam) {
        const cleanParam = codeParam.trim();
        setQueryInput(cleanParam);
        handleSearchTicket(cleanParam);
      }
    };

    parseAndSearch();
    window.addEventListener('hashchange', parseAndSearch);
    return () => window.removeEventListener('hashchange', parseAndSearch);
  }, []);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleScrollToRoster = () => {
    const el = document.getElementById('tabel-anggota-rombongan');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // ── GROUP SELF-SERVICE ROSTER HANDLERS ──────────────────────────────────────
  const fetchGroupRoster = async (queryTerm, originalSearchTerm) => {
    if (!queryTerm) return;
    setIsLoadingRoster(true);
    setRosterError('');
    try {
      const res = await registrationService.getGroupRegistrationDetails(queryTerm);
      if (res && res.found) {
        setGroupRoster(res);

        // Auto-detect apakah pencarian dilakukan menggunakan email/WhatsApp resmi Ketua Rombongan
        const cleanTerm = (queryTerm || '').trim().toLowerCase();
        const cleanTermPhone = normalizeWhatsApp(cleanTerm);
        const cleanOriginal = (originalSearchTerm || queryInput || '').trim().toLowerCase();
        const cleanOriginalPhone = normalizeWhatsApp(cleanOriginal);
        const leaderEmail = (res.leader?.email || '').trim().toLowerCase();
        const leaderPhone = normalizeWhatsApp(res.leader?.whatsapp || '');

        const isLeader = Boolean(
          res.auth_is_leader ||
          (leaderEmail && (cleanTerm === leaderEmail || cleanOriginal === leaderEmail)) ||
          (leaderPhone && ((cleanTermPhone && cleanTermPhone === leaderPhone) || (cleanOriginalPhone && cleanOriginalPhone === leaderPhone)))
        );

        if (isLeader) {
          setIsLeaderVerified(true);
          setAuthCredential(leaderEmail || cleanOriginal || cleanTerm);
        }

        const initialInputs = {};
        (res.slots || []).forEach(slot => {
          if (slot.suffix !== 'A') {
            initialInputs[slot.suffix] = {
              nama: slot.full_name || '',
              email: slot.email || '',
              whatsapp: slot.whatsapp || ''
            };
          }
        });
        setMemberInputs(initialInputs);
      }
    } catch (err) {
      console.warn('Gagal memuat status rombongan:', err);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleVerifyLeaderAuth = (e) => {
    if (e) e.preventDefault();
    const cleanInput = (leaderAuthInput || '').trim().toLowerCase();
    const cleanPhone = normalizeWhatsApp(cleanInput);
    const leaderEmail = (activeRoster?.leader?.email || groupRoster?.leader?.email || ticketResult?.email || '').trim().toLowerCase();
    const leaderPhone = normalizeWhatsApp(activeRoster?.leader?.whatsapp || groupRoster?.leader?.whatsapp || ticketResult?.whatsapp || '');

    if (!cleanInput) {
      setLeaderAuthError('Mohon masukkan alamat email atau nomor WhatsApp Ketua Rombongan.');
      return;
    }

    if (cleanInput === leaderEmail || (cleanPhone && cleanPhone === leaderPhone)) {
      setIsLeaderVerified(true);
      setAuthCredential(cleanInput);
      setShowLeaderAuthModal(false);
      setLeaderAuthError('');
      setRosterSuccess('✓ Otorisasi Berhasil! Anda memiliki hak akses penuh sebagai Ketua Rombongan untuk mengisi dan memperbarui data anggota.');
    } else {
      setLeaderAuthError('Kredensial tidak cocok. Masukkan email resmi Ketua atau nomor WhatsApp yang didaftarkan saat pembelian.');
    }
  };

  const handleToggleEditSlot = (suffix, isEditing) => {
    setEditingSlots(prev => ({
      ...prev,
      [suffix]: isEditing
    }));

    // Jika membatalkan edit pada slot yang sudah ada di database, kembalikan input ke nilai tersimpan
    if (!isEditing) {
      const existingSlot = (activeRoster?.slots || groupRoster?.slots || []).find(s => s.suffix === suffix);
      if (existingSlot) {
        setMemberInputs(prev => ({
          ...prev,
          [suffix]: {
            nama: existingSlot.full_name || '',
            email: existingSlot.email || '',
            whatsapp: existingSlot.whatsapp || ''
          }
        }));
      }
    }
  };

  const handleMemberInputChange = (suffix, field, value) => {
    setMemberInputs(prev => ({
      ...prev,
      [suffix]: {
        ...(prev[suffix] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveSingleSlot = async (suffix) => {
    if (!isLeaderVerified) {
      setShowLeaderAuthModal(true);
      setLeaderAuthError('Akses Dibatasi: Hanya Ketua Rombongan yang berhak mengisi atau menyimpan data anggota rombongan.');
      return;
    }

    const slotData = memberInputs[suffix];
    if (!slotData?.nama || slotData.nama.trim().length < 2) {
      setRosterError(`Mohon masukkan Nama Lengkap yang valid untuk Slot ${suffix}.`);
      return;
    }

    setSavingSlot(suffix);
    setRosterError('');
    setRosterSuccess('');

    try {
      const payload = [{
        suffix,
        nama: slotData.nama.trim(),
        email: (slotData.email || '').trim(),
        whatsapp: (slotData.whatsapp || '').trim()
      }];

      const targetRegId = ticketResult?.registrationId || activeRoster?.registration_id || groupRoster?.registration_id;
      const res = await registrationService.submitGroupMembers(targetRegId, payload, 'SELF_SERVICE', authCredential);

      if (res && res.success) {
        setRosterSuccess(`✓ Data Slot ${suffix} berhasil disimpan! E-Tiket resmi (${res.base_ticket_code}-${suffix}) otomatis diterbitkan.`);
        setEditingSlots(prev => ({ ...prev, [suffix]: false }));
        await fetchGroupRoster(ticketResult?.ticketCode || activeRoster?.base_ticket_code || groupRoster?.base_ticket_code);
      } else {
        setRosterError(res?.message || `Gagal menyimpan data Slot ${suffix}.`);
      }
    } catch (err) {
      console.error(`Error saving slot ${suffix}:`, err);
      setRosterError(err.message || `Terjadi kesalahan saat menyimpan Slot ${suffix}.`);
    } finally {
      setSavingSlot(null);
    }
  };

  const handleSaveAllSlots = async () => {
    if (!isLeaderVerified) {
      setShowLeaderAuthModal(true);
      setLeaderAuthError('Akses Dibatasi: Hanya Ketua Rombongan yang berhak mengisi atau menyimpan data anggota rombongan.');
      return;
    }

    const slotsList = activeRoster?.slots || groupRoster?.slots;
    if (!slotsList) return;

    const payload = [];
    slotsList.forEach(slot => {
      if (slot.suffix !== 'A') {
        const inp = memberInputs[slot.suffix];
        if (inp?.nama && inp.nama.trim().length >= 2) {
          payload.push({
            suffix: slot.suffix,
            nama: inp.nama.trim(),
            email: (inp.email || '').trim(),
            whatsapp: (inp.whatsapp || '').trim()
          });
        }
      }
    });

    if (payload.length === 0) {
      setRosterError('Mohon isi minimal satu nama anggota untuk disimpan.');
      return;
    }

    setSavingSlot('ALL');
    setRosterError('');
    setRosterSuccess('');

    try {
      const targetRegId = ticketResult?.registrationId || activeRoster?.registration_id || groupRoster?.registration_id;
      const res = await registrationService.submitGroupMembers(targetRegId, payload, 'SELF_SERVICE', authCredential);

      if (res && res.success) {
        setRosterSuccess(`✓ Berhasil menyimpan ${res.processed_count} slot anggota rombongan! Seluruh e-tiket aktif.`);
        setEditingSlots({});
        await fetchGroupRoster(ticketResult?.ticketCode || activeRoster?.base_ticket_code || groupRoster?.base_ticket_code);
      } else {
        setRosterError(res?.message || 'Gagal menyimpan data anggota rombongan.');
      }
    } catch (err) {
      console.error('Error saving all slots:', err);
      setRosterError(err.message || 'Terjadi kesalahan saat menyimpan seluruh slot.');
    } finally {
      setSavingSlot(null);
    }
  };

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
    const code = ticketResult?.ticketCode || activeRoster?.base_ticket_code || groupRoster?.base_ticket_code;
    const shareUrl = `${origin}/#/cek-tiket?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleSearchTicket = async (overrideTerm) => {
    const term = (overrideTerm !== undefined ? overrideTerm : queryInput).trim();
    if (!term) {
      setSearchError('Mohon masukkan Nomor Tiket, Kode Registrasi, Email, atau Nomor WhatsApp Anda.');
      return;
    }

    setIsLoading(true);
    setSearched(true);
    setSearchError('');
    setTicketResult(null);
    setGroupRoster(null);
    setIsLeaderVerified(false);
    setAuthCredential('');
    setLeaderAuthInput('');
    setLeaderAuthError('');
    setShowLeaderAuthModal(false);
    setRosterError('');
    setRosterSuccess('');
    setShowProofUpload(false);
    setUpdateProofSuccess(false);

    try {
      const cleanWa = normalizeWhatsApp(term);
      const cleanEmail = normalizeEmail(term);
      const cleanTicketCode = term.toUpperCase().replace(/\s+/g, '');

      // ── METODE 1: RPC check_public_ticket_status ───────────────────────────
      try {
        const { data: rpcRes, error: rpcErr } = await supabase
          .rpc('check_public_ticket_status', { p_query: term });

        if (!rpcErr && rpcRes && rpcRes.found) {
          const nominalDue = Number(rpcRes.total_due ?? rpcRes.net_amount ?? rpcRes.gross_amount ?? 100000);
          const pkg = rpcRes.package_type || 'INDIVIDU';

          let kategoriLabel = `Tiket Individu : ${formatRupiah(nominalDue)}`;
          if (pkg === 'MABAR_11' || pkg === 'GROUP_11') {
            kategoriLabel = `Promo Komunitas (11 Orang • 10+1) : ${formatRupiah(nominalDue)}`;
          } else if (pkg === 'MABAR_6' || pkg === 'GROUP') {
            kategoriLabel = `Promo Mabar (6 Orang • 5+1) : ${formatRupiah(nominalDue)}`;
          } else if (pkg !== 'INDIVIDU') {
            kategoriLabel = `${pkg} : ${formatRupiah(nominalDue)}`;
          }

          const isVerified = rpcRes.is_ticket_active;

          setTicketResult({
            registrationId: rpcRes.registration_id,
            ticketCode: rpcRes.ticket_code,
            isTicketActive: isVerified,
            status: isVerified ? 'VERIFIED' : 'PENDING',
            statusLabel: isVerified ? 'Terverifikasi & Aktif' : 'Menunggu Verifikasi Admin',
            fullName: rpcRes.full_name || 'Peserta Terdaftar',
            email: rpcRes.email || '-',
            whatsapp: rpcRes.whatsapp || '-',
            institution: rpcRes.institution || '-',
            city: rpcRes.city || '-',
            packageType: pkg,
            kategori: kategoriLabel,
            nominal: nominalDue,
            eventTitle: rpcRes.event_title || 'Pelatihan Publik Speaking Dignity',
            eventDate: rpcRes.event_date_start
              ? new Date(rpcRes.event_date_start).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Jakarta'
                })
              : 'Segera Diumumkan',
            eventVenue: rpcRes.event_venue || 'Zoom Cloud Meeting (Online)',
            waGroupUrl: rpcRes.wa_group_url || '',
            zoomUrl: rpcRes.meeting_url || '',
            isGroupMember: rpcRes.is_group_member,
            leaderName: rpcRes.leader_name || null,
            leaderWhatsapp: rpcRes.leader_whatsapp || null,
            customNotes: rpcRes.custom_notes || '',
            proofImageUrl: rpcRes.proof_image_url || null,
            proofDriveFileId: rpcRes.proof_drive_file_id || null
          });

          // Muat data rombongan jika terdeteksi paket grup
          const isGroup =
            pkg === 'KOMUNITAS_11' ||
            pkg === 'MABAR_11' ||
            pkg === 'GROUP_11' ||
            pkg === 'MABAR_6' ||
            pkg === 'GROUP' ||
            nominalDue >= 450000 ||
            kategoriLabel.toLowerCase().includes('komunitas') ||
            kategoriLabel.toLowerCase().includes('mabar');

          if (isGroup) {
            await fetchGroupRoster(rpcRes.ticket_code || rpcRes.registration_id || term, term);
          }
          return;
        }
      } catch (rpcEx) {
        console.warn('RPC check_public_ticket_status belum tersedia, beralih ke View...', rpcEx);
      }

      // ── METODE 2: QUERY VIEW v_public_ticket_status ──────────────────────────────
      try {
        let viewQuery = supabase.from('v_public_ticket_status').select('*');
        const orConditions = [];

        if (cleanTicketCode) orConditions.push(`ticket_code.ilike.%${cleanTicketCode}%`);
        if (cleanEmail) orConditions.push(`email_normalized.eq.${cleanEmail}`);
        if (cleanWa) orConditions.push(`whatsapp_normalized.eq.${cleanWa}`);
        orConditions.push(`registration_id.ilike.%${term.trim()}%`);

        if (orConditions.length > 0) {
          viewQuery = viewQuery.or(orConditions.join(','));
        }

        const { data: viewRow, error: viewErr } = await viewQuery
          .order('is_ticket_active', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!viewErr && viewRow) {
          const nominalDue = Number(viewRow.total_due ?? viewRow.net_amount ?? viewRow.gross_amount ?? 100000);
          const pkg = viewRow.package_type || 'INDIVIDU';

          let kategoriLabel = `Tiket Individu : ${formatRupiah(nominalDue)}`;
          if (pkg === 'MABAR_11' || pkg === 'GROUP_11') {
            kategoriLabel = `Promo Komunitas (11 Orang • 10+1) : ${formatRupiah(nominalDue)}`;
          } else if (pkg === 'MABAR_6' || pkg === 'GROUP') {
            kategoriLabel = `Promo Mabar (6 Orang • 5+1) : ${formatRupiah(nominalDue)}`;
          } else if (pkg !== 'INDIVIDU') {
            kategoriLabel = `${pkg} : ${formatRupiah(nominalDue)}`;
          }

          const isVerified = viewRow.is_ticket_active;

          setTicketResult({
            registrationId: viewRow.registration_id,
            ticketCode: viewRow.ticket_code,
            isTicketActive: isVerified,
            status: isVerified ? 'VERIFIED' : 'PENDING',
            statusLabel: isVerified ? 'Terverifikasi & Aktif' : 'Menunggu Verifikasi Admin',
            fullName: viewRow.full_name || 'Peserta Terdaftar',
            email: viewRow.email || '-',
            whatsapp: viewRow.whatsapp || '-',
            institution: viewRow.institution || '-',
            city: viewRow.city || '-',
            packageType: pkg,
            kategori: kategoriLabel,
            nominal: nominalDue,
            eventTitle: viewRow.event_title || 'Pelatihan Publik Speaking Dignity',
            eventDate: viewRow.event_date_start
              ? new Date(viewRow.event_date_start).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Jakarta'
                })
              : 'Segera Diumumkan',
            eventVenue: viewRow.event_venue || 'Zoom Cloud Meeting (Online)',
            waGroupUrl: viewRow.wa_group_url || '',
            zoomUrl: viewRow.event_meeting_url || '',
            isGroupMember: viewRow.is_group_member,
            leaderName: viewRow.leader_name || null,
            leaderWhatsapp: viewRow.leader_whatsapp || null,
            customNotes: viewRow.custom_notes || '',
            proofImageUrl: viewRow.proof_image_url || null,
            proofDriveFileId: viewRow.proof_drive_file_id || null
          });

          // Muat data rombongan jika terdeteksi paket grup
          const isGroup =
            pkg === 'KOMUNITAS_11' ||
            pkg === 'MABAR_11' ||
            pkg === 'GROUP_11' ||
            pkg === 'MABAR_6' ||
            pkg === 'GROUP' ||
            nominalDue >= 450000 ||
            kategoriLabel.toLowerCase().includes('komunitas') ||
            kategoriLabel.toLowerCase().includes('mabar');

          if (isGroup) {
            await fetchGroupRoster(viewRow.ticket_code || viewRow.registration_id || term, term);
          }
          return;
        }
      } catch (viewEx) {
        console.warn('View v_public_ticket_status belum tersedia, beralih ke Fallback Direct Join...', viewEx);
      }

      // ── METODE 3: FALLBACK DIRECT TABLE QUERY ─────────────────────────────────────
      let matchedReg = null;
      let matchedTicket = null;
      let matchedPerson = null;
      let isGroupMember = false;
      let leaderInfo = null;

      // 1. CARI VIA NOMOR TIKET RESMI DI TABEL tickets
      if (cleanTicketCode.includes('TICKET-') || cleanTicketCode.includes('DIGNITY')) {
        const { data: ticketRow } = await supabase
          .from('tickets')
          .select(`
            id,
            ticket_code,
            registration_id,
            status,
            issued_at,
            registrations (
              id,
              event_id,
              person_id,
              package_type,
              is_mabar,
              total_due,
              gross_amount,
              net_amount,
              status,
              deleted_at,
              custom_notes,
              events ( id, title, slug, date_start, date_end, venue, meeting_url, landing_page_config ),
              persons ( id, full_name, email, whatsapp, institution, city )
            )
          `)
          .ilike('ticket_code', cleanTicketCode)
          .maybeSingle();

        if (ticketRow && ticketRow.registrations) {
          matchedTicket = ticketRow;
          matchedReg = ticketRow.registrations;
          matchedPerson = ticketRow.registrations.persons;
        }
      }

      // 2. CARI VIA ID REGISTRASI
      if (!matchedReg) {
        const { data: regById } = await supabase
          .from('registrations')
          .select(`
            id,
            event_id,
            person_id,
            package_type,
            is_mabar,
            total_due,
            gross_amount,
            net_amount,
            status,
            deleted_at,
            custom_notes,
            events ( id, title, slug, date_start, date_end, venue, meeting_url, landing_page_config ),
            persons ( id, full_name, email, whatsapp, institution, city )
          `)
          .or(`id.ilike.%${term.trim()}%,custom_notes.ilike.%${cleanTicketCode}%`)
          .is('deleted_at', null)
          .neq('status', 'CANCELLED')
          .limit(1)
          .maybeSingle();

        if (regById) {
          matchedReg = regById;
          matchedPerson = regById.persons;

          const { data: tRow } = await supabase
            .from('tickets')
            .select('id, ticket_code, status, issued_at')
            .eq('registration_id', regById.id)
            .order('issued_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (tRow) matchedTicket = tRow;
        }
      }

      // 3. CARI VIA EMAIL / WHATSAPP DI TABEL persons
      if (!matchedReg && (cleanEmail || cleanWa)) {
        const orFilter = [
          cleanEmail ? `email_normalized.eq.${cleanEmail.toLowerCase()}` : null,
          cleanWa ? `whatsapp_normalized.eq.${cleanWa.replace(/[^0-9]/g, '')}` : null
        ].filter(Boolean).join(',');

        const { data: matchedPersons } = await supabase
          .from('persons')
          .select('id, full_name, email, whatsapp, institution, city')
          .or(orFilter);

        if (matchedPersons && matchedPersons.length > 0) {
          const personIds = matchedPersons.map(p => p.id);

          const { data: regRows } = await supabase
            .from('registrations')
            .select(`
              id,
              event_id,
              person_id,
              package_type,
              is_mabar,
              total_due,
              gross_amount,
              net_amount,
              status,
              deleted_at,
              custom_notes,
              events ( id, title, slug, date_start, date_end, venue, meeting_url, landing_page_config ),
              persons ( id, full_name, email, whatsapp, institution, city )
            `)
            .in('person_id', personIds)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false })
            .limit(1);

          if (regRows && regRows.length > 0) {
            matchedReg = regRows[0];
            matchedPerson = regRows[0].persons;

            const { data: tRow } = await supabase
              .from('tickets')
              .select('id, ticket_code, status, issued_at')
              .eq('registration_id', matchedReg.id)
              .order('issued_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (tRow) matchedTicket = tRow;
          } else {
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
                  events ( id, title, slug, date_start, date_end, venue, meeting_url, landing_page_config ),
                  persons ( id, full_name, email, whatsapp )
                )
              `)
              .in('person_id', personIds)
              .is('registrations.deleted_at', null)
              .neq('registrations.status', 'CANCELLED')
              .limit(1);

            if (memberRows && memberRows.length > 0) {
              isGroupMember = true;
              matchedReg = memberRows[0].registrations;
              leaderInfo = memberRows[0].registrations?.persons;
              matchedPerson = matchedPersons[0];

              const { data: tRow } = await supabase
                .from('tickets')
                .select('id, ticket_code, status, issued_at')
                .eq('registration_id', matchedReg.id)
                .order('issued_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (tRow) {
                matchedTicket = {
                  ...tRow,
                  ticket_code: `${tRow.ticket_code}-${memberRows[0].ticket_suffix || 'M'}`
                };
              }
            }
          }
        }
      }

      // 4. KELOLA HASIL PENEMUAN DATA (SSOT DATABASE)
      if (matchedReg) {
        const nominalDue = Number(matchedReg.total_due ?? matchedReg.net_amount ?? matchedReg.gross_amount ?? 100000);
        const pkg = matchedReg.package_type || 'INDIVIDU';

        let kategoriLabel = `Tiket Individu : ${formatRupiah(nominalDue)}`;
        if (pkg === 'MABAR_11' || pkg === 'GROUP_11') {
          kategoriLabel = `Promo Komunitas (11 Orang • 10+1) : ${formatRupiah(nominalDue)}`;
        } else if (pkg === 'MABAR_6' || pkg === 'GROUP') {
          kategoriLabel = `Promo Mabar (6 Orang • 5+1) : ${formatRupiah(nominalDue)}`;
        } else if (pkg !== 'INDIVIDU') {
          kategoriLabel = `${pkg} : ${formatRupiah(nominalDue)}`;
        }

        const isVerified = matchedReg.status === 'PAID' || matchedReg.status === 'CONFIRMED' || matchedReg.status === 'ATTENDED';
        const ticketCodeResolved = matchedTicket?.ticket_code || `TICKET-DIGNITY-${matchedReg.id.slice(0, 6).toUpperCase()}`;

        const evt = matchedReg.events || {};
        const landingConf = evt.landing_page_config || {};
        const waGroupUrl = landingConf.web_registration?.wa_group_url || '';
        const zoomUrl = evt.meeting_url || landingConf.web_registration?.zoom_meeting_url || '';

        setTicketResult({
          registrationId: matchedReg.id,
          ticketCode: ticketCodeResolved,
          isTicketActive: isVerified,
          status: isVerified ? 'VERIFIED' : 'PENDING',
          statusLabel: isVerified ? 'Terverifikasi & Aktif' : 'Menunggu Verifikasi Admin',
          fullName: matchedPerson?.full_name || 'Peserta Terdaftar',
          email: matchedPerson?.email || '-',
          whatsapp: matchedPerson?.whatsapp || '-',
          institution: matchedPerson?.institution || '-',
          city: matchedPerson?.city || '-',
          packageType: pkg,
          kategori: kategoriLabel,
          nominal: nominalDue,
          eventTitle: evt.title || 'Pelatihan Publik Speaking Dignity',
          eventDate: evt.date_start
            ? new Date(evt.date_start).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta'
              })
            : 'Segera Diumumkan',
          eventVenue: evt.venue || 'Zoom Cloud Meeting (Online)',
          waGroupUrl,
          zoomUrl,
          isGroupMember,
          leaderName: leaderInfo?.full_name || null,
          leaderWhatsapp: leaderInfo?.whatsapp || null,
          customNotes: matchedReg.custom_notes || ''
        });

        // Muat data rombongan jika terdeteksi paket grup
        const isGroup =
          pkg === 'KOMUNITAS_11' ||
          pkg === 'MABAR_11' ||
          pkg === 'GROUP_11' ||
          pkg === 'MABAR_6' ||
          pkg === 'GROUP' ||
          nominalDue >= 450000 ||
          kategoriLabel.toLowerCase().includes('komunitas') ||
          kategoriLabel.toLowerCase().includes('mabar');

        if (isGroup) {
          await fetchGroupRoster(ticketCodeResolved || matchedReg.id || term, term);
        }
      } else {
        setSearchError('Data pendaftaran atau nomor tiket tidak ditemukan pada database. Pastikan nomor tiket, email, atau nomor WhatsApp yang Anda masukkan sudah sesuai.');
      }
    } catch (err) {
      console.error('Search ticket error:', err);
      setSearchError('Terjadi kesalahan saat memproses pencarian data. Silakan coba beberapa saat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProofSubmit = async (e) => {
    e.preventDefault();
    if (!ticketResult?.registrationId) return;

    let finalProofString = '';
    if (proofMethod === 'GDRIVE') {
      const trimmed = proofDriveUrl.trim();
      if (!trimmed) {
        alert('Mohon masukkan tautan Google Drive berkas bukti transfer Anda.');
        return;
      }
      finalProofString = trimmed;
    } else {
      if (!proofFile && !proofPreview) {
        alert('Mohon pilih berkas gambar bukti transfer Anda.');
        return;
      }
      finalProofString = proofPreview;
    }

    setIsUpdatingProof(true);
    try {
      const appendedNote = `[BUKTI_PEMBARUAN_WEB:${new Date().toISOString()}|URL:${finalProofString.slice(0, 80)}]`;
      const currentNotes = ticketResult.customNotes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n${appendedNote}` : appendedNote;

      const { error } = await supabase
        .from('registrations')
        .update({
          custom_notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketResult.registrationId);

      if (error) throw error;

      setUpdateProofSuccess(true);
      setShowProofUpload(false);
      setTicketResult(prev => ({ ...prev, customNotes: updatedNotes }));
      alert('Bukti pembayaran Anda berhasil diperbarui ke sistem. Admin akan segera memvalidasi pendaftaran Anda.');
    } catch (err) {
      console.error('Update proof error:', err);
      alert('Gagal memperbarui bukti pembayaran: ' + (err.message || 'Coba lagi'));
    } finally {
      setIsUpdatingProof(false);
    }
  };

  // ── DERIVED STATE ROSTER ROMBONGAN ───────────────────────────────────────────
  const isGroupDetected = Boolean(
    groupRoster?.total_pax > 1 ||
    ticketResult?.packageType === 'MABAR_11' ||
    ticketResult?.packageType === 'KOMUNITAS_11' ||
    ticketResult?.packageType === 'GROUP_11' ||
    ticketResult?.packageType === 'MABAR_6' ||
    ticketResult?.packageType === 'GROUP' ||
    (ticketResult?.nominal && ticketResult.nominal >= 450000) ||
    ticketResult?.kategori?.toLowerCase().includes('komunitas') ||
    ticketResult?.kategori?.toLowerCase().includes('mabar')
  );

  const totalPaxExpected = (ticketResult?.packageType === 'MABAR_6' || ticketResult?.packageType === 'GROUP') ? 6 : 11;

  const activeRoster = groupRoster || (ticketResult && isGroupDetected ? {
    found: true,
    total_pax: totalPaxExpected,
    filled_count: 1,
    pending_count: totalPaxExpected - 1,
    package_label: ticketResult.kategori || 'Promo Komunitas (11 Orang • 10+1)',
    base_ticket_code: ticketResult.ticketCode,
    registration_id: ticketResult.registrationId,
    leader: {
      full_name: ticketResult.fullName,
      email: ticketResult.email,
      whatsapp: ticketResult.whatsapp,
      city: ticketResult.city || '-',
      institution: ticketResult.institution
    },
    slots: Array.from({ length: totalPaxExpected }, (_, idx) => {
      const suffix = String.fromCharCode(65 + idx);
      const isA = suffix === 'A';
      return {
        suffix,
        ticket_code: isA ? ticketResult.ticketCode : `${ticketResult.ticketCode}-${suffix}`,
        role: isA ? 'LEADER' : 'MEMBER',
        full_name: isA ? ticketResult.fullName : null,
        email: isA ? ticketResult.email : null,
        whatsapp: isA ? ticketResult.whatsapp : null,
        city: isA ? (ticketResult.city || '-') : null,
        is_leader: isA,
        is_filled: isA,
        status: isA ? 'ISSUED' : 'UNFILLED'
      };
    })
  } : null);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 font-sans selection:bg-[#D4AF37]/20 selection:text-stone-900 antialiased pb-20">
      {/* ── 1. HEADER & HERO FORM PENCARIAN ───────────────────── */}
      <TicketSearchHero
        queryInput={queryInput}
        setQueryInput={setQueryInput}
        isLoading={isLoading}
        searchError={searchError}
        onSearch={(e) => {
          if (e) e.preventDefault();
          handleSearchTicket();
        }}
        onBackToHome={onBackToHome}
      />

      {/* ── 2. HASIL PENCARIAN & DOSSIER TIKET ─────────────────── */}
      {ticketResult && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div id="printable-public-ticket" className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            
            {/* Banner Peringatan Kuota Kursi Kosong Khusus Ketua Rombongan */}
            <UnfilledGroupAlertBanner
              roster={activeRoster}
              onScrollToRoster={handleScrollToRoster}
            />

            {/* Kartu Status Pending vs Kartu Verified E-Ticket */}
            {!ticketResult.isTicketActive ? (
              <PendingTicketCard
                ticketResult={ticketResult}
                copiedCode={copiedCode}
                onCopyCode={handleCopyCode}
                showProofUpload={showProofUpload}
                setShowProofUpload={setShowProofUpload}
                proofMethod={proofMethod}
                setProofMethod={setProofMethod}
                proofFile={proofFile}
                setProofFile={setProofFile}
                proofPreview={proofPreview}
                setProofPreview={setProofPreview}
                proofDriveUrl={proofDriveUrl}
                setProofDriveUrl={setProofDriveUrl}
                isUpdatingProof={isUpdatingProof}
                onUpdateProofSubmit={handleUpdateProofSubmit}
              />
            ) : (
              <VerifiedTicketCard
                ticketResult={ticketResult}
                activeRoster={activeRoster}
                onScrollToRoster={handleScrollToRoster}
              />
            )}

            {/* Matriks Tabel Pengisian Mandiri Anggota Rombongan */}
            <GroupRosterMatrix
              activeRoster={activeRoster}
              isLeaderVerified={isLeaderVerified}
              memberInputs={memberInputs}
              editingSlots={editingSlots}
              savingSlot={savingSlot}
              rosterError={rosterError}
              rosterSuccess={rosterSuccess}
              copiedShareLink={copiedShareLink}
              leaderAuthInput={leaderAuthInput}
              leaderAuthError={leaderAuthError}
              setLeaderAuthInput={setLeaderAuthInput}
              onVerifyLeaderAuth={handleVerifyLeaderAuth}
              onRequestLeaderModal={() => setShowLeaderAuthModal(true)}
              onToggleEditSlot={handleToggleEditSlot}
              onMemberInputChange={handleMemberInputChange}
              onSaveSingleSlot={handleSaveSingleSlot}
              onSaveAllSlots={handleSaveAllSlots}
              onCopyShareLink={handleCopyShareLink}
            />

          </div>
        </div>
      )}

      {/* ── 3. MODAL OTORISASI KETUA ROMBONGAN ─────────────────── */}
      <LeaderAuthModal
        isOpen={showLeaderAuthModal}
        onClose={() => {
          setShowLeaderAuthModal(false);
          setLeaderAuthError('');
        }}
        leader={activeRoster?.leader || groupRoster?.leader}
        leaderAuthInput={leaderAuthInput}
        setLeaderAuthInput={setLeaderAuthInput}
        leaderAuthError={leaderAuthError}
        onSubmit={handleVerifyLeaderAuth}
      />
    </div>
  );
}
