// The vCard and CSV readers.
//
// Fixtures are synthetic and deliberately impersonal — initials, example.com — because the
// repository holds no people, invented or otherwise. What is being tested is the shape of
// the formats, not anybody's details.

import { describe, expect, it } from 'vitest';
import { parseContacts, parseCsv, parseVcard } from '../../src/lib/core/importer';

const V3 = [
  'BEGIN:VCARD', 'VERSION:3.0',
  'N:R;Q;;;', 'FN:Q R',
  'TEL;TYPE=WORK:555 0100',
  'TEL;TYPE=IPHONE:555 0101',
  'EMAIL;TYPE=INTERNET:q@example.com',
  'BDAY:1990-04-18',
  'END:VCARD'
].join('\r\n');

describe('vCard 3.0', () => {
  const [card] = parseVcard(V3);

  it('reads the formatted name and the given name separately', () => {
    expect(card?.fullName).toBe('Q R');
    expect(card?.name).toBe('Q');
  });

  it('prefers the mobile over the work number', () => {
    // someone with five numbers listed should not be reached on their fax
    expect(card?.phone).toBe('555 0101');
  });

  it('keeps the email and the birthday', () => {
    expect(card?.email).toBe('q@example.com');
    expect(card?.birthday).toBe('1990-04-18');
  });
});

describe('the formats iOS actually exports', () => {
  it('unfolds continuation lines', () => {
    const folded = [
      'BEGIN:VCARD', 'VERSION:3.0',
      'FN:A very long display name that the exporter', ' wrapped',
      'TEL:5550102',
      'END:VCARD'
    ].join('\r\n');
    expect(parseVcard(folded)[0]?.fullName).toBe('A very long display name that the exporterwrapped');
  });

  it('decodes quoted-printable from a 2.1 export', () => {
    const v21 = [
      'BEGIN:VCARD', 'VERSION:2.1',
      'FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9',
      'TEL;CELL:5550103',
      'END:VCARD'
    ].join('\r\n');
    expect(parseVcard(v21)[0]?.fullName).toBe('José');
  });

  it('reads a year-less birthday in both --MMDD and --MM-DD forms', () => {
    const mk = (b: string) =>
      parseVcard(['BEGIN:VCARD', 'VERSION:3.0', 'FN:B', 'TEL:5550104', 'BDAY:' + b, 'END:VCARD'].join('\r\n'))[0];
    expect(mk('--0814')?.birthday).toBe('--08-14');
    expect(mk('--08-14')?.birthday).toBe('--08-14');
    expect(mk('19900814')?.birthday).toBe('1990-08-14');
  });

  it('ignores a grouped property prefix', () => {
    const grouped = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:C', 'item1.TEL:5550105', 'END:VCARD'].join('\r\n');
    expect(parseVcard(grouped)[0]?.phone).toBe('5550105');
  });

  it('reads several cards from one file', () => {
    expect(parseVcard(V3 + '\r\n' + V3.replace('FN:Q R', 'FN:S T'))).toHaveLength(2);
  });
});

describe('what is deliberately dropped', () => {
  it('skips a card with no way to reach anyone', () => {
    const bare = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:D', 'END:VCARD'].join('\r\n');
    expect(parseVcard(bare)).toHaveLength(0);
  });

  it('skips a card with no name', () => {
    const anon = ['BEGIN:VCARD', 'VERSION:3.0', 'TEL:5550106', 'END:VCARD'].join('\r\n');
    expect(parseVcard(anon)).toHaveLength(0);
  });

  it('keeps no photo, however large', () => {
    const withPhoto = [
      'BEGIN:VCARD', 'VERSION:3.0', 'FN:E', 'TEL:5550107',
      'PHOTO;ENCODING=b;TYPE=JPEG:' + 'A'.repeat(500),
      'END:VCARD'
    ].join('\r\n');
    const card = parseVcard(withPhoto)[0];
    expect(JSON.stringify(card)).not.toContain('AAAA');
  });
});

describe('Google CSV', () => {
  const csv = [
    'First Name,Last Name,Phone 1 - Value,E-mail 1 - Value,Birthday',
    'Q,R,555 0108,q@example.com,--08-14',
    'S,T,555 0109,,',
    'NoContact,X,,,'
  ].join('\n');

  it('reads the rows that have something to reach', () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.fullName).toBe('Q R');
    expect(rows[0]?.phone).toBe('555 0108');
    expect(rows[1]?.email).toBeUndefined();
  });

  it('handles a quoted cell containing a comma', () => {
    const quoted = [
      'Name,Phone 1 - Value',
      '"R, Q",555 0110'
    ].join('\n');
    expect(parseCsv(quoted)[0]?.fullName).toBe('R, Q');
  });
});

describe('format detection', () => {
  it('picks the parser from the content, not the extension', () => {
    expect(parseContacts(V3, 'contacts.txt')).toHaveLength(1);
    expect(parseContacts('First Name,Phone 1 - Value\nQ,5550111', 'x.csv')).toHaveLength(1);
    expect(parseContacts('nothing useful here', 'x.txt')).toHaveLength(0);
  });
});
