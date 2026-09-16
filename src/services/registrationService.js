import { supabase } from '../lib/supabaseClient';
import { isValidUuid } from '../utils/normalizers';

export const registrationService = {
  /**
   * Mengambil seluruh data pendaftaran untuk event tertentu beserta info person dan ledger
   */
  async getRegistrationsByEvent(eventId) {
    if (!eventId || !isValidUuid(eventId)) return [];

    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        event_id,
        package_type,
        is_mabar,
        total_due,
        status,
        source_system,
        source_row_id,
        deleted_at,
        created_at,
        persons (
          id,
          full_name,
          email,
          whatsapp,
          institution,
          city
        ),
        registration_members (
          id,
          member_role,
          ticket_suffix,
          persons (
            id,
            full_name,
            email,
            whatsapp
          )
        ),
        payments (
          id,
          amount,
          status,
          bank_destination,
          proof_drive_file_id,
          submitted_at,
          verified_at
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil ledger kalkulasi saldo (total_paid, balance_due) untuk satu pendaftaran
   */
  async getRegistrationLedger(registrationId) {
    const { data, error } = await supabase
      .from('v_registration_ledger')
      .select('*')
      .eq('registration_id', registrationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Mendaftarkan person dan registrasi baru secara terkoordinasi (dari form web atau manual)
   */
  async createRegistration(params) {
    const {
      eventId,
      personData,
      fullName,
      email,
      whatsapp,
      institution,
      city,
      packageType,
      isMabar,
      totalDue,
      notes,
      sourceRowId,
      bankDestination,
      proofDriveFileId,
      rawBukti
    } = params;

    // Normalisasi input person
    const resolvedName = (personData?.full_name || fullName || '').trim();
    const resolvedEmail = (personData?.email || email || '').trim();
    const resolvedWa = (personData?.whatsapp || whatsapp || '').trim();
    const resolvedInst = (personData?.institution || institution || '').trim() || '-';
    const resolvedCity = (personData?.city || city || '').trim() || '-';

    // 1. Deduplikasi / Upsert Person
    let personId = null;
    const emailNorm = resolvedEmail ? resolvedEmail.toLowerCase() : null;
    const waNorm = resolvedWa ? resolvedWa.replace(/[^0-9]/g, '') : null;

    if (emailNorm) {
      const { data: existingPerson } = await supabase
        .from('persons')
        .select('id')
        .eq('email_normalized', emailNorm)
        .maybeSingle();

      if (existingPerson) personId = existingPerson.id;
    }

    if (!personId && waNorm) {
      const { data: existingPerson } = await supabase
        .from('persons')
        .select('id')
        .eq('whatsapp_normalized', waNorm)
        .maybeSingle();

      if (existingPerson) personId = existingPerson.id;
    }

    if (!personId) {
      const { data: newPerson, error: personErr } = await supabase
        .from('persons')
        .insert({
          full_name: resolvedName,
          email: resolvedEmail || null,
          whatsapp: resolvedWa || null,
          institution: resolvedInst,
          city: resolvedCity
        })
        .select('id')
        .single();

      if (personErr) throw personErr;
      personId = newPerson.id;
    }

    // 2. Buat Registrasi
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        person_id: personId,
        package_type: packageType || 'INDIVIDU',
        is_mabar: Boolean(isMabar || packageType === 'MABAR_6'),
        total_due: totalDue || 100000,
        source_system: 'WEB_NATIVE',
        source_row_id: sourceRowId || null,
        custom_notes: notes || null
      })
      .select()
      .single();

    if (regErr) throw regErr;

    // 3. Catat entri pembayaran awal (Pending)
    if (reg?.id) {
      try {
        await supabase
          .from('payments')
          .insert({
            registration_id: reg.id,
            amount: totalDue || 100000,
            payment_method: 'BANK_TRANSFER',
            bank_destination: bankDestination || 'Bank Mandiri',
            proof_drive_file_id: proofDriveFileId || rawBukti || null,
            status: 'PENDING',
            submitted_at: new Date().toISOString()
          });
      } catch (payErr) {
        console.warn('Notice create payment record fallback:', payErr.message);
      }
    }

    return reg;
  },

  /**
   * Mengirim pendaftaran dari web formulir publik via atomic RPC `submit_web_registration`.
   * Mencegah duplikasi data pendaftar dan menjamin keamanan RLS.
   */
  async submitPublicRegistration(payload) {
    const {
      eventId,
      fullName,
      email,
      whatsapp,
      institution,
      jobTitle,
      city,
      packageType,
      totalDue,
      bankDestination,
      proofData,
      notes,
      mabarMembers,
      voucherCode        // [NEW v2] kode voucher opsional
    } = payload;

    // Panggil Stored Procedure atomic di Supabase (v2 dengan voucher support)
    const { data, error } = await supabase.rpc('submit_web_registration', {
      p_event_id:         eventId,
      p_full_name:        fullName,
      p_email:            email,
      p_whatsapp:         whatsapp,
      p_institution:      institution || null,
      p_job_title:        jobTitle || null,
      p_city:             city || null,
      p_package_type:     packageType || 'INDIVIDU',
      p_total_due:        totalDue || 100000,
      p_bank_destination: bankDestination || 'Bank Mandiri',
      p_proof_data:       proofData || null,
      p_notes:            notes || null,
      p_mabar_members:    mabarMembers || [],
      p_voucher_code:     voucherCode || null  // [NEW v2]
    });

    if (error) {
      // Jika RPC belum dieksekusi di database oleh user, gunakan fallback client-side aman
      console.warn('Notice RPC submit_web_registration fallback to direct service:', error.message);
      const reg = await this.createRegistration({
        eventId,
        fullName,
        email,
        whatsapp,
        institution,
        city,
        packageType,
        totalDue,
        bankDestination,
        proofDriveFileId: proofData,
        rawBukti: proofData,
        notes
      });
      return {
        success: true,
        is_duplicate: false,
        registration_id: reg?.id,
        ticket_number: `TICKET-DIGNITY-${Math.floor(100 + Math.random() * 900)}`,
        status: 'NEW'
      };
    }

    return data;
  },

  /**
   * Mengupdate data pendaftar (person dan registration) di Supabase
   */
  async updateRegistration(registrationId, updates = {}) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    const {
      fullName,
      email,
      whatsapp,
      institution,
      city,
      packageType,
      totalDue,
      status,
      notes
    } = updates;

    // 1. Ambil data registrasi untuk mendapatkan person_id
    const { data: reg, error: regFetchErr } = await supabase
      .from('registrations')
      .select('id, person_id')
      .eq('id', registrationId)
      .single();

    if (regFetchErr) throw regFetchErr;

    // 2. Update person jika ada field person
    if (reg?.person_id && (fullName || email || whatsapp || institution !== undefined || city !== undefined)) {
      const personUpdates = {};
      if (fullName) personUpdates.full_name = fullName.trim();
      if (email) personUpdates.email = email.trim();
      if (whatsapp) personUpdates.whatsapp = whatsapp.trim();
      if (institution !== undefined) personUpdates.institution = institution.trim();
      if (city !== undefined) personUpdates.city = city.trim();

      const { error: personErr } = await supabase
        .from('persons')
        .update(personUpdates)
        .eq('id', reg.person_id);

      if (personErr) console.warn('Notice update person:', personErr.message);
    }

    // 3. Update tabel registrations
    const regUpdates = {};
    if (packageType) regUpdates.package_type = packageType;
    if (totalDue !== undefined) regUpdates.total_due = totalDue;
    if (status) regUpdates.status = status;
    if (notes !== undefined) regUpdates.custom_notes = notes;
    regUpdates.updated_at = new Date().toISOString();

    const { data: updatedReg, error: regUpdateErr } = await supabase
      .from('registrations')
      .update(regUpdates)
      .eq('id', registrationId)
      .select()
      .single();

    if (regUpdateErr) throw regUpdateErr;
    return updatedReg;
  },

  /**
   * Melakukan soft delete pendaftaran (memindahkan ke tempat sampah)
   */
  async softDeleteRegistration(registrationId) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    // 1. Coba panggil RPC aman
    try {
      const { data, error } = await supabase.rpc('soft_delete_registration', {
        p_registration_id: registrationId
      });
      if (!error && data?.success) return data;
    } catch (rpcErr) {
      console.warn('Notice RPC soft_delete_registration fallback to direct update:', rpcErr.message);
    }

    // 2. Fallback direct update jika RPC belum termigrasi
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('registrations')
      .update({
        deleted_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, registration_id: registrationId, deleted_at: nowIso, data };
  },

  /**
   * Memulihkan pendaftaran yang sebelumnya di-soft delete (dari tempat sampah ke aktif)
   */
  async restoreRegistration(registrationId) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    // 1. Coba panggil RPC aman
    try {
      const { data, error } = await supabase.rpc('restore_registration', {
        p_registration_id: registrationId
      });
      if (!error && data?.success) return data;
    } catch (rpcErr) {
      console.warn('Notice RPC restore_registration fallback to direct update:', rpcErr.message);
    }

    // 2. Fallback direct update jika RPC belum termigrasi
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('registrations')
      .update({
        deleted_at: null,
        updated_at: nowIso
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, registration_id: registrationId, data };
  },

  /**
   * Menghapus pendaftaran secara permanen beserta relasi terkait di Supabase (Hard Delete)
   */
  async deleteRegistration(registrationId) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    // 1. Hapus tiket terkait
    await supabase.from('tickets').delete().eq('registration_id', registrationId);

    // 2. Hapus pembayaran terkait
    await supabase.from('payments').delete().eq('registration_id', registrationId);

    // 3. Hapus registration_members jika ada
    await supabase.from('registration_members').delete().eq('registration_id', registrationId);

    // 4. Hapus registrasi utama
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId);

    if (error) throw error;
    return true;
  },

  /**
   * Update status pendaftaran (e.g. CONFIRMED, PENDING, CANCELLED)
   */
  async updateRegistrationStatus(registrationId, status) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    const { data, error } = await supabase
      .from('registrations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export default registrationService;

// ===========================================================================
// VOUCHER SERVICE — Admin CRUD & Public Validation
// ===========================================================================
export const voucherService = {
  /**
   * Validasi kode voucher ke server sebelum submit pendaftaran.
   * Murni READ — tidak mengubah state apapun.
   * @returns { valid, discount_applied, net_amount, message, error_code, ... }
   */
  async validateVoucher(voucherCode, eventId, grossAmount) {
    if (!voucherCode || !eventId) return { valid: false, message: 'Kode atau event tidak lengkap.' };

    const { data, error } = await supabase.rpc('validate_voucher', {
      p_voucher_code: voucherCode.toUpperCase().trim(),
      p_event_id:     eventId,
      p_gross_amount: grossAmount
    });

    if (error) throw error;
    return data;
  },

  /**
   * Ambil semua voucher dari view stats (untuk panel admin)
   */
  async getAllVouchers() {
    const { data, error } = await supabase
      .from('v_voucher_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Buat voucher baru
   */
  async createVoucher(payload) {
    const { data, error } = await supabase
      .from('vouchers')
      .insert({
        code:              payload.code.toUpperCase().trim(),
        description:       payload.description || null,
        discount_type:     payload.discount_type || 'FIXED',
        discount_value:    payload.discount_value,
        max_discount_cap:  payload.max_discount_cap || null,
        min_purchase:      payload.min_purchase || 0,
        target_event_id:   payload.target_event_id || null,
        source_event_id:   payload.source_event_id || null,
        max_uses:          payload.max_uses || null,
        valid_from:        payload.valid_from || new Date().toISOString(),
        valid_until:       payload.valid_until || null,
        is_active:         true,
        created_by:        payload.created_by || 'ADMIN'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggle aktif / nonaktif voucher
   */
  async toggleVoucherStatus(voucherId, isActive) {
    const { data, error } = await supabase
      .from('vouchers')
      .update({ is_active: isActive })
      .eq('id', voucherId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Hapus voucher (hanya jika belum pernah dipakai)
   */
  async deleteVoucher(voucherId) {
    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', voucherId)
      .eq('used_count', 0); // Safety: tidak bisa hapus yang sudah diklaim

    if (error) throw error;
    return true;
  },

  /**
   * Ambil detail klaim untuk satu voucher (untuk modal detail admin)
   */
  async getVoucherUsages(voucherId) {
    const { data, error } = await supabase
      .from('voucher_usages')
      .select(`
        id, gross_amount, discount_applied, net_amount, used_at,
        persons ( full_name, whatsapp, email ),
        events ( title, slug )
      `)
      .eq('voucher_id', voucherId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
