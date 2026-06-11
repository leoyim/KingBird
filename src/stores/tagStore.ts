import { create } from 'zustand';
import type { Tag, ArticleTag } from '@/types';
import { db } from '@/db/schema';

interface TagState {
  tags: Tag[];
  articleTags: ArticleTag[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  addTag: (name: string, color?: string) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  addTagToArticle: (articleId: string, tagId: string) => Promise<void>;
  removeTagFromArticle: (articleId: string, tagId: string) => Promise<void>;
  getTagsForArticle: (articleId: string) => Tag[];
  getArticlesForTag: (tagId: string) => string[];
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  articleTags: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    const [tags, articleTags] = await Promise.all([
      db.tags.orderBy('createdAt').toArray(),
      db.articleTags.toArray(),
    ]);
    set({ tags, articleTags, isLoading: false });
  },

  addTag: async (name, color) => {
    const tag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: color || '#007AFF',
      createdAt: Date.now(),
    };
    await db.tags.put(tag);
    await get().loadAll();
  },

  removeTag: async (id) => {
    await db.tags.delete(id);
    await db.articleTags.where('tagId').equals(id).delete();
    await get().loadAll();
  },

  updateTag: async (id, updates) => {
    await db.tags.update(id, updates);
    await get().loadAll();
  },

  addTagToArticle: async (articleId, tagId) => {
    const articleTag: ArticleTag = { articleId, tagId };
    await db.articleTags.put(articleTag);
    await get().loadAll();
  },

  removeTagFromArticle: async (articleId, tagId) => {
    await db.articleTags.delete([articleId, tagId]);
    await get().loadAll();
  },

  getTagsForArticle: (articleId) => {
    const { tags, articleTags } = get();
    const tagIds = articleTags.filter(at => at.articleId === articleId).map(at => at.tagId);
    return tags.filter(t => tagIds.includes(t.id));
  },

  getArticlesForTag: (tagId) => {
    const { articleTags } = get();
    return articleTags.filter(at => at.tagId === tagId).map(at => at.articleId);
  },
}));
