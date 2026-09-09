import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  CreditCard, 
  Calendar, 
  ShieldAlert, 
  Key, 
  Users, 
  AlertCircle,
  Clock,
  FileQuestion,
  RotateCw,
  Download,
  Folder
} from 'lucide-react';
import { formatRupiah, formatDate } from '../../utils/formatters';
import { getDriveFileId, fetchDriveImageBlobUrl, requestGoogleAccessToken, uploadFileToDriveFolder } from '../../services/googleApiService';

/**
 * FastVerifyModal — Mode Verifikasi Kilat (Speed-Queue Payment Verification)
 * Dirancang khusus untuk efisiensi admin:
 * - Pratinjau bukti transfer berukuran besar di sisi kiri dengan zoom & pan
 * - Ringkasan data peserta & nominal di sisi kanan
 * - Tombol "Verifikasi Lunas & Lanjut ➔" yang otomatis memverifikasi dan bergeser ke antrean berikutnya
 * - Mendukung keyboard shortcuts: Enter (Verif & Next), ArrowRight (Skip), ArrowLeft (Prev), Esc (Close)
 */
export default function FastVerifyModal({
  isOpen,
  onClose,
  allRegistrants = [],
  pendingRegistrants = [],
  initialParticipantId = null,
  onVerifyPayment,
  onRejectPaymentWithReason,
  googleOAuthToken,
  clientId,
  onAuthorizeSuccess,
  onPreviewEmail,
  activeEvent
}) {
  if (!isOpen) return null;

  // Filter mode: 'pending' atau 'all'
  const hasPending = pendingRegistrants.length > 0;
  const [filterMode, setFilterMode] = useState(() => {
    if (initialParticipantId) {
      const isInitialPending = pendingRegistrants.some(p => p.id === initialParticipantId);
      return isInitialPending ? 'pending' : 'all';
    }
    return hasPending ? 'pending' : 'all';
  });

  const queue = filterMode === 'pending' && pendingRegistrants.length > 0
    ? pendingRegistrants 
    : (allRegistrants.length > 0 ? allRegistrants : pendingRegistrants);

  // Cari index awal berdasarkan initialParticipantId
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialParticipantId) {
      const idx = queue.findIndex(p => p.id === initialParticipantId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  // Sinkronisasi index saat initialParticipantId berubah
  useEffect(() => {
    if (initialParticipantId) {
      const idx = queue.findIndex(p => p.id === initialParticipantId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [initialParticipantId]);

  const isAllDone = queue.length === 0 || currentIndex >= queue.length;
  const currentParticipant = !isAllDone ? queue[currentIndex] : null;

  // State tampilan gambar
  const [zoomLevel, setZoomLevel] = useState(1);
  const [blobData, setBlobData] = useState(null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [directImageError, setDirectImageError] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // State Rejection inline
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Bukti Buram / Tidak Terbaca');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // State untuk cadangan bukti ke Google Drive
  const [isDriveBackupLoading, setIsDriveBackupLoading] = useState(false);
  const [driveBackupResult, setDriveBackupResult] = useState(null); // { success, fileId, name }

  // Ekstrak URL bukti transfer (mendukung berbagai format key)
  const rawUrl = String(
    currentParticipant?.buktiBayar || 
    currentParticipant?.rawBuktiBayar || 
    currentParticipant?.buktiUrl || 
    currentParticipant?.rawBukti || 
    ''
  ).trim();
  const isDataOrBlobUrl = rawUrl.startsWith('data:') || rawUrl.startsWith('blob:');
  const fileId = isDataOrBlobUrl ? null : getDriveFileId(rawUrl);
  const isInvalidProof = !rawUrl || rawUrl === '100000' || (!rawUrl.startsWith('http') && !isDataOrBlobUrl && !fileId);

  // Load bukti saat berganti peserta
  useEffect(() => {
    if (!currentParticipant || isInvalidProof) {
      setBlobData(null);
      return;
    }

    let isMounted = true;
    setDirectImageError(false);
    setBlobData(null);
    setZoomLevel(1);
    setDriveBackupResult(null);
    setIsRejectOpen(false);

    if (isDataOrBlobUrl) {
      setBlobData({
        blobUrl: rawUrl,
        isPdf: rawUrl.startsWith('data:application/pdf'),
        mimeType: rawUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'
      });
      return;
    }

    if (!fileId) return;

    if (googleOAuthToken) {
      setIsBlobLoading(true);
      fetchDriveImageBlobUrl(fileId, googleOAuthToken)
        .then((res) => {
          if (!isMounted) return;
          if (res?.blobUrl) {
            setBlobData(res);
          }
        })
        .catch((err) => console.warn('FastVerify blob fetch notice:', err))
        .finally(() => {
          if (isMounted) setIsBlobLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [currentParticipant?.id, fileId, googleOAuthToken, isInvalidProof, isDataOrBlobUrl, rawUrl]);

  // Keyboard Shortcuts: Enter (Verif), ArrowRight (Next), ArrowLeft (Prev), Esc (Close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !isAllDone && !isRejectOpen) {
        e.preventDefault();
        handleVerifyAndNext();
      } else if (e.key === 'ArrowRight' && !isAllDone) {
        e.preventDefault();
        handleSkipNext();
      } else if (e.key === 'ArrowLeft' && !isAllDone) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAllDone, isRejectOpen, currentParticipant]);

  // Aksi: Verifikasi & Lanjut Otomatis
  const handleVerifyAndNext = () => {
    if (!currentParticipant) return;
    const currentId = currentParticipant.id;
    
    // Jika masih pending, verifikasi
    if (currentParticipant.statusBayar === 'PENDING' && onVerifyPayment) {
      onVerifyPayment(currentId);
    }

    // Lanjut ke item berikutnya
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (filterMode === 'pending') {
        setCurrentIndex(queue.length);
      }
    }
  };

  // Aksi: Skip / Lewati ke Berikutnya
  const handleSkipNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Aksi: Kembali ke Sebelumnya
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Aksi: Tolak Pembayaran & Lanjut
  const handleConfirmReject = () => {
    if (!currentParticipant) return;
    const fullReason = rejectCustomNote.trim() 
      ? `${rejectReason}: ${rejectCustomNote.trim()}`
      : rejectReason;

    if (onRejectPaymentWithReason) {
      onRejectPaymentWithReason(currentParticipant.id, fullReason);
    }
    setIsRejectOpen(false);
    setRejectCustomNote('');

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(queue.length);
    }
  };

  // 1-Klik Authorize Google Drive
  const handleQuickAuthorize = () => {
    const activeClientId = clientId || '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com';
    setIsAuthorizing(true);
    requestGoogleAccessToken(
      activeClientId,
      (newToken) => {
        setIsAuthorizing(false);
        if (onAuthorizeSuccess) onAuthorizeSuccess(newToken);
        if (fileId) {
          setIsBlobLoading(true);
          fetchDriveImageBlobUrl(fileId, newToken)
            .then(res => { if (res?.blobUrl) setBlobData(res); })
            .finally(() => setIsBlobLoading(false));
        }
      },
      () => setIsAuthorizing(false)
    );
  };

  const directDriveUrl = fileId 
    ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` 
    : (rawUrl.startsWith('http') ? rawUrl : '#');

  const directCdnUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : rawUrl;
  const imageSrc = isDataOrBlobUrl ? rawUrl : (blobData?.blobUrl || directCdnUrl);

  const isMabar = (currentParticipant?.kategori || '').toLowerCase().includes('mabar') || currentParticipant?.nominal === 500000;
  const isCurrentLunas = currentParticipant?.statusBayar === 'LUNAS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ── MODAL HEADER ────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 font-display">
                  Pratinjau Bukti & Verifikasi Kilat
                </h2>
                {!isAllDone && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    {currentIndex + 1} dari {queue.length}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Pratinjau bukti transfer langsung, verifikasi 1-klik, dan geser ke peserta berikutnya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle: Semua vs Pending */}
            <div className="hidden sm:inline-flex p-0.5 rounded-xl bg-slate-200/80 text-xs font-semibold">
              <button
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({allRegistrants.length || queue.length})
              </button>
              <button
                onClick={() => {
                  setFilterMode('pending');
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterMode === 'pending' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingRegistrants.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY ──────────────────────────────────────── */}
        {isAllDone ? (
          /* Layar Sukses Semua Antrean Selesai */
          <div className="p-12 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Semua Pembayaran Selesai Diverifikasi! 🎉</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tidak ada lagi antrean peserta pending pada filter ini. Seluruh status pembayaran dan tiket telah mutakhir.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIndex(0);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Tinjau Semua Bukti Pendaftar
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        ) : (
          /* Tampilan Split: Kiri = Bukti Transfer, Kanan = Data Peserta */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
            
            {/* Sisi Kiri: Viewer Bukti Transfer (7 Kolom) */}
            <div className="md:col-span-7 bg-slate-900/95 p-4 flex flex-col justify-between border-r border-slate-200 relative min-h-[360px] md:min-h-[500px]">
              {/* Zoom & External Controls Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs text-slate-300">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Struk Bukti Pembayaran</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isCurrentLunas ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {currentParticipant.statusBayar}
                  </span>
                </span>
                
                <div className="flex items-center gap-1 bg-slate-800/90 rounded-lg p-1 border border-slate-700/60">
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors text-[10px] font-mono px-1.5"
                    title="Reset Zoom"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  {directDriveUrl !== '#' && !isDataOrBlobUrl && (
                    <a
                      href={directDriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-sky-400 hover:text-sky-300 hover:bg-slate-700 rounded transition-colors ml-1"
                      title="Buka File Asli di Tab Baru Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {isDataOrBlobUrl && (
                    <a
                      href={rawUrl}
                      download={`bukti-${currentParticipant?.nomorTicket || 'transfer'}.png`}
                      className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded transition-colors ml-1"
                      title="Unduh Berkas Bukti Transfer Asli"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Area Gambar / Pratinjau */}
              <div className="flex-1 flex items-center justify-center overflow-auto p-2 my-auto">
                {isInvalidProof ? (
                  <div className="text-center p-8 space-y-2.5 text-slate-400">
                    <FileQuestion className="w-12 h-12 text-slate-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">Belum Ada Tautan Bukti Transfer</p>
                    <p className="text-[11.5px] text-slate-400 max-w-xs leading-relaxed">
                      Peserta ini belum mengunggah struk transfer atau mendaftar manual oleh panitia.
                    </p>
                  </div>
                ) : isBlobLoading ? (
                  <div className="text-center p-8 space-y-2 text-slate-400">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-300">Memuat gambar bukti via Google Drive API...</p>
                  </div>
                ) : blobData?.isPdf ? (
                  <iframe
                    src={blobData.blobUrl}
                    title="Bukti Transfer PDF"
                    className="w-full h-full min-h-[420px] rounded-lg border border-slate-800"
                  />
                ) : directImageError && !blobData?.blobUrl ? (
                  <div className="p-6 text-center space-y-3 max-w-xs mx-auto bg-slate-800/80 rounded-2xl border border-slate-700 text-slate-200">
                    <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs font-bold">Google Drive Memerlukan Izin</p>
                    <p className="text-[11px] text-slate-400">
                      File di Drive privat. Klik tombol di bawah untuk membuka akses gambar:
                    </p>
                    <button
                      onClick={handleQuickAuthorize}
                      disabled={isAuthorizing}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{isAuthorizing ? 'Menghubungkan...' : 'Otorisasi Drive (1-Klik)'}</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={imageSrc}
                    alt="Bukti Transfer"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    onError={() => {
                      if (!blobData?.blobUrl && !isDataOrBlobUrl) setDirectImageError(true);
                    }}
                    className="max-h-[420px] w-auto max-w-full object-contain rounded-lg shadow-lg transition-transform duration-100 cursor-zoom-in"
                  />
                )}
              </div>

              {/* Status footer kecil di kiri */}
              <div className="text-[10.5px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="truncate max-w-[280px]">
                  {isDataOrBlobUrl
                    ? '📦 Berkas Upload Web (Database Supabase)'
                    : `ID Berkas: ${fileId ? fileId : (rawUrl.startsWith('http') ? 'Tautan Eksternal' : 'N/A')}`
                  }
                </span>
                <span className="text-slate-300">Gunakan panah keyboard ◄ ► untuk navigasi</span>
              </div>
            </div>

            {/* Sisi Kanan: Data Peserta & Verifikasi (5 Kolom) */}
            <div className="md:col-span-5 p-5 flex flex-col justify-between bg-white space-y-4">
              
              <div className="space-y-4">
                {/* Header Peserta */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Nomor Tiket: {currentParticipant.nomorTicket || '-'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      isCurrentLunas ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}>
                      {currentParticipant.statusBayar}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {currentParticipant.nama}
                  </h3>
                  <div className="text-xs text-slate-500 truncate">
                    {currentParticipant.email}
                  </div>
                </div>

                {/* Card Nominal & Paket — with voucher breakdown */}
                {(() => {
                  const kategoriLower = (currentParticipant.kategori || '').toLowerCase();
                  const notesLower = (currentParticipant.nomorTicket || '').toLowerCase(); // custom_notes mapped to nomorTicket in local-storage shape
                  const rawCustomNotes = (currentParticipant.custom_notes || currentParticipant.nomorTicket || '');
                  const voucherMatch = rawCustomNotes.match(/\[VOUCHER:([^|]+)\|POTONGAN:(\d+)\|HARGA_NORMAL:(\d+)\|BAYAR_BERSIH:(\d+)\]/);
                  const hasVoucher = kategoriLower.includes('rebate') || Boolean(voucherMatch);
                  const voucherCode = voucherMatch ? voucherMatch[1] : (kategoriLower.includes('rebate') ? 'REBATE' : null);
                  const potongan = voucherMatch ? Number(voucherMatch[2]) : null;
                  const hargaNormal = voucherMatch ? Number(voucherMatch[3]) : null;
                  return (
                    <div className={`p-4 rounded-2xl border space-y-2 ${hasVoucher ? 'bg-emerald-500/5 border-emerald-300/60' : 'bg-amber-500/5 border-amber-500/20'}`}>
                      {hasVoucher && (
                        <div className="flex items-center gap-1.5 pb-1.5 border-b border-emerald-200/60">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                            🏷️ Voucher Rebate Alumni
                          </span>
                          {voucherCode && <span className="text-[10px] font-mono font-bold text-emerald-900">{voucherCode}</span>}
                        </div>
                      )}
                      {hargaNormal && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Harga Normal:</span>
                          <span className="font-mono text-slate-400 line-through">{formatRupiah(hargaNormal)}</span>
                        </div>
                      )}
                      {potongan && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-semibold">Potongan Rebate:</span>
                          <span className="font-mono font-bold text-emerald-700">- {formatRupiah(potongan)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">{hasVoucher ? 'Total Wajib Transfer:' : 'Nominal Pembayaran:'}</span>
                        <span className={`text-base font-mono font-bold ${hasVoucher ? 'text-emerald-900' : 'text-amber-900'}`}>
                          {formatRupiah(currentParticipant.nominal || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/50">
                        <span className="text-slate-500">Paket Terdaftar:</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          {isMabar ? (
                            <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                              <Users className="w-3.5 h-3.5" /> MABAR (6 Orang)
                            </span>
                          ) : (
                            <span>Tiket Individu</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Rekening Tujuan:</span>
                        <span className="font-mono text-slate-700">{currentParticipant.bank || 'BCA / Mandiri'}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Detail Instansi & Kontak */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Instansi / Kampus:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{currentParticipant.instansi || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Waktu Pendaftaran:</span>
                    <span className="font-mono text-slate-700">
                      {currentParticipant.timestamp ? formatDate(currentParticipant.timestamp) : '14 Nov 2026'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">WhatsApp:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">{currentParticipant.whatsapp || '-'}</span>
                      {currentParticipant.whatsapp && (
                        <a
                          href={`https://wa.me/${currentParticipant.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Chat WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Catatan Rejection jika sedang dibuka */}
                {isRejectOpen && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
                      <span>Pilih Alasan Penolakan Bukti:</span>
                      <button 
                        onClick={() => setIsRejectOpen(false)}
                        className="text-rose-500 hover:text-rose-700 text-[11px]"
                      >
                        Batal
                      </button>
                    </div>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-rose-300 bg-white font-medium text-slate-800"
                    >
                      <option value="Bukti Buram / Tidak Terbaca">Bukti Buram / Tidak Terbaca</option>
                      <option value="Nominal Transfer Tidak Sesuai">Nominal Transfer Tidak Sesuai</option>
                      <option value="Rekening Pengirim Berbeda / Mutasi Tidak Ditemukan">Mutasi Tidak Ditemukan</option>
                      <option value="Bukti Palsu / Manipulasi Struk">Bukti Palsu / Manipulasi Struk</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Catatan tambahan untuk peserta (opsional)..."
                      value={rejectCustomNote}
                      onChange={(e) => setRejectCustomNote(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-rose-300 bg-white placeholder:text-slate-400"
                    />
                    <button
                      onClick={handleConfirmReject}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                    >
                      Konfirmasi Tolak & Lanjut ke Berikutnya
                    </button>
                  </div>
                )}
                {onPreviewEmail && (
                  <button
                    type="button"
                    onClick={() => onPreviewEmail(currentParticipant)}
                    className="w-full py-2.5 px-3 rounded-xl border border-amber-200/90 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99]"
                    title="Lihat rancangan email tiket & Zoom yang akan dikirim ke peserta ini"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pratinjau Layout Email Tiket ({currentParticipant.nomorTicket || 'Peserta'})</span>
                  </button>
                )}

                {/* Tombol Cadangkan Bukti Transfer ke Google Drive */}
                {(() => {
                  const webConfig = activeEvent?.web_registration_config || {};
                  const proofFolderId = webConfig.gdrive_subfolders?.proofs?.id || webConfig.gdrive_proof_folder_id;
                  const hasProof = !isInvalidProof && (rawUrl || blobData?.blobUrl);
                  if (!hasProof || !proofFolderId) return null;

                  if (driveBackupResult?.success) {
                    return (
                      <div className="w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Berhasil dicadangkan: {driveBackupResult.name}</span>
                        {driveBackupResult.webViewLink && (
                          <a
                            href={driveBackupResult.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 underline ml-1"
                          >
                            Buka
                          </a>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      disabled={isDriveBackupLoading || !googleOAuthToken}
                      onClick={async () => {
                        setIsDriveBackupLoading(true);
                        try {
                          const cleanName = (currentParticipant?.nama || 'Peserta').replace(/[^a-zA-Z0-9 _.-]/g, '').replace(/\s+/g, '_');
                          const ticketNum = currentParticipant?.nomorTicket || 'NOTICKET';
                          const fileName = `${ticketNum}_${cleanName}_Bukti_Bayar.png`;

                          const result = await uploadFileToDriveFolder({
                            accessToken: googleOAuthToken,
                            fileName,
                            fileBlobOrBase64: isDataOrBlobUrl ? rawUrl : (blobData?.blobUrl ? await fetch(blobData.blobUrl).then(r => r.blob()) : rawUrl),
                            mimeType: blobData?.mimeType || 'image/png',
                            parentFolderId: proofFolderId
                          });
                          setDriveBackupResult({ success: true, fileId: result.id, name: result.name, webViewLink: result.webViewLink });
                        } catch (err) {
                          console.error('Drive backup error:', err);
                          setDriveBackupResult({ success: false, error: err.message });
                        } finally {
                          setIsDriveBackupLoading(false);
                        }
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] ${
                        !googleOAuthToken
                          ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'border-blue-200/90 bg-blue-50/70 hover:bg-blue-100 text-blue-900'
                      }`}
                      title={!googleOAuthToken ? 'Hubungkan Google terlebih dahulu' : 'Cadangkan bukti transfer ke subfolder Google Drive event'}
                    >
                      {isDriveBackupLoading ? (
                        <><RotateCw className="w-3.5 h-3.5 animate-spin" /> <span>Mengunggah ke Google Drive...</span></>
                      ) : (
                        <><Folder className="w-3.5 h-3.5 text-blue-600" /> <span>📤 Cadangkan Bukti ke Google Drive Event</span></>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* ── ACTION BAR (VERIFIKASI & LANJUT) ─────────────── */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                
                {/* Tombol Utama: VERIFIKASI & LANJUT atau LANJUT */}
                {isCurrentLunas ? (
                  <button
                    onClick={handleVerifyAndNext}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <span>➔ LANJUT KE PESERTA BERIKUTNYA</span>
                    <span className="text-[10px] font-normal opacity-80 font-mono bg-slate-800 px-2 py-0.5 rounded-full ml-1">
                      Enter ↵
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleVerifyAndNext}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] group"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>VERIFIKASI LUNAS & LANJUT</span>
                    <span className="text-[10px] font-normal opacity-80 font-mono bg-emerald-800/60 px-2 py-0.5 rounded-full ml-1">
                      Enter ↵
                    </span>
                  </button>
                )}

                {/* Sub-Aksi Navigasi & Tolak */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium flex items-center gap-1"
                      title="Shortcut: Panah Kiri (←)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>
                    <button
                      onClick={handleSkipNext}
                      disabled={currentIndex >= queue.length - 1}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium flex items-center gap-1"
                      title="Shortcut: Panah Kanan (→)"
                    >
                      <span>Lewati</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isRejectOpen && !isCurrentLunas && (
                    <button
                      onClick={() => setIsRejectOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200/80 font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  )}
                </div>

                {/* Shortcut Hint */}
                <div className="text-center">
                  <span className="text-[10px] text-slate-400">
                    💡 Tips: Tekan <strong>Enter</strong> untuk langsung verif & geser ke antrean berikutnya
                  </span>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
