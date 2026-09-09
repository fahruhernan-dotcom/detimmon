import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  FileText, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ArrowRight, 
  ArrowLeft,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { communicationService, renderTemplateText } from '../../services/communicationService';
import { useEvent } from '../../context/EventContext';
import { useAuth } from '../../context/AuthContext';

export default function CreateBlastModal({ isOpen, onClose, onSuccess }) {
  const { activeEvent } = useEvent();
  const { role, isOwner, isAdmin } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('VERIFIED');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [packageType, setPackageType] = useState('ALL');
  const [excludeAlreadySent, setExcludeAlreadySent] = useState(true);

  // Template State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Audience & Preview State
  const [audience, setAudience] = useState([]);
  const [sampleRecipient, setSampleRecipient] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setCampaignTitle(`Blast ${activeEvent?.title?.slice(0, 25) || 'Event'} - ${new Date().toLocaleDateString('id-ID')}`);
      loadTemplates();
    }
  }, [isOpen, activeEvent]);

  async function loadTemplates() {
    try {
      const list = await communicationService.getTemplates(activeEvent?.id);
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplateId(list[0].id);
        setSelectedTemplate(list[0]);
      }
    } catch (err) {
      console.error('Gagal memuat template:', err);
    }
  }

  // Ambil audience saat filter berubah
  useEffect(() => {
    if (isOpen && activeEvent?.id) {
      fetchAudience();
    }
  }, [paymentStatus, deliveryFilter, packageType, excludeAlreadySent, selectedTemplateId]);

  async function fetchAudience() {
    setLoading(true);
    try {
      const templateKey = selectedTemplate?.template_key || '';
      const list = await communicationService.buildAudience({
        eventId: activeEvent?.id,
        paymentStatus,
        deliveryFilter,
        packageType,
        excludeAlreadySent,
        templateKey
      });
      setAudience(list);
      if (list.length > 0) {
        setSampleRecipient(list[0]);
      } else {
        setSampleRecipient(null);
      }
    } catch (err) {
      console.warn('Gagal memfilter audiens:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTemplate(e) {
    const tmplId = e.target.value;
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    setSelectedTemplate(tmpl);
  }

  async function handleCreateAndApprove() {
    if (!selectedTemplateId || audience.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Buat Batch
      const batch = await communicationService.createBatch({
        eventId: activeEvent?.id,
        templateId: selectedTemplateId,
        title: campaignTitle,
        channel: selectedTemplate?.channel || 'EMAIL',
        recipients: audience
      });

      // 2. Jika user adalah Owner atau Admin, otomatis Approve & Queue
      if (isOwner || isAdmin) {
        await communicationService.approveAndQueueBatch(batch.id);
      }

      onSuccess && onSuccess(batch);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal membuat kampanye komunikasi');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // Render Live Preview
  const previewVariables = {
    full_name: sampleRecipient?.full_name || 'Budi Santoso',
    event_title: activeEvent?.title || 'Mastering Stage Confidence',
    event_date: '14 November 2026',
    venue: activeEvent?.venue || 'Zoom Cloud Meeting',
    ticket_code: sampleRecipient?.ticket_code || 'TICKET-DIGNITY-2026-001',
    amount: '100.000',
    certificate_no: sampleRecipient?.certificate_no || 'DIGNITY-2026-MSC-000184',
    verification_code: sampleRecipient?.verification_code || 'V-998822',
    voucher_code: 'REBATE-MSC-100K',
    zoom_link: 'https://zoom.us/j/1234567890',
    zoom_passcode: 'DIGNITY2026'
  };

  const previewSubject = renderTemplateText(selectedTemplate?.subject_template || '', previewVariables);
  const previewHtml = renderTemplateText(selectedTemplate?.body_template || '', previewVariables);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Modal & Stepper */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                Buat Kampanye Komunikasi (Communication Blast)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Event: <strong className="text-slate-200">{activeEvent?.title}</strong>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <div className={`p-2 rounded-lg border transition ${step >= 1 ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              1. Audience Builder
            </div>
            <div className={`p-2 rounded-lg border transition ${step >= 2 ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              2. Template & Preview
            </div>
            <div className={`p-2 rounded-lg border transition ${step >= 3 ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              3. Review Penerima
            </div>
            <div className={`p-2 rounded-lg border transition ${step >= 4 ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
              4. Otorisasi & Kirim
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: AUDIENCE BUILDER */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nama Kampanye / Batch
                </label>
                <input 
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Blast E-Ticket Webinar Nov 2026"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Status Pembayaran
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="VERIFIED">Hanya yang LUNAS (Verified)</option>
                    <option value="PENDING">Menunggu Pembayaran (Pending)</option>
                    <option value="ALL">Semua Pendaftar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Status Pengiriman
                  </label>
                  <select
                    value={deliveryFilter}
                    onChange={(e) => setDeliveryFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua Penerima Sesuai Target</option>
                    <option value="TICKET_NOT_SENT">Tiket Belum Terkirim</option>
                    <option value="CERT_NOT_SENT">Sertifikat Belum Terkirim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Tipe Paket
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Semua Paket</option>
                    <option value="INDIVIDU">Individu (Rp 100k)</option>
                    <option value="MABAR_6_PAX">MABAR 6 Pax (Rp 500k)</option>
                  </select>
                </div>
              </div>

              {/* Anti-Duplicate Protection Checkbox */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <input 
                  type="checkbox"
                  id="excludeSent"
                  checked={excludeAlreadySent}
                  onChange={(e) => setExcludeAlreadySent(e.target.checked)}
                  className="mt-1 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="excludeSent" className="cursor-pointer">
                  <span className="text-sm font-semibold text-slate-200 block">
                    ☑ Proteksi Duplikasi: Jangan kirim ulang ke peserta yang sudah pernah menerima tiket/sertifikat ini
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Mencegah keluhan peserta akibat menerima spam atau email ganda saat batch baru dibuat.
                  </span>
                </label>
              </div>

              {/* Audience Result Counter Badge */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Target Penerima Terfilter:</h4>
                    <p className="text-xs text-slate-400">Siap diproses untuk tahap peninjauan template</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-400 px-4 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700/50">
                  {loading ? '...' : audience.length} <span className="text-xs font-normal text-blue-300">Penerima</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TEMPLATE & LIVE PREVIEW */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Pilih Template Pesan
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={handleSelectTemplate}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.channel}] {t.name} ({t.template_key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Container */}
              <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-lg">
                <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Live Variable Substitution Preview (Sampel: {sampleRecipient?.full_name || 'Budi Santoso'})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    WYSIWYG REAL-TIME
                  </span>
                </div>

                <div className="p-4 space-y-3 bg-white text-slate-900 rounded-b-xl min-h-[220px]">
                  <div className="border-b pb-2 text-xs text-slate-500">
                    <strong className="text-slate-800">Subjek:</strong> {previewSubject}
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RECIPIENT LIST REVIEW */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Daftar Calon Penerima ({audience.length} Orang)
                </h3>
                <span className="text-xs text-slate-400">
                  Memeriksa kesiapan data kontak sebelum antrean dibuat
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Kode Tiket</th>
                      <th className="p-3">Status Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                    {audience.slice(0, 100).map((r, i) => (
                      <tr key={r.person_id || i} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">{r.full_name}</td>
                        <td className="p-3 font-mono text-slate-400">{r.email}</td>
                        <td className="p-3 font-mono text-blue-400">{r.ticket_code}</td>
                        <td className="p-3">
                          {r.ticket_sent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Sudah Dikirim
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                              Belum Dikirim
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {audience.length > 100 && (
                <p className="text-xs text-slate-500 text-center">
                  Menampilkan 100 dari {audience.length} penerima.
                </p>
              )}
            </div>
          )}

          {/* STEP 4: APPROVAL GATE */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Gerbang Otorisasi Pengiriman (Approval Gate)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-400 block">Nama Batch:</span>
                    <strong className="text-slate-200">{campaignTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Template:</span>
                    <strong className="text-slate-200">{selectedTemplate?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Target:</span>
                    <strong className="text-blue-400 text-sm">{audience.length} Penerima</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kanal:</span>
                    <strong className="text-slate-200">{selectedTemplate?.channel} (Gmail API Queue)</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 space-y-1">
                <p className="font-semibold">
                  ✓ Antrean Asinkron Berpelindung Kunci Idempotensi
                </p>
                <p className="text-emerald-400/80">
                  Setelah tombol di bawah ditekan, sistem akan meng-enqueue pesan ke tabel <code>email_jobs</code>.
                  Setiap pengiriman tercatat di <code>audit_logs</code> dengan pelacakan status per-peserta.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Navigation Buttons) */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-medium transition"
            >
              Batal
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={audience.length === 0}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
              >
                Lanjutkan
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateAndApprove}
                disabled={loading || audience.length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                {loading ? 'Memproses...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Otorisasi & Masukkan ke Antrean
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
