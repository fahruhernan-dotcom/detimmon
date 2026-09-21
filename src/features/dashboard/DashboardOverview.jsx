import React, { useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  CreditCard, 
  Send, 
  Award, 
  Eye, 
  Users, 
  Check, 
  TrendingUp, 
  Calendar,
  Sparkles,
  Link2,
  Trash2
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import { formatRupiah, formatDate } from '../../utils/formatters';

/**
 * DashboardOverview — "What Needs Action Now?"
 * Strictly implements DASHBOARD_SPEC.md:
 * 1. Action Inbox (Highest Priority)
 * 2. Revenue Summary (Top Right)
 * 3. Operational Summary (4 KPI Tiles)
 * 4. Recent Activity Feed
 */
export default function DashboardOverview({
  registrants = [],
  attendances = [],
  activeEvent,
  onNavigateTab,
  onOpenDrawerWithParticipant
}) {
  const { events, setActiveEventId } = useEvent();
  const nextEvent = activeEvent?.next_event_id ? events.find(e => e.id === activeEvent.next_event_id) : null;
  const parentEvent = activeEvent?.parent_event_id ? events.find(e => e.id === activeEvent.parent_event_id) : null;

  // ── 0. Active vs Soft-Deleted Registrants ──────────────────
  const activeRegistrants = useMemo(() => registrants.filter(r => !r.isDeleted), [registrants]);
  const deletedRegistrants = useMemo(() => registrants.filter(r => r.isDeleted), [registrants]);

  // ── 1. Calculate Action Inbox Items ────────────────────────
  const pendingPayments = activeRegistrants.filter(r => r.statusBayar === 'PENDING');
  const unreviewedProofs = activeRegistrants.filter(r => r.statusBayar === 'PENDING' && Boolean(r.buktiBayar));
  const unsentTickets = activeRegistrants.filter(r => r.statusBayar === 'LUNAS' && r.statusEmailTicket !== 'TERKIRIM');
  const unsentCertificates = attendances.filter(a => a.statusSertifikat !== 'SELESAI');

  // ── 2. Calculate Revenue Metrics ───────────────────────────
  const verifiedRevenue = activeRegistrants
    .filter(r => r.statusBayar === 'LUNAS')
    .reduce((acc, r) => acc + (r.nominal || 0), 0);

  const pendingRevenue = activeRegistrants
    .filter(r => r.statusBayar === 'PENDING')
    .reduce((acc, r) => acc + (r.nominal || 0), 0);

  const expectedTotalRevenue = verifiedRevenue + pendingRevenue;

  // ── 3. Operational KPIs ────────────────────────────────────
  const totalPeserta = activeRegistrants.length;
  const verifiedBayarCount = activeRegistrants.filter(r => r.statusBayar === 'LUNAS').length;
  const hadirCount = attendances.length;
  const tiketTerkirimCount = activeRegistrants.filter(r => r.statusEmailTicket === 'TERKIRIM').length;

  // ── 4. Recent Activity (Derived from last active registrants) ──────
  const recentActivities = [...activeRegistrants]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 5)
    .map(item => {
      let action = 'Pendaftaran Baru';
      let type = 'info';
      if (item.statusBayar === 'LUNAS' && item.statusEmailTicket === 'TERKIRIM') {
        action = 'E-Ticket Terkirim';
        type = 'success';
      } else if (item.statusBayar === 'LUNAS') {
        action = 'Pembayaran Terverifikasi';
        type = 'success';
      } else if (item.buktiBayar) {
        action = 'Bukti Bayar Diunggah';
        type = 'warning';
      }

      return {
        id: item.id,
        nama: item.nama,
        action,
        type,
        time: item.timestamp ? formatDate(item.timestamp) : 'Baru saja',
        participant: item
      };
    });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ── TOP SECTION: ACTION INBOX & REVENUE SUMMARY ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Section 1: Action Inbox (Highest Priority) (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 breathing-dot"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-display">
                  Kotak Tindakan Cepat (Action Inbox)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Prioritas Operasional</span>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Daftar antrean tugas yang memerlukan aksi segera dari admin/finance hari ini.
            </p>

            <div className="space-y-3">
              {/* Item 1: Pending Payments */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                pendingPayments.length > 0 
                  ? 'bg-rose-50/50 border-rose-200/80 text-rose-950' 
                  : 'bg-slate-50/60 border-slate-200/60 text-slate-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    pendingPayments.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>{pendingPayments.length} Pembayaran Menunggu Verifikasi</span>
                      {pendingPayments.length > 0 && (
                        <span className="text-[10px] font-mono font-normal text-rose-600">
                          ({formatRupiah(pendingRevenue)})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {pendingPayments.length > 0 
                        ? 'Peserta telah mendaftar dan menunggu review bukti transfer.' 
                        : 'Semua pembayaran pendaftar telah terverifikasi ✓'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('payments', 'pending')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-all shrink-0 ml-3 flex items-center gap-1"
                >
                  <span>Ke Pembayaran</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Item 2: Ticket Not Sent */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                unsentTickets.length > 0 
                  ? 'bg-amber-50/50 border-amber-200/80 text-amber-950' 
                  : 'bg-slate-50/60 border-slate-200/60 text-slate-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    unsentTickets.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <div className="text-xs font-bold">
                      {unsentTickets.length} E-Ticket Belum Terkirim
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {unsentTickets.length > 0 
                        ? 'Pembayaran sudah lunas tapi tiket belum dikirim via Gmail/WhatsApp.' 
                        : 'Seluruh peserta lunas telah memegang tiket ✓'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('tickets', 'unsent')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-all shrink-0 ml-3 flex items-center gap-1"
                >
                  <span>Ke Tiket</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Item 3: Proofs Without Review */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                unreviewedProofs.length > 0 
                  ? 'bg-sky-50/50 border-sky-200/80 text-sky-950' 
                  : 'bg-slate-50/60 border-slate-200/60 text-slate-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    unreviewedProofs.length > 0 ? 'bg-sky-500' : 'bg-slate-300'
                  }`} />
                  <div>
                    <div className="text-xs font-bold">
                      {unreviewedProofs.length} Bukti Bayar Siap Direview
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lampiran foto struk/transfer sudah masuk ke sistem.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('payments', 'pending')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-all shrink-0 ml-3 flex items-center gap-1"
                >
                  <span>Review Bukti</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Item 4: Certificates Not Issued */}
              <div className="p-3.5 rounded-xl border bg-slate-50/60 border-slate-200/60 text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    unsentCertificates.length > 0 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <div className="text-xs font-bold">
                      {unsentCertificates.length} Sertifikat Menunggu Penerbitan
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {unsentCertificates.length > 0 
                        ? 'Peserta hadir webinar yang belum menerima sertifikat pasca-event.' 
                        : 'Semua sertifikat peserta hadir telah terbit ✓'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('sertifikat')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-all shrink-0 ml-3 flex items-center gap-1"
                >
                  <span>Ke Sertifikat</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Item 5: Trash Notification (if any) */}
              {deletedRegistrants.length > 0 && (
                <div className="p-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 text-rose-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-xs text-rose-800 font-medium">
                      <strong>{deletedRegistrants.length} pendaftar</strong> berada di Tempat Sampah (tidak dihitung di data aktif)
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('registrants')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 shadow-2xs transition-all shrink-0 ml-2"
                  >
                    Buka Sampah
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Revenue Summary (Top Right) (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-display">
                Ringkasan Finansial Event
              </h2>
              <button 
                onClick={() => onNavigateTab('revenue')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>Detail P&L</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Arus kas masuk dari penjualan tiket webinar / bootcamp untuk event aktif.
            </p>

            <div className="space-y-4">
              {/* Verified Revenue Tile */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Omset Terverifikasi (LUNAS)
                </div>
                <div className="text-2xl font-extrabold text-emerald-950 font-mono mt-1 tracking-tight">
                  {formatRupiah(verifiedRevenue)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Dari {verifiedBayarCount} transaksi tiket terverifikasi
                </div>
              </div>

              {/* Pending & Expected Total */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                  <div className="text-[10.5px] font-bold uppercase text-amber-900">
                    Menunggu Bayar
                  </div>
                  <div className="text-base font-bold text-amber-950 font-mono mt-0.5">
                    {formatRupiah(pendingRevenue)}
                  </div>
                  <div className="text-[10px] text-amber-700">
                    {pendingPayments.length} pendaftar pending
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10.5px] font-bold uppercase text-slate-600">
                    Estimasi Total
                  </div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {formatRupiah(expectedTotalRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Jika 100% pending lunas
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Event: <strong>{activeEvent?.title || 'Webinar 14 Nov 2026'}</strong></span>
            <span className="font-mono text-[11px]">{activeEvent?.event_type || 'WEBINAR'}</span>
          </div>
        </div>

      </div>

      {/* ── ECOSYSTEM FUNNEL CHAINING TILE ────── */}
      {(nextEvent || parentEvent) && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Keterkaitan Funnel Ekosistem
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {parentEvent ? `Menerima peserta dari ${parentEvent.title}` : 'Pintu Masuk Funnel (Top-of-Funnel)'}
                {nextEvent ? ` ➔ Disambungkan ke ${nextEvent.title}` : ' (Puncak Program)'}
              </div>
              {activeEvent?.rebate_voucher_code && (
                <div className="text-xs text-slate-500 mt-0.5">
                  Insentif Alumni: Potongan {formatRupiah(activeEvent.rebate_voucher_amount || 100000)} dengan kode{' '}
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    {activeEvent.rebate_voucher_code}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('conversion')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              Lihat Funnel Konversi
            </button>
            {nextEvent && (
              <button
                onClick={() => {
                  setActiveEventId(nextEvent.id);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <span>Buka {nextEvent.event_type}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 3: OPERATIONAL SUMMARY (4 KPI TILES) ──── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ringkasan Operasional (4 Pilar Indikator)
          </h2>
          <span className="text-xs text-slate-500">Update real-time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Tile 1: Total Peserta */}
          <div 
            onClick={() => onNavigateTab('registrants')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Peserta</span>
              <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
            <div className="text-2xl font-black text-slate-950 font-mono">{totalPeserta}</div>
            <div className="text-[11px] text-slate-400 mt-1">Terdaftar di sistem</div>
          </div>

          {/* Tile 2: Bayar Verified */}
          <div 
            onClick={() => onNavigateTab('payments', 'verified')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Bayar Verified</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">{verifiedBayarCount}</div>
            <div className="text-[11px] text-emerald-600 mt-1">
              {totalPeserta > 0 ? `${Math.round((verifiedBayarCount / totalPeserta) * 100)}% rasio lunas` : '0%'}
            </div>
          </div>

          {/* Tile 3: Hadir */}
          <div 
            onClick={() => onNavigateTab('attendance')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Peserta Hadir</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-700 font-mono">{hadirCount}</div>
            <div className="text-[11px] text-indigo-600 mt-1">Presensi webinar</div>
          </div>

          {/* Tile 4: Tiket Terkirim */}
          <div 
            onClick={() => onNavigateTab('tickets', 'sent')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Tiket Terkirim</span>
              <Send className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-950 font-mono">{tiketTerkirimCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {verifiedBayarCount > 0 ? `${Math.round((tiketTerkirimCount / verifiedBayarCount) * 100)}% dari lunas` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: RECENT ACTIVITY FEED ────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-display">
              Aktivitas Terkini (Recent Activity)
            </h2>
          </div>
          <button 
            onClick={() => onNavigateTab('registrants')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Lihat Seluruh Peserta &rarr;
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Belum ada catatan aktivitas pendaftar pada sesi ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((act) => (
              <div 
                key={act.id}
                onClick={() => onOpenDrawerWithParticipant && onOpenDrawerWithParticipant(act.participant)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    act.type === 'success' ? 'bg-emerald-500' : act.type === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                      {act.nama}
                    </span>
                    <span className="text-slate-400 text-xs mx-2">&bull;</span>
                    <span className="text-xs text-slate-500">{act.action}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{act.time}</span>
                  <span className="text-xs text-slate-300 group-hover:text-slate-600 transition-colors">&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
