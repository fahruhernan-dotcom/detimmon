import { supabase } from '../lib/supabaseClient';

/**
 * Helper untuk mengganti variabel template seperti {{full_name}}, {{ticket_code}}, dll.
 */
export function renderTemplateText(templateText, variables = {}) {
  if (!templateText) return '';
  let result = templateText;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, variables[key] ?? '');
  });
  return result;
}

export const communicationService = {
  renderTemplate: renderTemplateText,

  /**
   * Mengambil semua template pesan aktif
   */
  async getTemplates(eventId = null) {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (eventId) {
      query = query.or(`event_id.is.null,event_id.eq.${eventId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil satu template berdasarkan ID atau Key
   */
  async getTemplateById(id) {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * AUDIENCE BUILDER
   * Menyeleksi calon penerima blast dengan multi-kriteria filter & proteksi anti-duplikasi
   */
  async buildAudience({
    eventId,
    paymentStatus = 'ALL', // 'ALL', 'VERIFIED', 'PENDING'
    deliveryFilter = 'ALL', // 'ALL', 'TICKET_NOT_SENT', 'CERT_NOT_SENT', 'FAILED_ONLY'
    packageType = 'ALL',   // 'ALL', 'INDIVIDU', 'MABAR_6_PAX'
    excludeAlreadySent = true,
    templateKey = ''
  }) {
    // 1. Query dasar pendaftaran pada event ini
    let query = supabase
      .from('registrations')
      .select(`
        id,
        package_type,
        status,
        persons (
          id,
          full_name,
          email,
          whatsapp,
          institution,
          city
        ),
        tickets (
          id,
          ticket_code,
          status,
          sent_at
        ),
        certificates (
          id,
          certificate_no,
          verification_code,
          status,
          sent_at
        ),
        payments (
          amount,
          status
        )
      `)
      .eq('event_id', eventId);

    if (packageType !== 'ALL') {
      query = query.eq('package_type', packageType);
    }

    const { data: registrations, error } = await query;
    if (error) throw error;

    let audience = [];

    (registrations || []).forEach(reg => {
      const person = reg.persons;
      if (!person || !person.email) return;

      const ticket = reg.tickets?.[0] || null;
      const cert = reg.certificates?.[0] || null;
      const payments = reg.payments || [];
      const hasVerifiedPayment = payments.some(p => p.status === 'VERIFIED');

      // Filter Payment Status
      if (paymentStatus === 'VERIFIED' && !hasVerifiedPayment) return;
      if (paymentStatus === 'PENDING' && hasVerifiedPayment) return;

      // Filter Delivery Status
      const ticketSent = ticket && ticket.sent_at;
      const certSent = cert && cert.sent_at;

      if (deliveryFilter === 'TICKET_NOT_SENT' && ticketSent) return;
      if (deliveryFilter === 'CERT_NOT_SENT' && certSent) return;

      // Duplicate Protection (Exclude Already Sent untuk jenis template terkait)
      if (excludeAlreadySent) {
        if (templateKey.includes('TICKET') && ticketSent) return;
        if (templateKey.includes('CERTIFICATE') && certSent) return;
      }

      audience.push({
        person_id: person.id,
        registration_id: reg.id,
        ticket_id: ticket?.id || null,
        certificate_id: cert?.id || null,
        full_name: person.full_name,
        email: person.email,
        whatsapp: person.whatsapp,
        package_type: reg.package_type,
        ticket_code: ticket?.ticket_code || 'BELUM_TERBIT',
        ticket_sent: Boolean(ticketSent),
        certificate_no: cert?.certificate_no || 'BELUM_TERBIT',
        verification_code: cert?.verification_code || '',
        cert_sent: Boolean(certSent)
      });
    });

    return audience;
  },

  /**
   * MEMBUAT CAMPAIGN BLAST BARU (Status: DRAFT / PREVIEW)
   */
  async createBatch({
    eventId,
    templateId,
    title,
    channel = 'EMAIL',
    recipients = []
  }) {
    const { data: { user } } = await supabase.auth.getUser();

    // Generate batch code unik (contoh: BLAST-2026-0001)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const batchCode = `BLAST-${new Date().getFullYear()}-${randomSuffix}`;

    // 1. Insert Header Batch
    const { data: batch, error: batchErr } = await supabase
      .from('communication_batches')
      .insert({
        event_id: eventId,
        batch_code: batchCode,
        template_id: templateId,
        title,
        channel,
        status: 'PREVIEW',
        total_recipients: recipients.length,
        created_by: user?.id || null
      })
      .select()
      .single();

    if (batchErr) throw batchErr;

    // 2. Insert Recipient Items
    if (recipients.length > 0) {
      const recipientRows = recipients.map(r => ({
        batch_id: batch.id,
        person_id: r.person_id,
        registration_id: r.registration_id || null,
        ticket_id: r.ticket_id || null,
        certificate_id: r.certificate_id || null,
        recipient: r.email,
        variables: {
          full_name: r.full_name,
          ticket_code: r.ticket_code,
          certificate_no: r.certificate_no,
          verification_code: r.verification_code
        },
        status: 'NOT_SENT'
      }));

      const { error: recErr } = await supabase
        .from('communication_recipients')
        .insert(recipientRows);

      if (recErr) throw recErr;
    }

    return batch;
  },

  /**
   * APPROVAL GATE & QUEUE DISPATCHER
   * Menyetujui batch dan memasukkan seluruh penerima ke email_jobs
   */
  async approveAndQueueBatch(batchId) {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Ambil batch & template
    const { data: batch, error: bErr } = await supabase
      .from('communication_batches')
      .select(`
        *,
        message_templates (*)
      `)
      .eq('id', batchId)
      .single();

    if (bErr) throw bErr;

    // 2. Ambil penerima dengan status NOT_SENT
    const { data: recipients, error: rErr } = await supabase
      .from('communication_recipients')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'NOT_SENT');

    if (rErr) throw rErr;

    // 3. Masukkan ke email_jobs berpelindung idempotency
    const jobs = (recipients || []).map(r => ({
      batch_id: batchId,
      recipient_id: r.id,
      idempotency_key: `${batch.batch_code}:${r.person_id}`,
      type: batch.message_templates?.template_key || 'COMMUNICATION_BLAST',
      recipient: r.recipient,
      template: batch.message_templates?.template_key || 'DEFAULT',
      payload: r.variables,
      status: 'QUEUED'
    }));

    if (jobs.length > 0) {
      const { error: jobErr } = await supabase
        .from('email_jobs')
        .upsert(jobs, { onConflict: 'idempotency_key' });

      if (jobErr) throw jobErr;

      // Update status penerima menjadi QUEUED
      await supabase
        .from('communication_recipients')
        .update({ status: 'QUEUED' })
        .eq('batch_id', batchId)
        .eq('status', 'NOT_SENT');
    }

    // 4. Update Header Batch menjadi QUEUED
    const { data: updatedBatch, error: upErr } = await supabase
      .from('communication_batches')
      .update({
        status: 'QUEUED',
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        queued_count: jobs.length
      })
      .eq('id', batchId)
      .select()
      .single();

    if (upErr) throw upErr;
    return updatedBatch;
  },

  /**
   * Mengambil riwayat batch communication
   */
  async getBatches(eventId = null) {
    let query = supabase
      .from('communication_batches')
      .select(`
        *,
        message_templates (
          name,
          template_key,
          subject_template
        )
      `)
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil penerima dalam satu batch tertentu
   */
  async getBatchRecipients(batchId) {
    const { data, error } = await supabase
      .from('communication_recipients')
      .select(`
        *,
        persons (
          full_name,
          whatsapp,
          institution
        )
      `)
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * RETRY FAILED RECIPIENTS
   * Mengulang hanya recipient yang berstatus FAILED dalam batch
   */
  async retryFailedRecipients(batchId) {
    const { data: failedRecipients, error: fErr } = await supabase
      .from('communication_recipients')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'FAILED');

    if (fErr) throw fErr;
    if (!failedRecipients || failedRecipients.length === 0) return 0;

    // Reset status ke QUEUED
    const ids = failedRecipients.map(r => r.id);
    const { error: upErr } = await supabase
      .from('communication_recipients')
      .update({
        status: 'QUEUED',
        attempt_count: 0,
        error_message: null
      })
      .in('id', ids);

    if (upErr) throw upErr;

    // Update status email_jobs
    await supabase
      .from('email_jobs')
      .update({
        status: 'QUEUED',
        attempt_count: 0,
        last_error: null
      })
      .in('recipient_id', ids);

    return failedRecipients.length;
  }
};

export default communicationService;
