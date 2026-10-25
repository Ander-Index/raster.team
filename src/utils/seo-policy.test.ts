import { describe, expect, test } from 'bun:test';

import { isIndexable, shouldNoindex } from './seo-policy';

describe('SEO visibility policy', () => {
  test('unlisted defaults to noindex', () => {
    expect(shouldNoindex({ unlisted: true })).toBe(true);
  });

  test('unlisted can explicitly stay indexable', () => {
    expect(shouldNoindex({ unlisted: true, unlistedHideFromSeo: false })).toBe(false);
  });

  test('listed can independently opt out of SEO', () => {
    expect(shouldNoindex({ unlisted: false, unlistedHideFromSeo: true })).toBe(true);
  });

  test('listed without flag is indexable', () => {
    expect(shouldNoindex({ unlisted: false })).toBe(false);
    expect(isIndexable({ unlisted: false })).toBe(true);
  });
});
