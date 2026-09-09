import React from 'react';
import { Users, CheckCircle2, Clock, Banknote, Award } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export default function KpiBento({ stats }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* 1. Total Registrants */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 group relative">
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Pendaftar
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Users className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {stats.totalRegistrants}
          </span>
          <span className="text-xs text-slate-500 font-medium">peserta</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
          Target kuota: 50 pax
        </div>
      </div>

      {/* 2. Confirmed Paid (Lunas) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-emerald-500"></div>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 breathing-dot"></span>
            Terverifikasi Lunas
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-emerald-700 font-mono">
            {stats.lunasCount}
          </span>
          <span className="text-xs text-emerald-600 font-medium">tiket aktif</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
          Email tiket otomatis
        </div>
      </div>

      {/* 3. Pending Verification */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-amber-500"></div>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 breathing-dot"></span>
            Menunggu Cek
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <Clock className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-amber-700 font-mono">
            {stats.pendingCount}
          </span>
          <span className="text-xs text-amber-600 font-medium">pending</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
          Perlu cek bukti mutasi
        </div>
      </div>

      {/* 4. Real Revenue Inflow */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-amber-600"></div>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Kas Riil Masuk
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <Banknote className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {formatRupiah(stats.totalRevenue)}
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
          Rekening Dignity
        </div>
      </div>

      {/* 5. Certificates Issued */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-indigo-500"></div>
        <div className="flex justify-between items-start">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            E-Sertifikat
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700">
            <Award className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {stats.certCount}
          </span>
          <span className="text-xs text-indigo-600 font-medium">terbit</span>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
          Kupon rebate Rp 100k
        </div>
      </div>
    </section>
  );
}
