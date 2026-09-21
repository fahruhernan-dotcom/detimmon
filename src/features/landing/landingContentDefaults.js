/**
 * landingContentDefaults.js
 * Template Konten Default & Schema Resolver untuk Landing Page Multi-Event
 * LPK Indonesia Dignity (Database-Driven CMS)
 */

/**
 * Menghasilkan konfigurasi default landing page berdasarkan tipe acara (WEBINAR vs BOOTCAMP)
 * @param {string} eventType 'WEBINAR' | 'BOOTCAMP' | string
 * @param {number} basePrice Harga reguler
 * @param {number} promoPrice Harga promo / early bird
 * @returns {object} Struktur landing_page_config lengkap
 */
export function getLandingDefaults(eventType = 'BOOTCAMP', basePrice = 0, promoPrice = 0) {
  const isWebinar = eventType === 'WEBINAR';
  const unitPrice = promoPrice || basePrice || (isWebinar ? 100000 : 1850000);
  const regularPrice = basePrice || (isWebinar ? 150000 : 2250000);

  return {
    hero: {
      kicker: 'Program Sertifikasi Kompetensi Resmi',
      headline: isWebinar
        ? 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat'
        : 'Certified Basic & Intermediate Public Speaking Bootcamp',
      subheadline: isWebinar
        ? 'Bimbingan webinar interaktif intensif bersama Master Trainer berlisensi untuk menaklukkan cemas panggung, menguasai intonasi vokal berwibawa, dan membawakan presentasi meyakinkan.'
        : 'Pelatihan tatap muka intensif 2 hari di hotel bintang empat dengan simulasi panggung langsung, praktek olah vokal, dan evaluasi personal 1-on-1 bersama Master Trainer berlisensi.'
    },
    vital_card: {
      certificate_title: isWebinar
        ? 'E-Sertifikat Nasional Ber-QR Code'
        : 'Sertifikat Kelulusan Resmi Terakreditasi Dignity',
      certificate_desc: isWebinar
        ? 'Termasuk Modul Ringkasan & Checklist Panggung (PDF) serta Akses Rekaman Video Pelatihan HD 14 Hari Penuh.'
        : 'Makan siang prasmanan hotel 2 hari, 4x rehat kopi, seminar kit totebag mewah, modul cetak, & rekaman video panggung.',
      location_note: isWebinar
        ? 'Tautan resmi Zoom Cloud Meeting & ID koordinasi dikirimkan ke WhatsApp & Email'
        : 'Lokasi representatif hotel bintang empat dengan fasilitas ballroom & sound system panggung standar'
    },
    speaker: {
      is_confirmed: false,
      status_badge: 'Segera Diumumkan (TBA)',
      name: '',
      title: isWebinar
        ? 'Certified Public Speaking Master Trainer & Communication Specialist'
        : 'Tim Master Trainer & Senior Facilitator LPK Indonesia Dignity',
      bio: isWebinar
        ? 'Praktisi dan konsultan komunikasi publik tersertifikasi nasional yang berdedikasi melatih seni komunikasi panggung berbobot. Profil lengkap narasumber utama akan diumumkan resmi oleh Panitia Pelaksana LPK Indonesia Dignity.'
        : 'Fasilitator tatap muka berpengalaman membimbing eksekutif dan profesional dalam praktek panggung intensif dan evaluasi personal 1-on-1 selama 2 hari.',
      photo_url: '',
      teaser_tags: isWebinar
        ? ['Instruktur Utama Berlisensi', '100% Praktik Didampingi', 'Sesi Interaktif Langsung']
        : ['Simulasi Stage Tatap Muka', 'Evaluasi Personal 1-on-1', 'Sertifikasi Resmi LPK Dignity']
    },
    curriculum_pillars: isWebinar
      ? [
          {
            number: '01',
            title: 'Regulasi Adrenalin & Ketenangan 3 Menit Pertama',
            description: 'Kuasai teknik pernapasan diafragma dan ketenangan mental agar detak jantung stabil, pandangan mata fokus, dan pikiran jernih sejak detik pertama berbicara.',
            focus: 'Fokus: Penguasaan Mental & Demam Panggung'
          },
          {
            number: '02',
            title: 'Resonansi Vokal Mantap & The Power of Pause',
            description: 'Latih artikulasi suara dari rongga dada, kontrol tempo berbicara, dan eliminasi kata jeda pengisi (filler words) melalui jeda strategis yang memikat audiens.',
            focus: 'Fokus: Wibawa Akustik & Artikulasi Bahasa'
          },
          {
            number: '03',
            title: 'Arsitektur Gagasan & Penutupan yang Berkesan',
            description: 'Menyusun pembuka presentasi yang memikat (hook), menyampaikan poin inti secara terstruktur tanpa berbelit-belit, dan menutup dengan kalimat persuasif.',
            focus: 'Fokus: Struktur Presentasi & Retorika Persuasif'
          }
        ]
      : [
          {
            number: '01',
            title: 'Stage Presence, Postur Tubuh, & Bahasa Isyarat Wibawa',
            description: 'Pelajari postur berdiri kokoh di atas panggung, bahasa tubuh terbuka, dan ekspresi mikro yang memancarkan karisma pemimpin di forum formal.',
            focus: 'Fokus: Bahasa Tubuh Panggung & Gerak Mikro'
          },
          {
            number: '02',
            title: 'Olah Vokal Diafragma, Artikulasi, & Penekanan Nada',
            description: 'Latihan vokal langsung dengan mikrofon profesional untuk melatih proyeksi suara berwibawa, modulasi nada, serta dinamika volume yang hidup.',
            focus: 'Fokus: Proyeksi Suara Panggung & Modulasi'
          },
          {
            number: '03',
            title: 'Simulasi Panggung Langsung & Evaluasi Personal 1-on-1',
            description: 'Setiap peserta tampil membawakan presentasi di panggung mini ballroom, direkam dalam format HD, dan mendapatkan bedah evaluasi personal langsung.',
            focus: 'Fokus: Praktik Panggung & Rekaman Evaluasi'
          }
        ],
    facilities: isWebinar
      ? [
          {
            icon: 'Award',
            title: 'E-Sertifikat Berlisensi QR',
            description: 'E-Sertifikat berlisensi resmi dengan Nomor Registrasi Seri dan QR Code verifikasi publik online.'
          },
          {
            icon: 'BookOpen',
            title: 'E-Modul & Checklist Panggung',
            description: 'Panduan materi digital siap bawa panggung yang dapat Anda pelajari kembali sewaktu-waktu.'
          },
          {
            icon: 'Video',
            title: 'Akses Rekaman Video HD 14 Hari',
            description: 'Rekaman video webinar lengkap dengan resolusi HD yang dapat diputar ulang selama 14 hari penuh.'
          },
          {
            icon: 'Users',
            title: 'Grup WhatsApp Jejaring Alumni',
            description: 'Akses komunitas eksklusif alumni Dignity untuk konsultasi berkelanjutan dan informasi program lanjutan.'
          }
        ]
      : [
          {
            icon: 'Award',
            title: 'Sertifikat Kelulusan Resmi QR',
            description: 'Sertifikat kelulusan fisik dan digital resmi terdaftar dengan QR Code verifikasi legalitas.'
          },
          {
            icon: 'BookOpen',
            title: 'Buku Modul Cetak & Checklist',
            description: 'Buku panduan saku eksklusif bersampul mewah yang siap dibawa ke setiap panggung presentasi Anda.'
          },
          {
            icon: 'Utensils',
            title: 'Buffet Hotel & 4x Coffee Break',
            description: 'Makan siang prasmanan lezat hotel bintang empat serta 4 kali rehat kopi dan kudapan premium.'
          },
          {
            icon: 'Video',
            title: 'Video Rekaman Stage Performance',
            description: 'Dokumentasi video rekaman saat Anda tampil di panggung untuk evaluasi perkembangan kompetensi diri.'
          }
        ],
    packages: isWebinar
      ? [
          {
            id: 'INDIVIDU',
            name: 'Paket Regular Individu',
            price: unitPrice,
            originalPrice: regularPrice,
            badge: 'Paling Diminati',
            features: [
              '1 Akses Live Zoom Eksklusif & Sesi Tanya Jawab',
              'E-Sertifikat Resmi Ber-QR Code LPK Dignity',
              'Modul Ringkasan & Checklist Panggung (PDF)',
              'Akses Rekaman Video Pelatihan HD 14 Hari Penuh'
            ]
          },
          {
            id: 'MABAR_11',
            name: 'Paket Rombongan (10 + 1 Gratis)',
            price: unitPrice * 10,
            originalPrice: regularPrice * 11,
            badge: 'Hemat Perusahaan',
            features: [
              '11 Akses Live Zoom Lengkap untuk Tim/Instansi',
              '1 Peserta Gratis 100% (Hemat Biaya Pendaftaran)',
              '11 E-Sertifikat Mandiri Resmi Masing-Masing',
              'Invoice Resmi atas Nama Lembaga/Perusahaan'
            ]
          }
        ]
      : [
          {
            id: 'BOOTCAMP_EARLY',
            name: 'Paket Early Bird (Peserta Tunggal)',
            price: unitPrice,
            originalPrice: regularPrice,
            badge: 'Diskon Terbatas',
            features: [
              'Akses Penuh 2 Hari Bootcamp di Sala View Hotel Solo',
              'Sertifikat Kelulusan Resmi Terakreditasi Dignity',
              'Makan Siang Prasmanan Hotel 2 Hari & 4x Coffee Break',
              'Seminar Kit Eksklusif (Tas Totebag, Modul Buku, Nametag)',
              'Simulasi Panggung Langsung & Rekaman Video Penampilan'
            ]
          },
          {
            id: 'BOOTCAMP_MABAR_6',
            name: 'Paket Kolektif Instansi (Daftar 5 Gratis 1)',
            price: unitPrice * 5,
            originalPrice: regularPrice * 6,
            badge: 'Rekomendasi BUMN & Instansi',
            features: [
              '6 Pax Tiket Peserta Resmi Bootcamp',
              'Gratis Biaya 1 Orang Sepenuhnya (Hemat Jutaan Rupiah)',
              'Fasilitas Lengkap Hotel & 6 Set Seminar Kit Mewah',
              'Invoice & Kwitansi Resmi untuk Pelaporan Kantor/SPPD',
              'Konsultasi Evaluasi Performa Tim Pasca Acara'
            ]
          }
        ],
    faqs: [
      {
        q: 'Apakah pelatihan ini cocok untuk orang tua atau yang belum pernah berbicara di depan umum?',
        a: 'Sangat cocok! Lebih dari 60% peserta kami adalah pejabat, dokter, akademisi, dan profesional senior yang sebelumnya merasa cemas atau kaku berbicara di depan umum. Metode bimbingan dirancang bertahap, santai, menyenangkan, dan didampingi langsung oleh Master Trainer berpengalaman.'
      },
      {
        q: 'Bagaimana cara pendaftarannya jika saya kesulitan mengisi formulir online?',
        a: 'Jangan khawatir! Anda dapat langsung menekan tombol hijau "Bantuan Pendaftaran WhatsApp" di pojok kanan bawah layar. Tim admin panitia kami siap membantu memandu atau mencatatkan pendaftaran Anda secara langsung.'
      },
      {
        q: 'Apakah sertifikat yang diberikan resmi dan dapat digunakan untuk portofolio kedinasan?',
        a: 'Ya, resmi. LPK Indonesia Dignity adalah lembaga pelatihan kerja resmi terdaftar dengan legalitas akreditasi. Setiap sertifikat memiliki Nomor Registrasi Seri dan QR Code unik yang dapat diverifikasi secara publik online di portal resmi kami.'
      },
      {
        q: 'Bagaimana jika instansi/perusahaan saya membutuhkan Invoice, Surat Penawaran, atau Kwitansi SPPD?',
        a: 'Panitia kami dapat langsung menerbitkan Surat Undangan Resmi, Invoice, dan Kwitansi bermaterai atas nama instansi/perusahaan Anda untuk keperluan administrasi pencairan dana kantor.'
      },
      {
        q: isWebinar
          ? 'Apakah peserta akan mendapatkan rekaman video jika berhalangan hadir tepat waktu?'
          : 'Apakah peserta mendapatkan konsumsi dan fasilitas seminar kit di lokasi hotel?',
        a: isWebinar
          ? 'Ya! Seluruh peserta terdaftar akan mendapatkan tautan rekaman video webinar beresolusi HD yang dapat diakses selama 14 hari penuh pasca acara selesai.'
          : 'Tentu saja! Untuk pelatihan tatap muka (offline), seluruh peserta mendapatkan makan siang prasmanan lezat hotel bintang empat, 2 kali rehat kopi/teh per hari, modul materi cetak eksklusif, tas seminar kit kain tebal, pulpen, dan nametag resmi.'
      }
    ],
    rundown: {
      is_visible: true,
      publish_date: '',
      teaser_note: 'Susunan jadwal dan rundown kegiatan detail sedang dalam tahap kurasi bersama Master Trainer. Agenda lengkap akan dirilis secara resmi.'
    }
  };
}

/**
 * Menggabungkan konfigurasi database dengan default template agar bebas dari properti null/undefined
 * @param {object} event Object event dari Supabase
 * @returns {object} Object landing_page_config yang sudah di-resolve lengkap
 */
export function resolveLandingConfig(event) {
  if (!event) return getLandingDefaults('BOOTCAMP', 0, 0);

  const eventType = event.event_type || (event.title?.toLowerCase().includes('webinar') ? 'WEBINAR' : 'BOOTCAMP');
  const defaults = getLandingDefaults(eventType, event.base_price, event.promo_price);
  const cfg = event.landing_page_config || {};

  return {
    hero: {
      kicker: cfg.hero?.kicker || defaults.hero.kicker,
      headline: cfg.hero?.headline || cfg.hero_headline || event.title || defaults.hero.headline,
      subheadline: cfg.hero?.subheadline || cfg.hero_subheadline || defaults.hero.subheadline
    },
    vital_card: {
      certificate_title: cfg.vital_card?.certificate_title || defaults.vital_card.certificate_title,
      certificate_desc: cfg.vital_card?.certificate_desc || defaults.vital_card.certificate_desc,
      location_note: cfg.vital_card?.location_note || defaults.vital_card.location_note
    },
    speaker: {
      is_confirmed: cfg.speaker?.is_confirmed ?? Boolean(cfg.speaker?.name || event.speaker_name),
      status_badge: cfg.speaker?.status_badge || defaults.speaker.status_badge,
      name: cfg.speaker?.name || event.speaker_name || '',
      title: cfg.speaker?.title || defaults.speaker.title,
      bio: cfg.speaker?.bio || defaults.speaker.bio,
      photo_url: cfg.speaker?.photo_url || '',
      teaser_tags: Array.isArray(cfg.speaker?.teaser_tags) && cfg.speaker.teaser_tags.length > 0
        ? cfg.speaker.teaser_tags
        : defaults.speaker.teaser_tags
    },
    curriculum_pillars: Array.isArray(cfg.curriculum_pillars) && cfg.curriculum_pillars.length > 0
      ? cfg.curriculum_pillars
      : defaults.curriculum_pillars,
    facilities: Array.isArray(cfg.facilities) && cfg.facilities.length > 0
      ? cfg.facilities
      : defaults.facilities,
    packages: Array.isArray(cfg.packages) && cfg.packages.length > 0
      ? cfg.packages
      : (Array.isArray(event.web_registration_config?.packages) && event.web_registration_config.packages.length > 0
          ? event.web_registration_config.packages
          : defaults.packages),
    faqs: Array.isArray(cfg.faqs) && cfg.faqs.length > 0
      ? cfg.faqs
      : defaults.faqs,
    rundown: {
      is_visible: cfg.rundown?.is_visible ?? defaults.rundown.is_visible,
      publish_date: cfg.rundown?.publish_date || defaults.rundown.publish_date,
      teaser_note: cfg.rundown?.teaser_note || defaults.rundown.teaser_note
    }
  };
}

/**
 * Memeriksa apakah rundown kegiatan diizinkan tampil ke publik berdasarkan visibilitas & jadwal rilis
 * @param {object} rundownConfig 
 * @returns {boolean} true jika boleh ditampilkan, false jika disembunyikan / menunggu jadwal
 */
export function isRundownPubliclyVisible(rundownConfig) {
  if (!rundownConfig) return true;
  // 1. Jika switch visibilitas dimatikan manual oleh admin
  if (rundownConfig.is_visible === false) return false;
  // 2. Jika ada jadwal rilis di masa mendatang (belum tiba waktunya)
  if (rundownConfig.publish_date) {
    const pubTime = new Date(rundownConfig.publish_date).getTime();
    if (!isNaN(pubTime) && Date.now() < pubTime) {
      return false;
    }
  }
  return true;
}
