import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { isValidUuid } from '../utils/normalizers';

export const attendanceService = {
  /**
   * Mengambil seluruh daftar presensi untuk event tertentu
   */
  async getAttendancesByEvent(eventId) {
    if (!isSupabaseConfigured() || !eventId || !isValidUuid(eventId)) return [];

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select(`
          id,
          event_id,
          person_id,
          session_type,
          zoom_display_name,
          screenshot_url,
          drive_file_id,
          attended_at,
          join_time,
          leave_time,
          duration_minutes,
          status,
          notes,
          checked_by,
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
        .order('attended_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Notice getAttendancesByEvent:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Error fetching attendances:', err);
      return [];
    }
  },

  /**
   * Check-in peserta berdasarkan kode tiket atau person_id
   */
  async checkInParticipant({ eventId, ticketCode, personId = null, durationMinutes = 90 }) {
    const { data: { user } } = await supabase.auth.getUser();

    let targetPersonId = personId;
    let participantName = '';

    // Jika diberikan ticketCode, cari person_id terkait
    if (!targetPersonId && ticketCode) {
      const { data: ticketData, error: tktErr } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_code,
          registration_id,
          registration_member_id,
          registrations (
            person_id,
            persons (
              id,
              full_name
            )
          ),
          registration_members (
            person_id,
            persons (
              id,
              full_name
            )
          )
        `)
        .eq('ticket_code', ticketCode.trim())
        .single();

      if (tktErr || !ticketData) {
        throw new Error(`Tiket "${ticketCode}" tidak ditemukan di database.`);
      }

      // Jika tiket MABAR, ambil person_id dari registration_members
      if (ticketData.registration_members?.person_id) {
        targetPersonId = ticketData.registration_members.person_id;
        participantName = ticketData.registration_members.persons?.full_name;
      } else {
        targetPersonId = ticketData.registrations?.person_id;
        participantName = ticketData.registrations?.persons?.full_name;
      }
    }

    if (!targetPersonId) {
      throw new Error('Identitas person_id tidak valid untuk presensi.');
    }

    // Tentukan status kelayakan berdasarkan durasi kehadiran (default threshold: >= 60 menit)
    const isEligible = durationMinutes >= 60;
    const finalStatus = isEligible ? 'CERTIFICATE_ELIGIBLE' : 'ATTENDED';

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendances')
      .upsert({
        event_id: eventId,
        person_id: targetPersonId,
        join_time: now,
        duration_minutes: durationMinutes,
        status: finalStatus,
        checked_by: user?.id || null
      }, {
        onConflict: 'event_id,person_id'
      })
      .select(`
        id,
        event_id,
        person_id,
        join_time,
        duration_minutes,
        status,
        persons (
          id,
          full_name,
          email,
          institution
        )
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      participantName: participantName || data.persons?.full_name
    };
  },

  /**
   * Memperbarui status presensi secara manual oleh admin
   */
  async updateStatus(attendanceId, nextStatus, durationMinutes = null) {
    const updates = { status: nextStatus };
    if (durationMinutes !== null) {
      updates.duration_minutes = durationMinutes;
    }

    const { data, error } = await supabase
      .from('attendances')
      .update(updates)
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Menandai kelayakan sertifikat secara massal (Batch Mark Eligible)
   */
  async batchMarkEligible(attendanceIds) {
    if (!attendanceIds || attendanceIds.length === 0) return [];

    const { data, error } = await supabase
      .from('attendances')
      .update({ status: 'CERTIFICATE_ELIGIBLE' })
      .in('id', attendanceIds)
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Menghapus baris presensi dari Supabase
   */
  async deleteAttendance(attendanceId) {
    if (!attendanceId) throw new Error('attendanceId wajib diisi');

    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
    return true;
  },

  /**
   * Presensi mandiri peserta via web publik (dengan anti-fraud check di PostgreSQL Supabase)
   */
  async submitParticipantAttendance({ eventId, email, sessionType, zoomDisplayName, screenshotUrl, driveFileId = null }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Database Supabase belum terkonfigurasi.');
    }

    const { data, error } = await supabase.rpc('submit_participant_attendance', {
      p_event_id: eventId,
      p_email: email,
      p_session_type: sessionType,
      p_zoom_display_name: zoomDisplayName || '',
      p_screenshot_url: screenshotUrl || '',
      p_drive_file_id: driveFileId
    });

    if (error) {
      throw new Error(error.message || 'Gagal memproses presensi');
    }

    return data;
  }
};

export default attendanceService;
