import { describe, expect, test } from 'bun:test';

import { postsAreTranslations, selectTranslation } from './translations';

const keyOf = (post: { key: string }) => post.key;

describe('translation pairing', () => {
  test('translationKey matches across different slugs', () => {
    const entry = { translationKey: 'moyanming_japanese_vcv', slug: 'moyanming_japanese_vcv' };
    const candidates = [
      { key: 'unrelated', slug: 'moyanming_japanese_vcv' },
      { key: 'moyanming_japanese_vcv', slug: 'evan_japanese_vcv' },
    ];
    expect(selectTranslation(entry, candidates, keyOf)?.slug).toBe('evan_japanese_vcv');
  });

  test('both omitted keys normalize to the same slug and pair', () => {
    const entry = { translationKey: 'shared-slug', slug: 'shared-slug' };
    const candidates = [{ key: 'shared-slug', slug: 'shared-slug' }];
    expect(selectTranslation(entry, candidates, keyOf)?.key).toBe('shared-slug');
  });

  test('conflicting explicit keys never pair just because slugs match', () => {
    const entry = { translationKey: 'explicit-a', slug: 'same-slug' };
    const candidates = [{ key: 'explicit-b', slug: 'same-slug' }];
    expect(selectTranslation(entry, candidates, keyOf)).toBeUndefined();
  });

  test('one explicit custom key and one omitted key do not pair by slug', () => {
    const entry = { translationKey: 'custom-key', slug: 'same-slug' };
    const candidates = [{ key: 'same-slug', slug: 'same-slug' }];
    expect(selectTranslation(entry, candidates, keyOf)).toBeUndefined();
  });

  test('no matching key returns undefined', () => {
    const entry = { translationKey: 'a', slug: 'a' };
    expect(selectTranslation(entry, [{ key: 'b', slug: 'c' }], keyOf)).toBeUndefined();
  });

  test('postsAreTranslations uses normalized key equality only', () => {
    expect(
      postsAreTranslations(
        { translationKey: 'a', slug: 'x' },
        { translationKey: 'a', slug: 'y' },
      ),
    ).toBe(true);
    expect(
      postsAreTranslations(
        { translationKey: 'a', slug: 'x' },
        { translationKey: 'b', slug: 'x' },
      ),
    ).toBe(false);
  });
});
