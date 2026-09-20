#!/usr/bin/env bash
# Publish Treasured to treasured.riverma.com (GitHub Pages, gh-pages branch, site at the root).
# Dry run by default: it builds, checks, and shows exactly what would be pushed.
# Pass --push to actually publish. Nothing is force-pushed without you asking for it.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
BRANCH="gh-pages"
DOMAIN="treasured.riverma.com"
PUSH=0
REMOTE="origin"

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    --remote=*) REMOTE="${arg#*=}" ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1. Working tree"
if [ -n "$(git status --porcelain)" ]; then
  echo "  uncommitted changes present; commit them first so the deploy matches a commit"
  git status --short
  exit 1
fi
SOURCE_SHA="$(git rev-parse --short HEAD)"
echo "  clean at $SOURCE_SHA"

say "2. Checks"
npm run check
npm test
npm run check-licenses
scripts/audit.sh

say "3. Build"
rm -rf dist
npm run build
npm run check-offline
echo "$DOMAIN" > dist/CNAME
touch dist/.nojekyll
du -sh dist | sed 's/^/  /'

say "4. What would be published"
find dist -type f | sed "s|^dist/|  |" | sort

if [ "$PUSH" -ne 1 ]; then
  say "Dry run"
  echo "  Nothing was pushed. Re-run with --push to publish to $REMOTE/$BRANCH."
  echo "  Serve the build locally first:  npx vite preview"
  exit 0
fi

say "5. Publishing to $REMOTE/$BRANCH"
# the lease below is only as fresh as the tracking ref, so fetch first; a brand new
# repository has no gh-pages yet, which is why this is allowed to fail
git fetch -q "$REMOTE" "$BRANCH" 2>/dev/null || echo "  no $BRANCH on $REMOTE yet; this will be the first"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R dist/. "$WORK/"
cd "$WORK"
git init -q
git checkout -q -b "$BRANCH"
git add -A
git -c user.useConfigOnly=false commit -q -m "Deploy $SOURCE_SHA"
# gh-pages holds only the built site, so each deploy replaces it wholesale
git push -q --force "$ROOT" "$BRANCH:$BRANCH"
cd "$ROOT"
if git rev-parse -q --verify "refs/remotes/$REMOTE/$BRANCH" >/dev/null; then
  git push "$REMOTE" "$BRANCH" --force-with-lease
else
  git push "$REMOTE" "$BRANCH"
fi
echo "  published. https://$DOMAIN"
