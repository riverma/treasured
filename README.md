<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

# Treasured

**A wallet for the people you love.**

One card per person, evidence-based suggestions for richer relationships.
Offline, on your own device, with no accounts and no servers.

[Open it live](https://treasured.riverma.com) · [All apps](https://apps.riverma.com)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable%20%C2%B7%20offline-5a5.svg)](https://treasured.riverma.com)

</div>

## Privacy

**No data collected · no tracking · runs entirely on your device.** Enforced by a
`connect-src 'none'` Content Security Policy, not just promised. See [PRIVACY.md](./PRIVACY.md).

## About

- **Installable PWA** — add it to your home screen and use it fully offline.
- **No accounts, no subscription, no notifications, no streaks.** Built under the
  [Ahimsa design system](../Design%20Systems/Ahimsa), which refuses the dark-pattern vocabulary outright.

## Quick start

```sh
npm install
npm run dev
```

To reach it from a phone, the dev server needs HTTPS — service workers and installability
both require a secure context, and a LAN IP is not one:

```sh
cloudflared tunnel --url http://localhost:5173
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Build, then inject the asset list into the service worker |
| `npm run check` | `svelte-check` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run deploy` | Dry run by default; `--push` publishes to `gh-pages` |

## Versioning & changelog

Uses [Semantic Versioning](https://semver.org). See [CHANGELOG.md](./CHANGELOG.md).

## License

[GNU Affero General Public License v3.0](./LICENSE) © Rishi Verma. Bundled fonts retain
their own licenses (SIL Open Font License 1.1; see `public/fonts/OFL-*.txt`).
