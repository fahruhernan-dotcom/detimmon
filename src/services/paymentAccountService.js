import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const paymentAccountService = {
  /**
   * Mengambil daftar rekening pembayaran aktif untuk event tertentu (atau global)
   */
  async getActiveAccounts(eventId = null) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      let query = supabase
        .from('payment_accounts')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (eventId) {
        query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
      } else {
        query = query.is('event_id', null);
      }

      const { data, error } = await query;
      if (error) {
        // Table may not exist yet if migration 002 hasn't been run
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('Notice getActiveAccounts:', err.message);
      return [];
    }
  },

  /**
   * Mengambil seluruh rekening untuk konfigurasi di menu Admin Settings
   */
  async getAllAccounts() {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('Notice getAllAccounts:', err.message);
      return [];
    }
  },

  /**
   * Menambahkan rekening bank / QRIS baru (dilakukan melalui Settings oleh Owner/Finance)
   */
  async createAccount(accountData) {
    const { data, error } = await supabase
      .from('payment_accounts')
      .insert({
        event_id: accountData.event_id || null,
        account_name: accountData.account_name,
        bank_name: accountData.bank_name,
        account_number: accountData.account_number,
        account_holder: accountData.account_holder,
        qr_code: accountData.qr_code || null,
        sort_order: accountData.sort_order || 0,
        active: accountData.active !== undefined ? accountData.active : true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mengubah detail rekening
   */
  async updateAccount(id, updates) {
    const { data, error } = await supabase
      .from('payment_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mengaktifkan / menonaktifkan rekening
   */
  async toggleActive(id, nextState) {
    const { data, error } = await supabase
      .from('payment_accounts')
      .update({ active: nextState, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export default paymentAccountService;
