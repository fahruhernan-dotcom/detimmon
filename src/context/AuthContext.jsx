import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dignity_staff_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('OWNER'); // Default fallback for local dev
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Ambil sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserDetails(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Pasang listener status auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserDetails(session.user.id);
      } else {
        // Only clear if not logged in via staff session
        const staffSession = localStorage.getItem('dignity_staff_session');
        if (!staffSession) {
          setUser(null);
          setProfile(null);
          setRole('VIEWER');
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserDetails(userId) {
    try {
      const [userProfile, userRole] = await Promise.all([
        authService.getProfile(userId).catch(() => null),
        authService.getUserRole(userId).catch(() => 'VIEWER')
      ]);
      setProfile(userProfile);
      setRole(userRole);
    } catch (err) {
      console.warn('Gagal memuat profil pengguna:', err);
    } finally {
      setLoading(false);
    }
  }

  const loginAsStaff = (staffData) => {
    setUser(staffData);
    setRole(staffData.role || 'OWNER');
    setProfile(staffData.profile || { full_name: staffData.email });
    try {
      localStorage.setItem('dignity_staff_session', JSON.stringify(staffData));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('dignity_staff_session');
      await authService.signOut().catch(() => {});
    } finally {
      setUser(null);
      setProfile(null);
      setRole('VIEWER');
    }
  };

  const value = {
    user,
    profile,
    role,
    loading,
    isOwner: role === 'OWNER',
    isAdmin: role === 'ADMIN' || role === 'OWNER',
    isFinance: role === 'FINANCE' || role === 'OWNER',
    isCS: role === 'CS' || role === 'OWNER',
    isEventManager: role === 'EVENT_MANAGER' || role === 'OWNER',
    isConfigured: isSupabaseConfigured(),
    signIn: authService.signIn,
    loginAsStaff,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}

export default AuthContext;
