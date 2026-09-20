// Every dependency Treasured ships or builds with must be free software.
// Fails the build on anything outside the allow-list, or on a package with no licence at all.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set([
  'MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'CC0-1.0',
  'AGPL-3.0-or-later', 'GPL-3.0-or-later', 'LGPL-3.0-or-later', 'MPL-2.0',
  'Unlicense', 'BlueOak-1.0.0', 'Python-2.0', 'OFL-1.1', 'CC-BY-4.0'
]);

/** "(MIT OR Apache-2.0)" and "MIT AND ISC" both pass when every named licence is allowed. */
function ok(expr) {
  if (!expr) return false;
  return expr
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .every((l) => ALLOWED.has(l));
}

const root = new URL('..', import.meta.url).pathname;

/** Every installed package, including scoped ones and nested node_modules. */
function collect(dir, out = new Map()) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === '.bin' || name === '.package-lock.json') continue;
    const full = join(dir, name);
    if (name.startsWith('@')) { collect(full, out); continue; }
    const manifest = join(full, 'package.json');
    if (!existsSync(manifest)) continue;
    const id = full.slice(full.indexOf('node_modules/') + 13);
    if (!out.has(id)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
        out.set(id, pkg.license ?? (Array.isArray(pkg.licenses) ? pkg.licenses.map((l) => l.type).join(' OR ') : null));
      } catch {
        out.set(id, null);
      }
    }
    collect(join(full, 'node_modules'), out);
  }
  return out;
}

const seen = collect(join(root, 'node_modules'));
const bad = [...seen].filter(([, lic]) => !ok(lic));
for (const [name, lic] of bad) console.error('  ' + name + ': ' + (lic ?? 'no licence field'));
console.log(seen.size + ' packages checked, ' + bad.length + ' outside the allow-list');
if (bad.length) {
  console.error('\nTreasured ships only free software. Replace or remove the packages above.');
  process.exit(1);
}
