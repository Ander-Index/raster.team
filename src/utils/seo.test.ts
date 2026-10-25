import { describe, expect, test } from 'bun:test';

import { buildSeo } from './seo';

const base = {
  title: 'Post',
  description: 'Description',
  pathWithoutLocale: '/posts/foo/',
  fullPath: '/posts/foo/',
  locale: 'zh' as const,
};

describe('buildSeo', () => {
  test('honors frontmatter canonicalURL', () => {
    const meta = buildSeo({ ...base, canonical: 'https://example.com/canonical' });
    expect(meta.canonical).toBe('https://example.com/canonical');
  });

  test('uses one explicit actual map for hreflang alternates', () => {
    const meta = buildSeo({
      ...base,
      hreflangLinks: {
        zh: '/posts/voicedbs/utau/moyanming_japanese_vcv/',
        en: '/en/posts/voicedbs/utau/evan_japanese_vcv/',
      },
    });
    expect(meta.hreflangs.map((item) => [item.locale, new URL(item.href).pathname])).toEqual([
      ['zh', '/posts/voicedbs/utau/moyanming_japanese_vcv/'],
      ['en', '/en/posts/voicedbs/utau/evan_japanese_vcv/'],
      ['x-default', '/posts/voicedbs/utau/moyanming_japanese_vcv/'],
    ]);
  });
});
