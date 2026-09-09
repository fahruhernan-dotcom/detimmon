import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Tag, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Sparkles,
  Sliders,
  FileText
} from 'lucide-react';

export default function ScheduleItemModal({
  isOpen,
  onClose,
  item = null,
  activeScheduleId,
  onSaveItem
}) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    title: '',
    session_code: '',
    session_type: 'KEYNOTE',
    start_time: '08:00',
    end_time: '09:00',
    duration_minutes: 60,
    speaker_name: '',
    pic_team: '',
    stage_cues: '',
    description: '',
    status: 'SCHEDULED'
  });

  const [checklist, setChecklist] = useState([
    { name: 'Mic Wireless Utama', checked: false },
    { name: 'Slide Deck Laptop Operator', checked: false }
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        session_code: item.session_code || '',
        session_type: item.session_type || 'KEYNOTE',
        start_time: item.start_time || '08:00',
        end_time: item.end_time || '09:00',
        duration_minutes: item.duration_minutes || 60,
        speaker_name: item.speaker_name || '',
        pic_team: item.pic_team || '',
        stage_cues: item.stage_cues || '',
        description: item.description || '',
        status: item.status || 'SCHEDULED'
      });
      setChecklist(Array.isArray(item.equipment_checklist) ? item.equipment_checklist : []);
    } else {
      setFormData({
        title: '',
        session_code: '',
        session_type: 'KEYNOTE',
        start_time: '08:00',
        end_time: '09:00',
        duration_minutes: 60,
        speaker_name: '',
        pic_team: '',
        stage_cues: '',
        description: '',
        status: 'SCHEDULED'
      });
      setChecklist([
        { name: 'Mic Wireless Utama', checked: false },
        { name: 'Slide Deck Laptop Operator', checked: false }
      ]);
    }
  }, [item]);

  // Recalculate duration when times change
  const handleTimeChange = (key, val) => {
    setFormData(prev => {
      const next = { ...prev, [key]: val };
      const [sh, sm] = (next.start_time || '00:00').split(':').map(Number);
      const [eh, em] = (next.end_time || '00:00').split(':').map(Number);
      const dur = (eh * 60 + em) - (sh * 60 + sm);
      next.duration_minutes = dur > 0 ? dur : 30;
      return next;
    });
  };

  const handleAddChecklist = (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setChecklist(prev => [...prev, { name: newChecklistText.trim(), checked: false }]);
    setNewChecklistText('');
  };

  const handleRemoveChecklist = (idx) => {
    setChecklist(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSaveItem({
        ...formData,
        schedule_id: activeScheduleId,
        equipment_checklist: checklist
      }, item?.id);
      onClose();
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setLoading(false);
    }
  };

  const sessionTypes = [
    { value: 'CEREMONY', label: 'Ceremony / Pembukaan' },
    { value: 'KEYNOTE', label: 'Keynote / Teori' },
    { value: 'PRACTICE', label: 'Practice / Workshop' },
    { value: 'DEMO', label: 'Live Demo / Simulasi' },
    { value: 'BREAK', label: 'Coffee Break' },
    { value: 'MEAL', label: 'ISHOMA' },
    { value: 'EVALUATION', label: 'Evaluasi / Post-Test' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sliders className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {item ? 'Sunting Sesi Rundown' : 'Tambah Sesi Baru'}
              </h2>
              <p className="text-xs text-slate-400">Parameter teknis panggung, waktu, & perlengkapan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Row 1: Code & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Sesi</label>
              <input
                type="text"
                value={formData.session_code}
                onChange={(e) => setFormData({ ...formData, session_code: e.target.value })}
                placeholder="e.g. KEY-01"
                className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Sesi</label>
              <select
                value={formData.session_type}
                onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {sessionTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Sesi *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Praktik Vokal & Artikulasi Panggung"
              className="w-full text-sm font-semibold rounded-xl border border-slate-300 px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Row 3: Jam Mulai, Selesai, Durasi */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Mulai</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => handleTimeChange('start_time', e.target.value)}
                className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Selesai</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => handleTimeChange('end_time', e.target.value)}
                className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Durasi</label>
              <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-center">
                {formData.duration_minutes} Menit
              </div>
            </div>
          </div>

          {/* Row 4: Speaker & PIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Narasumber / Pembicara</label>
              <input
                type="text"
                value={formData.speaker_name}
                onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                placeholder="e.g. Master Trainer Dignity"
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIC Tim / Operator</label>
              <input
                type="text"
                value={formData.pic_team}
                onChange={(e) => setFormData({ ...formData, pic_team: e.target.value })}
                placeholder="e.g. Soundman / LO Panggung"
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Stage Cues / Operator Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Stage Cue & Operator</label>
            <textarea
              rows={2}
              value={formData.stage_cues}
              onChange={(e) => setFormData({ ...formData, stage_cues: e.target.value })}
              placeholder="e.g. Putar audio pembuka channel 1. Spotlight terang saat narasumber naik podium..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-700 font-mono"
            />
          </div>

          {/* Row 6: Equipment Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Checklist Perlengkapan Panggung</label>
            <div className="space-y-1.5 mb-2 max-h-28 overflow-y-auto pr-1">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-700 font-medium">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(idx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {checklist.length === 0 && (
                <p className="text-xs text-slate-400 italic">Belum ada item checklist.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Tambah alat (e.g. Clicker, Matras, Mic 2)..."
                className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-1.5"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist(e); }}
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : (item ? 'Perbarui Sesi' : 'Tambahkan Sesi')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
