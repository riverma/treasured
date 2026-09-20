// Treasured must work with the radio off, forever. Nothing in the build may
// reach the network: no third-party origins in the HTML, CSS, JS, or manifest.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const TEXT = /\.(html|css|js|webmanifest|json|svg)$/;
// Bundled library code carries inert URLs in its error messages; only the fetch check applies there.
const OURS = /^(index\.html|sw\.js|manifest\.webmanifest|icons\/|assets\/[^/]+\.css$)/;

// The only URLs allowed to appear are ones a person may choose to open, never ones the app fetches.
// The messaging hosts are reach-out targets the user taps: a universal link opens the native app
// when it is installed and the vendor's own page when it is not, so there is never a dead end.
const ALLOWED_LINKS = [
  'https://treasured.riverma.com',
  'https://www.gnu.org/licenses/agpl-3.0.html',
  'https://github.com/riverma/treasured',
  'http://www.w3.org/2000/svg',
  'https://wa.me/',
  'https://signal.me/',
  'https://t.me/'
];

const FETCHING = [
  /<script[^>]+src=["']https?:/i,
  /<link[^>]+href=["']https?:/i,
  /@import\s+(?:url\()?["']https?:/i,
  /url\(\s*["']?https?:/i,
  /\bfetch\(\s*["'`]https?:/i,
  /new\s+(?:XMLHttpRequest|WebSocket|EventSource)\b/i,
  /\bimportScripts\(\s*["']https?:/i
];

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const f = join(dir, n);
    return statSync(f).isDirectory() ? walk(f) : [f];
  });
}

let problems = 0;
for (const file of walk(dist).filter((f) => TEXT.test(f))) {
  const rel = relative(dist, file);
  const text = readFileSync(file, 'utf8');
  for (const re of FETCHING) {
    if (re.test(text)) { console.error('  ' + rel + ': matches ' + re); problems++; }
  }
  if (!OURS.test(rel)) continue;
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (!ALLOWED_LINKS.some((a) => url.startsWith(a))) { console.error('  ' + rel + ': unexpected URL ' + url); problems++; }
  }
}

console.log(problems === 0 ? 'offline: no network references in dist' : problems + ' network reference(s) found');
process.exit(problems === 0 ? 0 : 1);
