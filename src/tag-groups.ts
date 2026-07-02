/**
 * Tag translation table.
 * ─────────────────────────────────────────────────────────────
 * Each ROW links the same logical tag across locales. When a reader
 * views a tag page in one locale, the language switcher offers to
 * jump to the equivalent tag in any other locale listed on the same
 * row.
 *
 * Tags NOT listed here still work perfectly — they just won't get a
 * cross-language link in the switcher.
 *
 * HOW TO EDIT
 *   • Add one object per logical tag.
 *   • Omit any locale where the tag has no translation; that locale
 *     simply won't appear in the switcher for this tag.
 *   • The values must match the tag strings used in post frontmatter
 *     EXACTLY (case-sensitive). Slugs are derived automatically.
 *
 *   { zh: '友链', en: 'Links', ja: 'リンク' },
 *   { zh: '关于', en: 'About' },            // no Japanese version
 *   { en: 'JavaScript' },                    // shared across locales
 */

import type { Locale } from './config';

export type TagGroup = Partial<Record<Locale, string>>;

export const TAG_GROUPS: readonly TagGroup[] = [
  // ─── Site / meta ──────────────────────────────────────────
  { zh: '关于', en: 'About', ja: '概要' },
  { zh: '友链', en: 'Links', ja: 'リンク' },
  { zh: '更新日志', en: 'Changelog', ja: '更新履歴' },

  // ─── Content types ────────────────────────────────────────
  { zh: '教程', en: 'Tutorial', ja: 'チュートリアル' },
  { zh: '作品', en: 'Creations', ja: '作品' },
  { zh: '音乐', en: 'Music', ja: '音楽' },
  { zh: '游戏', en: 'Game', ja: 'ゲーム' },
  { zh: '歌词', en: 'Lyrics', ja: '歌詞' },
  { zh: '模型', en: 'Model', ja: 'モデル' },
  { zh: '工具', en: 'Tool', ja: 'ツール' },
  { zh: '音频', en: 'Audio', ja: 'オーディオ' },
  { zh: '关于', en: 'About' },
  
  // ─── Legal ────────────────────────────────────────────────
  { zh: '使用规约', en: 'EULA', ja: '利用規約' },

];
