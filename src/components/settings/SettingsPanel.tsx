import { Sun, Moon, Monitor, Glasses, Download, Upload, Trash2, RefreshCw, Filter, X, Plus, CheckCircle2, Circle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFilterStore } from '@/stores/filterStore';
import { exportOPML, exportJSON, importOPML, importJSON } from '@/services/exportService';
import { db } from '@/db/schema';
import type { ThemeMode } from '@/types';
import { useRef, useState } from 'react';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { preferences, setTheme, setEyeCareMode, setReaderFontSize, setAutoRefreshInterval, setNotificationsEnabled } = useUIStore();
  const { loadAll } = useSubscriptionStore();
  const { rules, addRule, removeRule, toggleRule } = useFilterStore();
  const [newKeyword, setNewKeyword] = useState('');
  const opmlInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleExportOPML = async () => {
    const xml = await exportOPML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezrss-subscriptions-${new Date().toISOString().split('T')[0]}.opml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const json = await exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezrss-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportOPML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importOPML(file);
      await loadAll();
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importJSON(file);
      await loadAll();
    }
  };

  const handleClearData = async () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await db.delete();
      window.location.reload();
    }
  };

  if (!open) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: '深色', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: '跟随系统', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute inset-0 z-40 bg-white/80 dark:bg-mac-bg-dark/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">设置</h2>

        {/* Theme */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">外观</h3>
          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  preferences.theme === value
                    ? 'bg-mac-blue text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8'
                }`}
              >
                {icon}
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Eye-care mode */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">护眼模式</h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                preferences.eyeCareMode ? 'bg-amber-500' : 'bg-black/10 dark:bg-white/10'
              }`}
              onClick={() => setEyeCareMode(!preferences.eyeCareMode)}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                  preferences.eyeCareMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="text-sm flex items-center gap-2">
              <Glasses className="w-4 h-4 text-amber-600" />
              启用护眼模式（暖色背景，减轻眼部疲劳）
            </span>
          </label>
        </section>

        {/* Reader font size */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">阅读字体大小</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReaderFontSize(Math.max(12, preferences.readerFontSize - 1))}
              className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold"
            >
              A-
            </button>
            <span className="text-sm tabular-nums w-16 text-center">{preferences.readerFontSize}px</span>
            <button
              onClick={() => setReaderFontSize(Math.min(24, preferences.readerFontSize + 1))}
              className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold"
            >
              A+
            </button>
          </div>
        </section>

        {/* Auto refresh */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">自动刷新</h3>
          <select
            value={preferences.autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="input-mac"
          >
            <option value={0}>手动刷新</option>
            <option value={15}>每 15 分钟</option>
            <option value={30}>每 30 分钟</option>
            <option value={60}>每 1 小时</option>
            <option value={180}>每 3 小时</option>
          </select>
        </section>

        {/* Notifications */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">推送通知</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                preferences.notificationsEnabled ? 'bg-mac-blue' : 'bg-black/10 dark:bg-white/10'
              }`}
              onClick={() => setNotificationsEnabled(!preferences.notificationsEnabled)}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
                  preferences.notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="text-sm">新文章推送通知</span>
          </label>
        </section>

        {/* Keyword filters */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            关键词过滤
          </h3>
          <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary mb-3">
            设置关键词后，文章列表只显示包含关键词的文章
          </p>

          {/* Active rules */}
          {rules.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    rule.isActive
                      ? 'border-mac-blue/30 bg-mac-blue/5'
                      : 'border-black/5 dark:border-white/5 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className="shrink-0"
                    title={rule.isActive ? '停用' : '启用'}
                  >
                    {rule.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-mac-blue" />
                    ) : (
                      <Circle className="w-4 h-4 text-mac-text-secondary" />
                    )}
                  </button>
                  <span className="text-sm flex-1">{rule.keyword}</span>
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="shrink-0 hover:text-mac-red transition-colors"
                    title="删除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new rule */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const kw = newKeyword.trim();
              if (!kw) return;
              const exists = rules.some(r => r.keyword === kw);
              if (exists) {
                setNewKeyword('');
                return;
              }
              addRule(kw);
              setNewKeyword('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="输入关键词..."
              className="input-mac flex-1 text-sm"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={!newKeyword.trim()}
              className="btn-mac-primary h-9 px-3"
              title="添加关键词"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Data export/import */}
        <section className="mb-8">
          <h3 className="text-sm font-medium mb-3">数据管理</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={handleExportOPML} className="btn-mac-ghost gap-2 flex-1 justify-center">
                <Download className="w-4 h-4" />
                导出 OPML
              </button>
              <button onClick={handleExportJSON} className="btn-mac-ghost gap-2 flex-1 justify-center">
                <Download className="w-4 h-4" />
                导出 JSON
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => opmlInputRef.current?.click()}
                className="btn-mac-ghost gap-2 flex-1 justify-center"
              >
                <Upload className="w-4 h-4" />
                导入 OPML
              </button>
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="btn-mac-ghost gap-2 flex-1 justify-center"
              >
                <Upload className="w-4 h-4" />
                导入 JSON
              </button>
            </div>
            <input
              ref={opmlInputRef}
              type="file"
              accept=".opml,.xml"
              className="hidden"
              onChange={handleImportOPML}
            />
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h3 className="text-sm font-medium mb-3 text-mac-red">危险操作</h3>
          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-mac-red border border-mac-red/20 hover:bg-mac-red/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            清除所有数据
          </button>
        </section>
      </div>
    </div>
  );
}
