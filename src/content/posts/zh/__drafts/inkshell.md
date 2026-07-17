---
title: 【InkShell】面向主题的 Ink Web 运行时
pubDate: 2026-07-17T07:12:00.000Z
draft: true
toc: true
pinned: false
math: false
tags:
  - 工具
  - Ink
  - 互动小说
  - 开源
categories:
  - 工具
description: 🎉 InkShell 开源啦！一个面向主题的 Ink Web 运行时——选一个主题文件夹，放入 story.js，部署即可。无需配置文件，无需编程，甚至不需要服务器。MIT 协议，完全免费。
lang: zh
unlisted: true
---
🎉 我们的新轮子 InkShell 开源啦~！

📖 选一个主题文件夹，放入 story.js，部署即可。

🔧 无需配置文件，无需编程，甚至不需要服务器。

💴 MIT 协议，完全免费。

<!-- more -->

*	GitHub：<https://github.com/Ander-Index/InkShell>

# InkShell 是什么？

[Ink](https://www.inklestudios.com/ink/) 是 inkle 工作室（就是做了《80 Days》的那家）开源的互动小说脚本语言——我们站上的[《使用 Ink 进行写作》](/posts/tutorials/writing-with-ink/)就是它的简体中文教程。

用 [Inky](https://github.com/inkle/inky) 写完故事之后，可以导出一个 `story.js`。但故事数据本身不会动，你还需要一个**播放器**让它在网页上跑起来。

InkShell 就是这个播放器——而且是一个**主题优先**的播放器。

# 给故事作者：五步上线

1. 从 `themes/` 里挑一个喜欢的主题文件夹，比如 `classic-novel/`。
2. 把整个文件夹复制到你自己的项目里。
3. 在 Inky 里把你的故事导出为 `story.js`（文件 → 导出 story.js）。
4. 用它覆盖主题文件夹里的模板 `story.js`。
5. 双击打开 `index.html`——**直接从磁盘运行，连本地服务器都不用起**。

没有配置文件，没有构建步骤，没有 npm。你的故事就是唯一需要带来的东西。

# 设计理念

*	**主题优先**：外观完全由主题说了算。所有 UI 元素默认隐藏（`display: none` / `disabled` / `hidden`），主题 CSS 决定它们是否显示、长什么样、怎么动。
*	**插件化**：DOM 渲染、文本输入、音频、存档/读档……所有功能都是插件，主题自行挑选用哪些。
*	**插件只提供功能，不规定外观**：插件负责逻辑和 API（激活按钮、绑定事件、读写数据），长什么样一律不管。新内容通过 `data-new` 属性标记，主题想加淡入、滚动动画都可以据此实现。
*	**CSS 能做到的不该成为插件**：如果一个功能纯 CSS 就能实现（比如汉堡菜单的展开收起），那它就不该占用一段 JS。
*	**核心保持精简**：引擎 `inkshell.js` 只处理故事逻辑——不碰 DOM，不干预 CSS。

# 功能一览

通过 Ink 标签驱动，全部**不区分大小写**：

| 标签 | 作用 |
|---|---|
| `# IMAGE: src` | 插入图片（缓存尺寸 + 后台预加载，避免布局跳动） |
| `# BACKGROUND: src` | 设置容器背景图，空值清除 |
| `# AUDIO: src` / `# AUDIOLOOP: src` | 播放一次 / 循环播放 |
| `# CLEAR` | 清屏 |
| `# CLASS: xxx` | 给段落加 CSS class |
| `# TITLE: xxx` | 填充菜单栏标题和浏览器标签页标题 |
| `# INPUT-TEXT` / `# INPUT-NUMBER` | 文本 / 数字输入框，直接写入 Ink 变量 |
| `# LINK` / `# LINKOPEN` / `# RESTART` | 链接与重开 |

段落文本还支持**白名单净化的内联 HTML**——标题、加粗、列表、引用、`img`、`figure` 都可以直接写在 Ink 源码里；`<script>`、`on*` 事件、`javascript:` 链接会被自动剥除。

# 存档系统：所见即所存

*	**10 个槽位**：槽 0 是自动存档（每次选择后自动写入，误关页面也能续上），槽 1–9 留给玩家手动存。
*	**快照屏幕段落**：每份存档不仅保存引擎状态，还把屏幕上已显示的段落 HTML 一起快照——读档时原样还原，所见即所存。
*	**导入导出**：存档可以下载为 `.json` 备份，再从文件导入回来。
*	**Story ID 隔离**：同一个域名下放多个故事也不怕存档串台。在故事开头写一行 `# ID: <uuid>`，存档键名就永远绑定这个故事，改标题、改内容都不丢档。

存档系统本身**不渲染任何 UI**——界面长什么样依然是主题的自由。

# 给主题作者：两层自定义

*	`style.css` 管外观：配色、布局、动画。
*	`theme.js` 管行为：在引擎和故事数据加载后、`player.start()` 之前执行，可以定义 `window.beforeStart(player)` 钩子注册监听器。

引擎还提供一整套事件（`story:content`、`story:turnComplete`、`dom:passage`、`save:saved`……），滚动、特效、自定义界面都有落点。

# 零依赖的构建

想改引擎本身？`./build.sh`（或 `build.bat`）一条命令完成「编译 `src/` → 同步到所有主题」。**不需要安装 npm 或 Node.js**——esbuild 二进制已经内置在仓库里。

改完跑一下 `tester.html`：71 个自检用例，包含历史 bug 的回归防护。

# 许可证

MIT。引擎基于 [inkjs](https://github.com/y-lohse/inkjs) 运行时。

欢迎来 GitHub 提 Issue 和 PR，也欢迎把自己做的主题分享出来～

*	GitHub：<https://github.com/Ander-Index/InkShell>
*	Ink 官网：<https://www.inklestudios.com/ink/>
*	Inky 编辑器：<https://github.com/inkle/inky>
