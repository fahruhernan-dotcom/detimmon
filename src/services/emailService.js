import { supabase } from '../lib/supabaseClient';

export const emailService = {
  /**
   * Menambahkan pesan ke antrean email background dengan proteksi idempotency_key
   */
  async queueEmail({ idempotencyKey, type, recipient, template, payload }) {
    const { data, error } = await supabase
      .from('email_jobs')
      .insert({
        idempotency_key: idempotencyKey,
        type,
        recipient,
        template,
        payload: payload || {},
        status: 'QUEUED'
      })
      .select()
      .single();

    if (error) {
      // Jika duplikat (idempotent), ambil data yang sudah ada
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('email_jobs')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .single();
        return existing;
      }
      throw error;
    }
    return data;
  },

  /**
   * Mengambil antrean email
   */
  async getEmailQueue(status = null) {
    let query = supabase
      .from('email_jobs')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil log email terkirim
   */
  async getEmailLogs() {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }
};

export default emailService;
