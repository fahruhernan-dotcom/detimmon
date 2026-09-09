/**
 * financialService.js — Flexible Multi-Event Financial P&L & Expense Engine
 * LPK Indonesia Dignity in Collaboration with KLTC®
 */

export const EXPENSE_CATEGORIES = {
  SPEAKER: { label: 'Pembicara / Trainer', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  VENUE: { label: 'Venue & Fasilitas', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  CONSUMPTION: { label: 'Konsumsi & F&B', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  MARKETING: { label: 'Marketing & Ads', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  LOGISTICS: { label: 'Logistik & Seminar Kit', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  OPERATIONAL: { label: 'Operasional & IT', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  OTHER: { label: 'Lain-lain', color: 'bg-gray-100 text-gray-800 border-gray-200' }
};

export const DEFAULT_FINANCIAL_TEMPLATES = {
  WEBINAR: {
    expenses: [
      { id: 'exp-w-1', title: 'Honor Narasumber / Trainer Utama', category: 'SPEAKER', amount: 2500000, isEnabled: true },
      { id: 'exp-w-2', title: 'Lisensi Akun Zoom Webinar Pro (500 Pax)', category: 'OPERATIONAL', amount: 250000, isEnabled: true },
      { id: 'exp-w-3', title: 'Alokasi Iklan & Promosi (Meta Ads)', category: 'MARKETING', amount: 500000, isEnabled: true },
      { id: 'exp-w-4', title: 'Gateway & Distribusi Sertifikat Digital', category: 'OPERATIONAL', amount: 150000, isEnabled: true }
    ],
    upsellConfig: {
      targetTitle: 'Executive Bootcamp Offline Sala View Hotel Solo (12-13 Des 2026)',
      targetPrice: 1850000,
      rebateAmount: 100000,
      scenarios: [5, 10, 15]
    }
  },
  BOOTCAMP: {
    expenses: [
      { id: 'exp-b-1', title: 'Sewa Ballroom & Sound System Hotel Sala View', category: 'VENUE', amount: 3500000, isEnabled: true },
      { id: 'exp-b-2', title: 'Honor Master Trainer & Tim Fasilitator (2 Hari)', category: 'SPEAKER', amount: 5000000, isEnabled: true },
      { id: 'exp-b-3', title: 'Paket Buffet Lunch & 2x Coffee Break Peserta', category: 'CONSUMPTION', amount: 2500000, isEnabled: true },
      { id: 'exp-b-4', title: 'Seminar Kit, Modul Eksklusif & Sertifikat Fisik', category: 'LOGISTICS', amount: 800000, isEnabled: true },
      { id: 'exp-b-5', title: 'Dokumentasi Foto & Video Highlight Profesional', category: 'OPERATIONAL', amount: 1000000, isEnabled: true }
    ],
    upsellConfig: {
      targetTitle: 'Certified Public Speaking Practitioner (CPSP)® Masterclass',
      targetPrice: 3500000,
      rebateAmount: 250000,
      scenarios: [3, 6, 10]
    }
  },
  WORKSHOP: {
    expenses: [
      { id: 'exp-m-1', title: 'Biaya Lisensi Ujian & Asesor Sertifikasi CPSP®', category: 'OPERATIONAL', amount: 4000000, isEnabled: true },
      { id: 'exp-m-2', title: 'Honor Master Trainer Bersertifikasi BNSP', category: 'SPEAKER', amount: 4500000, isEnabled: true },
      { id: 'exp-m-3', title: 'Sewa Ruang Meeting Eksklusif The Sunan Hotel', category: 'VENUE', amount: 2500000, isEnabled: true },
      { id: 'exp-m-4', title: 'Paket F&B Hotel Bintang 4 & Coffee Break', category: 'CONSUMPTION', amount: 1800000, isEnabled: true }
    ],
    upsellConfig: {
      targetTitle: 'Private 1-on-1 Executive Coaching & Mentorship',
      targetPrice: 7500000,
      rebateAmount: 500000,
      scenarios: [1, 2, 4]
    }
  }
};

export const financialService = {
  /**
   * Mengambil konfigurasi finansial per event dari LocalStorage atau default template
   */
  getFinancialConfig(eventId, eventType = 'WEBINAR') {
    const storageKey = `dignity_financial_config_${eventId || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.expenses && Array.isArray(parsed.expenses)) {
          return parsed;
        }
      } catch (err) {
        console.warn('Gagal membaca financial config dari localStorage:', err);
      }
    }

    // Fallback ke template berdasarkan event_type
    const normalizedType = String(eventType || 'WEBINAR').toUpperCase();
    const template = DEFAULT_FINANCIAL_TEMPLATES[normalizedType] || DEFAULT_FINANCIAL_TEMPLATES.WEBINAR;
    return JSON.parse(JSON.stringify(template));
  },

  /**
   * Menyimpan konfigurasi finansial untuk event tertentu
   */
  saveFinancialConfig(eventId, config) {
    const storageKey = `dignity_financial_config_${eventId || 'default'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      return true;
    } catch (err) {
      console.error('Gagal menyimpan financial config:', err);
      return false;
    }
  },

  /**
   * Reset konfigurasi finansial kembali ke template default acara
   */
  resetToDefault(eventId, eventType = 'WEBINAR') {
    const normalizedType = String(eventType || 'WEBINAR').toUpperCase();
    const template = DEFAULT_FINANCIAL_TEMPLATES[normalizedType] || DEFAULT_FINANCIAL_TEMPLATES.WEBINAR;
    this.saveFinancialConfig(eventId, template);
    return JSON.parse(JSON.stringify(template));
  }
};

export default financialService;
