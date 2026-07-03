/**
 * UI dictionaries.
 * Add new locales by adding a key to `messages` and to `SITE.locales` in
 * src/config.ts. All keys must exist for every locale (TypeScript enforces it).
 */

import type { Locale } from '../config';

export const messages = {
  zh: {
    'site.skipToContent': '跳至正文',
    'nav.home': '首页',
    'nav.posts': '文章',
    'nav.tags': '标签',
    'nav.categories': '分类',
    'nav.archives': '归档',
    'nav.about': '关于',
    'nav.creations': '作品',
    'nav.tutorials': '教程',
    'nav.tools': '工具',
    'nav.voicedbs': '音源',
    'nav.links': '友链',
    'nav.search': '搜索',
    'nav.toggleMenu': '切换菜单',

    'theme.toggle': '切换主题',
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',

    'lang.switcher': '语言',
    'lang.zh': '中文',
    'lang.en': 'English',
    'lang.ja': '日本語',

    'post.publishedOn': '发布于',
    'post.updatedOn': '更新于',
    'post.readingTime': '分钟阅读',
    'post.toc': '目录',
    'post.tags': '标签',
    'post.categories': '分类',
    'post.previous': '上一篇',
    'post.next': '下一篇',
    'post.comments': '评论',
    'post.commentsDisabled': '本文已关闭评论。',
    'post.commentsSetupTitle': '评论功能需要配置',
    'post.commentsSetupBody': 'Giscus 已启用但尚未配置。请在下方填写仓库信息以开启评论。',
    'post.commentsSetupStep1':
      '访问 `giscus.app`，选择你的公开 GitHub 仓库（需开启 Discussions）。',
    'post.commentsSetupStep2': '复制生成的 `data-repo-id`、`data-category` 与 `data-category-id`。',
    'post.commentsSetupStep3':
      '在 `.env` 中设置 `PUBLIC_GISCUS_ENABLED`、`PUBLIC_GISCUS_REPO`、`PUBLIC_GISCUS_REPO_ID`、`PUBLIC_GISCUS_CATEGORY` 与 `PUBLIC_GISCUS_CATEGORY_ID`。',
    'post.commentsSetupStep4': '重新构建站点——本提示将被实时评论取代。',
    'post.commentsSetupDocs': '打开 giscus.app',
    'post.share': '分享',
    'post.copyLink': '复制链接',
    'post.copied': '已复制！',
    'post.author': '作者',

    'list.allPosts': '全部文章',
    'list.empty': '暂无文章。',
    'list.tagPosts': '标签下的文章',
    'list.categoryPosts': '分类下的文章',
    'list.totalPosts': '篇文章',
    'list.totalPostsOne': '篇文章',

    'pagination.previous': '上一页',
    'pagination.next': '下一页',
    'pagination.page': '第',
    'pagination.of': '页，共',

    'archives.title': '归档',
    'archives.empty': '暂无文章。',

    'tags.title': '标签',
    'tags.empty': '暂无标签。',

    'categories.title': '分类',
    'categories.empty': '暂无分类。',

    'search.title': '搜索',
    'search.placeholder': '搜索本站',
    'search.openLabel': '打开搜索',
    'search.closeLabel': '关闭搜索',
    'search.empty': '无结果。',
    'search.loading': '正在加载搜索…',
    'search.typeToStart': '输入以搜索…',
    'search.hintShortcut': '随时按 / 打开搜索',
    'search.searching': '搜索中…',
    'search.noResultsFor': '无结果：',
    'search.resultsCount': '条结果',
    'search.resultsCountOne': '条结果',
    'search.hintNavigate': '导航',
    'search.hintSelect': '打开',
    'search.clearLabel': '清除',

    'code.copy': '复制',
    'code.copied': '已复制',

    '404.title': '页面未找到',
    '404.description': '你要找的页面飞走了。',
    '404.cta': '返回首页',

    'panel.recentlyUpdated': '最近更新',
    'panel.trendingTags': '热门标签',

    'footer.poweredBy': '由',
    'footer.theme': '主题',
    'footer.privacy': '隐私政策',
    'footer.copyright': '保留所有权利。',
  },

  en: {
    'site.skipToContent': 'Skip to content',
    'nav.home': 'Home',
    'nav.posts': 'Posts',
    'nav.tags': 'Tags',
    'nav.categories': 'Categories',
    'nav.archives': 'Archives',
    'nav.about': 'About',
    'nav.creations': 'Creations',
    'nav.tutorials': 'Tutorials',
    'nav.tools': 'Tools',
    'nav.voicedbs': 'VoiceDBs',
    'nav.links': 'Links',
    'nav.search': 'Search',
    'nav.toggleMenu': 'Toggle menu',

    'theme.toggle': 'Toggle theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    'lang.switcher': 'Language',
    'lang.zh': '中文',
    'lang.en': 'English',
    'lang.ja': '日本語',

    'post.publishedOn': 'Published on',
    'post.updatedOn': 'Updated on',
    'post.readingTime': 'min read',
    'post.toc': 'Table of contents',
    'post.tags': 'Tags',
    'post.categories': 'Categories',
    'post.previous': 'Previous',
    'post.next': 'Next',
    'post.comments': 'Comments',
    'post.commentsDisabled': 'Comments are disabled for this post.',
    'post.commentsSetupTitle': 'Comments need configuration',
    'post.commentsSetupBody':
      'Giscus is enabled but not yet configured. Add the repository details below to start collecting comments.',
    'post.commentsSetupStep1':
      'Visit `giscus.app` and select your public GitHub repository (Discussions must be enabled).',
    'post.commentsSetupStep2':
      'Copy the generated `data-repo-id`, `data-category` and `data-category-id` values.',
    'post.commentsSetupStep3':
      'Set the `PUBLIC_GISCUS_ENABLED`, `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY` and `PUBLIC_GISCUS_CATEGORY_ID` env vars in your `.env` file.',
    'post.commentsSetupStep4':
      'Rebuild the site — this notice will be replaced by the live comments thread.',
    'post.commentsSetupDocs': 'Open giscus.app',
    'post.share': 'Share',
    'post.copyLink': 'Copy link',
    'post.copied': 'Copied!',
    'post.author': 'Author',

    'list.allPosts': 'All posts',
    'list.empty': 'No posts found.',
    'list.tagPosts': 'Posts tagged',
    'list.categoryPosts': 'Posts in',
    'list.totalPosts': 'posts',
    'list.totalPostsOne': 'post',

    'pagination.previous': 'Previous page',
    'pagination.next': 'Next page',
    'pagination.page': 'Page',
    'pagination.of': 'of',

    'archives.title': 'Archives',
    'archives.empty': 'No posts yet.',

    'tags.title': 'Tags',
    'tags.empty': 'No tags yet.',

    'categories.title': 'Categories',
    'categories.empty': 'No categories yet.',

    'search.title': 'Search',
    'search.placeholder': 'Search the site',
    'search.openLabel': 'Open search',
    'search.closeLabel': 'Close search',
    'search.empty': 'No results.',
    'search.loading': 'Loading search…',
    'search.typeToStart': 'Type to search…',
    'search.hintShortcut': 'Press / anywhere to open search',
    'search.searching': 'Searching…',
    'search.noResultsFor': 'No results for',
    'search.resultsCount': 'results',
    'search.resultsCountOne': 'result',
    'search.hintNavigate': 'to navigate',
    'search.hintSelect': 'to open',
    'search.clearLabel': 'Clear',

    'code.copy': 'Copy',
    'code.copied': 'Copied',

    '404.title': 'Page not found',
    '404.description': 'The page you are looking for has flown away.',
    '404.cta': 'Back to home',

    'panel.recentlyUpdated': 'Recently Updated',
    'panel.trendingTags': 'Trending Tags',

    'footer.poweredBy': 'Powered by',
    'footer.theme': 'Theme',
    'footer.privacy': 'Privacy Policy',
    'footer.copyright': 'All rights reserved.',
  },

  ja: {
    'site.skipToContent': '本文へジャンプ',
    'nav.home': 'ホーム',
    'nav.posts': '投稿',
    'nav.tags': 'タグ',
    'nav.categories': 'カテゴリ',
    'nav.archives': 'アーカイブ',
    'nav.about': '概要',
    'nav.creations': '作品',
    'nav.tutorials': 'チュートリアル',
    'nav.tools': 'ツール',
    'nav.voicedbs': '音源',
    'nav.links': 'リンク',
    'nav.search': '検索',
    'nav.toggleMenu': 'メニューを切り替え',

    'theme.toggle': 'テーマ切り替え',
    'theme.light': 'ライト',
    'theme.dark': 'ダーク',
    'theme.system': 'システム',

    'lang.switcher': '言語',
    'lang.zh': '中文',
    'lang.en': 'English',
    'lang.ja': '日本語',

    'post.publishedOn': '公開日',
    'post.updatedOn': '更新日',
    'post.readingTime': '分で読了',
    'post.toc': '目次',
    'post.tags': 'タグ',
    'post.categories': 'カテゴリ',
    'post.previous': '前の投稿',
    'post.next': '次の投稿',
    'post.comments': 'コメント',
    'post.commentsDisabled': 'この投稿のコメントは無効です。',
    'post.commentsSetupTitle': 'コメントの設定が必要です',
    'post.commentsSetupBody':
      'Giscus は有効ですが未設定です。コメントを開始するには下記のリポジトリ情報を入力してください。',
    'post.commentsSetupStep1':
      '`giscus.app` にアクセスし、公開 GitHub リポジトリを選択します（Discussions を有効化してください）。',
    'post.commentsSetupStep2':
      '生成された `data-repo-id`、`data-category`、`data-category-id` をコピーします。',
    'post.commentsSetupStep3':
      '`.env` に `PUBLIC_GISCUS_ENABLED`、`PUBLIC_GISCUS_REPO`、`PUBLIC_GISCUS_REPO_ID`、`PUBLIC_GISCUS_CATEGORY`、`PUBLIC_GISCUS_CATEGORY_ID` を設定します。',
    'post.commentsSetupStep4': 'サイトを再ビルドすると、この案内は実際のコメントに置き換わります。',
    'post.commentsSetupDocs': 'giscus.app を開く',
    'post.share': '共有',
    'post.copyLink': 'リンクをコピー',
    'post.copied': 'コピーしました！',
    'post.author': '著者',

    'list.allPosts': 'すべての投稿',
    'list.empty': '投稿がありません。',
    'list.tagPosts': 'タグの投稿',
    'list.categoryPosts': 'カテゴリの投稿',
    'list.totalPosts': '件',
    'list.totalPostsOne': '件',

    'pagination.previous': '前のページ',
    'pagination.next': '次のページ',
    'pagination.page': 'ページ',
    'pagination.of': '/',

    'archives.title': 'アーカイブ',
    'archives.empty': '投稿はまだありません。',

    'tags.title': 'タグ',
    'tags.empty': 'タグはまだありません。',

    'categories.title': 'カテゴリ',
    'categories.empty': 'カテゴリはまだありません。',

    'search.title': '検索',
    'search.placeholder': 'サイト内を検索',
    'search.openLabel': '検索を開く',
    'search.closeLabel': '検索を閉じる',
    'search.empty': '結果がありません。',
    'search.loading': '検索を読み込み中…',
    'search.typeToStart': '入力して検索…',
    'search.hintShortcut': 'どこでも / を押して検索を開く',
    'search.searching': '検索中…',
    'search.noResultsFor': '結果なし：',
    'search.resultsCount': '件',
    'search.resultsCountOne': '件',
    'search.hintNavigate': '移動',
    'search.hintSelect': '開く',
    'search.clearLabel': 'クリア',

    'code.copy': 'コピー',
    'code.copied': 'コピーしました',

    '404.title': 'ページが見つかりません',
    '404.description': 'お探しのページは飛んでいきました。',
    '404.cta': 'ホームに戻る',

    'panel.recentlyUpdated': '最近の更新',
    'panel.trendingTags': '人気のタグ',

    'footer.poweredBy': '提供元',
    'footer.theme': 'テーマ',
    'footer.privacy': 'プライバシーポリシー',
    'footer.copyright': '著作権所有。',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type UIKey = keyof (typeof messages)['en'];
