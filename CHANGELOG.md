# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] — 2026-09-27

A UX pass over getting around the app, prompted by the deck feeling like a dead end once you
had opened a card. It was not one problem but four stacked together, two of them functional
breakage on desktop.

### Fixed

- **Deck cards did not open when clicked with a mouse.** Capturing the pointer on
  `pointerdown` retargets the synthesised click to the stage, so a card's own handler never
  ran. Touch computed the click target differently and was unaffected, which is how it
  survived — but on the macOS dock app the deck was a gallery you could not open anyone from.
  Capture is now taken lazily, once the pointer has moved far enough to be unambiguously a
  drag, which is also exactly when suppressing the click is what you want.
- **Today and This week were a one-way trap for any pointer.** `overscroll-behavior: contain`
  was set on both axes, so a region that cannot scroll sideways still swallowed the
  horizontal wheel instead of letting it chain out to the pane surface. Only the deck — which
  has no scroll region — could be left. Now contained on the vertical axis only.
- **The pane indicator was three dots that were not buttons.** Not focusable, no handler, and
  announcing themselves to screen readers as tabs that could not be activated. They also sat
  at 1.3:1 against the canvas, which is well under the 3:1 a control needs.
- **Tab used to teleport you between screens.** All three panes are always in the DOM; from
  Today, one Tab landed on the deck's offscreen Next button and six landed on a Connections
  card, at which point the browser scrolled focus into view and the screen changed underneath
  you. The two panes you are not looking at are now `inert`.
- **There was no way to add a second person.** The only route was Settings → Bring people in →
  Add by hand, and that was broken: it ignored the deep link and showed the welcome splash
  again, looping back to the importer you had just left.
- **A tapped deck card pinned Today to that person** for the rest of the session, with nothing
  saying so and no way out.

### Added

- **A named rail** — Deck · Today · This week — replacing the dots. Words rather than a mark,
  because the design system ships no icon set and because a word is the thing that teaches
  someone the screen exists. Real buttons, arrow-key navigable, with the hit area at 44px
  while the painted mark stays as small as it was.
- **Today has a header and an Unpin control**; it was the only pane that named neither itself
  nor anywhere else.
- **Add** on the deck header, and in its empty state — which previously named an action the
  screen did not offer.
- **The update notice moved to the top** and now actually updates. A waiting service worker
  keeps waiting until every window under the old one closes, so the old Reload button — a
  plain `location.reload()` — brought you back on the same version. It now tells the waiting
  worker to skip waiting and reloads once it has taken control.
- **Check for a new version** in Settings, which says so either way: being already current is
  an answer worth giving.
- **About credits Rishi Verma.**

### Changed

- Ghost buttons carry an outline instead of being bare grey text. The rule throughout is that
  leaving weighs the same as continuing; equal metrics alone did not deliver it, because grey
  text beside a filled pill reads as a caption.
- Touch targets raised to 44px — `.btn` was 40, and the small pill, ring pill and header Back
  were all under 30. The painted sizes are unchanged; the hit areas are not.
- The deck's previous-card button is **Previous**, not Back, which every sub-screen also uses
  one swipe away.

[1.2.0]: https://github.com/riverma/treasured/releases/tag/v1.2.0

## [1.1.0] — 2026-09-26

### Added

- **A person can be changed after the fact.** Until now they were write-once: a mistyped
  name was permanent unless you deleted them and started again — and deleting was only
  reachable from the dev harness, which is compiled out of a production build. The edit
  screen at `#/card/<id>` covers name, essence, relations, number, email, birthday, since
  and their colour, and is reached by flipping a card over and tapping Edit.
- **Remove this person**, in production for the first time. It asks once, and the keep-them
  button carries the same weight as the confirm.

### Fixed

- **The app had no icon.** `apple-touch-icon` pointed at a real file that was a flat
  placeholder square with no mark on it, so an installed Home Screen app showed nothing. The
  icon is now the monogram the app already draws on every person card — an italic serif T on
  glass over the dawn gradient. The letter is a path extracted from the project's own
  Fraunces Italic at `wght 300`, not live text, so the icon does not depend on the font being
  installed wherever it is rendered.
- **"Not secure" in a desktop web app, and no HTTPS at all.** The certificate had never been
  issued: the custom domain was registered with GitHub about eighty seconds before its DNS
  record existed, so provisioning was attempted against a hostname that did not resolve, and
  was never retried. Six days on it was still serving GitHub's own wildcard. Re-attaching the
  domain re-triggered it; HTTPS is now issued by Let's Encrypt and enforced, and http
  redirects.
- The initial on a person's card is recomputed when their name changes. It was set once at
  creation and never again, so a rename would have left the old letter behind.

[1.1.0]: https://github.com/riverma/treasured/releases/tag/v1.1.0

## [1.0.1] — 2026-09-20

### Fixed

- **Adding a person did nothing, silently, on a plain http origin.** `crypto.randomUUID()`
  is a secure-context API: on `http://` it is not merely restricted, it is absent. Creating
  a person threw, the promise rejected into nothing, and the Keep-them button went quiet and
  then stayed disabled — with no message, because nothing was catching the failure. This is
  not hypothetical: a freshly deployed custom domain serves over http for however long the
  certificate takes to be issued, and anyone opening the app in that window hit it.
  Ids are now built from `crypto.getRandomValues()` when the convenience method is missing,
  with a final fallback so the app cannot be stopped by a missing API.
- **Failures are no longer silent.** Saving a person, and importing a file of them, both now
  catch, say what happened in the app's own voice, and re-enable the button. A control that
  goes quiet and stays dead leaves someone tapping at a screen with no idea whether they did
  something wrong.

[1.0.1]: https://github.com/riverma/treasured/releases/tag/v1.0.1

## [1.0.0] — 2026-09-19

The first release. Treasured is a private, local-only companion for the people you love:
one card each, a note on how things stand between you, and a nudge toward the next small
kindness. No accounts, no servers, no analytics, no gamification.

### The app ships empty

There is no seed, no sample people and no demo contacts. A fresh install holds nobody until
someone is added by hand or brought in from a file, and `audit.sh` fails the build on any
seed file, phone-shaped literal or non-example address under `src/`.

### Added

- **Today** — one person, their gradient, the coaching line the engine chose for their
  relation and sentiment, and three ways to reach them.
- **The deck** — everyone as a stack you thumb through. A drag moves exactly one card, and
  so does a flick: a list that flies past under your thumb is a feed.
- **This week** — the three people who would most welcome hearing from you. "Later" genuinely
  suppresses, and the fourth-ranked person steps up so the screen still shows three.
- **The card back** — treasures, their words, and the weather over the relationship: seven
  readings and a sentence. No chart, no score.
- **Rings** — circles you keep people in, not tiers you rank them by. The default ring holds
  everyone and stores nothing, so it cannot drift out of step with who you know.
- **Reach-out** — every channel offered, because the web cannot be told what is installed.
  Universal links open the native app if you have it and the vendor's page if you do not.
  The channel you chose last time floats to the top, learned rather than detected.
- **Plans** — a calendar file with a one-hour alarm, plus a clipboard fallback.
- **Contact import** — a hand-written vCard 2.1/3.0/4.0 and Google CSV reader. The file is
  parsed in the browser and never uploaded; nothing is selected by default.
- **Onboarding** — four skippable steps, which since the app ships empty is how anyone gets in.
- **Backup** — JSON export and restore. On the web this is the only durable backup there is.
- **Add to Home Screen** — the hub's `#install` contract, and the thing that stops a browser
  collecting your data after a week of not opening the app.

### Ahimsa

Cream instead of white, serif for the heart and sans for the utility. No emoji and no icon
set: a sentiment is a word placed by hue, banded by warmth rather than mapped to a traffic
light — a cool reading is slate or indigo, never red, because feeling distant from someone
is information, not a fault. Every sheet has a visible way out. Leaving and continuing carry
the same weight everywhere they appear.

### Offline by construction

`connect-src 'none'` means the app cannot make a network request however the code changes,
and `check-offline` proves it against the built output before every deploy.

[Unreleased]: https://github.com/riverma/treasured/compare/v1.2.0...HEAD
[1.0.0]: https://github.com/riverma/treasured/releases/tag/v1.0.0
