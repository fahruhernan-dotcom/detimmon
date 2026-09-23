/**
 * landingUtils.js
 * Utility helper functions for the accessible public landing page.
 */

export function formatDisplayDate(dateString) {
  if (!dateString) return 'Tanggal Akan Diumumkan';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format rentang tanggal acara secara cerdas dan bebas duplikasi.
 * Jika date_start dan date_end berada pada hari kalender yang sama,
 * hanya kembalikan 1 tanggal tunggal (e.g. "Sabtu, 14 November 2026").
 * Jika rentang multi-hari dalam bulan yang sama: "14 – 15 November 2026".
 * Jika rentang lintas bulan: "30 November – 1 Desember 2026".
 */
export function formatEventDateRange(dateStart, dateEnd) {
  if (!dateStart) return 'Tanggal Akan Diumumkan';
  try {
    const dStart = new Date(dateStart);
    if (isNaN(dStart.getTime())) return dateStart;

    if (!dateEnd) {
      return formatDisplayDate(dateStart);
    }

    const dEnd = new Date(dateEnd);
    if (isNaN(dEnd.getTime())) return formatDisplayDate(dateStart);

    // Cek kesamaan tanggal kalender (Tahun, Bulan, Hari)
    const sameYear = dStart.getFullYear() === dEnd.getFullYear();
    const sameMonth = dStart.getMonth() === dEnd.getMonth();
    const sameDay = dStart.getDate() === dEnd.getDate();

    if (sameYear && sameMonth && sameDay) {
      return formatDisplayDate(dateStart);
    }

    const weekdayStart = dStart.toLocaleDateString('id-ID', { weekday: 'long' });
    const weekdayEnd = dEnd.toLocaleDateString('id-ID', { weekday: 'long' });
    const monthStart = dStart.toLocaleDateString('id-ID', { month: 'long' });
    const monthEnd = dEnd.toLocaleDateString('id-ID', { month: 'long' });
    const yearStart = dStart.getFullYear();
    const yearEnd = dEnd.getFullYear();

    if (sameYear && sameMonth) {
      return `${weekdayStart} – ${weekdayEnd}, ${dStart.getDate()} – ${dEnd.getDate()} ${monthStart} ${yearStart}`;
    }

    if (sameYear) {
      return `${dStart.getDate()} ${monthStart} – ${dEnd.getDate()} ${monthEnd} ${yearStart}`;
    }

    return `${dStart.getDate()} ${monthStart} ${yearStart} – ${dEnd.getDate()} ${monthEnd} ${yearEnd}`;
  } catch {
    return formatDisplayDate(dateStart);
  }
}

export function formatDisplayTime(dateString) {
  if (!dateString) return '08:30 WIB';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '08:30 WIB';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
  } catch {
    return '08:30 WIB';
  }
}

export function formatDisplayTimeRange(dateStart, dateEnd) {
  const startTime = formatDisplayTime(dateStart);
  return `${startTime.replace(' WIB', '')} WIB – Selesai`;
}

export function formatDisplayDateTime(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const datePart = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timePart = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':') + ' WIB';
    return `${datePart}, pukul ${timePart}`;
  } catch {
    return dateString;
  }
}

export function buildWhatsAppHelpUrl(eventTitle, adminPhone = '') {
  const phone = adminPhone || import.meta.env.VITE_ADMIN_WHATSAPP || '6289681077483';
  const cleanPhone = phone.replace(/[^0-9]/g, '') || '6289681077483';
  const title = eventTitle || 'Pelatihan Publik Speaking LPK Indonesia Dignity';
  const text = `Halo Admin LPK Indonesia Dignity, saya ingin menanyakan informasi lebih lanjut dan panduan pendaftaran untuk acara: *${title}*. Mohon bantuannya ya, terima kasih.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
