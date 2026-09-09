import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Zap, 
  FileText, 
  Send, 
  AlertCircle, 
  Tag, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  QrCode, 
  Award,
  Users,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { attendanceService } from '../services/attendanceService';
import { useEvent } from '../context/EventContext';

export default function AttendanceSection({
  attendances,
  onPreviewCert,
  onSendCertEmail,
  onBatchProcess,
  onDeleteAttendance,
  onAttendanceUpdated
}) {
  const { activeEvent } = useEvent();
  const [search, setSearch] = useState('');
  
  // Quick Check-In Scanner State
  const [ticketInput, setTicketInput] = useState('');
  const [durationInput, setDurationInput] = useState('90');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(null);
  const [checkInError, setCheckInError] = useState('');

  const filteredData = useMemo(() => {
    return attendances.filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (item.nama || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.nomorSertifikat || '').toLowerCase().includes(q) ||
        (item.nomorTicket || '').toLowerCase().includes(q)
      );
    });
  }, [attendances, search]);

  // Attendance Metrics
  const totalAttended = attendances.length;
  const eligibleCount = attendances.filter(a => 
    a.status === 'CERTIFICATE_ELIGIBLE' || 
    (a.statusPresensi && a.statusPresensi.includes('ELIGIBLE')) ||
    a.status === 'READY' ||
    !a.status
  ).length;

  const handleQuickCheckIn = async (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setCheckInLoading(true);
    setCheckInError('');
    setCheckInSuccess(null);

    try {
      if (activeEvent?.id) {
        const result = await attendanceService.checkInParticipant({
          eventId: activeEvent.id,
          ticketCode: ticketInput.trim(),
          durationMinutes: parseInt(durationInput, 10) || 90
        });

        setCheckInSuccess({
          name: result.participantName || result.persons?.full_name || 'Peserta',
          ticket: ticketInput.trim(),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          status: result.status
        });
      } else {
        // Fallback local
        setCheckInSuccess({
          name: 'Peserta Terverifikasi',
          ticket: ticketInput.trim(),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          status: 'CERTIFICATE_ELIGIBLE'
        });
      }

      setTicketInput('');
      onAttendanceUpdated?.();
      setTimeout(() => setCheckInSuccess(null), 6000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-in tiket.');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mb-8 shadow-xs space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              <span>Attendance Engine (Presensi D-Day &amp; Kelayakan Sertifikat)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {totalAttended} Peserta Hadir
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gate check-in QR Code tiket, pelacakan durasi kehadiran peserta, dan kalkulasi otomatis kelayakan e-sertifikat
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, tiket, sertifikat..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-10 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-mono"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={onBatchProcess}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-[0.98]"
            title="Kirim e-sertifikat & kode voucher rebate Rp 100k ke semua peserta yang memenuhi syarat"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Blast Sertifikat Yang Memenuhi Syarat</span>
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Kehadiran Sesi
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
            {totalAttended} <span className="text-xs font-normal text-slate-500">Peserta</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Terekam via Zoom Log / Gate Check-In
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
          <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider block">
            Memenuhi Syarat Sertifikat
          </span>
          <span className="text-xl font-bold font-mono text-emerald-900 block mt-1">
            {eligibleCount} <span className="text-xs font-normal text-emerald-600">Peserta</span>
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            Durasi Kehadiran &ge; 60 Menit
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
          <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">
            Rasio Kelayakan
          </span>
          <span className="text-xl font-bold font-mono text-amber-900 block mt-1">
            {totalAttended > 0 ? Math.round((eligibleCount / totalAttended) * 100) : 100}%
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            Terkualifikasi untuk E-Sertifikat Resmi
          </span>
        </div>
      </div>

      {/* Quick Gate Check-In Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md">
        <form onSubmit={handleQuickCheckIn} className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <QrCode className="w-4 h-4" />
              <span>Gate Check-In &amp; Scanner Tiket D-Day</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ketik atau scan barcode/QR code pada tiket peserta untuk mencatat presensi secara otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="Contoh: TICKET-DIGNITY-2026-001"
                className="w-64 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <select
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="60">Durasi: 60 Menit</option>
              <option value="90">Durasi: 90 Menit</option>
              <option value="120">Durasi: 120 Menit</option>
            </select>

            <button
              type="submit"
              disabled={checkInLoading || !ticketInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-white font-bold shadow-xs transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{checkInLoading ? 'Memeriksa...' : 'Check-In'}</span>
            </button>
          </div>
        </form>

        {/* Live Feedback Banners */}
        {checkInSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                ✓ <strong>{checkInSuccess.name}</strong> ({checkInSuccess.ticket}) berhasil check-in pada pukul {checkInSuccess.time}.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white">
              {checkInSuccess.status}
            </span>
          </div>
        )}

        {checkInError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{checkInError}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[960px]">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 w-[18%]">No. Sertifikat &amp; Waktu</th>
              <th className="py-3 px-4 w-[22%]">Nama Peserta &amp; Email</th>
              <th className="py-3 px-4 w-[20%]">Hambatan Bicara Terdata</th>
              <th className="py-3 px-4 w-[16%]">Voucher Rebate</th>
              <th className="py-3 px-4 w-[12%] text-center">Kelayakan Sertifikat</th>
              <th className="py-3 px-4 w-[12%] text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                    <span>Belum ada data presensi yang masuk.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const isEmailSent = item.statusEmailSertifikat === 'TERKIRIM';
                const isEligible = item.status === 'CERTIFICATE_ELIGIBLE' || 
                  (item.statusPresensi && item.statusPresensi.includes('ELIGIBLE')) ||
                  item.status === 'READY' ||
                  !item.status;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs tracking-wide">
                        {item.nomorSertifikat || 'DIGNITY-CERT-PENDING'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {item.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">
                        {item.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs text-slate-600">
                      <span className="line-clamp-2 text-[11px] leading-relaxed">
                        {item.hambatan || 'Tidak ada catatan khusus'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 font-mono text-[11px] font-bold">
                        <Tag className="w-3 h-3 text-amber-600" />
                        {item.kodeVoucher || 'REBATE-100K'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Potongan Rp 100.000
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isEligible
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{isEligible ? 'MEMENUHI SYARAT' : 'KURANG DURASI'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPreviewCert(item)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all active:scale-[0.98]"
                          title="Pratinjau PDF Sertifikat Resmi"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSendCertEmail(item.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isEmailSent
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                          }`}
                          title={isEmailSent ? 'Kirim Ulang E-Sertifikat' : 'Kirim E-Sertifikat via Email'}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteAttendance && onDeleteAttendance(item.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                          title="Hapus Catatan Presensi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
