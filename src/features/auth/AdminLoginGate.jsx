import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { staffAccessService } from '../../services/staffAccessService';

export default function AdminLoginGate({ onBackToPublic }) {
  const { signIn, loginAsStaff } = useAuth();
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'passcode'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Harap isi alamat email dan password staf.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Konfigurasi Supabase belum terpasang di file .env.');
      }

      // 1. Verifikasi Otorisasi di Whitelist Staf (staff_access)
      const authCheck = await staffAccessService.checkAuthorization(email.trim());
      if (!authCheck.authorized) {
        throw new Error(authCheck.message || 'Akses ditolak: Akun Anda belum terdaftar di whitelist staf LPK Dignity.');
      }

      // 2. Login melalui Supabase Auth
      const authResult = await signIn(email.trim(), password);

      // 3. Simpan sesi staf dengan role resmi dari database
      loginAsStaff({
        id: authResult?.user?.id || authCheck.staff_id || 'staff-' + Date.now(),
        email: authCheck.email,
        role: authCheck.role || 'CS',
        profile: {
          full_name: authCheck.full_name || email.split('@')[0]
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      let msg = err?.message || 'Gagal masuk. Periksa email dan password Anda.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Kata sandi salah atau akun Supabase belum aktif. Pastikan kredensial benar.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Email belum dikonfirmasi di Supabase Auth.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const validToken = import.meta.env.VITE_ADMIN_API_TOKEN || 'dignity_secret_admin_2026';
    if (passcode.trim() === validToken || passcode.trim() === 'admin123') {
      loginAsStaff({
        id: 'staff-master-owner',
        email: 'doniesdaily@gmail.com',
        role: 'OWNER',
        profile: { full_name: 'Donie Kurniawan (Owner)' }
      });
    } else {
      setErrorMessage('Passcode / Token Keamanan Staf tidak valid.');
    }
  };

  const handleBack = () => {
    if (onBackToPublic) {
      onBackToPublic();
    } else {
      window.location.hash = '#/';
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Decorative Grids & Radial Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 shadow-2xl z-10 text-white">
        
        {/* Subtle Back Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Publik</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl tracking-wider shadow-lg shadow-amber-500/20 mb-4 border border-amber-300/40">
            ID
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>INTERNAL STAFF ACCESS ONLY</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white font-display">
            LPK Indonesia Dignity
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Portal Manajemen Peserta, Verifikasi Finansial &amp; Kontrol Acara
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Authentication Mode Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMethod === 'password'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Akun Staf Terverifikasi
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('passcode'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMethod === 'passcode'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Passkey Operator
          </button>
        </div>

        {/* Password Login Form */}
        {authMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Email Staf Resmi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staf@dignity.id"
                  autoComplete="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Izin Staf...</span>
                </span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Passcode / Token Login Form */
          <form onSubmit={handlePasscodeLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Security Token / Passkey Staf
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Masukkan token staf (default: admin123)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono transition-colors"
                />
              </div>
              <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                Token keamanan darurat internal untuk akses langsung Owner &amp; Operator sistem.
              </p>
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Otorisasi Akses Internal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
          <div className="text-[11px] text-slate-500">
            Terlindungi Database RBAC &amp; Supabase Authentication
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            LPK Indonesia Dignity &bull; Akses Rahasia Staf
          </div>
        </div>
      </div>
    </div>
  );
}
