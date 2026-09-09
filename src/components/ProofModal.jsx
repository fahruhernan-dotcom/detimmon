import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Image as ImageIcon,
  Download,
  Key,
  HelpCircle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText
} from 'lucide-react';
import { getDriveFileId, fetchDriveImageBlobUrl, requestGoogleAccessToken } from '../services/googleApiService';

export default function ProofModal({ isOpen, onClose, proofData, onAuthorizeSuccess }) {
  if (!isOpen || !proofData) return null;

  const rawUrl = String(proofData.url || proofData.rawBukti || '').trim();
  const isDataOrBlobUrl = rawUrl.startsWith('data:') || rawUrl.startsWith('blob:');
  const isInvalidOrNumeric = !rawUrl || rawUrl === '100000' || (!rawUrl.startsWith('http') && !isDataOrBlobUrl && !/^[a-zA-Z0-9_-]{25,50}$/.test(rawUrl));
  const fileId = isDataOrBlobUrl ? null : getDriveFileId(rawUrl);

  const [activeTab, setActiveTab] = useState(isDataOrBlobUrl ? 'image' : 'iframe'); // 'image' or 'iframe'
  const [blobData, setBlobData] = useState(isDataOrBlobUrl ? {
    blobUrl: rawUrl,
    isPdf: rawUrl.startsWith('data:application/pdf'),
    mimeType: rawUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'
  } : null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [directImageError, setDirectImageError] = useState(false);
  const [directImageOk, setDirectImageOk] = useState(isDataOrBlobUrl);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showFolderHelp, setShowFolderHelp] = useState(false);
  const [authError, setAuthError] = useState('');

  // When proofData changes, reset and try best loading strategy
  useEffect(() => {
    if (isInvalidOrNumeric) return;

    let isMounted = true;
    setDirectImageError(false);
    setDirectImageOk(false);
    setBlobData(null);
    setZoomLevel(1);
    setAuthError('');

    if (isDataOrBlobUrl) {
      setBlobData({
        blobUrl: rawUrl,
        isPdf: rawUrl.startsWith('data:application/pdf'),
        mimeType: rawUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg'
      });
      setDirectImageOk(true);
      setActiveTab('image');
      return;
    }

    if (!fileId) return;

    // Strategy 1: If Google OAuth Token is available, fetch binary Blob directly via Drive API
    if (proofData.token) {
      setIsBlobLoading(true);
      fetchDriveImageBlobUrl(fileId, proofData.token)
        .then((res) => {
          if (!isMounted) return;
          if (res?.blobUrl) {
            setBlobData(res);
            setActiveTab('image'); // Automatically switch to direct image/pdf view!
          } else {
            // Token might be expired or scope missing; fallback to iframe
            setActiveTab('iframe');
          }
        })
        .catch((err) => {
          console.warn('Drive Blob fetch error:', err);
          if (isMounted) setActiveTab('iframe');
        })
        .finally(() => {
          if (isMounted) setIsBlobLoading(false);
        });
    } else {
      // Strategy 2: No token yet. Try quick prefetch test on public CDN
      const testImg = new Image();
      testImg.onload = () => {
        if (!isMounted) return;
        setDirectImageOk(true);
        setActiveTab('image');
      };
      testImg.onerror = () => {
        if (!isMounted) return;
        setDirectImageError(true);
        setActiveTab('iframe'); // Use interactive Google Drive preview iframe as default
      };
      testImg.src = `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    return () => {
      isMounted = false;
    };
  }, [rawUrl, fileId, proofData?.token, isInvalidOrNumeric]);

  // 1-Click In-Modal Google OAuth Authorizer
  const handleQuickAuthorize = () => {
    const clientId = proofData.clientId || '413035723577-2r3sm03gq11i5nap52f6prcp13c9p5ii.apps.googleusercontent.com';
    setIsAuthorizing(true);
    setAuthError('');

    try {
      requestGoogleAccessToken(
        clientId,
        async (newToken) => {
          setIsAuthorizing(false);
          if (onAuthorizeSuccess) {
            onAuthorizeSuccess(newToken);
          }
          // Fetch blob immediately with this new token
          setIsBlobLoading(true);
          try {
            const res = await fetchDriveImageBlobUrl(fileId, newToken);
            if (res?.blobUrl) {
              setBlobData(res);
              setActiveTab('image');
            }
          } catch (e) {
            console.warn('Post-auth fetch error:', e);
          } finally {
            setIsBlobLoading(false);
          }
        },
        (err) => {
          setIsAuthorizing(false);
          setAuthError(typeof err === 'string' ? err : 'Gagal otorisasi Google Drive');
        }
      );
    } catch (err) {
      setIsAuthorizing(false);
      setAuthError(err.message || 'Gagal memulai otorisasi');
    }
  };

  const directDriveUrl = fileId 
    ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` 
    : (rawUrl.startsWith('http') ? rawUrl : 'https://drive.google.com/');

  const directCdnUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : rawUrl;
  const currentImageSrc = blobData?.blobUrl || directCdnUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Bukti Pembayaran Transfer
              </h3>
              {fileId && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  Google Drive Berkas
                </span>
              )}
              {blobData?.blobUrl && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Akses Langsung Aktif</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{proofData.name}</p>
          </div>

          <div className="flex items-center gap-2">
            {!isInvalidOrNumeric && (
              <a
                href={directDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                title="Buka langsung di tab baru Google Drive"
              >
                <span>Buka di Google Drive</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Bar & Quick Actions (If valid Drive file) */}
        {fileId && !isInvalidOrNumeric && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* View Switcher Tabs */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'image'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {blobData?.isPdf ? (
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{blobData?.isPdf ? 'Dokumen PDF' : 'Gambar Murni'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('iframe')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'iframe'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>Pratinjau Interaktif Drive</span>
              </button>
            </div>

            {/* Right Tools: Zoom Controls & Help */}
            <div className="flex items-center gap-2">
              {activeTab === 'image' && !blobData?.isPdf && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                    className="p-1 hover:bg-slate-100 rounded"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-[11px] font-mono font-semibold text-slate-700 min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                    className="p-1 hover:bg-slate-100 rounded"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}

              {blobData?.blobUrl && (
                <a
                  href={blobData.blobUrl}
                  download={`bukti_transfer_${proofData.name || 'peserta'}.${blobData.isPdf ? 'pdf' : 'jpg'}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  title="Unduh Berkas Bukti"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowFolderHelp(prev => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-medium px-2 py-1 rounded-lg hover:bg-amber-50"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Solusi Akses Permanen</span>
              </button>
            </div>
          </div>
        )}

        {/* 1-Click OAuth Banner (Shown if token not yet acquired or direct image is blocked) */}
        {!isInvalidOrNumeric && fileId && !blobData?.blobUrl && (
          <div className="px-5 py-2.5 bg-amber-50/90 border-b border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-950">
              <Key className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Mau gambar bukti tampil langsung tanpa batasan cookie browser?</span>
                <p className="text-[11px] text-amber-800">
                  Google membatasi cookie pihak ketiga. Hubungkan akun Google untuk mengambil gambar langsung via Drive API.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleQuickAuthorize}
              disabled={isAuthorizing}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuthorizing ? 'animate-spin' : ''}`} />
              <span>{isAuthorizing ? 'Menghubungkan...' : 'Hubungkan Drive (1-Klik)'}</span>
            </button>
          </div>
        )}

        {authError && (
          <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Collapsible Permanent Solution Guide */}
        {showFolderHelp && (
          <div className="p-4 bg-sky-50/80 border-b border-sky-200 text-xs text-sky-950 space-y-2 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Cara Membuat Gambar Bukti Muncul Otomatis untuk Semua Tim (Tanpa Login):
              </span>
              <button 
                onClick={() => setShowFolderHelp(false)}
                className="text-sky-700 hover:text-sky-900 text-xs font-semibold"
              >
                Tutup Panduan
              </button>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-[11.5px] leading-relaxed text-sky-900">
              <li>Buka <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="underline font-semibold">Google Drive</a> menggunakan akun pemilik formulir (<strong>doniesdaily@gmail.com</strong>).</li>
              <li>Cari folder tempat Google Form menyimpan berkas unggahan bukti (biasanya bernama <em>"Upload Bukti Pembayaran... (File responses)"</em>).</li>
              <li>Klik kanan pada folder tersebut ➔ pilih <strong>Bagikan (Share)</strong>.</li>
              <li>Pada bagian <strong>Akses umum (General Access)</strong>, ubah dari <em>"Dibatasi"</em> menjadi <strong>"Siapa saja yang memiliki link"</strong> dengan peran <strong>"Pelihat (Viewer)"</strong>.</li>
              <li>Klik <strong>Selesai</strong>. Begitu folder ini publik, seluruh gambar bukti akan langsung tampil otomatis tanpa kendala cookie selamanya!</li>
            </ol>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/40">
          {isInvalidOrNumeric ? (
            /* State: Column in Google Sheets had 100000 or no valid URL */
            <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/70 text-left space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tautan Berkas Bukti Belum Terisi URL Valid</span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                Kolom <strong>Upload Bukti Pembayaran</strong> untuk peserta <strong>{proofData.name}</strong> di spreadsheet tercatat bernilai:
              </p>

              <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 font-mono text-xs text-amber-900 break-all font-semibold">
                "{rawUrl || 'Kosong'}"
              </div>

              <div className="text-[11px] text-slate-600 space-y-1.5 pt-1 border-t border-amber-200/60">
                <p className="font-semibold text-slate-800">Penjelasan:</p>
                <p>
                  Kolom bukti pendaftar ini sebelumnya sempat terisi angka <code>100000</code> saat pengujian awal sebelum proteksi kolom diaktifkan, atau diinput secara manual tanpa URL berkas.
                </p>
                <p className="font-semibold text-slate-800 pt-1">Cara Mengisi Tautan Bukti Asli:</p>
                <p>
                  1. Buka folder respons formulir di Google Drive Anda.<br />
                  2. Salin link berkas transfer asli pendaftar ini.<br />
                  3. Klik ikon <strong>Edit (Pensil)</strong> di tabel dashboard dan tempelkan tautan tersebut pada kolom bukti transfer.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Buka Google Drive Saya</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </div>
            </div>
          ) : activeTab === 'iframe' && fileId ? (
            /* State: Google Drive Native Interactive Iframe */
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-[490px] w-full shadow-inner">
                <iframe
                  src={`https://drive.google.com/file/d/${fileId}/preview`}
                  title="Pratinjau Bukti Google Drive"
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Pratinjau interaktif resmi Google Drive. Jika meminta login di dalam bingkai, klik tombol "Hubungkan Drive (1-Klik)" di atas.</span>
                <a 
                  href={directDriveUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-0.5"
                >
                  <span>Perbesar di Tab Baru</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            /* State: Direct Image Tag / Blob display */
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white min-h-[350px] flex items-center justify-center p-3">
                {isBlobLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 z-20">
                    <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                    <span className="text-xs text-slate-600 font-medium">
                      Mengunduh berkas bukti langsung dari Google Drive API...
                    </span>
                  </div>
                )}

                {blobData?.isPdf ? (
                  /* PDF Blob View */
                  <div className="w-full h-[490px] rounded-lg overflow-hidden border border-slate-200">
                    <iframe
                      src={blobData.blobUrl}
                      title="Bukti Transfer PDF"
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : directImageError && !blobData?.blobUrl ? (
                  /* Fallback if direct image fails and no blob yet */
                  <div className="p-6 text-center space-y-3 max-w-md mx-auto">
                    <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-900">
                      Gambar Memerlukan Otorisasi Google Drive
                    </p>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed">
                      Peramban membatasi cookie pihak ketiga saat memuat gambar dari Google Drive privat.
                      Silakan klik tombol di bawah untuk menampilkan gambar secara instan via Google Drive API:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleQuickAuthorize}
                        disabled={isAuthorizing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Hubungkan Google Drive (1-Klik)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('iframe')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                        <span>Pratinjau Interaktif</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal Image Tag (Blob or Direct CDN) */
                  <div 
                    className="overflow-auto max-h-[520px] max-w-full flex items-center justify-center transition-transform duration-150"
                  >
                    <img
                      src={currentImageSrc}
                      alt="Bukti Transfer"
                      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                      onError={() => {
                        if (!blobData?.blobUrl) {
                          setDirectImageError(true);
                        }
                      }}
                      className="max-h-[480px] w-auto max-w-full object-contain mx-auto rounded-lg transition-transform duration-150 shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {!isInvalidOrNumeric && (
                <a
                  href={directDriveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sm:hidden inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
                >
                  <span>Buka di Google Drive</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
