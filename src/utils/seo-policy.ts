/**
 * SEO visibility policy shared by layouts, sitemap generation and tests.
 *
 * `unlistedHideFromSeo` is deliberately independent of `unlisted`:
 *  - a listed post can opt out of search engines with `unlistedHideFromSeo: true`
 *  - an unlisted post can opt *in* to indexing with `unlistedHideFromSeo: false`
 *    (it still stays out of every aggregation, sitemap and Pagefind index)
 */
export interface SeoVisibilityFlags {
  unlisted: boolean;
  unlistedHideFromSeo?: boolean;
}

/** Whether a post/page should emit `<meta name="robots" content="noindex">`. */
export function shouldNoindex(data: SeoVisibilityFlags): boolean {
  return data.unlistedHideFromSeo ?? data.unlisted;
}

/** Whether a page is safe to include in sitemap/Pagefind output. */
export function isIndexable(data: SeoVisibilityFlags): boolean {
  return !shouldNoindex(data);
}
