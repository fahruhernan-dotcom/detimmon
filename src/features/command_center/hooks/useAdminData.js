import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { registrationService } from '../../../services/registrationService';
import { attendanceService } from '../../../services/attendanceService';
import { 
  normalizeCertificateName, 
  normalizeEmail, 
  normalizeWhatsApp 
} from '../../../utils/normalizers';

/**
 * useAdminData — Manages data fetching, live caching, and Supabase Realtime synchronization
 * for the Dignity Event Command Center.
 */
export function useAdminData(activeEventId) {
  const [registrants, setRegistrants] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Clean stale legacy localStorage caches on mount
  useEffect(() => {
    try {
      localStorage.removeItem('digniti_react_registrants');
      localStorage.removeItem('digniti_react_attendances');
    } catch {}
  }, []);

  // Map raw database row into normalized registrant model
  const mapDbRegistration = useCallback((reg) => {
    const p = reg.persons || {};
    const pmt = reg.payments?.[0] || {};
    const isLunas = reg.status === 'PAID' || reg.status === 'CONFIRMED' || reg.payments?.some(item => item.status === 'VERIFIED');
    const nominal = reg.total_due || (reg.package_type === 'MABAR_11' ? 1000000 : reg.package_type === 'MABAR_6' ? 500000 : 100000);
    const ticketNo = reg.tickets?.[0]?.ticket_code
      || (reg.registration_members?.[0]?.ticket_suffix 
          ? `TICKET-${reg.registration_members[0].ticket_suffix}`
          : `TICKET-DIGNITY-${reg.id.substring(0, 6).toUpperCase()}`);
    const kategoriText = (reg.package_type === 'MABAR_11' || reg.package_type === 'GROUP_11')
      ? 'Promo Komunitas (11 Orang • 10+1) : Rp 1.000.000'
      : (reg.package_type === 'MABAR_6' || reg.package_type === 'GROUP')
      ? 'Promo Mabar (6 Orang) : Rp 500.000'
      : 'Tiket Individu (1 Peserta) : Rp 100.000';

    const ticket = reg.tickets?.[0] || null;
    const isEmailSent = Boolean(ticket?.sent_at) || (Array.isArray(reg.email_logs) && reg.email_logs.some(l => l.status === 'SENT'));

    return {
      id: reg.id,
      timestamp: reg.created_at?.replace('T', ' ').substring(0, 19) || '',
      nomorTicket: ticketNo,
      nama: normalizeCertificateName(p.full_name || ''),
      email: normalizeEmail(p.email || ''),
      whatsapp: normalizeWhatsApp(p.whatsapp || ''),
      instansi: p.institution || 'Individu',
      kota: p.city || '-',
      kategori: kategoriText,
      packageType: reg.package_type,
      nominal,
      bank: pmt.bank_destination || 'Bank Mandiri',
      buktiUrl: pmt.proof_drive_file_id || '',
      rawBukti: pmt.proof_drive_file_id || '',
      statusBayar: isLunas ? 'LUNAS' : 'PENDING',
      statusEmailTicket: isEmailSent ? 'TERKIRIM' : 'BELUM',
      ticketSentAt: ticket?.sent_at || null,
      isDeleted: Boolean(reg.deleted_at),
      deletedAt: reg.deleted_at || null,
      supabaseRegistrationId: reg.id,
      supabasePaymentId: pmt.id,
      supabaseTicketId: ticket?.id || null,
      mabarMembers: (reg.registration_members || [])
        .filter(m => m.ticket_suffix !== 'A' && m.member_role !== 'LEADER')
        .map(m => ({
          nama: m.persons?.full_name || '',
          email: m.persons?.email || '',
          whatsapp: m.persons?.whatsapp || '',
          suffix: m.ticket_suffix
        })),
      registration_members: reg.registration_members || []
    };
  }, []);

  // Reload registrations directly from Supabase (SSOT)
  const refreshRegistrantsFromDb = useCallback(async (eventId, silent = false) => {
    if (!eventId) return;
    try {
      const dbRows = await registrationService.getRegistrationsByEvent(eventId);
      const mapped = (dbRows || []).map(mapDbRegistration);
      setRegistrants(mapped);
      if (!silent) {
        const activeCount = mapped.filter(r => !r.isDeleted).length;
        const trashCount = mapped.length - activeCount;
        showToast(`Data diperbarui dari Supabase (${activeCount} aktif${trashCount > 0 ? `, ${trashCount} di tempat sampah` : ''}).`, 'success');
      }
    } catch (e) {
      console.warn('refreshRegistrantsFromDb error:', e);
    }
  }, [mapDbRegistration, showToast]);

  // Reload attendances directly from Supabase
  const refreshAttendances = useCallback(async () => {
    if (!activeEventId) return;
    try {
      const data = await attendanceService.getAttendancesByEvent(activeEventId);
      const mapped = (data || []).map(dbAtt => ({
        id: dbAtt.id,
        nama: dbAtt.persons?.full_name || 'Peserta',
        email: dbAtt.persons?.email || '',
        whatsapp: dbAtt.persons?.whatsapp || '',
        timestamp: dbAtt.join_time || new Date().toISOString(),
        nomorSertifikat: `LPK-DIGNITY/CERT/${new Date().getFullYear()}/${dbAtt.id.slice(0, 6).toUpperCase()}`,
        hambatan: 'Presensi Sesi Live Webinar',
        kodeVoucher: `REBATE-${dbAtt.id.slice(0, 4).toUpperCase()}`,
        status: dbAtt.status,
        durationMinutes: dbAtt.duration_minutes
      }));
      setAttendances(mapped);
    } catch (err) {
      console.warn('Notice refreshAttendances:', err);
      setAttendances([]);
    }
  }, [activeEventId]);

  // Load registrations from Supabase for activeEventId & Realtime
  useEffect(() => {
    setRegistrants([]);
    setAttendances([]);

    if (!activeEventId) return;

    let isMounted = true;
    async function loadInitialData() {
      await refreshRegistrantsFromDb(activeEventId, true);
      await refreshAttendances();
    }

    loadInitialData();

    // Auto-refresh when browser tab gains focus
    const handleWindowFocus = () => {
      refreshRegistrantsFromDb(activeEventId, true);
      refreshAttendances();
    };
    window.addEventListener('focus', handleWindowFocus);

    // Supabase Realtime Subscription for automatic updates on member submission & payment changes
    const channel = supabase
      .channel(`admin-registrations-${activeEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_members' }, () => {
        refreshRegistrantsFromDb(activeEventId, true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${activeEventId}` }, () => {
        refreshRegistrantsFromDb(activeEventId, true);
      })
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleWindowFocus);
      supabase.removeChannel(channel);
    };
  }, [activeEventId, refreshRegistrantsFromDb, refreshAttendances]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const activeRegistrants = registrants.filter(r => !r.isDeleted);
    const totalRegistrants = activeRegistrants.length;
    const lunasCount = activeRegistrants.filter(r => r.statusBayar === 'LUNAS').length;
    const pendingCount = activeRegistrants.filter(r => r.statusBayar === 'PENDING').length;
    const unsentTicketsCount = activeRegistrants.filter(r => r.statusBayar === 'LUNAS' && r.statusEmailTicket !== 'TERKIRIM').length;
    const totalRevenue = activeRegistrants
      .filter(r => r.statusBayar === 'LUNAS')
      .reduce((sum, r) => sum + (r.nominal || 0), 0);
    const certCount = attendances.filter(a => a.statusSertifikat === 'SELESAI').length;
    const readyCertificatesCount = attendances.filter(a => a.statusSertifikat !== 'SELESAI').length;

    return {
      totalRegistrants,
      lunasCount,
      pendingCount,
      unsentTicketsCount,
      totalRevenue,
      certCount,
      readyCertificatesCount
    };
  }, [registrants, attendances]);

  return {
    registrants,
    setRegistrants,
    attendances,
    setAttendances,
    isSyncing,
    setIsSyncing,
    toast,
    setToast,
    showToast,
    refreshRegistrantsFromDb,
    refreshAttendances,
    kpiStats
  };
}
