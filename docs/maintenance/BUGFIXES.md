# Application Bugfixes and Verification

Scope: existing Chirping Astro site on Astro 6 (no Fuwari, no redesign, no
Astro major upgrade, topbar blur fix at `c8f596ac` untouched).

## What changed

### Partial article translations

- Posts are paired by their normalized `translationKey` only. Posts without
  frontmatter keys already default to the generated slug, so same-slug siblings
  still pair; conflicting explicit keys never pair just because filenames match.
  Drafts and unlisted siblings are not offered from listed articles.
- `LanguageSwitcher` now receives an explicit SSR `languageLinks` map through
  `BaseLayout -> Topbar -> LanguageSwitcher`. The same map drives the head
  hreflang tags (`buildSeo({ hreflangLinks })`). The runtime
  `window.__chirpyTranslations` correction was removed from `PostLayout`, the
  tag route and the switcher.
- A post with no other actual translation renders no language button and only
  its own/x-default hreflang entry.
- Different-slug siblings now agree in menu and head, e.g.
  `/posts/voicedbs/utau/moyanming_japanese_vcv/` <->
  `/en/posts/voicedbs/utau/evan_japanese_vcv/`.
- Frontmatter `canonicalURL` is passed through to the canonical tag.

### Categories, pagination and hreflang

- Category pages only advertise locales that generate the same category slug
  with posts. `/categories/教程/` now offers zh only instead of nonexistent
  `/en/categories/教程/` and `/ja/...`.
- Paginated pages only advertise locales that generate the same page number.
  `/page/2/` and `/page/3/` now offer zh only; no homepage is substituted.
- Existing tag-group translation behavior is retained; translated tags still
  generate their intentional empty, noindex pages and keep their existing
  language paths.

### Unlisted pages, sitemap and Pagefind

- Replaced the `astro.config.mjs` sitemap hook (which imported `astro:content`
  outside render context and swallowed failures) with static Astro endpoints:
  `src/pages/sitemap-0.xml.ts` and `src/pages/sitemap-index.xml.ts`.
  They use the same real post/category/tag/pagination helpers as the pages and
  preserve `sitemap-index.xml`, `sitemap-0.xml` and the public XSL.
- Sitemap `<loc>` and hreflang entries exclude unlisted pages, production
  drafts, noindex pages, empty translated tag pages and public sub-sites.
- `unlistedHideFromSeo` is now independent of `unlisted`:
  `shouldNoindex()` returns `unlistedHideFromSeo ?? unlisted`, so a listed post
  with `unlistedHideFromSeo: true` gets noindex, while an unlisted post with
  `false` is still excluded from all aggregations/sitemap/Pagefind.
- Pagefind is built by `scripts/build-pagefind.mjs` from the sitemap's listed
  post URLs only. Only those pages are staged; `data-pagefind-body` is on the
  article body, and topbar/sidebar/footer are marked
  `data-pagefind-ignore`. This excludes navigation/footer chrome and the
  vendored `public/if` + `public/sub-sites` Chapbook/Ink sites. All three
  language indexes (zh/en/ja) are non-empty.
- Pagefind result titles now come from an explicit hidden
  `data-pagefind-meta="title"` node populated from post frontmatter. Search
  still indexes only the article body; it does not fall back to the first
  heading or re-index navigation.
- The previous module-level Pagefind singleton cached the first `<html lang>`
  across Astro ClientRouter navigation. `src/utils/pagefind-client.ts` now
  creates/destroys a Pagefind instance per bundle + current `<html lang>`
  (using `createInstance()`), supersedes stale loads and destroys the old
  instance. Both the header modal and dedicated search page use it and abort
  their listeners/results on `astro:before-swap`. Escape explicitly closes the
  modal; `/` and Cmd/Ctrl+K resolve the current dialog only.

### Internal link plugin

- `src/plugins/remark-internal-links.ts` now resolves source files through a
  source-to-entry-ID map built with the same `github-slugger` per-segment rule
  as Astro 6's glob loader (`src/utils/content-id.ts`).
- Published URLs such as `/en/posts/foo/` are left untouched (the old code
  produced `/en/posts/posts/foo/`).
- Only definite content paths are rewritten: `posts/<locale>/file.md`,
  `src/content/posts/<locale>/file.md`, and existing relative `.md`/`.mdx`
  source links (including reference definitions). Query/hash, encoded Unicode,
  cross-locale paths and assets are preserved; broken source links are left
  untouched instead of inventing a route.
- Slugs keep old URLs, including underscores, while `+`/`.`/spaces follow the
  actual loader ID (e.g. `macos-12+-...` -> `macos-12-...`,
  `reaper__...reaperlangpack`).

### Privacy and about

- No placeholder privacy policy is published. Template detection covers every
  shipped uppercase placeholder form (`[HOSTING_PROVIDER]`,
  `[PRIVACY_CONTACT_EMAIL]`, `[RETENTION_PERIOD]`, `[MINIMUM_AGE, ...]`,
  provider/address/legal-entity variants, etc.), not just `[SITE_NAME]` and
  `[SITE_URL]`. Ordinary Markdown links such as `[GitHub](...)` are not
  mistaken for placeholders. The footer only links `/privacy` for a locale
  with a publishable non-template page.
- The footer privacy link is hidden for zh/ja, which have no policy content.
- Direct `/about`, `/en/about`, `/ja/about` redirect to the locale's real
  about tag listing; navigation still points at those tag pages.
- No content files were deleted.

### Maintenance and CI

- `package-lock.json` removed; `bun.lock` is authoritative and passes
  `bun install --frozen-lockfile`.
- Declared direct dependencies actually imported by maintained code:
  `@astrojs/markdown-remark` (7.2.0) and `github-slugger` (2.0.0). Removed the
  now-unused `@astrojs/sitemap` dependency.
- ESLint is scoped to maintained source/config/scripts/tests. It no longer
  scans `public/**` third-party bundles, `.bun-cache`, Obsidian metadata or
  build output. The standard `js.configs.recommended` baseline applies to
  JS/TS/Astro with normal TypeScript overrides (TS `no-unused-vars`, with
  `no-undef` left to the typechecker). Browser + Node globals are configured
  per file type.
- `tsconfig` now typechecks `scripts/**/*.ts` as well as `src/**/*` and the
  Astro config. The upstream maintenance tool and its tests pass the shared
  strict check; only its existing `await expect` hints remain non-fatal.
- `.github/workflows/quality.yml` runs on pull requests and pushes to `main`:
  lint, typecheck, unit tests, full production content build (with Pagefind)
  and built-output checks. The Pages deploy build step now runs the full
  `bun run check` (lint, typecheck, tests, build, built checks) before artifact
  upload, so a push to `main` cannot deploy without those checks. Both quality
  and deploy explicitly set up Node 24 alongside pinned Bun 1.3.13. Existing
  deploy triggers, environment and domain handling were not changed.
- Remote image optimization is retained (`inferSize`, responsive `srcset`,
  formats and astro-image attributes). The earlier plain-`<img>` fallback was
  removed. A normal production build completed with the remote host available;
  cached/revalidated remote assets were reused where applicable.
- Theme toggle initialization was fixed for the first page load (the
  `astro:page-load` listener could fire before the module attached). It now
  boots immediately or on DOMContentLoaded, cleans up on
  `astro:before-swap`, and still uses the existing View Transition animation.

## Narrow documented content corrections

`src/content/**` and `public/**` otherwise remain byte-identical. The fixture
records each original hash and each accepted corrected hash with a reason, so
future edits to these two files are not exempt from hashing.

1. `src/content/posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md`
   - `/posts/__raw/about_nomo-wang/` -> `/posts/about/nomo-wang/` (the real
     existing post).
2. `src/content/posts/zh/tutorials/writing-with-ink.md`
   - two missing local `RunningYourInk*.md` links now point at the official
     `https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md`
     documentation.

## Verification

Run from the worktree root:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun test
bun run build
bun run test:built
# One-time maintenance snapshot acceptance only (not for normal authoring):
bun scripts/check-built.mjs --verify-snapshot
```

`test:built` deliberately does not require the frozen 213-file byte snapshot;
normal article edits and avatar/image replacements remain valid. The optional
`--verify-snapshot` mode still enforces every original hash plus the exact
accepted hashes for the two corrected articles.

For a sub-path deployment check:

```bash
BASE_PATH=/test-prefix bun run build
BASE_PATH=/test-prefix bun run test:built
```

`scripts/check-built.mjs` fails non-zero if any of these are wrong:

- protected old post URLs and all source-derived post routes
- the frozen content/public/asset snapshot only when `--verify-snapshot` is
  explicitly requested
- every internal anchor/language-menu/hreflang target exists (excluding
  intentional redirects)
- different-slug menu/head agreement, no-translation post behavior,
  category/pagination locale subsets, about redirects, privacy placeholders
- sitemap URLs/hreflang exist, and no unlisted/noindex/sub-site URL leaks
- Pagefind fragments decompress and parse, cover exactly the listed post URLs,
  contain no chrome text, have non-empty zh/en/ja indexes and match the source
  frontmatter title for every indexed post

Current result: frozen Bun install, lint, Astro/scripts typecheck (0 errors,
0 warnings; 15 non-fatal existing `await expect` hints in the upstream-sync
tests), 58 unit tests, upstream metadata `verify`, full production build with
Pagefind, default built-output checks, explicit `--verify-snapshot`
(213 protected files snapshot-verified) and the `BASE_PATH=/test-prefix`
build/check pass. Source/public/asset integrity was additionally verified during
this maintenance; the only baseline hash changes are the two documented
content-link corrections above. A local Chrome/CDP run verified first-load
theme toggling, theme toggling after zh -> en -> ja -> zh SPA switches, modal
search results in each locale, dedicated search in en and ja after SPA
navigation, Escape closing a non-empty modal, and `/` opening/closing only the
current dialog with no page errors.
