import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, ShieldCheck, Award, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { certificateService } from '../../services/certificateService';

export default function CertificateVerification({ initialCode = '' }) {
  const [code, setCode] = useState(initialCode);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Cek URL query param atau path hash jika ada
    const hash = window.location.hash;
    if (hash.includes('/verify/')) {
      const extracted = hash.split('/verify/')[1]?.split('?')[0];
      if (extracted) {
        setCode(extracted);
        verifyCode(extracted);
        return;
      }
    }
    if (initialCode) {
      verifyCode(initialCode);
    }
  }, [initialCode]);

  async function verifyCode(codeToVerify) {
    if (!codeToVerify) return;
    setLoading(true);
    setSearched(true);
    try {
      let data = null;
      try {
        data = await certificateService.verifyByCode(codeToVerify.trim());
      } catch (e) {
        console.warn('Supabase verify error, trying fallback:', e);
      }

      if (!data) {
        // Fallback: check local/sheet records
        try {
          const raw = localStorage.getItem('digniti_react_attendances');
          if (raw) {
            const list = JSON.parse(raw);
            const found = list.find(a => 
              a.nomorSertifikat === codeToVerify.trim() || 
              a.kodeVoucher === codeToVerify.trim() ||
              (a.nomorSertifikat && a.nomorSertifikat.toLowerCase().includes(codeToVerify.trim().toLowerCase()))
            );
            if (found) {
              data = {
                id: found.id,
                certificate_no: found.nomorSertifikat,
                verification_code: codeToVerify.trim(),
                normalized_name: found.nama,
                status: 'ISSUED',
                issued_at: found.timestamp || '2026-11-14',
                events: {
                  title: 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
                  event_type: 'WEBINAR',
                  date_start: '2026-11-14T09:00:00+07:00',
                  venue: 'Zoom Cloud Meeting'
                }
              };
            }
          }
        } catch {}
      }

      setCert(data);
    } catch (err) {
      console.error('Verifikasi error:', err);
      setCert(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    verifyCode(code);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500/30">
      
      {/* Container Box */}
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 pb-4 border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-1">
            <Award className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            LPK INDONESIA DIGNITY
          </h1>
          <p className="text-xs text-slate-400">
            Sistem Verifikasi Keaslian E-Sertifikat Resmi
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Masukkan Nomor Seri atau Kode Verifikasi..."
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
          >
            <Search className="w-4 h-4" />
            Verifikasi
          </button>
        </form>

        {/* Result Area */}
        {loading && (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Memeriksa basis data otoritatif Supabase...
          </div>
        )}

        {!loading && searched && (
          <div>
            {cert ? (
              <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">SERTIFIKAT SAH & TERDAFTAR</h3>
                    <p className="text-[11px] text-emerald-300/80">
                      Diterbitkan secara sah oleh Lembaga Pelatihan Kerja (LPK) Indonesia Dignity
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-emerald-900/40 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Penerima:</span>
                    <strong className="text-base text-white font-serif">{cert.normalized_name}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Pelatihan / Event:</span>
                    <strong className="text-slate-200">{cert.events?.title || 'Mastering Stage Confidence'}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nomor Sertifikat:</span>
                      <span className="font-mono text-amber-400 font-bold">{cert.certificate_no}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kode Verifikasi:</span>
                      <span className="font-mono text-slate-300">{cert.verification_code}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {cert.events?.date_start ? new Date(cert.events.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '14 November 2026'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {cert.events?.venue || 'Zoom Meeting'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center space-y-2">
                <XCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Sertifikat Tidak Ditemukan</h3>
                <p className="text-xs text-rose-300/80 max-w-sm mx-auto">
                  Kode verifikasi "{code}" tidak cocok dengan arsip resmi LPK Indonesia Dignity atau sertifikat telah dicabut.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
          LPK Indonesia Dignity • Kolaborasi Eksklusif Bersama KLTC®
        </div>

      </div>

    </div>
  );
}
