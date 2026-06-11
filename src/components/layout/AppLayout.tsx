import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/stores/uiStore';

interface AppLayoutProps {
  children: React.ReactNode;
  onAddFeed: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSelectFeed: (feedId: string) => void;
  onSelectFolder: (folderId: string) => void;
}

export function AppLayout({
  children,
  onAddFeed,
  onRefresh,
  isRefreshing,
  onSelectFeed,
  onSelectFolder,
}: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const searchPanelOpen = useUIStore((s) => s.searchPanelOpen);
  const toggleSearchPanel = useUIStore((s) => s.toggleSearchPanel);
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen);
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-mac-bg dark:bg-mac-bg-dark">
      {/* Toolbar */}
      <Toolbar
        onAddFeed={onAddFeed}
        onRefresh={onRefresh}
        onToggleSearch={toggleSearchPanel}
        onToggleSettings={toggleSettingsPanel}
        isRefreshing={isRefreshing}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            onSelectFeed={onSelectFeed}
            onSelectFolder={onSelectFolder}
          />
        )}

        {/* Content area */}
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
