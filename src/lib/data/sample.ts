// Neutral sample records, for the dev harness and the test suite only.
//
// This is deliberately not a seed and deliberately not people. Treasured ships with an
// empty database: a fresh install has nobody in it until someone is added by hand or
// imported. Nothing here is ever written by the app in production.
//
// The records carry no names, no biographies, no quotes and no contact details — only the
// *shapes* the code needs exercised: eleven distinct palettes, five rings with the default
// one virtual, a spread of relation mixes, and sentiment histories that reach every branch
// of the weather-pattern detector.

import type {
  AppData, PaletteKey, Person, RelationKey, Ring, RingMember, SentimentKey
} from '$lib/core/types';
import { palette } from '$lib/data/palettes';
import { ago } from '$lib/core/time';
import { DEFAULT_RING_ID } from '$lib/store/db';

/** Stable ids, so ring membership survives a regenerate. */
export const SAMPLE_IDS: string[] = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-00000000000b'
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const;

const PALETTES: PaletteKey[] = [
  'rose', 'amber', 'terracotta', 'coral', 'sage',
  'indigoSoft', 'mauve', 'teal', 'slate', 'olive', 'violet'
];

const RELATIONS: RelationKey[][] = [
  ['romantic'], ['family'], ['family'], ['family'], ['friend'], ['friend'],
  ['friend'], ['friend'], ['friend', 'professional'], ['friend', 'professional'], ['friend']
];

const LAST_SEEN = ['2 days', '3w', '4w', '1w', '5w', '2w', '8w', '3w', '6w', '1w', '2w'];

/* Histories chosen to reach every detector branch rather than to depict anyone:
   steady_warm, cooling, warming, volatile, steady_cool, shifting, too_few. */
const HISTORIES: Array<Array<[SentimentKey, string]>> = [
  [['warm', '4mo'], ['loving', '3mo'], ['loving', '2mo'], ['loving', 'now']],          // steady_warm
  [['warm', '4mo'], ['rooted', '3mo'], ['cautious', '2mo'], ['wistful', 'now']],        // cooling
  [['distant', '4mo'], ['cautious', '3mo'], ['at_ease', '2mo'], ['warm', 'now']],       // warming
  [['loving', '4mo'], ['heavy', '3mo'], ['energized', '2mo'], ['conflicted', 'now']],   // volatile
  [['distant', '3mo'], ['distant', '2mo'], ['foggy', '1mo'], ['distant', 'now']],       // steady_cool
  [['warm', '4mo'], ['warm', '3mo'], ['cautious', '2mo'], ['distant', 'now']],          // shifting
  [['curious', '1mo'], ['curious', 'now']],                                             // too_few
  [['at_ease', '3mo'], ['at_ease', '2mo'], ['at_ease', 'now']],
  [['warm', '4mo'], ['curious', '3mo'], ['curious', 'now']],
  [['energized', '3mo'], ['energized', '2mo'], ['energized', 'now']],
  [['curious', '1mo'], ['curious', '3w'], ['curious', 'now']]
];

interface SampleRing { id: string; name: string; color: string; isDefault?: boolean; members?: number[] }

const RINGS: SampleRing[] = [
  { id: DEFAULT_RING_ID, name: 'Everyone', color: '#b8895a', isDefault: true },
  { id: 'ring-2', name: 'Ring two', color: '#c9904f', members: [1, 2, 3] },
  { id: 'ring-3', name: 'Ring three', color: '#7a9d7f', members: [4, 5, 6] },
  { id: 'ring-4', name: 'Ring four', color: '#6781a3', members: [8, 9] },
  { id: 'ring-5', name: 'Ring five', color: '#a692c4', members: [10] }
];

/** Build the sample slice. `now` is injectable so tests get a fixed clock. */
export function sampleData(now: Date = new Date()): AppData {
  const createdAt = ago('1y', now);

  const people: Person[] = SAMPLE_IDS.map((id, i) => {
    const history = (HISTORIES[i] ?? []).map(([key, when]) => ({ key, at: ago(when, now) }));
    return {
      id,
      fullName: LETTERS[i] ?? 'X',
      name: LETTERS[i] ?? 'X',
      initial: LETTERS[i] ?? 'X',
      essence: '',
      palette: palette(PALETTES[i] ?? 'rose'),
      lastSeenAt: ago(LAST_SEEN[i] ?? 'now', now),
      since: '',
      birthday: null,
      recentSentiment: history.at(-1)?.key ?? 'warm',
      sentimentHistory: history,
      relations: RELATIONS[i] ?? ['friend'],
      treasures: [],
      quotes: [],
      contact: { hasContact: false },
      createdAt,
      updatedAt: history.at(-1)?.at ?? createdAt
    };
  });

  const rings: Ring[] = RINGS.map((r, i) => ({
    id: r.id, name: r.name, description: '', color: r.color,
    isDefault: !!r.isDefault, position: i, createdAt
  }));

  const ringMembers: RingMember[] = RINGS.flatMap((r) =>
    (r.members ?? [])
      .map((idx) => SAMPLE_IDS[idx])
      .filter((personId): personId is string => typeof personId === 'string')
      .map((personId) => ({ ringId: r.id, personId, createdAt }))
  );

  return { people, rings, ringMembers, activeRingId: DEFAULT_RING_ID, countryCode: '1' };
}
