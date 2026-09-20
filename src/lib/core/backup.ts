// Your data, as a file you own.
//
// On the web this is not a nicety. Safari evicts storage for sites that are not installed
// to the home screen after about seven days of no visits, and an app you open once a
// fortnight is exactly the app that gets collected. Export is the only durable backup there
// is, and it is also simply the right answer to "is this mine?".

import type { AppData, Person, Ring, RingMember } from './types';

const FORMAT = 'treasured.backup';
const VERSION = 1;

export interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  app: string;
  data: AppData;
}

export function buildBackup(data: AppData, appVersion: string, now = new Date()): string {
  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: now.toISOString(),
    app: appVersion,
    data
  };
  // Indented on purpose: a backup you cannot read in a text editor is a backup you have to
  // trust rather than check.
  return JSON.stringify(backup, null, 2);
}

export function backupFilename(now = new Date()): string {
  return 'treasured-' + now.toISOString().slice(0, 10) + '.json';
}

function isPerson(v: unknown): v is Person {
  const p = v as Person;
  return !!p && typeof p.id === 'string' && typeof p.fullName === 'string' && !!p.palette;
}

function isRing(v: unknown): v is Ring {
  const r = v as Ring;
  return !!r && typeof r.id === 'string' && typeof r.name === 'string';
}

function isMember(v: unknown): v is RingMember {
  const m = v as RingMember;
  return !!m && typeof m.ringId === 'string' && typeof m.personId === 'string';
}

export class BackupError extends Error {}

/**
 * Read a backup back.
 *
 * Deliberately forgiving about everything except the shape of a person: a file that has
 * been through a text editor, or written by a newer version, should still restore what it
 * can rather than refuse wholesale. Rows that are not recognisable are dropped, not
 * guessed at — and `loadAll` normalises whatever survives on the way back out of storage.
 */
export function parseBackup(text: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not a Treasured backup.');
  }

  const b = raw as Partial<Backup>;
  if (!b || b.format !== FORMAT || !b.data) {
    throw new BackupError('That file is not a Treasured backup.');
  }
  if (typeof b.version === 'number' && b.version > VERSION) {
    throw new BackupError('That backup was written by a newer version of Treasured.');
  }

  const d = b.data as Partial<AppData>;
  const people = Array.isArray(d.people) ? d.people.filter(isPerson) : [];
  const rings = Array.isArray(d.rings) ? d.rings.filter(isRing) : [];

  const personIds = new Set(people.map((p) => p.id));
  const ringIds = new Set(rings.map((r) => r.id));
  const ringMembers = (Array.isArray(d.ringMembers) ? d.ringMembers.filter(isMember) : [])
    .filter((m) => personIds.has(m.personId) && ringIds.has(m.ringId));

  if (people.length === 0 && rings.length === 0) {
    throw new BackupError('That backup is empty.');
  }

  return {
    people,
    rings,
    ringMembers,
    activeRingId: typeof d.activeRingId === 'string' && ringIds.has(d.activeRingId)
      ? d.activeRingId
      : (rings.find((r) => r.isDefault)?.id ?? rings[0]?.id ?? 'all'),
    countryCode: typeof d.countryCode === 'string' && d.countryCode ? d.countryCode : '1'
  };
}
