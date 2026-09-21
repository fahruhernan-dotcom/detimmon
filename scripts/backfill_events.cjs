const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jcysfzwrrkvybpjdvrrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjeXNmendycmt2eWJwamR2cnJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODY5MzAzNywiZXhwIjoyMTA0MjY5MDM3fQ.-YUPdeBst8saFmMJTYn57BbBL8YKqstAWRrYzMQ1_6Y';

const supabase = createClient(supabaseUrl, supabaseKey);

const webinarConfig = {
  hero: {
    kicker: 'Program Sertifikasi Kompetensi Resmi',
    headline: 'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
    subheadline: 'Bimbingan webinar interaktif intensif bersama Master Trainer berlisensi untuk menaklukkan cemas panggung, menguasai intonasi vokal berwibawa, dan membawakan presentasi meyakinkan.'
  },
  vital_card: {
    certificate_title: 'E-Sertifikat Nasional Ber-QR Code',
    certificate_desc: 'Termasuk Modul Ringkasan & Checklist Panggung (PDF) serta Akses Rekaman Video Pelatihan HD 14 Hari Penuh.',
    location_note: 'Tautan resmi Zoom Cloud Meeting & ID koordinasi dikirimkan ke WhatsApp & Email'
  },
  speaker: {
    is_confirmed: false,
    status_badge: 'Segera Diumumkan (TBA)',
    name: '',
    title: 'Certified Public Speaking Master Trainer & Communication Specialist',
    bio: 'Praktisi dan konsultan komunikasi publik tersertifikasi nasional yang berdedikasi melatih seni komunikasi panggung berbobot. Profil lengkap narasumber utama akan diumumkan resmi oleh Panitia Pelaksana LPK Indonesia Dignity.',
    photo_url: '',
    teaser_tags: ['Instruktur Utama Berlisensi', '100% Praktik Didampingi', 'Sesi Interaktif Langsung']
  },
  curriculum_pillars: [
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
  ],
  facilities: [
    {
      icon: 'Award',
      title: 'E-Sertifikat Berlisensi QR',
      description: 'Sertifikat resmi kompetensi webinar publik speaking ber-ID verifikasi nasional.'
    },
    {
      icon: 'BookOpen',
      title: 'Modul PDF & Checklist Panggung',
      description: 'Panduan intisari materi retorika, lembar kerja pernapasan, dan checklist siap tampil.'
    },
    {
      icon: 'Video',
      title: 'Akses Rekaman Video HD 14 Hari',
      description: 'Tonton ulang seluruh sesi pemaparan dan tanya jawab kapan saja tanpa khawatir tertinggal.'
    },
    {
      icon: 'MessageSquare',
      title: 'Grup Diskusi & Jejaring Peserta',
      description: 'Komunitas WhatsApp eksklusif bersama sesama profesional dan panitia Dignity.'
    }
  ],
  faqs: [
    {
      q: 'Apakah pemula yang belum pernah berbicara di depan umum cocok ikut?',
      a: 'Sangat cocok. Kurikulum disusun sistematis dari nol untuk menumbuhkan rasa percaya diri, melatih pernapasan, dan mengatasi rasa cemas bicara di depan audiens.'
    },
    {
      q: 'Bagaimana tautan Zoom dan akses webinar akan diberikan?',
      a: 'Tautan resmi Zoom Cloud Meeting dan panduan teknis akan dikirimkan otomatis ke nomor WhatsApp dan email aktif Anda H-1 sebelum acara dimulai.'
    },
    {
      q: 'Kapan E-Sertifikat diterbitkan dan bagaimana verifikasinya?',
      a: 'E-Sertifikat dengan nomor seri resmi dan QR code verifikasi dapat diunduh langsung melalui menu Verifikasi Sertifikat di portal ini maksimal 1x24 jam setelah webinar berakhir.'
    },
    {
      q: 'Jika berhalangan hadir pada jam acara, apakah tetap dapat materi?',
      a: 'Ya, seluruh peserta terdaftar berhak atas rekaman penuh video acara beresolusi HD selama 14 hari serta modul e-book panduan praktis.'
    }
  ]
};

const bootcampConfig = {
  hero: {
    kicker: 'Program Sertifikasi Kompetensi Resmi Tatap Muka',
    headline: 'Certified Basic & Intermediate Public Speaking Bootcamp Solo',
    subheadline: 'Pelatihan tatap muka intensif 2 hari di hotel bintang empat dengan simulasi panggung langsung, praktek olah vokal, dan evaluasi personal 1-on-1 bersama Master Trainer berlisensi.'
  },
  vital_card: {
    certificate_title: 'Sertifikat Kelulusan Resmi Terakreditasi Dignity',
    certificate_desc: 'Makan siang prasmanan hotel 2 hari, 4x rehat kopi, seminar kit totebag mewah, modul cetak, & rekaman video panggung.',
    location_note: 'Lokasi representatif hotel bintang empat dengan fasilitas ballroom & sound system panggung standar'
  },
  speaker: {
    is_confirmed: false,
    status_badge: 'Segera Diumumkan (TBA)',
    name: '',
    title: 'Tim Master Trainer & Senior Facilitator LPK Indonesia Dignity',
    bio: 'Fasilitator tatap muka berpengalaman membimbing eksekutif dan profesional dalam praktek panggung intensif dan evaluasi personal 1-on-1 selama 2 hari.',
    photo_url: '',
    teaser_tags: ['Simulasi Stage Tatap Muka', 'Evaluasi Personal 1-on-1', 'Sertifikasi Resmi LPK Dignity']
  },
  curriculum_pillars: [
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
  facilities: [
    {
      icon: 'Hotel',
      title: 'Hotel Bintang Empat & Konsumsi Mewah',
      description: 'Makan siang buffet hotel berbintang selama 2 hari pelatihan serta 4 kali sesi rehat kopi (coffee break).'
    },
    {
      icon: 'Briefcase',
      title: 'Executive Seminar Kit & Modul Cetak',
      description: 'Totebag eksklusif Dignity, buku kerja cetak full color, pulpen eksekutif, dan name badge peserta.'
    },
    {
      icon: 'Camera',
      title: 'Video Rekaman Stage Performance HD',
      description: 'Dokumentasi video rekaman saat simulasi panggung untuk arsip dan evaluasi perkembangan komunikasi Anda.'
    },
    {
      icon: 'Award',
      title: 'Sertifikat Kelulusan Cetak Berbingkai',
      description: 'Sertifikat resmi kompetensi fisik yang ditandatangani Master Trainer dan direktur LPK Indonesia Dignity.'
    }
  ],
  faqs: [
    {
      q: 'Di mana lokasi persis pelaksanaan bootcamp di Solo?',
      a: 'Pelatihan diadakan di ballroom hotel bintang 4 ternama di pusat kota Solo (Surakarta). Nama hotel dan petunjuk arah akan diumumkan via grup WhatsApp koordinasi peserta.'
    },
    {
      q: 'Apakah harga sudah termasuk akomodasi kamar menginap?',
      a: 'Biaya pendaftaran mencakup seluruh fasilitas pelatihan, makan siang buffet 2 hari, coffee break 4 kali, dan seminar kit. Akomodasi kamar hotel tidak termasuk (dapat dipesan mandiri).'
    },
    {
      q: 'Berapa kuota peserta maksimal untuk kelas ini?',
      a: 'Demi efektivitas simulasi panggung dan evaluasi 1-on-1 yang mendalam, kelas dibatasi maksimal 20 peserta saja.'
    },
    {
      q: 'Apakah saya mendapatkan pendampingan setelah pelatihan selesai?',
      a: 'Ya, seluruh alumni bootcamp mendapatkan akses ke Komunitas Alumni Dignity Speakers Club untuk konsultasi dan jejaring karir.'
    }
  ]
};

async function backfill() {
  console.log('Fetching existing events...');
  const { data: events, error } = await supabase.from('events').select('id, slug, event_type, title, landing_page_config');
  if (error) {
    console.error('Error fetching events:', error);
    process.exit(1);
  }

  console.log(`Found ${events.length} events:`, events.map(e => ({ slug: e.slug, type: e.event_type })));

  for (const ev of events) {
    const isWebinar = ev.event_type === 'WEBINAR' || ev.slug.includes('msc');
    const config = isWebinar ? webinarConfig : bootcampConfig;

    console.log(`Updating event ${ev.slug} with full landing_page_config...`);
    const { error: updateError } = await supabase
      .from('events')
      .update({ landing_page_config: config })
      .eq('id', ev.id);

    if (updateError) {
      console.error(`Failed to update ${ev.slug}:`, updateError);
    } else {
      console.log(`Successfully updated ${ev.slug}`);
    }
  }

  console.log('Backfill complete!');
}

backfill();
