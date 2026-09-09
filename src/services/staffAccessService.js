import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const staffAccessService = {
  /**
   * Cek otorisasi staf berdasarkan email
   */
  async checkAuthorization(email) {
    if (!email) return { authorized: false, message: 'Email wajib diisi.' };
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      // Fallback dev mode jika Supabase belum terpasang
      if (cleanEmail === 'doniesdaily@gmail.com' || cleanEmail.includes('admin')) {
        return {
          authorized: true,
          email: cleanEmail,
          full_name: 'Donie Kurniawan (Owner)',
          role: 'OWNER',
          message: 'Mode Pengembang Lokal diizinkan.'
        };
      }
      return { authorized: false, message: 'Supabase belum terkonfigurasi.' };
    }

    try {
      // 1. Coba via Stored Procedure check_staff_authorization
      const { data, error } = await supabase.rpc('check_staff_authorization', {
        p_email: cleanEmail
      });

      if (!error && data) {
        return data;
      }

      // 2. Fallback query langsung ke tabel staff_access
      const { data: staff, error: directErr } = await supabase
        .from('staff_access')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (directErr || !staff) {
        return {
          authorized: false,
          message: `Akses ditolak. Email "${cleanEmail}" belum terdaftar sebagai staf resmi LPK Dignity.`
        };
      }

      if (!staff.is_active) {
        return {
          authorized: false,
          message: 'Akses dinonaktifkan. Akun Anda sedang ditangguhkan oleh Administrator.'
        };
      }

      return {
        authorized: true,
        staff_id: staff.id,
        email: staff.email,
        full_name: staff.full_name,
        role: staff.role,
        message: 'Otorisasi berhasil.'
      };
    } catch (err) {
      console.error('Error saat memeriksa otorisasi staf:', err);
      return {
        authorized: false,
        message: err.message || 'Gagal memverifikasi izin staf.'
      };
    }
  },

  /**
   * Ambil seluruh daftar staf resmi
   */
  async getAllStaff() {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('staff_access')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Gagal membaca staff_access:', error.message);
      return [];
    }
    return data || [];
  },

  /**
   * Tambah staf baru ke whitelist
   */
  async addStaff({ email, full_name, role = 'CS', notes = '' }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum terkonfigurasi.');

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('staff_access')
      .insert({
        email: cleanEmail,
        full_name: full_name.trim(),
        role,
        is_active: true,
        notes: notes.trim()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Perbarui status atau peran staf
   */
  async updateStaff(id, updates) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum terkonfigurasi.');

    const { data, error } = await supabase
      .from('staff_access')
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
   * Hapus staf dari whitelist
   */
  async deleteStaff(id) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum terkonfigurasi.');

    const { error } = await supabase
      .from('staff_access')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

export default staffAccessService;
