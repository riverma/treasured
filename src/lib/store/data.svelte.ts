// The user-owned slice, reactive.
//
// A note on §9: the plan's layout lists `store/{db,app,router}`. This is a fourth module,
// because `app.svelte.ts` holds environment state — toast, reduced motion, standalone — and
// mixing the data people own into the same object made both harder to read. The split is
// the only deviation from the planned layout.
//
// Every mutation writes the whole slice back through `saveData`. That is deliberate: it is
// what makes a delete incapable of leaving an orphan, and at this size the cost is nil.

import type { AppData, PaletteKey, Person, Ring, SentimentKey } from '$lib/core/types';
import { MAX_SENTIMENT_HISTORY } from '$lib/core/types';
import { newId } from '$lib/core/id';
import { palette, paletteForNewPerson } from '$lib/data/palettes';
import {
  DEFAULT_PREFS, DEFAULT_RING_ID, emptyData, loadAll, requestPersistence,
  saveData, savePrefs, TreasuredDB, wipe, type Prefs
} from '$lib/store/db';

class Data {
  db = new TreasuredDB();
  slice = $state<AppData>(emptyData());
  prefs = $state<Prefs>({ ...DEFAULT_PREFS });
  ready = $state(false);
  /** True when this device has never held any data. Drives onboarding. */
  fresh = $state(false);
  /**
   * Whoever you last chose from the deck. Not persisted: which card you were looking at is
   * a property of this glance at the app, not of the people you know. When it is unset,
   * or when they are not in the ring you are browsing, Today falls back to the ranking.
   */
  activePersonId = $state<string | null>(null);

  /**
   * Boot.
   *
   * A fresh install is genuinely empty — no sample people, no demo contacts, nothing
   * pretending to be someone. `fresh` is surfaced so the shell can route to onboarding,
   * which is the only way anyone gets data into this app.
   */
  async load(): Promise<void> {
    const { data, prefs, fresh } = await loadAll(this.db);
    this.prefs = prefs;
    this.slice = data;
    this.fresh = fresh;
    this.ready = true;
    if (!fresh) void requestPersistence();
  }

  /**
   * The only write path.
   *
   * `this.slice` is a `$state` proxy, and a proxy cannot be structured-cloned — handing one
   * to Dexie throws DataCloneError and the transaction silently writes nothing, leaving an
   * app that looks fully populated until the first reload. Every write goes through here so
   * there is exactly one place that has to remember to snapshot.
   */
  private async commit(): Promise<void> {
    await saveData(this.db, $state.snapshot(this.slice) as AppData);
  }

  async setPrefs(p: Partial<Prefs>): Promise<void> {
    this.prefs = { ...this.prefs, ...p };
    await savePrefs(this.db, p);
  }

  // ---- reads -------------------------------------------------------------

  person(id: string | null): Person | undefined {
    return id ? this.slice.people.find((p) => p.id === id) : undefined;
  }

  get rings(): Ring[] {
    return this.slice.rings;
  }

  get activeRing(): Ring | undefined {
    return this.slice.rings.find((r) => r.id === this.slice.activeRingId)
      ?? this.slice.rings.find((r) => r.isDefault);
  }

  /** The default ring means everyone, and its membership is virtual — never stored, so it
   *  cannot drift out of step with the people list. */
  peopleInRing(ringId: string): Person[] {
    const ring = this.slice.rings.find((r) => r.id === ringId);
    if (!ring || ring.isDefault) return this.slice.people;
    const ids = new Set(this.slice.ringMembers.filter((m) => m.ringId === ringId).map((m) => m.personId));
    return this.slice.people.filter((p) => ids.has(p.id));
  }

  ringCount(ringId: string): number {
    return this.peopleInRing(ringId).length;
  }

  // ---- writes ------------------------------------------------------------

  /**
   * Append a reading. History stays oldest-first and capped, because `detectPattern` reads
   * `slice(-3)` and a relationship that runs for years should not carry an unbounded log.
   */
  async recordSentiment(personId: string, key: SentimentKey, at = new Date().toISOString()): Promise<void> {
    const p = this.person(personId);
    if (!p) return;
    p.sentimentHistory = [...p.sentimentHistory, { key, at }].slice(-MAX_SENTIMENT_HISTORY);
    p.recentSentiment = key;
    p.updatedAt = at;
    await this.commit();
  }

  async markSeen(personId: string, at = new Date().toISOString()): Promise<void> {
    const p = this.person(personId);
    if (!p) return;
    p.lastSeenAt = at;
    p.updatedAt = at;
    await this.commit();
  }

  /** Remember what actually worked, since the web cannot tell us what is installed. */
  async rememberChannel(personId: string, channel: Person['contact']['preferredChannel']): Promise<void> {
    const p = this.person(personId);
    if (!p) return;
    p.contact = { ...p.contact, preferredChannel: channel };
    await this.commit();
  }

  async addPerson(input: Pick<Person, 'fullName' | 'name' | 'essence'> & Partial<Person>): Promise<Person> {
    const id = newId();
    const now = new Date().toISOString();
    const used = this.slice.people.map((p) => p.palette.key as PaletteKey);
    const person: Person = {
      id,
      fullName: input.fullName,
      name: input.name || input.fullName.split(' ')[0] || input.fullName,
      initial: (input.name || input.fullName).trim().charAt(0).toUpperCase() || '?',
      essence: input.essence ?? '',
      palette: palette(input.palette?.key ?? paletteForNewPerson(used, id)),
      lastSeenAt: input.lastSeenAt ?? null,
      since: input.since ?? '',
      birthday: input.birthday ?? null,
      recentSentiment: input.recentSentiment ?? 'warm',
      sentimentHistory: input.sentimentHistory ?? [],
      relations: input.relations?.length ? input.relations : ['friend'],
      treasures: input.treasures ?? [],
      quotes: input.quotes ?? [],
      contact: input.contact ?? { hasContact: false },
      createdAt: now,
      updatedAt: now
    };
    this.slice.people = [...this.slice.people, person];
    await this.commit();
    return person;
  }

  /**
   * Remove a person and every trace of them.
   *
   * There is no cascade to write: membership rows are filtered here and `saveData` rewrites
   * every table from this slice, so nothing keyed to a departed id can survive. Their
   * suppression entry goes too — otherwise re-adding them later would find them still hidden.
   */
  async deletePerson(personId: string): Promise<void> {
    this.slice.people = this.slice.people.filter((p) => p.id !== personId);
    this.slice.ringMembers = this.slice.ringMembers.filter((m) => m.personId !== personId);
    await this.commit();
    if (personId in this.prefs.laterUntil) {
      const laterUntil = { ...this.prefs.laterUntil };
      delete laterUntil[personId];
      await this.setPrefs({ laterUntil });
    }
  }

  async setCountryCode(raw: string): Promise<void> {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    this.slice.countryCode = digits || '1';
    await this.commit();
  }

  async setActiveRing(ringId: string): Promise<void> {
    if (!this.slice.rings.some((r) => r.id === ringId)) return;
    this.slice.activeRingId = ringId;
    // The person you were looking at may not be in the ring you just chose. Leaving them
    // on Today would show someone the ring says you are not currently browsing, so the
    // choice is released and Today falls back to ranking within the new ring.
    if (this.activePersonId && !this.peopleInRing(ringId).some((p) => p.id === this.activePersonId)) {
      this.activePersonId = null;
    }
    await this.commit();
  }

  async setRingMembership(ringId: string, personId: string, member: boolean): Promise<void> {
    const ring = this.slice.rings.find((r) => r.id === ringId);
    if (!ring || ring.isDefault) return; // everyone is always in the default ring
    const without = this.slice.ringMembers.filter((m) => !(m.ringId === ringId && m.personId === personId));
    this.slice.ringMembers = member
      ? [...without, { ringId, personId, createdAt: new Date().toISOString() }]
      : without;
    await this.commit();
  }

  /**
   * "Later" on a Connections card. Suppresses for a week.
   *
   * Defect 10: this has to genuinely suppress. A dismissal that brings the same person back
   * tomorrow is a nag wearing a polite label, and it teaches people to stop tapping it.
   */
  async later(personId: string, days = 7): Promise<void> {
    const until = new Date(Date.now() + days * 86_400_000).toISOString();
    await this.setPrefs({ laterUntil: { ...this.prefs.laterUntil, [personId]: until } });
  }

  isSuppressed(personId: string, now = Date.now()): boolean {
    const until = this.prefs.laterUntil[personId];
    return !!until && Date.parse(until) > now;
  }

  /**
   * Start over, or load a slice wholesale.
   *
   * `replacement` is how the dev harness and a restored backup both get data in. Production
   * never passes one from a bundled fixture, because there is no bundled fixture.
   */
  async reset(replacement?: AppData): Promise<void> {
    await wipe(this.db);
    this.slice = replacement ?? emptyData();
    this.prefs = { ...DEFAULT_PREFS };
    this.fresh = !replacement;
    if (replacement) await this.commit();
  }
}

export const data = new Data();
export { DEFAULT_RING_ID };
