import React, { useState, useEffect } from 'react';
import {
  Globe,
  SlidersHorizontal,
  Link2,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Folder,
  CreditCard,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Smartphone,
  Eye,
  QrCode,
  Key
} from 'lucide-react';
import { useEvent, DEFAULT_WEB_REGISTRATION_CONFIG } from '../../context/EventContext';
import { formatRupiah } from '../../utils/formatters';
import { createEventDriveWorkspace, requestGoogleAccessToken } from '../../services/googleApiService';

export default function WebRegistrationSettingsView({ onOpenPublicRegistration }) {
  const { activeEvent, updateWebRegistrationConfig } = useEvent();

  const currentConfig = activeEvent?.web_registration_config || DEFAULT_WEB_REGISTRATION_CONFIG;

  // Form states initialized from activeEvent config
  const [isOpen, setIsOpen] = useState(currentConfig.is_open ?? true);
  const [closeMessage, setCloseMessage] = useState(currentConfig.close_message || '');
  const [intakeSource, setIntakeSource] = useState(currentConfig.intake_source || 'WEB_NATIVE');
  const [banks, setBanks] = useState(currentConfig.banks || []);
  const [paymentDeadlineHours, setPaymentDeadlineHours] = useState(currentConfig.payment_time_limit_hours || 24);
  const [gdriveProofFolderId, setGdriveProofFolderId] = useState(currentConfig.gdrive_proof_folder_id || '');
  const [gdriveFolderId, setGdriveFolderId] = useState(currentConfig.gdrive_folder_id || '');
  const [gdriveFolderUrl, setGdriveFolderUrl] = useState(currentConfig.gdrive_folder_url || '');
  const [gdriveSubfolders, setGdriveSubfolders] = useState(currentConfig.gdrive_subfolders || {});
  const [googleOAuthToken, setGoogleOAuthToken] = useState(() => localStorage.getItem('digniti_google_oauth_token') || null);
  const [isGeneratingDrive, setIsGeneratingDrive] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const [formFields, setFormFields] = useState(currentConfig.form_fields || {
    institution_required: false,
    job_title_enabled: true,
    city_enabled: true,
    proof_upload_required: true
  });
  const [allowMabar, setAllowMabar] = useState(currentConfig.allow_mabar ?? true);
  const [waGroupUrl, setWaGroupUrl] = useState(currentConfig.wa_group_url || '');
  const [successMessage, setSuccessMessage] = useState(currentConfig.success_message || '');

  const [activeSubTab, setActiveSubTab] = useState('access'); // 'access', 'payment', 'fields', 'post_register'
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  // Sync state when activeEvent changes
  useEffect(() => {
    if (activeEvent?.web_registration_config) {
      const cfg = activeEvent.web_registration_config;
      setIsOpen(cfg.is_open ?? true);
      setCloseMessage(cfg.close_message || '');
      setIntakeSource(cfg.intake_source || 'WEB_NATIVE');
      setBanks(cfg.banks || []);
      setPaymentDeadlineHours(cfg.payment_time_limit_hours || 24);
      setGdriveProofFolderId(cfg.gdrive_proof_folder_id || '');
      setGdriveFolderId(cfg.gdrive_folder_id || '');
      setGdriveFolderUrl(cfg.gdrive_folder_url || (cfg.gdrive_folder_id ? `https://drive.google.com/drive/folders/${cfg.gdrive_folder_id}` : ''));
      setGdriveSubfolders(cfg.gdrive_subfolders || {});
      setFormFields(cfg.form_fields || {
        institution_required: false,
        job_title_enabled: true,
        city_enabled: true,
        proof_upload_required: true
      });
      setAllowMabar(cfg.allow_mabar ?? true);
      setWaGroupUrl(cfg.wa_group_url || '');
      setSuccessMessage(cfg.success_message || '');
    }
  }, [activeEvent]);

  // Construct direct public registration URL
  const origin = window.location.origin;
  const eventSlug = activeEvent?.slug || 'msc-nov-2026';
  const publicRegistrationUrl = `${origin}/#/daftar?event=${eventSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicRegistrationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddBank = () => {
    setBanks(prev => [...prev, { bank_name: '', account_number: '', account_holder: 'LPK INDONESIA DIGNITY' }]);
  };

  const handleUpdateBank = (idx, field, val) => {
    setBanks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleRemoveBank = (idx) => {
    setBanks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateDriveWorkspace = async () => {
    if (!activeEvent?.id) return;
    let token = googleOAuthToken;
    if (!token) {
      setIsAuthorizing(true);
      try {
        token = await new Promise((resolve, reject) => {
          requestGoogleAccessToken(
            '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com',
            (t) => resolve(t),
            (err) => reject(new Error(typeof err === 'string' ? err : 'Gagal otorisasi'))
          );
        });
        setGoogleOAuthToken(token);
        localStorage.setItem('digniti_google_oauth_token', token);
      } catch (authErr) {
        setSaveToast({ type: 'error', message: 'Gagal login Google Drive: ' + authErr.message });
        setIsAuthorizing(false);
        return;
      } finally {
        setIsAuthorizing(false);
      }
    }

    setIsGeneratingDrive(true);
    try {
      const workspace = await createEventDriveWorkspace({
        accessToken: token,
        eventTitle: activeEvent.title
      });

      setGdriveFolderId(workspace.mainFolderId);
      setGdriveFolderUrl(workspace.mainFolderUrl);
      setGdriveProofFolderId(workspace.proofFolderId);
      setGdriveSubfolders(workspace.subfolders);

      // Auto-save to Supabase immediately
      await updateWebRegistrationConfig(activeEvent.id, {
        gdrive_folder_id: workspace.mainFolderId,
        gdrive_folder_url: workspace.mainFolderUrl,
        gdrive_proof_folder_id: workspace.proofFolderId,
        gdrive_subfolders: workspace.subfolders
      });

      setSaveToast({
        type: 'success',
        message: 'Struktur folder Google Drive untuk acara ini berhasil dibuat & disinkronkan!'
      });
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err) {
      setSaveToast({
        type: 'error',
        message: 'Gagal membuat folder Google Drive: ' + err.message
      });
    } finally {
      setIsGeneratingDrive(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeEvent?.id) return;
    setIsSaving(true);

    const payload = {
      is_open: isOpen,
      close_message: closeMessage,
      intake_source: intakeSource,
      banks,
      payment_time_limit_hours: Number(paymentDeadlineHours) || 24,
      gdrive_folder_id: gdriveFolderId,
      gdrive_folder_url: gdriveFolderUrl,
      gdrive_proof_folder_id: gdriveProofFolderId,
      gdrive_subfolders: gdriveSubfolders,
      form_fields: formFields,
      allow_mabar: allowMabar,
      wa_group_url: waGroupUrl,
      success_message: successMessage
    };

    try {
      await updateWebRegistrationConfig(activeEvent.id, payload);
      setSaveToast({
        type: 'success',
        message: 'Pengaturan Pendaftaran Web berhasil disimpan & disinkronkan ke Supabase!'
      });
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      setSaveToast({
        type: 'error',
        message: 'Gagal menyimpan: ' + err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Feedback */}
      {saveToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold ${
          saveToast.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : 'bg-rose-600 text-white'
        }`}>
          {saveToast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{saveToast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                Portal Pendaftaran Mandiri
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                isOpen 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isOpen ? 'Pendaftaran Buka' : 'Pendaftaran Tutup'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Pengaturan Pendaftaran Web: {activeEvent?.title || 'Program Acara'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Formulir pendaftaran publik native menggantikan Google Forms secara permanen. Calon peserta mendaftar langsung di web, data langsung tersimpan di Supabase & siap diverifikasi di menu Pembayaran.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'URL Tersalin!' : 'Salin Link Form'}</span>
            </button>

            <a
              href={publicRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Form Publik</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

        {/* Transition Notice Callout */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Status Google Form: Terputus (Decoupled).</strong> Sistem kini menggunakan Web Direct Intake ke Supabase.
            </span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] truncate max-w-md">
            {publicRegistrationUrl}
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('access')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'access'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Status & Akses Form</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payment')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'payment'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Rekening Bank & Bukti Bayar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fields')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'fields'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Field Formulir Kustom</span>
        </button>

        <button
          onClick={() => setActiveSubTab('post_register')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'post_register'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Grup WhatsApp & Layar Sukses</span>
        </button>
      </div>

      {/* Tab Content 1: Status & Akses Form */}
      {activeSubTab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Pendaftaran Switch */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Status Pembukaan Pendaftaran</h3>
              <p className="text-xs text-slate-500 mb-4">Kontrol apakah calon peserta dapat mengisi formulir saat ini.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    isOpen 
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pendaftaran Terbuka</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Form aktif menerima pendaftaran peserta baru</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    !isOpen 
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${!isOpen ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pendaftaran Ditutup</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tampilkan pesan penutupan ke pengunjung</div>
                  </div>
                </button>
              </div>

              {/* Close Message if Closed */}
              {!isOpen && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pesan Ketika Pendaftaran Ditutup:
                  </label>
                  <textarea
                    rows={3}
                    value={closeMessage}
                    onChange={(e) => setCloseMessage(e.target.value)}
                    placeholder="Pendaftaran untuk batch ini telah ditutup. Pantau batch selanjutnya di media sosial kami!"
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              )}
            </div>

            {/* URL Pendaftaran & Embed */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Tautan Pendaftaran Langsung</h3>
              <p className="text-xs text-slate-500 mb-4">Bagikan link ini di bio Instagram, pesan WhatsApp, atau brosur promosi.</p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicRegistrationUrl}
                  className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 text-slate-700"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition"
                >
                  {copiedLink ? 'Disalin!' : 'Salin'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Bebas Hambatan:</strong> Peserta tidak perlu login akun Google untuk mendaftar. Formulir berjalan mulus di semua browser ponsel tanpa batasan permission Google Drive.
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar: QR Code Pendaftaran */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-center">
              <div className="inline-flex p-2.5 rounded-xl bg-amber-500/10 text-amber-600 mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">QR Code Pendaftaran Cepat</h4>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">Scan untuk langsung membuka form di ponsel</p>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-inner mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicRegistrationUrl)}`}
                  alt="QR Code Pendaftaran"
                  className="w-36 h-36 mx-auto rounded-lg"
                />
              </div>

              <div>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(publicRegistrationUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`QR_Pendaftaran_${eventSlug}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  <span>Unduh QR Resolusi Tinggi</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Rekening Bank Transfer & Bukti Bayar */}
      {activeSubTab === 'payment' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daftar Rekening Bank Tujuan Transfer</h3>
                <p className="text-xs text-slate-500">Rekening resmi LPK Dignity yang akan ditampilkan kepada pendaftar di langkah pembayaran.</p>
              </div>
              <button
                type="button"
                onClick={handleAddBank}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rekening</span>
              </button>
            </div>

            <div className="space-y-3">
              {banks.map((b, idx) => (
                <div key={idx} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center gap-3">
                  <div className="w-full md:w-1/4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={b.bank_name}
                      onChange={(e) => handleUpdateBank(idx, 'bank_name', e.target.value)}
                      placeholder="e.g. Bank Mandiri"
                      className="w-full text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div className="w-full md:w-1/3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={b.account_number}
                      onChange={(e) => handleUpdateBank(idx, 'account_number', e.target.value)}
                      placeholder="e.g. 138-00-2455891-2"
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-amber-900"
                    />
                  </div>

                  <div className="w-full md:w-1/3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Atas Nama</label>
                    <input
                      type="text"
                      value={b.account_holder}
                      onChange={(e) => handleUpdateBank(idx, 'account_holder', e.target.value)}
                      placeholder="e.g. LPK INDONESIA DIGNITY"
                      className="w-full text-xs font-semibold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div className="md:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Deadline & Storage Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Batas Waktu Pembayaran */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Batas Waktu Pembayaran</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Tenggat waktu bagi pendaftar untuk menyelesaikan transfer bank sebelum kursi dilepas kembali.
                </p>

                <label className="block text-xs font-bold text-slate-700 mb-1.5">Batas Waktu (Jam):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={paymentDeadlineHours}
                    onChange={(e) => setPaymentDeadlineHours(e.target.value)}
                    placeholder="24"
                    className="w-28 text-xs font-bold rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white text-slate-900"
                  />
                  <span className="text-xs text-slate-500 font-medium">jam sejak pendaftaran di-submit</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 text-[11px] leading-relaxed">
                💡 Pendaftar yang belum transfer dalam rentang waktu ini akan tetap tersimpan berstatus <strong>PENDING</strong> di dashboard admin untuk di-follow up via WhatsApp.
              </div>
            </div>

            {/* Folder Google Drive Workspace Event */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">Google Drive Event Workspace</h3>
                  </div>
                  {gdriveFolderUrl ? (
                    <a
                      href={gdriveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>Buka Folder Utama</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateDriveWorkspace}
                      disabled={isGeneratingDrive || isAuthorizing}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isGeneratingDrive ? 'Membuat...' : '⚡ Buat Folder Drive (1-Klik)'}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Folder Google Drive terpusat untuk mengarsipkan seluruh berkas acara secara terstruktur.
                </p>

                {/* Subfolder list badges */}
                {gdriveFolderUrl && gdriveSubfolders && Object.keys(gdriveSubfolders).length > 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Subfolder Terstruktur (Dignity Auto-Sorted):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      {Object.entries(gdriveSubfolders).map(([key, sub]) => (
                        <a
                          key={key}
                          href={sub.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between bg-white hover:bg-sky-50 px-2 py-1.5 rounded border border-slate-200 text-slate-700 hover:text-sky-800 transition"
                        >
                          <span className="truncate font-mono">{sub.name || key}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed mb-3">
                    Event ini belum memiliki folder khusus. Klik tombol <strong>"⚡ Buat Folder Drive"</strong> di atas untuk otomatis membuat folder utama & 4 subfolder rapi (Bukti Bayar, Presensi, Sertifikat, Backup).
                  </div>
                )}

                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ID Subfolder Bukti Bayar (G-Drive):
                </label>
                <input
                  type="text"
                  value={gdriveProofFolderId}
                  onChange={(e) => setGdriveProofFolderId(e.target.value)}
                  placeholder="ID folder bukti..."
                  className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{googleOAuthToken ? '● Akun Google Terhubung' : '○ Google Drive Belum Login'}</span>
                {gdriveProofFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${gdriveProofFolderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Buka Subfolder Bukti</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Field Formulir Kustom */}
      {activeSubTab === 'fields' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Kustomisasi Field Pertanyaan Peserta</h3>
            <p className="text-xs text-slate-500">Tentukan data apa saja yang wajib diisi atau disembunyikan dalam wizard pendaftaran.</p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            
            {/* Nama Lengkap */}
            <div className="p-4 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Nama Lengkap & Gelar</div>
                <div className="text-[11px] text-slate-500">Digunakan sebagai nama resmi cetak e-Sertifikat</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                SELALU WAJIB
              </span>
            </div>

            {/* Email & WhatsApp */}
            <div className="p-4 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Email & Nomor WhatsApp</div>
                <div className="text-[11px] text-slate-500">Kanal pengiriman e-Tiket, barcode presensi, dan sertifikat</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                SELALU WAJIB
              </span>
            </div>

            {/* Instansi / Institusi */}
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Instansi / Perusahaan / Kampus</div>
                <div className="text-[11px] text-slate-500">Apakah peserta diwajibkan mengisi nama lembaga asal?</div>
              </div>
              <button
                type="button"
                onClick={() => setFormFields(f => ({ ...f, institution_required: !f.institution_required }))}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
              >
                {formFields.institution_required ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300">Wajib Diisi</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Opsional</span>
                )}
              </button>
            </div>

            {/* Kota Domisili */}
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Kota Domisili</div>
                <div className="text-[11px] text-slate-500">Tampilkan pilihan kota tempat tinggal peserta</div>
              </div>
              <button
                type="button"
                onClick={() => setFormFields(f => ({ ...f, city_enabled: !f.city_enabled }))}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                {formFields.city_enabled ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">Aktif</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">Nonaktif</span>
                )}
              </button>
            </div>

            {/* Unggah Bukti Bayar */}
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Wajib Unggah Bukti Transfer</div>
                <div className="text-[11px] text-slate-500">Mewajibkan lampiran struk transfer sebelum menyelesaikan pendaftaran</div>
              </div>
              <button
                type="button"
                onClick={() => setFormFields(f => ({ ...f, proof_upload_required: !f.proof_upload_required }))}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                {formFields.proof_upload_required ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300">Wajib Unggah</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Boleh Menyusul</span>
                )}
              </button>
            </div>

            {/* Paket MABAR 6 */}
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Izinkan Paket Promo MABAR (6 Orang)</div>
                <div className="text-[11px] text-slate-500">Pilihan paket hemat komunal Rp 500k untuk 6 peserta sekaligus</div>
              </div>
              <button
                type="button"
                onClick={() => setAllowMabar(m => !m)}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                {allowMabar ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">Diizinkan</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">Hanya Individu</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tab Content 4: Grup WhatsApp & Layar Sukses */}
      {activeSubTab === 'post_register' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Tautan Undangan WhatsApp Group Resmi</h3>
              <p className="text-xs text-slate-500">Tombol gabung grup WhatsApp otomatis muncul di layar bukti pendaftaran peserta.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL Undangan WhatsApp Group:</label>
              <input
                type="text"
                value={waGroupUrl}
                onChange={(e) => setWaGroupUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="w-full text-xs font-mono rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pesan Sukses Pendaftaran:</label>
              <textarea
                rows={3}
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                placeholder="Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50 focus:bg-white text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Perubahan langsung tersinkronisasi ke form publik dan database Supabase</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md transition active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan ke Cloud...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
