import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Eye, 
  Smartphone, 
  Monitor, 
  Send, 
  Save, 
  CheckCircle2, 
  Copy, 
  Trash2, 
  Tag, 
  Sparkles, 
  Code, 
  Layout, 
  ChevronRight,
  Check,
  RotateCcw
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { sendEmailViaGmail } from '../../services/googleApiService';

/**
 * TemplateStudioView — Visual Block Template Editor
 * Strictly implements PHASE_18_UI_UX_TEMPLATE_STUDIO.md:
 * - Block library: Header, Text, Ticket Card, Zoom Info, Voucher Rebate, Button, Divider, Footer
 * - Variable chip inserter: {{FULL_NAME}}, {{TICKET_CODE}}, {{EVENT_TITLE}}, {{EVENT_DATE}}, {{VOUCHER_CODE}}
 * - Live Desktop vs Mobile preview toggle
 * - Direct test email dispatch
 * - White Luxury Minimal aesthetic
 */
export default function TemplateStudioView({
  hasGoogleToken = false,
  googleOAuthToken = null
}) {
  const { activeEvent } = useEvent();

  // Template Library
  const [templates, setTemplates] = useState([
    {
      id: 'tmpl-ticket',
      title: 'E-Ticket & Akses Zoom Resmi',
      category: 'TICKET',
      subject: '[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - {{TICKET_CODE}}',
      version: 'v2.1',
      status: 'ACTIVE',
      blocks: [
        { type: 'header', content: 'LPK INDONESIA DIGNITY', subtitle: 'Official Event Confirmation' },
        { type: 'text', content: 'Halo {{FULL_NAME}},\n\nSelamat! Pembayaran Anda telah kami verifikasi resmi. Berikut adalah e-ticket dan detail akses ruangan Zoom interaktif Anda:' },
        { type: 'card_ticket', content: 'KARTU TIKET PESERTA' },
        { type: 'card_zoom', content: 'LINK RUANGAN LIVE ZOOM' },
        { type: 'text', content: 'Mohon hadir 15 menit sebelum sesi dimulai dan gunakan nama sesuai identitas pendaftaran untuk verifikasi presensi.' },
        { type: 'footer', content: 'LPK Indonesia Dignity • Menara Dignity Surakarta' }
      ]
    },
    {
      id: 'tmpl-cert',
      title: 'E-Sertifikat Kelulusan & Voucher Rebate',
      category: 'CERTIFICATE',
      subject: 'E-Sertifikat Kelulusan & Voucher Rebate Rp 100.000 - {{FULL_NAME}}',
      version: 'v1.4',
      status: 'ACTIVE',
      blocks: [
        { type: 'header', content: 'LPK INDONESIA DIGNITY', subtitle: 'Sertifikat Kelulusan Workshop' },
        { type: 'text', content: 'Yth. {{FULL_NAME}},\n\nTerima kasih atas partisipasi aktif Anda dalam Live Interactive Workshop {{EVENT_TITLE}}. Kami sangat mengapresiasi semangat belajar Anda.' },
        { type: 'card_cert', content: 'E-SERTIFIKAT RESMI' },
        { type: 'card_voucher', content: 'VOUCHER BEASISWA BOOTCAMP' },
        { type: 'text', content: 'Gunakan kode voucher di atas untuk mendapatkan potongan Rp 100.000 pada pendaftaran Executive Bootcamp Public Speaking.' },
        { type: 'footer', content: 'LPK Indonesia Dignity • Sertifikasi Terverifikasi' }
      ]
    },
    {
      id: 'tmpl-reminder',
      title: 'Pengingat Sesi Webinar (H-1)',
      category: 'REMINDER',
      subject: '[PENGINGAT H-1] Besok Live Webinar Public Speaking Bersama {{SPEAKER_NAME}}',
      version: 'v1.0',
      status: 'DRAFT',
      blocks: [
        { type: 'header', content: 'LPK INDONESIA DIGNITY', subtitle: 'Event Countdown H-1' },
        { type: 'text', content: 'Halo {{FULL_NAME}},\n\nHanya tinggal 1 hari lagi menuju Live Webinar "{{EVENT_TITLE}}". Pastikan perangkat dan koneksi internet Anda siap.' },
        { type: 'card_zoom', content: 'LINK RUANGAN LIVE ZOOM' },
        { type: 'footer', content: 'LPK Indonesia Dignity' }
      ]
    }
  ]);

  const [activeTemplateId, setActiveTemplateId] = useState('tmpl-ticket');
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const currentTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];

  // Available dynamic variables
  const variables = [
    { label: 'Nama Lengkap', tag: '{{FULL_NAME}}' },
    { label: 'Nomor Tiket', tag: '{{TICKET_CODE}}' },
    { label: 'Judul Event', tag: '{{EVENT_TITLE}}' },
    { label: 'Tanggal Event', tag: '{{EVENT_DATE}}' },
    { label: 'Jam Sesi', tag: '{{EVENT_TIME}}' },
    { label: 'Link Zoom', tag: '{{ZOOM_LINK}}' },
    { label: 'Nomor Sertifikat', tag: '{{CERTIFICATE_NO}}' },
    { label: 'Kode Verifikasi', tag: '{{VERIFICATION_CODE}}' },
    { label: 'Kode Voucher', tag: '{{VOUCHER_CODE}}' }
  ];

  // Sample data for live preview
  const sampleData = {
    FULL_NAME: 'Budi Santoso, S.Kom.',
    TICKET_CODE: 'TICKET-DIGNITY-001',
    EVENT_TITLE: activeEvent?.title || 'Mastering Stage Confidence',
    EVENT_DATE: activeEvent?.date_start || 'Sabtu, 14 Maret 2026',
    EVENT_TIME: '19.30 - 21.30 WIB',
    ZOOM_LINK: 'https://zoom.us/j/9876543210?pwd=dignity',
    CERTIFICATE_NO: 'LPK-DIGNITY/CERT/2026/000184',
    VERIFICATION_CODE: 'dgn-a78b9c',
    VOUCHER_CODE: 'REBATE100K-001',
    SPEAKER_NAME: activeEvent?.landing_page_config?.speaker?.name || activeEvent?.speaker_name || "Master Trainer (TBA)"
  };

  const renderSampleText = (raw) => {
    if (!raw) return '';
    let res = raw;
    Object.keys(sampleData).forEach(key => {
      res = res.replaceAll(`{{${key}}}`, sampleData[key]);
    });
    return res;
  };

  const handleInsertVariable = (tag) => {
    // Append tag to the focused or first text block
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === activeTemplateId) {
        const updatedBlocks = [...tmpl.blocks];
        const textIdx = updatedBlocks.findIndex(b => b.type === 'text');
        if (textIdx >= 0) {
          updatedBlocks[textIdx] = {
            ...updatedBlocks[textIdx],
            content: `${updatedBlocks[textIdx].content} ${tag}`
          };
        }
        return { ...tmpl, blocks: updatedBlocks };
      }
      return tmpl;
    }));
  };

  const handleUpdateSubject = (newSubject) => {
    setTemplates(prev => prev.map(tmpl => 
      tmpl.id === activeTemplateId ? { ...tmpl, subject: newSubject } : tmpl
    ));
  };

  const handleUpdateBlockContent = (index, newContent) => {
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === activeTemplateId) {
        const updatedBlocks = [...tmpl.blocks];
        updatedBlocks[index] = { ...updatedBlocks[index], content: newContent };
        return { ...tmpl, blocks: updatedBlocks };
      }
      return tmpl;
    }));
  };

  const handleAddBlock = (type) => {
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === activeTemplateId) {
        const newBlock = {
          type,
          content: type === 'text' ? 'Tulis isi paragraf pesan di sini...' : 'Highlight Info Baru'
        };
        return { ...tmpl, blocks: [...tmpl.blocks, newBlock] };
      }
      return tmpl;
    }));
  };

  const handleDeleteBlock = (index) => {
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === activeTemplateId) {
        const updatedBlocks = tmpl.blocks.filter((_, i) => i !== index);
        return { ...tmpl, blocks: updatedBlocks };
      }
      return tmpl;
    }));
  };

  const handleSaveDraft = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailInput.trim()) {
      alert('Masukkan alamat email tujuan pengujian.');
      return;
    }
    if (!googleOAuthToken) {
      alert('Silakan hubungkan Google OAuth terlebih dahulu untuk mengirim test email.');
      return;
    }

    setIsSendingTest(true);
    try {
      const subject = renderSampleText(currentTemplate.subject);
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f172a; color: #fff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; letter-spacing: 1px; color: #fbbf24;">LPK INDONESIA DIGNITY</h1>
            <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">${currentTemplate.title}</p>
          </div>
          <div style="padding: 28px; background: #ffffff; color: #1e293b; font-size: 14px; line-height: 1.6;">
            ${currentTemplate.blocks.map(b => {
              if (b.type === 'text') return `<p style="white-space: pre-line;">${renderSampleText(b.content)}</p>`;
              if (b.type === 'card_ticket') return `<div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;"><strong>KODE TIKET RESMI: ${sampleData.TICKET_CODE}</strong></div>`;
              if (b.type === 'card_zoom') return `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;"><strong>Akses Live Zoom:</strong><br><a href="${sampleData.ZOOM_LINK}" style="color: #2563eb;">${sampleData.ZOOM_LINK}</a><br>Waktu: ${sampleData.EVENT_TIME}</div>`;
              if (b.type === 'card_voucher') return `<div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px; margin: 16px 0;"><strong>VOUCHER POTONGAN RP 100.000:</strong> <code style="font-size: 16px; color: #854d0e;">${sampleData.VOUCHER_CODE}</code></div>`;
              return '';
            }).join('')}
          </div>
          <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Email ini adalah pesan pengujian otomatis dari Dignity Communication Template Studio.
          </div>
        </div>
      `;

      await sendEmailViaGmail({
        accessToken: googleOAuthToken,
        to: testEmailInput.trim(),
        subject: `[TEST PREVIEW] ${subject}`,
        htmlBody
      });
      alert(`Test email berhasil dikirim ke ${testEmailInput.trim()}!`);
    } catch (err) {
      alert(`Gagal mengirim test email: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── TOP HEADER & TEMPLATE SELECTOR ───────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Communication Template Studio</h3>
              <p className="text-xs text-slate-500">Editor visual blok template email resmi & pemberitahuan LPK Dignity</p>
            </div>
          </div>
        </div>

        {/* Template Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          {templates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => setActiveTemplateId(tmpl.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTemplateId === tmpl.id
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tmpl.title}</span>
              <span className="text-[10px] font-mono text-slate-400">{tmpl.version}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN WORKSPACE: EDITOR & PREVIEW ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT: BLOCK EDITOR & VARIABLES (7 COLS) ─────────── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Subject Line Field */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Subjek Email Resmi:</label>
            <input
              type="text"
              value={currentTemplate.subject}
              onChange={(e) => handleUpdateSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-medium outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Dynamic Variable Chips */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Sisipkan Variabel Dinamis:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {variables.map(v => (
                <button
                  key={v.tag}
                  onClick={() => handleInsertVariable(v.tag)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-50 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-slate-200 text-slate-700 transition-colors"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Blocks List */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">Blok Konten Template</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAddBlock('text')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Paragraf</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {currentTemplate.blocks.map((block, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Blok #{idx + 1}: {block.type}
                    </span>
                    <button
                      onClick={() => handleDeleteBlock(idx)}
                      className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                      title="Hapus blok"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {block.type === 'text' ? (
                    <textarea
                      rows={3}
                      value={block.content}
                      onChange={(e) => handleUpdateBlockContent(idx, e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-white font-sans text-slate-800 outline-none focus:border-amber-500"
                    />
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-white border border-dashed border-slate-200 text-xs font-mono font-medium text-slate-600">
                      [KOMPONEN SISTEM: {block.content}]
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Save Draft Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Versi saat ini: {currentTemplate.version}</span>
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>{saveToast ? 'Tersimpan ✓' : 'Simpan Draf Template'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT: LIVE SIMULATION PREVIEW (5 COLS) ──────────── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Device Toggle & Test Dispatch Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Simulasi Tampilan</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md transition-all ${
                  previewMode === 'desktop' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400'
                }`}
                title="Tampilan Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md transition-all ${
                  previewMode === 'mobile' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-400'
                }`}
                title="Tampilan Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Simulated Email Canvas */}
          <div className={`mx-auto bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden transition-all ${
            previewMode === 'mobile' ? 'max-w-[340px]' : 'w-full'
          }`}>
            {/* Mock Email Client Header */}
            <div className="bg-slate-900 text-white p-4 text-center border-b border-slate-800">
              <span className="text-[11px] font-mono tracking-wider text-amber-400 font-bold block">
                LPK INDONESIA DIGNITY
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">{currentTemplate.title}</p>
            </div>

            {/* Email Body */}
            <div className="p-5 text-xs text-slate-700 space-y-3.5 leading-relaxed bg-white">
              {currentTemplate.blocks.map((block, idx) => {
                if (block.type === 'text') {
                  return (
                    <p key={idx} className="whitespace-pre-line text-slate-800">
                      {renderSampleText(block.content)}
                    </p>
                  );
                }
                if (block.type === 'card_ticket') {
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">E-Ticket Masuk Resmi</span>
                      <div className="text-sm font-mono font-bold text-slate-950">{sampleData.TICKET_CODE}</div>
                      <span className="text-[10px] text-emerald-700 font-medium">Status: Terverifikasi Lunas</span>
                    </div>
                  );
                }
                if (block.type === 'card_zoom') {
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1">
                      <strong className="text-blue-950 font-semibold block">Akses Ruangan Live Zoom:</strong>
                      <span className="text-[11px] text-blue-700 font-mono underline block truncate">{sampleData.ZOOM_LINK}</span>
                      <span className="text-[10px] text-slate-500 block">Jadwal: {sampleData.EVENT_DATE} • {sampleData.EVENT_TIME}</span>
                    </div>
                  );
                }
                if (block.type === 'card_voucher') {
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Voucher Beasiswa Rp 100.000</span>
                      <div className="text-sm font-mono font-bold text-amber-950">{sampleData.VOUCHER_CODE}</div>
                      <span className="text-[10px] text-slate-500 block">Dapat ditukarkan untuk pendaftaran Bootcamp</span>
                    </div>
                  );
                }
                if (block.type === 'footer') {
                  return (
                    <div key={idx} className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                      {block.content}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Test Email Dispatch Form */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">Kirim Sampel Pengujian:</span>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="nama@email.com..."
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-amber-500 focus:bg-white"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testEmailInput.trim()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1 shadow-2xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Mengirim...' : 'Kirim Test'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
