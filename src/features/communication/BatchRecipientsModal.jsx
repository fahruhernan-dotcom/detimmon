import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Clock, Send, Users } from 'lucide-react';
import { communicationService } from '../../services/communicationService';

export default function BatchRecipientsModal({ isOpen, onClose, batch, onRetried }) {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen && batch?.id) {
      loadRecipients();
    }
  }, [isOpen, batch]);

  async function loadRecipients() {
    setLoading(true);
    try {
      const list = await communicationService.getBatchRecipients(batch.id);
      setRecipients(list);
    } catch (err) {
      console.error('Gagal memuat penerima batch:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryFailed() {
    setRetrying(true);
    try {
      const count = await communicationService.retryFailedRecipients(batch.id);
      await loadRecipients();
      onRetried && onRetried(count);
    } catch (err) {
      alert('Gagal mengulang pengiriman: ' + err.message);
    } finally {
      setRetrying(false);
    }
  }

  if (!isOpen || !batch) return null;

  const filteredRecipients = recipients.filter(r => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const failedCount = recipients.filter(r => r.status === 'FAILED').length;
  const sentCount = recipients.filter(r => r.status === 'SENT').length;
  const queuedCount = recipients.filter(r => r.status === 'QUEUED' || r.status === 'NOT_SENT').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-950 text-blue-400 border border-blue-800">
                {batch.batch_code}
              </span>
              <h2 className="text-lg font-bold text-white">{batch.title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dibuat pada {new Date(batch.created_at).toLocaleString('id-ID')} • Total: {recipients.length} Penerima
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar & Filter Tabs */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Semua ({recipients.length})
            </button>
            <button
              onClick={() => setFilter('SENT')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === 'SENT' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-white'}`}
            >
              Terkirim ({sentCount})
            </button>
            <button
              onClick={() => setFilter('FAILED')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === 'FAILED' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-white'}`}
            >
              Gagal ({failedCount})
            </button>
            <button
              onClick={() => setFilter('QUEUED')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === 'QUEUED' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-white'}`}
            >
              Antrean ({queuedCount})
            </button>
          </div>

          {failedCount > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Retry {failedCount} Gagal
            </button>
          )}
        </div>

        {/* Recipients List Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Memuat data penerima...
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Tidak ada penerima dengan status ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-3">Nama & Kontak</th>
                  <th className="p-3">Email Tujuan</th>
                  <th className="p-3">Status Delivery</th>
                  <th className="p-3">Waktu Eksekusi</th>
                  <th className="p-3">Catatan / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/30 text-slate-300">
                {filteredRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-semibold text-white">
                      {r.persons?.full_name || 'Peserta'}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {r.persons?.institution || '-'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{r.recipient}</td>
                    <td className="p-3">
                      {r.status === 'SENT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Terkirim
                        </span>
                      )}
                      {r.status === 'FAILED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> Gagal ({r.attempt_count}x)
                        </span>
                      )}
                      {(r.status === 'QUEUED' || r.status === 'NOT_SENT') && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> Antrean
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">
                      {r.sent_at ? new Date(r.sent_at).toLocaleTimeString('id-ID') : '-'}
                    </td>
                    <td className="p-3 text-rose-400 max-w-xs truncate">
                      {r.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
