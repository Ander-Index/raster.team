/**
 * Post helpers.
 *
 * Wraps the `astro:content` collection API to:
 *  - filter drafts in production
 *  - infer locale from filesystem path (posts/en/foo -> 'en')
 *  - sort by pubDate desc, with pinned posts first
 *  - group posts by tag / category / month
 *  - resolve translation siblings via `translationKey`
 */

import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

import { SITE, type Locale } from '../config';
import { TAG_GROUPS, type TagGroup } from '../tag-groups';
import { withBase, LOCALE_META } from '../i18n/utils';
import { slugify } from './slugify';

export type Post = CollectionEntry<'posts'> & {
  data: CollectionEntry<'posts'>['data'] & { lang: Locale; translationKey: string };
};

const isProd = import.meta.env.PROD;
const skipPostCollections = import.meta.env.CI_SKIP_CONTENT_COLLECTIONS === 'true';

/** Derive the locale from `posts/<locale>/foo` slug-ish ID. */
function localeFromId(id: string): Locale {
  const seg = id.split(/[\\/]/)[0];
  if (seg && (SITE.locales as readonly string[]).includes(seg)) return seg as Locale;
  return SITE.defaultLocale;
}

/** Strip locale prefix from a content ID. */
function stripLocaleFromId(id: string): string {
  const segs = id.split(/[\\/]/);
  if (segs[0] && (SITE.locales as readonly string[]).includes(segs[0])) {
    return segs.slice(1).join('/');
  }
  return id;
}

/** Normalize a post entry: ensure `lang` and `translationKey` are set. */
function normalize(entry: CollectionEntry<'posts'>): Post {
  const lang = entry.data.lang ?? localeFromId(entry.id);
  const translationKey = entry.data.translationKey ?? stripLocaleFromId(entry.id);
  return {
    ...entry,
    data: { ...entry.data, lang, translationKey },
  } as Post;
}

/** Public slug used for the URL: filename minus locale and extension. */
export function postSlug(entry: Post): string {
  return stripLocaleFromId(entry.id).replace(/\.(md|mdx)$/i, '');
}

/** Full localized URL path for a post. */
export function postPath(entry: Post): string {
  const slug = postSlug(entry);
  const path =
    entry.data.lang === SITE.defaultLocale
      ? `/posts/${slug}/`
      : `/${entry.data.lang}/posts/${slug}/`;
  return withBase(path);
}

/** Sort posts: pinned first, then by pubDate desc. */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    const at = a.data.pubDate?.valueOf?.() ?? 0;
    const bt = b.data.pubDate?.valueOf?.() ?? 0;
    return bt - at;
  });
}

/**
 * Sort posts strictly by `pubDate` (newest first), ignoring `pinned`.
 *
 * Used for prev/next post navigation: pinned posts shouldn't yank the
 * latest entry to position 0 and break the chronological chain (which
 * would label a newer post as "Previous" of an older pinned post).
 */
export function sortPostsByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const at = a.data.pubDate?.valueOf?.() ?? 0;
    const bt = b.data.pubDate?.valueOf?.() ?? 0;
    return bt - at;
  });
}

/** Get all posts for a locale (drafts + unlisted hidden in prod, sorted). */
export async function getPosts(locale: Locale): Promise<Post[]> {
  if (skipPostCollections) return [];
  const all = await getCollection('posts', (entry) => {
    if (isProd && entry.data.draft) return false;
    if (entry.data.unlisted) return false;
    const lang = entry.data.lang ?? localeFromId(entry.id);
    return lang === locale;
  });
  return sortPosts(all.map(normalize));
}

/**
 * Get unlisted posts for a locale (used only in `getStaticPaths` so
 * their URLs are still generated and accessible by direct link).
 * Drafts are still excluded in production.
 */
export async function getUnlistedPosts(locale: Locale): Promise<Post[]> {
  if (skipPostCollections) return [];
  const all = await getCollection('posts', (entry) => {
    if (isProd && entry.data.draft) return false;
    if (!entry.data.unlisted) return false;
    const lang = entry.data.lang ?? localeFromId(entry.id);
    return lang === locale;
  });
  return sortPosts(all.map(normalize));
}

/** Find a single post by locale + slug (path-relative). */
export async function getPostBySlug(locale: Locale, slug: string): Promise<Post | undefined> {
  const posts = await getPosts(locale);
  return posts.find((p) => postSlug(p) === slug);
}

/** All translation siblings of a post (other locales sharing translationKey). */
export async function getTranslations(entry: Post): Promise<Record<Locale, Post | undefined>> {
  const out: Partial<Record<Locale, Post | undefined>> = {};
  for (const locale of SITE.locales) {
    if (locale === entry.data.lang) {
      out[locale] = entry;
      continue;
    }
    const all = await getPosts(locale);
    out[locale] = all.find((p) => p.data.translationKey === entry.data.translationKey);
  }
  return out as Record<Locale, Post | undefined>;
}

/** Tags for a locale, with counts, sorted by count desc then alpha. */
export async function getTagsWithCount(
  locale: Locale,
): Promise<Array<{ name: string; count: number }>> {
  const posts = await getPosts(locale);
  const map = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Categories for a locale, with counts. */
export async function getCategoriesWithCount(
  locale: Locale,
): Promise<Array<{ name: string; count: number }>> {
  const posts = await getPosts(locale);
  const map = new Map<string, number>();
  for (const p of posts) {
    for (const c of p.data.categories) map.set(c, (map.get(c) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Group posts by year -> month for the archives page. */
export function groupByYearMonth(
  posts: Post[],
  locale: Locale,
): Array<{
  year: number;
  months: Array<{ month: number; label: string; posts: Post[] }>;
}> {
  const buckets = new Map<number, Map<number, Post[]>>();
  for (const post of posts) {
    const date = post.data.pubDate;
    if (!date) continue;
    const y = date.getFullYear();
    const m = date.getMonth();
    if (!buckets.has(y)) buckets.set(y, new Map());
    const months = buckets.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(post);
  }
  const fmt = new Intl.DateTimeFormat(LOCALE_META[locale].intl, { month: 'long' });
  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, list]) => ({
          month,
          label: fmt.format(new Date(year, month, 1)),
          posts: list,
        })),
    }));
}

/**
 * Resolve whether a post should display its featured (hero) image,
 * considering the per-post override (`showFeaturedImage`) and the
 * site-wide default (`SITE.showFeaturedImages`).
 *
 * Returns `false` when there is no `heroImage` to show.
 */
export function shouldShowHero(post: Post): boolean {
  if (!post.data.heroImage) return false;
  return post.data.showFeaturedImage ?? SITE.showFeaturedImages;
}

/** The hero image source URL/path for a post (or undefined). */
export function heroImageSrc(post: Post): string | undefined {
  const img = post.data.heroImage;
  if (!img) return undefined;
  let src: string | undefined;
  if (typeof img === 'string') src = img;
  // Imported asset (ImageMetadata): unwrap to its public URL.
  else if (typeof img === 'object' && 'src' in (img as Record<string, unknown>)) {
    src = (img as { src: string }).src;
  }
  if (!src) return undefined;
  // Prefix the configured base for absolute paths into /public.
  return src.startsWith('/') && !src.startsWith('//') ? withBase(src) : src;
}

/**
 * The raw hero image, suitable for passing straight to `<SmartImage>`.
 * Preserves the `ImageMetadata` shape (so the image pipeline can use
 * intrinsic dimensions) for assets imported via the `image()` schema,
 * and prefixes `withBase()` only on plain `/public/...` strings.
 */
export function heroImage(post: Post): ImageMetadata | string | undefined {
  const img = post.data.heroImage;
  if (!img) return undefined;
  if (typeof img === 'string') {
    return img.startsWith('/') && !img.startsWith('//') ? withBase(img) : img;
  }
  return img as ImageMetadata;
}

export { slugify } from './slugify';

/** Build the URL for a tag listing page in a given locale. */
export function tagPath(locale: Locale, tag: string): string {
  const slug = slugify(tag);
  const path = locale === SITE.defaultLocale ? `/tags/${slug}/` : `/${locale}/tags/${slug}/`;
  return withBase(path);
}

/** Build the URL for a category listing page in a given locale. */
export function categoryPath(locale: Locale, category: string): string {
  const slug = slugify(category);
  const path =
    locale === SITE.defaultLocale ? `/categories/${slug}/` : `/${locale}/categories/${slug}/`;
  return withBase(path);
}

// ──────────────────────────────────────────────────────────────────────
// Tag translation groups
// ──────────────────────────────────────────────────────────────────────

/**
 * Reverse index: exact tag name -> the group it belongs to. Built once
 * at module load from `TAG_GROUPS` in `src/tag-groups.ts`.
 */
const TAG_GROUP_INDEX: Map<string, TagGroup> = (() => {
  const m = new Map<string, TagGroup>();
  for (const group of TAG_GROUPS) {
    for (const locale of SITE.locales) {
      const name = group[locale];
      if (name) m.set(name, group);
    }
  }
  return m;
})();

/** Find the translation group containing this exact tag name, if any. */
export function getTagGroup(tagName: string): TagGroup | undefined {
  return TAG_GROUP_INDEX.get(tagName);
}

export interface TagTranslationResult {
  /** Locale -> full localized URL of the equivalent tag page. */
  links: Partial<Record<Locale, string>>;
  /** Locale -> path WITHOUT locale prefix (for hreflang). */
  paths: Partial<Record<Locale, string>>;
}

/**
 * Resolve every locale variant of a tag page so the language switcher
 * and hreflang alternates can point at the right place.
 *
 * Resolution order per locale:
 *   1. If the tag is in a translation group AND that locale's
 *      translated name exists as a real tag (has posts) → use it.
 *   2. Else if this is the current locale → always link to itself.
 *   3. Else if the same slug happens to exist in that locale (e.g.
 *      "UTAU", "REAPER" shared verbatim) → link to it.
 *   4. Otherwise omit the locale (no switcher entry, no hreflang).
 *
 * This never links to a tag page that doesn't exist.
 */
export async function resolveTagTranslations(
  tagName: string,
  currentLocale: Locale,
): Promise<TagTranslationResult> {
  const group = getTagGroup(tagName);
  const currentSlug = slugify(tagName);
  const links: Partial<Record<Locale, string>> = {};
  const paths: Partial<Record<Locale, string>> = {};

  for (const loc of SITE.locales) {
    const tags = await getTagsWithCount(loc);
    const slugToName = new Map(tags.map((t) => [slugify(t.name), t.name] as const));

    let resolved: string | undefined;
    const translatedName = group?.[loc];
    if (loc === currentLocale) {
      // The current locale always reflects the page being viewed, even
      // if the group lists a different "canonical" name for it.
      resolved = tagName;
    } else if (translatedName && slugToName.has(slugify(translatedName))) {
      resolved = translatedName;
    } else {
      resolved = slugToName.get(currentSlug);
    }

    if (resolved) {
      links[loc] = tagPath(loc, resolved);
      paths[loc] = `/tags/${slugify(resolved)}/`;
    }
  }
  return { links, paths };
}
