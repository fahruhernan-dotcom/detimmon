import { supabase } from '../lib/supabaseClient';

export const paymentService = {
  /**
   * Mengambil riwayat pembayaran per pendaftaran
   */
  async getPayments(registrationId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('registration_id', registrationId)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Verifikasi pembayaran oleh tim Finance
   */
  async verifyPayment(paymentId, notes = '') {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        verified_by: user?.id || null,
        notes: notes || null
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Sinkronkan status registrasi ke PAID jika ada registration_id
    if (data?.registration_id) {
      try {
        await supabase
          .from('registrations')
          .update({
            status: 'PAID',
            updated_at: new Date().toISOString()
          })
          .eq('id', data.registration_id);
      } catch (regErr) {
        console.warn('Notice sync registration status to PAID:', regErr.message);
      }
    }

    return data;
  },

  /**
   * Menolak bukti pembayaran
   */
  async rejectPayment(paymentId, reason = '') {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'REJECTED',
        verified_at: new Date().toISOString(),
        verified_by: user?.id || null,
        notes: reason || 'Bukti transfer tidak valid'
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Menambahkan pembayaran baru (Cicilan / DP / Pelunasan)
   */
  async addPayment({
    registrationId,
    amount,
    paymentMethod = 'BANK_TRANSFER',
    bankDestination = '',
    proofDriveFileId = null,
    notes = '',
    status = 'PENDING'
  }) {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        registration_id: registrationId,
        amount: Number(amount),
        payment_method: paymentMethod,
        bank_destination: bankDestination || null,
        proof_drive_file_id: proofDriveFileId || null,
        notes: notes || null,
        status: status,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mengambil daftar penyesuaian saldo (diskon / tambahan / refund)
   */
  async getAdjustments(registrationId) {
    const { data, error } = await supabase
      .from('payment_adjustments')
      .select('*')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil kalkulasi ledger resmi dari view v_registration_ledger
   */
  async getRegistrationLedger(registrationId) {
    try {
      const { data, error } = await supabase
        .from('v_registration_ledger')
        .select('*')
        .eq('registration_id', registrationId)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Menambahkan penyesuaian saldo (diskon / biaya tambahan / refund) oleh Finance
   */
  async addAdjustment({ registrationId, amount, adjustmentType, reason }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('payment_adjustments')
      .insert({
        registration_id: registrationId,
        amount: Number(amount),
        adjustment_type: adjustmentType,
        reason,
        created_by: user?.id || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export default paymentService;
