import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, LayoutMode, ReadingMode, UserPreferences } from '@/types';
import { DEFAULT_PREFERENCES } from '@/types';

interface UIState {
  preferences: UserPreferences;
  sidebarOpen: boolean;
  searchPanelOpen: boolean;
  settingsPanelOpen: boolean;
  isOnline: boolean;
  lastUpdatedAt: number | null;
  unreadCount: number;
  starredFilter: boolean;

  setTheme: (theme: ThemeMode) => void;
  setEyeCareMode: (enabled: boolean) => void;
  setLayout: (layout: LayoutMode) => void;
  setReaderFontSize: (size: number) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoRefreshInterval: (interval: number) => void;
  setHighlightColor: (color: string) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  toggleSidebar: () => void;
  toggleSearchPanel: () => void;
  toggleSettingsPanel: () => void;
  setOnline: (online: boolean) => void;
  setLastUpdatedAt: (timestamp: number) => void;
  setUnreadCount: (count: number) => void;
  setStarredFilter: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      sidebarOpen: true,
      searchPanelOpen: false,
      settingsPanelOpen: false,
      isOnline: navigator.onLine,
      lastUpdatedAt: null,
      unreadCount: 0,
      starredFilter: false,

      setTheme: (theme) => set((s) => ({ preferences: { ...s.preferences, theme } })),
      setEyeCareMode: (eyeCareMode) => set((s) => ({ preferences: { ...s.preferences, eyeCareMode } })),
      setLayout: (layout) => set((s) => ({ preferences: { ...s.preferences, layout } })),
      setReaderFontSize: (readerFontSize) => set((s) => ({ preferences: { ...s.preferences, readerFontSize } })),
      setReadingMode: (defaultReadingMode) => set((s) => ({ preferences: { ...s.preferences, defaultReadingMode } })),
      setNotificationsEnabled: (notificationsEnabled) => set((s) => ({ preferences: { ...s.preferences, notificationsEnabled } })),
      setAutoRefreshInterval: (autoRefreshInterval) => set((s) => ({ preferences: { ...s.preferences, autoRefreshInterval } })),
      setHighlightColor: (highlightColor: string) => set((s) => ({ preferences: { ...s.preferences, highlightColor } })),

  updatePreferences: (updates) => set((s) => ({ preferences: { ...s.preferences, ...updates } })),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSearchPanel: () => set((s) => ({ searchPanelOpen: !s.searchPanelOpen, settingsPanelOpen: false })),
      toggleSettingsPanel: () => set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen, searchPanelOpen: false })),
      setOnline: (isOnline) => set({ isOnline }),
      setLastUpdatedAt: (lastUpdatedAt) => set({ lastUpdatedAt }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      setStarredFilter: (starredFilter) => set({ starredFilter }),
    }),
    {
      name: 'ezrss-ui-store',
      partialize: (state) => ({
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
