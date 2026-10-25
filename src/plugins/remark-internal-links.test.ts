import { describe, expect, test } from 'bun:test';

import { remarkInternalLinks } from './remark-internal-links';

type Node = { type: string; url?: string; children?: Node[] };

describe('remarkInternalLinks transformer', () => {
  test('rewrites inline links and reference definitions through actual content IDs', () => {
    const tree: Node = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'link', url: 'posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md' },
            { type: 'link', url: '/en/posts/voicedbs/utau/evan_japanese_vcv/' },
          ],
        },
        { type: 'definition', url: 'posts/zh/tutorials/macos-12+-的系统壁纸路径.md?x=1#top' },
      ],
    };

    remarkInternalLinks()(tree);

    const links = tree.children?.[0]?.children as Node[];
    expect(links[0].url).toBe('/posts/tools/reaper__chinese-simplifiedreaperlangpack/');
    // Already-published locale URLs must not be doubled.
    expect(links[1].url).toBe('/en/posts/voicedbs/utau/evan_japanese_vcv/');
    expect(tree.children?.[1]?.url).toBe('/posts/tutorials/macos-12-的系统壁纸路径/?x=1#top');
  });
});
