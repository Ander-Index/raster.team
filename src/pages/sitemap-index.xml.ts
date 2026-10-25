import type { APIRoute } from 'astro';

import { sitemapIndexXml } from '../utils/sitemap-xml';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(sitemapIndexXml(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
