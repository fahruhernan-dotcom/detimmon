-- ==============================================================================
-- Migration 011: Seed Real Production Rundown Schedules & Items (PRD 16 & 17)
-- Dignity Event Operations Command Center
-- ==============================================================================

-- 1. SEED SCHEDULES & ITEMS UNTUK EVENT 1: WEBINAR PRE-EVENT (msc-nov-2026)
-- Event ID: b783be63-91a8-4336-8199-d6a754a7f6c2
DO $$
DECLARE
    v_event_webinar_id UUID := 'b783be63-91a8-4336-8199-d6a754a7f6c2';
    v_sched_webinar_id UUID := 'a1111111-1111-1111-1111-111111111111';
BEGIN
    -- Pastikan event webinar ada di database
    IF EXISTS (SELECT 1 FROM public.events WHERE id = v_event_webinar_id) THEN
        -- Insert Schedule Day 1 Webinar
        INSERT INTO public.event_schedules (
            id, event_id, day_number, schedule_date, title, location_room, track_name, is_published
        ) VALUES (
            v_sched_webinar_id,
            v_event_webinar_id,
            1,
            '2026-11-14',
            'Sesi Live Webinar: Mastering Stage Confidence',
            'Zoom Cloud Meeting',
            'Main Webinar Room',
            true
        ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            location_room = EXCLUDED.location_room,
            is_published = true;

        -- Bersihkan items lama jika ada agar idempotent
        DELETE FROM public.schedule_items WHERE schedule_id = v_sched_webinar_id;

        -- Insert Rincian Sesi Menit-ke-Menit Webinar
        INSERT INTO public.schedule_items (
            schedule_id, session_code, title, description, start_time, end_time, duration_minutes,
            session_type, speaker_name, pic_team, equipment_checklist, status, sort_order, stage_cues
        ) VALUES
        (
            v_sched_webinar_id, 'WEB-01', 'Open Gate & Registrasi Kehadiran Online',
            'Peserta masuk ruang tunggu Zoom, verifikasi nama terdaftar, pemutaran video bumper profil LPK Dignity.',
            '08:00:00', '08:30:00', 30, 'CEREMONY', 'Tim Kesekretariatan Dignity', 'Host Zoom / Admin',
            '[{"name": "Spotlight Host Aktif", "checked": true}, {"name": "Lagu Bumper Pembuka Channel 1", "checked": true}, {"name": "Link Presensi Sesi 1 Aktif", "checked": true}]'::jsonb,
            'SCHEDULED', 1, 'Pastikan seluruh peserta me-rename format nama: [Nama Lengkap - Instansi].'
        ),
        (
            v_sched_webinar_id, 'WEB-02', 'Pembukaan Resmi & Doa Bersama',
            'Opening oleh Master of Ceremony, menyanyikan lagu Indonesia Raya, doa pembuka, dan overview tata tertib webinar.',
            '08:30:00', '08:45:00', 15, 'CEREMONY', 'Master of Ceremony LPK Dignity', 'MC & Host',
            '[{"name": "Mic MC Unmuted", "checked": true}, {"name": "Slide Tata Tertib Siap", "checked": true}]'::jsonb,
            'SCHEDULED', 2, 'MC menyapa peserta dan membakar antusiasme forum.'
        ),
        (
            v_sched_webinar_id, 'WEB-03', 'Sesi 1: Psychology of Stage Presence & Menaklukkan Demam Panggung',
            'Membongkar akar ketakutan berbicara di depan umum, teknik pernapasan diafragma 4-7-8, dan mengubah kecemasan menjadi energi wibawa.',
            '08:45:00', '10:15:00', 90, 'KEYNOTE', 'Halimatus Sa''diyah, S.I.Kom., M.I.Kom.', 'Co-Host AV',
            '[{"name": "Spotlight Pembicara Aktif", "checked": true}, {"name": "Slide PPT Pembicara Ready", "checked": true}, {"name": "Recording Cloud On", "checked": true}]'::jsonb,
            'SCHEDULED', 3, 'Transisi layar ke slide presentasi narasumber.'
        ),
        (
            v_sched_webinar_id, 'WEB-04', 'Rehat Singkat, Ice Breaking & Regang Otot',
            'Peregangan fisik terpandu agar fokus tetap prima, musik santai, dan kuis interaktif berhadiah voucher.',
            '10:15:00', '10:30:00', 15, 'BREAK', 'MC & Tim Kreatif', 'MC & AV',
            '[{"name": "Musik Santai Relaksasi", "checked": true}, {"name": "Slide Kuis Berhadiah", "checked": true}]'::jsonb,
            'SCHEDULED', 4, 'Putar audio instrumental rehat bersemangat.'
        ),
        (
            v_sched_webinar_id, 'WEB-05', 'Sesi 2: Vocal Magnetism & Struktur Presentasi Memikat',
            'Teknik artikulasi, penekanan kata kunci (inflection), The Power of Pause, serta struktur Hook - Story - Call to Action.',
            '10:30:00', '11:30:00', 60, 'KEYNOTE', 'Halimatus Sa''diyah, S.I.Kom., M.I.Kom.', 'Co-Host AV',
            '[{"name": "Screen Sharing Presentasi Sesi 2", "checked": true}, {"name": "Chat Box Terbuka untuk Respon Cepat", "checked": true}]'::jsonb,
            'SCHEDULED', 5, 'Pembicara mengajak peserta latihan olah vokal bersama.'
        ),
        (
            v_sched_webinar_id, 'WEB-06', 'Tanya Jawab Interaktif & Informasi Kelulusan E-Sertifikat',
            'Sesi tanya jawab langsung (Open Mic Q&A), pengisian link presensi akhir, dan pengumuman voucher rebate Bootcamp Solo.',
            '11:30:00', '12:00:00', 30, 'EVALUATION', 'Halimatus Sa''diyah & MC', 'Admin Finance & CS',
            '[{"name": "Link Presensi Sesi Akhir Aktif", "checked": true}, {"name": "Formulir Klaim Voucher Siap", "checked": true}]'::jsonb,
            'SCHEDULED', 6, 'Tampilkan QR Code dan link presensi akhir di layar Zoom.'
        );
    END IF;
END $$;

-- 2. SEED SCHEDULES & ITEMS UNTUK EVENT 2: BOOTCAMP OFFLINE 2 HARI (eb-solo-nov-2026)
-- Event ID: 117686af-c0b7-466c-8d52-496a79df6b6f
DO $$
DECLARE
    v_event_bootcamp_id UUID := '117686af-c0b7-466c-8d52-496a79df6b6f';
    v_sched_day1_id UUID := 'b2222222-2222-2222-2222-222222222221';
    v_sched_day2_id UUID := 'b2222222-2222-2222-2222-222222222222';
BEGIN
    IF EXISTS (SELECT 1 FROM public.events WHERE id = v_event_bootcamp_id) THEN
        
        -- Hari 1 Bootcamp
        INSERT INTO public.event_schedules (
            id, event_id, day_number, schedule_date, title, location_room, track_name, is_published
        ) VALUES (
            v_sched_day1_id,
            v_event_bootcamp_id,
            1,
            '2026-12-12',
            'Hari 1: Fondasi Panggung, Olah Vokal & Bahasa Tubuh Pemimpin',
            'Ballroom Sala View Hotel, Surakarta',
            'Grand Stage',
            true
        ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            location_room = EXCLUDED.location_room,
            is_published = true;

        -- Hari 2 Bootcamp
        INSERT INTO public.event_schedules (
            id, event_id, day_number, schedule_date, title, location_room, track_name, is_published
        ) VALUES (
            v_sched_day2_id,
            v_event_bootcamp_id,
            2,
            '2026-12-13',
            'Hari 2: The Golden Pitch Formula, Simulasi Q&A & Uji Kelulusan',
            'Ballroom Sala View Hotel, Surakarta',
            'Grand Stage',
            true
        ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            location_room = EXCLUDED.location_room,
            is_published = true;

        -- Bersihkan items lama jika ada
        DELETE FROM public.schedule_items WHERE schedule_id IN (v_sched_day1_id, v_sched_day2_id);

        -- Insert Rincian Sesi Hari 1 Bootcamp
        INSERT INTO public.schedule_items (
            schedule_id, session_code, title, description, start_time, end_time, duration_minutes,
            session_type, speaker_name, pic_team, equipment_checklist, status, sort_order, stage_cues
        ) VALUES
        (
            v_sched_day1_id, 'BC1-01', 'Registrasi Ulang, Check-In & Welcome Drink',
            'Verifikasi tiket QR code di meja depan, pembagian tas seminar kit eksklusif, buku modul, dan nametag peserta.',
            '08:00:00', '08:30:00', 30, 'CEREMONY', 'Tim Kesekretariatan Dignity', 'LO Meja Depan',
            '[{"name": "Scanner Barcode Tiket", "checked": true}, {"name": "Seminar Kit Lengkap", "checked": true}, {"name": "Nametag Peserta", "checked": true}]'::jsonb,
            'SCHEDULED', 1, 'Musik latar instrumental di foyer hotel. Sambut peserta dengan ramah.'
        ),
        (
            v_sched_day1_id, 'BC1-02', 'Opening Ceremony & Orientasi Program',
            'Sambutan Direktur LPK Dignity, perkenalan panel pelatih, dan kontrak belajar 2 hari intensif.',
            '08:30:00', '09:00:00', 30, 'CEREMONY', 'Direktur LPK Dignity & MC', 'MC & Operator AV',
            '[{"name": "Mic Wireless Utama Penuh", "checked": true}, {"name": "Slide Kontrak Belajar", "checked": true}]'::jsonb,
            'SCHEDULED', 2, 'Lampu sorot panggung utama dinyalakan penuh.'
        ),
        (
            v_sched_day1_id, 'BC1-03', 'Sesi 1: Psychology of Stage Presence & Mindset Reframing',
            'Teknik menguasai ruang, kontak mata segitiga (Triangular Eye Contact), dan mengatasi rasa gugup seketika.',
            '09:00:00', '10:30:00', 90, 'KEYNOTE', 'Lead Master Trainer LPK Dignity', 'Operator AV',
            '[{"name": "Slide Deck Clicker", "checked": true}, {"name": "Flipchart & Spidol", "checked": true}]'::jsonb,
            'SCHEDULED', 3, 'Trainer mengajak peserta berdiri dan simulasi postur tegap.'
        ),
        (
            v_sched_day1_id, 'BC1-04', 'Morning Coffee Break & Networking',
            'Rehat kopi, teh hangat, dan aneka pastry hotel bintang empat di area foyer ballroom.',
            '10:30:00', '10:45:00', 15, 'BREAK', 'Tim Konsumsi Hotel', 'LO Konsumsi',
            '[{"name": "Coffee & Tea Station Ready", "checked": true}]'::jsonb,
            'SCHEDULED', 4, 'Pengingat lonceng 5 menit sebelum sesi kembali dimulai.'
        ),
        (
            v_sched_day1_id, 'BC1-05', 'Sesi 2: Vocal Magnetism, Infleksi Nada & Bahasa Tubuh',
            'Praktik resonansi suara dada, menghilangkan kata pengisi (filler words: "eee", "aaa"), dan gestur tangan terbuka.',
            '10:45:00', '12:15:00', 90, 'PRACTICE', 'Master Trainer & Fasilitator', 'Fasilitator Kelas',
            '[{"name": "Mic Cadangan 4 Unit", "checked": true}, {"name": "Matras / Area Gerak Bersih", "checked": true}]'::jsonb,
            'SCHEDULED', 5, 'Latihan kelompok kecil 3 orang didampingi fasilitator.'
        ),
        (
            v_sched_day1_id, 'BC1-06', 'ISHOMA (Makan Siang Prasmanan & Sholat)',
            'Makan siang buffet hotel bintang empat dan ibadah sholat dzuhur berjamaah di musholla hotel.',
            '12:15:00', '13:15:00', 60, 'MEAL', 'Tim Hotel & Panitia', 'LO Ruangan',
            '[{"name": "Buffet Lunch Ready", "checked": true}, {"name": "Petunjuk Arah Musholla", "checked": true}]'::jsonb,
            'SCHEDULED', 6, 'Layar menampilkan pengingat: "Sesi siang dimulai pukul 13.15 WIB tepat."'
        ),
        (
            v_sched_day1_id, 'BC1-07', 'Sesi 3: Praktik Panggung Langsung & Rekaman Video Batch 1',
            'Masing-masing peserta tampil di atas panggung 3 menit dengan pencahayaan dan mikrofon profesional serta direkam kamera HD.',
            '13:15:00', '15:15:00', 120, 'DEMO', 'Panel Evaluator Trainer', 'Tim Dokumentasi Video',
            '[{"name": "Kamera HD Stand Tripod", "checked": true}, {"name": "Timer Display Meja Depan", "checked": true}]'::jsonb,
            'SCHEDULED', 7, 'Kamera merekam ekspresi wajah dan bahasa tubuh setiap peserta.'
        ),
        (
            v_sched_day1_id, 'BC1-08', 'Afternoon Coffee Break & Hidrasi',
            'Rehat sore, camilan tradisional, dan teh hangat untuk memulihkan energi peserta.',
            '15:15:00', '15:30:00', 15, 'BREAK', 'Tim Hotel', 'LO Konsumsi',
            '[{"name": "Snack Sore Siap", "checked": true}]'::jsonb,
            'SCHEDULED', 8, 'Musik relaksasi di dalam ruangan.'
        ),
        (
            v_sched_day1_id, 'BC1-09', 'Sesi 4: Bedah Video Penampilan & Feedback Personal 1-on-1',
            'Memutar cuplikan rekaman peserta di layar proyektor dan evaluasi langsung dari Master Trainer mengenai area pengembangan.',
            '15:30:00', '17:00:00', 90, 'EVALUATION', 'Lead Master Trainer', 'Operator Proyektor',
            '[{"name": "Playback Video ke Proyektor", "checked": true}, {"name": "Formulir Catatan Evaluasi", "checked": true}]'::jsonb,
            'SCHEDULED', 9, 'Trainer memberikan apresiasi dan arahan perbaikan tugas mandiri malam.'
        );

        -- Insert Rincian Sesi Hari 2 Bootcamp
        INSERT INTO public.schedule_items (
            schedule_id, session_code, title, description, start_time, end_time, duration_minutes,
            session_type, speaker_name, pic_team, equipment_checklist, status, sort_order, stage_cues
        ) VALUES
        (
            v_sched_day2_id, 'BC2-01', 'Energizer Pagi & Review Refleksi Hari Pertama',
            'Pemanasan vokal bersama, review jurnal latihan malam, dan penetapan target penampilan hari kedua.',
            '08:30:00', '09:00:00', 30, 'CEREMONY', 'Master of Ceremony & Trainer', 'MC',
            '[{"name": "Audio Energizer", "checked": true}]'::jsonb,
            'SCHEDULED', 1, 'Membangkitkan semangat dan rasa percaya diri peserta.'
        ),
        (
            v_sched_day2_id, 'BC2-02', 'Sesi 5: The Golden Pitch Formula & Presentasi Storytelling',
            'Menyusun kerangka presentasi berbobot menggunakan framework Problem - Impact - Solution - Call to Action.',
            '09:00:00', '10:30:00', 90, 'KEYNOTE', 'Lead Master Trainer', 'Operator AV',
            '[{"name": "Slide Framework Pitch", "checked": true}, {"name": "Lembar Kerja Storytelling", "checked": true}]'::jsonb,
            'SCHEDULED', 2, 'Peserta menyusun naskah presentasi 5 menit di lembar kerja.'
        ),
        (
            v_sched_day2_id, 'BC2-03', 'Morning Coffee Break',
            'Rehat pagi dan diskusi santai antar rekan peserta untuk bertukar masukan naskah presentasi.',
            '10:30:00', '10:45:00', 15, 'BREAK', 'Tim Hotel', 'LO Konsumsi',
            '[{"name": "Coffee Station Ready", "checked": true}]'::jsonb,
            'SCHEDULED', 3, 'Lonceng pengingat 5 menit.'
        ),
        (
            v_sched_day2_id, 'BC2-04', 'Sesi 6: Menguasai Sesi Tanya Jawab & Menghadapi Audiens Sulit',
            'Teknik menjawab pertanyaan menjebak, mengakui batasan dengan anggun, dan mempertahankan kendali panggung.',
            '10:45:00', '12:15:00', 90, 'KEYNOTE', 'Guest Speaker & Coach', 'Fasilitator',
            '[{"name": "Mic Wireless Penanya 2 Unit", "checked": true}]'::jsonb,
            'SCHEDULED', 4, 'Simulasi penanya kritis dari audiens.'
        ),
        (
            v_sched_day2_id, 'BC2-05', 'ISHOMA (Makan Siang & Ibadah)',
            'Makan siang prasmanan hari kedua hotel dan persiapan busana formal untuk ujian panggung akhir.',
            '12:15:00', '13:15:00', 60, 'MEAL', 'Tim Hotel', 'LO Ruangan',
            '[{"name": "Buffet Lunch Ready", "checked": true}]'::jsonb,
            'SCHEDULED', 5, 'Peserta bersiap untuk ujian panggung kelulusan.'
        ),
        (
            v_sched_day2_id, 'BC2-06', 'Sesi 7: Ujian Praktik Panggung Mandiri di Depan Dewan Panelis',
            'Ujian kelulusan akhir: setiap peserta mempresentasikan gagasan di depan panel penguji dan audiens penuh.',
            '13:15:00', '15:30:00', 135, 'PRACTICE', 'Dewan Penguji Sertifikasi', 'Panel Evaluator',
            '[{"name": "Kamera HD Recording", "checked": true}, {"name": "Lembar Penilaian SKKNI", "checked": true}, {"name": "Podium Resmi", "checked": true}]'::jsonb,
            'SCHEDULED', 6, 'Suasana panggung formal dan khidmat.'
        ),
        (
            v_sched_day2_id, 'BC2-07', 'Afternoon Coffee Break & Rapat Pleno Dewan Penguji',
            'Rehat sore bagi peserta sementara dewan panelis merekapitulasi nilai kelulusan sertifikasi.',
            '15:30:00', '16:00:00', 30, 'BREAK', 'Dewan Penguji & Hotel', 'Tim Sertifikasi',
            '[{"name": "Pencetakan Sertifikat Final", "checked": true}]'::jsonb,
            'SCHEDULED', 7, 'Tim administrasi menyiapkan sertifikat dan medali kelulusan.'
        ),
        (
            v_sched_day2_id, 'BC2-08', 'Upacara Kelulusan, Penyerahan Sertifikat Resmi & Foto Bersama',
            'Pengumuman peserta terbaik (Best Speaker Award), penyerahan sertifikat kelulusan berbingkai, dan sesi foto alumni.',
            '16:00:00', '17:00:00', 60, 'CEREMONY', 'Direktur LPK Dignity & Lead Trainer', 'Seluruh Panitia',
            '[{"name": "Sertifikat Berbingkai", "checked": true}, {"name": "Piala Best Speaker", "checked": true}, {"name": "Fotografer Siap di Tengah", "checked": true}]'::jsonb,
            'SCHEDULED', 8, 'Pemutaran video kilas balik 2 hari pelatihan dan penutupan resmi.'
        );

    END IF;
END $$;
