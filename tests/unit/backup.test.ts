// Export and restore. On the web this is the only durable backup there is, so a file that
// half-restores is worse than one that refuses.

import { describe, expect, it } from 'vitest';
import { backupFilename, buildBackup, parseBackup, BackupError } from '../../src/lib/core/backup';
import { sampleData } from '../../src/lib/data/sample';

const data = sampleData(new Date('2026-09-19T12:00:00.000Z'));
const file = buildBackup(data, '1.0.0', new Date('2026-09-19T12:00:00.000Z'));

describe('round trip', () => {
  it('restores everything it exported', () => {
    const back = parseBackup(file);
    expect(back.people).toHaveLength(11);
    expect(back.rings).toHaveLength(5);
    expect(back.ringMembers).toHaveLength(9);
    expect(back.activeRingId).toBe(data.activeRingId);
    expect(back.countryCode).toBe('1');
  });

  it('is readable in a text editor', () => {
    expect(file).toContain('\n  ');
    expect(JSON.parse(file).format).toBe('treasured.backup');
  });

  it('names the file by the day it was written', () => {
    expect(backupFilename(new Date('2026-09-19T12:00:00.000Z'))).toBe('treasured-2026-09-19.json');
  });
});

describe('refusing what it should refuse', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
  });

  it('rejects JSON that is not a Treasured backup', () => {
    expect(() => parseBackup('{"hello":true}')).toThrow(BackupError);
  });

  it('rejects a backup from a newer version rather than guessing', () => {
    const future = JSON.stringify({ ...JSON.parse(file), version: 99 });
    expect(() => parseBackup(future)).toThrow(/newer version/);
  });

  it('rejects an empty backup', () => {
    const empty = JSON.stringify({
      format: 'treasured.backup', version: 1, exportedAt: '', app: '1.0.0',
      data: { people: [], rings: [], ringMembers: [], activeRingId: 'all', countryCode: '1' }
    });
    expect(() => parseBackup(empty)).toThrow(/empty/);
  });
});

describe('forgiving what it should forgive', () => {
  it('drops unrecognisable rows rather than failing the whole file', () => {
    const parsed = JSON.parse(file);
    parsed.data.people.push({ id: 'broken' });          // no name, no palette
    parsed.data.ringMembers.push({ ringId: 'x', personId: 'y' });
    const back = parseBackup(JSON.stringify(parsed));
    expect(back.people).toHaveLength(11);
    expect(back.ringMembers).toHaveLength(9);
  });

  it('falls back to the default ring when the stored one is missing', () => {
    const parsed = JSON.parse(file);
    parsed.data.activeRingId = 'gone';
    expect(parseBackup(JSON.stringify(parsed)).activeRingId).toBe('all');
  });
});
