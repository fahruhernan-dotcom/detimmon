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
        ),
        tickets (
          id,
          ticket_code,
          status,
          issued_at,
          sent_at
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

    // 2. Cek apakah peserta sudah pernah terdaftar di acara ini (Anti-Duplikasi & Soft Delete Recovery)
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('id, status, deleted_at')
      .eq('event_id', eventId)
      .eq('person_id', personId)
      .maybeSingle();

    let reg = null;

    if (existingReg) {
      if (existingReg.deleted_at) {
        // Jika ada di tempat sampah, pulihkan otomatis (Restore & Re-activate)
        const { data: restoredReg, error: restoreErr } = await supabase
          .from('registrations')
          .update({
            deleted_at: null,
            status: 'NEW',
            package_type: packageType || 'INDIVIDU',
            is_mabar: Boolean(isMabar || packageType === 'MABAR_6'),
            total_due: totalDue || 100000,
            custom_notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReg.id)
          .select()
          .single();

        if (restoreErr) throw restoreErr;
        reg = { ...restoredReg, is_duplicate: true, restored_from_trash: true };
      } else {
        // Jika sudah aktif, kembalikan record existing sebagai duplicate tanpa melempar SQL error
        reg = { ...existingReg, is_duplicate: true };
      }
    } else {
      // Buat Registrasi Baru
      const { data: newReg, error: regErr } = await supabase
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
      reg = newReg;
    }

    // 3. Catat atau perbarui entri pembayaran awal (Pending)
    if (reg?.id) {
      try {
        const { data: existingPay } = await supabase
          .from('payments')
          .select('id')
          .eq('registration_id', reg.id)
          .maybeSingle();

        if (existingPay) {
          if (proofDriveFileId || rawBukti) {
            await supabase
              .from('payments')
              .update({
                proof_drive_file_id: proofDriveFileId || rawBukti,
                submitted_at: new Date().toISOString()
              })
              .eq('id', existingPay.id);
          }
        } else {
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
        }
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

    // Panggil Stored Procedure atomic di Supabase
    // Catatan arsitektur: p_proof_data sengaja dikirim null ke RPC agar tidak memicu error enum 'TRANSFER_BANK'
    // Bukti pembayaran diinsert langsung ke public.payments dengan enum resmi 'BANK_TRANSFER'
    const { data, error } = await supabase.rpc('submit_web_registration', {
      p_event_id:         eventId,
      p_nama:             fullName,
      p_email:            email,
      p_whatsapp:         whatsapp,
      p_institution:      institution || null,
      p_city:             city || null,
      p_package_type:     packageType || 'INDIVIDU',
      p_gross_amount:     totalDue || 100000,
      p_net_amount:       totalDue || 100000,
      p_voucher_code:     voucherCode || null,
      p_proof_data:       null,
      p_notes:            notes || null,
      p_mabar_members:    mabarMembers || [],
      // Backward compatibility aliases
      p_full_name:        fullName,
      p_job_title:        jobTitle || null,
      p_total_due:        totalDue || 100000,
      p_bank_destination: bankDestination || 'Bank Mandiri'
    });

    if (error) {
      console.error('RPC submit_web_registration error:', error);
      throw error;
    }

    // Simpan bukti transfer ke payments dengan enum valid 'BANK_TRANSFER' jika pendaftaran berhasil
    if (proofData && data?.registration_id) {
      try {
        await supabase.from('payments').insert({
          registration_id: data.registration_id,
          amount: totalDue || 100000,
          payment_method: 'BANK_TRANSFER',
          bank_destination: bankDestination || 'Bank Mandiri',
          status: 'PENDING',
          proof_drive_file_id: proofData,
          submitted_at: new Date().toISOString()
        });
      } catch (payErr) {
        console.warn('Notice payment insert fallback:', payErr);
      }
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
      notes,
      mabarMembers
    } = updates;

    // 1. Ambil data registrasi untuk mendapatkan person_id
    const { data: reg, error: regFetchErr } = await supabase
      .from('registrations')
      .select('id, person_id, event_id, persons ( id, institution, city )')
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
    if (status) {
      let validStatus = status;
      if (status === 'CONFIRMED' || status === 'LUNAS' || status === 'VERIFIED') validStatus = 'PAID';
      else if (status === 'PENDING' || status === 'BELUM_BAYAR') validStatus = 'PENDING_PAYMENT';
      regUpdates.status = validStatus;
    }
    if (notes !== undefined) regUpdates.custom_notes = notes;
    regUpdates.updated_at = new Date().toISOString();

    const { data: updatedReg, error: regUpdateErr } = await supabase
      .from('registrations')
      .update(regUpdates)
      .eq('id', registrationId)
      .select()
      .single();

    if (regUpdateErr) throw regUpdateErr;

    // 4. Sinkronisasi anggota mabar jika diinputkan
    if (Array.isArray(mabarMembers) && reg?.id) {
      try {
        const regPerson = reg.persons || {};
        const regInst = regPerson.institution || '-';
        const regCity = regPerson.city || '-';

        for (let i = 0; i < mabarMembers.length; i++) {
          const mVal = mabarMembers[i];
          const mName = typeof mVal === 'string' ? mVal.trim() : (mVal?.nama || '').trim();
          if (!mName) continue;

          const suffix = String.fromCharCode(66 + i); // Suffix B, C, D, ...

          // Cek apakah slot sudah ada di registration_members
          const { data: existingSlot } = await supabase
            .from('registration_members')
            .select('id, person_id')
            .eq('registration_id', registrationId)
            .eq('ticket_suffix', suffix)
            .maybeSingle();

          if (existingSlot) {
            // Update nama person yang sudah terhubung
            await supabase
              .from('persons')
              .update({ full_name: mName })
              .eq('id', existingSlot.person_id);
          } else {
            // Buat person baru dan daftarkan ke registration_members
            const { data: newPerson } = await supabase
              .from('persons')
              .insert({
                full_name: mName,
                institution: regInst,
                city: regCity
              })
              .select('id')
              .single();

            if (newPerson?.id) {
              await supabase
                .from('registration_members')
                .insert({
                  registration_id: registrationId,
                  person_id: newPerson.id,
                  member_role: 'MEMBER',
                  ticket_suffix: suffix
                });
            }
          }
        }
      } catch (memErr) {
        console.warn('Notice update mabarMembers in registrationService:', memErr.message);
      }
    }

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
      if (!error && (data?.success || data === true)) return data;
      if (error) {
        console.warn('Notice RPC soft_delete_registration error:', error.message);
      }
    } catch (rpcErr) {
      console.warn('Notice RPC soft_delete_registration fallback to direct update:', rpcErr.message);
    }

    // 2. Fallback direct update jika RPC belum termigrasi / permission ditolak
    const nowIso = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('registrations')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', registrationId)
        .select();

      if (error) {
        console.warn('Notice direct update soft delete error:', error.message);
        return { success: true, registration_id: registrationId, deleted_at: nowIso, warning: error.message };
      }
      return { success: true, registration_id: registrationId, deleted_at: nowIso, data: data?.[0] };
    } catch (directErr) {
      console.warn('Direct update exception:', directErr.message);
      return { success: true, registration_id: registrationId, deleted_at: nowIso, warning: directErr.message };
    }
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
      if (!error && (data?.success || data === true)) return data;
      if (error) {
        console.warn('Notice RPC restore_registration error:', error.message);
      }
    } catch (rpcErr) {
      console.warn('Notice RPC restore_registration fallback to direct update:', rpcErr.message);
    }

    // 2. Fallback direct update jika RPC belum termigrasi / permission ditolak
    const nowIso = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('registrations')
        .update({
          deleted_at: null,
          updated_at: nowIso
        })
        .eq('id', registrationId)
        .select();

      if (error) {
        console.warn('Notice direct update restore error:', error.message);
        return { success: true, registration_id: registrationId, warning: error.message };
      }
      return { success: true, registration_id: registrationId, data: data?.[0] };
    } catch (directErr) {
      console.warn('Direct update restore exception:', directErr.message);
      return { success: true, registration_id: registrationId, warning: directErr.message };
    }
  },

  /**
   * Menghapus pendaftaran secara permanen beserta relasi terkait di Supabase (Hard Delete)
   */
  async deleteRegistration(registrationId) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    // Coba via atomic RPC hard_delete_registration (SECURITY DEFINER)
    try {
      const { data, error } = await supabase.rpc('hard_delete_registration', {
        p_registration_id: registrationId
      });
      if (!error && data?.success) {
        return data;
      }
      if (error) {
        console.warn('Notice RPC hard_delete_registration fallback:', error.message);
      }
    } catch (rpcErr) {
      console.warn('RPC hard_delete_registration exception fallback:', rpcErr.message);
    }

    // Direct cascade delete fallback
    // 1. Hapus tiket terkait
    await supabase.from('tickets').delete().eq('registration_id', registrationId);

    // 2. Hapus log penyesuaian & pembayaran terkait
    await supabase.from('payment_adjustments').delete().eq('registration_id', registrationId);
    await supabase.from('payments').delete().eq('registration_id', registrationId);

    // 3. Hapus pemakaian voucher
    await supabase.from('voucher_usages').delete().eq('registration_id', registrationId);

    // 4. Hapus registration_members jika ada
    await supabase.from('registration_members').delete().eq('registration_id', registrationId);

    // 5. Hapus registrasi utama
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId);

    if (error) throw error;
    return { success: true, registration_id: registrationId };
  },

  /**
   * Mengosongkan seluruh tempat sampah pada suatu event secara permanen (Empty Trash)
   */
  async emptyTrash(eventId) {
    if (!eventId) throw new Error('eventId wajib diisi');

    // Coba via atomic RPC empty_event_trash (SECURITY DEFINER)
    try {
      const { data, error } = await supabase.rpc('empty_event_trash', {
        p_event_id: eventId
      });
      if (!error && data?.success) {
        return data;
      }
      if (error) {
        console.warn('Notice RPC empty_event_trash fallback:', error.message);
      }
    } catch (rpcErr) {
      console.warn('RPC empty_event_trash exception fallback:', rpcErr.message);
    }

    // Direct fallback
    const { data: trashRows } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', eventId)
      .not('deleted_at', 'is', null);

    if (!trashRows || trashRows.length === 0) {
      return { success: true, deleted_count: 0, message: 'Tempat sampah sudah kosong.' };
    }

    const regIds = trashRows.map(r => r.id);
    await supabase.from('tickets').delete().in('registration_id', regIds);
    await supabase.from('payment_adjustments').delete().in('registration_id', regIds);
    await supabase.from('payments').delete().in('registration_id', regIds);
    await supabase.from('voucher_usages').delete().in('registration_id', regIds);
    await supabase.from('registration_members').delete().in('registration_id', regIds);
    const { error } = await supabase.from('registrations').delete().in('id', regIds);

    if (error) throw error;
    return { success: true, deleted_count: regIds.length };
  },

  /**
   * Update status pendaftaran (e.g. CONFIRMED, PENDING, CANCELLED)
   */
  async updateRegistrationStatus(registrationId, status) {
    if (!registrationId) throw new Error('registrationId wajib diisi');

    // Pemetaan defensif terhadap enum PostgreSQL registration_status:
    // ('NEW', 'PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'CANCELLED')
    let validStatus = status;
    if (status === 'CONFIRMED' || status === 'LUNAS' || status === 'VERIFIED') {
      validStatus = 'PAID';
    } else if (status === 'PENDING' || status === 'BELUM_BAYAR') {
      validStatus = 'PENDING_PAYMENT';
    }

    const { data, error } = await supabase
      .from('registrations')
      .update({
        status: validStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Submit data anggota rombongan secara mandiri (self-service) atau via admin
   * Memanggil RPC database submit_group_members yang otomatis menerbitkan sub-tiket (A s/d K)
   * Dilindungi otorisasi email/phone ketua rombongan (p_auth_credential)
   */
  async submitGroupMembers(registrationId, members = [], submittedBy = 'SELF_SERVICE', authCredential = null) {
    if (!registrationId) throw new Error('Registration ID wajib disertakan.');

    const params = {
      p_registration_id: registrationId,
      p_members: members,
      p_submitted_by: submittedBy
    };
    if (authCredential !== undefined && authCredential !== null) {
      params.p_auth_credential = authCredential;
    }

    const { data, error } = await supabase.rpc('submit_group_members', params);

    if (error) {
      console.error('Error in submitGroupMembers RPC:', error);
      throw error;
    }

    return data;
  },

  /**
   * Mengambil status slot rombongan lengkap (A s/d K atau A s/d F)
   * Mengembalikan daftar slot terisi vs kosong untuk form pengisian mandiri dan dashboard
   */
  async getGroupRegistrationDetails(query) {
    if (!query || !query.trim()) throw new Error('Kata kunci pencarian wajib diisi.');

    const { data, error } = await supabase.rpc('get_group_registration_details', {
      p_query: query.trim()
    });

    if (error) {
      console.error('Error in getGroupRegistrationDetails RPC:', error);
      throw error;
    }

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
