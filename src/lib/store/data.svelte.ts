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
import { app } from '$lib/store/app.svelte';
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
   * Set when the database could not be opened or read at all — a blocked upgrade, a corrupt
   * store, private browsing with IndexedDB denied. Without this the boot read's rejection
   * went nowhere, `ready` stayed false, and the app sat on "Opening…" forever. From the
   * outside that is indistinguishable from having lost everything.
   */
  loadError = $state<string | null>(null);
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
    try {
      const { data, prefs, fresh } = await loadAll(this.db);
      this.prefs = prefs;
      this.slice = data;
      this.fresh = fresh;
      this.loadError = null;
      this.ready = true;
      await this.ensureDefaultRing();
      if (!fresh) void requestPersistence();
    } catch (e) {
      console.error('could not open the database', e);
      this.loadError = e instanceof Error ? e.message : String(e);
      // ready, but empty and honest about why — never a permanent "Opening…"
      this.ready = true;
    }
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
    try {
      await saveData(this.db, $state.snapshot(this.slice) as AppData);
      this.pendingWrite = false;
    } catch (e) {
      // Most mutations are fired and not awaited — a sentiment tap, a ring toggle, the
      // country code. Their rejections used to vanish into an unhandled promise, so a
      // storage failure looked exactly like nothing happening. Say it once, here.
      console.error('could not save', e);
      this.pendingWrite = true;
      app.say('That did not save. Your device may be out of room.');
      throw e;
    }
  }

  /** True when the last write failed. Settings surfaces it. */
  pendingWrite = $state(false);

  /**
   * Write now, synchronously enough to survive the page going away.
   *
   * Giraffy flushes on pagehide and on the tab being hidden, which matters most on a phone:
   * swiping the app away mid-write would otherwise lose whatever had not landed.
   */
  flush(): void {
    if (!this.ready) return;
    void saveData(this.db, $state.snapshot(this.slice) as AppData).catch((e) => {
      console.error('flush failed', e);
    });
  }

  /** Called once at boot. */
  watchLifecycle(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  /**
   * The only prefs write path, and it snapshots for the same reason `commit()` does.
   *
   * A `$state` proxy cannot be structured-cloned, and Dexie answers one with DataCloneError
   * — the write silently does nothing. `commit()` has guarded against this since the start;
   * prefs did not, and the moment something passed `this.prefs` itself rather than a plain
   * literal, saving the whole slice began to fail. Snapshot here so no caller has to know.
   */
  async setPrefs(p: Partial<Prefs>): Promise<void> {
    const plain = $state.snapshot(p) as Partial<Prefs>;
    this.prefs = { ...this.prefs, ...plain };
    await savePrefs(this.db, plain);
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

  /**
   * Set when you last saw someone, or clear it.
   *
   * Until now `lastSeenAt` had exactly one writer in the whole app — a side effect of
   * tapping a channel in the reach sheet. So it was shown on Today, on the card back and in
   * the weekly three, drove the whole ranking, and could not be set or corrected by hand.
   * Seeing someone in person left no way to record it.
   */
  async setLastSeen(personId: string, at: string | null): Promise<void> {
    const p = this.person(personId);
    if (!p) return;
    p.lastSeenAt = at;
    p.updatedAt = new Date().toISOString();
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
   * Change someone after the fact.
   *
   * Until now a person was write-once: `fullName`, `essence`, `relations`, the number — all
   * frozen at creation, so a typo in someone's name was permanent unless you deleted them
   * and started again. That is the hole this closes.
   *
   * `initial` is derived, not stored input: it was computed once in `addPerson` and never
   * again, so renaming someone would otherwise have left the old letter on their card.
   */
  async updatePerson(
    personId: string,
    patch: Partial<Pick<Person, 'fullName' | 'name' | 'essence' | 'since' | 'birthday' | 'relations' | 'contact'>>
      & { paletteKey?: PaletteKey }
  ): Promise<void> {
    const p = this.person(personId);
    if (!p) return;

    if (patch.fullName !== undefined) p.fullName = patch.fullName.trim() || p.fullName;
    if (patch.name !== undefined) {
      p.name = patch.name.trim() || p.fullName.split(' ')[0] || p.fullName;
    }
    // Recomputed from whatever the name now is, never carried over.
    p.initial = (p.name || p.fullName).trim().charAt(0).toUpperCase() || '?';

    if (patch.essence !== undefined) p.essence = patch.essence.trim();
    if (patch.since !== undefined) p.since = patch.since.trim();
    if (patch.birthday !== undefined) p.birthday = patch.birthday;
    if (patch.relations !== undefined && patch.relations.length) p.relations = patch.relations;
    if (patch.contact !== undefined) {
      const phone = patch.contact.phone?.trim() || undefined;
      const email = patch.contact.email?.trim() || undefined;
      p.contact = { ...p.contact, phone, email, hasContact: !!(phone || email) };
    }
    if (patch.paletteKey) p.palette = palette(patch.paletteKey);

    p.updatedAt = new Date().toISOString();
    await this.commit();
  }

  /**
   * The small true things, and their words.
   *
   * `Treasure` has carried an `id` and a `position` since the first commit, with a comment
   * explaining they exist so a row can be edited, reordered or removed without a migration.
   * Nothing ever wrote one — both arrays were initialised to `[]` and never touched again,
   * so the two sections on the back of every card could not appear. This is the writer.
   */
  async addNote(personId: string, kind: 'treasures' | 'quotes', content: string): Promise<void> {
    const p = this.person(personId);
    const text = content.trim();
    if (!p || !text) return;
    const list = p[kind];
    p[kind] = [...list, {
      id: newId(),
      content: text,
      position: list.length,
      createdAt: new Date().toISOString()
    }];
    p.updatedAt = new Date().toISOString();
    await this.commit();
  }

  async editNote(personId: string, kind: 'treasures' | 'quotes', noteId: string, content: string): Promise<void> {
    const p = this.person(personId);
    const text = content.trim();
    if (!p) return;
    if (!text) return this.removeNote(personId, kind, noteId);
    p[kind] = p[kind].map((n) => (n.id === noteId ? { ...n, content: text } : n));
    p.updatedAt = new Date().toISOString();
    await this.commit();
  }

  async removeNote(personId: string, kind: 'treasures' | 'quotes', noteId: string): Promise<void> {
    const p = this.person(personId);
    if (!p) return;
    // positions are renumbered so they stay meaningful after a removal
    p[kind] = p[kind].filter((n) => n.id !== noteId).map((n, i) => ({ ...n, position: i }));
    p.updatedAt = new Date().toISOString();
    await this.commit();
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

  private codeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Debounced, because this one is bound to an input's `oninput`.
   *
   * Every other mutation here is a discrete act — a tap, a save — and writes immediately so
   * that awaiting it means something. This one fired a whole-slice clear-and-rewrite on
   * every keystroke. Giraffy debounces everything at 250ms; Treasured only needs it where
   * there is an actual write storm.
   */
  setCountryCode(raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    this.slice.countryCode = digits || '1';
    if (this.codeTimer) clearTimeout(this.codeTimer);
    this.codeTimer = setTimeout(() => { void this.commit().catch(() => {}); }, 250);
  }

  /**
   * Make sure the ring everyone belongs to exists.
   *
   * It only ever existed in the dev fixture, so on a real install `rings` was empty forever:
   * the Rings sheet showed nothing, `activeRing` was undefined, and the whole feature was
   * dead while looking present. The default ring stores no membership — it means everyone,
   * computed — so creating it costs one row and cannot drift out of step.
   */
  private async ensureDefaultRing(): Promise<void> {
    if (this.slice.rings.some((r) => r.isDefault)) return;
    const now = new Date().toISOString();
    this.slice.rings = [
      {
        id: DEFAULT_RING_ID,
        name: 'Everyone',
        description: 'Everyone you treasure',
        color: '#b8895a',
        isDefault: true,
        position: 0,
        createdAt: now
      },
      ...this.slice.rings
    ];
    this.slice.activeRingId = this.slice.activeRingId || DEFAULT_RING_ID;
    await this.commit();
  }

  /** Accents a new ring cycles through, so two rings are rarely the same colour. */
  private static RING_COLOURS = ['#7a9d7f', '#6571b8', '#a692c4', '#b87859', '#6781a3', '#e08591'];

  async addRing(name: string): Promise<Ring | undefined> {
    const clean = name.trim();
    if (!clean) return undefined;
    const custom = this.slice.rings.filter((r) => !r.isDefault).length;
    const ring: Ring = {
      id: newId(),
      name: clean,
      description: '',
      color: Data.RING_COLOURS[custom % Data.RING_COLOURS.length] ?? '#7a9d7f',
      isDefault: false,
      position: this.slice.rings.length,
      createdAt: new Date().toISOString()
    };
    this.slice.rings = [...this.slice.rings, ring];
    await this.commit();
    return ring;
  }

  /** Which rings a person is in. The reverse of `peopleInRing`, and the direction the UI
   *  never supported — membership was only ever modelled as people inside a ring. */
  ringsFor(personId: string): Ring[] {
    const ids = new Set(
      this.slice.ringMembers.filter((m) => m.personId === personId).map((m) => m.ringId)
    );
    return this.slice.rings.filter((r) => !r.isDefault && ids.has(r.id));
  }

  inRing(ringId: string, personId: string): boolean {
    return this.slice.ringMembers.some((m) => m.ringId === ringId && m.personId === personId);
  }

  /** Make a ring and put someone in it, which is what "new ring" almost always means. */
  async addRingWith(name: string, personId: string): Promise<Ring | undefined> {
    const ring = await this.addRing(name);
    if (ring) await this.setRingMembership(ring.id, personId, true);
    return ring;
  }

  async renameRing(ringId: string, name: string): Promise<void> {
    const ring = this.slice.rings.find((r) => r.id === ringId);
    const clean = name.trim();
    if (!ring || !clean) return;
    ring.name = clean;
    await this.commit();
  }

  /** The default ring cannot be removed: it is what "everyone" means. */
  async deleteRing(ringId: string): Promise<void> {
    const ring = this.slice.rings.find((r) => r.id === ringId);
    if (!ring || ring.isDefault) return;
    this.slice.rings = this.slice.rings.filter((r) => r.id !== ringId);
    this.slice.ringMembers = this.slice.ringMembers.filter((m) => m.ringId !== ringId);
    if (this.slice.activeRingId === ringId) {
      this.slice.activeRingId = this.slice.rings.find((r) => r.isDefault)?.id ?? DEFAULT_RING_ID;
    }
    await this.commit();
  }

  async setActiveRing(ringId: string): Promise<void> {
    if (!this.slice.rings.some((r) => r.id === ringId)) return;
    this.slice.activeRingId = ringId;
    // The pinned person is deliberately left alone now. Today is no longer ring-scoped, so
    // changing how you are browsing the deck has no business silently replacing the person
    // you were looking at — which it used to do, with no toast and no explanation.
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
    if (replacement) {
      await this.commit();
      // wipe() emptied the settings table, so the defaults have to be written back or the
      // next boot reads prefs that no longer exist. Someone restoring a backup has plainly
      // been through onboarding already, so do not send them round it again.
      this.prefs = { ...this.prefs, onboarded: true };
      await savePrefs(this.db, $state.snapshot(this.prefs) as Prefs);
    }
  }
}

export const data = new Data();
export { DEFAULT_RING_ID };
