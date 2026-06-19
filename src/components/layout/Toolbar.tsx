import { useCallback, useState } from 'react';
import {
  Plus, RefreshCw, Search, Settings, Moon, Sun, Monitor, PenTool,
  PanelLeftClose, PanelLeftOpen, FileUp, MonitorDown, Command, X, Menu
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTheme } from '@/hooks/useTheme';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface ToolbarProps {
  onAddFeed: () => void;
  onRefresh: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onImportOPML?: () => void;
  isRefreshing: boolean;
}

export function Toolbar({
  onAddFeed,
  onRefresh,
  onToggleSearch,
  onToggleSettings,
  onImportOPML,
  isRefreshing,
}: ToolbarProps) {
  const { theme, setTheme } = useTheme();
  const einkMode = useUIStore((s) => s.preferences.einkMode);
  const setEinkMode = useUIStore((s) => s.setEinkMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const searchPanelOpen = useUIStore((s) => s.searchPanelOpen);
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen);
  const unreadCount = useUIStore((s) => s.unreadCount);

  const cycleTheme = useCallback(() => {
    const order = ['dark', 'light', 'system'] as const;
    const idx = order.indexOf(theme as typeof order[number]);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const isMobile = useIsMobile();
  const { isInstallable, install } = usePWAInstall();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts = [
    { key: 'J', desc: '下一篇' },
    { key: 'K', desc: '上一篇' },
    { key: 'S', desc: '切换收藏' },
    { key: 'M', desc: '切换已读' },
    { key: 'N', desc: '添加订阅' },
    { key: 'R', desc: '刷新全部' },
    { key: 'V', desc: '打开原文' },
    { key: '/', desc: '搜索' },
    { key: 'B', desc: '批量选源' },
    { key: 'Esc', desc: '关闭' },
  ];

  return (
    <header className="glass-toolbar h-11 flex items-center px-3 gap-1 select-none z-50">
      {/* Left section */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          className="btn-mac-ghost h-8 w-8 p-0 rounded-lg"
          title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {isMobile ? (
            <Menu className="w-4 h-4" />
          ) : sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-1.5 ml-1">
          <img src="/kingbird-icon.png" alt="" className="w-5 h-5 rounded-md object-cover" />
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">Kingbird</span>
          {unreadCount > 0 && (
            <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary bg-mac-blue/10 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
          {/* Shortcuts button + dropdown */}
          <span className="relative hidden sm:inline-block">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="btn-mac-ghost h-6 w-6 p-0 rounded-md"
              title="快捷键"
            >
              <Command className="w-3.5 h-3.5" />
            </button>
            {showShortcuts && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShortcuts(false)} />
                <div className="absolute top-8 left-0 z-50 card-mac w-48 overflow-hidden animate-scale-in shadow-xl">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5">
                    <h2 className="text-[11px] font-semibold text-mac-text-secondary">键盘快捷键</h2>
                    <button
                      onClick={() => setShowShortcuts(false)}
                      className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-3 py-1.5 space-y-0.5">
                    {shortcuts.map(({ key, desc }) => (
                      <div key={key} className="flex items-center justify-between text-[11px]">
                        <span className="text-mac-text-secondary">{desc}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px] font-mono font-medium text-mac-text">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Center section - spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-0.5">
        {/* Grouped: Add Feed + Import OPML */}
        <div className="flex items-stretch rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden mr-0.5">
          <button
            onClick={onAddFeed}
            className="h-7 w-7 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="添加订阅 (N)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="w-px bg-black/10 dark:bg-white/10" />
          {onImportOPML && (
            <button
              onClick={onImportOPML}
              className="h-7 w-7 hidden sm:flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="导入 OPML"
            >
              <FileUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-mac-ghost h-8 w-8 p-0 rounded-lg"
          title="刷新 (R)"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onToggleSearch}
          className={`btn-mac-ghost h-8 w-8 p-0 rounded-lg ${searchPanelOpen ? 'bg-mac-blue/10 text-mac-blue' : ''}`}
          title="搜索 (/)"
        >
          <Search className="w-4 h-4" />
        </button>

        {isInstallable && (
          <button
            onClick={install}
            className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-mac-blue hidden sm:inline-flex"
            title="安装应用到桌面"
          >
            <MonitorDown className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setEinkMode(!einkMode)}
          className={`btn-mac-ghost h-8 w-8 p-0 rounded-lg ${einkMode ? 'bg-mac-blue/10 text-mac-blue' : ''} hidden sm:inline-flex`}
          title={einkMode ? '退出墨水屏模式' : '墨水屏模式'}
        >
          <PenTool className="w-4 h-4" />
        </button>

        <button
          onClick={einkMode ? undefined : cycleTheme}
          className={`btn-mac-ghost h-8 w-8 p-0 rounded-lg ${einkMode ? 'opacity-30 cursor-not-allowed' : ''} hidden sm:inline-flex`}
          title={einkMode ? '墨水屏模式下锁定日间主题' : '切换主题'}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Monitor className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onToggleSettings}
          className={`btn-mac-ghost h-8 w-8 p-0 rounded-lg ${settingsPanelOpen ? 'bg-mac-blue/10 text-mac-blue' : ''}`}
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
