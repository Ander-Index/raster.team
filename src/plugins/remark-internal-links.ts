import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE } from '../config';
import { withBase } from '../i18n/utils';
import { contentEntryId } from '../utils/content-id';
import { resolveContentLink } from '../utils/internal-links';

type Node = {
  type: string;
  url?: string | null;
  children?: Node[];
};

type VFileLike = {
  path?: string | URL;
};

const CONTENT_ROOT = join(process.cwd(), 'src', 'content');
const POSTS_ROOT = join(CONTENT_ROOT, 'posts');

function walkSourceFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkSourceFiles(path, files);
    } else if (/\.(md|mdx)$/i.test(name)) {
      files.push(path);
    }
  }
  return files;
}

/**
 * Content-relative source path -> actual Astro loader ID.
 * e.g. `posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md`
 *   -> `zh/tools/reaper__chinese-simplifiedreaperlangpack`
 */
function collectSourceIds(): Map<string, string> {
  const map = new Map<string, string>();
  let files: string[];
  try {
    files = walkSourceFiles(POSTS_ROOT);
  } catch {
    return map;
  }
  for (const file of files) {
    const relativeToPosts = relative(POSTS_ROOT, file).replaceAll('\\', '/');
    const sourceKey = `posts/${relativeToPosts}`;
    map.set(sourceKey, contentEntryId(relativeToPosts));
  }
  return map;
}

function currentSourceFromFile(file: VFileLike | undefined): string | undefined {
  if (!file?.path) return undefined;
  let absolute: string;
  try {
    const raw = file.path instanceof URL ? fileURLToPath(file.path) : String(file.path);
    absolute = raw.startsWith('file:') ? fileURLToPath(raw) : raw;
  } catch {
    return undefined;
  }
  const relativeToContent = relative(CONTENT_ROOT, absolute).replaceAll('\\', '/');
  return relativeToContent.startsWith('..') ? undefined : relativeToContent;
}

export function remarkInternalLinks() {
  let sourceIds: Map<string, string> | undefined;

  return (tree: Node, file?: VFileLike) => {
    sourceIds ??= collectSourceIds();
    const currentSource = currentSourceFromFile(file);
    const context = {
      sourceIds,
      currentSource,
      locales: SITE.locales,
      defaultLocale: SITE.defaultLocale,
    };

    function visit(node: Node | undefined) {
      if (!node) return;

      if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
        const resolved = resolveContentLink(node.url, context);
        // Only rewrite a link when it maps to a real content entry; broken
        // source links, assets, external URLs and published site paths
        // stay byte-for-byte unchanged.
        if (resolved) node.url = withBase(resolved);
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    }

    visit(tree);
  };
}
