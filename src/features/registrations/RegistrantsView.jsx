import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Download, 
  HardDrive, 
  UserPlus, 
  Filter, 
  CreditCard, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Ticket,
  Users,
  Eye,
  Trash2,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatRupiah, formatDate, generateNextTicketNumber } from '../../utils/formatters';
import { normalizeCertificateName, normalizeEmail, normalizeWhatsApp } from '../../utils/normalizers';
import { useConfirm } from '../../context/ConfirmContext';
import { registrationService } from '../../services/registrationService';
import { paymentService } from '../../services/paymentService';
import { emailService } from '../../services/emailService';
import { sendEmailViaGmail, buildTicketEmailHtml, uploadBackupToDrive } from '../../services/googleApiService';

import AddModal from '../../components/AddModal';
import EditRegistrantModal from '../../components/EditRegistrantModal';
import FastVerifyModal from '../payments/FastVerifyModal';
import RegistrationMembersModal from './RegistrationMembersModal';
import ParticipantDetailDrawer from '../../components/ParticipantDetailDrawer';
import TicketPreviewModal from '../tickets/TicketPreviewModal';
import EmailPreviewModal from '../communication/EmailPreviewModal';

/**
 * RegistrantsView — Autonomous Registration Workspace (Ponytail Architecture)
 * Fully manages its own modals, CRUD mutations, soft-delete lifecycle,
 * deep multi-field search, and the group member roster accordion.
 */
export default function RegistrantsView({
  registrants = [],
  setRegistrants,
  activeEvent,
  googleOAuthToken,
  setGoogleOAuthToken,
  config = {},
  currentUser,
  onRefresh,
  onNavigateTab,
  onShowToast,
  initialFilter = 'all'
}) {
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [packageFilter, setPackageFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [expandedRows, setExpandedRows] = useState({});
  const [collapsingRows, setCollapsingRows] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Active Selections
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRegistrant, setEditingRegistrant] = useState(null);
  const [activeDrawerParticipant, setActiveDrawerParticipant] = useState(null);
  const [activeMabarRegistrant, setActiveMabarRegistrant] = useState(null);
  const [activeTicketPreview, setActiveTicketPreview] = useState(null);
  const [activeEmailPreview, setActiveEmailPreview] = useState(null);
  const [fastVerifyParticipantId, setFastVerifyParticipantId] = useState(null);
  const [isFastVerifyOpen, setIsFastVerifyOpen] = useState(false);

  const toast = useCallback((msg, type = 'info') => {
    if (onShowToast) onShowToast(msg, type);
  }, [onShowToast]);

  const toggleExpandRow = (id) => {
    if (collapsingRows[id]) return; // prevent interruption during animation

    if (expandedRows[id]) {
      // Smooth collapse animation
      setCollapsingRows(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setExpandedRows(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setCollapsingRows(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 220);
    } else {
      // Smooth expand animation
      setExpandedRows(prev => ({
        ...prev,
        [id]: true
      }));
    }
  };

  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);
  const deletedRegistrants = useMemo(() => registrants.filter(r => r.isDeleted), [registrants]);

  // Deep Multi-Field Matching: matches Buyer, Members, and Sub-Tickets
  const filteredData = useMemo(() => {
    return registrants.filter((item) => {
      // Trash filter
      if (statusFilter === 'trash') {
        if (!item.isDeleted) return false;
      } else {
        if (item.isDeleted) return false;
      }

      // Status filter
      if (statusFilter === 'pending' && item.statusBayar !== 'PENDING') return false;
      if (statusFilter === 'lunas' && item.statusBayar !== 'LUNAS') return false;
      if (statusFilter === 'rejected' && item.statusBayar !== 'DITOLAK' && item.statusBayar !== 'REJECTED') return false;

      // Package filter
      if (packageFilter === 'individu' && !item.kategori?.toLowerCase().includes('individu') && item.nominal !== 100000) return false;
      if (packageFilter === 'mabar' && 
          !item.kategori?.toLowerCase().includes('mabar') && 
          !item.kategori?.toLowerCase().includes('komunitas') && 
          item.nominal !== 500000 && 
          item.nominal !== 1000000 && 
          item.packageType !== 'MABAR_11' && 
          item.packageType !== 'MABAR_6') return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const buyerMatch = (
          item.nama.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          (item.whatsapp && item.whatsapp.includes(q)) ||
          (item.nomorTicket && item.nomorTicket.toLowerCase().includes(q)) ||
          (item.instansi && item.instansi.toLowerCase().includes(q)) ||
          (item.kota && item.kota.toLowerCase().includes(q))
        );
        if (buyerMatch) return true;

        // Check group members (mabarMembers / registration_members)
        const membersList = item.registration_members || item.mabarMembers || [];
        const memberMatch = membersList.some(m => {
          const mName = (m.persons?.full_name || m.nama || '').toLowerCase();
          const mEmail = (m.persons?.email || m.email || '').toLowerCase();
          const mWa = (m.persons?.whatsapp || m.whatsapp || '');
          const mSuffix = m.ticket_suffix || m.suffix || '';
          const mTicket = `${item.nomorTicket || ''}-${mSuffix}`.toLowerCase();
          return mName.includes(q) || mEmail.includes(q) || mWa.includes(q) || mTicket.includes(q);
        });
        if (memberMatch) return true;

        return false;
      }

      return true;
    });
  }, [registrants, statusFilter, packageFilter, search]);

  // Counts & Participant Totals
  const pendingCount = useMemo(() => activeRegistrants.filter(r => r.statusBayar === 'PENDING').length, [activeRegistrants]);
  const lunasCount = useMemo(() => activeRegistrants.filter(r => r.statusBayar === 'LUNAS').length, [activeRegistrants]);
  const trashCount = useMemo(() => deletedRegistrants.length, [deletedRegistrants]);

  const totalPesertaCount = useMemo(() => {
    return activeRegistrants.reduce((acc, r) => {
      const isMabar11 = r.packageType === 'MABAR_11' || r.packageType === 'GROUP_11' || r.kategori?.includes('11') || r.nominal === 1000000;
      const isMabar6 = r.packageType === 'MABAR_6' || r.packageType === 'GROUP' || r.kategori?.includes('6') || r.nominal === 500000;
      if (isMabar11 || isMabar6) {
        const filled = (r.registration_members || []).filter(
          m => m.ticket_suffix !== 'A' && m.persons?.full_name && m.persons.full_name.trim().length > 0
        );
        return acc + 1 + filled.length;
      }
      return acc + 1;
    }, 0);
  }, [activeRegistrants]);

  // Flattened participants list for 'flat' view mode
  const flatParticipantsData = useMemo(() => {
    const list = [];
    filteredData.forEach(item => {
      const isMabar11 = item.packageType === 'MABAR_11' || item.packageType === 'GROUP_11' || item.kategori?.includes('11') || item.nominal === 1000000;
      const isMabar6 = item.packageType === 'MABAR_6' || item.packageType === 'GROUP' || item.kategori?.includes('6') || item.nominal === 500000;
      const isGroup = isMabar11 || isMabar6;
      const totalPax = isMabar11 ? 11 : isMabar6 ? 6 : 1;

      // 1. Leader / Single Participant
      list.push({
        ...item,
        uniqueRowKey: `${item.id}-leader`,
        isMemberSlot: false,
        slotSuffix: isGroup ? 'A' : null,
        displayName: item.nama,
        displayEmail: item.email,
        displayInstansi: item.instansi || '-',
        displayDomisili: item.domisili || item.kota || 'Surakarta',
        displayPaket: isMabar11 ? 'Komunitas (11 Pax) • Ketua' : isMabar6 ? 'MABAR (6 Pax) • Ketua' : 'Individu',
        displayNominal: item.nominal,
        displayTicket: isGroup ? `${item.nomorTicket || 'TICKET'}-A` : item.nomorTicket,
        displayIsBonus: false,
        displayIsFilled: true,
        displayEmailSent: item.statusEmailTicket === 'TERKIRIM',
        parentItem: item
      });

      // 2. Additional Group Members
      if (isGroup) {
        const additionalMembers = item.registration_members || [];
        for (let idx = 1; idx < totalPax; idx++) {
          const suffix = String.fromCharCode(65 + idx);
          const isBonus = idx === totalPax - 1 && isMabar11;
          const subTicket = `${item.nomorTicket || 'TICKET'}-${suffix}`;
          const m = additionalMembers.find(member => member.ticket_suffix === suffix);
          const isFilled = Boolean(m?.persons?.full_name && m.persons.full_name.trim().length > 0);
          const memberName = isFilled ? m.persons.full_name : '(Data Belum Diisi • Menunggu Anggota)';
          const memberEmail = isFilled ? (m.persons.email || '-') : '-';
          const memberPhone = isFilled ? (m.persons.whatsapp || '') : '';
          const memberInstansi = isFilled ? (m.persons.institution || m.persons?.instansi || item.instansi || '-') : (item.instansi || '-');
          const memberDomisili = isFilled ? (m.persons.city || m.persons?.domisili || item.domisili || item.kota || 'Surakarta') : (item.domisili || item.kota || 'Surakarta');
          const isEmailSent = Boolean(m?.ticket_sent_at) || 
            (Array.isArray(item.email_logs) && item.email_logs.some(l => l.recipient_email === m?.persons?.email && l.status === 'SENT'));

          list.push({
            ...item,
            id: m?.id || `${item.id}-${suffix}`,
            uniqueRowKey: `${item.id}-member-${suffix}`,
            nama: memberName,
            email: memberEmail,
            whatsapp: memberPhone,
            instansi: memberInstansi,
            domisili: memberDomisili,
            kota: memberDomisili,
            nomorTicket: subTicket,
            isMemberSlot: true,
            parentLeaderName: item.nama,
            slotSuffix: suffix,
            displayName: memberName,
            displayEmail: memberEmail,
            displayInstansi: memberInstansi,
            displayDomisili: memberDomisili,
            displayPaket: isBonus ? 'Bonus Gratis (10+1)' : `Anggota Slot [${suffix}]`,
            displayNominal: null,
            displayTicket: subTicket,
            displayIsBonus: isBonus,
            displayIsFilled: isFilled,
            displayEmailSent: isEmailSent,
            parentItem: item
          });
        }
      }
    });
    return list;
  }, [filteredData]);

  // ── Actions & Handlers ─────────────────────────────────────
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRegistrant = async (data) => {
    if (!activeEvent?.id) {
      toast('Pilih acara terlebih dahulu sebelum menambah peserta.', 'warning');
      return;
    }
    const cleanNama = normalizeCertificateName(data.nama);
    const cleanEmail = normalizeEmail(data.email);
    const cleanWa = normalizeWhatsApp(data.whatsapp);
    const nominal = parseInt(data.nominal, 10) || 100000;
    const nextTicket = generateNextTicketNumber(activeRegistrants.length);

    toast(`Menyimpan pendaftar ${cleanNama} ke Supabase...`, 'info');
    try {
      const created = await registrationService.createRegistration({
        eventId: activeEvent.id,
        personData: {
          full_name: cleanNama,
          email: cleanEmail,
          whatsapp: cleanWa,
          institution: data.instansi || 'Individu',
          city: data.kota || '-'
        },
        packageType: data.packageType || (data.kategori?.includes('Komunitas') ? 'MABAR_11' : data.kategori?.includes('Mabar') ? 'MABAR_6' : 'INDIVIDU'),
        isMabar: Boolean(data.kategori?.includes('Komunitas') || data.kategori?.includes('Mabar') || data.packageType?.startsWith('MABAR')),
        totalDue: nominal,
        notes: data.catatanCS || 'Diinput manual dari Dashboard'
      });

      const resolvedPkg = data.packageType || (data.kategori?.includes('Komunitas') ? 'MABAR_11' : data.kategori?.includes('Mabar') ? 'MABAR_6' : 'INDIVIDU');
      const newEntry = {
        id: created?.id || Date.now(),
        supabaseRegistrationId: created?.id,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        nomorTicket: nextTicket,
        ...data,
        packageType: resolvedPkg,
        nama: cleanNama,
        email: cleanEmail,
        whatsapp: cleanWa,
        instansi: data.instansi || 'Individu',
        kota: data.kota || '-',
        nominal,
        statusBayar: data.statusBayar || 'PENDING',
        statusEmailTicket: data.statusBayar === 'LUNAS' ? 'TERKIRIM' : 'BELUM'
      };

      if (setRegistrants) {
        setRegistrants(prev => [newEntry, ...prev]);
      }
      toast(`Pendaftar baru ${cleanNama} berhasil tersimpan di Supabase ✓`, 'success');
      setIsAddOpen(false);
    } catch (err) {
      console.error('Gagal tambah pendaftar ke Supabase:', err);
      toast(`Gagal menyimpan ke Supabase: ${err.message}`, 'warning');
    }
  };

  const handleSaveEditedRegistrant = async (updated) => {
    const resolvedPackageType = updated.packageType || (
      updated.kategori?.includes('11') || updated.kategori?.includes('Komunitas') || parseInt(updated.nominal, 10) === 1000000
        ? 'MABAR_11'
        : updated.kategori?.includes('Mabar') || parseInt(updated.nominal, 10) === 500000
        ? 'MABAR_6'
        : 'INDIVIDU'
    );

    const cleanUpdated = {
      ...updated,
      packageType: resolvedPackageType,
      nama: normalizeCertificateName(updated.nama),
      email: normalizeEmail(updated.email),
      whatsapp: normalizeWhatsApp(updated.whatsapp),
      nominal: parseInt(updated.nominal, 10) || 100000
    };

    if (setRegistrants) {
      setRegistrants(prev => prev.map(item => item.id === cleanUpdated.id ? cleanUpdated : item));
    }
    toast(`Menyimpan perubahan data ${cleanUpdated.nama} ke Supabase...`, 'info');
    setEditingRegistrant(null);

    try {
      if (cleanUpdated.supabaseRegistrationId) {
        await registrationService.updateRegistration(cleanUpdated.supabaseRegistrationId, {
          fullName: cleanUpdated.nama,
          email: cleanUpdated.email,
          whatsapp: cleanUpdated.whatsapp,
          institution: cleanUpdated.instansi,
          city: cleanUpdated.kota,
          packageType: resolvedPackageType,
          totalDue: cleanUpdated.nominal,
          status: cleanUpdated.statusBayar === 'LUNAS' ? 'CONFIRMED' : 'PENDING',
          mabarMembers: cleanUpdated.mabarMembers
        });
        if (onRefresh) onRefresh();
        toast(`Perubahan data ${cleanUpdated.nama} berhasil tersimpan di Supabase ✓`, 'success');
      }
    } catch (err) {
      console.warn('Gagal update detail di Supabase:', err);
      toast(`Peringatan Supabase: ${err.message}`, 'warning');
    }
  };

  const handleSoftDeleteParticipant = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;
    const nowIso = new Date().toISOString();

    if (setRegistrants) {
      setRegistrants(prev => prev.map(item => item.id === id ? { ...item, isDeleted: true, deletedAt: nowIso } : item));
    }
    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? { ...prev, isDeleted: true, deletedAt: nowIso } : null);
    }

    try {
      if (target.supabaseRegistrationId || target.id) {
        const res = await registrationService.softDeleteRegistration(target.supabaseRegistrationId || target.id);
        toast(`Pendaftar ${target.nama} dipindahkan ke tempat sampah ✓`, 'success');
      }
    } catch (err) {
      console.warn('Gagal soft delete di Supabase:', err);
      toast(`Pendaftar ${target.nama} dipindahkan ke tempat sampah lokal`, 'info');
    }
  };

  const handleRestoreParticipant = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    if (setRegistrants) {
      setRegistrants(prev => prev.map(item => item.id === id ? { ...item, isDeleted: false, deletedAt: null } : item));
    }
    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? { ...prev, isDeleted: false, deletedAt: null } : null);
    }

    try {
      if (target.supabaseRegistrationId || target.id) {
        await registrationService.restoreRegistration(target.supabaseRegistrationId || target.id);
        toast(`Pendaftar ${target.nama} berhasil dipulihkan ✓`, 'success');
      }
    } catch (err) {
      console.warn('Gagal restore di Supabase:', err);
      toast(`Pendaftar ${target.nama} dipulihkan di tampilan lokal`, 'info');
    }
  };

  const handlePermanentDeleteParticipant = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    if (setRegistrants) {
      setRegistrants(prev => prev.filter(item => item.id !== id));
    }
    if (activeDrawerParticipant?.id === id) setActiveDrawerParticipant(null);
    if (editingRegistrant?.id === id) setEditingRegistrant(null);

    try {
      const regDbId = target.supabaseRegistrationId || target.id;
      if (regDbId) {
        await registrationService.deleteRegistration(regDbId);
      }
      toast(`Pendaftar ${target.nama} berhasil dihapus permanen ✓`, 'success');
    } catch (err) {
      console.error('Gagal hapus permanen di Supabase:', err);
      toast(`Gagal menghapus permanen: ${err.message}`, 'error');
    }
  };

  const handleEmptyTrash = async () => {
    const trashList = registrants.filter(r => r.isDeleted);
    if (trashList.length === 0) {
      toast('Tempat sampah sudah kosong.', 'info');
      return;
    }

    if (setRegistrants) {
      setRegistrants(prev => prev.filter(item => !item.isDeleted));
    }
    if (activeDrawerParticipant?.isDeleted) setActiveDrawerParticipant(null);

    try {
      if (activeEvent?.id) {
        const res = await registrationService.emptyTrash(activeEvent.id);
        toast(res?.message || `Tempat sampah dikosongkan (${trashList.length} pendaftar dihapus) ✓`, 'success');
      }
    } catch (err) {
      console.error('Gagal mengosongkan tempat sampah:', err);
      toast(`Gagal mengosongkan tempat sampah: ${err.message}`, 'error');
    }
  };

  const handleExportCsv = () => {
    let csv = 'Timestamp,Nomor_Ticket,Nama_Lengkap,Email,WhatsApp,Instansi,Kategori,Nominal,Bank,Status_Bayar,Status_Email\n';
    activeRegistrants.forEach(r => {
      csv += `"${r.timestamp}","${r.nomorTicket}","${r.nama}","${r.email}","${r.whatsapp}","${r.instansi}","${r.kategori}",${r.nominal},"${r.bank}","${r.statusBayar}","${r.statusEmailTicket}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Pendaftar_Webinar_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    toast('File CSV pendaftar berhasil diunduh!', 'success');
  };

  const handleBackupToDrive = async () => {
    if (!googleOAuthToken) {
      toast('Silakan login akun Google terlebih dahulu untuk mencadangkan ke Drive.', 'warning');
      return;
    }
    try {
      toast('Mengunggah data pendaftar ke Google Drive...', 'info');
      let csv = 'Timestamp,Nomor_Ticket,Nama_Lengkap,Email,WhatsApp,Instansi,Kategori,Nominal,Bank,Status_Bayar,Status_Email\n';
      activeRegistrants.forEach(r => {
        csv += `"${r.timestamp}","${r.nomorTicket}","${r.nama}","${r.email}","${r.whatsapp}","${r.instansi}","${r.kategori}",${r.nominal},"${r.bank}","${r.statusBayar}","${r.statusEmailTicket}"\n`;
      });
      const fileName = `Backup_Pendaftar_Dignity_${new Date().toISOString().substring(0, 10)}.csv`;
      const res = await uploadBackupToDrive({
        accessToken: googleOAuthToken,
        fileName,
        content: csv,
        mimeType: 'text/csv'
      });
      toast(`Data berhasil dicadangkan ke Google Drive! (ID: ${res.id})`, 'success');
    } catch (err) {
      toast(`Gagal mencadangkan ke Drive: ${err.message}`, 'warning');
    }
  };

  // Direct Ticket Email Dispatching for Member Slot
  const handleResendMemberTicket = async (regId, suffix, memberInfo) => {
    const target = registrants.find(r => r.id === regId);
    if (!target) return;

    const recipientEmail = memberInfo.email;
    const recipientName = memberInfo.nama;
    const ticketCode = memberInfo.subTicket;

    if (googleOAuthToken) {
      try {
        toast(`Mengirim E-Ticket ke ${recipientEmail}...`, 'info');
        const subject = `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${ticketCode}`;
        const ticketPayload = {
          ...target,
          nama: recipientName,
          email: recipientEmail,
          nomorTicket: ticketCode
        };
        const htmlBody = buildTicketEmailHtml(ticketPayload);
        const sendRes = await sendEmailViaGmail({
          accessToken: googleOAuthToken,
          to: recipientEmail,
          subject,
          htmlBody
        });

        await emailService.recordTicketEmailDispatch({
          ticketId: target.supabaseTicketId,
          registrationId: target.supabaseRegistrationId,
          recipientEmail,
          subject,
          providerMessageId: sendRes?.id || null,
          status: 'SENT',
          senderEmail: currentUser?.email || null
        });

        // Update local member sent status
        if (setRegistrants) {
          setRegistrants(prev => prev.map(item => {
            if (item.id === regId) {
              const updatedMembers = (item.registration_members || []).map(m => {
                if (m.ticket_suffix === suffix) {
                  return { ...m, ticket_sent_at: new Date().toISOString() };
                }
                return m;
              });
              return { ...item, registration_members: updatedMembers };
            }
            return item;
          }));
        }

        toast(`E-Ticket resmi (${ticketCode}) berhasil dikirim via Gmail ke ${recipientEmail}!`, 'success');
      } catch (err) {
        await emailService.recordTicketEmailDispatch({
          ticketId: target.supabaseTicketId,
          registrationId: target.supabaseRegistrationId,
          recipientEmail,
          subject: `[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - ${ticketCode}`,
          status: 'FAILED',
          errorMessage: err.message,
          senderEmail: currentUser?.email || null
        }).catch(() => {});

        toast(`Gagal kirim via Gmail: ${err.message}`, 'warning');
      }
    } else {
      toast('Silakan login akun Google terlebih dahulu untuk mengirim E-Ticket via Gmail.', 'warning');
    }
  };

  const handleVerifyPayment = async (id) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    if (setRegistrants) {
      setRegistrants(prev => prev.map(item => item.id === id ? { ...item, statusBayar: 'LUNAS' } : item));
    }
    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? { ...prev, statusBayar: 'LUNAS' } : null);
    }
    toast(`Memverifikasi pembayaran ${target.nama}...`, 'info');

    try {
      if (target.supabasePaymentId) {
        await paymentService.verifyPayment(target.supabasePaymentId, 'Diverifikasi via RegistrantsView');
      }
      if (target.supabaseRegistrationId) {
        await registrationService.updateRegistrationStatus(target.supabaseRegistrationId, 'PAID');
      }
      toast(`Pembayaran ${target.nama} LUNAS! Tersimpan di Supabase ✓`, 'success');
    } catch (err) {
      console.warn('Notice Supabase verifyPayment:', err.message);
      toast(`Peringatan Supabase: ${err.message}`, 'warning');
    }
  };

  const handleRejectPaymentWithReason = async (id, reason) => {
    const target = registrants.find(r => r.id === id);
    if (!target) return;

    if (setRegistrants) {
      setRegistrants(prev => prev.map(item => item.id === id ? { ...item, statusBayar: 'DITOLAK', rejectionReason: reason } : item));
    }
    if (activeDrawerParticipant?.id === id) {
      setActiveDrawerParticipant(prev => prev ? { ...prev, statusBayar: 'DITOLAK', rejectionReason: reason } : null);
    }
    toast(`Pembayaran ${target.nama} ditolak: ${reason}`, 'warning');

    try {
      if (target.supabasePaymentId) {
        await paymentService.rejectPayment(target.supabasePaymentId, reason);
      }
    } catch (err) {
      console.warn('Notice Supabase rejectPayment:', err);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── TOP CONTROL & FILTER BAR ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-72 md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, nomor tiket..."
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Tab & Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({activeRegistrants.length} Order • {totalPesertaCount} Peserta)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('lunas')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'lunas'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              Lunas ({lunasCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('trash')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'trash'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-rose-700 hover:text-rose-950'
              }`}
              title="Tempat Sampah (Data Terhapus)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sampah ({trashCount})</span>
            </button>
          </div>

          {/* View Mode Switcher: Per Order vs Semua Peserta */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan daftar per transaksi order pendaftaran"
            >
              Per Order ({filteredData.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'flat'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
              title="Tampilkan seluruh peserta termasuk anggota rombongan dalam baris mandiri"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Semua Peserta ({totalPesertaCount})</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Segarkan data dari Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Peserta</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN REGISTRANTS TABLE ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-3 px-4 font-semibold">Peserta / Pembeli</th>
                <th className="py-3 px-4 font-semibold hidden md:table-cell">Instansi & Domisili</th>
                <th className="py-3 px-4 font-semibold">Paket & Nominal</th>
                <th className="py-3 px-4 font-semibold">Status Bayar</th>
                <th className="py-3 px-4 font-semibold">Bukti Transfer</th>
                <th className="py-3 px-4 font-semibold hidden sm:table-cell">E-Ticket</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {((viewMode === 'flat' ? flatParticipantsData : filteredData).length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <span className="font-medium text-slate-600">Tidak ada pendaftar ditemukan</span>
                      <span className="text-[11px] text-slate-400 max-w-xs">
                        {search ? `Tidak ada hasil pencarian untuk "${search}".` : 'Belum ada pendaftar yang terdaftar di sistem.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : viewMode === 'flat' ? (
                /* ── FLAT VIEW: ALL PARTICIPANTS AS UNIFIED TABLE ROWS ── */
                flatParticipantsData.map((p) => {
                  const isLunas = p.statusBayar === 'LUNAS';
                  const isPending = p.statusBayar === 'PENDING';
                  const isMember = p.isMemberSlot;
                  const parentItem = p.parentItem || p;

                  return (
                    <tr
                      key={p.uniqueRowKey || p.id}
                      onClick={() => setActiveDrawerParticipant(p)}
                      className={`hover:bg-amber-500/5 transition-colors cursor-pointer group ${isMember ? 'bg-slate-50/40' : ''}`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {isMember && (
                            <>
                              <span className="text-slate-400 font-mono text-[11px] select-none">↳</span>
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                                {p.slotSuffix}
                              </span>
                            </>
                          )}
                          <span className={`font-semibold transition-colors ${
                            isMember && !p.displayIsFilled 
                              ? 'text-slate-400 italic' 
                              : 'text-slate-950 group-hover:text-amber-800'
                          }`}>
                            {p.displayName}
                          </span>
                          {!isMember && (p.packageType?.startsWith('MABAR') || p.packageType?.startsWith('GROUP')) && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              KETUA
                            </span>
                          )}
                          {p.displayIsBonus && (
                            <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                              BONUS
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] text-slate-400 truncate max-w-[220px] ${isMember ? 'pl-8' : ''}`}>
                          {p.displayEmail}
                        </div>
                      </td>

                      {/* Instansi & Domisili */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="text-slate-800 font-medium truncate max-w-[180px]">
                          {p.displayInstansi || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.displayDomisili || 'Surakarta'}
                        </div>
                      </td>

                      {/* Paket / Nominal */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {p.displayNominal ? formatRupiah(p.displayNominal) : '-'}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          {p.displayPaket}
                        </div>
                      </td>

                      {/* Status Bayar */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                          isLunas 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isPending
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {p.statusBayar}
                        </span>
                      </td>

                      {/* Bukti Transfer */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFastVerifyParticipantId(parentItem.id);
                            setIsFastVerifyOpen(true);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                            isPending && !isMember
                              ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold shadow-2xs' 
                              : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs'
                          }`}
                          title="Pratinjau bukti transfer & verifikasi"
                        >
                          <Eye className={`w-3.5 h-3.5 ${isPending && !isMember ? 'text-amber-700' : 'text-slate-500'}`} />
                          <span>{isPending && !isMember ? 'Cek & Verif' : 'Lihat Bukti'}</span>
                        </button>
                      </td>

                      {/* E-Ticket */}
                      <td className="py-3.5 px-4 hidden sm:table-cell font-mono text-[11px]">
                        <div className="text-slate-700">{p.displayTicket || '-'}</div>
                        <div className={`text-[10px] ${p.displayEmailSent ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {p.displayEmailSent ? '✓ Terkirim' : 'Belum kirim'}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-amber-700 transition-colors text-xs font-medium">
                          <span className="hidden lg:inline">Detail</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* ── GROUPED VIEW: PER ORDER WITH CLEAN DOWNWARDS TABLE ROWS ── */
                filteredData.map((item) => {
                  const isExpanded = Boolean(expandedRows[item.id]);
                  const isCollapsing = Boolean(collapsingRows[item.id]);
                  const isActivelyOpen = isExpanded && !isCollapsing;
                  const isLunas = item.statusBayar === 'LUNAS';
                  const isPending = item.statusBayar === 'PENDING';
                  const isMabar11 = item.packageType === 'MABAR_11' || item.packageType === 'GROUP_11' || item.kategori?.includes('11') || item.kategori?.includes('Komunitas') || item.nominal === 1000000;
                  const isMabar6 = item.packageType === 'MABAR_6' || item.packageType === 'GROUP' || item.kategori?.includes('6') || item.kategori?.includes('Mabar') || item.nominal === 500000;
                  const isGroup = isMabar11 || isMabar6;
                  const totalPax = isMabar11 ? 11 : isMabar6 ? 6 : 1;

                  const additionalMembers = item.registration_members || [];
                  const filledAdditionalMembers = additionalMembers.filter(
                    m => m.ticket_suffix !== 'A' && m.persons?.full_name && m.persons.full_name.trim().length > 0
                  );
                  const filledPaxCount = 1 + filledAdditionalMembers.length;

                  return (
                    <React.Fragment key={item.id}>
                      {/* LEADER / PRIMARY ORDER ROW */}
                      <tr
                        onClick={() => setActiveDrawerParticipant(item)}
                        className={`hover:bg-amber-500/5 transition-colors cursor-pointer group ${isActivelyOpen ? 'bg-amber-500/[0.03]' : ''}`}
                      >
                        {/* Name & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-950 group-hover:text-amber-800 transition-colors">
                              {item.nama}
                            </span>
                            {isGroup && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                KETUA
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {item.email}
                          </div>
                        </td>

                        {/* Instansi & Domisili */}
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="text-slate-800 font-medium truncate max-w-[180px]">
                            {item.instansi || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.domisili || item.kota || 'Surakarta'}
                          </div>
                        </td>

                        {/* Paket / Nominal */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">
                            {formatRupiah(item.nominal || 0)}
                          </div>
                          <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                            {isGroup ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandRow(item.id);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold border transition-all duration-300 ease-out active:scale-95 cursor-pointer shadow-2xs ${
                                  isActivelyOpen
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300'
                                }`}
                                title={isActivelyOpen ? "Tutup rincian anggota" : "Buka rincian anggota ke bawah"}
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{isMabar11 ? 'Komunitas (11 Pax)' : 'MABAR (6 Pax)'}</span>
                                <ChevronDown 
                                  className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                                    isActivelyOpen ? 'rotate-180 text-white/90' : 'rotate-0 text-indigo-500'
                                  }`} 
                                />
                              </button>
                            ) : (
                              <span>Individu</span>
                            )}
                          </div>
                        </td>

                        {/* Status Bayar */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                            isLunas 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : isPending
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {item.statusBayar}
                          </span>
                        </td>

                        {/* Bukti Transfer / Pratinjau Cepat */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFastVerifyParticipantId(item.id);
                              setIsFastVerifyOpen(true);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                              isPending 
                                ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold shadow-2xs' 
                                : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs'
                            }`}
                            title="Pratinjau bukti transfer & verifikasi kilat"
                          >
                            <Eye className={`w-3.5 h-3.5 ${isPending ? 'text-amber-700' : 'text-slate-500'}`} />
                            <span>{isPending ? 'Cek & Verif' : 'Lihat Bukti'}</span>
                          </button>
                        </td>

                        {/* E-Ticket */}
                        <td className="py-3.5 px-4 hidden sm:table-cell font-mono text-[11px]">
                          <div className="text-slate-700">
                            {isGroup ? `${item.nomorTicket || 'TICKET'}-A` : (item.nomorTicket || '-')}
                          </div>
                          <div className={`text-[10px] ${item.statusEmailTicket === 'TERKIRIM' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.statusEmailTicket === 'TERKIRIM' ? '✓ Terkirim' : 'Belum kirim'}
                          </div>
                        </td>

                        {/* Action Column */}
                        <td className="py-3.5 px-4 text-right">
                          {item.isDeleted ? (
                            <div className="inline-flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleRestoreParticipant(item.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-colors shadow-2xs cursor-pointer active:scale-95"
                                title="Pulihkan pendaftar ke daftar aktif"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Pulihkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: 'Hapus Permanen Peserta?',
                                    description: `Pendaftar "${item.nama}" akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`,
                                    note: 'Tiket dan data pembayaran akan ikut terhapus.',
                                    variant: 'danger',
                                    confirmText: 'Hapus Permanen',
                                    cancelText: 'Batalkan'
                                  });
                                  if (ok) handlePermanentDeleteParticipant(item.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-colors shadow-2xs cursor-pointer active:scale-95"
                                title="Hapus permanen dari database"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Hapus Permanen</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-amber-700 transition-colors text-xs font-medium">
                              <span className="hidden lg:inline">Detail</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* ── EXPANDED MEMBER ROWS: UNIFIED STANDARD TABLE ROWS (SAME GOOD UI AS DR. BUDI) ── */}
                      {isGroup && isExpanded && (
                        Array.from({ length: totalPax - 1 }).map((_, idx) => {
                          const slotIndex = idx + 1;
                          const suffix = String.fromCharCode(65 + slotIndex);
                          const isBonus = slotIndex === totalPax - 1 && isMabar11;
                          const subTicket = `${item.nomorTicket || 'TICKET'}-${suffix}`;
                          const m = additionalMembers.find(member => member.ticket_suffix === suffix);
                          const isFilled = Boolean(m?.persons?.full_name && m.persons.full_name.trim().length > 0);
                          const memberName = isFilled ? m.persons.full_name : '(Data Belum Diisi • Menunggu Anggota)';
                          const memberEmail = isFilled ? (m.persons.email || '-') : 'Belum mengisi form mandiri';
                          const memberInstansi = isFilled ? (m.persons.institution || m.persons?.instansi || item.instansi || '-') : (item.instansi || '-');
                          const memberDomisili = isFilled ? (m.persons.city || m.persons?.domisili || item.domisili || item.kota || 'Surakarta') : (item.domisili || item.kota || 'Surakarta');
                          const isEmailSent = Boolean(m?.ticket_sent_at) || 
                            (Array.isArray(item.email_logs) && item.email_logs.some(l => l.recipient_email === m?.persons?.email && l.status === 'SENT'));

                          const memberDrawerData = {
                            ...item,
                            id: m?.id || `${item.id}-${suffix}`,
                            nama: memberName,
                            email: memberEmail,
                            whatsapp: isFilled ? (m.persons.whatsapp || '') : '',
                            instansi: memberInstansi,
                            kota: memberDomisili,
                            nomorTicket: subTicket,
                            isMemberSlot: true,
                            slotSuffix: suffix,
                            statusEmailTicket: isEmailSent ? 'TERKIRIM' : 'BELUM',
                            parentLeaderName: item.nama
                          };

                          return (
                            <tr
                              key={`${item.id}-member-${suffix}`}
                              onClick={() => !isCollapsing && setActiveDrawerParticipant(memberDrawerData)}
                              className={`bg-slate-50/50 transition-all duration-200 border-b ${
                                isCollapsing 
                                  ? 'border-transparent pointer-events-none opacity-0 -translate-y-2 animate-row-slide-up' 
                                  : 'hover:bg-amber-500/5 cursor-pointer border-slate-100 animate-row-slide-down'
                              }`}
                              style={{ 
                                animationDelay: isCollapsing 
                                  ? `${(totalPax - 2 - idx) * 12}ms` 
                                  : `${idx * 24}ms` 
                              }}
                            >
                              {/* Name & Email */}
                              <td className="py-3 px-4 pl-7">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-mono text-[11px] select-none">↳</span>
                                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                                    {suffix}
                                  </span>
                                  <span className={`font-semibold transition-colors ${
                                    isFilled ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-400 italic'
                                  }`}>
                                    {memberName}
                                  </span>
                                  {isBonus && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                      BONUS
                                    </span>
                                  )}
                                </div>
                                <div className="pl-9 text-[11px] text-slate-400 truncate max-w-[220px]">
                                  {memberEmail}
                                </div>
                              </td>

                              {/* Instansi & Domisili */}
                              <td className="py-3 px-4 hidden md:table-cell">
                                <div className="text-slate-800 font-medium truncate max-w-[180px]">
                                  {memberInstansi}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {memberDomisili}
                                </div>
                              </td>

                              {/* Paket & Nominal */}
                              <td className="py-3 px-4">
                                <div className="font-mono text-slate-400 text-xs">
                                  {isBonus ? 'Rp 0' : '-'}
                                </div>
                                <div className="text-[10.5px] text-slate-500">
                                  {isBonus ? 'Bonus Gratis (Slot K)' : `Anggota (Slot ${suffix})`}
                                </div>
                              </td>

                              {/* Status Bayar */}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${
                                  isLunas 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : isPending
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {item.statusBayar}
                                </span>
                              </td>

                              {/* Bukti Transfer */}
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFastVerifyParticipantId(item.id);
                                    setIsFastVerifyOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                  title="Pratinjau bukti transfer order rombongan"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Lihat Bukti</span>
                                </button>
                              </td>

                              {/* E-Ticket */}
                              <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px]">
                                <div className="text-slate-700">{subTicket}</div>
                                <div className={`text-[10px] ${isEmailSent ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                  {isEmailSent ? '✓ Terkirim' : 'Belum kirim'}
                                </div>
                              </td>

                              {/* Action Column */}
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-amber-700 transition-colors text-xs font-medium">
                                  <span className="hidden lg:inline">Detail</span>
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Count & Trash Actions */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan <strong>{filteredData.length}</strong> dari <strong>{statusFilter === 'trash' ? deletedRegistrants.length : activeRegistrants.length}</strong> peserta {statusFilter === 'trash' ? '(Tempat Sampah)' : ''}
          </span>
          {statusFilter === 'trash' && deletedRegistrants.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Kosongkan Tempat Sampah?',
                  description: `Semua (${deletedRegistrants.length}) pendaftar di tempat sampah akan dihapus permanen dari database.`,
                  variant: 'danger',
                  confirmText: 'Kosongkan Sekarang',
                  cancelText: 'Batalkan'
                });
                if (ok) handleEmptyTrash();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Tempat Sampah</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CO-LOCATED MODALS ───────────────────────────────── */}
      <AddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddRegistrant={handleAddRegistrant}
        activeEventId={activeEvent?.id}
      />

      <EditRegistrantModal
        isOpen={Boolean(editingRegistrant)}
        registrant={editingRegistrant}
        onClose={() => setEditingRegistrant(null)}
        onSave={handleSaveEditedRegistrant}
        onDelete={handleSoftDeleteParticipant}
        onRestore={handleRestoreParticipant}
        onPermanentDelete={handlePermanentDeleteParticipant}
      />

      <RegistrationMembersModal
        isOpen={Boolean(activeMabarRegistrant)}
        onClose={() => setActiveMabarRegistrant(null)}
        registrant={activeMabarRegistrant}
        onOpenTicketPreview={(item, suffix) => {
          setActiveTicketPreview({ ...item, selectedSuffix: suffix });
        }}
        onEdit={(item) => {
          setActiveMabarRegistrant(null);
          setEditingRegistrant(item);
        }}
      />

      <TicketPreviewModal
        isOpen={Boolean(activeTicketPreview)}
        onClose={() => setActiveTicketPreview(null)}
        registrant={activeTicketPreview}
        activeEvent={activeEvent}
      />

      <EmailPreviewModal
        isOpen={Boolean(activeEmailPreview)}
        onClose={() => setActiveEmailPreview(null)}
        registrant={activeEmailPreview}
        type="ticket"
        activeEvent={activeEvent}
        googleOAuthToken={googleOAuthToken}
        onEmailSent={(p) => {
          toast(`E-Ticket resmi telah dikirim ke ${p.email}!`, 'success');
        }}
      />

      <FastVerifyModal
        isOpen={isFastVerifyOpen}
        onClose={() => {
          setIsFastVerifyOpen(false);
          setFastVerifyParticipantId(null);
        }}
        allRegistrants={activeRegistrants}
        pendingRegistrants={activeRegistrants.filter(r => r.statusBayar === 'PENDING')}
        initialParticipantId={fastVerifyParticipantId}
        onVerifyPayment={handleVerifyPayment}
        onRejectPaymentWithReason={handleRejectPaymentWithReason}
        googleOAuthToken={googleOAuthToken}
        clientId={config.clientId}
        onPreviewEmail={(p) => setActiveEmailPreview(p)}
        activeEvent={activeEvent}
      />

      <ParticipantDetailDrawer
        isOpen={Boolean(activeDrawerParticipant) && !Boolean(editingRegistrant)}
        onClose={() => setActiveDrawerParticipant(null)}
        participant={activeDrawerParticipant}
        onVerifyPayment={handleVerifyPayment}
        onRejectPayment={(p) => handleRejectPaymentWithReason(p.id, 'Bukti Buram / Tidak Terbaca')}
        onResendTicket={(id) => handleResendMemberTicket(id, 'A', {
          nama: activeDrawerParticipant?.nama,
          email: activeDrawerParticipant?.email,
          subTicket: activeDrawerParticipant?.nomorTicket
        })}
        onOpenTicketPreview={(p) => {
          setActiveDrawerParticipant(null);
          setActiveTicketPreview(p);
        }}
        onOpenMembers={(p) => {
          setActiveDrawerParticipant(null);
          setActiveMabarRegistrant(p);
        }}
        onEditParticipant={(p) => {
          setActiveDrawerParticipant(null);
          setEditingRegistrant(p);
        }}
        onSoftDelete={handleSoftDeleteParticipant}
        onRestore={handleRestoreParticipant}
        onPermanentDelete={handlePermanentDeleteParticipant}
        hasGoogleToken={Boolean(googleOAuthToken)}
      />
    </div>
  );
}
