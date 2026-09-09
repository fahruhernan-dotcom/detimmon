/**
 * csvRundownHelper.js
 * Utility untuk membuat, membaca (parse), mengekspor, dan mengunduh template CSV/Excel rundown acara.
 * Kompatibel dengan Microsoft Excel (menggunakan UTF-8 BOM agar aksen dan karakter tidak rusak).
 */

// Header Kolom Standar CSV Rundown Dignity
export const RUNDOWN_CSV_HEADERS = [
  'hari_ke',
  'kode_sesi',
  'jam_mulai',
  'jam_selesai',
  'durasi_menit',
  'judul_sesi',
  'deskripsi_materi',
  'tipe_sesi',
  'nama_pembicara',
  'pic_tim',
  'daftar_alat',
  'stage_cues'
];

/**
 * Sanitasi cell terhadap kerentanan CWE-1236 (CSV / Formula Injection).
 * Excel/Calc mengeksekusi cell yang berawalan =, +, -, @, \t, atau \r.
 * Menambahkan prefix kutip satu (') untuk menetralkan injeksi formula tanpa merusak teks saat dibuka.
 */
export function sanitizeCsvFormula(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[\t\r]/.test(str) || /^[=+\-@]/.test(str.trimStart())) {
    return `'${str}`;
  }
  return str;
}

/**
 * Membaca kembali teks yang telah disanitasi dengan menghilangkan prefix kutip satu pencegah formula
 */
export function desanitizeCsvFormula(val) {
  if (typeof val !== 'string') return val;
  if (val.startsWith("'")) {
    const remainder = val.slice(1);
    if (/^[\t\r]/.test(remainder) || /^[=+\-@]/.test(remainder.trimStart())) {
      return remainder;
    }
  }
  return val;
}

/**
 * Membuat data template CSV contoh yang siap diedit di Excel
 */
export function generateRundownTemplateCsv() {
  const sampleRows = [
    [
      '1',
      'REG-01',
      '08:00',
      '08:30',
      '30',
      'Registrasi Ulang & Welcome Drink',
      'Verifikasi barcode QR tiket di meja depan dan pembagian seminar kit',
      'CEREMONY',
      'Tim Kesekretariatan Dignity',
      'LO Meja Depan',
      'Scanner Barcode Tiket; Seminar Kit Lengkap; Nametag Peserta',
      'Putar musik latar santai di area foyer hotel'
    ],
    [
      '1',
      'OPEN-01',
      '08:30',
      '09:00',
      '30',
      'Pembukaan Resmi & Sambutan Direktur',
      'Lagu Indonesia Raya, Sambutan Direktur Lembaga, Doa Pembuka',
      'CEREMONY',
      'Direktur LPK Dignity & MC',
      'MC & Soundman',
      'Mic Wireless Utama 2 Unit; Audio Indonesia Raya Channel 1',
      'Lampu panggung sorot utama dinyalakan penuh saat MC naik'
    ],
    [
      '1',
      'MAT-01',
      '09:00',
      '10:30',
      '90',
      'Sesi 1: Psychology of Stage Presence & Mengatasi Grogi',
      'Membongkar akar demam panggung, teknik pernapasan diafragma 4-7-8',
      'KEYNOTE',
      'Lead Master Trainer LPK Dignity',
      'Operator AV',
      'Slide Deck Clicker; Layar Proyektor; Flipchart & Spidol',
      'Trainer mengajak peserta berdiri untuk simulasi pernafasan'
    ],
    [
      '1',
      'BRK-01',
      '10:30',
      '10:45',
      '15',
      'Morning Coffee Break & Networking',
      'Rehat kopi, teh hangat, dan camilan pastry di area foyer',
      'BREAK',
      'Tim Konsumsi Hotel',
      'LO Konsumsi',
      'Coffee & Tea Station Siap',
      'Lonceng pengingat 5 menit sebelum sesi kembali dimulai'
    ],
    [
      '1',
      'PRAC-01',
      '10:45',
      '12:15',
      '90',
      'Sesi 2: Olah Vokal, Artikulasi & Bahasa Tubuh Pemimpin',
      'Praktik resonansi suara dada, menghilangkan filler words, dan gestur terbuka',
      'PRACTICE',
      'Master Trainer & Fasilitator',
      'Fasilitator Kelas',
      'Mic Cadangan 4 Unit; Matras Area Gerak Bersih',
      'Latihan kelompok kecil 3 orang didampingi fasilitator'
    ],
    [
      '1',
      'LUNCH-01',
      '12:15',
      '13:15',
      '60',
      'ISHOMA (Makan Siang Prasmanan & Sholat)',
      'Makan siang buffet hotel bintang empat dan ibadah sholat dzuhur',
      'MEAL',
      'Tim Hotel & Panitia',
      'LO Ruangan',
      'Buffet Lunch Ready; Petunjuk Arah Musholla',
      'Layar proyektor menampilkan: Sesi siang dimulai pukul 13.15 WIB'
    ],
    [
      '1',
      'DEMO-01',
      '13:15',
      '15:15',
      '120',
      'Sesi 3: Simulasi Panggung Langsung & Rekaman Video Penampilan',
      'Setiap peserta tampil 3 menit di panggung direkam kamera HD',
      'DEMO',
      'Panel Evaluator Trainer',
      'Tim Dokumentasi Video',
      'Kamera HD Stand Tripod; Timer Display Panggung',
      'Kamera merekam ekspresi dan intonasi setiap peserta'
    ],
    [
      '1',
      'EVAL-01',
      '15:30',
      '17:00',
      '90',
      'Sesi 4: Bedah Video Penampilan & Evaluasi Personal 1-on-1',
      'Playback cuplikan panggung di layar besar dan feedback perbaikan',
      'EVALUATION',
      'Lead Master Trainer',
      'Operator Proyektor',
      'Playback Video ke Proyektor; Lembar Evaluasi Trainer',
      'Trainer memberikan arahan perbaikan untuk sesi hari berikutnya'
    ]
  ];

  const csvContent = [
    RUNDOWN_CSV_HEADERS.join(','),
    ...sampleRows.map(row =>
      row.map(field => `"${String(sanitizeCsvFormula(field)).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\r\n');

  return csvContent;
}

/**
 * Mengekspor jadwal aktif saat ini ke format CSV dengan proteksi CWE-1236 (Formula Injection)
 */
export function exportRundownItemsToCsv(items, dayNumber = 1) {
  if (!items || items.length === 0) return '';

  const rows = items.map((item) => {
    const checklistStr = Array.isArray(item.equipment_checklist)
      ? item.equipment_checklist.map(c => typeof c === 'string' ? c : c.name).join('; ')
      : '';

    return [
      String(dayNumber),
      item.session_code || '',
      item.start_time?.slice(0, 5) || '',
      item.end_time?.slice(0, 5) || '',
      String(item.duration_minutes || 30),
      item.title || '',
      item.description || '',
      item.session_type || 'KEYNOTE',
      item.speaker_name || '',
      item.pic_team || '',
      checklistStr,
      item.stage_cues || ''
    ];
  });

  return [
    RUNDOWN_CSV_HEADERS.join(','),
    ...rows.map(row =>
      row.map(field => `"${String(sanitizeCsvFormula(field)).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\r\n');
}

/**
 * Parser CSV robust yang mendukung pemisah koma (,) atau titik-koma (;) Excel Indonesia
 */
export function parseRundownCsv(csvString) {
  if (!csvString || typeof csvString !== 'string') return [];

  // Hilangkan UTF-8 BOM jika ada
  let text = csvString.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  // Pisahkan baris
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Deteksi pemisah (delimiter: koma vs titik koma)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  // Helper untuk memecah satu baris CSV dengan menghormati kutip ganda
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Lewati kutip kedua
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const parsedItems = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const getVal = (possibleKeys, fallback = '') => {
      for (const k of possibleKeys) {
        if (headerMap[k] !== undefined && values[headerMap[k]] !== undefined) {
          return desanitizeCsvFormula(values[headerMap[k]]);
        }
      }
      return fallback;
    };

    const dayNumber = parseInt(getVal(['hari_ke', 'day', 'hari', 'day_number'], '1'), 10) || 1;
    const sessionCode = getVal(['kode_sesi', 'session_code', 'kode'], `SESI-${String(i).padStart(2, '0')}`);
    const startTime = getVal(['jam_mulai', 'start_time', 'start', 'mulai'], '08:00');
    const endTime = getVal(['jam_selesai', 'end_time', 'end', 'selesai'], '08:30');
    const durationMinutes = parseInt(getVal(['durasi_menit', 'duration', 'durasi'], '30'), 10) || 30;
    const title = getVal(['judul_sesi', 'title', 'judul', 'nama_sesi'], `Sesi Agenda #${i}`);
    const description = getVal(['deskripsi_materi', 'description', 'deskripsi', 'materi'], '');
    
    let sessionType = getVal(['tipe_sesi', 'session_type', 'tipe', 'type'], 'KEYNOTE').toUpperCase();
    const validTypes = ['CEREMONY', 'KEYNOTE', 'PRACTICE', 'DEMO', 'BREAK', 'MEAL', 'EVALUATION'];
    if (!validTypes.includes(sessionType)) {
      if (sessionType.includes('MAKAN') || sessionType.includes('ISHOMA')) sessionType = 'MEAL';
      else if (sessionType.includes('REHAT') || sessionType.includes('COFFEE')) sessionType = 'BREAK';
      else if (sessionType.includes('PRAKTEK') || sessionType.includes('PRAKTIK')) sessionType = 'PRACTICE';
      else if (sessionType.includes('BUKA') || sessionType.includes('TUTUP')) sessionType = 'CEREMONY';
      else if (sessionType.includes('SIMULASI') || sessionType.includes('DEMO')) sessionType = 'DEMO';
      else if (sessionType.includes('UJIAN') || sessionType.includes('TEST')) sessionType = 'EVALUATION';
      else sessionType = 'KEYNOTE';
    }

    const speakerName = getVal(['nama_pembicara', 'speaker_name', 'pembicara', 'trainer'], '');
    const picTeam = getVal(['pic_tim', 'pic', 'penanggung_jawab'], '');
    
    // Daftar alat checklist (dipisahkan tanda titik koma ;)
    const rawChecklist = getVal(['daftar_alat', 'equipment', 'alat', 'checklist'], '');
    const equipmentChecklist = rawChecklist
      ? rawChecklist.split(';').map(item => ({ name: item.trim(), checked: false })).filter(item => item.name.length > 0)
      : [];

    const stageCues = getVal(['stage_cues', 'cues', 'petunjuk_panggung'], '');

    parsedItems.push({
      day_number: dayNumber,
      session_code: sessionCode,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      duration_minutes: durationMinutes,
      title,
      description,
      session_type: sessionType,
      speaker_name: speakerName,
      pic_team: picTeam,
      equipment_checklist: equipmentChecklist,
      stage_cues: stageCues,
      status: 'SCHEDULED',
      delay_minutes: 0,
      sort_order: i
    });
  }

  return parsedItems;
}

/**
 * Memicu pengunduhan file string/blob di browser pengguna
 */
export function downloadCsvFile(csvContent, filename = 'Template_Rundown_Dignity.csv') {
  // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel membaca karakter Indonesia dengan sempurna
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
