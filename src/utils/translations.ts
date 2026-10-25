/**
 * Pure translation-pairing helpers.
 *
 * `post.data.translationKey` is already normalized to the generated slug
 * when frontmatter omits it, so equality of normalized keys covers both:
 *  - explicit translationKey across different filenames/slugs
 *  - posts with no explicit key whose generated slugs match
 *
 * An explicit key on one side and a different explicit key on the other
 * must never pair just because their filenames happen to match.
 *
 * Kept free of `astro:content` imports so it can be unit-tested directly.
 */
export interface TranslationRef {
  translationKey: string;
  slug: string;
}

/**
 * Pick a sibling whose normalized translationKey exactly matches `entry`.
 */
export function selectTranslation<T>(
  entry: TranslationRef,
  candidates: readonly T[],
  keyOf: (candidate: T) => string,
): T | undefined {
  return candidates.find((candidate) => keyOf(candidate) === entry.translationKey);
}

/** True when two posts should be treated as translations of each other. */
export function postsAreTranslations(a: TranslationRef, b: TranslationRef): boolean {
  return a.translationKey === b.translationKey;
}
