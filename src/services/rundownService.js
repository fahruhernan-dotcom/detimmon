import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isValidUuid } from '../utils/normalizers';

// LocalStorage key for mock state persistence when offline
const MOCK_STORAGE_KEY = 'dignity_mock_rundown_data_v1';

// Benchmark Seed Data: Pelatihan Public Speaking & Hypno/Yoga Poltekkes Kemenkes 4 Hari
const DEFAULT_MOCK_DATA = {
  schedules: [
    {
      id: 'sched-day-1',
      event_id: 'default-event',
      day_number: 1,
      schedule_date: '2026-08-26',
      title: 'Hari 1: Fondasi & Pembukaan Akbar',
      location_room: 'Grand Ballroom Lt. 2',
      track_name: 'Main Stage',
      is_published: true
    },
    {
      id: 'sched-day-2',
      event_id: 'default-event',
      day_number: 2,
      schedule_date: '2026-08-27',
      title: 'Hari 2: Olah Vokal & Bahasa Tubuh Panggung',
      location_room: 'Grand Ballroom & Ruang Lab A/B',
      track_name: 'Main Stage & Breakout',
      is_published: true
    },
    {
      id: 'sched-day-3',
      event_id: 'default-event',
      day_number: 3,
      schedule_date: '2026-08-28',
      title: 'Hari 3: Handling Q&A & Simulasi Krisis',
      location_room: 'Grand Ballroom Lt. 2',
      track_name: 'Main Stage',
      is_published: true
    },
    {
      id: 'sched-day-4',
      event_id: 'default-event',
      day_number: 4,
      schedule_date: '2026-08-29',
      title: 'Hari 4: Ujian Mandiri & Closing Ceremony',
      location_room: 'Grand Ballroom Lt. 2',
      track_name: 'Main Stage',
      is_published: true
    }
  ],
  items: {
    'sched-day-1': [
      {
        id: 'item-101',
        schedule_id: 'sched-day-1',
        session_code: 'REG-01',
        title: 'Registrasi Peserta & Check-In Mandiri',
        description: 'Verifikasi tiket digital, pembagian seminar kit & nametag',
        start_time: '07:30',
        end_time: '08:30',
        duration_minutes: 60,
        session_type: 'CEREMONY',
        speaker_name: 'Tim Kesekretariatan Dignity',
        pic_team: 'LO Meja Depan',
        equipment_checklist: [
          { name: 'Barcode Scanner QR Tiket', checked: true },
          { name: 'Seminar Kit & Blocknote 150 Paket', checked: true },
          { name: 'Nametag Peserta Alphabetical Order', checked: true }
        ],
        status: 'COMPLETED',
        delay_minutes: 0,
        sort_order: 1,
        stage_cues: 'Play background ambient instrumental music channel 1. Display sliding welcome screen on projector.'
      },
      {
        id: 'item-102',
        schedule_id: 'sched-day-1',
        session_code: 'OPEN-01',
        title: 'Pembukaan Resmi & Sambutan Direktur Poltekkes',
        description: 'Lagu Indonesia Raya, Sambutan Direktur, Doa Pembuka',
        start_time: '08:30',
        end_time: '09:15',
        duration_minutes: 45,
        session_type: 'CEREMONY',
        speaker_name: 'Direktur Poltekkes Palembang & MC',
        pic_team: 'Operator AV / Soundman',
        equipment_checklist: [
          { name: 'Mic Wireless Utama (Baterai Penuh)', checked: true },
          { name: 'Audio Indonesia Raya Siap di Channel 2', checked: true },
          { name: 'Podium Sambutan Bersih & Siap', checked: true }
        ],
        status: 'COMPLETED',
        delay_minutes: 0,
        sort_order: 2,
        stage_cues: 'Spotlight ke podium saat Indonesia Raya berkumandang. MC memberi aba-aba hadirin berdiri.'
      },
      {
        id: 'item-103',
        schedule_id: 'sched-day-1',
        session_code: 'KEY-01',
        title: 'Materi 1: Mindset & Psikologi Public Speaking Berdaya',
        description: 'Mengatasi demam panggung, self-limiting belief, dan teknik anchoring',
        start_time: '09:15',
        end_time: '10:30',
        duration_minutes: 75,
        session_type: 'KEYNOTE',
        speaker_name: 'Master Trainer Public Speaking Dignity',
        pic_team: 'Operator PPT / Visual',
        equipment_checklist: [
          { name: 'Slide Deck PPT Master Dimuat di Laptop 1', checked: true },
          { name: 'Presenter Clicker & Pointer Laser di Meja Trainer', checked: true },
          { name: 'Flipchart & Spidol Warna-Warni Siap', checked: false }
        ],
        status: 'LIVE',
        delay_minutes: 0,
        sort_order: 3,
        stage_cues: 'Lampu panggung warm white terang. Sediakan air mineral hangat di meja narasumber.'
      },
      {
        id: 'item-104',
        schedule_id: 'sched-day-1',
        session_code: 'BRK-01',
        title: 'Coffee Break & Energizer Networking',
        description: 'Snack sehat, teh/kopi, dan relaksasi ringan',
        start_time: '10:30',
        end_time: '10:45',
        duration_minutes: 15,
        session_type: 'BREAK',
        speaker_name: 'Fasilitator Kelas',
        pic_team: 'Tim Konsumsi',
        equipment_checklist: [
          { name: 'Meja Snack Kopi/Teh Tertata Rapi', checked: false },
          { name: 'Playlist Akustik Santai Channel 1', checked: false }
        ],
        status: 'SCHEDULED',
        delay_minutes: 0,
        sort_order: 4,
        stage_cues: 'Nyalakan lampu ruangan full white. Pasang timer countdown 15 menit di layar proyektor.'
      },
      {
        id: 'item-105',
        schedule_id: 'sched-day-1',
        session_code: 'PRAC-01',
        title: 'Praktik 1: Struktur Pesan Berdaya & Hook Magnetik',
        description: 'Merancang opening 60 detik yang memikat audiens',
        start_time: '10:45',
        end_time: '12:00',
        duration_minutes: 75,
        session_type: 'PRACTICE',
        speaker_name: 'Tim Trainer & Co-Trainer',
        pic_team: 'LO Fasilitator Kelompok',
        equipment_checklist: [
          { name: 'Lembar Kerja Hook 60 Detik', checked: false },
          { name: 'Mic Wireless Cadangan 4 Unit untuk Peserta', checked: false }
        ],
        status: 'SCHEDULED',
        delay_minutes: 0,
        sort_order: 5,
        stage_cues: 'Co-trainer menyebar ke meja kelompok peserta untuk mendampingi drafting naskah.'
      },
      {
        id: 'item-106',
        schedule_id: 'sched-day-1',
        session_code: 'MEAL-01',
        title: 'ISHOMA (Istirahat, Sholat, Makan Siang)',
        description: 'Buffer istirahat siang dan sholat berjamaah',
        start_time: '12:00',
        end_time: '13:00',
        duration_minutes: 60,
        session_type: 'MEAL',
        speaker_name: 'Panitia Pelaksana',
        pic_team: 'Tim Konsumsi & Logistik',
        equipment_checklist: [
          { name: 'Prasmanan Makan Siang Siap di Foyer', checked: false },
          { name: 'Petunjuk Arah Menuju Musholla', checked: false }
        ],
        status: 'SCHEDULED',
        delay_minutes: 0,
        sort_order: 6,
        stage_cues: 'Layar proyektor menampilkan pengingat: "Sesi kembali dimulai pukul 13.00 WIB tepat."'
      },
      {
        id: 'item-107',
        schedule_id: 'sched-day-1',
        session_code: 'EVAL-01',
        title: 'Review Harian, Post-Session Q&A & Penugasan Mandiri',
        description: 'Evaluasi hari pertama dan briefing tugas simulasi besok',
        start_time: '16:00',
        end_time: '16:45',
        duration_minutes: 45,
        session_type: 'EVALUATION',
        speaker_name: 'Lead Trainer Dignity',
        pic_team: 'MC & Tim Dokumentasi',
        equipment_checklist: [
          { name: 'Link Presensi Sesi Sore Aktif', checked: false },
          { name: 'Kamera Foto Dokumentasi Siap di Tengah', checked: false }
        ],
        status: 'SCHEDULED',
        delay_minutes: 0,
        sort_order: 7,
        stage_cues: 'Foto bersama angkatan Day 1. Tampilkan QR Code feedback harian di layar utama.'
      }
    ]
  }
};

function getStoredMockData() {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading mock rundown storage:', e);
  }
  return DEFAULT_MOCK_DATA;
}

function saveStoredMockData(data) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error saving mock rundown storage:', e);
  }
}

export const rundownService = {
  /**
   * Mengambil daftar jadwal harian (schedules) untuk event tertentu
   */
  async getSchedulesByEvent(eventId) {
    if (isSupabaseConfigured() && eventId && isValidUuid(eventId)) {
      try {
        const { data, error } = await supabase
          .from('event_schedules')
          .select('*')
          .eq('event_id', eventId)
          .order('day_number', { ascending: true });

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Notice getSchedulesByEvent fallback to mock:', err.message);
      }
    }

    // Only fallback to mock if Supabase is completely unconfigured
    if (!isSupabaseConfigured()) {
      const mock = getStoredMockData();
      return mock.schedules;
    }
    return [];
  },

  /**
   * Mengambil daftar sesi detail untuk jadwal tertentu
   */
  async getItemsBySchedule(scheduleId) {
    if (isSupabaseConfigured() && scheduleId && isValidUuid(scheduleId)) {
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .select('*')
          .eq('schedule_id', scheduleId)
          .order('sort_order', { ascending: true })
          .order('start_time', { ascending: true });

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Notice getItemsBySchedule fallback to mock:', err.message);
      }
    }

    // Only fallback to mock if Supabase is completely unconfigured
    if (!isSupabaseConfigured()) {
      const mock = getStoredMockData();
      return mock.items[scheduleId] || [];
    }
    return [];
  },

  /**
   * Membuat jadwal hari baru
   */
  async createSchedule(scheduleData) {
    if (isSupabaseConfigured() && scheduleData.event_id && isValidUuid(scheduleData.event_id)) {
      try {
        const { data, error } = await supabase
          .from('event_schedules')
          .insert([scheduleData])
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Error createSchedule Supabase:', err.message);
      }
    }

    const mock = getStoredMockData();
    const newSchedule = {
      id: `sched-day-${Date.now()}`,
      day_number: mock.schedules.length + 1,
      is_published: true,
      ...scheduleData
    };
    mock.schedules.push(newSchedule);
    mock.items[newSchedule.id] = [];
    saveStoredMockData(mock);
    return newSchedule;
  },

  /**
   * Menambah sesi baru ke dalam rundown
   */
  async createScheduleItem(itemData) {
    if (isSupabaseConfigured() && itemData.schedule_id && isValidUuid(itemData.schedule_id)) {
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .insert([itemData])
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Error createScheduleItem Supabase:', err.message);
      }
    }

    const mock = getStoredMockData();
    const schedId = itemData.schedule_id || 'sched-day-1';
    if (!mock.items[schedId]) mock.items[schedId] = [];

    const newItem = {
      id: `item-${Date.now()}`,
      sort_order: mock.items[schedId].length + 1,
      status: 'SCHEDULED',
      delay_minutes: 0,
      equipment_checklist: [],
      ...itemData
    };

    mock.items[schedId].push(newItem);
    saveStoredMockData(mock);
    return newItem;
  },

  /**
   * Mengupdate data sesi
   */
  async updateScheduleItem(itemId, updates) {
    if (isSupabaseConfigured() && isValidUuid(itemId)) {
      try {
        const { data, error } = await supabase
          .from('schedule_items')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Error updateScheduleItem Supabase:', err.message);
      }
    }

    const mock = getStoredMockData();
    for (const sId in mock.items) {
      const idx = mock.items[sId].findIndex(i => i.id === itemId);
      if (idx !== -1) {
        mock.items[sId][idx] = { ...mock.items[sId][idx], ...updates };
        saveStoredMockData(mock);
        return mock.items[sId][idx];
      }
    }
    return null;
  },

  /**
   * Menghapus sesi
   */
  async deleteScheduleItem(itemId) {
    if (isSupabaseConfigured() && isValidUuid(itemId)) {
      try {
        const { error } = await supabase
          .from('schedule_items')
          .delete()
          .eq('id', itemId);

        if (!error) return true;
      } catch (err) {
        console.warn('Error deleteScheduleItem Supabase:', err.message);
      }
    }

    const mock = getStoredMockData();
    for (const sId in mock.items) {
      mock.items[sId] = mock.items[sId].filter(i => i.id !== itemId);
    }
    saveStoredMockData(mock);
    return true;
  },

  /**
   * Menjalankan pergeseran waktu dinamis (Dynamic Timeline Shift)
   */
  async shiftScheduleTimeline({ scheduleId, fromItemId, offsetMinutes, absorbInBreaks = true }) {
    if (isSupabaseConfigured() && isValidUuid(scheduleId) && isValidUuid(fromItemId)) {
      try {
        const { data, error } = await supabase.rpc('shift_schedule_timeline', {
          p_schedule_id: scheduleId,
          p_from_item_id: fromItemId,
          p_offset_minutes: offsetMinutes,
          p_absorb_in_breaks: absorbInBreaks
        });

        if (!error) return data;
      } catch (err) {
        console.warn('Error RPC shift_schedule_timeline Supabase:', err.message);
      }
    }

    // Fallback Mock In-Memory Shifting
    const mock = getStoredMockData();
    const schedItems = mock.items[scheduleId] || mock.items['sched-day-1'] || [];

    const fromIdx = schedItems.findIndex(i => i.id === fromItemId);
    if (fromIdx === -1) return { success: false, message: 'Item not found' };

    let currentOffset = offsetMinutes;
    let absorbedTotal = 0;
    let updatedCount = 0;

    const parseMinutes = (timeStr) => {
      const [h, m] = (timeStr || '00:00').split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutes = (totalMin) => {
      const normalized = (totalMin % 1440 + 1440) % 1440;
      const h = Math.floor(normalized / 60);
      const m = normalized % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    for (let i = fromIdx; i < schedItems.length; i++) {
      const item = schedItems[i];
      let startM = parseMinutes(item.start_time) + currentOffset;

      if (absorbInBreaks && currentOffset > 0 && (item.session_type === 'BREAK' || item.session_type === 'MEAL')) {
        const minDuration = item.session_type === 'MEAL' ? 30 : 15;
        const canAbsorb = Math.max(0, item.duration_minutes - minDuration);

        if (canAbsorb > 0) {
          const absorbed = Math.min(canAbsorb, currentOffset);
          const newDur = item.duration_minutes - absorbed;
          const endM = startM + newDur;

          item.start_time = formatMinutes(startM);
          item.end_time = formatMinutes(endM);
          item.duration_minutes = newDur;
          item.delay_minutes = (item.delay_minutes || 0) + offsetMinutes;

          currentOffset -= absorbed;
          absorbedTotal += absorbed;
          updatedCount++;
          continue;
        }
      }

      const endM = startM + item.duration_minutes;
      item.start_time = formatMinutes(startM);
      item.end_time = formatMinutes(endM);
      item.delay_minutes = (item.delay_minutes || 0) + offsetMinutes;
      updatedCount++;
    }

    saveStoredMockData(mock);
    return {
      success: true,
      updated_count: updatedCount,
      offset_minutes: offsetMinutes,
      absorbed_minutes: absorbedTotal,
      remaining_offset: currentOffset
    };
  },

  /**
   * Menghitung status pacing real-time berdasarkan jam lokal sekarang
   */
  calculatePacing(items = [], mockTime = null) {
    const now = mockTime || new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();

    const parseMin = (tStr) => {
      if (!tStr) return 0;
      const [h, m] = tStr.split(':').map(Number);
      return h * 60 + m;
    };

    // Cari item yang sedang berjalan (start <= now < end)
    let activeItem = null;
    let nextItem = null;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sMin = parseMin(it.start_time);
      const eMin = parseMin(it.end_time);

      if (currentMinutes >= sMin && currentMinutes < eMin) {
        activeItem = it;
        nextItem = items[i + 1] || null;
        break;
      }
    }

    // Jika tidak ada yang pas di rentang jam, cari sesi yang berstatus LIVE secara manual
    if (!activeItem) {
      activeItem = items.find(i => i.status === 'LIVE') || null;
    }

    // Jika masih belum ada, cari sesi terdekat yang belum mulai
    if (!activeItem) {
      nextItem = items.find(i => parseMin(i.start_time) > currentMinutes) || null;
    }

    let pacingStatus = 'SCHEDULED';
    let remainingSeconds = 0;
    let progressPercent = 0;

    if (activeItem) {
      const sMin = parseMin(activeItem.start_time);
      const eMin = parseMin(activeItem.end_time);
      const totalDurSec = (eMin - sMin) * 60;
      const elapsedSec = (currentMinutes - sMin) * 60 + currentSeconds;

      remainingSeconds = totalDurSec - elapsedSec;
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSec / totalDurSec) * 100)));

      if (remainingSeconds < 0) {
        pacingStatus = 'OVERTIME';
      } else if (remainingSeconds <= 600) {
        pacingStatus = 'PREPARING'; // Sisa kurang dari 10 menit
      } else {
        pacingStatus = 'LIVE';
      }
    } else if (items.length > 0 && currentMinutes >= parseMin(items[items.length - 1]?.end_time)) {
      pacingStatus = 'COMPLETED';
      progressPercent = 100;
    }

    return {
      activeItem,
      nextItem,
      pacingStatus,
      remainingSeconds,
      progressPercent,
      currentTimeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    };
  },

  /**
   * Mengimpor item rundown dari parsed CSV ke database Supabase
   * @param {Object} params
   * @param {string} params.eventId - ID event target
   * @param {string} [params.scheduleId] - ID jadwal spesifik jika ingin memasukkan ke hari tertentu
   * @param {Array} params.parsedItems - Hasil keluaran dari parseRundownCsv()
   * @param {boolean} [params.replaceExisting=false] - Jika true, hapus item lama di schedule tsb sebelum insert
   */
  async importScheduleItems({ eventId, scheduleId, parsedItems = [], replaceExisting = false }) {
    if (!parsedItems || parsedItems.length === 0) {
      throw new Error('Tidak ada data sesi yang dapat diimpor dari file CSV.');
    }

    // Kasus 1: scheduleId sudah ditentukan secara spesifik (misal diimpor ke hari yang sedang aktif)
    if (scheduleId) {
      if (isSupabaseConfigured() && isValidUuid(scheduleId)) {
        try {
          if (replaceExisting) {
            await supabase.from('schedule_items').delete().eq('schedule_id', scheduleId);
          }

          const payload = parsedItems.map((it, idx) => ({
            schedule_id: scheduleId,
            session_code: it.session_code || `SESI-${String(idx + 1).padStart(2, '0')}`,
            start_time: it.start_time,
            end_time: it.end_time,
            duration_minutes: it.duration_minutes || 30,
            title: it.title,
            description: it.description || '',
            session_type: it.session_type || 'KEYNOTE',
            speaker_name: it.speaker_name || '',
            pic_team: it.pic_team || '',
            equipment_checklist: it.equipment_checklist || [],
            stage_cues: it.stage_cues || '',
            status: 'SCHEDULED',
            delay_minutes: 0,
            sort_order: idx + 1
          }));

          const { data, error } = await supabase.from('schedule_items').insert(payload).select();
          if (error) throw error;

          return { success: true, count: data?.length || payload.length, scheduleId };
        } catch (err) {
          console.error('Error importing schedule items to Supabase:', err);
          throw new Error(`Gagal menyimpan ke database Supabase: ${err.message}`);
        }
      }

      // Fallback mock
      const mock = getStoredMockData();
      if (!mock.items[scheduleId]) mock.items[scheduleId] = [];
      if (replaceExisting) mock.items[scheduleId] = [];

      const newItems = parsedItems.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        schedule_id: scheduleId,
        session_code: it.session_code || `SESI-${String(idx + 1).padStart(2, '0')}`,
        start_time: it.start_time,
        end_time: it.end_time,
        duration_minutes: it.duration_minutes || 30,
        title: it.title,
        description: it.description || '',
        session_type: it.session_type || 'KEYNOTE',
        speaker_name: it.speaker_name || '',
        pic_team: it.pic_team || '',
        equipment_checklist: it.equipment_checklist || [],
        stage_cues: it.stage_cues || '',
        status: 'SCHEDULED',
        delay_minutes: 0,
        sort_order: (mock.items[scheduleId].length || 0) + idx + 1
      }));

      mock.items[scheduleId].push(...newItems);
      saveStoredMockData(mock);
      return { success: true, count: newItems.length, scheduleId };
    }

    // Kasus 2: Multi-day import otomatis berdasarkan kolom 'day_number'
    if (isSupabaseConfigured() && eventId && isValidUuid(eventId)) {
      try {
        const { data: existingSchedules, error: schedErr } = await supabase
          .from('event_schedules')
          .select('*')
          .eq('event_id', eventId);

        if (schedErr) throw schedErr;

        // Kelompokkan items per day_number
        const dayMap = {};
        parsedItems.forEach(it => {
          const d = it.day_number || 1;
          if (!dayMap[d]) dayMap[d] = [];
          dayMap[d].push(it);
        });

        let totalInserted = 0;
        const affectedSchedules = [];

        for (const dayNumStr of Object.keys(dayMap)) {
          const dayNum = parseInt(dayNumStr, 10);
          const dayItems = dayMap[dayNum];

          let targetSched = (existingSchedules || []).find(s => s.day_number === dayNum);
          if (!targetSched) {
            const { data: newSched, error: createErr } = await supabase
              .from('event_schedules')
              .insert([{
                event_id: eventId,
                day_number: dayNum,
                title: `Hari ke-${dayNum}: Sesi Agenda Pelatihan`,
                location_room: 'Ruang Pelatihan / Main Hall',
                is_published: true
              }])
              .select()
              .single();

            if (createErr) throw createErr;
            targetSched = newSched;
          }

          affectedSchedules.push(targetSched.id);

          if (replaceExisting) {
            await supabase.from('schedule_items').delete().eq('schedule_id', targetSched.id);
          }

          const payload = dayItems.map((it, idx) => ({
            schedule_id: targetSched.id,
            session_code: it.session_code || `D${dayNum}-S${String(idx + 1).padStart(2, '0')}`,
            start_time: it.start_time,
            end_time: it.end_time,
            duration_minutes: it.duration_minutes || 30,
            title: it.title,
            description: it.description || '',
            session_type: it.session_type || 'KEYNOTE',
            speaker_name: it.speaker_name || '',
            pic_team: it.pic_team || '',
            equipment_checklist: it.equipment_checklist || [],
            stage_cues: it.stage_cues || '',
            status: 'SCHEDULED',
            delay_minutes: 0,
            sort_order: idx + 1
          }));

          const { data: insData, error: insErr } = await supabase.from('schedule_items').insert(payload).select();
          if (insErr) throw insErr;
          totalInserted += (insData?.length || payload.length);
        }

        return { success: true, count: totalInserted, scheduleIds: affectedSchedules };
      } catch (err) {
        console.error('Error importing multi-day schedule items to Supabase:', err);
        throw new Error(`Gagal menyimpan ke database Supabase: ${err.message}`);
      }
    }

    throw new Error('Konfigurasi database atau ID event tidak valid.');
  },

  /**
   * Menghapus seluruh jadwal hari beserta seluruh item di dalamnya
   */
  async deleteSchedule(scheduleId) {
    if (isSupabaseConfigured() && isValidUuid(scheduleId)) {
      try {
        await supabase.from('schedule_items').delete().eq('schedule_id', scheduleId);
        const { error } = await supabase.from('event_schedules').delete().eq('id', scheduleId);
        if (!error) return true;
      } catch (err) {
        console.warn('Error deleteSchedule Supabase:', err.message);
      }
    }

    const mock = getStoredMockData();
    mock.schedules = (mock.schedules || []).filter(s => s.id !== scheduleId);
    delete mock.items[scheduleId];
    saveStoredMockData(mock);
    return true;
  }
};

