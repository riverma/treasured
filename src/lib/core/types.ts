// The domain model. Ported from the prototype scaffold (lib/data/types.ts) with the
// fixes listed against each change — see the plan's §6 and the spec bundle's
// docs/04_DATA_MODEL.md.

export type SentimentKey =
  | 'warm' | 'treasured' | 'loving' | 'grateful' | 'energized'
  | 'seen' | 'light' | 'curious' | 'at_ease' | 'rooted'
  | 'wistful' | 'cautious'
  | 'distant' | 'foggy'
  | 'heavy' | 'conflicted';

export type RelationKey = 'friend' | 'family' | 'romantic' | 'professional';

/** Most intimate first. `getSuggestion` speaks in the voice of the closest relation.
 *  Fix for defect 3: the scaffold read `relations[0]` with no rule defined. Both
 *  multi-relation seed people are ['friend','professional'], which resolves to
 *  'friend' under the old and new behaviour alike, so no seed output changes. */
export const RELATION_PRECEDENCE: readonly RelationKey[] = ['romantic', 'family', 'friend', 'professional'];

export function primaryRelation(relations: readonly RelationKey[]): RelationKey {
  for (const r of RELATION_PRECEDENCE) if (relations.includes(r)) return r;
  return 'friend';
}

/** The seven canonical Ahimsa accents. Treasured keeps these rather than overriding them
 *  the way Giraffy does, because the person gradients are built from them. */
export type AccentKey = 'amber' | 'rose' | 'terracotta' | 'sage' | 'indigo' | 'violet' | 'slate';

export interface Sentiment {
  label: string;
  /** Drives weather-pattern detection. Keep these values stable. */
  warmth: -2 | -1 | 0 | 1 | 2;
  /**
   * The accent a chip is tinted with.
   *
   * Ahimsa ships no icon set and refuses emoji, so a sentiment is named in words and only
   * *placed* by hue. The mapping is by warmth band, and deliberately not a traffic light:
   * a cool reading is indigo or terracotta, never red, because nothing here is an error.
   * Feeling distant from someone is information, not a fault.
   */
  tint: AccentKey;
}

/** One reading. `at` is an ISO 8601 timestamp.
 *  Arrays of these are ALWAYS oldest-first: `detectPattern` reads `slice(-3)`.
 *  Fix for defect 1 — the spec's own query ordered these newest-first, which
 *  silently inverted every trend. `listSentimentHistory` sorts ascending. */
export interface SentimentReading {
  key: SentimentKey;
  at: string;
}

export interface PersonPalette {
  key: PaletteKey;
  gradientColors: string[];
  gradientLocations: number[];
  /** Fix for defect 5: the stored gradient carried an angle with nowhere to land. */
  angle: number;
  fontColor: string;
  /** fontColor at ~55% — derived, not authored. See lib/data/palettes.ts. */
  softColor: string;
  /** fontColor at 18% — derived. */
  lineColor: string;
}

export type PaletteKey =
  | 'dawn' | 'amber' | 'rose' | 'coral' | 'terracotta' | 'sage' | 'teal'
  | 'indigo' | 'violet' | 'slate' | 'cream' | 'indigoSoft' | 'mauve' | 'olive';

/** Canonical, lowercase, as stored. Display strings live in CHANNEL_LABELS.
 *  Fix for defect 6: the mockup's seed used 'iMessage' / 'Phone' / 'Slack'. */
export type MessagingApp = 'imessage' | 'whatsapp' | 'signal' | 'telegram' | 'email';
export type CallApp = 'phone' | 'facetime' | 'facetime_audio' | 'whatsapp_call' | 'signal_call';
export type ChannelKey = MessagingApp | CallApp;

export interface ContactInfo {
  hasContact: boolean;
  /** E.164: a leading plus, country code, then digits. Normalised on the way in. */
  phone?: string;
  email?: string;
  /** The channel this person was last reached through. Learned, never detected —
   *  the web cannot tell which apps are installed, so we remember what worked. */
  preferredChannel?: ChannelKey;
}

/** Fix for defect 4: these were `string[]`, so a single row could not be addressed
 *  for edit, reorder or delete without a later migration. */
export interface Treasure {
  id: string;
  content: string;
  position: number;
  createdAt: string;
}

export type Quote = Treasure;

export interface Person {
  id: string;
  fullName: string;
  /** Short/familiar name — the spec's `short_name`. */
  name: string;
  initial: string;
  essence: string;
  palette: PersonPalette;
  /** ISO 8601, or null when they have never been marked as seen. */
  lastSeenAt: string | null;
  /** Display string, e.g. "2019" or "birth". Not a date: the spec stores prose. */
  since: string;
  /** 'YYYY-MM-DD', or '--MM-DD' when the year is unknown (the common case). */
  birthday: string | null;
  recentSentiment: SentimentKey;
  /** Oldest-first. Capped at 30 by recordSentiment. */
  sentimentHistory: SentimentReading[];
  relations: RelationKey[];
  treasures: Treasure[];
  quotes: Quote[];
  contact: ContactInfo;
  createdAt: string;
  updatedAt: string;
}

export interface Ring {
  id: string;
  name: string;
  description: string;
  /** Flat accent colour, not a gradient. */
  color: string;
  /** Exactly one ring is the default; its membership is virtual (everyone). */
  isDefault: boolean;
  position: number;
  createdAt: string;
}

/** Ring membership is a row, not an array on the ring, so a person can leave one ring
 *  without rewriting another. Keyed `ringId + '|' + personId` in the store — the same
 *  compound-key idiom Giraffy uses for needPeople. */
export interface RingMember {
  ringId: string;
  personId: string;
  createdAt: string;
}

/** The whole user-owned slice. Small enough to load at boot and write back wholesale;
 *  see store/db.ts for why that is the right shape here. */
export interface AppData {
  people: Person[];
  rings: Ring[];
  ringMembers: RingMember[];
  /** The ring currently being browsed. Always a real ring id; falls back to the default. */
  activeRingId: string;
  /** Default country for E.164 normalisation, e.g. '1'. Set once in settings. */
  countryCode: string;
}

/** Sentiment history is capped so a long relationship cannot grow without bound.
 *  Thirty readings is roughly two years at the cadence the app invites. */
export const MAX_SENTIMENT_HISTORY = 30;

export interface PlanProposal {
  personId: string;
  title: string;
  /** 'YYYY-MM-DD' */
  date: string;
  timeOfDay: TimeOfDay;
  notes?: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late';

/** The hours the spec assigns to each slot (docs/03_FLOWS.md § Flow 6). */
export const TIME_OF_DAY_HOURS: Record<TimeOfDay, number> = {
  morning: 10,
  afternoon: 14,
  evening: 18,
  late: 21
};
