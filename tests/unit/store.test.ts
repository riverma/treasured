// Phase 2 checkpoint, as tests rather than a screenshot.
//
// fake-indexeddb gives Dexie a real IndexedDB to talk to in Node, so these exercise the
// actual persistence path — load, save, reload — rather than a mock of it.

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_RING_ID, emptyData, loadAll, saveData, toChannel, TreasuredDB, wipe
} from '../../src/lib/store/db';
import { sampleData, SAMPLE_IDS } from '../../src/lib/data/sample';
import { detectPattern } from '../../src/lib/core/patterns';
import { getSuggestion } from '../../src/lib/core/engine';
import { MAX_SENTIMENT_HISTORY } from '../../src/lib/core/types';
import type { AppData, Person, SentimentReading } from '../../src/lib/core/types';
import { ago, parseBirthday, shortSince, sinceText } from '../../src/lib/core/time';

let db: TreasuredDB;
let n = 0;

beforeEach(async () => {
  db = new TreasuredDB('treasured-test-' + n++);
  await db.open();
});

async function persist(data: AppData): Promise<AppData> {
  await saveData(db, data);
  return (await loadAll(db)).data;
}

describe('sample records', () => {
  const sample = sampleData(new Date('2026-09-18T12:00:00.000Z'));

  it('has eleven records and five rings', () => {
    expect(sample.people).toHaveLength(11);
    expect(sample.rings).toHaveLength(5);
  });

  it('gives every person a distinct palette', () => {
    const keys = sample.people.map((p) => p.palette.key);
    expect(new Set(keys).size).toBe(11);
  });

  it('counts ring membership per ring', async () => {
    const data = await persist(sample);
    const count = (ringId: string) =>
      data.ringMembers.filter((m) => m.ringId === ringId).length;
    expect(count('ring-2')).toBe(3);
    expect(count('ring-3')).toBe(3);
    expect(count('ring-4')).toBe(2);
    expect(count('ring-5')).toBe(1);
    // the default ring stores nothing: its membership is everyone, computed
    expect(count(DEFAULT_RING_ID)).toBe(0);
  });

  it('resolves time relative to the clock, not the day it was authored', () => {
    const now = new Date('2030-01-01T00:00:00.000Z');
    const later = sampleData(now);
    const first = later.people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    // written as '2 days' — must still mean two days, four years on
    expect(sinceText(first.lastSeenAt, now)).toBe('2 days ago');
    expect(Date.parse(first.lastSeenAt!)).toBeGreaterThan(Date.parse('2029-12-29T00:00:00.000Z'));
  });



  it('produces a suggestion and a pattern for every person', () => {
    for (const p of sample.people) {
      expect(getSuggestion(p)).toBeTruthy();
      expect(detectPattern(p.sentimentHistory).pattern).toBeTruthy();
    }
  });
});

describe('round trip', () => {
  it('survives a reload unchanged', async () => {
    const sample = sampleData(new Date('2026-09-18T12:00:00.000Z'));
    const back = await persist(sample);
    expect(back.people).toHaveLength(11);
    expect(back.rings.map((r) => r.id)).toEqual(sample.rings.map((r) => r.id));
    expect(back.ringMembers).toHaveLength(9);
    expect(back.activeRingId).toBe(DEFAULT_RING_ID);
  });

  it('reports an empty database as fresh, and a populated one as not', async () => {
    expect((await loadAll(db)).fresh).toBe(true);
    await saveData(db, sampleData());
    expect((await loadAll(db)).fresh).toBe(false);
  });

  it('leaves nothing behind when a person is removed', async () => {
    const sample = sampleData();
    const gone = SAMPLE_IDS[3]!; // a member of ring-2
    const pruned: AppData = {
      ...sample,
      people: sample.people.filter((p) => p.id !== gone),
      ringMembers: sample.ringMembers.filter((m) => m.personId !== gone)
    };
    const back = await persist(pruned);
    expect(back.people.some((p) => p.id === gone)).toBe(false);
    expect(back.ringMembers.some((m) => m.personId === gone)).toBe(false);
    expect(await db.ringMembers.where('personId').equals(gone).count()).toBe(0);
  });

  it('drops membership rows whose person was removed without pruning them', async () => {
    // saveData is the backstop: even a caller that forgets to filter cannot create an orphan
    const sample = sampleData();
    const back = await persist({ ...sample, people: sample.people.filter((p) => p.id !== SAMPLE_IDS[3]!) });
    expect(back.ringMembers.some((m) => m.personId === SAMPLE_IDS[3]!)).toBe(false);
  });
});

describe('sentiment history', () => {
  function withHistory(history: SentimentReading[]): AppData {
    const sample = sampleData();
    const people: Person[] = sample.people.map((p) =>
      p.id === SAMPLE_IDS[0]! ? { ...p, sentimentHistory: history } : p
    );
    return { ...sample, people };
  }

  it('caps at thirty, keeping the newest', async () => {
    const history: SentimentReading[] = Array.from({ length: 31 }, (_, i) => ({
      key: 'warm' as const,
      at: new Date(Date.UTC(2026, 0, i + 1)).toISOString()
    }));
    const back = await persist(withHistory(history));
    const rec = back.people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    expect(rec.sentimentHistory).toHaveLength(MAX_SENTIMENT_HISTORY);
    // the first day is the one dropped, not the last
    expect(rec.sentimentHistory[0]?.at).toBe(new Date(Date.UTC(2026, 0, 2)).toISOString());
  });

  it('reorders a newest-first history to oldest-first on load', async () => {
    // Defect 1: stored descending, every trend came back sign-flipped.
    const descending: SentimentReading[] = [
      { key: 'distant', at: '2026-03-01T00:00:00.000Z' },
      { key: 'cautious', at: '2026-02-01T00:00:00.000Z' },
      { key: 'warm', at: '2026-01-01T00:00:00.000Z' }
    ];
    const back = await persist(withHistory(descending));
    const rec = back.people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    expect(rec.sentimentHistory.map((r) => r.key)).toEqual(['warm', 'cautious', 'distant']);
    expect(detectPattern(rec.sentimentHistory).pattern).toBe('cooling');
  });

  it('reverses the trend when the input order is reversed', () => {
    const warming: SentimentReading[] = [
      { key: 'distant', at: '2026-01-01T00:00:00.000Z' },
      { key: 'cautious', at: '2026-02-01T00:00:00.000Z' },
      { key: 'warm', at: '2026-03-01T00:00:00.000Z' }
    ];
    expect(detectPattern(warming).pattern).toBe('warming');
    expect(detectPattern([...warming].reverse()).pattern).toBe('cooling');
  });

  it('drops an unknown sentiment key rather than throwing later', async () => {
    // Defect 2: getSuggestion calls detectPattern first, so one stale row took down Today.
    const history = [
      { key: 'warm', at: '2026-01-01T00:00:00.000Z' },
      { key: 'vibing', at: '2026-02-01T00:00:00.000Z' },
      { key: 'loving', at: '2026-03-01T00:00:00.000Z' }
    ] as unknown as SentimentReading[];
    const back = await persist(withHistory(history));
    const rec = back.people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    expect(rec.sentimentHistory.map((r) => r.key)).toEqual(['warm', 'loving']);
    expect(() => getSuggestion(rec)).not.toThrow();
  });
});

describe('normalisation on load', () => {
  it('defaults a person with no usable relation to friend', async () => {
    const sample = sampleData();
    const people = sample.people.map((p) =>
      p.id === SAMPLE_IDS[0]! ? { ...p, relations: ['coworker'] as never } : p
    );
    const back = await persist({ ...sample, people });
    expect(back.people.find((p) => p.id === SAMPLE_IDS[0]!)!.relations).toEqual(['friend']);
  });

  it('coerces channel casing through the alias map', () => {
    expect(toChannel('iMessage')).toBe('imessage');
    expect(toChannel('WhatsApp')).toBe('whatsapp');
    expect(toChannel('Phone')).toBe('phone');
    expect(toChannel('facetime audio')).toBe('facetime_audio');
    // the mockup's 'Slack' has no URL scheme, so it is dropped rather than half-supported
    expect(toChannel('Slack')).toBeNull();
  });

  it('falls back to the default ring when the stored one is gone', async () => {
    const sample = sampleData();
    const back = await persist({ ...sample, activeRingId: 'a-ring-that-was-deleted' });
    expect(back.activeRingId).toBe(DEFAULT_RING_ID);
  });
});

describe('wipe', () => {
  it('empties every table', async () => {
    await saveData(db, sampleData());
    await wipe(db);
    const { data, fresh } = await loadAll(db);
    expect(fresh).toBe(true);
    expect(data).toEqual(emptyData());
  });
});

describe('time', () => {
  const now = new Date('2026-09-18T12:00:00.000Z');

  it('parses both shapes the mockup used', () => {
    expect(ago('now', now)).toBe(now.toISOString());
    expect(Date.parse(ago('2 days', now))).toBe(now.getTime() - 2 * 86_400_000);
    expect(Date.parse(ago('3w', now))).toBe(now.getTime() - 3 * 604_800_000);
  });

  it('treats an unreadable offset as now rather than throwing', () => {
    expect(ago('whenever', now)).toBe(now.toISOString());
  });

  it('reads birthdays with and without a year', () => {
    expect(parseBirthday('Aug 14')).toBe('--08-14');
    expect(parseBirthday('1990-08-14')).toBe('1990-08-14');
    expect(parseBirthday('nonsense')).toBeNull();
    expect(parseBirthday(null)).toBeNull();
  });

  it('abbreviates hard for the weather strip, where seven sit in a row', () => {
    expect(shortSince(ago('now', now), now)).toBe('now');
    expect(shortSince(ago('3 days', now), now)).toBe('3d');
    expect(shortSince(ago('2w', now), now)).toBe('2w');
    expect(shortSince(ago('4mo', now), now)).toBe('4mo');
    expect(shortSince(ago('2y', now), now)).toBe('2y');
    expect(shortSince('not a date', now)).toBe('');
  });

  it('describes a gap in the coarse terms the card uses', () => {
    expect(sinceText(null, now)).toBe('not yet');
    expect(sinceText(ago('5 days', now), now)).toBe('5 days ago');
    expect(sinceText(ago('3w', now), now)).toBe('3 weeks ago');
    expect(sinceText(ago('4mo', now), now)).toBe('4 months ago');
  });
});
