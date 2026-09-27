# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/riverma/treasured/compare/v1.1.0...HEAD
[1.0.0]: https://github.com/riverma/treasured/releases/tag/v1.0.0
