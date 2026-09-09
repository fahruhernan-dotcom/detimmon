import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Ticket, 
  Award, 
  History, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Plus, 
  Eye, 
  Filter,
  Users,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { communicationService } from '../../services/communicationService';
import { useEvent } from '../../context/EventContext';
import { useAuth } from '../../context/AuthContext';
import CreateBlastModal from './CreateBlastModal';
import BatchRecipientsModal from './BatchRecipientsModal';

export default function CommunicationCenter() {
  const { activeEvent } = useEvent();
  const { isOwner, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'certificates', 'history', 'templates'
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [ticketAudience, setTicketAudience] = useState([]);
  const [certAudience, setCertAudience] = useState([]);

  // Modal States
  const [isCreateBlastOpen, setIsCreateBlastOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isBatchRecipientsOpen, setIsBatchRecipientsOpen] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDelivery, setFilterDelivery] = useState('ALL');

  useEffect(() => {
    if (activeEvent?.id) {
      loadData();
    }
  }, [activeEvent]);

  async function loadData() {
    setLoading(true);
    try {
      const [batchList, tmplList, ticketList, certList] = await Promise.all([
        communicationService.getBatches(activeEvent?.id).catch(() => []),
        communicationService.getTemplates(activeEvent?.id).catch(() => []),
        communicationService.buildAudience({
          eventId: activeEvent?.id,
          paymentStatus: 'VERIFIED',
          excludeAlreadySent: false,
          templateKey: 'TICKET'
        }).catch(() => []),
        communicationService.buildAudience({
          eventId: activeEvent?.id,
          paymentStatus: 'VERIFIED',
          excludeAlreadySent: false,
          templateKey: 'CERTIFICATE'
        }).catch(() => [])
      ]);

      setBatches(batchList);
      setTemplates(tmplList);
      setTicketAudience(ticketList);
      setCertAudience(certList);
    } catch (err) {
      console.error('Gagal memuat data Communication Center:', err);
    } finally {
      setLoading(false);
    }
  }

  // Quick Action: Send Unsent Tickets
  async function handleBulkSendUnsentTickets() {
    const unsent = ticketAudience.filter(t => !t.ticket_sent);
    if (unsent.length === 0) {
      alert('Semua tiket sudah terkirim!');
      return;
    }

    if (!confirm(`Kirim tiket ke ${unsent.length} peserta yang belum menerima tiket?`)) return;

    setLoading(true);
    try {
      const ticketTmpl = templates.find(t => t.template_key.includes('TICKET')) || templates[0];
      const batch = await communicationService.createBatch({
        eventId: activeEvent?.id,
        templateId: ticketTmpl.id,
        title: `Tiket Massal - ${new Date().toLocaleDateString('id-ID')}`,
        channel: 'EMAIL',
        recipients: unsent
      });
      await communicationService.approveAndQueueBatch(batch.id);
      alert(`Berhasil memasukkan ${unsent.length} tiket ke antrean pengiriman!`);
      loadData();
    } catch (err) {
      alert('Gagal mengirim: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick Action: Send Unsent Certificates
  async function handleBulkSendUnsentCerts() {
    const unsent = certAudience.filter(c => !c.cert_sent);
    if (unsent.length === 0) {
      alert('Semua sertifikat sudah terkirim!');
      return;
    }

    if (!confirm(`Kirim sertifikat & voucher ke ${unsent.length} peserta?`)) return;

    setLoading(true);
    try {
      const certTmpl = templates.find(t => t.template_key.includes('CERTIFICATE')) || templates[0];
      const batch = await communicationService.createBatch({
        eventId: activeEvent?.id,
        templateId: certTmpl.id,
        title: `Sertifikat Massal - ${new Date().toLocaleDateString('id-ID')}`,
        channel: 'EMAIL',
        recipients: unsent
      });
      await communicationService.approveAndQueueBatch(batch.id);
      alert(`Berhasil memasukkan ${unsent.length} sertifikat ke antrean!`);
      loadData();
    } catch (err) {
      alert('Gagal mengirim: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Tables
  const filteredTickets = ticketAudience.filter(t => {
    const matchSearch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.ticket_code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filterDelivery === 'SENT') return t.ticket_sent;
    if (filterDelivery === 'NOT_SENT') return !t.ticket_sent;
    return true;
  });

  const filteredCerts = certAudience.filter(c => {
    const matchSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.certificate_no.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filterDelivery === 'SENT') return c.cert_sent;
    if (filterDelivery === 'NOT_SENT') return !c.cert_sent;
    return true;
  });

  // Calculate Metrics
  const totalSentTickets = ticketAudience.filter(t => t.ticket_sent).length;
  const totalUnsentTickets = ticketAudience.length - totalSentTickets;
  const totalSentCerts = certAudience.filter(c => c.cert_sent).length;
  const totalUnsentCerts = certAudience.length - totalSentCerts;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Communication & Delivery Foundation
            </span>
            <span className="text-xs text-slate-400">
              Event Aktif: <strong className="text-white">{activeEvent?.title}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">
            Communication Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manajemen pengiriman E-Ticket, E-Sertifikat, dan Pengingat dengan pelacakan per-penerima, proteksi duplikasi, dan retry otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateBlastOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            Buat Kampanye Blast Baru
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiket Terkirim</span>
            <Ticket className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {totalSentTickets} <span className="text-xs font-normal text-slate-400">/ {ticketAudience.length}</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {ticketAudience.length > 0 ? Math.round((totalSentTickets / ticketAudience.length) * 100) : 0}% Sukses Terdistribusi
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiket Tertunda</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {totalUnsentTickets} <span className="text-xs font-normal text-slate-400">Peserta</span>
          </div>
          <p className="text-[11px] text-amber-300 mt-1 font-medium">
            Pembayaran lunas, siap dikirim massal
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sertifikat Terkirim</span>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {totalSentCerts} <span className="text-xs font-normal text-slate-400">/ {certAudience.length}</span>
          </div>
          <p className="text-[11px] text-purple-300 mt-1 font-medium">
            E-Sertifikat + Voucher Rebate Rp 100k
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Blast Campaign</span>
            <History className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-2">
            {batches.length} <span className="text-xs font-normal text-slate-400">Batch</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Riwayat tercatat di audit trail
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'tickets'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Ticket Delivery Center
          {totalUnsentTickets > 0 && (
            <span className="px-2 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {totalUnsentTickets}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'certificates'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Certificate Delivery Center
          {totalUnsentCerts > 0 && (
            <span className="px-2 py-0.2 text-[10px] rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {totalUnsentCerts}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Blast ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Katalog Template ({templates.length})
        </button>
      </div>

      {/* TAB 1: TICKET DELIVERY CENTER */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, email, kode tiket..."
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
              <select
                value={filterDelivery}
                onChange={(e) => setFilterDelivery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="SENT">Sudah Terkirim</option>
                <option value="NOT_SENT">Belum Terkirim</option>
              </select>
            </div>

            {totalUnsentTickets > 0 && (
              <button
                onClick={handleBulkSendUnsentTickets}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim {totalUnsentTickets} Tiket yang Belum Dikirim
              </button>
            )}
          </div>

          {/* Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Peserta</th>
                  <th className="p-4">Paket</th>
                  <th className="p-4">Kode Tiket</th>
                  <th className="p-4">Status Pengiriman</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-500">
                      Tidak ada data tiket yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t, i) => (
                    <tr key={t.person_id || i} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <span className="font-bold text-white block">{t.full_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{t.email}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {t.package_type}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-blue-400">
                        {t.ticket_code}
                      </td>
                      <td className="p-4">
                        {t.ticket_sent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Terkirim
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Belum Dikirim
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedBatch({
                              id: 'single-send',
                              title: `Kirim Tiket: ${t.full_name}`,
                              batch_code: 'SINGLE-TKT',
                              created_at: new Date().toISOString()
                            });
                            alert(`Kirim tiket individual ke ${t.full_name} (${t.email})? Anda juga dapat menggunakan tombol 'Buat Kampanye Blast Baru' di atas.`);
                          }}
                          className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition"
                        >
                          {t.ticket_sent ? 'Kirim Ulang' : 'Kirim Sekarang'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CERTIFICATE DELIVERY CENTER */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari sertifikat, nomor seri..."
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
              <select
                value={filterDelivery}
                onChange={(e) => setFilterDelivery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="SENT">Sudah Terkirim</option>
                <option value="NOT_SENT">Belum Terkirim</option>
              </select>
            </div>

            {totalUnsentCerts > 0 && (
              <button
                onClick={handleBulkSendUnsentCerts}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                <Award className="w-3.5 h-3.5" />
                Kirim {totalUnsentCerts} Sertifikat yang Belum Dikirim
              </button>
            )}
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Peserta</th>
                  <th className="p-4">Nomor Sertifikat</th>
                  <th className="p-4">Kode QR Verifikasi</th>
                  <th className="p-4">Status Pengiriman</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCerts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-slate-500">
                      Tidak ada data sertifikat yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredCerts.map((c, i) => (
                    <tr key={c.person_id || i} className="hover:bg-slate-800/30 transition">
                      <td className="p-4">
                        <span className="font-bold text-white block">{c.full_name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.email}</span>
                      </td>
                      <td className="p-4 font-mono font-semibold text-purple-400">
                        {c.certificate_no}
                      </td>
                      <td className="p-4 font-mono text-slate-400">
                        {c.verification_code ? `/verify/${c.verification_code}` : '-'}
                      </td>
                      <td className="p-4">
                        {c.cert_sent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Terkirim
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Belum Dikirim
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => alert(`Kirim sertifikat ke ${c.full_name}?`)}
                          className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition"
                        >
                          {c.cert_sent ? 'Kirim Ulang' : 'Kirim Sekarang'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Kode Batch</th>
                  <th className="p-4">Judul Kampanye</th>
                  <th className="p-4">Template</th>
                  <th className="p-4">Penerima</th>
                  <th className="p-4">Status Batch</th>
                  <th className="p-4">Waktu Dibuat</th>
                  <th className="p-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-500">
                      Belum ada riwayat blast untuk event ini. Klik "Buat Kampanye Blast Baru" untuk memulai.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-mono font-semibold text-blue-400">
                        {b.batch_code}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {b.title}
                      </td>
                      <td className="p-4 text-slate-400">
                        {b.message_templates?.name || '-'}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-white">{b.total_recipients}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {b.sent_count} Sukses • {b.failed_count} Gagal
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          b.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                          b.status === 'PROCESSING' || b.status === 'QUEUED' ? 'bg-blue-950 text-blue-400 border-blue-800' :
                          b.status === 'FAILED' ? 'bg-rose-950 text-rose-400 border-rose-800' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(b.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedBatch(b);
                            setIsBatchRecipientsOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
                        >
                          Lihat Penerima
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TEMPLATES CATALOG */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-blue-400 border border-slate-700">
                    {tmpl.template_key}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">v{tmpl.version}</span>
                </div>
                <h3 className="text-base font-bold text-white">{tmpl.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  <strong>Subjek:</strong> {tmpl.subject_template}
                </p>

                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                  Variabel: {Array.isArray(tmpl.variables) ? tmpl.variables.map(v => `{{${v}}}`).join(', ') : '-'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-xs text-emerald-400 font-medium">● Status Aktif</span>
                <button
                  onClick={() => {
                    setIsCreateBlastOpen(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Gunakan Template Ini ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateBlastModal 
        isOpen={isCreateBlastOpen}
        onClose={() => setIsCreateBlastOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab('history');
        }}
      />

      <BatchRecipientsModal
        isOpen={isBatchRecipientsOpen}
        onClose={() => setIsBatchRecipientsOpen(false)}
        batch={selectedBatch}
        onRetried={() => loadData()}
      />

    </div>
  );
}
