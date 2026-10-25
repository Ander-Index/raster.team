import { describe, expect, test } from 'bun:test';

import { contentEntryId } from './content-id';
import { resolveContentLink, type ContentLinkContext } from './internal-links';

function context(currentSource?: string): ContentLinkContext {
  const sources = [
    'posts/zh/tutorials/writing-with-ink.md',
    'posts/zh/tutorials/RunningYourInk_Simplified-Chinese.md',
    'posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md',
    'posts/zh/tutorials/macos-12+-的系统壁纸路径.md',
    'posts/zh/demo/demo-theme-features 1.md',
    'posts/zh/terms/eulas/utau中华组wiki公共使用规约-copy.md',
    'posts/zh/voicedbs/utau/example.md',
    'posts/ja/voicedbs/utau/example.mdx',
    'posts/en/voicedbs/utau/evan_japanese_vcv.md',
  ];
  const sourceIds = new Map<string, string>();
  for (const source of sources) {
    sourceIds.set(source, contentEntryId(source.replace(/^posts\//, '')));
  }
  return {
    sourceIds,
    currentSource,
    locales: ['zh', 'en', 'ja'],
    defaultLocale: 'zh',
  };
}

describe('resolveContentLink', () => {
  test('leaves already-published post URLs untouched', () => {
    const ctx = context();
    expect(resolveContentLink('/posts/voicedbs/utau/moyanming_japanese_vcv/', ctx)).toBeNull();
    expect(
      resolveContentLink('/en/posts/voicedbs/utau/evan_japanese_vcv/', ctx),
    ).toBeNull();
    expect(resolveContentLink('/posts/tools/reaper__chinese-simplifiedreaperlangpack/', ctx)).toBeNull();
  });

  test('rewrites locale source files without doubling posts', () => {
    const ctx = context();
    expect(resolveContentLink('/posts/zh/voicedbs/utau/example.md', ctx)).toBe(
      '/posts/voicedbs/utau/example/',
    );
    expect(resolveContentLink('posts/en/voicedbs/utau/evan_japanese_vcv.md', ctx)).toBe(
      '/en/posts/voicedbs/utau/evan_japanese_vcv/',
    );
    expect(resolveContentLink('posts/ja/voicedbs/utau/example.mdx', ctx)).toBe(
      '/ja/posts/voicedbs/utau/example/',
    );
  });

  test('accepts explicit src/content source paths', () => {
    const ctx = context();
    expect(resolveContentLink('/src/content/posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md', ctx)).toBe(
      '/posts/tools/reaper__chinese-simplifiedreaperlangpack/',
    );
    expect(resolveContentLink('src/content/posts/ja/voicedbs/utau/example.mdx', ctx)).toBe(
      '/ja/posts/voicedbs/utau/example/',
    );
  });

  test('uses Astro loader IDs: underscores kept, plus/dot/space normalized', () => {
    const ctx = context();
    expect(resolveContentLink('posts/zh/tools/reaper__chinese-simplified.reaperlangpack.md', ctx)).toBe(
      '/posts/tools/reaper__chinese-simplifiedreaperlangpack/',
    );
    expect(resolveContentLink('posts/zh/tutorials/macos-12+-的系统壁纸路径.md', ctx)).toBe(
      '/posts/tutorials/macos-12-的系统壁纸路径/',
    );
    expect(resolveContentLink('posts/zh/demo/demo-theme-features 1.md', ctx)).toBe(
      '/posts/demo/demo-theme-features-1/',
    );
  });

  test('resolves relative source links against the current file', () => {
    const ctx = context('posts/zh/tutorials/writing-with-ink.md');
    expect(resolveContentLink('RunningYourInk_Simplified-Chinese.md#tags', ctx)).toBe(
      '/posts/tutorials/runningyourink_simplified-chinese/#tags',
    );
  });

  test('preserves query and hash suffixes', () => {
    const ctx = context();
    expect(resolveContentLink('posts/zh/demo/demo-theme-features 1.md?x=1#top', ctx)).toBe(
      '/posts/demo/demo-theme-features-1/?x=1#top',
    );
  });

  test('resolves percent-encoded Unicode source paths', () => {
    const ctx = context();
    const encoded = encodeURIComponent('utau中华组wiki公共使用规约-copy');
    expect(resolveContentLink(`posts/zh/terms/eulas/${encoded}.md`, ctx)).toBe(
      '/posts/terms/eulas/utau中华组wiki公共使用规约-copy/',
    );
  });

  test('leaves external, protocol-relative, anchors and assets untouched', () => {
    const ctx = context();
    for (const url of [
      'https://example.com/posts/zh/foo.md',
      '//example.com/posts/zh/foo.md',
      '#section',
      '/images/foo.png',
      '../assets/cover.jpg',
      '/search/?q=foo',
      'mailto:team@example.com',
    ]) {
      expect(resolveContentLink(url, ctx)).toBeNull();
    }
  });

  test('does not invent routes for broken source links', () => {
    const ctx = context('posts/zh/tutorials/writing-with-ink.md');
    expect(resolveContentLink('RunningYourInk.md', ctx)).toBeNull();
    expect(resolveContentLink('/posts/zh/missing.md', ctx)).toBeNull();
    expect(resolveContentLink('/posts/__raw/about_nomo-wang/', ctx)).toBeNull();
  });
});
