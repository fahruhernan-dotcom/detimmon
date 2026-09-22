import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Konfigurasi Default Pendaftaran Web Mandiri (Native Web Registration)
 */
export const DEFAULT_WEB_REGISTRATION_CONFIG = {
  is_open: true,
  close_message: "Pendaftaran untuk program ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @indonesiadignity.",
  intake_source: "WEB_NATIVE",
  banks: [],
  payment_time_limit_hours: 24,
  gdrive_proof_folder_id: "",
  form_fields: {
    institution_required: false,
    job_title_enabled: true,
    city_enabled: true,
    proof_upload_required: true
  },
  allow_mabar: true,
  wa_group_url: "",
  success_message: "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."
};

const EventContext = createContext(null);

export function EventProvider({ children }) {
  // Database-First: state murni dimulai kosong dan diisi langsung dari PostgreSQL Supabase
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bersihkan cache usang dari localStorage agar browser tidak pernah membaca data mock
  useEffect(() => {
    try {
      localStorage.removeItem('digniti_events_portfolio');
    } catch {}
  }, []);

  useEffect(() => {
    loadEventsFromSupabase();
  }, []);

  async function loadEventsFromSupabase() {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, registrations(count)')
        .filter('registrations.deleted_at', 'is', null)
        .order('date_start', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const resolvedEvents = data.map(dbEvt => {
          const nextEventSlug = dbEvt.next_event_id
            ? (data.find(e => e.id === dbEvt.next_event_id)?.slug || null)
            : null;
          // Derive real enrolled count directly from Supabase registrations table count
          const realEnrolledCount = Array.isArray(dbEvt.registrations) && dbEvt.registrations.length > 0
            ? (dbEvt.registrations[0]?.count ?? 0)
            : 0;

          return {
            ...dbEvt,
            rebate_voucher_code: null,
            rebate_voucher_amount: null,
            enrolled_count: realEnrolledCount,
            next_event_slug: nextEventSlug,
            web_registration_config: (dbEvt.web_registration_config && typeof dbEvt.web_registration_config === 'object')
              ? { ...DEFAULT_WEB_REGISTRATION_CONFIG, ...dbEvt.web_registration_config }
              : DEFAULT_WEB_REGISTRATION_CONFIG
          };
        });

        setEvents(resolvedEvents);

        setActiveEventId(prev => {
          if (prev && resolvedEvents.some(e => e.id === prev)) return prev;
          return resolvedEvents[0]?.id || null;
        });
      }
    } catch (err) {
      console.error('Gagal memuat events dari Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper: Link two events into a parent-child sequence with Supabase sync
  const linkEvents = async (sourceId, targetId, options = {}) => {
    const vCode = options.voucherCode !== undefined ? options.voucherCode : null;
    const vAmount = options.voucherAmount !== undefined ? Number(options.voucherAmount) : null;

    // 1. Update local state immediately
    setEvents(prev => {
      return prev.map(evt => {
        if (evt.id === sourceId) {
          return {
            ...evt,
            next_event_id: targetId,
            rebate_voucher_code: vCode,
            rebate_voucher_amount: vAmount
          };
        }
        if (evt.id === targetId) {
          return {
            ...evt,
            parent_event_id: sourceId
          };
        }
        return evt;
      });
    });

    // 2. Sync to Supabase in background
    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          supabase.from('events').update({
            next_event_id: targetId,
            rebate_voucher_code: vCode,
            rebate_voucher_amount: vAmount
          }).eq('id', sourceId),
          supabase.from('events').update({
            parent_event_id: sourceId
          }).eq('id', targetId)
        ]);
      } catch (err) {
        console.warn('Gagal sinkronisasi linkEvents ke Supabase (fallback ke local):', err.message);
      }
    }
  };

  // Helper: Unlink an event relation with Supabase sync
  const unlinkEvents = async (sourceId, targetId) => {
    // 1. Update local state immediately
    setEvents(prev => {
      return prev.map(evt => {
        if (evt.id === sourceId && evt.next_event_id === targetId) {
          return { ...evt, next_event_id: null, rebate_voucher_code: null, rebate_voucher_amount: null };
        }
        if (evt.id === targetId && evt.parent_event_id === sourceId) {
          return { ...evt, parent_event_id: null };
        }
        return evt;
      });
    });

    // 2. Sync to Supabase in background
    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          supabase.from('events').update({ next_event_id: null, rebate_voucher_code: null, rebate_voucher_amount: null }).eq('id', sourceId),
          supabase.from('events').update({ parent_event_id: null }).eq('id', targetId)
        ]);
      } catch (err) {
        console.warn('Gagal sinkronisasi unlinkEvents ke Supabase (fallback ke local):', err.message);
      }
    }
  };

  // Helper: Update event details with Supabase sync
  const updateEvent = async (eventId, fields) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...fields } : e));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('events').update(fields).eq('id', eventId);
      } catch (err) {
        console.warn('Gagal sinkronisasi updateEvent ke Supabase:', err.message);
      }
    }
  };

  // Helper: Create and add new event
  const createEvent = (newEvent) => {
    setEvents(prev => [...prev, newEvent]);
    if (newEvent.id) setActiveEventId(newEvent.id);
  };

  // Helper: Delete an event with cascade cleanup in Supabase and local state
  const deleteEvent = async (eventId) => {
    const remaining = events.filter(e => e.id !== eventId);
    if (remaining.length === 0) {
      throw new Error('Tidak dapat menghapus semua acara. Sistem membutuhkan minimal 1 acara aktif.');
    }

    // 1. Optimistic Local State Update (Unlink references and remove event)
    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== eventId);
      return filtered.map(e => ({
        ...e,
        parent_event_id: e.parent_event_id === eventId ? null : e.parent_event_id,
        next_event_id: e.next_event_id === eventId ? null : e.next_event_id
      }));
    });

    if (activeEventId === eventId) {
      setActiveEventId(remaining[0].id);
    }

    // 2. Sync Deletion to Supabase
    if (isSupabaseConfigured()) {
      try {
        // Try atomic cascade RPC first
        const { error: rpcErr } = await supabase.rpc('delete_event_cascade', {
          p_event_id: eventId
        });

        if (rpcErr) {
          console.warn('RPC delete_event_cascade fallback to direct queries:', rpcErr.message);
          // Fallback: manual unlink & cascade
          await Promise.all([
            supabase.from('events').update({ parent_event_id: null }).eq('parent_event_id', eventId),
            supabase.from('events').update({ next_event_id: null }).eq('next_event_id', eventId)
          ]);

          // Clean up registrations & payments
          const { data: regRows } = await supabase.from('registrations').select('id').eq('event_id', eventId);
          if (regRows && regRows.length > 0) {
            const regIds = regRows.map(r => r.id);
            await supabase.from('payments').delete().in('registration_id', regIds);
            await supabase.from('payment_adjustments').delete().in('registration_id', regIds);
            await supabase.from('registration_members').delete().in('registration_id', regIds);
            await supabase.from('tickets').delete().in('registration_id', regIds);
            await supabase.from('registrations').delete().eq('event_id', eventId);
          }

          // Clean up event-scoped records
          await supabase.from('attendances').delete().eq('event_id', eventId);
          await supabase.from('event_speakers').delete().eq('event_id', eventId);
          await supabase.from('message_templates').delete().eq('event_id', eventId);

          // Delete the event
          const { error: delErr } = await supabase.from('events').delete().eq('id', eventId);
          if (delErr) throw delErr;
        }
      } catch (err) {
        console.error('Error saat menghapus event di Supabase:', err);
      }
    }

    return true;
  };

  // Helper: Get Chaining Sequence for any event
  const getEventChaining = (eventId) => {
    const current = events.find(e => e.id === eventId);
    if (!current) return { parentEvent: null, nextEvent: null, chain: [] };

    const parent = current.parent_event_id ? events.find(e => e.id === current.parent_event_id) : null;
    const next = current.next_event_id ? events.find(e => e.id === current.next_event_id) : null;

    // Build chain array starting from root
    let root = current;
    while (root.parent_event_id && events.find(e => e.id === root.parent_event_id)) {
      root = events.find(e => e.id === root.parent_event_id);
    }

    const chain = [];
    let ptr = root;
    const visited = new Set();
    while (ptr && !visited.has(ptr.id)) {
      visited.add(ptr.id);
      chain.push(ptr);
      ptr = ptr.next_event_id ? events.find(e => e.id === ptr.next_event_id) : null;
    }

    return {
      parentEvent: parent,
      nextEvent: next,
      chain
    };
  };

  // Helper: Update web registration configuration with Supabase sync
  const updateWebRegistrationConfig = async (eventId, newConfig) => {
    // 1. Update local state immediately
    setEvents(prev => prev.map(e => {
      if (e.id === eventId || e.slug === eventId) {
        const currentCfg = e.web_registration_config || DEFAULT_WEB_REGISTRATION_CONFIG;
        return {
          ...e,
          is_open: newConfig.is_open !== undefined ? newConfig.is_open : e.is_open,
          web_registration_config: {
            ...currentCfg,
            ...newConfig
          }
        };
      }
      return e;
    }));

    if (isSupabaseConfigured()) {
      const targetEvt = events.find(e => e.id === eventId || e.slug === eventId);
      const targetId = targetEvt?.id || eventId;
      const mergedCfg = {
        ...(targetEvt?.web_registration_config || DEFAULT_WEB_REGISTRATION_CONFIG),
        ...newConfig
      };

      // Jalur 1: Coba via atomic RPC update_event_web_config (SECURITY DEFINER, bypass RLS anon)
      let rpcSucceeded = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_event_web_config', {
          p_event_id: targetId,
          p_config: mergedCfg
        });

        if (!rpcError && rpcData?.success) {
          rpcSucceeded = true;
          // Also sync top-level is_open column if modified
          if (newConfig.is_open !== undefined) {
            await supabase.from('events').update({ is_open: newConfig.is_open }).eq('id', targetId);
          }
          return rpcData;
        }
        if (rpcError) {
          console.warn('Notice RPC update_event_web_config fallback to direct update:', rpcError.message);
        }
      } catch (rpcErr) {
        console.warn('Notice RPC call exception:', rpcErr.message);
      }

      // Jalur 2: Fallback ke direct update jika RPC belum dibuat di DB
      if (!rpcSucceeded) {
        const directPayload = { web_registration_config: mergedCfg };
        if (newConfig.is_open !== undefined) {
          directPayload.is_open = newConfig.is_open;
        }
        const { error: updateError } = await supabase
          .from('events')
          .update(directPayload)
          .eq('id', targetId);

        if (updateError) {
          console.error('Gagal sinkronisasi web_registration_config ke Supabase:', updateError);
          throw new Error(updateError.message || 'Gagal menyimpan ke database Supabase.');
        }
      }
    }
  };

  const activeEvent = events.find(e => e.id === activeEventId) || events[0] || null;

  const value = {
    events,
    activeEvent,
    activeEventId: activeEvent?.id,
    setActiveEventId,
    loading,
    refreshEvents: loadEventsFromSupabase,
    linkEvents,
    unlinkEvents,
    updateEvent,
    createEvent,
    deleteEvent,
    updateWebRegistrationConfig,
    getEventChaining
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent harus digunakan di dalam EventProvider');
  }
  return context;
}

export default EventContext;
