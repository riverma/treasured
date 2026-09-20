// The store, not just the database functions underneath it.
//
// store.test.ts calls saveData with plain objects, which is why it stayed green while the
// app persisted nothing at all: `data.slice` is a $state proxy, a proxy cannot be
// structured-cloned, and Dexie answers that with DataCloneError. The app looked fully
// populated and lost everything on reload. These go through the real reactive store.

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { data } from '../../src/lib/store/data.svelte';
import { sampleData, SAMPLE_IDS } from '../../src/lib/data/sample';
import { MAX_SENTIMENT_HISTORY } from '../../src/lib/core/types';
import { loadAll } from '../../src/lib/store/db';

beforeEach(async () => {
  await data.reset(sampleData());
});

/** What is actually on disk, read back independently of the in-memory slice. */
async function onDisk() {
  return (await loadAll(data.db)).data;
}

describe('the store writes what it shows', () => {
  it('persists the slice rather than only rendering it', async () => {
    const stored = await onDisk();
    expect(stored.people).toHaveLength(11);
    expect(stored.rings).toHaveLength(5);
    expect(stored.ringMembers).toHaveLength(9);
  });

  it('persists a recorded sentiment', async () => {
    await data.recordSentiment(SAMPLE_IDS[0]!, 'wistful');
    const stored = await onDisk();
    const rec = stored.people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    expect(rec.recentSentiment).toBe('wistful');
    expect(rec.sentimentHistory.at(-1)?.key).toBe('wistful');
  });

  it('keeps exactly thirty readings after the thirty-first write', async () => {
    for (let i = 0; i < 31; i++) {
      await data.recordSentiment(
        SAMPLE_IDS[10]!, 'warm', new Date(Date.UTC(2026, 5, i + 1)).toISOString()
      );
    }
    const rec = (await onDisk()).people.find((p) => p.id === SAMPLE_IDS[10]!)!;
    expect(rec.sentimentHistory).toHaveLength(MAX_SENTIMENT_HISTORY);
  });

  it('persists a deletion, and its ring membership with it', async () => {
    await data.deletePerson(SAMPLE_IDS[3]!); // a member of ring-2
    const stored = await onDisk();
    expect(stored.people).toHaveLength(10);
    expect(stored.ringMembers).toHaveLength(8);
    expect(stored.ringMembers.some((m) => m.personId === SAMPLE_IDS[3]!)).toBe(false);
  });

  it('persists a new person with a palette nobody else is using', async () => {
    const before = new Set(data.slice.people.map((p) => p.palette.key));
    const added = await data.addPerson({ fullName: 'Z', name: 'Z', essence: '' });
    expect(before.has(added.palette.key)).toBe(false);
    const stored = await onDisk();
    expect(stored.people.some((p) => p.id === added.id)).toBe(true);
  });

  it('persists ring membership changes', async () => {
    await data.setRingMembership('ring-5', SAMPLE_IDS[7]!, true);
    expect((await onDisk()).ringMembers).toHaveLength(10);
    await data.setRingMembership('ring-5', SAMPLE_IDS[7]!, false);
    expect((await onDisk()).ringMembers).toHaveLength(9);
  });

  it('refuses to store membership of the default ring', async () => {
    // everyone is in it by definition; a row here could only ever drift out of step
    await data.setRingMembership('all', SAMPLE_IDS[7]!, true);
    expect((await onDisk()).ringMembers).toHaveLength(9);
  });
});

describe('reads', () => {
  it('counts the default ring as everyone without storing a row', () => {
    expect(data.ringCount('all')).toBe(11);
    expect(data.slice.ringMembers.some((m) => m.ringId === 'all')).toBe(false);
  });

  it('counts a real ring from its rows', () => {
    expect(data.ringCount('ring-2')).toBe(3);
    expect(data.peopleInRing('ring-2').map((p) => p.name).sort())
      .toEqual(['B', 'C', 'D']);
  });
});

describe('later', () => {
  it('suppresses for a week and says so', async () => {
    expect(data.isSuppressed(SAMPLE_IDS[4]!)).toBe(false);
    await data.later(SAMPLE_IDS[4]!);
    expect(data.isSuppressed(SAMPLE_IDS[4]!)).toBe(true);
    // and genuinely lapses rather than resurfacing the next morning
    expect(data.isSuppressed(SAMPLE_IDS[4]!, Date.now() + 8 * 86_400_000)).toBe(false);
  });

  it('forgets the suppression when the person is deleted', async () => {
    await data.later(SAMPLE_IDS[4]!);
    await data.deletePerson(SAMPLE_IDS[4]!);
    expect(SAMPLE_IDS[4]! in data.prefs.laterUntil).toBe(false);
  });
});
