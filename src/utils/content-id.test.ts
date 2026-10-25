import { describe, expect, test } from 'bun:test';

import { contentEntryId } from './content-id';

describe('contentEntryId', () => {
  test('matches Astro 6 glob loader github-slugger semantics', () => {
    expect(contentEntryId('zh/tools/reaper__chinese-simplified.reaperlangpack.md')).toBe(
      'zh/tools/reaper__chinese-simplifiedreaperlangpack',
    );
    expect(contentEntryId('zh/tutorials/macos-12+-的系统壁纸路径.md')).toBe(
      'zh/tutorials/macos-12-的系统壁纸路径',
    );
    expect(contentEntryId('zh/demo/demo-theme-features 1.mdx')).toBe(
      'zh/demo/demo-theme-features-1',
    );
    expect(contentEntryId('ja/voicedbs/utau/shinne-tatsu_japanese_vcv_1.0.md')).toBe(
      'ja/voicedbs/utau/shinne-tatsu_japanese_vcv_10',
    );
  });

  test('collapses a trailing index file the same way Astro does', () => {
    expect(contentEntryId('en/index.md')).toBe('en');
  });
});
