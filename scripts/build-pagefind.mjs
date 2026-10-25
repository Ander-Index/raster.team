#!/usr/bin/env bun
/**
 * Build Pagefind from LISTED blog posts only.
 *
 * `dist/sitemap-0.xml` is our indexable-route manifest (it already omits
 * unlisted posts, noindex pages and public sub-sites). We stage just those
 * post HTML files in a temporary directory, index only the article body,
 * then write the bundle into `dist/_pagefind`.
 *
 * This intentionally avoids Pagefind's default whole-dist crawl, which
 * would index navigation/footer chrome and the vendored Chapbook/Ink games
 * under `public/`.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const sitemap = join(dist, 'sitemap-0.xml');
const output = join(dist, '_pagefind');

function fail(message) {
  throw new Error(`[pagefind] ${message}`);
}

if (!existsSync(sitemap)) {
  fail('dist/sitemap-0.xml is missing; run `astro build` first.');
}

const xml = readFileSync(sitemap, 'utf8');
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (locs.length === 0) {
  fail('sitemap-0.xml contains no <loc> entries; refusing to build an empty index.');
}

const base = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
const staging = mkdtempSync(join(tmpdir(), 'chirping-pagefind-'));
let staged = 0;

try {
  for (const loc of locs) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(loc).pathname);
    } catch {
      fail(`unparseable sitemap URL: ${loc}`);
    }
    let sourcePath = pathname;
    if (base && (sourcePath === base || sourcePath.startsWith(`${base}/`))) {
      sourcePath = sourcePath.slice(base.length) || '/';
    }
    // Only blog post routes: /posts/... or /<locale>/posts/...
    if (!/^\/(?:(?:en|ja)\/)?posts\//.test(sourcePath)) continue;

    const relativeSource = sourcePath.endsWith('/') ? `${sourcePath}index.html` : sourcePath;
    const source = join(dist, relativeSource);
    if (!existsSync(source)) {
      fail(`sitemap lists a missing built page: ${loc} (${source})`);
    }
    // Preserve the public (base-prefixed) path in the staging tree so Pagefind
    // emits result URLs that work under BASE_PATH deployments too.
    const relativeDestination = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const destination = join(staging, relativeDestination);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    staged += 1;
  }

  if (staged === 0) {
    fail('no listed post pages found in sitemap; refusing to build.');
  }

  rmSync(output, { recursive: true, force: true });
  const pagefindBin = join(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'pagefind.cmd' : 'pagefind',
  );
  if (!existsSync(pagefindBin)) {
    fail(`Pagefind binary not found at ${pagefindBin}. Run bun install.`);
  }

  const result = spawnSync(
    pagefindBin,
    [
      '--site',
      staging,
      '--output-path',
      output,
      '--root-selector',
      '.prose-chirpy',
      '--exclude-selectors',
      'nav,footer,header,.chirpy-topbar,#sidebar,.chirpy-panel-rail',
    ],
    { stdio: 'inherit', cwd: root },
  );
  if (result.error) {
    fail(`failed to launch Pagefind: ${result.error}`);
  }
  if (result.status !== 0) {
    fail(`Pagefind exited with status ${result.status}`);
  }

  const entry = join(output, 'pagefind-entry.json');
  if (!existsSync(entry)) {
    fail('Pagefind did not produce pagefind-entry.json');
  }
  const manifest = JSON.parse(readFileSync(entry, 'utf8'));
  const languages = Object.keys(manifest.languages ?? {});
  if (languages.length === 0) {
    fail('Pagefind produced no language indexes');
  }
  for (const language of languages) {
    if (!manifest.languages[language]?.page_count) {
      fail(`language "${language}" has an empty index`);
    }
  }
  console.log(
    `[pagefind] indexed ${staged} listed post pages across ${languages.sort().join(', ')}`,
  );
} finally {
  rmSync(staging, { recursive: true, force: true });
}
