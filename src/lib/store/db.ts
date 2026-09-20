// IndexedDB through Dexie. One database, version 1; every table keyed by a plain id.
//
// The persistence shape is Giraffy's: load the whole slice at boot, write the whole slice
// back in one transaction. For the twenty to forty people this app is built for that is
// both correct and far simpler than a per-entity repository layer — and it dissolves the
// cascade-delete problem, because a rewrite cannot leave an orphan behind.

import Dexie, { type Table } from 'dexie';
import type {
  AppData, ChannelKey, Person, RelationKey, Ring, RingMember, SentimentReading
} from '$lib/core/types';
import { MAX_SENTIMENT_HISTORY, RELATION_PRECEDENCE } from '$lib/core/types';
import { isSentimentKey } from '$lib/core/sentiments';

export interface RingMemberRow extends RingMember { key: string }
export interface SettingRow { key: string; value: unknown }

export class TreasuredDB extends Dexie {
  people!: Table<Person, string>;
  rings!: Table<Ring, string>;
  ringMembers!: Table<RingMemberRow, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = 'treasured') {
    super(name);
    this.version(1).stores({
      people: 'id, updatedAt, lastSeenAt',
      rings: 'id, position',
      ringMembers: 'key, personId, ringId',
      settings: 'key'
    });
  }
}

/** Settings that sit outside the data slice: app state rather than things you own. */
export interface Prefs {
  onboarded: boolean;
  lastBackup: string | null;
  backupDismissed: boolean;
  installDismissed: boolean;
  /**
   * Person id -> ISO timestamp until which they are suppressed from Connections.
   * Defect 10: "Later" has to genuinely mean later. A dismissal that resurfaces the same
   * person the next morning teaches people to stop tapping it.
   */
  laterUntil: Record<string, string>;
}

export const DEFAULT_PREFS: Prefs = {
  onboarded: false,
  lastBackup: null,
  backupDismissed: false,
  installDismissed: false,
  laterUntil: {}
};

export const DEFAULT_RING_ID = 'all';

export function emptyData(): AppData {
  return { people: [], rings: [], ringMembers: [], activeRingId: DEFAULT_RING_ID, countryCode: '1' };
}

const DATA_KEYS = ['activeRingId', 'countryCode'] as const;
const PREF_KEYS = ['onboarded', 'lastBackup', 'backupDismissed', 'installDismissed', 'laterUntil'] as const;

const CHANNELS = new Set<ChannelKey>([
  'imessage', 'whatsapp', 'signal', 'telegram', 'email',
  'phone', 'facetime', 'facetime_audio', 'whatsapp_call', 'signal_call'
]);

/** Defect 6: the mockup seed wrote display strings. Anything unrecognised is dropped. */
const CHANNEL_ALIASES: Record<string, ChannelKey> = {
  imessage: 'imessage', messages: 'imessage', sms: 'imessage', text: 'imessage',
  whatsapp: 'whatsapp', signal: 'signal', telegram: 'telegram',
  email: 'email', mail: 'email',
  phone: 'phone', call: 'phone',
  facetime: 'facetime', facetime_audio: 'facetime_audio', whatsapp_call: 'whatsapp_call',
  signal_call: 'signal_call'
};

export function toChannel(raw: unknown): ChannelKey | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CHANNEL_ALIASES[key] ?? (CHANNELS.has(key as ChannelKey) ? (key as ChannelKey) : null);
}

/**
 * Everything a stored person must survive before it reaches the engine.
 *
 * `getSuggestion` calls `detectPattern` first, so one bad row used to take down the whole
 * Today screen (defect 2). The guard belongs here, at the boundary, rather than at each of
 * the four call sites: a row that was never valid should not get as far as the engine.
 */
function normalisePerson(p: Person): Person {
  const history: SentimentReading[] = (Array.isArray(p.sentimentHistory) ? p.sentimentHistory : [])
    .filter((r): r is SentimentReading => !!r && isSentimentKey(r.key) && typeof r.at === 'string')
    // Defect 1: the detector reads slice(-3), so ascending is not a preference, it is the
    // contract. Stored newest-first, every trend reported backwards.
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-MAX_SENTIMENT_HISTORY);

  const relations = (Array.isArray(p.relations) ? p.relations : [])
    .filter((r): r is RelationKey => RELATION_PRECEDENCE.includes(r));

  const preferred = toChannel(p.contact?.preferredChannel);

  return {
    ...p,
    relations: relations.length ? relations : ['friend'],
    sentimentHistory: history,
    recentSentiment: isSentimentKey(p.recentSentiment)
      ? p.recentSentiment
      : (history.at(-1)?.key ?? 'warm'),
    treasures: Array.isArray(p.treasures) ? p.treasures : [],
    quotes: Array.isArray(p.quotes) ? p.quotes : [],
    contact: {
      hasContact: !!p.contact?.hasContact,
      phone: p.contact?.phone || undefined,
      email: p.contact?.email || undefined,
      preferredChannel: preferred ?? undefined
    }
  };
}

export async function loadAll(db: TreasuredDB): Promise<{ data: AppData; prefs: Prefs; fresh: boolean }> {
  const [people, rings, ringMembers, settings] = await Promise.all([
    db.people.toArray(), db.rings.toArray(), db.ringMembers.toArray(), db.settings.toArray()
  ]);

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));
  const data = emptyData();

  data.people = people.map(normalisePerson);
  data.rings = rings.slice().sort((a, b) => a.position - b.position);

  // Membership of people or rings that no longer exist is dropped rather than repaired:
  // it is unreachable either way, and carrying it forward would let it resurface if an id
  // were ever reused.
  const personIds = new Set(data.people.map((p) => p.id));
  const ringIds = new Set(data.rings.map((r) => r.id));
  data.ringMembers = ringMembers
    .filter((m) => personIds.has(m.personId) && ringIds.has(m.ringId))
    .map(({ ringId, personId, createdAt }) => ({ ringId, personId, createdAt }));

  if (typeof s.countryCode === 'string' && s.countryCode) data.countryCode = s.countryCode;
  data.activeRingId = typeof s.activeRingId === 'string' && ringIds.has(s.activeRingId)
    ? s.activeRingId
    : (data.rings.find((r) => r.isDefault)?.id ?? DEFAULT_RING_ID);

  const prefs: Prefs = { ...DEFAULT_PREFS, laterUntil: {} };
  for (const k of PREF_KEYS) if (k in s) (prefs as unknown as Record<string, unknown>)[k] = s[k];
  if (!prefs.laterUntil || typeof prefs.laterUntil !== 'object') prefs.laterUntil = {};

  return { data, prefs, fresh: settings.length === 0 && people.length === 0 };
}

/** Write the whole data slice. One transaction keeps it atomic; the clear-then-put is what
 *  guarantees a deleted person leaves nothing behind in any table. */
export async function saveData(db: TreasuredDB, d: AppData): Promise<void> {
  const personIds = new Set(d.people.map((p) => p.id));
  const ringIds = new Set(d.rings.map((r) => r.id));
  const members = d.ringMembers.filter((m) => personIds.has(m.personId) && ringIds.has(m.ringId));

  await db.transaction('rw', [db.people, db.rings, db.ringMembers, db.settings], async () => {
    await Promise.all([db.people.clear(), db.rings.clear(), db.ringMembers.clear()]);
    await Promise.all([
      db.people.bulkPut(d.people),
      db.rings.bulkPut(d.rings),
      db.ringMembers.bulkPut(members.map((m) => ({ key: m.ringId + '|' + m.personId, ...m }))),
      db.settings.bulkPut(DATA_KEYS.map((key) => ({ key, value: d[key] })))
    ]);
  });
}

export async function savePrefs(db: TreasuredDB, p: Partial<Prefs>): Promise<void> {
  await db.settings.bulkPut(Object.entries(p).map(([key, value]) => ({ key, value })));
}

export async function wipe(db: TreasuredDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

/**
 * Ask the browser to stop treating this data as disposable.
 *
 * Safari evicts storage for sites not installed to the home screen after about seven days
 * of no visits. That is not a corner case for an app someone opens once a fortnight — it is
 * the whole history, gone. Installed PWAs are exempt, which is why the install guide is a
 * data-safety feature here rather than polish.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
