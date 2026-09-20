// Time helpers.
//
// The mockup wrote time as display prose — lastSeen: "2 days", history entries at
// when: '3mo', birthday: "Aug 14". That is defect 7: a seed authored as strings is frozen
// at the moment it was written, so a demo installed in a year would read "2 days" about
// something that happened a year ago. Everything here converts that prose into real
// instants, resolved against the clock at seed time, so Today always reads truthfully.

/** 'now' | '3w' | '2mo' | '4 weeks' | '2 days' — the two shapes the mockup used. */
const OFFSET = /^(\d+)\s*(d|w|mo|y|day|days|week|weeks|month|months|year|years)$/i;

const MS = {
  d: 86_400_000,
  w: 604_800_000,
  mo: 2_629_746_000, // the mean Gregorian month, so '12mo' and '1y' agree
  y: 31_556_952_000
};

function unitOf(raw: string): keyof typeof MS | null {
  const u = raw.toLowerCase();
  if (u === 'd' || u === 'day' || u === 'days') return 'd';
  if (u === 'w' || u === 'week' || u === 'weeks') return 'w';
  if (u === 'mo' || u === 'month' || u === 'months') return 'mo';
  if (u === 'y' || u === 'year' || u === 'years') return 'y';
  return null;
}

/**
 * Resolve a relative offset to an ISO timestamp.
 * Returns `now` for 'now' or anything unparseable — a seed that cannot be read is still
 * better than a seed that throws on the first screen.
 */
export function ago(offset: string, now: Date = new Date()): string {
  const text = offset.trim();
  if (!text || text.toLowerCase() === 'now') return now.toISOString();
  const m = OFFSET.exec(text);
  if (!m) return now.toISOString();
  const unit = unitOf(m[2] ?? '');
  if (!unit) return now.toISOString();
  return new Date(now.getTime() - Number(m[1] ?? 0) * MS[unit]).toISOString();
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * "Aug 14" -> "--08-14". The year-less form is the common case: you know when someone's
 * birthday falls without knowing the year they were born, and the data model should not
 * force you to invent one.
 */
export function parseBirthday(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = /^([A-Za-z]{3,})\s+(\d{1,2})$/.exec(text.trim());
  if (!m) return /^(\d{4}-)?\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null;
  const month = MONTHS.indexOf((m[1] ?? '').slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const day = Number(m[2] ?? 0);
  if (day < 1 || day > 31) return null;
  return '--' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

/**
 * "2 days ago", "3 weeks ago", "just now". The card's "Last together" line.
 * Deliberately coarse: Treasured is not a tracker, and an exact hour count would invite
 * exactly the precision-anxiety Ahimsa refuses.
 */
export function sinceText(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'not yet';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'not yet';
  const delta = Math.max(0, now.getTime() - then);

  if (delta < 2 * MS.d) return 'just now';
  const days = Math.round(delta / MS.d);
  if (days < 14) return days + ' days ago';
  const weeks = Math.round(delta / MS.w);
  if (weeks < 9) return weeks + ' weeks ago';
  const months = Math.round(delta / MS.mo);
  if (months < 18) return months + ' months ago';
  return Math.round(delta / MS.y) + ' years ago';
}

/**
 * A very short age label, for the weather strip where seven of these sit in a row.
 * "now", "3d", "2w", "4mo", "2y". Coarse on purpose: the strip is a shape to read at a
 * glance, not a table to audit.
 */
export function shortSince(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const delta = Math.max(0, now.getTime() - then);
  if (delta < MS.d) return 'now';
  if (delta < MS.w) return Math.round(delta / MS.d) + 'd';
  if (delta < MS.mo) return Math.round(delta / MS.w) + 'w';
  if (delta < MS.y) return Math.round(delta / MS.mo) + 'mo';
  return Math.round(delta / MS.y) + 'y';
}
