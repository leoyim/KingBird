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
}

export interface Subscription {
  id: string;
  feedId: string;
  folderId?: string;
  sortOrder: number;
  customTitle?: string;
  updateInterval: number;
  createdAt: number;
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

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutMode = 'list' | 'grid';
export type ReadingMode = 'original' | 'plain' | 'bionic';

export interface UserPreferences {
  id: string;
  theme: ThemeMode;
  eyeCareMode: boolean;
  readerFontSize: number;
  layout: LayoutMode;
  defaultReadingMode: ReadingMode;
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
