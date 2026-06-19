import { create } from 'zustand';
import type { Subscription, Feed, Folder, RefreshStatus } from '@/types';
import { db } from '@/db/schema';
import { generateUUID } from '@/utils/uuid';

interface SubscriptionState {
  subscriptions: Subscription[];
  feeds: Feed[];
  folders: Folder[];
  selectedFeedId: string | null;
  selectedFolderId: string | null;
  isLoading: boolean;

  /** Per-feed refresh status: feedId → status */
  feedRefreshState: Record<string, RefreshStatus>;

  setSelectedFeedId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;

  loadAll: () => Promise<void>;
  addSubscription: (feed: Feed, folderId?: string) => Promise<void>;
  removeSubscription: (id: string) => Promise<void>;
  addFolder: (name: string, parentId?: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  toggleAutoRefresh: (subscriptionId: string) => Promise<void>;
  updateFeed: (id: string, updates: Partial<Feed>) => Promise<void>;

  setFeedRefreshStatus: (feedId: string, status: RefreshStatus) => void;
  clearFeedRefreshStatus: (feedId: string) => void;
  clearAllRefreshStatus: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  feeds: [],
  folders: [],
  selectedFeedId: null,
  selectedFolderId: null,
  isLoading: false,
  feedRefreshState: {},

  setSelectedFeedId: (id) => set({ selectedFeedId: id, selectedFolderId: null }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id, selectedFeedId: null }),

  loadAll: async () => {
    set({ isLoading: true });
    const [subscriptions, feeds, folders] = await Promise.all([
      db.subscriptions.orderBy('sortOrder').toArray(),
      db.feeds.toArray(),
      db.folders.orderBy('sortOrder').toArray(),
    ]);

    // Ensure favicons are persisted for feeds missing faviconUrl
    const feedsToUpdate = feeds.filter(f => !f.faviconUrl);
    if (feedsToUpdate.length > 0) {
      // Defer favicon resolution to avoid blocking UI
      const { ensureFavicon } = await import('@/utils/favicon');
      Promise.all(feedsToUpdate.map(f => ensureFavicon(f))).then(() => {
        // Reload feeds silently to get updated faviconUrl
        db.feeds.toArray().then(updatedFeeds => {
          set({ feeds: updatedFeeds });
        });
      }).catch(() => {});
    }

    set({ subscriptions, feeds, folders, isLoading: false });
  },

  addSubscription: async (feed, folderId) => {
    await db.feeds.put(feed);
    const subscription: Subscription = {
      id: generateUUID(),
      feedId: feed.id,
      folderId,
      sortOrder: get().subscriptions.length,
      updateInterval: 30,
      autoRefresh: true,
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
      id: generateUUID(),
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

  setFeedRefreshStatus: (feedId, status) => {
    set((state) => ({
      feedRefreshState: { ...state.feedRefreshState, [feedId]: status },
    }));
  },

  clearFeedRefreshStatus: (feedId) => {
    set((state) => {
      const next = { ...state.feedRefreshState };
      delete next[feedId];
      return { feedRefreshState: next };
    });
  },

  clearAllRefreshStatus: () => {
    set({ feedRefreshState: {} });
  },

  toggleAutoRefresh: async (subscriptionId) => {
    const sub = await db.subscriptions.get(subscriptionId);
    if (!sub) return;
    // undefined (legacy data) or true → disable; false → enable
    const newValue = sub.autoRefresh === false;
    await db.subscriptions.update(subscriptionId, { autoRefresh: newValue });
    await get().loadAll();
  },
}));
