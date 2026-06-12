export interface Feed {
  id: string;
  url: string;
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  lastFetchedAt?: number;
  errorCount: number;
  isActive: boolean;
  /** HTTP ETag for conditional requests */
  eTag?: string;
  /** HTTP Last-Modified for conditional requests */
  lastModified?: string;
}

export interface Subscription {
  id: string;
  feedId: string;
  folderId?: string;
  sortOrder: number;
  customTitle?: string;
  updateInterval: number;
  createdAt: number;
  /** 是否参与定时自动刷新，默认 true */
  autoRefresh: boolean;
}

export interface Article {
  id: string;
  feedId: string;
  title: string;
  summary?: string;
  content?: string;
  originalContent?: string;
  link: string;
  author?: string;
  publishedAt: number;
  fetchedAt: number;
  imageUrl?: string;
}

export interface ArticleReadState {
  articleId: string;
  isRead: boolean;
  isStarred: boolean;
  readAt?: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface ArticleTag {
  articleId: string;
  tagId: string;
}

export interface SubscriptionTag {
  subscriptionId: string;
  tagId: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutMode = 'list' | 'grid';
export type ReadingMode = 'original' | 'plain' | 'bionic';
export type RefreshStatus = 'pending' | 'success' | 'failure';

export interface FeedRefreshState {
  feedId: string;
  status: RefreshStatus;
  timestamp: number;
}

export interface UserPreferences {
  id: string;
  theme: ThemeMode;
  eyeCareMode: boolean;
  readerFontSize: number;
  layout: LayoutMode;
  defaultReadingMode: ReadingMode;
  highlightColor: string;
  keyboardShortcuts: Record<string, string>;
  notificationsEnabled: boolean;
  autoRefreshInterval: number;
}

export interface SearchResult {
  articleId: string;
  score: number;
  highlights?: string[];
}

export interface FilterRule {
  id: string;
  keyword: string;
  feedIds?: string[];
  isActive: boolean;
  createdAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  theme: 'system',
  eyeCareMode: false,
  readerFontSize: 16,
  layout: 'list',
  defaultReadingMode: 'original',
  highlightColor: '#007AFF',
  keyboardShortcuts: {
    'j': 'nextArticle',
    'k': 'prevArticle',
    'h': 'parentFolder',
    'l': 'childFolder',
    's': 'toggleStar',
    'm': 'toggleRead',
    'r': 'refresh',
    'n': 'addSubscription',
    '/': 'focusSearch',
    'v': 'openOriginal',
    'escape': 'closePanel',
  },
  notificationsEnabled: true,
  autoRefreshInterval: 30,
};
