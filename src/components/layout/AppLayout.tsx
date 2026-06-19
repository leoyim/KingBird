import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';
import { useArticleStore } from '@/stores/articleStore';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { X } from 'lucide-react';

interface AppLayoutProps {
  articleList: React.ReactNode;
  readerView: React.ReactNode;
  children?: React.ReactNode;
  onAddFeed: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectFeed: (feedId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onEditFeed?: (feedId: string) => void;
  onImportOPML?: () => void;
}

export function AppLayout({
  articleList,
  readerView,
  children,
  onAddFeed,
  onRefresh,
  isRefreshing,
  onSelectFeed,
  onSelectFolder,
  onEditFeed,
  onImportOPML,
}: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const searchPanelOpen = useUIStore((s) => s.searchPanelOpen);
  const toggleSearchPanel = useUIStore((s) => s.toggleSearchPanel);
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen);
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel);
  const selectedArticleId = useArticleStore((s) => s.selectedArticleId);
  const isMobile = useIsMobile();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-mac-bg dark:bg-mac-bg-dark">
      <Toolbar
        onAddFeed={onAddFeed}
        onRefresh={onRefresh}
        onToggleSearch={toggleSearchPanel}
        onToggleSettings={toggleSettingsPanel}
        onImportOPML={onImportOPML}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop sidebar — inline */}
        {!isMobile && sidebarOpen && (
          <Sidebar
            onSelectFeed={onSelectFeed}
            onSelectFolder={onSelectFolder}
            onEditFeed={onEditFeed}
          />
        )}

        {/* Mobile sidebar — overlay */}
        {isMobile && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={toggleSidebar}
            />
            <aside className="fixed left-0 top-0 bottom-0 z-50 w-[260px] glass-sidebar flex flex-col overflow-hidden animate-slide-in-left">
              <div className="flex items-center justify-between px-4 h-11 border-b border-black/5 dark:border-white/5 shrink-0">
                <span className="text-sm font-semibold">订阅源</span>
                <button
                  onClick={toggleSidebar}
                  className="btn-mac-ghost h-8 w-8 p-0 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar
                  onSelectFeed={(feedId) => {
                    onSelectFeed(feedId);
                    toggleSidebar();
                  }}
                  onSelectFolder={(folderId) => {
                    onSelectFolder(folderId);
                    toggleSidebar();
                  }}
                  onEditFeed={onEditFeed}
                />
              </div>
            </aside>
          </>
        )}

        {/* Content area */}
        <main className="flex-1 flex overflow-hidden">
          {/* ArticleList: always mounted, hidden on mobile when reader open */}
          <div className={`flex-col ${isMobile && selectedArticleId ? 'hidden' : 'flex'} ${isMobile ? 'w-full' : ''}`}>
            {articleList}
          </div>
          {/* ReaderView: full-screen on mobile when open, flex-1 on desktop */}
          {(!isMobile || selectedArticleId) && (
            <div className={`flex-col overflow-hidden ${
              isMobile && selectedArticleId
                ? 'fixed inset-0 z-30 bg-mac-bg dark:bg-mac-bg-dark flex'
                : 'flex-1 flex'
            }`}>
              {readerView}
            </div>
          )}
        </main>
      </div>

      <StatusBar />
      {children}
    </div>
  );
}
