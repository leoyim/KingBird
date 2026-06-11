export const APP_NAME = 'EZRSS';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  DB_NAME: 'EZRSS',
  PREFERENCES: 'ezrss_preferences',
  THEME: 'ezrss_theme',
} as const;

export const REFRESH_INTERVALS = [
  { label: '手动刷新', value: 0 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
  { label: '3 小时', value: 180 },
] as const;

export const ARTICLE_SORT_OPTIONS = [
  { label: '最新优先', value: 'newest' },
  { label: '最旧优先', value: 'oldest' },
] as const;

export const DEFAULT_KEYBOARD_SHORTCUTS: Record<string, string> = {
  'j': '下一篇文章',
  'k': '上一篇文章',
  'h': '上级文件夹',
  'l': '下级文件夹',
  's': '切换收藏',
  'm': '切换已读',
  'r': '刷新',
  'n': '添加订阅',
  '/': '搜索',
  'v': '打开原文',
  'escape': '关闭面板',
};

export const TAG_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#5856D6', '#AF52DE', '#FF2D55', '#00C7BE',
] as const;

export const MAX_ARTICLES_PER_FETCH = 50;
export const ARTICLE_LIST_PAGE_SIZE = 30;
export const MAX_CACHED_ARTICLES = 5000;
