import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const ticketService = {
  /**
   * Mengambil seluruh tiket untuk registrasi tertentu
   */
  async getTicketsByRegistration(registrationId) {
    if (!isSupabaseConfigured() || !registrationId) return [];

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          registration_id,
          registration_member_id,
          ticket_code,
          qr_code_payload,
          status,
          issued_at,
          sent_at,
          registration_members (
            id,
            member_role,
            ticket_suffix,
            persons (
              id,
              full_name,
              email,
              whatsapp
            )
          )
        `)
        .eq('registration_id', registrationId)
        .order('ticket_code', { ascending: true });

      if (error) {
        console.warn('Notice getTicketsByRegistration:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Error fetching tickets:', err);
      return [];
    }
  },

  /**
   * Menerbitkan tiket resmi (Idempotent):
   * - Individu: 1 tiket TICKET-DIGNITY-YYYY-XXX
   * - MABAR: hingga 6 tiket dengan suffix -A (Ketua) dan -B s/d -F (Anggota)
   */
  async issueTicketsForRegistration({ registrationId, registrant, isMabar = false, members = [] }) {
    if (!isSupabaseConfigured() || !registrationId) {
      // Fallback offline / local representation
      const baseTicket = registrant?.nomorTicket || `TICKET-DIGNITY-2026-001`;
      if (!isMabar) {
        return [{
          id: `local-tkt-${Date.now()}`,
          registration_id: registrationId,
          ticket_code: baseTicket,
          qr_code_payload: `https://dignity.id/verify?code=${baseTicket}`,
          status: 'ISSUED',
          issued_at: new Date().toISOString()
        }];
      } else {
        const suffixes = ['A', 'B', 'C', 'D', 'E', 'F'];
        return suffixes.map((sfx, idx) => ({
          id: `local-tkt-${Date.now()}-${sfx}`,
          registration_id: registrationId,
          ticket_code: `${baseTicket}-${sfx}`,
          qr_code_payload: `https://dignity.id/verify?code=${baseTicket}-${sfx}`,
          status: 'ISSUED',
          issued_at: new Date().toISOString(),
          member_role: idx === 0 ? 'LEADER' : 'MEMBER'
        }));
      }
    }

    try {
      // 1. Cek tiket yang sudah ada untuk menghindari duplikasi (Idempotensi)
      const { data: existingTickets, error: checkErr } = await supabase
        .from('tickets')
        .select('id, ticket_code, status')
        .eq('registration_id', registrationId);

      if (checkErr) throw checkErr;
      if (existingTickets && existingTickets.length > 0) {
        return existingTickets;
      }

      const baseTicketCode = registrant?.nomorTicket || `TICKET-DIGNITY-${new Date().getFullYear()}-001`;

      if (!isMabar) {
        // Penerbitan Tiket Individu (1 Registrasi = 1 Tiket)
        const qrPayload = `https://dignity.id/verify?code=${baseTicketCode}`;
        const { data: newTicket, error: insertErr } = await supabase
          .from('tickets')
          .insert({
            registration_id: registrationId,
            registration_member_id: null,
            ticket_code: baseTicketCode,
            qr_code_payload: qrPayload,
            status: 'ISSUED',
            issued_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        return [newTicket];
      } else {
        // Penerbitan Tiket Rombongan MABAR (Multi-Ticket Suffix A s/d F)
        const suffixes = ['A', 'B', 'C', 'D', 'E', 'F'];
        const ticketsToInsert = [];

        if (members && members.length > 0) {
          for (const member of members) {
            const sfx = member.ticket_suffix || 'A';
            const code = `${baseTicketCode}-${sfx}`;
            ticketsToInsert.push({
              registration_id: registrationId,
              registration_member_id: member.id || null,
              ticket_code: code,
              qr_code_payload: `https://dignity.id/verify?code=${code}`,
              status: 'ISSUED',
              issued_at: new Date().toISOString()
            });
          }
        } else {
          // Default 6 pax slots jika data member belum tersinkronisasi detail
          for (let i = 0; i < 6; i++) {
            const sfx = suffixes[i];
            const code = `${baseTicketCode}-${sfx}`;
            ticketsToInsert.push({
              registration_id: registrationId,
              registration_member_id: null,
              ticket_code: code,
              qr_code_payload: `https://dignity.id/verify?code=${code}`,
              status: 'ISSUED',
              issued_at: new Date().toISOString()
            });
          }
        }

        const { data: createdTickets, error: bulkInsertErr } = await supabase
          .from('tickets')
          .insert(ticketsToInsert)
          .select();

        if (bulkInsertErr) throw bulkInsertErr;
        return createdTickets || [];
      }
    } catch (err) {
      console.warn('Gagal menerbitkan tiket di Supabase:', err.message);
      return [];
    }
  },

  /**
   * Memperbarui status pengiriman email tiket
   */
  async markTicketSent(ticketId) {
    if (!isSupabaseConfigured() || !ticketId || String(ticketId).startsWith('local-')) {
      return true;
    }

    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Gagal update status tiket sent:', err.message);
      return null;
    }
  },

  /**
   * Validasi keabsahan tiket berdasarkan kode tiket (untuk check-in presensi)
   */
  async verifyTicket(ticketCode) {
    if (!isSupabaseConfigured() || !ticketCode) {
      return { valid: true, code: ticketCode, status: 'ISSUED' };
    }

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_code,
          status,
          issued_at,
          registrations (
            id,
            package_type,
            status,
            persons (
              id,
              full_name,
              institution
            ),
            events (
              id,
              title,
              date_start,
              venue
            )
          )
        `)
        .eq('ticket_code', ticketCode.trim())
        .single();

      if (error) {
        return { valid: false, message: 'Tiket tidak ditemukan' };
      }

      return {
        valid: data.status === 'ISSUED' || data.status === 'SENT',
        ticket: data
      };
    } catch (err) {
      return { valid: false, message: err.message };
    }
  }
};

export default ticketService;
