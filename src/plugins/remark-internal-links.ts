import { SITE, type Locale } from '../config';
import { withBase } from '../i18n/utils';

type Node = {
  type: string;
  url?: string | null;
  children?: Node[];
};

/**
 * Rewrite Obsidian-style internal links to their canonical site URLs.
 *
 * In Obsidian (vault root = `src/content/`, link format = "Absolute path in
 * vault"), a link to a post is written as the content-collection path, e.g.:
 *
 *   posts/zh/terms/eulas/mitsukawa-takeshi.md
 *
 * But the site serves the default locale (zh) at the URL root (no `/zh/`),
 * drops the `.md` extension, and prefixes `/posts/`. So the real URL is:
 *
 *   /posts/terms/eulas/mitsukawa-takeshi/
 *
 * This mirrors the logic of `postPath()` in `src/utils/posts.ts`. Non-default
 * locales keep their prefix: a reference to `posts/ja/foo.md` resolves to
 * `/ja/posts/foo/`, even from a zh post (explicit cross-locale link).
 *
 * Only links that clearly reference a content file are rewritten:
 *   - end with `.md` / `.mdx`, OR
 *   - contain a `posts/` segment with a following locale segment.
 * Everything else (external URLs, anchors, real site paths) is left untouched.
 * A trailing `#hash` / `?query` is preserved.
 */
function resolveContentLink(rawUrl: string): string | null {
  if (!rawUrl) return null;

  // Split off any trailing hash / query; re-attached at the end.
  const hashIdx = rawUrl.indexOf('#');
  const queryIdx = rawUrl.indexOf('?');
  let cut = rawUrl.length;
  if (hashIdx >= 0) cut = Math.min(cut, hashIdx);
  if (queryIdx >= 0) cut = Math.min(cut, queryIdx);
  const pathPart = rawUrl.slice(0, cut);
  const suffix = rawUrl.slice(cut);

  // Skip external URLs, protocol-relative URLs and pure anchors.
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart)) return null;
  if (pathPart.startsWith('//')) return null;
  if (pathPart.startsWith('#')) return null;

  const hasMdExt = /\.(md|mdx)$/i.test(pathPart);
  const hasPostsSeg = /(^|\/)posts\//.test(pathPart);
  if (!hasMdExt && !hasPostsSeg) return null;

  const segments = pathPart
    .replace(/^\.{1,2}\//, '') // strip leading ./ or ../
    .replace(/^\/+/, '') // strip leading slashes
    .split('/');

  const localeSet = SITE.locales as readonly string[];
  const localeIdx = segments.findIndex((s) => localeSet.includes(s));
  if (localeIdx < 0) return null;

  const targetLocale = segments[localeIdx] as Locale;
  const slug = segments
    .slice(localeIdx + 1)
    .join('/')
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/+$/, '');

  const urlPath =
    targetLocale === SITE.defaultLocale
      ? `/posts/${slug}/`
      : `/${targetLocale}/posts/${slug}/`;

  return `${withBase(urlPath)}${suffix}`;
}

export function remarkInternalLinks() {
  return (tree: Node) => {
    function visit(node: Node | undefined) {
      if (!node) return;

      if (node.type === 'link' && typeof node.url === 'string') {
        const resolved = resolveContentLink(node.url);
        if (resolved) node.url = resolved;
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    }

    visit(tree);
  };
}
