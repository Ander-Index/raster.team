/**
 * Astro 6 content-entry ID generation.
 *
 * Astro's glob loader (`astro/dist/content/loaders/glob.js` ->
 * `getContentEntryIdAndSlug` in `astro/dist/content/utils.js`) removes the
 * extension, then runs `github-slugger` on EVERY path segment and joins
 * them with `/`. This is deliberately different from the taxonomy
 * `slugify()` helper: underscores are preserved, `+`/`.`/spaces are not.
 *
 * Keep this as the single source of truth for source-path -> entry ID so
 * the internal-link plugin does not grow a second, divergent algorithm.
 */
import { slug as githubSlug } from 'github-slugger';

/** Convert a path relative to a collection base into the actual loader ID. */
export function contentEntryId(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');
  const withoutExtension = normalized.replace(/\.(md|mdx)$/i, '');
  return withoutExtension
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}
