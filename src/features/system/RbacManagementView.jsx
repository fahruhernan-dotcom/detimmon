import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Key, 
  CheckCircle2, 
  Lock, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  UserCheck, 
  CreditCard, 
  Send, 
  Award, 
  Settings,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { staffAccessService } from '../../services/staffAccessService';

/**
 * RbacManagementView — Database-Driven Role-Based Access Control & Staff Whitelist
 * Strictly connected to Supabase table `staff_access`:
 * - Real-time add, role update, active toggle, and remove
 * - Protected Owner role
 * - Live permission matrix
 */
export default function RbacManagementView() {
  const confirm = useConfirm();
  const { user: authUser, role: currentRole, isOwner } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('CS');
  const [newUserNotes, setNewUserNotes] = useState('');

  // Load staff on mount
  useEffect(() => {
    loadStaffData();
  }, []);

  async function loadStaffData() {
    setLoading(true);
    try {
      const data = await staffAccessService.getAllStaff();
      if (data && data.length > 0) {
        setStaffList(data);
      } else {
        // Fallback seed display jika tabel masih kosong
        setStaffList([
          {
            id: 'owner-seed',
            full_name: 'Donie Kurniawan (Owner)',
            email: 'doniesdaily@gmail.com',
            role: 'OWNER',
            is_active: true,
            notes: 'Master Administrator & Owner LPK Dignity',
            last_login_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  }

  const permissionsMatrix = [
    { module: 'Verifikasi Pembayaran & Ledger Bank', finance: true, cs: false, eventMgr: false, admin: true, owner: true },
    { module: 'Kirim & Kirim Ulang E-Ticket / Akses', finance: false, cs: true, eventMgr: true, admin: true, owner: true },
    { module: 'Dual-Checkpoint Presensi & Override Hadir', finance: false, cs: false, eventMgr: true, admin: true, owner: true },
    { module: 'Penerbitan & Distribusi E-Sertifikat', finance: false, cs: false, eventMgr: false, admin: true, owner: true },
    { module: 'Broadcast WhatsApp & Email Massal', finance: false, cs: false, eventMgr: true, admin: true, owner: true },
    { module: 'Buat/Edit Acara Baru (Multi-Event Scalable)', finance: false, cs: false, eventMgr: true, admin: true, owner: true },
    { module: 'Manajemen Izin Staf & Akses Sistem (RBAC)', finance: false, cs: false, eventMgr: false, admin: false, owner: true },
  ];

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setActionLoading(true);
    setStatusMessage(null);

    try {
      await staffAccessService.addStaff({
        full_name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        notes: newUserNotes.trim()
      });

      setStatusMessage({ type: 'success', text: `Staf "${newUserName.trim()}" berhasil ditambahkan ke whitelist akses.` });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserNotes('');
      setIsAddUserOpen(false);
      await loadStaffData();
    } catch (err) {
      console.error('Gagal menambah staf:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menambahkan staf ke database.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (staff) => {
    if (staff.role === 'OWNER') {
      alert('Akun Owner utama tidak dapat dinonaktifkan.');
      return;
    }

    setActionLoading(true);
    try {
      await staffAccessService.updateStaff(staff.id, { is_active: !staff.is_active });
      await loadStaffData();
      setStatusMessage({ 
        type: 'success', 
        text: `Akses staf "${staff.full_name}" berhasil di-${!staff.is_active ? 'aktifkan' : 'nonaktifkan'}.` 
      });
    } catch (err) {
      alert('Gagal mengubah status staf: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (staffId, newRole) => {
    setActionLoading(true);
    try {
      await staffAccessService.updateStaff(staffId, { role: newRole });
      await loadStaffData();
      setStatusMessage({ type: 'success', text: 'Peran otorisasi staf berhasil diperbarui.' });
    } catch (err) {
      alert('Gagal mengubah peran: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async (staff) => {
    if (staff.role === 'OWNER') {
      setStatusMessage({ type: 'error', text: 'Akun Owner utama dilindungi dan tidak dapat dihapus dari sistem.' });
      return;
    }

    const ok = await confirm({
      title: 'Hapus Akses Staf?',
      description: `Apakah Anda yakin ingin menghapus staf "${staff.full_name}" (${staff.email}) dari whitelist akses Command Center?`,
      note: 'Staf ini tidak akan dapat login lagi ke sistem internal.',
      variant: 'danger',
      confirmText: 'Hapus Akses',
      cancelText: 'Batalkan'
    });

    if (ok) {
      setActionLoading(true);
      try {
        await staffAccessService.deleteStaff(staff.id);
        await loadStaffData();
        setStatusMessage({ type: 'success', text: `Staf "${staff.full_name}" berhasil dihapus dari sistem.` });
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Gagal menghapus staf: ' + err.message });
      } finally {
        setActionLoading(false);
      }
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'FINANCE':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'EVENT_MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'CS':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── TOP HEADER ──────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manajemen Hak Akses Staf &amp; Pengguna (RBAC)</h3>
              <p className="text-xs text-slate-500">
                Atur siapa saja staf yang diizinkan membuka Command Center LPK Dignity secara dinamis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadStaffData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh Data Staf"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Email Staf Resmi</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
          statusMessage.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── 1. TEAM MEMBERS TABLE ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Whitelist Akses Staf Aktif ({staffList.length})</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              Live Supabase SSOT
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Staf &amp; Alamat Email</th>
                <th className="py-3 px-4">Hak Peran (Role)</th>
                <th className="py-3 px-4">Status Izin Akses</th>
                <th className="py-3 px-4">Catatan Otorisasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Memuat daftar otorisasi staf...</span>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    Belum ada staf terdaftar di whitelist.
                  </td>
                </tr>
              ) : (
                staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{member.full_name}</span>
                        {member.role === 'OWNER' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-black">
                            MASTER
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{member.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {member.role === 'OWNER' ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${getRoleBadge(member.role)}`}>
                          OWNER
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          disabled={actionLoading}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${getRoleBadge(member.role)}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="FINANCE">FINANCE</option>
                          <option value="CS">CUSTOMER SERVICE</option>
                          <option value="EVENT_MANAGER">EVENT MANAGER</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(member)}
                        disabled={actionLoading || member.role === 'OWNER'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                        title={member.role === 'OWNER' ? 'Akun Owner selalu aktif' : 'Klik untuk mengubah status aktif'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span>{member.is_active ? 'Akses Aktif' : 'Ditangguhkan'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {member.notes || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {member.role !== 'OWNER' && (
                        <button
                          onClick={() => handleDeleteMember(member)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Cabut Akses Staf Secara Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. PERMISSION MATRIX GRID ────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Matriks Wewenang &amp; Otorisasi Fitur Sistem
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Ditegakkan oleh Supabase Database Rules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Modul Operasional</th>
                <th className="py-2.5 px-4 text-center">CS / Helpdesk</th>
                <th className="py-2.5 px-4 text-center">Finance</th>
                <th className="py-2.5 px-4 text-center">Event Mgr</th>
                <th className="py-2.5 px-4 text-center">Admin</th>
                <th className="py-2.5 px-4 text-center text-amber-800">Owner (Master)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40">
                  <td className="py-3 px-4 font-semibold text-slate-800">{p.module}</td>
                  <td className="py-3 px-4 text-center">
                    {p.cs ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.finance ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.eventMgr ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.admin ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.owner ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD USER MODAL ───────────────────────────────────── */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Tambah Email Staf ke Whitelist</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Izinkan akun staf membuka Command Center</p>
              </div>
              <button 
                onClick={() => setIsAddUserOpen(false)} 
                className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Staf *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sarah Anindita"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Email Resmi *</label>
                <input
                  type="email"
                  required
                  placeholder="sarah@dignity.id atau nama@gmail.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-sans"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Email ini yang nantinya digunakan staf untuk login.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran &amp; Wewenang (Role)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-sans cursor-pointer bg-white"
                >
                  <option value="CS">Customer Service (Kirim Ulang Tiket, Presensi, Info Peserta)</option>
                  <option value="FINANCE">Finance (Verifikasi Mutasi Bank &amp; Ledger Pembayaran)</option>
                  <option value="EVENT_MANAGER">Event Manager (Rundown, Presensi, Sertifikat)</option>
                  <option value="ADMIN">Administrator (Akses Penuh Kecuali Kelola Staf)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Keterangan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Koordinator Bootcamp Solo Batch 2"
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Simpan ke Whitelist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
