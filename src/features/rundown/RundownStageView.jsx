import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Zap, 
  Plus, 
  Sliders, 
  CheckSquare, 
  Maximize2, 
  RefreshCw, 
  Printer, 
  AlertTriangle, 
  Play, 
  Check, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  Layers, 
  LayoutList, 
  Kanban,
  User,
  Volume2,
  Tag,
  Radio,
  Eye,
  FileDown,
  FileUp,
  DownloadCloud
} from 'lucide-react';
import { rundownService } from '../../services/rundownService';
import { useEvent } from '../../context/EventContext';
import { 
  generateRundownTemplateCsv, 
  exportRundownItemsToCsv, 
  downloadCsvFile 
} from '../../utils/csvRundownHelper';
import LivePacingBar from './LivePacingBar';
import ShiftTimelineModal from './ShiftTimelineModal';
import ScheduleItemModal from './ScheduleItemModal';
import TeleprompterModal from './TeleprompterModal';
import ImportRundownModal from './ImportRundownModal';

export default function RundownStageView() {
  const { activeEvent } = useEvent();
  const eventId = activeEvent?.id || 'default-event';

  const [schedules, setSchedules] = useState([]);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'GANTT'

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Realtime clock & pacing state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load schedules on mount or event change
  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const schedData = await rundownService.getSchedulesByEvent(eventId);
      setSchedules(schedData || []);
      if (schedData && schedData.length > 0) {
        setActiveScheduleId(prev => prev || schedData[0].id);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Load items when activeScheduleId changes
  const loadItems = useCallback(async () => {
    if (!activeScheduleId) return;
    try {
      const itemsData = await rundownService.getItemsBySchedule(activeScheduleId);
      setItems(itemsData || []);
    } catch (err) {
      console.error('Error loading schedule items:', err);
    }
  }, [activeScheduleId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Clock heartbeat every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate live pacing data
  const pacingData = useMemo(() => {
    return rundownService.calculatePacing(items, currentTime);
  }, [items, currentTime]);

  const activeSchedule = schedules.find(s => s.id === activeScheduleId) || schedules[0];

  // Actions
  const handleSaveItem = async (formData, editId) => {
    if (editId) {
      const updated = await rundownService.updateScheduleItem(editId, formData);
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updated } : i));
    } else {
      const created = await rundownService.createScheduleItem(formData);
      setItems(prev => [...prev, created]);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Yakin ingin menghapus sesi ini dari rundown?')) {
      await rundownService.deleteScheduleItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleToggleChecklist = async (item, checkIdx) => {
    const newChecklist = [...(item.equipment_checklist || [])];
    if (newChecklist[checkIdx]) {
      newChecklist[checkIdx].checked = !newChecklist[checkIdx].checked;
      await rundownService.updateScheduleItem(item.id, { equipment_checklist: newChecklist });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, equipment_checklist: newChecklist } : i));
    }
  };

  const handleSetLive = async (item) => {
    const updated = await rundownService.updateScheduleItem(item.id, { status: 'LIVE' });
    setItems(prev => prev.map(i => {
      if (i.id === item.id) return { ...i, status: 'LIVE' };
      if (i.status === 'LIVE') return { ...i, status: 'COMPLETED' };
      return i;
    }));
  };

  const handleMarkCompleted = async (itemId) => {
    await rundownService.updateScheduleItem(itemId, { status: 'COMPLETED' });
    // Find next scheduled item and set it LIVE
    const curIdx = items.findIndex(i => i.id === itemId);
    const nextIt = items[curIdx + 1];
    if (nextIt) {
      await rundownService.updateScheduleItem(nextIt.id, { status: 'LIVE' });
    }
    loadItems();
  };

  const handleShiftApplied = async (shiftParams) => {
    await rundownService.shiftScheduleTimeline(shiftParams);
    loadItems();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateRundownTemplateCsv();
    downloadCsvFile(csvContent, 'Template_Rundown_Dignity.csv');
  };

  const handleExportActiveRundown = () => {
    if (!items || items.length === 0) {
      alert('Belum ada sesi di rundown jadwal ini untuk diekspor.');
      return;
    }
    const dayNum = activeSchedule?.day_number || 1;
    const csvContent = exportRundownItemsToCsv(items, dayNum);
    const eventName = activeEvent?.title ? activeEvent.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25) : 'Dignity';
    downloadCsvFile(csvContent, `Rundown_Hari_${dayNum}_${eventName}.csv`);
  };

  // Helper session badge color
  const getSessionTypeBadge = (type) => {
    switch (type) {
      case 'CEREMONY':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'KEYNOTE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'PRACTICE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DEMO':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'BREAK':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'MEAL':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'EVALUATION':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
              Interactive Rundown &amp; Stage Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              PRD 16
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Dignity Operations Command Center • Live Stage Cues, Dynamic Timeline Shift &amp; Multi-Day Scheduler
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Tabel Sesi
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GANTT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'GANTT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" /> Timeline Visual
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            title="Unduh format template CSV/Excel standar Dignity"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-600" /> Unduh Template CSV
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            title="Impor jadwal sesi secara massal dari file CSV atau Excel"
          >
            <FileUp className="w-3.5 h-3.5 text-[#0F2C59]" /> Import CSV
          </button>

          <button
            type="button"
            onClick={handleExportActiveRundown}
            disabled={!items || items.length === 0}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Ekspor seluruh sesi hari ini ke file CSV Excel"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setIsTeleprompterOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            title="Buka layar penuh kontras tinggi untuk operator soundman & MC"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> Teleprompter
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedItemForEdit(null);
              setIsItemModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#0F2C59] hover:bg-[#1E40AF] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Sesi
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Cetak Rundown / Print PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Multi-Day Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {schedules.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setActiveScheduleId(s.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
              activeScheduleId === s.id
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeScheduleId === s.id ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Hari {s.day_number}:</span>
            <span className="font-medium text-slate-500">{s.title.split(':')[1] || s.title}</span>
            {s.location_room && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                {s.location_room}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Live Pacing Bar (Active Session Countdown & Timekeeper) */}
      <LivePacingBar
        pacingData={pacingData}
        onForceLive={handleSetLive}
        onMarkCompleted={handleMarkCompleted}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      {/* VIEW MODE 1: Dense Operations Table */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-36">Waktu &amp; Durasi</th>
                  <th className="py-3.5 px-4">Kode &amp; Sesi Acara</th>
                  <th className="py-3.5 px-4 w-52">Narasumber &amp; PIC</th>
                  <th className="py-3.5 px-4 w-60">Checklist Panggung</th>
                  <th className="py-3.5 px-4 w-60">Stage Cue &amp; Operator</th>
                  <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const isLive = item.status === 'LIVE' || (pacingData.activeItem?.id === item.id);
                  const isDone = item.status === 'COMPLETED';

                  return (
                    <tr 
                      key={item.id}
                      className={`transition-colors ${
                        isLive 
                          ? 'bg-emerald-50/80 hover:bg-emerald-50' 
                          : isDone 
                          ? 'bg-slate-50/60 opacity-85 hover:bg-slate-50' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Index & Live Indicator */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {isLive ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" title="Sesi Sedang Live" />
                        ) : isDone ? (
                          <Check className="w-3.5 h-3.5 text-slate-400 inline-block" />
                        ) : (
                          <span className="text-slate-400 font-medium">{idx + 1}</span>
                        )}
                      </td>

                      {/* 2. Waktu & Durasi */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          {item.start_time} - {item.end_time}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.duration_minutes} Menit
                          {item.delay_minutes > 0 && (
                            <span className="ml-1 text-amber-600 font-bold">
                              (+{item.delay_minutes}m)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Judul & Tipe Sesi */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {item.session_code && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.session_code}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSessionTypeBadge(item.session_type)}`}>
                            {item.session_type}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* 4. Speaker & PIC */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.speaker_name || '-'}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>PIC: {item.pic_team || '-'}</span>
                        </div>
                      </td>

                      {/* 5. Checklist Panggung */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {Array.isArray(item.equipment_checklist) && item.equipment_checklist.length > 0 ? (
                            item.equipment_checklist.map((c, cIdx) => (
                              <label 
                                key={cIdx} 
                                className="flex items-center gap-2 cursor-pointer hover:bg-white/60 p-1 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={c.checked}
                                  onChange={() => handleToggleChecklist(item, cIdx)}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <span className={`text-[11px] select-none ${c.checked ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                                  {c.name}
                                </span>
                              </label>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Tidak ada checklist -</span>
                          )}
                        </div>
                      </td>

                      {/* 6. Stage Cue */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {item.stage_cues ? (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-start gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{item.stage_cues}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isLive && !isDone && (
                            <button
                              type="button"
                              onClick={() => handleSetLive(item)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                              title="Set Sesi Ini LIVE"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedItemForEdit(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Edit Sesi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Visual Gantt / Timeline View */}
      {viewMode === 'GANTT' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Kanban className="w-4 h-4 text-indigo-600" />
              Garis Waktu Operasional (07:00 - 18:00 WIB)
            </h3>
            <span className="text-xs text-slate-400">Skala visual proporsional durasi</span>
          </div>

          {/* Time Legend Bar */}
          <div className="grid grid-cols-11 border-b border-slate-200 pb-2 text-[10px] font-mono text-slate-400 text-center">
            {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>

          {/* Sessions Stack */}
          <div className="space-y-2 mt-4">
            {items.map((it) => {
              const [sh, sm] = (it.start_time || '07:00').split(':').map(Number);
              const startTotalMin = Math.max(0, (sh - 7) * 60 + sm);
              const totalDayMin = 11 * 60; // 07:00 to 18:00
              const leftPercent = Math.min(100, Math.max(0, (startTotalMin / totalDayMin) * 100));
              const widthPercent = Math.min(100 - leftPercent, Math.max(3, (it.duration_minutes / totalDayMin) * 100));

              return (
                <div key={it.id} className="relative h-12 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                  <div
                    className={`absolute top-1 bottom-1 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center justify-between truncate shadow-sm border ${getSessionTypeBadge(it.session_type)}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    title={`${it.title} (${it.start_time} - ${it.end_time})`}
                  >
                    <span className="truncate font-bold">{it.title}</span>
                    <span className="text-[10px] opacity-75 font-mono ml-2 hidden sm:inline">
                      {it.start_time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ShiftTimelineModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        items={items}
        activeScheduleId={activeScheduleId}
        onShiftApplied={handleShiftApplied}
        defaultFromItemId={pacingData.activeItem?.id || items[0]?.id}
      />

      <ScheduleItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedItemForEdit(null);
        }}
        item={selectedItemForEdit}
        activeScheduleId={activeScheduleId}
        onSaveItem={handleSaveItem}
      />

      <TeleprompterModal
        isOpen={isTeleprompterOpen}
        onClose={() => setIsTeleprompterOpen(false)}
        pacingData={pacingData}
        activeScheduleTitle={activeSchedule?.title}
        onNextSession={handleMarkCompleted}
      />

      <ImportRundownModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        eventId={eventId}
        schedules={schedules}
        activeScheduleId={activeScheduleId}
        onSuccess={() => {
          loadSchedules();
          loadItems();
        }}
      />
    </div>
  );
}

