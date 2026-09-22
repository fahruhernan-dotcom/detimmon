import React, { useState, useEffect } from 'react';
import { X, Edit3, Users, CreditCard, ShieldCheck, Tag, Trash2, RotateCcw } from 'lucide-react';
import { formatRupiah, parseRawNominal } from '../utils/formatters';
import { useConfirm } from '../context/ConfirmContext';

export default function EditRegistrantModal({ 
  isOpen, 
  onClose, 
  registrant, 
  onSave, 
  onDelete,
  onRestore,
  onPermanentDelete
}) {
  const confirm = useConfirm();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instansi, setInstansi] = useState('');
  const [packageType, setPackageType] = useState('individu'); // 'individu' | 'mabar' | 'custom'
  const [nominal, setNominal] = useState(100000);
  const [bank, setBank] = useState('Bank Mandiri');
  const [statusBayar, setStatusBayar] = useState('LUNAS');
  const [buktiUrl, setBuktiUrl] = useState('');
  const [catatanCS, setCatatanCS] = useState('');
  const [mabarMembers, setMabarMembers] = useState(['', '', '', '', '']);

  useEffect(() => {
    if (registrant) {
      setNama(registrant.nama || '');
      setEmail(registrant.email || '');
      setWhatsapp(registrant.whatsapp || '');
      setInstansi(registrant.instansi || '');
      setBank(registrant.bank || 'Bank Mandiri');
      setStatusBayar(registrant.statusBayar || 'LUNAS');
      setBuktiUrl(registrant.buktiUrl || registrant.rawBukti || '');
      setCatatanCS(registrant.catatanCS || '');
      
      const nom = parseRawNominal(registrant.nominal);
      setNominal(nom);

      const catLower = String(registrant.kategori || '').toLowerCase();
      if (catLower.includes('mabar') || nom === 500000) {
        setPackageType('mabar');
      } else if (nom === 100000) {
        setPackageType('individu');
      } else {
        setPackageType('custom');
      }

      if (registrant.mabarMembers && Array.isArray(registrant.mabarMembers)) {
        setMabarMembers(registrant.mabarMembers);
      } else {
        setMabarMembers(['', '', '', '', '']);
      }
    }
  }, [registrant]);

  if (!isOpen || !registrant) return null;

  const handlePackageChange = (type) => {
    setPackageType(type);
    if (type === 'individu') {
      setNominal(100000);
    } else if (type === 'mabar') {
      setNominal(500000);
    }
  };

  const handleMemberChange = (index, value) => {
    const next = [...mabarMembers];
    next[index] = value;
    setMabarMembers(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let kategoriStr = 'Individu (Rp 100.000)';
    if (packageType === 'mabar') {
      kategoriStr = 'Promo Mabar 5+1 Free (6 Peserta)';
    } else if (packageType === 'custom') {
      kategoriStr = `Kustom (${formatRupiah(nominal)})`;
    }

    onSave({
      ...registrant,
      nama,
      email,
      whatsapp: whatsapp.replace(/^0/, '62'),
      instansi: instansi || 'Individu',
      kategori: kategoriStr,
      nominal: parseInt(nominal, 10) || 100000,
      bank,
      statusBayar,
      buktiUrl,
      rawBukti: buktiUrl,
      catatanCS,
      mabarMembers: packageType === 'mabar' ? mabarMembers.filter(m => m.trim().length > 0) : []
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Edit Pendaftar &amp; Penentuan Nominal</h3>
              <p className="text-[11px] text-slate-500 font-mono">Tiket: {registrant.nomorTicket}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Jika Berada di Tempat Sampah */}
        {registrant.isDeleted && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between text-xs animate-fade-in flex-shrink-0">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Pendaftar ini berada di Tempat Sampah (Nonaktif)</span>
                <p className="text-[11px] text-rose-700">Data pendaftar ini tidak dihitung dalam kuota kursi maupun laporan kas.</p>
              </div>
            </div>
            {onRestore && (
              <button
                type="button"
                onClick={() => {
                  onRestore(registrant.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Section: Identitas Koordinator */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Data Peserta / Koordinator Pendaftar</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap &amp; Gelar:</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Rian Hidayat, S.Kom."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Peserta:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Asal Instansi / Perusahaan:</label>
              <input
                type="text"
                value={instansi}
                onChange={(e) => setInstansi(e.target.value)}
                placeholder="Contoh: BEM FIB UNS / Bank Mandiri / Umum"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section: Pemilihan Paket & Nominal */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Pilihan Paket &amp; Nominal Pembayaran</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Individu */}
              <div
                onClick={() => handlePackageChange('individu')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  packageType === 'individu'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className="font-bold text-xs">Individu (1 Pax)</div>
                <div className="font-mono text-amber-700 text-[11px] font-semibold mt-1">Rp 100.000</div>
                <div className="text-[10px] text-slate-500 mt-1">1 Tiket Akses Webinar</div>
              </div>

              {/* Option 2: Promo Mabar */}
              <div
                onClick={() => handlePackageChange('mabar')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  packageType === 'mabar'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1">
                  <span>Promo Mabar (6 Pax)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-mono">5+1</span>
                </div>
                <div className="font-mono text-purple-700 text-[11px] font-semibold mt-1">Rp 500.000</div>
                <div className="text-[10px] text-slate-500 mt-1">Total 6 Peserta (Hemat Rp 100k)</div>
              </div>

              {/* Option 3: Custom Nominal */}
              <div
                onClick={() => handlePackageChange('custom')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  packageType === 'custom'
                    ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <div className="font-bold text-xs">Kustom / Kode Unik</div>
                <div className="font-mono text-sky-700 text-[11px] font-semibold mt-1">Input Bebas</div>
                <div className="text-[10px] text-slate-500 mt-1">Multi-paket / kode unik transfer</div>
              </div>
            </div>

            {/* Nominal Editor */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nominal Pembayaran Riil (Rp):
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={nominal ? String(nominal) : ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setNominal(clean ? parseInt(clean, 10) : 0);
                  }}
                  placeholder="Contoh: 500000 atau 1038854"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-32 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono font-bold text-sm"
                />
                <div className="absolute right-3 top-2 text-xs text-amber-700 font-mono font-bold">
                  {formatRupiah(parseInt(nominal, 10) || 0)}
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-1">
                Nilai ini yang akan dihitung langsung ke dalam kas Bento KPI &amp; Laporan Laba Bersih Finansial.
              </p>
            </div>
          </div>

          {/* Section: Anggota Mabar (Jika Mabar dipilih) */}
          {packageType === 'mabar' && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>Daftar 5 Anggota Mabar Tambahan (5+1 Free)</span>
                </div>
                <span className="text-[10.5px] text-slate-500 font-medium">Total 6 Peserta</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Koordinator utama: <span className="text-slate-900 font-semibold">{nama || 'Belum diisi'}</span>. Masukkan nama 5 peserta lainnya di bawah ini:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mabarMembers.map((member, idx) => (
                  <div key={idx}>
                    <label className="block text-[10.5px] text-purple-800 mb-0.5 font-semibold">
                      Peserta {idx + 2}:
                    </label>
                    <input
                      type="text"
                      value={member}
                      onChange={(e) => handleMemberChange(idx, e.target.value)}
                      placeholder={`Nama Anggota ${idx + 2}`}
                      className="w-full bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Bank & Status Bayar */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rekening Pembayaran &amp; Status Verifikasi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rekening / Metode Transfer:</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Bank Mandiri">Bank Mandiri (138-00-2444747-8)</option>
                  <option value="BCA">Bank Central Asia (BCA)</option>
                  <option value="BNI">Bank Negara Indonesia (BNI)</option>
                  <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="Lainnya">Lainnya / Tunai</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setStatusBayar('LUNAS')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      statusBayar === 'LUNAS'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    LUNAS
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusBayar('PENDING')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      statusBayar === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    PENDING
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tautan Bukti Transfer (Google Drive URL / Gambar):</label>
              <input
                type="text"
                value={buktiUrl}
                onChange={(e) => setBuktiUrl(e.target.value)}
                placeholder="https://drive.google.com/open?id=... atau tautan berkas transfer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-xs"
              />
              <p className="text-[10.5px] text-slate-500 mt-1">
                Tautan Google Drive atau URL gambar struk bukti transfer pendaftar.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Catatan Admin / Keterangan Mutasi:</label>
              <textarea
                rows="2"
                value={catatanCS}
                onChange={(e) => setCatatanCS(e.target.value)}
                placeholder="Contoh: Transfer via Mandiri dari Donie a.n PT Dignity, kode unik 854"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100 flex-shrink-0">
            {registrant.isDeleted ? (
              <div className="flex items-center gap-2">
                {onPermanentDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Hapus Permanen Peserta?',
                        description: `Data pendaftar "${registrant.nama}" (${registrant.nomorTicket || '-'}) akan dihapus permanen dari database Supabase.`,
                        note: 'Peringatan: Seluruh riwayat tiket dan pembayaran akan ikut dihapus. Tindakan ini tidak dapat dibatalkan (Irreversible).',
                        variant: 'danger',
                        confirmText: 'Ya, Hapus Permanen',
                        cancelText: 'Batalkan'
                      });
                      if (ok) {
                        onPermanentDelete(registrant.id);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Hapus permanen dari database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen dari DB</span>
                  </button>
                )}
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(registrant.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pulihkan</span>
                  </button>
                )}
              </div>
            ) : (
              onDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Pindahkan ke Tempat Sampah?',
                      description: `Pendaftar "${registrant.nama}" akan dipindahkan ke Tempat Sampah dan dinonaktifkan dari daftar peserta aktif.`,
                      note: 'Data aman dan dapat dipulihkan kembali kapan saja.',
                      variant: 'warning',
                      confirmText: 'Pindahkan ke Sampah',
                      cancelText: 'Batalkan'
                    });
                    if (ok) {
                      onDelete(registrant.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                  title="Pindahkan pendaftar ini ke tempat sampah"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Pindahkan ke Tempat Sampah</span>
                </button>
              ) : <div></div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
