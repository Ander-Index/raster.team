import type { APIRoute } from 'astro';

import { SITE } from '../config';
import { getSitemapRoutes } from '../utils/site-routes';
import { absoluteUrl, escapeXml, SITEMAP_XSL_HREF } from '../utils/sitemap-xml';

export const prerender = true;

export const GET: APIRoute = async () => {
  const routes = await getSitemapRoutes();
  const urls = routes.map((route) => {
    const alternates = SITE.locales
      .filter((locale) => route.links[locale])
      .map(
        (locale) =>
          `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absoluteUrl(route.links[locale]!))}"/>`,
      );
    if (route.links[SITE.defaultLocale]) {
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(route.links[SITE.defaultLocale]!))}"/>`,
      );
    }
    return [
      '  <url>',
      `    <loc>${escapeXml(absoluteUrl(route.path))}</loc>`,
      ...alternates,
      '  </url>',
    ].join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<?xml-stylesheet type="text/xsl" href="${escapeXml(SITEMAP_XSL_HREF)}"?>`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
