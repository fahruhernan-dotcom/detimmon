/**
 * Name, Email, and WhatsApp Normalization Utilities
 * Formatted specifically for Formal A4 E-Certificates and Automated Email Blast
 * LPK Indonesia Dignity & KLTC®
 */

// Canonical dictionary for academic degrees & professional titles in Indonesia
export function isValidUuid(val) {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

const DEGREE_DICTIONARY = {
  // Sarjana (Bachelor)
  's.kom': 'S.Kom.',
  'skom': 'S.Kom.',
  's.pd': 'S.Pd.',
  'spd': 'S.Pd.',
  's.t': 'S.T.',
  'st': 'S.T.',
  's.e': 'S.E.',
  'se': 'S.E.',
  's.ked': 'S.Ked.',
  'sked': 'S.Ked.',
  's.sos': 'S.Sos.',
  'ssos': 'S.Sos.',
  's.i.kom': 'S.I.Kom.',
  'sikom': 'S.I.Kom.',
  's.h': 'S.H.',
  'sh': 'S.H.',
  's.farm': 'S.Farm.',
  'sfarm': 'S.Farm.',
  's.psi': 'S.Psi.',
  'spsi': 'S.Psi.',
  's.si': 'S.Si.',
  'ssi': 'S.Si.',
  's.sn': 'S.Sn.',
  'ssn': 'S.Sn.',
  's.pt': 'S.Pt.',
  'spt': 'S.Pt.',
  's.p': 'S.P.',
  'sp': 'S.P.',
  's.gz': 'S.Gz.',
  'sgz': 'S.Gz.',
  's.kep': 'S.Kep.',
  'skep': 'S.Kep.',
  's.tr.kom': 'S.Tr.Kom.',

  // Magister (Master)
  'm.kom': 'M.Kom.',
  'mkom': 'M.Kom.',
  'm.pd': 'M.Pd.',
  'mpd': 'M.Pd.',
  'm.m': 'M.M.',
  'mm': 'M.M.',
  'm.t': 'M.T.',
  'mt': 'M.T.',
  'm.i.kom': 'M.I.Kom.',
  'mikom': 'M.I.Kom.',
  'm.h': 'M.H.',
  'mh': 'M.H.',
  'm.sc': 'M.Sc.',
  'msc': 'M.Sc.',
  'm.si': 'M.Si.',
  'msi': 'M.Si.',
  'm.kes': 'M.Kes.',
  'mkes': 'M.Kes.',
  'm.biomed': 'M.Biomed.',
  'mbiomed': 'M.Biomed.',
  'mba': 'MBA',
  'm.b.a': 'MBA',

  // Doktoral, Profesi & Spesialis (Doctorate, Profession & Specialist)
  'ph.d': 'Ph.D.',
  'phd': 'Ph.D.',
  'b.sc': 'B.Sc.',
  'bsc': 'B.Sc.',
  'apt': 'Apt.',
  'apt.': 'Apt.',
  'ners': 'Ners',
  'ns': 'Ns.',
  'sp.og': 'Sp.OG',
  'spog': 'Sp.OG',
  'sp.pd': 'Sp.PD',
  'sppd': 'Sp.PD',
  'sp.a': 'Sp.A',
  'spa': 'Sp.A',
  'sp.b': 'Sp.B',
  'spb': 'Sp.B',
  'sp.jp': 'Sp.JP',
  'spjp': 'Sp.JP',
  'sp.m': 'Sp.M',
  'spm': 'Sp.M',
  'sp.tht': 'Sp.THT',
  'sptht': 'Sp.THT',
  'sp.kk': 'Sp.KK',
  'spkk': 'Sp.KK',
  'sp.an': 'Sp.An',
  'span': 'Sp.An'
};

// Title prefixes
const PREFIX_TITLES = {
  'dr.': 'dr.',
  'dr': 'dr.',
  'drg.': 'drg.',
  'drg': 'drg.',
  'drh.': 'drh.',
  'drh': 'drh.',
  'prof.': 'Prof.',
  'prof': 'Prof.',
  'ir.': 'Ir.',
  'ir': 'Ir.',
  'h.': 'H.',
  'hj.': 'Hj.'
};

// Known institutional & professional acronyms to preserve in all-caps
const KNOWN_ACRONYMS = new Set([
  'LPK', 'KLTC', 'UNS', 'BCA', 'BRI', 'BNI', 'DKI', 'UGM', 'UI', 'ITB', 'IPB', 'ITS', 
  'UNDIP', 'UNAIR', 'UB', 'UNY', 'UNNES', 'MBA', 'CEO', 'CFO', 'COO', 'CTO'
]);

/**
 * Capitalizes a single word into formal Title Case, preserving recognized institutional acronyms
 */
function capitalizeWord(word) {
  if (!word) return '';
  const upper = word.toUpperCase();
  if (KNOWN_ACRONYMS.has(upper)) {
    return upper;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normalizes Full Name for Official Certificate Canvas & E-Ticket
 * - Converts all-caps or all-lowercase to proper Title Case
 * - Standardizes Indonesian academic degrees (e.g., S.Kom., M.Pd., S.T.)
 * - Inserts clean comma separation before post-nominal degrees
 * - Collapses extra whitespace
 */
export function normalizeCertificateName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  
  // Clean unwanted hidden/zero-width chars and collapse spaces
  let cleaned = rawName
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Separate by comma if already comma-separated (e.g., "Nama, Gelar1, Gelar2")
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length > 1) {
    // Part 0 is main name
    const mainName = normalizeMainName(parts[0]);
    // Subsequent parts are degrees
    const degrees = parts.slice(1).map(deg => normalizeDegreeToken(deg)).filter(Boolean);
    return degrees.length > 0 ? `${mainName}, ${degrees.join(', ')}` : mainName;
  }

  // Not comma-separated: Check tokens from back to find potential degrees
  const tokens = cleaned.split(' ');
  const nameTokens = [];
  const degreeTokens = [];

  // Check from end backwards
  let checkingDegrees = true;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i].trim();
    const tokenLower = token.toLowerCase().replace(/[.,]/g, '');
    const tokenWithDot = token.toLowerCase();

    if (checkingDegrees && (DEGREE_DICTIONARY[tokenLower] || DEGREE_DICTIONARY[tokenWithDot])) {
      const canonical = DEGREE_DICTIONARY[tokenLower] || DEGREE_DICTIONARY[tokenWithDot];
      degreeTokens.unshift(canonical);
    } else {
      checkingDegrees = false;
      nameTokens.unshift(token);
    }
  }

  const normalizedMain = normalizeMainName(nameTokens.join(' '));
  if (degreeTokens.length > 0) {
    return `${normalizedMain}, ${degreeTokens.join(', ')}`;
  }

  return normalizedMain;
}

/**
 * Normalizes the core name (before degrees), handling prefixes like dr., Prof., H.
 */
function normalizeMainName(str) {
  if (!str) return '';
  const words = str.split(' ').filter(Boolean);
  return words.map((w, idx) => {
    const lower = w.toLowerCase();
    // Check prefix titles on the first word
    if (idx === 0 && PREFIX_TITLES[lower]) {
      return PREFIX_TITLES[lower];
    }
    // Check degree dictionary in case a degree is inside
    if (DEGREE_DICTIONARY[lower]) {
      return DEGREE_DICTIONARY[lower];
    }
    return capitalizeWord(w);
  }).join(' ');
}

/**
 * Normalizes a single degree token
 */
function normalizeDegreeToken(deg) {
  if (!deg) return '';
  const lower = deg.toLowerCase().trim();
  const cleanKey = lower.replace(/[.,]/g, '');
  if (DEGREE_DICTIONARY[cleanKey]) {
    return DEGREE_DICTIONARY[cleanKey];
  }
  if (DEGREE_DICTIONARY[lower]) {
    return DEGREE_DICTIONARY[lower];
  }
  // Fallback: Title case the degree
  return deg.split('.').map(part => capitalizeWord(part.trim())).join('.');
}

/**
 * Normalizes Email Addresses for Gmail API Dispatch
 * - Converts to lowercase
 * - Strips zero-width and invisible characters
 * - Fixes common domain typos (@gmai.com, @gamil.com, etc.)
 */
export function normalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return '';

  let email = rawEmail
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

  // Fix common domain typos
  email = email
    .replace(/@gmai\.com$/i, '@gmail.com')
    .replace(/@gamil\.com$/i, '@gmail.com')
    .replace(/@gmail\.con$/i, '@gmail.com')
    .replace(/@gmaill\.com$/i, '@gmail.com')
    .replace(/@gmial\.com$/i, '@gmail.com')
    .replace(/@yaho\.com$/i, '@yahoo.com')
    .replace(/@yahoo\.con$/i, '@yahoo.com')
    .replace(/@yhaoo\.com$/i, '@yahoo.com');

  return email;
}

/**
 * Normalizes WhatsApp Phone Number for International Standard
 * - Removes non-digits (+, -, spaces, dots)
 * - Converts 08... or 8... to 628...
 */
export function normalizeWhatsApp(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits;
}

/**
 * Masks an email for privacy compliance (UU PDP)
 * Example: fahruhernansakti@gmail.com -> f***i@gmail.com
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '-';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * Masks a phone number for privacy compliance
 * Example: 6282133859391 -> 0821-****-9391
 */
export function maskWhatsApp(phone) {
  if (!phone) return '-';
  const clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length < 8) return '****';
  const localFormat = clean.startsWith('62') ? '0' + clean.slice(2) : clean;
  if (localFormat.length >= 10) {
    const prefix = localFormat.slice(0, 4);
    const suffix = localFormat.slice(-4);
    return `${prefix}-****-${suffix}`;
  }
  return `${localFormat.slice(0, 3)}****${localFormat.slice(-2)}`;
}

