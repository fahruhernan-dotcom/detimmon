/**
 * VoucherManagementView.jsx
 * Panel Admin CRUD Voucher — Phase 9 Scalable Voucher System
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */
import React, { useState, useEffect, useCallback } from 'react';
import { voucherService } from '../../services/registrationService';

const formatRupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

const STATUS_STYLE = {
  AKTIF:       'bg-emerald-100 text-emerald-800 border border-emerald-200',
  NONAKTIF:    'bg-slate-100 text-slate-600 border border-slate-200',
  EXPIRED:     'bg-red-100 text-red-700 border border-red-200',
  'HABIS KUOTA': 'bg-amber-100 text-amber-700 border border-amber-200',
};

const DISCOUNT_TYPE_LABEL = { FIXED: 'Nominal (Rp)', PERCENT: 'Persentase (%)' };

const DEFAULT_FORM = {
  code: '', description: '', discount_type: 'FIXED', discount_value: '',
  max_discount_cap: '', min_purchase: '', target_event_id: '',
  max_uses: '', valid_until: '', created_by: 'ADMIN'
};

export default function VoucherManagementView({ events = [] }) {
  const [vouchers, setVouchers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(DEFAULT_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [usages, setUsages]       = useState([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await voucherService.getAllVouchers();
      setVouchers(data);
    } catch (e) {
      setError('Gagal memuat daftar voucher: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.code.trim()) return setError('Kode voucher wajib diisi.');
    if (!form.discount_value || Number(form.discount_value) <= 0) return setError('Nilai diskon harus > 0.');

    setSaving(true);
    try {
      await voucherService.createVoucher({
        ...form,
        discount_value:   Number(form.discount_value),
        max_discount_cap: form.max_discount_cap ? Number(form.max_discount_cap) : null,
        min_purchase:     form.min_purchase ? Number(form.min_purchase) : 0,
        max_uses:         form.max_uses ? Number(form.max_uses) : null,
        target_event_id:  form.target_event_id || null,
        valid_until:      form.valid_until ? new Date(form.valid_until).toISOString() : null,
      });
      setSuccess(`Voucher "${form.code.toUpperCase()}" berhasil dibuat!`);
      setForm(DEFAULT_FORM);
      setShowForm(false);
      await load();
    } catch (e) {
      setError('Gagal membuat voucher: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (v) => {
    try {
      await voucherService.toggleVoucherStatus(v.id, !v.is_active);
      setSuccess(`Voucher "${v.code}" ${!v.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
      await load();
    } catch (e) {
      setError('Gagal mengubah status: ' + e.message);
    }
  };

  const handleDelete = async (v) => {
    if (v.used_count > 0) return setError(`Voucher "${v.code}" tidak bisa dihapus karena sudah pernah diklaim (${v.used_count}x). Nonaktifkan saja.`);
    if (!window.confirm(`Hapus permanen voucher "${v.code}"?`)) return;
    try {
      await voucherService.deleteVoucher(v.id);
      setSuccess(`Voucher "${v.code}" dihapus.`);
      await load();
    } catch (e) {
      setError('Gagal menghapus: ' + e.message);
    }
  };

  const handleDetail = async (v) => {
    setDetailVoucher(v);
    setLoadingUsages(true);
    try {
      const data = await voucherService.getVoucherUsages(v.id);
      setUsages(data);
    } catch (e) {
      setUsages([]);
    } finally {
      setLoadingUsages(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">🏷️ Manajemen Voucher</h2>
          <p className="text-sm text-slate-500 mt-0.5">Buat, kelola, dan pantau kode voucher diskon secara real-time.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {showForm ? '✕ Tutup' : '+ Buat Voucher Baru'}
        </button>
      </div>

      {/* Feedback */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">{success}</div>}

      {/* Form Buat Voucher */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-700 text-sm">Form Voucher Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Kode Voucher *</label>
              <input name="code" value={form.code} onChange={handleFormChange}
                placeholder="CONTOH: EARLYBIRD50K"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Deskripsi Internal</label>
              <input name="description" value={form.description} onChange={handleFormChange}
                placeholder="Catatan untuk admin..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Tipe Diskon *</label>
              <select name="discount_type" value={form.discount_type} onChange={handleFormChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {Object.entries(DISCOUNT_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Nilai Diskon * {form.discount_type === 'FIXED' ? '(Rp)' : '(%)'}
              </label>
              <input type="number" name="discount_value" value={form.discount_value} onChange={handleFormChange}
                placeholder={form.discount_type === 'FIXED' ? '100000' : '10'}
                min="1" step={form.discount_type === 'FIXED' ? '1000' : '1'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            {form.discount_type === 'PERCENT' && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Batas Atas Diskon (Rp) — opsional</label>
                <input type="number" name="max_discount_cap" value={form.max_discount_cap} onChange={handleFormChange}
                  placeholder="Misal: 200000"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Minimum Pembelian (Rp)</label>
              <input type="number" name="min_purchase" value={form.min_purchase} onChange={handleFormChange}
                placeholder="0 = tidak ada minimum"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Target Event (kosong = Global)</label>
              <select name="target_event_id" value={form.target_event_id} onChange={handleFormChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">🌐 Berlaku di Semua Event (Global)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Maks. Klaim (kosong = tidak terbatas)</label>
              <input type="number" name="max_uses" value={form.max_uses} onChange={handleFormChange}
                placeholder="Contoh: 50"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Berlaku Hingga (kosong = selamanya)</label>
              <input type="datetime-local" name="valid_until" value={form.valid_until} onChange={handleFormChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
              {saving ? 'Menyimpan...' : '✓ Simpan Voucher'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-5 py-2 rounded-lg text-sm transition">
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Tabel Voucher */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Memuat data voucher...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Belum ada voucher. Buat yang pertama!</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Diskon</th>
                  <th className="px-4 py-3 text-left">Target Event</th>
                  <th className="px-4 py-3 text-left">Klaim</th>
                  <th className="px-4 py-3 text-left">Berlaku Hingga</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{v.code}</span>
                      {v.description && <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {v.discount_type === 'FIXED'
                        ? formatRupiah(v.discount_value)
                        : `${v.discount_value}%${v.max_discount_cap ? ` (maks. ${formatRupiah(v.max_discount_cap)})` : ''}`
                      }
                      {v.min_purchase > 0 && (
                        <p className="text-xs text-slate-400">Min. {formatRupiah(v.min_purchase)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px]">
                      {v.target_event_title
                        ? <span className="line-clamp-2">{v.target_event_title}</span>
                        : <span className="text-indigo-500 font-medium">🌐 Global</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDetail(v)}
                        className="text-indigo-600 hover:underline font-medium">
                        {v.used_count}/{v.max_uses ?? '∞'}
                      </button>
                      {v.total_discount_given > 0 && (
                        <p className="text-xs text-slate-400">{formatRupiah(v.total_discount_given)} total potongan</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {v.valid_until
                        ? new Date(v.valid_until).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
                        : <span className="text-emerald-600">Selamanya</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[v.effective_status] || STATUS_STYLE.NONAKTIF}`}>
                        {v.effective_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleToggle(v)}
                          title={v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className={`px-2 py-1 rounded text-xs font-medium transition border ${
                            v.is_active
                              ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}>
                          {v.is_active ? '⏸ Pause' : '▶ Aktif'}
                        </button>
                        {v.used_count === 0 && (
                          <button onClick={() => handleDelete(v)}
                            title="Hapus permanen"
                            className="px-2 py-1 rounded text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition">
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Klaim */}
      {detailVoucher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailVoucher(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Detail Klaim Voucher</h3>
                <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{detailVoucher.code}</span>
              </div>
              <button onClick={() => setDetailVoucher(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {loadingUsages ? (
                <p className="text-center text-slate-400 text-sm py-6">Memuat riwayat klaim...</p>
              ) : usages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Voucher ini belum pernah diklaim.</p>
              ) : (
                <div className="space-y-3">
                  {usages.map(u => (
                    <div key={u.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-800">{u.persons?.full_name}</p>
                          <p className="text-xs text-slate-400">{u.persons?.whatsapp}</p>
                          <p className="text-xs text-slate-400 mt-1">{u.events?.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 line-through">{formatRupiah(u.gross_amount)}</p>
                          <p className="text-emerald-600 font-medium text-xs">-{formatRupiah(u.discount_applied)}</p>
                          <p className="font-bold text-slate-800">{formatRupiah(u.net_amount)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 mt-2">
                        {new Date(u.used_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
