import { create } from 'zustand';
import type { Article, ArticleReadState } from '@/types';
import { db } from '@/db/schema';

interface ArticleState {
  articles: Article[];
  readStates: Map<string, ArticleReadState>;
  selectedArticleId: string | null;
  isLoading: boolean;
  sortOrder: 'newest' | 'oldest';

  setSelectedArticleId: (id: string | null) => void;
  setSortOrder: (order: 'newest' | 'oldest') => void;

  loadArticles: (feedId?: string) => Promise<void>;
  loadReadStates: () => Promise<void>;
  markAsRead: (articleId: string) => Promise<void>;
  markAsUnread: (articleId: string) => Promise<void>;
  markAllAsRead: (feedId?: string) => Promise<void>;
  toggleStar: (articleId: string) => Promise<void>;
  getFilteredArticles: () => Article[];
  getUnreadCount: (feedId?: string) => number;
  getSelectedArticle: () => Article | undefined;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  articles: [],
  readStates: new Map(),
  selectedArticleId: null,
  isLoading: false,
  sortOrder: 'newest',

  setSelectedArticleId: (id) => set({ selectedArticleId: id }),
  setSortOrder: (order) => set({ sortOrder: order }),

  loadArticles: async (feedId) => {
    set({ isLoading: true });
    let articles: Article[];
    if (feedId) {
      articles = await db.articles
        .where('feedId')
        .equals(feedId)
        .reverse()
        .sortBy('publishedAt');
    } else {
      articles = await db.articles
        .orderBy('publishedAt')
        .reverse()
        .toArray();
    }
    set({ articles, isLoading: false });
  },

  loadReadStates: async () => {
    const states = await db.readStates.toArray();
    const map = new Map<string, ArticleReadState>();
    for (const state of states) {
      map.set(state.articleId, state);
    }
    set({ readStates: map });
  },

  markAsRead: async (articleId) => {
    const state: ArticleReadState = {
      articleId,
      isRead: true,
      isStarred: get().readStates.get(articleId)?.isStarred ?? false,
      readAt: Date.now(),
    };
    await db.readStates.put(state);
    const newMap = new Map(get().readStates);
    newMap.set(articleId, state);
    set({ readStates: newMap });
  },

  markAsUnread: async (articleId) => {
    const state: ArticleReadState = {
      articleId,
      isRead: false,
      isStarred: get().readStates.get(articleId)?.isStarred ?? false,
    };
    await db.readStates.put(state);
    const newMap = new Map(get().readStates);
    newMap.set(articleId, state);
    set({ readStates: newMap });
  },

  markAllAsRead: async (feedId) => {
    const articles = feedId
      ? get().articles.filter(a => a.feedId === feedId)
      : get().articles;
    const newMap = new Map(get().readStates);
    for (const article of articles) {
      const state: ArticleReadState = {
        articleId: article.id,
        isRead: true,
        isStarred: newMap.get(article.id)?.isStarred ?? false,
        readAt: Date.now(),
      };
      await db.readStates.put(state);
      newMap.set(article.id, state);
    }
    set({ readStates: newMap });
  },

  toggleStar: async (articleId) => {
    const current = get().readStates.get(articleId);
    const state: ArticleReadState = {
      articleId,
      isRead: current?.isRead ?? false,
      isStarred: !current?.isStarred,
      readAt: current?.readAt,
    };
    await db.readStates.put(state);
    const newMap = new Map(get().readStates);
    newMap.set(articleId, state);
    set({ readStates: newMap });
  },

  getFilteredArticles: () => {
    const { articles, sortOrder } = get();
    const sorted = [...articles];
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => b.publishedAt - a.publishedAt);
    } else {
      sorted.sort((a, b) => a.publishedAt - b.publishedAt);
    }
    return sorted;
  },

  getUnreadCount: (feedId) => {
    const { articles, readStates } = get();
    const filtered = feedId
      ? articles.filter(a => a.feedId === feedId)
      : articles;
    return filtered.filter(a => !readStates.get(a.id)?.isRead).length;
  },

  getSelectedArticle: () => {
    const { articles, selectedArticleId } = get();
    return articles.find(a => a.id === selectedArticleId);
  },
}));
