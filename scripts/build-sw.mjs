// Injects the built asset list and a content hash into the service worker (spec §5.16.2).
// Run after `vite build`; the hash makes every deploy a fresh cache generation.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const template = join(root, 'src/sw.js');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist)
  .map((f) => './' + relative(dist, f).split('\\').join('/'))
  .filter((f) => f !== './sw.js' && !f.endsWith('.map'))
  .sort();

// index.html is served for every route; list it once, explicitly
const assets = ['./', ...files.filter((f) => f !== './index.html')];

const hash = createHash('sha256');
for (const f of files) hash.update(readFileSync(join(dist, f.slice(2))));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync(template, 'utf8')
  .replace('__SW_VERSION__', version)
  .replace('__SW_ASSETS__', JSON.stringify(assets, null, 2));

writeFileSync(join(dist, 'sw.js'), sw);
console.log('sw.js: ' + assets.length + ' assets, cache treasured-' + version);
