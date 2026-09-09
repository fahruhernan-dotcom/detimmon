import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Pembersih dan penstandar nama sertifikat resmi:
 * - Menghilangkan spasi berlebih
 * - Mengubah nama utama menjadi Title Case
 * - Menjaga gelar akademik/profesi (S.H., S.Kom, M.Pd, M.M., Dr., dsb.) tetap kapital
 */
export function normalizeCertificateName(rawName) {
  if (!rawName) return '';

  const clean = rawName.trim().replace(/\s+/g, ' ');
  const parts = clean.split(',');
  const mainName = parts[0].trim();

  // Ubah nama dasar ke Title Case
  const formattedMain = mainName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  if (parts.length === 1) {
    return formattedMain;
  }

  // Format ulang bagian gelar
  const degrees = parts.slice(1).map(deg => deg.trim()).join(', ');
  return `${formattedMain}, ${degrees}`;
}

/**
 * Generator nomor seri sertifikat resmi LPK Indonesia Dignity:
 * Format baku: LPK-DIGNITY/CERT/YYYY/SERIAL (contoh: LPK-DIGNITY/CERT/2026/000184)
 */
export function generateCertificateNumber({ year = new Date().getFullYear(), serial = 1 }) {
  const padded = String(serial).padStart(6, '0');
  return `LPK-DIGNITY/CERT/${year}/${padded}`;
}

/**
 * Generator kode verifikasi publik aman URL (tamper-proof)
 * Format: dgn-xxxxxxxx (8 karakter heksadesimal/alfanumerik)
 */
export function generateVerificationCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `dgn-${rand}`;
}

/**
 * Generator kode voucher rebate potongan harga
 */
export function generateVoucherCode(serial = 1) {
  const padded = String(serial).padStart(3, '0');
  return `REBATE100K-${padded}`;
}

export const certificateService = {
  normalizeName: normalizeCertificateName,
  generateCertificateNumber,
  generateVerificationCode,
  generateVoucherCode,

  /**
   * Mengambil data sertifikat berdasarkan event
   */
  async getCertificatesByEvent(eventId) {
    if (!isSupabaseConfigured() || !eventId) return [];

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          event_id,
          person_id,
          certificate_no,
          verification_code,
          normalized_name,
          drive_file_id,
          status,
          issued_at,
          sent_at,
          persons (
            id,
            full_name,
            email,
            whatsapp,
            institution,
            city
          )
        `)
        .eq('event_id', eventId)
        .order('issued_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Notice getCertificatesByEvent:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Error getCertificatesByEvent:', err);
      return [];
    }
  },

  /**
   * Mengambil sertifikat seorang peserta spesifik pada event tertentu
   */
  async getCertificateByPerson(eventId, personId) {
    if (!isSupabaseConfigured() || !eventId || !personId) return null;

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_no,
          verification_code,
          normalized_name,
          drive_file_id,
          status,
          issued_at,
          sent_at
        `)
        .eq('event_id', eventId)
        .eq('person_id', personId)
        .maybeSingle();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Menerbitkan satu sertifikat resmi (idempotent: jika sudah ada, return data lama)
   */
  async issueCertificate({ eventId, personId, rawName, forceReissue = false }) {
    if (!eventId || !personId) {
      throw new Error('eventId dan personId wajib diisi untuk menerbitkan sertifikat.');
    }

    // 1. Cek apakah sertifikat sudah pernah diterbitkan
    const existing = await this.getCertificateByPerson(eventId, personId);
    if (existing && !forceReissue) {
      return existing;
    }

    // 2. Hitung nomor seri berikutnya
    let serial = 1;
    try {
      const { count } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      serial = (count || 0) + 1;
    } catch {
      serial = Math.floor(1000 + Math.random() * 9000);
    }

    const certNo = generateCertificateNumber({ serial });
    const verifCode = generateVerificationCode();
    const cleanName = normalizeCertificateName(rawName);
    const now = new Date().toISOString();

    // 3. Upsert ke tabel certificates
    const { data: certData, error: certErr } = await supabase
      .from('certificates')
      .upsert({
        event_id: eventId,
        person_id: personId,
        certificate_no: certNo,
        verification_code: verifCode,
        normalized_name: cleanName,
        status: 'GENERATED',
        issued_at: now
      }, {
        onConflict: 'event_id,person_id'
      })
      .select()
      .single();

    if (certErr) throw certErr;

    // 4. Buat voucher rebate terhubung (Rp 100.000) jika belum ada
    try {
      const voucherCode = generateVoucherCode(serial);
      const validUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 hari

      await supabase
        .from('vouchers')
        .upsert({
          event_id: eventId,
          person_id: personId,
          code: voucherCode,
          discount_amount: 100000.00,
          valid_until: validUntil,
          status: 'ACTIVE'
        }, {
          onConflict: 'event_id,person_id'
        });
    } catch (vErr) {
      console.warn('Notice issuing voucher:', vErr.message);
    }

    return certData;
  },

  /**
   * Penerbitan massal sertifikat untuk seluruh peserta yang dinyatakan berhak
   */
  async batchIssueCertificates({ eventId, eligibleList = [] }) {
    if (!eventId || !eligibleList.length) return [];

    const issued = [];
    for (const item of eligibleList) {
      try {
        const personId = item.person_id || item.personId || item.id;
        const rawName = item.nama || item.persons?.full_name || 'Peserta';
        
        const cert = await this.issueCertificate({
          eventId,
          personId,
          rawName
        });
        issued.push({ ...item, certificate: cert });
      } catch (err) {
        console.warn(`Gagal terbitkan sertifikat untuk ${item.nama}:`, err.message);
      }
    }
    return issued;
  },

  /**
   * Tandai sertifikat telah berhasil dikirim via email
   */
  async markCertificateSent({ certificateId, driveFileId = null }) {
    if (!certificateId) return null;

    const updates = {
      status: 'SENT',
      sent_at: new Date().toISOString()
    };
    if (driveFileId) {
      updates.drive_file_id = driveFileId;
    }

    const { data, error } = await supabase
      .from('certificates')
      .update(updates)
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Verifikasi sertifikat publik via kode verifikasi QR (tanpa perlu login)
   * Menggunakan RPC khusus verify_certificate_public untuk mencegah data scraping tabel penuh.
   */
  async verifyByCode(verificationCode) {
    if (!verificationCode) return null;
    const cleanCode = verificationCode.trim();

    // 1. Prioritas: Verifikasi aman via RPC verify_certificate_public (anti-scraping)
    try {
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('verify_certificate_public', { p_code: cleanCode });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        const item = rpcData[0];
        return {
          id: item.id,
          certificate_no: item.certificate_no,
          verification_code: item.verification_code,
          normalized_name: item.normalized_name,
          status: item.status,
          issued_at: item.issued_at,
          events: {
            id: item.event_id,
            title: item.event_title,
            event_type: item.event_type,
            date_start: item.date_start,
            venue: item.venue
          }
        };
      }
    } catch (e) {
      console.warn('RPC verify_certificate_public notice:', e?.message);
    }

    // 2. Fallback query langsung jika migrasi RPC belum diaplikasikan
    const { data, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_no,
        verification_code,
        normalized_name,
        status,
        issued_at,
        events (
          id,
          title,
          event_type,
          date_start,
          venue
        )
      `)
      .eq('verification_code', cleanCode)
      .maybeSingle();

    if (error) {
      console.warn('Notice verifyByCode fallback:', error.message);
      return null;
    }
    return data;
  }
};

export default certificateService;
