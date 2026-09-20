// Reading contacts out of a file, because the web cannot read the address book.
//
// Safari has no Contact Picker, so the only honest route is a file the person exports and
// hands over deliberately. Everything here runs in the browser: the file is never uploaded,
// and connect-src 'none' makes that structural rather than a promise.
//
// Hand-written rather than a dependency: `vcard4` is strict 4.0 only, and iOS exports 3.0,
// sometimes 2.1. A parser that rejects the file the user actually has is worse than none.

export interface Candidate {
  /** Stable within one parse, so the review list can track selections. */
  key: string;
  fullName: string;
  name: string;
  phone?: string;
  email?: string;
  /** 'YYYY-MM-DD' or '--MM-DD'. */
  birthday?: string;
}

/** Continuation lines begin with a space or tab and belong to the line before. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** 2.1 exports encode non-ASCII as =C3=A9 and wrap with a trailing `=`. */
function decodeQuotedPrintable(value: string): string {
  const joined = value.replace(/=\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    if (joined[i] === '=' && i + 2 < joined.length) {
      const hex = joined.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) { bytes.push(parseInt(hex, 16)); i += 2; continue; }
    }
    bytes.push(joined.charCodeAt(i));
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return joined;
  }
}

interface Field { name: string; params: string[]; value: string }

function parseLine(line: string): Field | null {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  let value = line.slice(colon + 1);
  const [nameRaw, ...params] = head.split(';');
  const upper = params.map((p) => p.toUpperCase());
  if (upper.some((p) => p.includes('QUOTED-PRINTABLE'))) value = decodeQuotedPrintable(value);
  // a grouped property looks like item1.TEL — the group prefix carries no meaning here
  const name = (nameRaw ?? '').split('.').pop()?.toUpperCase() ?? '';
  return { name, params: upper, value: value.replace(/\\,/g, ',').replace(/\;/g, ';').trim() };
}

/** Which number to keep when someone lists five. A mobile beats a fax, every time. */
const TEL_RANK = ['IPHONE', 'CELL', 'MOBILE', 'MAIN', 'HOME', 'WORK'];

function telScore(params: string[]): number {
  const joined = params.join(',');
  for (let i = 0; i < TEL_RANK.length; i++) {
    if (joined.includes(TEL_RANK[i] ?? '')) return TEL_RANK.length - i;
  }
  return 0;
}

function normaliseBirthday(raw: string): string | undefined {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{8}$/.test(v)) return v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8);
  // year-less forms: --MMDD and --MM-DD
  const m = /^--(\d{2})-?(\d{2})$/.exec(v);
  if (m) return '--' + m[1] + '-' + m[2];
  return undefined;
}

export function parseVcard(text: string): Candidate[] {
  const out: Candidate[] = [];
  let current: Partial<Candidate> & { telScore?: number } | null = null;
  let n = 0;

  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VCARD')) { current = {}; continue; }

    if (upper.startsWith('END:VCARD')) {
      if (current) {
        const fullName = (current.fullName ?? '').trim();
        // A card with no name and no way to reach anyone is not a contact.
        if (fullName && (current.phone || current.email)) {
          out.push({
            key: 'v' + n++,
            fullName,
            name: current.name || fullName.split(' ')[0] || fullName,
            phone: current.phone,
            email: current.email,
            birthday: current.birthday
          });
        }
      }
      current = null;
      continue;
    }

    if (!current) continue;
    const field = parseLine(line);
    if (!field || !field.value) continue;

    switch (field.name) {
      case 'FN':
        current.fullName = field.value;
        break;
      case 'N': {
        // family;given;middle;prefix;suffix
        const [family = '', given = ''] = field.value.split(';');
        if (given) current.name = given.trim();
        if (!current.fullName) current.fullName = [given, family].filter(Boolean).join(' ').trim();
        break;
      }
      case 'TEL': {
        const score = telScore(field.params);
        if (!current.phone || score > (current.telScore ?? -1)) {
          current.phone = field.value;
          current.telScore = score;
        }
        break;
      }
      case 'EMAIL':
        if (!current.email) current.email = field.value;
        break;
      case 'BDAY':
        current.birthday = normaliseBirthday(field.value);
        break;
      default:
        // PHOTO and everything else is ignored on purpose: we keep the least we can.
        break;
    }
  }

  return out;
}

/** A CSV row splitter that understands quotes and doubled quotes inside them. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { cells.push(cell); cell = ''; }
    else cell += c;
  }
  cells.push(cell);
  return cells;
}

/** Google Contacts CSV. Column names differ between exports, so match loosely. */
export function parseCsv(text: string): Candidate[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = splitRow(lines[0] ?? '').map((h) => h.trim().toLowerCase());
  const find = (...needles: string[]) =>
    header.findIndex((h) => needles.some((n) => h === n || h.startsWith(n)));

  const iFirst = find('first name', 'given name');
  const iLast = find('last name', 'family name');
  const iFull = find('name', 'display name');
  const iPhone = find('phone 1 - value', 'phone');
  const iMail = find('e-mail 1 - value', 'email 1 - value', 'e-mail', 'email');
  const iBday = find('birthday');

  const out: Candidate[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitRow(lines[r] ?? '');
    const at = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '');
    const first = at(iFirst);
    const last = at(iLast);
    const fullName = [first, last].filter(Boolean).join(' ') || at(iFull);
    const phone = at(iPhone) || undefined;
    const email = at(iMail) || undefined;
    if (!fullName || (!phone && !email)) continue;
    out.push({
      key: 'c' + out.length,
      fullName,
      name: first || fullName.split(' ')[0] || fullName,
      phone,
      email,
      birthday: iBday >= 0 ? normaliseBirthday(at(iBday)) : undefined
    });
  }
  return out;
}

/** Pick the parser from the file, not from the extension alone. */
export function parseContacts(text: string, filename = ''): Candidate[] {
  if (/BEGIN:VCARD/i.test(text)) return parseVcard(text);
  if (/\.csv$/i.test(filename) || text.includes(',')) return parseCsv(text);
  return [];
}
