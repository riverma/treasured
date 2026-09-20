# Privacy

**Treasured collects nothing.** There is no analytics, no tracking, no accounts, and no
server to send anything to.

## Where your people live

On your device, in your browser's own storage. Nothing is uploaded, ever.

## How that is enforced, not just promised

The app ships a Content Security Policy with `connect-src 'none'`. The browser refuses any
network request the page tries to make, whatever the code does — so this is a property of
the app as shipped, not a habit of its authors. `npm run check-offline` verifies it, and
you can confirm it yourself: put the device in airplane mode and the app works unchanged.

Fonts, icons and every other asset are served from the app's own origin. There are no CDNs
and no third-party requests of any kind.

## What leaves the device, and when you ask it to

Three things, each one an action you take deliberately:

- **Reaching someone.** Tapping WhatsApp, Signal, Telegram, Messages or the phone hands
  that person's number to the app you chose, exactly as tapping a link would. Treasured
  cannot see whether you have those apps installed, and does not try to find out.
- **Planning time.** Saving a plan builds a calendar file on your device and hands it to
  your calendar. Treasured never learns whether you kept it.
- **Backing up.** Exporting writes a file where you choose to put it.

## Importing contacts

Contact files you import are read in the browser and never uploaded. Only the people you
explicitly tick are kept; the rest of the file is discarded when you leave the screen.
