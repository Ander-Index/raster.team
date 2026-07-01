/* global URL */
/**
 * i18n utilities.
 *
 * Routing rules:
 *  - ZH is the default locale and serves at the URL root with NO prefix.
 *  - EN is served under `/en/...`, JA under `/ja/...`.
 *  - The `/zh/...` prefix is a Cloudflare Pages edge 301 -> root alias
 *    (see `public/_redirects`); no `/zh/` pages are generated here.
 *
 * Source-of-truth: `src/config.ts` -> SITE.locales / SITE.defaultLocale.
 */

import { SITE, SITE_TITLES, SITE_TAGLINES, type Locale } from '../config';
import { messages, type UIKey } from './ui';

const DEFAULT_LOCALE: Locale = SITE.defaultLocale;

/**
 * Per-locale metadata — the single source for html lang, Intl date
 * formatting, Open Graph locale, Giscus locale and switcher labels.
 * Adding a locale never requires touching a `switch` again.
 */
export const LOCALE_META: Record<
  Locale,
  { label: string; htmlLang: string; intl: string; og: string; giscus: string }
> = {
  zh: { label: '中文', htmlLang: 'zh', intl: 'zh', og: 'zh_CN', giscus: 'zh-CN' },
  en: { label: 'English', htmlLang: 'en', intl: 'en', og: 'en_US', giscus: 'en' },
  ja: { label: '日本語', htmlLang: 'ja', intl: 'ja', og: 'ja_JP', giscus: 'ja' },
};

/** Locale-aware site title (标题). */
export function siteTitle(locale: Locale): string {
  return SITE_TITLES[locale] ?? SITE.title;
}

/** Locale-aware tagline / subtitle (副标题). */
export function siteTagline(locale: Locale): string {
  return SITE_TAGLINES[locale] ?? SITE.description;
}

/** Configured base path (no trailing slash). E.g. '/chirping-astro' or ''. */
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

/**
 * Prefix an absolute path with the configured `base`. Safe to call with
 * already-prefixed paths (it won't double up) or with empty/relative
 * paths (returned unchanged).
 */
export function withBase(path: string): string {
  if (!path || !path.startsWith('/')) return path;
  if (!BASE) return path;
  if (path === BASE || path.startsWith(`${BASE}/`)) return path;
  return `${BASE}${path}`;
}

/** Returns the leading locale prefix or '' for the default locale. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Build a localized URL for the given pathname (without locale prefix).
 *
 *   localizedPath('/posts/foo', 'zh') -> '/posts/foo'
 *   localizedPath('/posts/foo', 'en') -> '/en/posts/foo'
 *   localizedPath('/', 'ja')          -> '/ja/'
 *
 * The configured `base` (e.g. `/chirping-astro`) is automatically
 * prefixed when set.
 */
export function localizedPath(path: string, locale: Locale): string {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  const localized =
    locale === DEFAULT_LOCALE ? cleaned : cleaned === '/' ? `/${locale}/` : `/${locale}${cleaned}`;
  return withBase(localized);
}

/**
 * Detect the current locale from a URL or Astro.url.pathname.
 * Anything starting with `/en` or `/ja` resolves to that locale; otherwise
 * the default locale (zh) is returned.
 */
export function detectLocale(pathname: string): Locale {
  const p = stripBase(pathname);
  for (const locale of SITE.locales) {
    if (locale === DEFAULT_LOCALE) continue;
    if (p === `/${locale}` || p.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

/** Strip the configured base path prefix from a pathname. */
function stripBase(pathname: string): string {
  if (!BASE) return pathname;
  if (pathname === BASE) return '/';
  if (pathname.startsWith(`${BASE}/`)) return pathname.slice(BASE.length);
  return pathname;
}

/**
 * Strip the locale prefix from a pathname so it can be relocalized.
 *
 *   stripLocale('/en/posts/foo')  -> '/posts/foo'
 *   stripLocale('/posts/foo')     -> '/posts/foo'
 *   stripLocale('/ja')            -> '/'
 */
export function stripLocale(pathname: string): string {
  const p = stripBase(pathname);
  for (const locale of SITE.locales) {
    if (locale === DEFAULT_LOCALE) continue;
    if (p === `/${locale}` || p === `/${locale}/`) return '/';
    if (p.startsWith(`/${locale}/`)) return p.slice(`/${locale}`.length);
  }
  return p;
}

/**
 * Translation helper. Returns the localized string for the given key,
 * falling back to the default locale, then to the key itself.
 *
 *   const t = useTranslations('ja');
 *   t('nav.home') // 'ホーム'
 */
// eslint-disable-next-line no-unused-vars
export function useTranslations(locale: Locale): (key: UIKey) => string {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE] ?? {};
  return function t(key: UIKey): string {
    return dict[key] ?? messages[DEFAULT_LOCALE]?.[key] ?? key;
  };
}

/**
 * Locale-aware date formatter.
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  if (SITE.isoDates) return d.toISOString().slice(0, 10);
  const lang = LOCALE_META[locale].intl;
  return new Intl.DateTimeFormat(lang, options).format(d);
}

/** Short ISO 8601 date used for <time datetime="..."> attributes. */
export function isoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * Map a "logical" path through every supported locale to power
 * <link rel="alternate" hreflang="..."> SEO tags.
 *
 * `pathWithoutLocale` should be the canonical path WITHOUT locale prefix
 * (e.g. '/posts/welcome' for both EN and FR). Pass `availableLocales` to
 * limit the output to a subset (e.g. when a post has no translation
 * sibling in another locale).
 */
export function alternates(
  pathWithoutLocale: string,
  availableLocales?: readonly Locale[],
): Array<{
  locale: Locale | 'x-default';
  href: string;
}> {
  const locales = (availableLocales ?? SITE.locales) as readonly Locale[];
  const list: Array<{ locale: Locale | 'x-default'; href: string }> = locales.map((locale) => ({
    locale,
    href: new URL(localizedPath(pathWithoutLocale, locale), SITE.url).toString(),
  }));
  // x-default points at the default locale only when it's actually
  // available for this path; otherwise drop it.
  if (locales.includes(DEFAULT_LOCALE)) {
    list.push({
      locale: 'x-default',
      href: new URL(localizedPath(pathWithoutLocale, DEFAULT_LOCALE), SITE.url).toString(),
    });
  }
  return list;
}

/** Compute the canonical URL for a localized path. */
export function canonicalUrl(pathname: string): string {
  return new URL(pathname, SITE.url).toString();
}

/** Pretty label for the language switcher. */
export function localeLabel(locale: Locale): string {
  return LOCALE_META[locale].label;
}

/** ISO BCP 47 language tag for `<html lang>` and date formatters. */
export function htmlLang(locale: Locale): string {
  return LOCALE_META[locale].htmlLang;
}
