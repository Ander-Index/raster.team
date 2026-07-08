---
title: 主题功能演示
description: 本页演示 Chirping Astro 主题所有可用的排版、组件与 Markdown 功能，供写文章时参考。
pubDate: 2026-07-01T00:00:00.000Z
tags:
  - Demo
categories:
  - Demo
draft: false
toc: true
math: true
pinned: true
unlisted: true
lang: zh
---

这是 Chirping Astro 主题的**完整功能演示**。写文章时可以随时回来查阅可用语法。

<!-- more -->

## 排版基础

### 文本样式

**粗体**、*斜体*、~~删除线~~、`行内代码`、[链接](https://astro.build)。

> 引用块：这是一段引用文字，左边有彩色边框和浅色背景。

### 列表

无序列表：
- 第一项
- 第二项
  - 嵌套子项
  - 另一个子项
- 第三项

有序列表：
1. 第一步
2. 第二步
3. 第三步

任务列表（GFM）：
- [x] 已完成的任务
- [ ] 未完成的任务
- [ ] 另一个待办

### 分隔线

---

## 标题与目录

H2 ~ H4 会自动出现在右侧目录（TOC）中，并带有锚点链接（鼠标悬停显示 `#`）。

### 这是 H3
#### 这是 H4

## 表格（GFM）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | *(必填)* | 文章标题，最多 140 字符 |
| `description` | string | *(必填)* | 用于 SEO / RSS / 卡片摘要 |
| `pubDate` | date | *(必填)* | 发布日期 |
| `draft` | boolean | `false` | 草稿，生产环境隐藏 |
| `math` | boolean | `false` | 启用 KaTeX 数学公式 |
| `pinned` | boolean | `false` | 置顶到列表顶部 |

## 代码块

### 基础代码块（带复制按钮）

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('Team Raster'));
```

### 带标题的代码块

```ts title="src/config.ts" {3} ins={4} del={5}
const SITE = {
  title: '光栅组',
  defaultLocale: 'zh',  // ← 高亮第 3 行
  locales: ['zh', 'en', 'ja'],  // ← 新增行（绿色）
  // oldLocales: ['en', 'fr'],  // ← 删除行（红色）
} satisfies SiteConfig;
```

### Diff 代码块

```diff
- const locales = ['en', 'fr'];
+ const locales = ['zh', 'en', 'ja'];
```

### 折叠代码块

```js collapse={1-5}
function thisIsAVeryLongFunction() {
  // 这段代码默认折叠
  // 点击展开后才能看到
  // 适合隐藏冗长的配置
  return 'hidden content';
}
console.log('visible');
```

## Alert 提示框

用 ` ```alert ` 围栏代码块生成（非 MDX，纯 Markdown 即可）：

```alert
type: info
title: 提示
description: 这是一个 info 类型的提示框，默认带 lucide:info 图标。
```

```alert
type: success
title: 成功
description: 操作已成功完成。
```

```alert
type: warning
title: 警告
description: 请注意这个潜在的问题。
```

```alert
type: error
title: 错误
description: 这个操作可能会导致问题。
```

```alert
type: info
style: outline
icon: none
title: 无图标 + 描边样式
description: style 可选 soft | outline | dash，icon 设为 none 可隐藏图标。
```

## 数学公式（KaTeX）

> 需在 frontmatter 设置 `math: true`，KaTeX CSS 仅在该页加载。

行内公式：$E = mc^2$，$\pi \approx 3.14159$。

展示公式：

$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## 图片

### 远程图片

Markdown 内联图片（`![](https://...)`）会经过 Astro 图片管线优化。如需直接输出原始 `<img>`，可用 `ashtml` 块：

```ashtml
<img src="https://astro.build/assets/press/astro-icon-gradient.png" alt="Astro Logo" loading="lazy" />
```

### 图片说明（Figure）

> 使用 Markdown 引用语法或 HTML `<figure>` 标签会自动渲染为带说明文字的图片。

## 嵌入 HTML（ashtml）

用 ` ```ashtml ` 围栏块直接输出原始 HTML：

```ashtml
<div style="display:flex;gap:8px;justify-content:center;padding:12px;">
  <span style="background:#570dfc;color:#fff;padding:4px 12px;border-radius:6px;">Primary</span>
  <span style="background:#13b886;color:#fff;padding:4px 12px;border-radius:6px;">Success</span>
  <span style="background:#f68700;color:#fff;padding:4px 12px;border-radius:6px;">Warning</span>
</div>
```

## MDX 组件（需使用 `.mdx` 文件）

> 以下语法仅在 `.mdx` 文件中有效（需将文件后缀从 `.md` 改为 `.mdx`）。

### Callout 组件

```mdx
import Callout from '../../components/Callout.astro';

<Callout type="info" title="注意">
  这是一个 info 类型的 Callout 组件。
</Callout>

<Callout type="warning" title="小心">
  这是一个 warning 类型的 Callout 组件。
</Callout>
```

### VideoEmbed 组件

```mdx
import VideoEmbed from '../../components/VideoEmbed.astro';

<!-- YouTube -->
<VideoEmbed platform="youtube" id="dQw4w9WgXcQ" title="视频标题" />

<!-- Bilibili 或任意 iframe -->
<VideoEmbed src="//player.bilibili.com/player.html?bvid=BV1xx411c7mD" title="B站视频" />
```

### SmartImage 组件

```mdx
import SmartImage from '../../components/SmartImage.astro';

<SmartImage
  src="https://example.com/photo.jpg"
  alt="描述文字"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
/>
```

## Frontmatter 字段速查

```yaml title="完整 frontmatter 示例"
---
title: 文章标题（必填，1-140 字符）
description: 摘要描述（必填，1-280 字符，用于 SEO/RSS/卡片）
pubDate: 2026-07-01T00:00:00.000Z     # 发布日期（必填）
updatedDate: 2026-07-02T00:00:00.000Z  # 更新日期（可选）
tags: [标签1, 标签2]                     # 标签数组
categories: [分类]                       # 分类数组
draft: false                            # 草稿模式（生产环境隐藏）
heroImage: /path/to/image               # 封面图（本地路径 / public 路径 / 远程 URL）
heroImageAlt: 封面图替代文字              # 封面图 alt + 图注
showFeaturedImage: true                 # 单篇覆盖站点级是否显示封面
dynamicPostCardHeight: false            # 单篇覆盖卡片高度自适应
toc: true                               # 显示目录（默认 true）
pinned: true                            # 置顶到列表顶部
math: true                              # 启用 KaTeX 数学公式渲染
comments: false                         # 关闭评论（可选）
canonicalURL: https://example.com/canonical  # 规范 URL
lang: zh                                # 语言覆盖（默认从路径推断）
translationKey: my-post                 # 跨语言翻译关联（默认用 slug）
unlisted: false                         # 隐藏（不在列表/RSS/sitemap 出现，但可直链访问）
unlistedHideFromSeo: true               # 搜索引擎 noindex（unlisted 时默认 true）
---
```

## Frontmatter 字段说明

| 字段 | 类型 | 默认 | 作用 |
|------|------|------|------|
| `title` | string | — | 文章标题 |
| `description` | string | — | SEO 摘要 / 卡片描述 |
| `pubDate` | date | — | 发布时间 |
| `updatedDate` | date | — | 更新时间（卡片显示「已更新」） |
| `tags` | string[] | `[]` | 标签 |
| `categories` | string[] | `[]` | 分类 |
| `draft` | bool | `false` | 草稿，生产环境完全隐藏 |
| `heroImage` | image/string | — | 封面图 |
| `heroImageAlt` | string | — | 封面图 alt + 图注 |
| `toc` | bool | `true` | 右侧目录 |
| `pinned` | bool | `false` | 置顶 |
| `math` | bool | `false` | KaTeX 公式 |
| `comments` | bool | — | 关闭评论 |
| `unlisted` | bool | `false` | 隐藏但可直链 |
| `canonicalURL` | url | — | 规范链接 |
| `translationKey` | string | slug | 跨语言关联 |

## 外部链接行为

所有外部链接自动添加 `target="_blank"` 和 `rel="noopener noreferrer"`，无需手动设置。

示例：[Astro 官网](https://astro.build)

## 多语言

- 文件放在 `src/content/posts/zh/`、`/en/`、`/ja/` 对应语言目录
- 同一篇文章在各语言目录使用相同文件名 + 相同 `translationKey`
- 语言切换器会自动跳转到对应语言版本
