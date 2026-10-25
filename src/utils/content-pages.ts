/**
 * Content-page availability helpers (about / privacy).
 *
 * These intentionally live outside layouts so route generation, footer
 * visibility, hreflang and the sitemap all agree on whether a page is
 * actually publishable.
 */
import { getEntry, type CollectionEntry } from 'astro:content';

import { SITE, type Locale } from '../config';
import { localizedPath, type LanguageLinks } from '../i18n/utils';
import { hasPrivacyPlaceholders } from './privacy';

type PageEntry = CollectionEntry<'pages'>;

async function getPageEntry(locale: Locale, slug: string): Promise<PageEntry | undefined> {
  return getEntry('pages', `${locale}/${slug}`);
}

/** A privacy page is publishable when it exists, is not a draft, and has no placeholders. */
export async function getPublishablePrivacyEntry(
  locale: Locale,
): Promise<PageEntry | undefined> {
  const entry = await getPageEntry(locale, 'privacy');
  if (!entry || entry.data.draft) return undefined;
  if (hasPrivacyPlaceholders(entry.body ?? '')) return undefined;
  return entry;
}

/** All locales with a publishable privacy policy (currently likely none). */
export async function getPublishablePrivacyLocales(): Promise<Locale[]> {
  const locales: Locale[] = [];
  for (const locale of SITE.locales) {
    if (await getPublishablePrivacyEntry(locale)) locales.push(locale);
  }
  return locales;
}

/** Locale -> `/privacy/` path for every publishable policy. */
export async function getPrivacyLanguageLinks(): Promise<LanguageLinks> {
  const links: LanguageLinks = {};
  for (const locale of await getPublishablePrivacyLocales()) {
    links[locale] = localizedPath('/privacy/', locale);
  }
  return links;
}

/** About page entries are regular content pages; drafts are not published. */
export async function getAboutEntry(locale: Locale): Promise<PageEntry | undefined> {
  const entry = await getPageEntry(locale, 'about');
  return entry && !entry.data.draft ? entry : undefined;
}

/** Locale -> `/about/` path for every published about page. */
export async function getAboutLanguageLinks(): Promise<LanguageLinks> {
  const links: LanguageLinks = {};
  for (const locale of SITE.locales) {
    if (await getAboutEntry(locale)) links[locale] = localizedPath('/about/', locale);
  }
  return links;
}
