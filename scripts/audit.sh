#!/usr/bin/env bash
# A security pass over the repo before anything is pushed or deployed.
# Read-only: it reports, it never changes files.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
check() { if [ -n "$1" ]; then printf '%s\n' "$1" | sed 's/^/  /'; fail=1; else echo "  clean"; fi; }

say "Secrets and credentials in tracked files"
check "$(git grep -nIE '(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|api[_-]?key["'"'"']?\s*[:=]\s*["'"'"'][A-Za-z0-9/_+-]{16,})' -- . ':!*.lock' ':!package-lock.json' ':!mockup/*' || true)"

say "Personal data outside the sample people"
check "$(git grep -nIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' -- src scripts spec .github README.md 2>/dev/null | grep -v 'example\.' || true)"

say "Network calls in the app (Treasured is offline by design)"
check "$(git grep -nIE '\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\b' -- src ':!src/sw.js' ':!src/lib/sw-client.ts' || true)"

say "Analytics, trackers, third-party origins"
check "$(git grep -nIE '(googletagmanager|google-analytics|gtag\(|plausible|matomo|sentry|hotjar|cdn\.jsdelivr|unpkg\.com|fonts\.googleapis)' -- src index.html public || true)"

say "Dangerous DOM sinks"
check "$(git grep -nIE '(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function\()' -- src || true)"
check "$(git grep -nI '{@html' -- src || true)"

say "Links that open a new tab without rel=noopener"
check "$(git grep -nI 'target="_blank"' -- src index.html | grep -v 'noopener' || true)"

say "Contact data leaving the device (import must stay in the browser)"
check "$(git grep -nIE '\b(FormData|URL\.createObjectURL\([^)]*upload|navigator\.clipboard\.read)\b' -- src ':!src/lib/core/ics.ts' || true)"

say "Person data in the shipped source (Treasured ships empty)"
# The app must contain no people: no seed, no demo contacts, no sample biographies.
# A fresh install holds nobody until someone is added or imported. These three checks are
# what stop that promise quietly decaying in a later commit.
check "$(git ls-files 'src/**/seed*' 'src/**/*seed*' || true)"
check "$(git grep -nIE '\+[0-9]{10,}|\b[0-9]{3}-[0-9]{3}-[0-9]{4}\b' -- src || true)"
check "$(git grep -nIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' -- src | grep -v 'example\.' || true)"

say "Dependency advisories (production tree)"
if npm audit --omit=dev --audit-level=high >/tmp/treasured-audit.txt 2>&1; then
  echo "  no high or critical advisories"
else
  sed 's/^/  /' /tmp/treasured-audit.txt | head -40
  fail=1
fi

say "Dependency licences"
node scripts/check-licenses.mjs | sed 's/^/  /' || fail=1

say "Files that would ship"
if [ -d dist ]; then
  find dist -type f | sed 's|^dist/|  |' | sort
else
  echo "  no dist yet; run npm run build"
fi

say "Result"
if [ "$fail" -eq 0 ]; then echo "  audit clean"; else echo "  findings above need a look before pushing"; fi
exit "$fail"
