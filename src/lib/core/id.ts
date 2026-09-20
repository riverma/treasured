// Identifiers that do not depend on being on https.
//
// `crypto.randomUUID()` is a secure-context API: on a plain http:// origin it is simply not
// there. That is not a hypothetical — a freshly deployed custom domain serves over http for
// the minutes or hours it takes the certificate to be issued, and anyone who opens the app
// in that window hits it. The failure was invisible: adding a person threw, the promise
// rejected into nothing, and the button went quiet forever.
//
// `crypto.getRandomValues()` is available in insecure contexts too, so a v4 UUID is built
// by hand when the convenience method is missing.

const HEX: string[] = Array.from({ length: 256 }, (_, i) => (i + 0x100).toString(16).slice(1));

function fromRandomValues(): string | null {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return null;
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  // version 4, variant 10xx — the two bytes RFC 4122 pins down
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = (i: number) => HEX[b[i] ?? 0] ?? '00';
  return (
    h(0) + h(1) + h(2) + h(3) + '-' +
    h(4) + h(5) + '-' +
    h(6) + h(7) + '-' +
    h(8) + h(9) + '-' +
    h(10) + h(11) + h(12) + h(13) + h(14) + h(15)
  );
}

/** Last resort. Not cryptographically strong, but an id here only has to be unique on one
 *  device, and refusing to work at all would be the worse failure. */
function fromMath(): string {
  const r = () => Math.floor(Math.random() * 256);
  const b = Array.from({ length: 16 }, r);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const s = b.map((x) => HEX[x]).join('');
  return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fromRandomValues() ?? fromMath();
}
