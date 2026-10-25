/**
 * Pure resolver for Obsidian-style content links.
 *
 * Only definite source paths are rewritten:
 *   - `posts/<locale>/file.md` (with or without a leading slash)
 *   - `src/content/posts/<locale>/file.md`
 *   - relative links to an existing `.md`/`.mdx` source file
 *
 * Already-published site paths (`/posts/foo/`, `/en/posts/foo/`), assets,
 * external URLs and broken source links are returned as `null` so the
 * caller leaves them untouched.
 */
import { posix } from 'node:path';


export interface ContentLinkContext {
  /** Content-relative source path -> actual Astro content ID. */
  sourceIds: ReadonlyMap<string, string>;
  /** Content-relative path of the file currently being rendered. */
  currentSource?: string;
  locales: readonly string[];
  defaultLocale: string;
}

/** Normalize a source path for lookup (POSIX separators, no leading `./`). */
function normalizeSourcePath(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/')).replace(/^\.\//, '');
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Convert an actual content ID (`en/foo/bar`) to its public route. */
export function contentIdToRoute(
  id: string,
  locales: readonly string[],
  defaultLocale: string,
): string | null {
  const segments = id.split('/');
  const locale = segments[0] ?? '';
  if (!locales.includes(locale)) return null;
  const slug = segments.slice(1).join('/');
  if (!slug) return null;
  return locale === defaultLocale ? `/posts/${slug}/` : `/${locale}/posts/${slug}/`;
}

/**
 * Find the actual content ID for a source path.
 *
 * `candidate` is content-relative and may omit `.md`/`.mdx`; we only
 * return a hit for a file that actually exists in the source map.
 */
function lookupSource(
  candidate: string,
  sourceIds: ReadonlyMap<string, string>,
): string | undefined {
  const variants = [candidate, `${candidate}.md`, `${candidate}.mdx`];
  for (const variant of variants) {
    const key = normalizeSourcePath(variant);
    const id = sourceIds.get(key);
    if (id) return id;
    const decoded = normalizeSourcePath(decodePath(key));
    const decodedId = sourceIds.get(decoded);
    if (decodedId) return decodedId;
  }
  return undefined;
}

/** Split a URL-ish string into its path and query/hash suffix. */
function splitSuffix(rawUrl: string): { path: string; suffix: string } {
  const cut = rawUrl.search(/[?#]/);
  if (cut < 0) return { path: rawUrl, suffix: '' };
  return { path: rawUrl.slice(0, cut), suffix: rawUrl.slice(cut) };
}

/**
 * Resolve a Markdown link to an actual site route, or `null` to leave it
 * unchanged.
 */
export function resolveContentLink(rawUrl: string, context: ContentLinkContext): string | null {
  if (!rawUrl) return null;

  const { path: pathPart, suffix } = splitSuffix(rawUrl);
  if (!pathPart) return null;

  // External URL, protocol-relative URL, pure anchor.
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) return null;
  if (pathPart.startsWith('//') || pathPart.startsWith('#')) return null;

  const hasSourceExtension = /\.(md|mdx)$/i.test(pathPart);
  const localePattern = context.locales.join('|');
  const postsLocalePattern = new RegExp(`(^|/)posts/(${localePattern})(/|$)`);

  /** Existing site path: never rewrite, even if it contains "posts". */
  if (pathPart.startsWith('/')) {
    const isSrcContent = pathPart.startsWith('/src/content/');
    const isSourcePost =
      new RegExp(`^/posts/(${localePattern})/.+\\.(md|mdx)$`, 'i').test(pathPart) &&
      hasSourceExtension;
    if (!isSrcContent && !isSourcePost) return null;
  } else if (!hasSourceExtension && !postsLocalePattern.test(pathPart)) {
    // A bare relative asset / page path with no source markers.
    return null;
  }

  let candidate: string;
  if (pathPart.startsWith('/src/content/')) {
    candidate = pathPart.slice('/src/content/'.length);
  } else if (pathPart.startsWith('src/content/')) {
    candidate = pathPart.slice('src/content/'.length);
  } else if (pathPart.startsWith('/posts/')) {
    candidate = pathPart.slice(1);
  } else if (pathPart.startsWith('posts/')) {
    candidate = normalizeSourcePath(pathPart);
  } else if (context.currentSource) {
    const currentDir = posix.dirname(context.currentSource);
    candidate = normalizeSourcePath(posix.join(currentDir, pathPart));
  } else {
    // Without a source filename we cannot safely resolve a bare relative
    // link. Leave it untouched rather than inventing a destination.
    return null;
  }

  const id = lookupSource(candidate, context.sourceIds);
  if (!id) return null;

  const route = contentIdToRoute(id, context.locales, context.defaultLocale);
  if (!route) return null;
  return `${route}${suffix}`;
}
