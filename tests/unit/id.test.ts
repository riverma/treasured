// Ids have to work on http, because a freshly deployed custom domain serves over http for
// however long the certificate takes — and `crypto.randomUUID` is a secure-context API.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../../src/lib/core/id';

const realRandomUUID = globalThis.crypto?.randomUUID;
const realGetRandomValues = globalThis.crypto?.getRandomValues;

afterEach(() => {
  if (realRandomUUID) Object.defineProperty(globalThis.crypto, 'randomUUID', { value: realRandomUUID, configurable: true });
  if (realGetRandomValues) Object.defineProperty(globalThis.crypto, 'getRandomValues', { value: realGetRandomValues, configurable: true });
  vi.restoreAllMocks();
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('with crypto.randomUUID (a secure context)', () => {
  it('produces a v4 uuid', () => {
    expect(newId()).toMatch(UUID_V4);
  });
});

describe('without crypto.randomUUID (plain http)', () => {
  it('still produces a valid v4 uuid, rather than throwing', () => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    expect(() => newId()).not.toThrow();
    expect(newId()).toMatch(UUID_V4);
  });

  it('is still unique across many calls', () => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    const seen = new Set(Array.from({ length: 2000 }, () => newId()));
    expect(seen.size).toBe(2000);
  });
});

describe('without any crypto at all', () => {
  it('falls back rather than refusing to work', () => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    Object.defineProperty(globalThis.crypto, 'getRandomValues', { value: undefined, configurable: true });
    expect(newId()).toMatch(UUID_V4);
    const seen = new Set(Array.from({ length: 500 }, () => newId()));
    expect(seen.size).toBe(500);
  });
});
