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
export type ReadingMode = 'original' | 'plain' | 'bionic';
export type RefreshStatus = 'pending' | 'success' | 'failure';

export interface UserPreferences {
  id: string;
  theme: ThemeMode;
  eyeCareMode: boolean;
  einkMode: boolean;
  readerFontSize: number;
  defaultReadingMode: ReadingMode;
  highlightColor: string;
  notificationsEnabled: boolean;
  autoRefreshInterval: number;
}

export interface SearchResult {
  articleId: string;
  score: number;
}

export interface FilterRule {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  theme: 'system',
  eyeCareMode: false,
  einkMode: false,
  readerFontSize: 16,
  defaultReadingMode: 'original',
  highlightColor: '#007AFF',
  notificationsEnabled: true,
  autoRefreshInterval: 30,
};
