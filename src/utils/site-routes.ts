/**
 * Indexable route inventory used by the static sitemap endpoints.
 *
 * Everything here is built from the same helpers that generate the actual
 * Astro routes (`getPosts`, `getPaginationLanguageLinks`,
 * `resolveCategoryTranslations`, `resolveTagTranslations`), so the
 * sitemap cannot advertise a page that was never generated.
 */
import { SITE, type Locale } from '../config';
import { localizedPath, type LanguageLinks } from '../i18n/utils';
import { shouldNoindex } from './seo-policy';
import {
  categoryPath,
  getCategoriesWithCount,
  getPosts,
  getTagsWithCount,
  postPath,
  postSlug,
  resolveCategoryTranslations,
  resolveTagTranslations,
  tagPath,
  type Post,
} from './posts';
import { selectTranslation } from './translations';
import { getAboutEntry, getPublishablePrivacyEntry } from './content-pages';

export interface SitemapRoute {
  /** Site path including the configured base. */
  path: string;
  /** Actual, already-localized alternates for this route. */
  links: LanguageLinks;
}

function localeLinks(pathFor: (locale: Locale) => string): LanguageLinks {
  const links: LanguageLinks = {};
  for (const locale of SITE.locales) links[locale] = pathFor(locale);
  return links;
}

function pageCount(posts: readonly Post[]): number {
  return Math.max(1, Math.ceil(posts.length / SITE.postsPerPage));
}

function paginationLinks(current: number, counts: Record<Locale, number>): LanguageLinks {
  const links: LanguageLinks = {};
  for (const locale of SITE.locales) {
    if (current <= counts[locale]) {
      links[locale] = localizedPath(current === 1 ? '/' : `/page/${current}/`, locale);
    }
  }
  return links;
}

/** True when a page entry can appear in the sitemap. */
function pageIsIndexable(entry: {
  data: { unlisted: boolean; unlistedHideFromSeo?: boolean; draft: boolean };
}): boolean {
  return !entry.data.draft && !entry.data.unlisted && !shouldNoindex(entry.data);
}

export async function getSitemapRoutes(): Promise<SitemapRoute[]> {
  const routes = new Map<string, SitemapRoute>();
  const add = (path: string, links: LanguageLinks) => {
    const existing = routes.get(path);
    if (existing) {
      Object.assign(existing.links, links);
    } else {
      routes.set(path, { path, links: { ...links } });
    }
  };

  // Locale home pages, archives, taxonomy indexes and search.
  const homeLinks = localeLinks((l) => localizedPath('/', l));
  const archivesLinks = localeLinks((l) => localizedPath('/archives/', l));
  const tagsIndexLinks = localeLinks((l) => localizedPath('/tags/', l));
  const categoriesIndexLinks = localeLinks((l) => localizedPath('/categories/', l));
  const searchLinks = localeLinks((l) => localizedPath('/search/', l));
  for (const locale of SITE.locales) {
    add(localizedPath('/', locale), homeLinks);
    add(localizedPath('/archives/', locale), archivesLinks);
    add(localizedPath('/tags/', locale), tagsIndexLinks);
    add(localizedPath('/categories/', locale), categoriesIndexLinks);
    add(localizedPath('/search/', locale), searchLinks);
  }

  // Load listed posts once per locale.
  const postsByLocale = {} as Record<Locale, Post[]>;
  for (const locale of SITE.locales) postsByLocale[locale] = await getPosts(locale);
  const counts = {} as Record<Locale, number>;
  for (const locale of SITE.locales) counts[locale] = pageCount(postsByLocale[locale]);

  // Pagination pages (page 1 is the locale home page).
  const maxPages = Math.max(...SITE.locales.map((l) => counts[l]));
  for (let current = 2; current <= maxPages; current += 1) {
    const links = paginationLinks(current, counts);
    for (const locale of SITE.locales) {
      if (links[locale]) add(localizedPath(`/page/${current}/`, locale), links);
    }
  }

  // Listed posts, excluding any page that opts out of indexing.
  for (const locale of SITE.locales) {
    for (const post of postsByLocale[locale]) {
      if (post.data.unlisted || shouldNoindex(post.data)) continue;
      const links: LanguageLinks = {};
      for (const target of SITE.locales) {
        const sibling =
          target === post.data.lang
            ? post
            : selectTranslation(
                { translationKey: post.data.translationKey, slug: postSlug(post) },
                postsByLocale[target],
                (p) => p.data.translationKey,
              );
        if (sibling) links[target] = postPath(sibling);
      }
      add(postPath(post), links);
    }
  }

  // Categories that actually have posts in each locale.
  for (const locale of SITE.locales) {
    const categories = await getCategoriesWithCount(locale);
    for (const category of categories) {
      const { links } = await resolveCategoryTranslations(category.name, locale);
      add(categoryPath(locale, category.name), links);
    }
  }

  // Tag pages with posts. Empty tag-group pages are generated but noindex,
  // so they are intentionally absent from the sitemap.
  for (const locale of SITE.locales) {
    const tags = await getTagsWithCount(locale);
    for (const tag of tags) {
      const { links } = await resolveTagTranslations(tag.name, locale);
      add(tagPath(locale, tag.name), links);
    }
  }

  // Content pages, only when real and indexable.
  const aboutLinks = localeLinks((l) => localizedPath('/about/', l));
  const privacyLinks = localeLinks((l) => localizedPath('/privacy/', l));
  for (const locale of SITE.locales) {
    const about = await getAboutEntry(locale);
    if (about && pageIsIndexable(about)) add(localizedPath('/about/', locale), aboutLinks);
    const privacy = await getPublishablePrivacyEntry(locale);
    if (privacy && pageIsIndexable(privacy)) {
      add(localizedPath('/privacy/', locale), privacyLinks);
    }
  }

  // Filter alternates to routes that are themselves indexable and present.
  const pathSet = new Set(routes.keys());
  for (const route of routes.values()) {
    for (const locale of SITE.locales) {
      const link = route.links[locale];
      if (link && !pathSet.has(link)) delete route.links[locale];
    }
  }

  return [...routes.values()].sort((a, b) => a.path.localeCompare(b.path));
}
