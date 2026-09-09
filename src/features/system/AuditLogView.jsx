import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard, 
  Ticket, 
  UserCheck, 
  Award, 
  Settings,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

/**
 * AuditLogView — Security & Operational Audit Trail Workspace
 * Strictly implements PHASE_16_UI_UX_SECURITY_AUDIT.md:
 * - Searchable log of sensitive actions (Payment verify/reject, Batch blasts, Presensi override, Certificates)
 * - Actor, Action, Module, Timestamp, and Before/After changes
 * - Zero secrets exposed
 * - White Luxury Minimal design aesthetic
 */
export default function AuditLogView() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  // Simulated live audit log feed derived from system actions
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'aud-101',
      actor: 'doniesdaily@gmail.com (Owner)',
      module: 'PAYMENTS',
      action: 'VERIFY_PAYMENT',
      target: 'Budi Santoso (TICKET-DIGNITY-001)',
      details: 'Status diubah dari PENDING menjadi LUNAS. Disinkronkan ke Google Sheets & E-Ticket dikirim via Gmail.',
      ip: '172.23.10.229',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      severity: 'INFO'
    },
    {
      id: 'aud-102',
      actor: 'doniesdaily@gmail.com (Owner)',
      module: 'ATTENDANCE',
      action: 'MANUAL_OVERRIDE',
      target: 'Siti Rahmawati (TICKET-DIGNITY-002)',
      details: 'Durasi presensi disesuaikan menjadi 90 menit (Berhak E-Sertifikat). Alasan: Hadir sesi Zoom via link backup.',
      ip: '172.23.10.229',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      severity: 'WARNING'
    },
    {
      id: 'aud-103',
      actor: 'System Automation',
      module: 'CERTIFICATES',
      action: 'BATCH_ISSUE_CERTIFICATES',
      target: '18 Peserta Terverifikasi',
      details: 'Penerbitan nomor seri resmi LPK-DIGNITY/CERT/2026/xxxxxx dan kode verifikasi QR tamper-proof.',
      ip: 'Cloud Supabase Server',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      severity: 'INFO'
    },
    {
      id: 'aud-104',
      actor: 'finance@dignity.id (Finance)',
      module: 'PAYMENTS',
      action: 'REJECT_PAYMENT',
      target: 'Rahmat Hidayat (REG-901)',
      details: 'Pembayaran ditolak. Alasan: Bukti transfer buram/tidak terbaca nominal.',
      ip: '114.124.201.12',
      timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      severity: 'WARNING'
    },
    {
      id: 'aud-105',
      actor: 'doniesdaily@gmail.com (Owner)',
      module: 'SYSTEM',
      action: 'UPDATE_CONFIG',
      target: 'Google OAuth & Spreadsheet Binding',
      details: 'Memperbarui client ID Google dan parameter active spreadsheet ID.',
      ip: '172.23.10.229',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      severity: 'HIGH'
    }
  ]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.actor.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, moduleFilter, search]);

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
              <h3 className="text-sm font-bold text-slate-900">Security & Operational Audit Trail</h3>
              <p className="text-xs text-slate-500">Pencatatan riwayat aktivitas sensitif, perubahan status finansial, dan audit akses</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Audit Engine: Active Logging</span>
          </span>
        </div>
      </div>

      {/* ── 1. FILTER CONTROLS ───────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            {['ALL', 'PAYMENTS', 'ATTENDANCE', 'CERTIFICATES', 'SYSTEM'].map(mod => (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  moduleFilter === mod
                    ? 'bg-white text-slate-950 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mod === 'ALL' ? 'Semua Log' : mod}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aktor, tindakan, atau peserta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-slate-400 outline-none transition-all"
            />
          </div>

        </div>
      </div>

      {/* ── 2. AUDIT TRAIL LOG TABLE ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Aktor / Pengguna</th>
                <th className="py-3 px-4">Modul & Tindakan</th>
                <th className="py-3 px-4">Entitas Target</th>
                <th className="py-3 px-4">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>

                  {/* Actor */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.actor}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">IP: {log.ip}</span>
                  </td>

                  {/* Module & Action */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono uppercase">
                      Modul: {log.module}
                    </span>
                  </td>

                  {/* Target Entity */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {log.target}
                  </td>

                  {/* Change Details */}
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
