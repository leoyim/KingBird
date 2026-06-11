import { create } from 'zustand';
import type { Subscription, Feed, Folder } from '@/types';
import { db } from '@/db/schema';

interface SubscriptionState {
  subscriptions: Subscription[];
  feeds: Feed[];
  folders: Folder[];
  selectedFeedId: string | null;
  selectedFolderId: string | null;
  isLoading: boolean;

  setSelectedFeedId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;

  loadAll: () => Promise<void>;
  addSubscription: (feed: Feed, folderId?: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  addFolder: (name: string, parentId?: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  updateFeed: (id: string, updates: Partial<Feed>) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  feeds: [],
  folders: [],
  selectedFeedId: null,
  selectedFolderId: null,
  isLoading: false,

  setSelectedFeedId: (id) => set({ selectedFeedId: id, selectedFolderId: null }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id, selectedFeedId: null }),

  loadAll: async () => {
    set({ isLoading: true });
    const [subscriptions, feeds, folders] = await Promise.all([
      db.subscriptions.orderBy('sortOrder').toArray(),
      db.feeds.toArray(),
      db.folders.orderBy('sortOrder').toArray(),
    ]);
    set({ subscriptions, feeds, folders, isLoading: false });
  },

  addSubscription: async (feed, folderId) => {
    await db.feeds.put(feed);
    const subscription: Subscription = {
      id: crypto.randomUUID(),
      feedId: feed.id,
      folderId,
      sortOrder: get().subscriptions.length,
      updateInterval: 30,
      createdAt: Date.now(),
    };
    await db.subscriptions.put(subscription);
    await get().loadAll();
  },

  removeSubscription: async (id) => {
    const sub = await db.subscriptions.get(id);
    if (sub) {
      await db.subscriptions.delete(id);
      await db.articles.where('feedId').equals(sub.feedId).delete();
      await get().loadAll();
    }
  },

  addFolder: async (name, parentId) => {
    const folder: Folder = {
      id: crypto.randomUUID(),
      name,
      parentId,
      sortOrder: get().folders.length,
    };
    await db.folders.put(folder);
    await get().loadAll();
  },

  removeFolder: async (id) => {
    await db.folders.delete(id);
    // Move subscriptions out of deleted folder
    const subs = await db.subscriptions.where('folderId').equals(id).toArray();
    for (const sub of subs) {
      await db.subscriptions.update(sub.id, { folderId: undefined });
    }
    await get().loadAll();
  },

  renameFolder: async (id, name) => {
    await db.folders.update(id, { name });
    await get().loadAll();
  },

  updateFeed: async (id, updates) => {
    await db.feeds.update(id, updates);
    await get().loadAll();
  },
}));
