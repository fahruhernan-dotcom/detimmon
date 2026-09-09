/**
 * External Source Service — CRUD untuk external_sources (Google Sheets binding per event)
 * Phase 7: Google Workspace Integration
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */
import { supabase } from '../lib/supabaseClient';
import { isValidUuid } from '../utils/normalizers';

export const externalSourceService = {
  /**
   * Ambil semua external sources untuk satu event
   */
  async getByEvent(eventId) {
    if (!eventId || !isValidUuid(eventId)) return [];

    const { data, error } = await supabase
      .from('external_sources')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Ambil satu source aktif untuk event (primary)
   */
  async getActivePrimary(eventId) {
    if (!eventId || !isValidUuid(eventId)) return null;

    const { data, error } = await supabase
      .from('external_sources')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .eq('source_type', 'GOOGLE_SHEETS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Buat / update external source binding
   */
  async upsert(payload) {
    const now = new Date().toISOString();
    const record = {
      event_id: payload.event_id,
      source_type: 'GOOGLE_SHEETS',
      label: payload.label || 'Google Sheets Utama',
      external_sheet_id: payload.external_sheet_id,
      external_drive_folder_id: payload.external_drive_folder_id || null,
      sheet_tab_registrasi: payload.sheet_tab_registrasi || null,
      sheet_tab_presensi: payload.sheet_tab_presensi || null,
      column_mapping: payload.column_mapping || {},
      sync_direction: payload.sync_direction || 'BIDIRECTIONAL',
      auto_sync_interval_minutes: payload.auto_sync_interval_minutes || 0,
      is_active: payload.is_active !== false,
      updated_at: now,
    };

    if (payload.id) {
      const { data, error } = await supabase
        .from('external_sources')
        .update(record)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      record.created_at = now;
      const { data, error } = await supabase
        .from('external_sources')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  /**
   * Update column_mapping cache setelah auto-detect
   */
  async saveColumnMapping(sourceId, colMap, tabRegistrasi, tabPresensi) {
    const { error } = await supabase
      .from('external_sources')
      .update({
        column_mapping: colMap,
        sheet_tab_registrasi: tabRegistrasi || null,
        sheet_tab_presensi: tabPresensi || null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId);

    if (error) throw error;
  },

  /**
   * Hapus binding
   */
  async remove(sourceId) {
    const { error } = await supabase
      .from('external_sources')
      .delete()
      .eq('id', sourceId);
    if (error) throw error;
  },

  /**
   * Toggle aktif/nonaktif
   */
  async toggleActive(sourceId, isActive) {
    const { error } = await supabase
      .from('external_sources')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', sourceId);
    if (error) throw error;
  }
};

export default externalSourceService;
