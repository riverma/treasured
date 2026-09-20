# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] — 2026-09-19

### Added
- Project scaffold on the house stack: Vite 8, Svelte 5 (runes), TypeScript 5.9, Dexie,
  a hand-rolled service worker, and self-hosted Fraunces + DM Sans variable fonts.
- Ahimsa design tokens transcribed to CSS custom properties, using the same variable
  names as Giraffy so the shared component layer ports between the two apps.
- The fourteen person palettes, with `paletteForNewPerson()` — assignment logic the
  source mockup never had, since it hard-coded one gradient for every new person.
- The suggestion engine, sentiment vocabulary and weather-pattern detector, ported from
  the prototype scaffold.
- `/` gallery: every type composite, all fourteen palettes, and the component layer.
- The release gates from the house stack, ported from Giraffy: `check-offline.mjs`, which
  mechanically proves the no-network claim against the built output; `check-licenses.mjs`;
  `audit.sh`; `deploy.sh`; and the Playwright config. `package.json` already named all five
  before any of them existed, so `npm run audit`, `check-licenses`, `check-offline`, `deploy`
  and `test:e2e` were all broken entry points.
- `check-offline` permits the messaging hosts the reach-out sheets navigate to (`wa.me`,
  `signal.me`, `t.me`) as links a person taps, never as origins the app fetches.
- `audit.sh` gains a Treasured-specific gate: contact data must never leave the device, so
  upload-shaped calls in the import path fail the audit.
- The persistence layer: `TreasuredDB` on Dexie, with `loadAll` / `saveData` / `savePrefs` /
  `wipe`. The whole slice is loaded at boot and written back in one transaction, which is
  what makes a deletion incapable of leaving an orphan — there is no cascade to forget.
- `requestPersistence()`, asking the browser to stop treating this data as disposable.
  Safari evicts storage for uninstalled sites after about seven days, which for an app you
  open once a fortnight is the whole history rather than a cache.
- The seed: the mockup's eleven people and five rings, as data. Fixed UUIDs so ring
  membership and backups keep pointing at the right person across reseeds.
- `core/time.ts` and the hash router, whose three main screens are scroll-snap panes rather
  than tabs, since the screens spec refuses a tab bar.
- `store/data.svelte.ts`: the reactive slice and its actions — record a sentiment, mark
  someone seen, remember a channel, add or remove a person, ring membership, and "Later".

### Fixed
- Seed time is resolved against the clock rather than frozen as prose. The mockup wrote
  `lastSeen: "2 days"` and `when: '3mo'` as display strings, so a demo opened a year later
  would have claimed a year-old conversation happened on Tuesday.
- Sentiment history is normalised on the way out of storage, not at each reader: unknown
  keys dropped, order forced oldest-first, and the log capped at thirty readings.
- Ring membership naming a person or ring that no longer exists is dropped on both read and
  write, so an id can never be reused into someone else's ring.
- The app persisted nothing at all. `load()` and `reset()` handed the `$state` proxy
  straight to Dexie, which answers a proxy with `DataCloneError`: the transaction wrote
  zero rows while the screen rendered a full database from memory, so the loss would only
  have appeared on the next launch. All writes now go through one snapshotting path.

### Added (testing)
- `tests/e2e/persistence.spec.ts`, which reads row counts out of IndexedDB in a real
  browser against the real build. The unit suite cannot see this class of bug: under
  fake-indexeddb the same broken code passes, because its structured-clone implementation
  accepts proxies a browser refuses. Verified by reintroducing the bug and watching all
  three specs fail.
- `tests/unit/data-store.test.ts` for the store's own logic — capping, deletion, ring
  membership, and "Later" genuinely lapsing.
- `/dev/data`, the Phase 2 harness: ring counts, the weekly three, and every person's
  suggestion and detected pattern. Dev only — the dynamic import sits behind
  `import.meta.env.DEV`, so it is eliminated from a production build rather than merely
  unrouted.

### Fixed
- Sentiment history is read oldest-first. The data-model spec ordered it newest-first
  while the pattern detector reads the last three entries, which silently inverted every
  trend: cooling relationships were reported as warming.
- An unknown sentiment key no longer throws. It was read unguarded by the detector, which
  `getSuggestion` calls first, so one stale row took down the whole Today screen.
- Coaching speaks in the voice of the closest relation rather than whichever one happened
  to be first in the array.
- Connections ranking breaks ties deterministically, so the same data always produces the
  same weekly three.
- Palette contrast: ink darkened where it failed WCAG AA, `softColor` raised from 55% to
  72% alpha, and the mauve ramp lightened — no ink could clear AA against it as authored.
  See `tests/unit/contrast.test.ts` for the measurements and the residual gap.

- Today: the card face, the coaching line, and the action row. It shows whoever most needs
  attention until the deck arrives in Phase 5.
- The reach-out roster. Every channel is offered, because the web cannot be told what is
  installed — so `https://` universal links are preferred, which open the native app when
  it is there and the vendor's own page when it is not. `sms:`, `tel:` and `facetime:` are
  the exceptions, being Apple's own and not removable from an iPhone.
- Per-person channel memory: the one you chose last time floats to the top, marked
  "Last used". That is the whole of what install detection would have bought, recovered
  from local behaviour rather than by inspecting what you own.
- The shared `Sheet` chrome, with the close button in the chrome itself rather than in each
  sheet — three ways out, always, and omission made structurally impossible.
- `About`, carrying the version at the bottom, built from `package.json` so the app, the
  changelog and the package cannot disagree.
- `spike/`: a standalone, dependency-free page answering the five Phase 0 questions on real
  hardware — standalone link handling, `.ics` delivery, what the CSP blocks, storage
  durability, and framerate under five glass layers. It carries the app's own CSP so the
  third question measures the real policy.

### Changed
- **No emoji anywhere.** The sixteen sentiments were ported from the prototype carrying an
  emoji each; Ahimsa refuses emoji and ships no icon set. A sentiment is now a word, placed
  by hue, and the hue is banded by warmth rather than mapped to a traffic light — a cool
  reading is slate or indigo, never red. Feeling distant from someone is information, not a
  fault, and the palette should not imply otherwise.

### Fixed
- The seed marked everyone `hasContact: true` and then listed channel *names* with no
  numbers behind them, so the reach-out sheet had nothing to build a link from and fell
  through to its empty state for all eleven people. Seed contacts now carry 555-01xx
  numbers, the range reserved for fiction, and example.com addresses.

[Unreleased]: https://github.com/riverma/treasured/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/riverma/treasured/releases/tag/v0.2.0
