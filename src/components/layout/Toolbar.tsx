import { useEffect, useState, useCallback } from 'react';
import {
  Plus, RefreshCw, Search, Settings, Sun, Moon, Glasses,
  PanelLeftClose, PanelLeftOpen, FolderOpen
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTheme } from '@/hooks/useTheme';

interface ToolbarProps {
  onAddFeed: () => void;
  onRefresh: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  isRefreshing: boolean;
}

export function Toolbar({
  onAddFeed,
  onRefresh,
  onToggleSearch,
  onToggleSettings,
  isRefreshing,
}: ToolbarProps) {
  const { theme, eyeCareMode, setTheme } = useTheme();
  const setEyeCareMode = useUIStore((s) => s.setEyeCareMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const searchPanelOpen = useUIStore((s) => s.searchPanelOpen);
  const settingsPanelOpen = useUIStore((s) => s.settingsPanelOpen);
  const unreadCount = useUIStore((s) => s.unreadCount);

  const cycleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <header className="glass-toolbar h-11 flex items-center px-3 gap-1 select-none z-50">
      {/* Left section */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          className="btn-mac-ghost h-8 w-8 p-0 rounded-lg"
          title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-1.5 ml-1">
          <div className="w-5 h-5 rounded-md bg-mac-blue flex items-center justify-center">
            <FolderOpen className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">EZRSS</span>
          {unreadCount > 0 && (
            <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary bg-mac-blue/10 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Center section - spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onAddFeed}
          className="btn-mac-ghost h-8 px-2.5 gap-1.5 text-xs"
          title="添加订阅 (N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">添加订阅</span>
        </button>

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

        <button
          onClick={cycleTheme}
          className="btn-mac-ghost h-8 w-8 p-0 rounded-lg"
          title="切换主题"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-current" />
            </div>
          )}
        </button>

        <button
          onClick={() => setEyeCareMode(!eyeCareMode)}
          className={`btn-mac-ghost h-8 w-8 p-0 rounded-lg ${eyeCareMode ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}`}
          title="护眼模式"
        >
          <Glasses className="w-4 h-4" />
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
