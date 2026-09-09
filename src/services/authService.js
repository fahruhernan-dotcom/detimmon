import { supabase } from '../lib/supabaseClient';

export const authService = {
  /**
   * Login menggunakan Supabase Auth
   */
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  /**
   * Logout
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Mendapatkan sesi aktif saat ini
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Membaca profil pengguna dari tabel profiles
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Membaca peran pengguna dari tabel user_roles dan roles
   */
  async getUserRole(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.roles?.name || 'VIEWER';
  }
};

export default authService;
