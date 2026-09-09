import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  Clock, 
  User, 
  Wrench,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { parseRundownCsv, generateRundownTemplateCsv, downloadCsvFile } from '../../utils/csvRundownHelper';
import { rundownService } from '../../services/rundownService';

export default function ImportRundownModal({ 
  isOpen, 
  onClose, 
  eventId, 
  schedules = [], 
  activeScheduleId, 
  onSuccess 
}) {
  const [file, setFile] = useState(null);
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importMode, setImportMode] = useState('ACTIVE_SCHEDULE'); // 'ACTIVE_SCHEDULE' | 'MULTI_DAY_AUTO'
  const [targetScheduleId, setTargetScheduleId] = useState(activeScheduleId || (schedules[0]?.id || ''));
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csvContent = generateRundownTemplateCsv();
    downloadCsvFile(csvContent, 'Template_Rundown_Dignity.csv');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = (selectedFile) => {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
      setError('Format file harus berupa .csv (atau teks dengan pemisah koma/titik-koma).');
      return;
    }

    setError('');
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const items = parseRundownCsv(text);

        if (!items || items.length === 0) {
          setError('File CSV kosong atau kolom tidak sesuai dengan format standar template Dignity.');
          setParsedItems([]);
          return;
        }

        setParsedItems(items);
      } catch (err) {
        console.error('Error parsing CSV:', err);
        setError(`Gagal membaca file CSV: ${err.message}`);
        setParsedItems([]);
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca berkas dari komputer Anda.');
    };
    reader.readAsText(selectedFile);
  };

  const handleReset = () => {
    setFile(null);
    setParsedItems([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) {
      setError('Silakan pilih file CSV yang valid terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (importMode === 'ACTIVE_SCHEDULE') {
        if (!targetScheduleId) {
          throw new Error('Pilih jadwal hari tujuan terlebih dahulu.');
        }

        await rundownService.importScheduleItems({
          eventId,
          scheduleId: targetScheduleId,
          parsedItems,
          replaceExisting
        });
      } else {
        // Multi-day auto based on day_number in CSV
        await rundownService.importScheduleItems({
          eventId,
          parsedItems,
          replaceExisting
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Import execution error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan data ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kategori unik hari terdeteksi
  const detectedDays = Array.from(new Set(parsedItems.map(i => i.day_number || 1))).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2C59]/10 flex items-center justify-center text-[#0F2C59]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Import Rundown Acara dari CSV / Excel
              </h2>
              <p className="text-xs text-slate-500">
                Unggah berkas jadwal untuk dimasukkan langsung ke sistem jadwal panggung Supabase
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Top Info Banner & Template Download Link */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Belum punya format tabel yang cocok?
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Gunakan template standar Dignity ber-UTF-8 BOM yang sudah teruji rapi dibuka di Microsoft Excel.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
            >
              <Download className="w-4 h-4" /> Unduh Template CSV
            </button>
          </div>

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0F2C59] bg-slate-50/50 hover:bg-[#0F2C59]/5 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 group-hover:text-[#0F2C59] group-hover:scale-110 transition-all">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 text-base">
                Pilih atau Tarik Berkas CSV ke Sini
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Mendukung file <span className="font-semibold text-slate-700">.CSV</span> hasil simpan Microsoft Excel, Google Sheets, atau text editor (pemisah koma atau titik-koma).
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F2C59] group-hover:underline">
                Telusuri dari Komputer
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{file.name}</h4>
                    <p className="text-xs text-slate-500">
                      Ukuran: {(file.size / 1024).toFixed(1)} KB • Terdeteksi: <strong className="text-emerald-700">{parsedItems.length} baris sesi</strong>
                      {detectedDays.length > 0 && ` across Hari: ${detectedDays.join(', ')}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-bold px-2 py-1"
                >
                  Ganti File
                </button>
              </div>

              {/* Import Options */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Jadwal Tujuan di Supabase:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'ACTIVE_SCHEDULE'
                      ? 'border-[#0F2C59] bg-[#0F2C59]/5 ring-1 ring-[#0F2C59]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="ACTIVE_SCHEDULE"
                      checked={importMode === 'ACTIVE_SCHEDULE'}
                      onChange={() => setImportMode('ACTIVE_SCHEDULE')}
                      className="mt-0.5 text-[#0F2C59] focus:ring-[#0F2C59]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Masukkan ke 1 Hari Tertentu
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Semua baris di CSV akan dimasukkan ke dalam jadwal hari yang dipilih di bawah.
                      </span>

                      {importMode === 'ACTIVE_SCHEDULE' && (
                        <select
                          value={targetScheduleId}
                          onChange={(e) => setTargetScheduleId(e.target.value)}
                          className="mt-2 w-full text-xs font-semibold rounded-lg border-slate-300 focus:border-[#0F2C59] focus:ring focus:ring-[#0F2C59]/20"
                        >
                          {schedules.map(s => (
                            <option key={s.id} value={s.id}>
                              Hari {s.day_number}: {s.title} ({s.location_room || 'Main Room'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>

                  <label className={`border rounded-xl p-3 flex items-start gap-2.5 cursor-pointer transition-all ${
                    importMode === 'MULTI_DAY_AUTO'
                      ? 'border-[#0F2C59] bg-[#0F2C59]/5 ring-1 ring-[#0F2C59]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="MULTI_DAY_AUTO"
                      checked={importMode === 'MULTI_DAY_AUTO'}
                      onChange={() => setImportMode('MULTI_DAY_AUTO')}
                      className="mt-0.5 text-[#0F2C59] focus:ring-[#0F2C59]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">
                        Otomatis Sesuai Kolom "hari_ke"
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Cocok untuk bootcamp multi-hari. Sistem akan mendistribusikan sesi ke Hari 1, Hari 2, dst secara otomatis.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs text-slate-700">
                      <strong>Hapus &amp; Timpa Sesi Lama:</strong> Kosongkan sesi yang ada sebelumnya di hari terkait sebelum memasukkan data baru.
                    </span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              {parsedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pratinjau Data ({Math.min(6, parsedItems.length)} dari {parsedItems.length} Sesi Terbaca):
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Diimpor
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Hari</th>
                            <th className="px-3 py-2">Waktu</th>
                            <th className="px-3 py-2">Kode</th>
                            <th className="px-3 py-2">Judul Sesi</th>
                            <th className="px-3 py-2">Tipe</th>
                            <th className="px-3 py-2">Pembicara</th>
                            <th className="px-3 py-2">Alat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {parsedItems.slice(0, 6).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2 font-bold text-slate-700">
                                Day {row.day_number}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                                {row.start_time?.slice(0, 5)} - {row.end_time?.slice(0, 5)}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">
                                {row.session_code}
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900 max-w-[200px] truncate" title={row.title}>
                                {row.title}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {row.session_type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">
                                {row.speaker_name || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-500 text-[11px]">
                                {row.equipment_checklist?.length > 0 ? `${row.equipment_checklist.length} alat` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message Box */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isSubmitting || parsedItems.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-2 ${
              isSubmitting || parsedItems.length === 0
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-[#0F2C59] hover:bg-[#1E40AF] active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan ke Supabase...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Impor Sekarang ({parsedItems.length} Sesi)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
