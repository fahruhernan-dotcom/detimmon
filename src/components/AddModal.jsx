import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { paymentAccountService } from '../services/paymentAccountService';

export default function AddModal({ isOpen, onClose, onAddRegistrant, activeEventId }) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instansi, setInstansi] = useState('');
  const [kategori, setKategori] = useState('Individu (Rp 100.000)');
  const [bank, setBank] = useState('Bank Transfer');
  const [statusBayar, setStatusBayar] = useState('LUNAS');
  const [activeAccounts, setActiveAccounts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      paymentAccountService.getActiveAccounts(activeEventId).then(accounts => {
        setActiveAccounts(accounts || []);
        if (accounts && accounts.length > 0) {
          setBank(`${accounts[0].bank_name} - ${accounts[0].account_number}`);
        } else {
          setBank('Bank Transfer');
        }
      }).catch(() => {
        setActiveAccounts([]);
        setBank('Bank Transfer');
      });
    }
  }, [isOpen, activeEventId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nama || !email || !whatsapp) return;

    const isKomunitas = kategori.includes('Komunitas');
    const isMabar = kategori.includes('Mabar');
    const nominal = isKomunitas ? 1000000 : isMabar ? 500000 : 100000;
    const packageType = isKomunitas ? 'MABAR_11' : isMabar ? 'MABAR_6' : 'INDIVIDU';

    onAddRegistrant({
      nama,
      email,
      whatsapp: whatsapp.replace(/^0/, '62'),
      instansi: instansi || 'Individu',
      kategori,
      packageType,
      bank,
      nominal,
      statusBayar
    });

    onClose();
    // Reset
    setNama('');
    setEmail('');
    setWhatsapp('');
    setInstansi('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 font-display">Tambah Pendaftar Baru (Manual Input)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap &amp; Gelar:</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Rian Hidayat, S.Kom."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Peserta:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">No. WhatsApp (Aktif):</label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="081234567890"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Asal Instansi / Perusahaan:</label>
            <input
              type="text"
              value={instansi}
              onChange={(e) => setInstansi(e.target.value)}
              placeholder="Contoh: BEM FIB UNS / Bank Mandiri"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kategori Tiket:</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              >
                <option value="Individu (Rp 100.000)">Individu (Rp 100.000)</option>
                <option value="Promo Mabar (Rp 500.000)">Promo Mabar 6 Pax (Rp 500.000)</option>
                <option value="Promo Komunitas (Rp 1.000.000)">Promo Komunitas 11 Pax (Rp 1.000.000)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Rekening / Saluran Tujuan:</label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              >
                {activeAccounts.length > 0 ? (
                  activeAccounts.map(acc => (
                    <option key={acc.id} value={`${acc.bank_name} - ${acc.account_number}`}>
                      {acc.bank_name} - {acc.account_number} ({acc.account_holder})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Bank Transfer">Bank Transfer (Menunggu Akun Resmi)</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Tunai / Kas">Tunai / Kas Operasional</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Status Verifikasi:</label>
            <select
              value={statusBayar}
              onChange={(e) => setStatusBayar(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            >
              <option value="LUNAS">LUNAS (Langsung Terbitkan E-Ticket)</option>
              <option value="PENDING">PENDING (Menunggu Verifikasi Mutasi)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition-all active:scale-[0.98]"
            >
              Simpan &amp; Terbitkan Tiket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
