import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  FileSpreadsheet, 
  Phone, 
  ShieldCheck, 
  DollarSign, 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  LogIn, 
  RefreshCw, 
  CheckCircle2, 
  Save,
  MessageSquare,
  CreditCard,
  Plus,
  Building
} from 'lucide-react';
import { paymentAccountService } from '../services/paymentAccountService';

export default function ConfigModal({
  config,
  onSaveConfig,
  onTestConnection,
  onGoogleOAuthLogin,
  isTesting,
  hasGoogleToken
}) {
  const [activeTab, setActiveTab] = useState('google'); // 'google', 'hotline', 'finansial', 'dotenv'
  const [copiedKey, setCopiedKey] = useState(null);

  // Local Form State initialized from config or defaults
  const [formData, setFormData] = useState({
    spreadsheetId: config.spreadsheetId || '1rBCPX1klMKDeFKfrC8C7I_txb8Q2duD4TEfE3UmmGcI',
    tabRegistrasi: config.tabRegistrasi || 'DB_Registrasi_Webinar',
    clientId: config.clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: config.clientSecret || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',

    gasWebAppUrl: config.gasWebAppUrl || 'https://script.google.com/macros/s/AKfycbx_DIGNITI_GAS_DEPLOYMENT_ID/exec',
    adminPhone: config.adminPhone || '6289681077483',
    adminToken: config.adminToken || 'admin123',
    hargaIndividu: config.hargaIndividu || '100000',
    hargaMabar: config.hargaMabar || '500000',
    honorDiyah: config.honorDiyah || '2500000',
    honorWilly: config.honorWilly || '3500000',
    biayaZoom: config.biayaZoom || '250000',
    defaultSpeaker: config.defaultSpeaker || 'diyah'
  });

  // Payment Accounts State (Dinamis, Unseeded, Konfigurasi Admin)
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isAddingAcc, setIsAddingAcc] = useState(false);
  const [newAccData, setNewAccData] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    qr_code: ''
  });
  const [accMsg, setAccMsg] = useState('');

  useEffect(() => {
    if (activeTab === 'rekening') {
      loadAccounts();
    }
  }, [activeTab]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await paymentAccountService.getAllAccounts();
      setAccounts(data || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccData.bank_name || !newAccData.account_number) return;
    try {
      await paymentAccountService.createAccount(newAccData);
      setAccMsg('Rekening baru berhasil didaftarkan ke sistem');
      setNewAccData({
        account_name: '',
        bank_name: '',
        account_number: '',
        account_holder: '',
        qr_code: ''
      });
      setIsAddingAcc(false);
      loadAccounts();
      setTimeout(() => setAccMsg(''), 3000);
    } catch (err) {
      setAccMsg(`Gagal mendaftarkan rekening: ${err.message}`);
    }
  };

  const handleToggleAccount = async (id, currentActive) => {
    try {
      await paymentAccountService.toggleActive(id, !currentActive);
      loadAccounts();
    } catch (err) {
      console.warn('Gagal toggle rekening:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig(formData);
  };

  // Generate real-time .env text preview (Locked Architecture)
  const generatedDotEnv = `# ==============================================================================
# DIGNITY ADMIN COMMAND CENTER - ENVIRONMENT VARIABLES (.env)
# LPK Indonesia Dignity in Collaboration with KLTC®
# ==============================================================================

# Supabase (Single Source of Truth)
VITE_SUPABASE_URL=${import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co'}
VITE_SUPABASE_ANON_KEY=${import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'}

# Google OAuth
VITE_GOOGLE_CLIENT_ID=${formData.clientId || 'YOUR_GOOGLE_CLIENT_ID'}
GOOGLE_CLIENT_SECRET=${formData.clientSecret || 'YOUR_GOOGLE_CLIENT_SECRET'}

# Application
VITE_APP_URL=${import.meta.env.VITE_APP_URL || 'http://localhost:8080'}
`;

  const waLinks = [
    {
      title: 'Link Pendaftaran Individu (Rp 100k)',
      url: `https://wa.me/${formData.adminPhone}?text=${encodeURIComponent('Halo Admin LPK Dignity, saya ingin mendaftar Webinar "Mastering Stage Confidence" (14 Nov 2026):\n\n• Nama Lengkap: \n• Instansi/Kampus: \n• Domisili Kota: \n• Kategori: Tiket Individu (Rp 100.000)')}`
    },
    {
      title: 'Link Promo Mabar 6 Pax (Rp 500k)',
      url: `https://wa.me/${formData.adminPhone}?text=${encodeURIComponent('Halo Admin LPK Dignity, saya mau klaim PROMO MABAR (5+1 FREE) Webinar 14 Nov (6 Orang - Rp 500.000):\n\n• Nama Koordinator: \n• Instansi/Komunitas: \n• Domisili Kota: ')}`
    },
    {
      title: 'Link Konfirmasi Bukti Pembayaran',
      url: `https://wa.me/${formData.adminPhone}?text=${encodeURIComponent('Halo Admin LPK Dignity, saya sudah selesai mengisi formulir pendaftaran & upload bukti transfer webinar 14 Nov. Mohon verifikasi pembayaran saya ya.')}`
    },
    {
      title: 'Link Klaim Voucher Rebate Rp 100k',
      url: `https://wa.me/${formData.adminPhone}?text=${encodeURIComponent('Halo Admin LPK Dignity, saya alumni webinar 14 Nov dan ingin KLAIM VOUCHER REBATE Rp 100.000 untuk Bootcamp Offline Sala View Hotel Solo (12-13 Des 2026).')}`
    }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 font-display">
              Pengaturan Sistem &amp; Variabel Lingkungan (.env)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Menu Pengaturan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi terpusat untuk integrasi Google Cloud, Sheets API, WhatsApp CS Hotline, dan parameter keuangan webinar LPK Indonesia Dignity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('google')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'google'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheets &amp; Cloud OAuth</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hotline')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'hotline'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Phone className="w-3.5 h-3.5 text-amber-400" />
          <span>WhatsApp Hotline &amp; Keamanan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finansial')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'finansial'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-sky-400" />
          <span>Parameter Finansial &amp; Tiket</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekening')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'rekening'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
          <span>Rekening Pembayaran &amp; QRIS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dotenv')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'dotenv'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Code className="w-3.5 h-3.5 text-violet-400" />
          <span>File .env Generator (Live Code)</span>
        </button>
      </div>

      {/* Tab 1: Google Cloud & Sheets */}
      {activeTab === 'google' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Google Cloud Console &amp; Sheets API</span>
                </div>
                {hasGoogleToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>OAuth Aktif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-200 text-slate-700">
                    Belum Login OAuth
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_GOOGLE_SPREADSHEET_ID:
                </label>
                <input
                  type="text"
                  value={formData.spreadsheetId}
                  onChange={(e) => handleChange('spreadsheetId', e.target.value)}
                  placeholder="1rBCPX1klMKDeFKfrC8C7I_txb8Q2duD4TEfE3UmmGcI"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_GOOGLE_SHEETS_TAB_REGISTRASI:
                  </label>
                  <input
                    type="text"
                    value={formData.tabRegistrasi}
                    onChange={(e) => handleChange('tabRegistrasi', e.target.value)}
                    placeholder="DB_Registrasi_Webinar"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_GOOGLE_SHEETS_TAB_PRESENSI:
                  </label>
                  <input
                    type="text"
                    value={formData.tabPresensi}
                    onChange={(e) => handleChange('tabPresensi', e.target.value)}
                    placeholder="DB_Presensi_&_Sertifikat"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_GOOGLE_CLIENT_ID (OAuth 2.0 Web Client):
                </label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                  placeholder="413035723577-...apps.googleusercontent.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  GOOGLE_CLIENT_SECRET (Backend / Edge Function Only):
                </label>
                <input
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) => handleChange('clientSecret', e.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Tidak memakai prefix VITE_ demi keamanan — rahasia ini hanya untuk backend/Edge Function dan tidak diekspos ke browser.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_GOOGLE_API_KEY (Google Cloud API Key):
                </label>
                <input
                  type="text"
                  value={formData.googleApiKey}
                  onChange={(e) => handleChange('googleApiKey', e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_GOOGLE_APPS_SCRIPT_URL (GAS Web App Endpoint):
                </label>
                <input
                  type="text"
                  value={formData.gasWebAppUrl}
                  onChange={(e) => handleChange('gasWebAppUrl', e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
                >
                  Simpan Perubahan
                </button>

                <button
                  type="button"
                  onClick={onGoogleOAuthLogin}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Otorisasi Google</span>
                </button>

                <button
                  type="button"
                  onClick={onTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs transition-colors"
                >
                  {isTesting ? 'Menguji...' : 'Uji Koneksi'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Google Console Guidance */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pengaturan Wajib di Google Cloud Console</span>
              </div>
              <p className="text-[11.5px] text-slate-700 leading-relaxed">
                Agar login Google OAuth berhasil pada server lokal, pastikan URI berikut terdaftar di OAuth Client ID Anda:
              </p>
              
              <div className="space-y-2 bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Authorized JavaScript origins:</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <code className="text-emerald-700 font-mono text-xs font-semibold">http://localhost:8080</code>
                    <button 
                      type="button" 
                      onClick={() => handleCopy('http://localhost:8080', 'origin')}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Authorized redirect URIs:</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <code className="text-emerald-700 font-mono text-xs font-semibold">http://localhost:8080</code>
                    <button 
                      type="button" 
                      onClick={() => handleCopy('http://localhost:8080', 'redirect')}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-700 font-semibold text-xs hover:underline"
                >
                  <span>Buka Google Cloud Credentials Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Direct Spreadsheet Link */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Akses Cepat Spreadsheet Database</span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                Database tersinkronisasi dua arah secara live ke Google Sheets LPK Indonesia Dignity.
              </p>
              <a
                href={`https://docs.google.com/spreadsheets/d/${formData.spreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>Buka Google Spreadsheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Hotline & Security */}
      {activeTab === 'hotline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
                <Phone className="w-4 h-4 text-amber-600" />
                <span>Kontak &amp; Keamanan (.env)</span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_ADMIN_WHATSAPP (Nomor CS Hotline Webinar):
                </label>
                <input
                  type="text"
                  value={formData.adminPhone}
                  onChange={(e) => handleChange('adminPhone', e.target.value)}
                  placeholder="6289681077483"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Format internasional tanpa tanda plus atau strip (contoh: <code>6289681077483</code>).
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  VITE_ADMIN_API_TOKEN (Token Keamanan Admin):
                </label>
                <input
                  type="text"
                  value={formData.adminToken}
                  onChange={(e) => handleChange('adminToken', e.target.value)}
                  placeholder="admin123"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
                >
                  Simpan Kontak &amp; Token
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Generator Link Cepat WhatsApp
              </span>
            </div>

            <div className="space-y-2">
              {waLinks.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.url, `wa-${idx}`)}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-semibold px-2 py-0.5 rounded hover:bg-amber-50 transition-colors"
                    >
                      {copiedKey === `wa-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === `wa-${idx}` ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={item.url}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10.5px] font-mono text-slate-600"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Financial & Ticket Defaults */}
      {activeTab === 'finansial' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Parameter Finansial &amp; Tiket Default (.env)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_HARGA_TIKET_INDIVIDU:
                  </label>
                  <input
                    type="number"
                    value={formData.hargaIndividu}
                    onChange={(e) => handleChange('hargaIndividu', e.target.value)}
                    placeholder="100000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_HARGA_PROMO_MABAR (6 Pax):
                  </label>
                  <input
                    type="number"
                    value={formData.hargaMabar}
                    onChange={(e) => handleChange('hargaMabar', e.target.value)}
                    placeholder="500000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_HONOR_SPEAKER_DIYAH:
                  </label>
                  <input
                    type="number"
                    value={formData.honorDiyah}
                    onChange={(e) => handleChange('honorDiyah', e.target.value)}
                    placeholder="2500000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_HONOR_SPEAKER_WILLY:
                  </label>
                  <input
                    type="number"
                    value={formData.honorWilly}
                    onChange={(e) => handleChange('honorWilly', e.target.value)}
                    placeholder="3500000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_BIAYA_ZOOM_PRO:
                  </label>
                  <input
                    type="number"
                    value={formData.biayaZoom}
                    onChange={(e) => handleChange('biayaZoom', e.target.value)}
                    placeholder="250000"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    VITE_DEFAULT_SPEAKER:
                  </label>
                  <select
                    value={formData.defaultSpeaker}
                    onChange={(e) => handleChange('defaultSpeaker', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="diyah">Diyah Fitri (Honor Rp 2.500.000)</option>
                    <option value="willy">Willy Dharmawan (Honor Rp 3.500.000)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
                >
                  Simpan Parameter Finansial
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <span className="font-bold text-slate-800">Dampak Perubahan Parameter Finansial:</span>
              <ul className="list-disc pl-5 space-y-1.5 text-[11.5px] text-slate-600 leading-relaxed">
                <li>Nilai honor pembicara dan biaya Zoom Pro otomatis masuk ke perhitungan kalkulator laba bersih di tab <strong>Monitor Finansial (P&amp;L)</strong>.</li>
                <li>Harga tiket individu dan promo mabar dijadikan patokan saat penentuan status pembayaran pendaftar di spreadsheet.</li>
                <li>Semua perubahan tersimpan secara otomatis di browser dan aktif seketika tanpa perlu reload.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Rekening Pembayaran & QRIS (Dynamic, unseeded until client provides official details) */}
      {activeTab === 'rekening' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Manajemen Rekening Pembayaran Resmi (Client Config)</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Rekening bank &amp; QRIS tidak di-hardcode ke source code. Saat data resmi dari client (Mandiri, BCA, BNI, BSI, QRIS) siap, tinggal didaftarkan di sini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingAcc(!isAddingAcc)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingAcc ? 'Tutup Form' : 'Tambah Rekening'}</span>
            </button>
          </div>

          {accMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{accMsg}</span>
            </div>
          )}

          {/* Form Tambah Rekening */}
          {isAddingAcc && (
            <form onSubmit={handleCreateAccount} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <Building className="w-4 h-4 text-slate-700" />
                <span>Form Pendaftaran Rekening / Saluran Pembayaran</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Bank / Saluran:</label>
                  <input
                    type="text"
                    required
                    value={newAccData.bank_name}
                    onChange={(e) => setNewAccData(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="Contoh: Bank Mandiri / Bank BCA / QRIS"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Rekening / Merchant ID:</label>
                  <input
                    type="text"
                    required
                    value={newAccData.account_number}
                    onChange={(e) => setNewAccData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="Contoh: 138-00-2444747-8"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Pemilik Rekening (Atas Nama):</label>
                  <input
                    type="text"
                    required
                    value={newAccData.account_holder}
                    onChange={(e) => setNewAccData(prev => ({ ...prev, account_holder: e.target.value }))}
                    placeholder="Contoh: LPK Indonesia Dignity"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Label Rekening (Display Name):</label>
                  <input
                    type="text"
                    value={newAccData.account_name}
                    onChange={(e) => setNewAccData(prev => ({ ...prev, account_name: e.target.value }))}
                    placeholder="Contoh: Rekening Operasional Pelatihan"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAcc(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition"
                >
                  Simpan Rekening
                </button>
              </div>
            </form>
          )}

          {/* Daftar Rekening */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Daftar Rekening Terdaftar ({accounts.length})</span>
              <button
                type="button"
                onClick={loadAccounts}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingAccounts ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Memeriksa data rekening...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <p className="font-semibold text-slate-700">Belum ada rekening resmi yang di-seed.</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Sesuai kebijakan keamanan dan data integrity, rekening bank tidak di-hardcode ke sistem. Silakan daftarkan rekening Mandiri, BCA, BNI, BSI, atau QRIS setelah informasi resmi diterima dari client.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{acc.bank_name}</span>
                        <span className="font-mono text-slate-600">({acc.account_number})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          acc.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {acc.active ? 'AKTIF' : 'NON-AKTIF'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        a.n <strong>{acc.account_holder}</strong> • {acc.account_name || 'Rekening Pembayaran'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAccount(acc.id, acc.active)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition ${
                        acc.active
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {acc.active ? 'Non-aktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: DotEnv Live Generator & Code View */}
      {activeTab === 'dotenv' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-amber-600" />
                <span>Salinan Format Berkas .env Proyek</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nilai di bawah ini digenerate secara langsung dari form pengaturan Anda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(generatedDotEnv, 'dotenv-all')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
              >
                {copiedKey === 'dotenv-all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'dotenv-all' ? 'Tersalin ke Clipboard!' : 'Salin Format .env'}</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner">
            <pre className="overflow-x-auto whitespace-pre leading-relaxed text-[11.5px] selection:bg-amber-500/30">
              {generatedDotEnv}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
