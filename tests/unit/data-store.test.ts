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

describe('editing someone', () => {
  it('persists a change and leaves the rest alone', async () => {
    const before = data.person(SAMPLE_IDS[0]!)!;
    const essence = before.essence;
    await data.updatePerson(SAMPLE_IDS[0]!, { fullName: 'Zephyr Quill' });
    const stored = (await onDisk()).people.find((p) => p.id === SAMPLE_IDS[0]!)!;
    expect(stored.fullName).toBe('Zephyr Quill');
    expect(stored.essence).toBe(essence);
  });

  it('recomputes the initial when the name changes', async () => {
    // it was set once at creation and never again, so a rename left the old letter behind
    await data.updatePerson(SAMPLE_IDS[0]!, { fullName: 'Zephyr Quill', name: 'Zephyr' });
    expect((await onDisk()).people.find((p) => p.id === SAMPLE_IDS[0]!)!.initial).toBe('Z');
  });

  it('refuses to blank out a name', async () => {
    const before = data.person(SAMPLE_IDS[1]!)!.fullName;
    await data.updatePerson(SAMPLE_IDS[1]!, { fullName: '   ' });
    expect(data.person(SAMPLE_IDS[1]!)!.fullName).toBe(before);
  });

  it('keeps at least one relation', async () => {
    await data.updatePerson(SAMPLE_IDS[1]!, { relations: [] });
    expect(data.person(SAMPLE_IDS[1]!)!.relations.length).toBeGreaterThan(0);
  });

  it('tracks whether there is any way to reach them', async () => {
    await data.updatePerson(SAMPLE_IDS[2]!, { contact: { hasContact: false, phone: '5550100' } });
    expect(data.person(SAMPLE_IDS[2]!)!.contact.hasContact).toBe(true);
    await data.updatePerson(SAMPLE_IDS[2]!, { contact: { hasContact: true, phone: '', email: '' } });
    expect(data.person(SAMPLE_IDS[2]!)!.contact.hasContact).toBe(false);
  });

  it('changes the palette, which is how a person is recognised', async () => {
    await data.updatePerson(SAMPLE_IDS[3]!, { paletteKey: 'teal' });
    const stored = (await onDisk()).people.find((p) => p.id === SAMPLE_IDS[3]!)!;
    expect(stored.palette.key).toBe('teal');
    expect(stored.palette.gradientColors.length).toBe(4);
  });

  it('moves updatedAt forward', async () => {
    const before = data.person(SAMPLE_IDS[4]!)!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await data.updatePerson(SAMPLE_IDS[4]!, { essence: 'changed' });
    expect(Date.parse(data.person(SAMPLE_IDS[4]!)!.updatedAt)).toBeGreaterThan(Date.parse(before));
  });

  it('does nothing for an id that is not here', async () => {
    await expect(data.updatePerson('no-such-person', { fullName: 'X' })).resolves.toBeUndefined();
    expect((await onDisk()).people).toHaveLength(11);
  });
});

describe('rings', () => {
  it('leaves the chosen person alone when the ring changes', async () => {
    // The ring is how you browse the deck, not a scope on Today. Switching it used to
    // silently swap out the person you were looking at, with no explanation.
    data.activePersonId = SAMPLE_IDS[0]!;          // A, who is in no ring but the default
    await data.setActiveRing('ring-2');             // holds B, C, D
    expect(data.activePersonId).toBe(SAMPLE_IDS[0]!);
  });

  it('ignores a ring that does not exist', async () => {
    const before = data.slice.activeRingId;
    await data.setActiveRing('no-such-ring');
    expect(data.slice.activeRingId).toBe(before);
  });
});

describe('last together', () => {
  it('can be set by hand, which nothing could do before', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    const when = '2026-09-01T12:00:00.000Z';
    await data.setLastSeen(id, when);
    expect((await onDisk()).people.find((p) => p.id === id)!.lastSeenAt).toBe(when);
  });

  it('can be cleared back to never', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    await data.setLastSeen(id, null);
    expect((await onDisk()).people.find((p) => p.id === id)!.lastSeenAt).toBeNull();
  });

  it('moves updatedAt, so the change is not invisible to sorting', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    const before = data.person(id)!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await data.setLastSeen(id, new Date().toISOString());
    expect(Date.parse(data.person(id)!.updatedAt)).toBeGreaterThan(Date.parse(before));
  });

  it('does nothing for someone who is not here', async () => {
    await data.reset(sampleData());
    await expect(data.setLastSeen('nobody', new Date().toISOString())).resolves.toBeUndefined();
  });
});

describe('rings exist at all', () => {
  it('creates the ring everyone belongs to on first boot', async () => {
    await data.reset();              // genuinely empty, as a real install is
    await data.load();
    const def = data.slice.rings.find((r) => r.isDefault);
    expect(def).toBeTruthy();
    expect(def!.id).toBe('all');
    // and it survives, rather than being invented fresh each boot
    expect((await onDisk()).rings.some((r) => r.isDefault)).toBe(true);
  });

  it('does not create a second one on the next boot', async () => {
    await data.reset();
    await data.load();
    await data.load();
    expect(data.slice.rings.filter((r) => r.isDefault)).toHaveLength(1);
  });

  it('adds, renames and removes a ring', async () => {
    await data.reset();
    await data.load();
    const ring = await data.addRing('  Long-time  ');
    expect(ring!.name).toBe('Long-time');
    expect((await onDisk()).rings.some((r) => r.id === ring!.id)).toBe(true);

    await data.renameRing(ring!.id, 'Old friends');
    expect((await onDisk()).rings.find((r) => r.id === ring!.id)!.name).toBe('Old friends');

    await data.deleteRing(ring!.id);
    expect((await onDisk()).rings.some((r) => r.id === ring!.id)).toBe(false);
  });

  it('refuses to remove the default ring', async () => {
    await data.reset();
    await data.load();
    await data.deleteRing('all');
    expect(data.slice.rings.some((r) => r.isDefault)).toBe(true);
  });

  it('falls back to the default ring when the active one is removed', async () => {
    await data.reset();
    await data.load();
    const ring = await data.addRing('Work');
    await data.setActiveRing(ring!.id);
    await data.deleteRing(ring!.id);
    expect(data.slice.activeRingId).toBe('all');
  });

  it('refuses a blank name', async () => {
    await data.reset();
    await data.load();
    const before = data.slice.rings.length;
    expect(await data.addRing('   ')).toBeUndefined();
    expect(data.slice.rings).toHaveLength(before);
  });
});

describe('rings, from the person', () => {
  it('lists the rings a person is in, which nothing could ask before', async () => {
    await data.reset(sampleData());
    // ring-2 holds B, C, D
    expect(data.ringsFor(SAMPLE_IDS[1]!).map((r) => r.id)).toEqual(['ring-2']);
    expect(data.ringsFor(SAMPLE_IDS[0]!)).toEqual([]);
  });

  it('never lists the default ring, which everyone is in by definition', async () => {
    await data.reset(sampleData());
    expect(data.ringsFor(SAMPLE_IDS[1]!).some((r) => r.isDefault)).toBe(false);
  });

  it('answers membership directly', async () => {
    await data.reset(sampleData());
    expect(data.inRing('ring-2', SAMPLE_IDS[1]!)).toBe(true);
    expect(data.inRing('ring-2', SAMPLE_IDS[0]!)).toBe(false);
  });

  it('creates a ring and joins it in one step', async () => {
    await data.reset(sampleData());
    const ring = await data.addRingWith('Climbing', SAMPLE_IDS[0]!);
    expect(ring).toBeTruthy();
    expect(data.inRing(ring!.id, SAMPLE_IDS[0]!)).toBe(true);
    expect((await onDisk()).ringMembers.some((m) => m.ringId === ring!.id)).toBe(true);
  });

  it('reflects a membership change straight back', async () => {
    await data.reset(sampleData());
    await data.setRingMembership('ring-2', SAMPLE_IDS[0]!, true);
    expect(data.ringsFor(SAMPLE_IDS[0]!).map((r) => r.id)).toEqual(['ring-2']);
    await data.setRingMembership('ring-2', SAMPLE_IDS[0]!, false);
    expect(data.ringsFor(SAMPLE_IDS[0]!)).toEqual([]);
  });
});

describe('treasures and their words', () => {
  it('writes one, which nothing could do before', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    await data.addNote(id, 'treasures', '  Shows up without being asked  ');
    const stored = (await onDisk()).people.find((p) => p.id === id)!;
    expect(stored.treasures).toHaveLength(1);
    expect(stored.treasures[0]!.content).toBe('Shows up without being asked');
    expect(stored.treasures[0]!.id).toBeTruthy();
    expect(stored.treasures[0]!.position).toBe(0);
  });

  it('keeps treasures and quotes apart', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    await data.addNote(id, 'treasures', 'a thing');
    await data.addNote(id, 'quotes', 'a saying');
    const stored = (await onDisk()).people.find((p) => p.id === id)!;
    expect(stored.treasures.map((t) => t.content)).toEqual(['a thing']);
    expect(stored.quotes.map((q) => q.content)).toEqual(['a saying']);
  });

  it('ignores an empty one', async () => {
    await data.reset(sampleData());
    await data.addNote(SAMPLE_IDS[0]!, 'treasures', '   ');
    expect(data.person(SAMPLE_IDS[0]!)!.treasures).toHaveLength(0);
  });

  it('edits and removes, renumbering what is left', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    for (const t of ['one', 'two', 'three']) await data.addNote(id, 'treasures', t);
    const second = data.person(id)!.treasures[1]!.id;

    await data.editNote(id, 'treasures', second, 'second');
    expect(data.person(id)!.treasures[1]!.content).toBe('second');

    await data.removeNote(id, 'treasures', second);
    const left = (await onDisk()).people.find((p) => p.id === id)!.treasures;
    expect(left.map((t) => t.content)).toEqual(['one', 'three']);
    expect(left.map((t) => t.position)).toEqual([0, 1]);
  });

  it('treats editing to empty as removing', async () => {
    await data.reset(sampleData());
    const id = SAMPLE_IDS[0]!;
    await data.addNote(id, 'treasures', 'one');
    const only = data.person(id)!.treasures[0]!.id;
    await data.editNote(id, 'treasures', only, '  ');
    expect(data.person(id)!.treasures).toHaveLength(0);
  });
});

describe('the onboarding draft', () => {
  it('survives being written and read back', async () => {
    await data.reset();
    await data.setPrefs({ draft: { step: 2, fullName: 'Quill', essence: 'x', relations: ['friend'], phone: '', feeling: 'warm' } });
    const { prefs } = await loadAll(data.db);
    expect(prefs.draft?.fullName).toBe('Quill');
    expect(prefs.draft?.step).toBe(2);
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
