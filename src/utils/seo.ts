/* global URL */
import { SITE, type Locale } from '../config';
import { alternates, alternatesByPath, withBase, siteTitle, siteTagline } from '../i18n/utils';

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  type: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  locale: Locale;
  hreflangs: ReturnType<typeof alternates>;
  /**
   * When `true`, the SEO component emits
   * `<meta name="robots" content="noindex, nofollow">`.
   * Set automatically for unlisted posts/pages when
   * `unlistedHideFromSeo` is `true` (the default).
   */
  noindex?: boolean;
}

interface BuildSeoArgs {
  title?: string;
  description?: string;
  pathWithoutLocale: string;
  fullPath: string;
  locale: Locale;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  /**
   * Restrict hreflang alternates to a subset of locales. Used on post
   * pages where a translation may be missing.
   */
  availableLocales?: readonly Locale[];
  /**
   * Explicit per-locale paths (without locale prefix) for hreflang
   * alternates. Use when the same logical page lives at DIFFERENT paths
   * per locale (e.g. translated tag pages). Takes precedence over
   * `pathWithoutLocale` + `availableLocales`.
   */
  hreflangPaths?: Partial<Record<Locale, string>>;
  /** Emit `<meta name="robots" content="noindex, nofollow">`. */
  noindex?: boolean;
}

/** Build the SEO data block consumed by `<SEO />`. */
export function buildSeo(args: BuildSeoArgs): SeoMeta {
  return {
    title:
      args.title && args.title !== siteTitle(args.locale)
        ? `${args.title} — ${siteTitle(args.locale)}`
        : siteTitle(args.locale),
    description: args.description ?? siteTagline(args.locale),
    canonical: new URL(args.fullPath, SITE.url).toString(),
    ogImage: new URL(withBase(args.ogImage ?? SITE.defaultOgImage), SITE.url).toString(),
    type: args.type ?? 'website',
    publishedTime: args.publishedTime?.toISOString(),
    modifiedTime: args.modifiedTime?.toISOString(),
    tags: args.tags,
    locale: args.locale,
    hreflangs: args.hreflangPaths
      ? alternatesByPath(args.hreflangPaths)
      : alternates(args.pathWithoutLocale, args.availableLocales),
    noindex: args.noindex,
  };
}
