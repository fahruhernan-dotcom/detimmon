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
  },

  /**
   * Mencatat pengiriman email tiket secara persisten ke database
   * Memanggil stored procedure atomik 'record_ticket_email_dispatch' dengan fallback manual
   */
  async recordTicketEmailDispatch({
    ticketId = null,
    registrationId = null,
    recipientEmail = null,
    subject = null,
    providerMessageId = null,
    status = 'SENT',
    errorMessage = null,
    senderEmail = null
  }) {
    if (!supabase) return null;

    try {
      // 1. Coba panggil RPC atomik
      const { data: rpcData, error: rpcError } = await supabase.rpc('record_ticket_email_dispatch', {
        p_ticket_id: ticketId || null,
        p_registration_id: registrationId || null,
        p_recipient_email: recipientEmail || null,
        p_subject: subject || null,
        p_provider_message_id: providerMessageId || null,
        p_status: status || 'SENT',
        p_error_message: errorMessage || null,
        p_sender_email: senderEmail || null
      });

      if (!rpcError && rpcData) {
        return rpcData;
      }

      if (rpcError) {
        console.warn('Notice RPC record_ticket_email_dispatch:', rpcError.message);
      }
    } catch (err) {
      console.warn('RPC record_ticket_email_dispatch call failed, falling back:', err.message);
    }

    // 2. Fallback jika RPC belum diaplikasikan di database
    try {
      const nowIso = new Date().toISOString();

      // Update sent_at pada tabel tickets
      if (status === 'SENT') {
        if (ticketId) {
          await supabase
            .from('tickets')
            .update({ sent_at: nowIso, status: 'ISSUED' })
            .eq('id', ticketId);
        } else if (registrationId) {
          await supabase
            .from('tickets')
            .update({ sent_at: nowIso, status: 'ISSUED' })
            .eq('registration_id', registrationId);
        }
      }

      // Catat ke email_logs
      const logPayload = {
        recipient: recipientEmail || 'unknown',
        template: 'TICKET_WEBINAR_OFFICIAL',
        status: status || 'SENT',
        response_message: errorMessage || (status === 'SENT' ? 'Sent via Gmail API' : 'Failed'),
        sent_at: nowIso
      };

      if (registrationId) logPayload.registration_id = registrationId;
      if (ticketId) logPayload.ticket_id = ticketId;
      if (subject) logPayload.subject = subject;
      if (providerMessageId) logPayload.provider_message_id = providerMessageId;
      if (errorMessage) logPayload.error_message = errorMessage;

      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert(logPayload)
        .select()
        .single();

      if (logError) {
        console.warn('Notice email_logs insert fallback:', logError.message);
      }

      return logData || { success: true, sent_at: nowIso };
    } catch (fallbackErr) {
      console.warn('Notice fallback recordTicketEmailDispatch error:', fallbackErr.message);
      return null;
    }
  }
};

export default emailService;
