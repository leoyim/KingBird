import { create } from 'zustand';
import type { FilterRule } from '@/types';
import { db } from '@/db/schema';

interface FilterState {
  rules: FilterRule[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  addRule: (keyword: string) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  updateRule: (id: string, updates: Partial<Pick<FilterRule, 'keyword' | 'isActive'>>) => Promise<void>;
  getActiveRules: () => FilterRule[];
}

export const useFilterStore = create<FilterState>((set, get) => ({
  rules: [],
  isLoading: false,

  loadAll: async () => {
    const rules = await db.filterRules.toArray();
    set({ rules });
  },

  addRule: async (keyword) => {
    const rule: FilterRule = {
      id: crypto.randomUUID(),
      keyword: keyword.trim(),
      isActive: true,
      createdAt: Date.now(),
    };
    await db.filterRules.put(rule);
    await get().loadAll();
  },

  removeRule: async (id) => {
    await db.filterRules.delete(id);
    await get().loadAll();
  },

  toggleRule: async (id) => {
    const rule = await db.filterRules.get(id);
    if (rule) {
      await db.filterRules.update(id, { isActive: !rule.isActive });
      await get().loadAll();
    }
  },

  updateRule: async (id, updates) => {
    await db.filterRules.update(id, updates);
    await get().loadAll();
  },

  getActiveRules: () => {
    return get().rules.filter(r => r.isActive);
  },
}));
