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

export function formatShortDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDisplayTime(dateString) {
  if (!dateString) return '08:30 WIB';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '08:30 WIB';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} WIB`;
  } catch {
    return '08:30 WIB';
  }
}

export function buildWhatsAppHelpUrl(eventTitle, adminPhone = '6289681077483') {
  const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
  const title = eventTitle || 'Pelatihan Publik Speaking LPK Indonesia Dignity';
  const text = `Halo Admin LPK Indonesia Dignity, saya ingin menanyakan informasi lebih lanjut dan panduan pendaftaran untuk acara: *${title}*. Mohon bantuannya ya, terima kasih.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
