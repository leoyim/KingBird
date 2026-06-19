import { create } from 'zustand';
import type { Tag, ArticleTag, SubscriptionTag } from '@/types';
import { db } from '@/db/schema';
import { generateUUID } from '@/utils/uuid';

interface TagState {
  tags: Tag[];
  articleTags: ArticleTag[];
  subscriptionTags: SubscriptionTag[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  addTag: (name: string, color?: string) => Promise<void>;
  removeTag: (id: string) => Promise<void>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;

  // Article tags
  addTagToArticle: (articleId: string, tagId: string) => Promise<void>;
  removeTagFromArticle: (articleId: string, tagId: string) => Promise<void>;
  getTagsForArticle: (articleId: string) => Tag[];
  getArticlesForTag: (tagId: string) => string[];

  // Subscription tags
  addTagToSubscription: (subscriptionId: string, tagId: string) => Promise<void>;
  removeTagFromSubscription: (subscriptionId: string, tagId: string) => Promise<void>;
  getTagsForSubscription: (subscriptionId: string) => Tag[];
  getSubscriptionsForTag: (tagId: string) => string[];
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  articleTags: [],
  subscriptionTags: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    const [tags, articleTags, subscriptionTags] = await Promise.all([
      db.tags.orderBy('createdAt').toArray(),
      db.articleTags.toArray(),
      db.subscriptionTags.toArray(),
    ]);
    set({ tags, articleTags, subscriptionTags, isLoading: false });
  },

  addTag: async (name, color) => {
    // Dedup: check if tag with same name already exists
    const existing = await db.tags.where('name').equals(name).first();
    if (existing) return;

    const tag: Tag = {
      id: generateUUID(),
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
    await db.subscriptionTags.where('tagId').equals(id).delete();
    await get().loadAll();
  },

  updateTag: async (id, updates) => {
    await db.tags.update(id, updates);
    await get().loadAll();
  },

  // --- Article tags ---

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

  // --- Subscription tags ---

  addTagToSubscription: async (subscriptionId, tagId) => {
    const subscriptionTag: SubscriptionTag = { subscriptionId, tagId };
    await db.subscriptionTags.put(subscriptionTag);
    await get().loadAll();
  },

  removeTagFromSubscription: async (subscriptionId, tagId) => {
    await db.subscriptionTags.delete([subscriptionId, tagId]);
    await get().loadAll();
  },

  getTagsForSubscription: (subscriptionId) => {
    const { tags, subscriptionTags } = get();
    const tagIds = subscriptionTags
      .filter(st => st.subscriptionId === subscriptionId)
      .map(st => st.tagId);
    return tags.filter(t => tagIds.includes(t.id));
  },

  getSubscriptionsForTag: (tagId) => {
    const { subscriptionTags } = get();
    return subscriptionTags
      .filter(st => st.tagId === tagId)
      .map(st => st.subscriptionId);
  },
}));
