import { SITE } from '../config';
import { withBase } from '../i18n/utils';

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');
export const SITEMAP_XSL_HREF = `${BASE}/sitemap/styles.xsl`;

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}

export function sitemapIndexXml(): string {
  const loc = absoluteUrl(withBase('/sitemap-0.xml'));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<?xml-stylesheet type="text/xsl" href="${escapeXml(SITEMAP_XSL_HREF)}"?>`,
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`,
    '</sitemapindex>',
    '',
  ].join('\n');
}
