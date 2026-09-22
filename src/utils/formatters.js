/**
 * Data and currency formatting utilities
 */

export function formatRupiah(amount) {
  if (amount === undefined || amount === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function generateNextTicketNumber(count) {
  const padded = String(count + 1).padStart(3, '0');
  return `TICKET-DIGNITY-2026-${padded}`;
}

export function generateNextCertNumber(count) {
  const padded = String(count + 1).padStart(3, '0');
  return `LPK-DIGNITY/WEB-PS/XI/2026/${padded}`;
}

export function generateVoucherCode(count) {
  const padded = String(count + 1).padStart(3, '0');
  return `REBATE100K-${padded}`;
}

/**
 * Smart nominal parser that sanitizes any messy input:
 * e.g. "Rp 1.038.854", "500.000", "500rb", "100k", "1038854.00" -> 1038854
 */
export function parseRawNominal(rawInput) {
  if (typeof rawInput === 'number') return Math.round(rawInput);
  if (!rawInput) return 100000;
  
  const str = String(rawInput).trim().toLowerCase();

  // If it's a URL (like google drive link), return 0
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return 0;
  }

  // 1. Handle explicit Rp pattern: "Tiket Individu (1 Peserta) : Rp 100.000" -> 100000
  const rpMatch = str.match(/rp\.?\s*([0-9.,]+)/i);
  if (rpMatch) {
    const cleanNum = rpMatch[1].replace(/[^0-9]/g, '');
    const val = parseInt(cleanNum, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 2. Handle common package keywords
  if (str.includes('mabar') || str.includes('500.000') || str.includes('500000')) {
    return 500000;
  }
  if (str.includes('individu') || str.includes('100.000') || str.includes('100000')) {
    return 100000;
  }

  // 3. Handle shortcuts with word boundaries like "500k", "100 k", "500rb", "100 ribu"
  const kMatch = str.match(/(\d+)\s*k\b/i);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }
  const rbMatch = str.match(/(\d+)\s*(?:rb|ribu)\b/i);
  if (rbMatch) {
    return parseInt(rbMatch[1], 10) * 1000;
  }
  const jtMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (jtMatch) {
    return Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1000000);
  }

  // 4. Clean dots, commas, non-digits
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return 100000;
  
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 100000 : parsed;
}

/**
 * Classifies the package type based on nominal and text
 */
export function detectPackageType(nominal, rawCategory = '') {
  const catLower = String(rawCategory).toLowerCase();

  // 1. Promo Komunitas (11 Pax • 10+1)
  if (
    catLower.includes('komunitas') || 
    catLower.includes('10+1') || 
    catLower.includes('11 orang') || 
    catLower.includes('11 peserta') || 
    nominal >= 900000
  ) {
    if (nominal === 1000000) {
      return 'Promo Komunitas 10+1 Free (11 Peserta)';
    } else if (nominal > 1000000) {
      return `Promo Komunitas + Kode Unik (${formatRupiah(nominal)})`;
    }
    return 'Promo Komunitas 10+1 Free (11 Peserta)';
  }

  // 2. Promo Mabar (6 Pax • 5+1)
  if (
    catLower.includes('mabar') || 
    catLower.includes('5+1') || 
    catLower.includes('kolektif') || 
    catLower.includes('grup') || 
    nominal >= 450000
  ) {
    if (nominal === 500000) {
      return 'Promo Mabar 5+1 Free (6 Peserta)';
    } else if (nominal > 500000) {
      return `Promo Mabar + Kode Unik (${formatRupiah(nominal)})`;
    }
    return 'Promo Mabar 5+1 Free (6 Peserta)';
  }

  if (nominal === 100000) {
    return 'Individu (Rp 100.000)';
  }
  return `Kustom (${formatRupiah(nominal)})`;
}

/**
 * Generates sub-tickets for group packages (6 Pax Mabar or 11 Pax Komunitas)
 */
export function generateMabarSubTickets(baseTicket, totalPax = 6) {
  // Suffix A s/d K (atau s/d Z jika skala besar)
  const suffixes = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  return Array.from({ length: totalPax }, (_, i) => `${baseTicket}-${suffixes[i] || (i + 1)}`);
}
