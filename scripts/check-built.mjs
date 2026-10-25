#!/usr/bin/env bun
/**
 * Built-output regression checks. Runs after `astro build` + Pagefind and
 * exits non-zero on any failure. No silent skips: missing dist/sitemap/
 * Pagefind artifacts are errors.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { contentEntryId } from '../src/utils/content-id.ts';

const root = process.cwd();
const dist = join(root, 'dist');
const failures = [];
const checks = { html: 0, sitemapUrls: 0, pagefindFragments: 0, protectedFiles: 0 };

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

if (!existsSync(dist)) {
  throw new Error('[built-check] dist/ is missing; run `bun run build` first.');
}

const decodedBase = (() => {
  const raw = (process.env.BASE_PATH || '/').replace(/\/+$/, '');
  return raw === '' || raw === '/' ? '' : raw.startsWith('/') ? raw : `/${raw}`;
})();

function stripBase(pathname) {
  if (!decodedBase) return pathname;
  if (pathname === decodedBase) return '/';
  if (pathname.startsWith(`${decodedBase}/`)) return pathname.slice(decodedBase.length);
  return pathname;
}

function normalize(value) {
  try {
    return decodeURIComponent(value).normalize('NFC');
  } catch {
    return value.normalize('NFC');
  }
}

const distFiles = walk(dist)
  .map((file) => normalize(relative(dist, file).replaceAll('\\', '/')))
  .sort();
const distFileSet = new Set(distFiles);

function existsUrl(href) {
  let pathname;
  try {
    pathname = new URL(href, 'https://built-check.invalid').pathname;
  } catch {
    return false;
  }
  pathname = normalize(stripBase(pathname));
  if (pathname === '/') pathname = '/index.html';
  const candidates = pathname.endsWith('/')
    ? [`${pathname.slice(1)}index.html`]
    : [pathname.slice(1), `${pathname.slice(1)}/index.html`, `${pathname.slice(1)}.html`];
  return candidates.some((candidate) => distFileSet.has(candidate));
}

function routeToFile(route) {
  let pathname = normalize(stripBase(new URL(route, 'https://built-check.invalid').pathname));
  if (pathname === '/') pathname = '/index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';
  return join(dist, pathname);
}

function readRoute(route) {
  const file = routeToFile(route);
  if (!existsSync(file)) {
    fail(`missing built route ${route} (${relative(root, file)})`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return match?.[1] ?? '';
}

function stripNonMarkup(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function parsePage(route, rawHtml) {
  const html = stripNonMarkup(rawHtml);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]);
  return {
    route,
    canonical: links.map((tag) => attr(tag, 'href')).find((_, i) => /rel\s*=\s*"canonical"/i.test(links[i])) ?? '',
    hreflangs: links
      .filter((tag) => /hreflang\s*=\s*"/i.test(tag))
      .map((tag) => ({ lang: attr(tag, 'hreflang'), href: attr(tag, 'href') })),
    menuTargets: anchors
      .filter((tag) => /data-lang-target\s*=\s*"/i.test(tag))
      .map((tag) => ({ lang: attr(tag, 'data-lang-target'), href: attr(tag, 'href') })),
    anchorHrefs: anchors.map((tag) => attr(tag, 'href')).filter(Boolean),
    noindex: /<meta\b[^>]*name\s*=\s*"robots"[^>]*content\s*=\s*"[^"]*noindex/i.test(html),
    redirect: /<meta\b[^>]*http-equiv\s*=\s*"refresh"/i.test(html),
  };
}

function routeForHtmlFile(file) {
  const rel = relative(dist, file).replaceAll('\\', '/');
  return `/${rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel}`;
}

function internalPath(href, pageRoute, origin) {
  if (!href || href.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) {
    return null;
  }
  if (href.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      return null;
    }
    if (parsed.origin !== origin) return null;
    return normalize(parsed.pathname);
  }
  try {
    return normalize(new URL(href, `https://built-check.invalid${pageRoute}`).pathname);
  } catch {
    return null;
  }
}

const htmlFiles = distFiles.filter(
  (file) => file.endsWith('.html') && !file.startsWith('sub-sites/') && !file.startsWith('if/'),
);
const pages = new Map();
const noindexRoutes = new Set();
const hiddenRoutes = new Set();

for (const file of htmlFiles) {
  const route = normalize(routeForHtmlFile(join(dist, file)));
  const page = parsePage(route, readFileSync(join(dist, file), 'utf8'));
  pages.set(route, page);
  checks.html += 1;
  if (page.noindex) noindexRoutes.add(route);
}

// ── Protected files (one-time snapshot acceptance only) ─────────────
// Normal authoring edits an article or replaces an avatar legitimately.
// Default runs therefore skip the frozen maintenance snapshot; use
// `bun scripts/check-built.mjs --verify-snapshot` for the explicit audit.
const verifySnapshot = process.argv.includes('--verify-snapshot');
if (verifySnapshot) {
  const protectedFixture = JSON.parse(
    readFileSync(join(root, 'tests/fixtures/protected-hashes.json'), 'utf8'),
  );
  for (const [file, expected] of Object.entries(protectedFixture.hashes)) {
    checks.protectedFiles += 1;
    const exception = protectedFixture.allowedChanges[file];
    if (exception) {
      if (!existsSync(join(root, file))) {
        fail(`documented corrected file is missing: ${file}`);
        continue;
      }
      const actual = createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
      if (actual !== exception.correctedSha256) {
        fail(`documented correction drifted from its accepted hash: ${file}`);
      }
      if (exception.originalSha256 === exception.correctedSha256) {
        fail(`documented correction has no original hash difference: ${file}`);
      }
      continue;
    }
    if (!existsSync(join(root, file))) {
      fail(`protected file missing: ${file}`);
      continue;
    }
    const actual = createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
    if (actual !== expected) fail(`protected file changed: ${file}`);
  }
}

// ── Content post routes and hidden-route inventory ───────────────────
function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

function frontmatterTitle(fm) {
  const match = fm.match(/^title:\s*(.+)$/m);
  if (!match) return '';
  const raw = match[1].trim();
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  return raw;
}

const postsRoot = join(root, 'src/content/posts');
const expectedPostRoutes = new Set();
const postTitles = new Map();
for (const file of walk(postsRoot)) {
  if (!/\.(md|mdx)$/i.test(file)) continue;
  const rel = relative(postsRoot, file).replaceAll('\\', '/');
  const id = contentEntryId(rel);
  const [locale, ...rest] = id.split('/');
  const route = locale === 'zh' ? `/posts/${rest.join('/')}/` : `/${locale}/posts/${rest.join('/')}/`;
  const fm = frontmatter(readFileSync(file, 'utf8'));
  const isDraft = /^draft:\s*true\s*$/im.test(fm);
  const isUnlisted = /^unlisted:\s*true\s*$/im.test(fm);
  if (isDraft) continue;
  expectedPostRoutes.add(route);
  postTitles.set(route, frontmatterTitle(fm));
  if (isUnlisted) hiddenRoutes.add(route);
  assert(existsUrl(route), `missing post route from source file: ${route}`);
}

const oldRoutes = JSON.parse(readFileSync(join(root, 'tests/fixtures/old-post-routes.json'), 'utf8')).routes;
for (const route of oldRoutes) {
  assert(existsUrl(route), `protected old post URL missing: ${route}`);
}

// ── HTML link / alternate integrity ─────────────────────────────────
for (const page of pages.values()) {
  const origin = page.canonical ? new URL(page.canonical).origin : 'https://built-check.invalid';
  if (!page.redirect) {
    for (const alternate of page.hreflangs) {
      const path = internalPath(alternate.href, page.route, origin);
      if (path) assert(existsUrl(path), `broken hreflang ${alternate.lang} on ${page.route}: ${alternate.href}`);
    }
    for (const target of page.menuTargets) {
      const path = internalPath(target.href, page.route, origin);
      if (path) assert(existsUrl(path), `broken language menu on ${page.route}: ${target.href}`);
    }
  }
  for (const href of page.anchorHrefs) {
    const path = internalPath(href, page.route, origin);
    if (path) assert(existsUrl(path), `broken internal link on ${page.route}: ${href}`);
  }
}

// ── Specific translation / taxonomy / pagination behavior ───────────
const moyan = pages.get('/posts/voicedbs/utau/moyanming_japanese_vcv/');
assert(Boolean(moyan), 'missing moyanming post page');
if (moyan) {
  const enAlt = moyan.hreflangs.find((item) => item.lang === 'en');
  const enMenu = moyan.menuTargets.find((item) => item.lang === 'en');
  const altPath = enAlt ? normalize(stripBase(new URL(enAlt.href).pathname)) : '';
  const menuPath = enMenu
    ? normalize(stripBase(new URL(enMenu.href, 'https://built-check.invalid').pathname))
    : '';
  assert(
    altPath === '/en/posts/voicedbs/utau/evan_japanese_vcv/',
    'different-slug English hreflang is not the actual evan post',
  );
  assert(
    menuPath === '/en/posts/voicedbs/utau/evan_japanese_vcv/',
    'different-slug English menu target is not the actual evan post',
  );
  assert(altPath !== '' && altPath === menuPath, 'menu and hreflang disagree');
}

for (const route of ['/posts/tutorials/rearoute-asio-to-obs-with-reaper/', '/posts/tutorials/writing-with-ink/']) {
  const page = pages.get(route);
  assert(Boolean(page), `missing post page ${route}`);
  if (page) {
    assert(page.menuTargets.length === 0, `${route} should not show a language menu`);
    assert(
      page.hreflangs.every((item) => item.lang === 'zh' || item.lang === 'x-default'),
      `${route} should only declare zh/x-default hreflang`,
    );
  }
}

for (const route of ['/categories/教程/', '/page/2/', '/page/3/']) {
  const page = pages.get(route);
  assert(Boolean(page), `missing route ${route}`);
  if (page) {
    assert(
      page.hreflangs.every((item) => item.lang === 'zh' || item.lang === 'x-default'),
      `${route} advertises a nonexistent locale equivalent`,
    );
    assert(page.menuTargets.length === 0, `${route} should not show a language menu`);
  }
}
assert(!existsUrl('/en/categories/教程/'), '/en/categories/教程/ must not be advertised or generated');
assert(!existsUrl('/en/page/2/'), '/en/page/2/ must not be advertised or generated');

// No post language menu may point at a homepage.
for (const page of pages.values()) {
  if (!/^\/(?:en\/|ja\/)?posts\//.test(page.route)) continue;
  for (const target of page.menuTargets) {
    assert(target.href.includes('/posts/'), `post ${page.route} language menu points at non-post ${target.href}`);
  }
}

// About redirects to the real locale about tag (nav keeps using tags).
for (const route of ['/about/', '/en/about/', '/ja/about/']) {
  const page = pages.get(route);
  assert(Boolean(page), `missing about redirect ${route}`);
  if (page) {
    assert(page.redirect, `${route} should be a redirect page`);
    const target = page.anchorHrefs[0];
    assert(Boolean(target) && existsUrl(target), `${route} redirect target is missing`);
  }
}

// Privacy placeholder must not be published; any real policy must be footer-linked only if present.
for (const route of ['/privacy/', '/en/privacy/', '/ja/privacy/']) {
  const file = routeToFile(route);
  if (existsSync(file)) {
    const html = readFileSync(file, 'utf8');
    assert(!html.includes('[SITE_NAME]') && !html.includes('[SITE_URL]'), `${route} publishes an unfilled template`);
  }
}
const homeHtml = readRoute('/');
for (const match of homeHtml.matchAll(/href="([^"]*privacy[^"]*)"/g)) {
  assert(existsUrl(match[1]), `footer links to a missing privacy policy: ${match[1]}`);
}

// ── Sitemap ─────────────────────────────────────────────────────────
const sitemapPath = join(dist, 'sitemap-0.xml');
const sitemapIndexPath = join(dist, 'sitemap-index.xml');
const sitemapXsl = join(dist, 'sitemap/styles.xsl');
assert(existsSync(sitemapPath), 'sitemap-0.xml missing');
assert(existsSync(sitemapIndexPath), 'sitemap-index.xml missing');
assert(existsSync(sitemapXsl), 'sitemap/styles.xsl missing');

if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(locs.length > 0, 'sitemap has no URLs');
  const altHrefs = [...xml.matchAll(/<xhtml:link\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  for (const url of locs) {
    const pathname = normalize(new URL(url).pathname);
    checks.sitemapUrls += 1;
    assert(existsUrl(pathname), `sitemap URL does not exist: ${url}`);
    assert(!noindexRoutes.has(normalize(stripBase(pathname))), `noindex page in sitemap: ${url}`);
    assert(!hiddenRoutes.has(normalize(stripBase(pathname))), `unlisted page in sitemap: ${url}`);
    assert(!pathname.includes('/sub-sites/') && !pathname.startsWith('/if/'), `public subsite in sitemap: ${url}`);
  }
  for (const url of altHrefs) {
    const pathname = normalize(stripBase(new URL(url).pathname));
    assert(!noindexRoutes.has(pathname), `noindex hreflang target in sitemap: ${url}`);
    assert(existsUrl(url), `sitemap hreflang target does not exist: ${url}`);
  }
  const locPaths = locs.map((url) => normalize(stripBase(new URL(url).pathname)));
  for (const hidden of hiddenRoutes) {
    assert(!locPaths.includes(hidden), `hidden route appears in sitemap: ${hidden}`);
  }
  assert(xml.includes('<?xml-stylesheet'), 'sitemap-0.xml misses the XSL processing instruction');
}

// ── Pagefind fragments ──────────────────────────────────────────────
const pagefindEntry = join(dist, '_pagefind/pagefind-entry.json');
assert(existsSync(pagefindEntry), 'Pagefind entry manifest missing');
const fragmentFiles = distFiles.filter((file) => file.endsWith('.pf_fragment'));
assert(fragmentFiles.length > 0, 'Pagefind produced no fragments');
const indexedPaths = new Set();
const fragmentText = [];
for (const file of fragmentFiles) {
  let payload;
  try {
    payload = JSON.parse(gunzipSync(readFileSync(join(dist, file))).toString('utf8').replace(/^[^{]*/, ''));
  } catch (error) {
    fail(`unparseable Pagefind fragment ${file}: ${error}`);
    continue;
  }
  const pathname = normalize(new URL(payload.url, 'https://built-check.invalid').pathname);
  const route = normalize(stripBase(pathname));
  indexedPaths.add(route);
  const raw = gunzipSync(readFileSync(join(dist, file))).toString('utf8');
  fragmentText.push(raw);
  checks.pagefindFragments += 1;
  assert(existsUrl(pathname), `Pagefind indexes a missing page: ${payload.url}`);
  assert(!noindexRoutes.has(normalize(stripBase(pathname))), `Pagefind indexes noindex page: ${payload.url}`);
  assert(!hiddenRoutes.has(normalize(stripBase(pathname))), `Pagefind indexes unlisted page: ${payload.url}`);
  assert(
    !pathname.includes('/sub-sites/') && !pathname.startsWith('/if/'),
    `Pagefind indexes a public sub-site: ${payload.url}`,
  );
  assert(/\/posts\//.test(pathname), `Pagefind indexes a non-post page: ${payload.url}`);
  const expectedTitle = postTitles.get(route);
  assert(Boolean(expectedTitle), `Pagefind fragment has no matching source post: ${payload.url}`);
  assert(
    payload.meta?.title === expectedTitle,
    `Pagefind title mismatch for ${payload.url}: expected ${JSON.stringify(expectedTitle)}, got ${JSON.stringify(payload.meta?.title)}`,
  );
}
const joinedFragments = fragmentText.join('\n');
for (const chrome of ['Powered by Astro', 'data-pagefind-ignore', 'Skip to content', '跳至正文']) {
  assert(!joinedFragments.includes(chrome), `Pagefind indexed page chrome: ${chrome}`);
}

if (existsSync(pagefindEntry)) {
  const entry = JSON.parse(readFileSync(pagefindEntry, 'utf8'));
  for (const language of ['zh', 'en', 'ja']) {
    const info = entry.languages?.[language];
    assert(Boolean(info && info.page_count > 0), `Pagefind language index is empty: ${language}`);
  }
}

// Pagefind must index exactly the indexable post URLs from the sitemap.
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  const sitemapPostPaths = new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => normalize(stripBase(new URL(m[1]).pathname)))
      .filter((pathname) => /^\/(?:en\/|ja\/)?posts\//.test(pathname)),
  );
  for (const pathname of sitemapPostPaths) {
    assert(indexedPaths.has(pathname), `listed post missing from Pagefind: ${pathname}`);
  }
  for (const pathname of indexedPaths) {
    assert(sitemapPostPaths.has(pathname), `Pagefind indexed a post excluded from sitemap: ${pathname}`);
  }
}

if (failures.length > 0) {
  console.error(`[built-check] ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `[built-check] OK: ${checks.html} pages, ${checks.sitemapUrls} sitemap URLs, ` +
    `${checks.pagefindFragments} Pagefind fragments` +
    (verifySnapshot
      ? `, ${checks.protectedFiles} protected files snapshot-verified`
      : '; frozen snapshot not checked (use --verify-snapshot)'),
);
