# Phase 0 spike

Five questions that have to be answered on a real iPhone before Phase 3's architecture can
be trusted. This is not part of the app build — it is a single dependency-free page that
must be installable on its own.

## Run it

Service workers, installability and `navigator.storage.persist()` all require a secure
context. `localhost` is exempt; your phone reaching this machine by LAN IP is not. So the
page needs to be served over HTTPS:

```sh
npx serve spike -l 4180          # or any static server
cloudflared tunnel --url http://localhost:4180
```

Open the tunnel URL in Safari on the iPhone, then **Share → Add to Home Screen**, and
**launch it from the icon**. Standalone mode is the entire point: link handling and storage
durability both behave differently there than in a Safari tab. The page tells you at the
top which mode it is in.

Work down the page, tap "Copy results", and paste them back.

## What each question decides

| | Question | What it settles |
|---|---|---|
| 1 | Do `sms:` / `facetime://` / `https://wa.me/…` launch from standalone, and is this page still intact on return? | Whether the reach-out sheet works at all. The app's core action depends on it. If custom schemes are swallowed, the roster falls back to universal links for everything except `sms:`/`tel:`. |
| 2 | Which of the three `.ics` hand-offs opens the Calendar import sheet? | Which one Phase 7 implements. The clipboard fallback ships regardless. |
| 3 | What does Giraffy's CSP baseline block? | Whether `default-src 'none'` survives contact with Q1 and Q2, or needs `blob:` / `data:` added. This is the strongest part of the privacy story and it must survive. |
| 4 | Does `storage.persist()` return true once installed? | Whether the install guide is genuinely a data-safety feature. It also writes a row — relaunch in a week and check it is still there. |
| 5 | Does five-layer `backdrop-filter` hold 60fps? | Whether Today's glass stack is affordable, or needs capping. |

## Notes

- The phone number is a placeholder (`+15550101234`). Edit `PHONE` at the top of the script
  if you want the links to open a real thread.
- Q3 records CSP violations automatically as you trigger them in Q1 and Q2 — there is
  nothing to tap.
- The page deliberately carries the same CSP the app ships, so Q3 measures the real policy
  rather than a permissive stand-in.
