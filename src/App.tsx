import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArticleList } from '@/components/article/ArticleList';
import { ReaderView } from '@/components/reader/ReaderView';
import { AddFeedDialog } from '@/components/subscription/AddFeedDialog';
import { EditFeedDialog } from '@/components/subscription/EditFeedDialog';
import { ImportOPMLDialog } from '@/components/subscription/ImportOPMLDialog';
import { SearchPanel } from '@/components/search/SearchPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useArticleStore } from '@/stores/articleStore';
import { useTagStore } from '@/stores/tagStore';
import { useFilterStore } from '@/stores/filterStore';
import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/hooks/useTheme';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { refreshAllFeeds } from '@/services/rssService';
import { buildSearchIndex } from '@/services/searchService';
import { requestNotificationPermission } from '@/services/notificationService';

function App() {
  // Initialize theme
  useTheme();

  // Track online status
  useOnlineStatus();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const [importOPMLOpen, setImportOPMLOpen] = useState(false);
  const [editFeedOpen, setEditFeedOpen] = useState(false);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const selectedArticleId = useArticleStore((s) => s.selectedArticleId);
  const setSelectedArticleId = useArticleStore((s) => s.setSelectedArticleId);
  const { loadAll: loadSubscriptions, selectedFeedId } = useSubscriptionStore();
  const { loadArticles, loadReadStates, articles, markAsRead } = useArticleStore();
  const { loadAll: loadTags } = useTagStore();
  const { loadAll: loadFilters } = useFilterStore();
  const searchPanelOpen = useUIStore((s) => s.searchPanelOpen);
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen);
  const toggleSearchPanel = useUIStore((s) => s.toggleSearchPanel);
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel);
  const setLastUpdatedAt = useUIStore((s) => s.setLastUpdatedAt);
  const setUnreadCount = useUIStore((s) => s.setUnreadCount);
  const preferences = useUIStore((s) => s.preferences);

  // Load data on mount
  useEffect(() => {
    const init = async () => {
      await loadSubscriptions();
      await loadArticles();
      await loadReadStates();
      await loadTags();
      await loadFilters();

      // Build search index
      buildSearchIndex().catch(() => {});

      // Request notification permission
      if (preferences.notificationsEnabled) {
        requestNotificationPermission().catch(() => {});
      }
    };
    init();
  }, []);

  // Update unread count
  useEffect(() => {
    const unread = articles.filter(a => !useArticleStore.getState().readStates.get(a.id)?.isRead).length;
    setUnreadCount(unread);
  }, [articles, setUnreadCount]);

  // Auto refresh
  useEffect(() => {
    if (preferences.autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, preferences.autoRefreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [preferences.autoRefreshInterval]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAllFeeds();
      await loadArticles(selectedFeedId || undefined);
      await loadSubscriptions();
      setLastUpdatedAt(Date.now());
    } catch (err) {
      console.error('Refresh failed:', err);
    }
    setIsRefreshing(false);
  }, [selectedFeedId, loadArticles, loadSubscriptions, setLastUpdatedAt]);

  const handleSelectFeed = useCallback(async (feedId: string) => {
    await loadArticles(feedId);
  }, [loadArticles]);

  const handleSelectFolder = useCallback(async (folderId: string) => {
    // Load articles for all feeds in folder
    const subs = useSubscriptionStore.getState().subscriptions.filter(s => s.folderId === folderId);
    await loadArticles();
  }, [loadArticles]);

  const handleSelectArticle = useCallback((articleId: string) => {
    setSelectedArticleId(articleId);
  }, [setSelectedArticleId]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'j', handler: () => navigateArticle('next'), description: '下一篇文章' },
    { key: 'k', handler: () => navigateArticle('prev'), description: '上一篇文章' },
    { key: 's', handler: () => { if (selectedArticleId) useArticleStore.getState().toggleStar(selectedArticleId); }, description: '切换收藏' },
    { key: 'm', handler: () => {
      if (selectedArticleId) {
        const state = useArticleStore.getState().readStates.get(selectedArticleId);
        if (state?.isRead) useArticleStore.getState().markAsUnread(selectedArticleId);
        else useArticleStore.getState().markAsRead(selectedArticleId);
      }
    }, description: '切换已读' },
    { key: 'r', handler: handleRefresh, description: '刷新' },
    { key: 'n', handler: () => setAddFeedOpen(true), description: '添加订阅' },
    { key: '/', handler: toggleSearchPanel, description: '搜索' },
    { key: 'v', handler: () => {
      if (selectedArticleId) {
        const article = useArticleStore.getState().articles.find(a => a.id === selectedArticleId);
        if (article) window.open(article.link, '_blank');
      }
    }, description: '打开原文' },
    { key: 'escape', handler: () => {
      if (searchPanelOpen) toggleSearchPanel();
      else if (settingsPanelOpen) toggleSettingsPanel();
      else setSelectedArticleId(null);
    }, description: '关闭面板' },
  ]);

  const navigateArticle = (direction: 'next' | 'prev') => {
    const { articles, selectedArticleId, readStates } = useArticleStore.getState();
    const currentIndex = articles.findIndex(a => a.id === selectedArticleId);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < articles.length) {
      const nextArticle = articles[nextIndex];
      setSelectedArticleId(nextArticle.id);
      markAsRead(nextArticle.id);
    }
  };

  return (
    <AppLayout
      onAddFeed={() => setAddFeedOpen(true)}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      onSelectFeed={handleSelectFeed}
      onSelectFolder={handleSelectFolder}
      onImportOPML={() => setImportOPMLOpen(true)}
      onEditFeed={(feedId: string) => { setEditingFeedId(feedId); setEditFeedOpen(true); }}
    >
      {/* Article List + Reader View */}
      <ArticleList
        onSelectArticle={handleSelectArticle}
        selectedArticleId={selectedArticleId}
      />
      <ReaderView
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
      />

      {/* Dialogs & Panels */}
      <AddFeedDialog
        open={addFeedOpen}
        onClose={() => setAddFeedOpen(false)}
      />
      <EditFeedDialog
        open={editFeedOpen}
        feedId={editingFeedId}
        onClose={() => { setEditFeedOpen(false); setEditingFeedId(null); }}
      />
      <ImportOPMLDialog
        open={importOPMLOpen}
        onClose={() => setImportOPMLOpen(false)}
      />
      <SearchPanel
        open={searchPanelOpen}
        onClose={toggleSearchPanel}
        onSelectArticle={handleSelectArticle}
      />
      <SettingsPanel
        open={settingsPanelOpen}
        onClose={toggleSettingsPanel}
      />
    </AppLayout>
  );
}

export default App;
