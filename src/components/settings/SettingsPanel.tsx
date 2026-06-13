import { Sun, Moon, Monitor, Glasses, Download, Upload, Trash2, RefreshCw, Filter, X, Plus, CheckCircle2, Circle, MonitorOff } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFilterStore } from '@/stores/filterStore';
import { exportOPML, exportJSON, importOPML, importJSON } from '@/services/exportService';
import { db } from '@/db/schema';
import type { ThemeMode } from '@/types';
import { useRef, useState } from 'react';

interface ColorSwatch {
  hex: string;
  label: string;
}

const CHINESE_COLORS: ColorSwatch[] = [
  { hex: '#FF461F', label: '朱砂' },
  { hex: '#9D2933', label: '胭脂' },
  { hex: '#DB5A6B', label: '海棠红' },
  { hex: '#FFD700', label: '明黄' },
  { hex: '#177CB0', label: '天青' },
  { hex: '#789262', label: '竹青' },
  { hex: '#4A4266', label: '黛色' },
  { hex: '#1C1C1C', label: '玄色' },
];

const MODERN_COLORS: ColorSwatch[] = [
  { hex: '#A3B18A', label: '鼠尾草绿' },
  { hex: '#E2725B', label: '陶土色' },
  { hex: '#1F3A5F', label: '海军蓝' },
  { hex: '#6E8CA0', label: '雾霾蓝' },
  { hex: '#B497BD', label: '薰衣草紫' },
  { hex: '#FF6F61', label: '珊瑚橙' },
  { hex: '#C68E59', label: '焦糖棕' },
  { hex: '#BE3455', label: '活力洋红' },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { preferences, setTheme, setEyeCareMode, setEinkMode, setReaderFontSize, setAutoRefreshInterval, setNotificationsEnabled, setHighlightColor } = useUIStore();
  const { loadAll } = useSubscriptionStore();
  const { rules, addRule, removeRule, toggleRule } = useFilterStore();
  const [newKeyword, setNewKeyword] = useState('');
  const [customHex, setCustomHex] = useState('');
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
    <div className="fixed inset-0 z-[60] bg-white/80 dark:bg-mac-bg-dark/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="max-w-lg mx-auto">
        {/* Sticky header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-mac-bg-dark/70 backdrop-blur-md border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="关闭设置"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">

        {/* Theme & Display */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">外观</h3>
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

        {/* Reading modes */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">阅读模式</h3>
          <div className="space-y-4">
            {/* Eye-care */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Glasses className="w-4 h-4 text-amber-600" />
                <span className="text-sm">护眼模式</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  preferences.eyeCareMode ? 'bg-amber-500' : 'bg-black/10 dark:bg-white/10'
                }`}
                onClick={() => setEyeCareMode(!preferences.eyeCareMode)}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    preferences.eyeCareMode ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

            {/* E-ink */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <MonitorOff className="w-4 h-4 text-gray-600" />
                <span className="text-sm">墨水屏模式</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  preferences.einkMode ? 'bg-gray-700' : 'bg-black/10 dark:bg-white/10'
                }`}
                onClick={() => setEinkMode(!preferences.einkMode)}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    preferences.einkMode ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>
          </div>
        </section>

        {/* Font size */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">阅读字体</h3>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setReaderFontSize(Math.max(12, preferences.readerFontSize - 1))}
              className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold"
            >
              A-
            </button>
            <span className="text-sm tabular-nums font-medium">{preferences.readerFontSize}px</span>
            <button
              onClick={() => setReaderFontSize(Math.min(24, preferences.readerFontSize + 1))}
              className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold"
            >
              A+
            </button>
          </div>
        </section>

        {/* Auto refresh */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">自动刷新</h3>
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
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">推送通知</h3>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">新文章推送通知</span>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                preferences.notificationsEnabled ? 'bg-mac-blue' : 'bg-black/10 dark:bg-white/10'
              }`}
              onClick={() => setNotificationsEnabled(!preferences.notificationsEnabled)}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                  preferences.notificationsEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </div>
          </label>
        </section>

        {/* Highlight color */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-4">高亮色</h3>
          <ColorSwatchGroup
            title="传统中国色"
            colors={CHINESE_COLORS}
            selectedHex={preferences.highlightColor}
            onSelect={setHighlightColor}
          />
          <ColorSwatchGroup
            title="现代流行色"
            colors={MODERN_COLORS}
            selectedHex={preferences.highlightColor}
            onSelect={setHighlightColor}
          />
          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const hex = customHex.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                  setHighlightColor(hex);
                  setCustomHex('');
                }
              }}
              className="flex items-center gap-2"
            >
              <div
                className="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 shrink-0"
                style={{ backgroundColor: preferences.highlightColor }}
              />
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#FF461F"
                className="input-mac flex-1 h-8 text-xs font-mono"
                maxLength={7}
                pattern="#[0-9a-fA-F]{6}"
              />
              <button
                type="submit"
                disabled={!/^#[0-9a-fA-F]{6}$/.test(customHex.trim())}
                className="btn-mac-ghost h-8 px-3 text-xs shrink-0 disabled:opacity-30"
              >
                应用
              </button>
            </form>
          </div>
        </section>

        {/* Keyword filters */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-3 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            关键词过滤
          </h3>
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

        {/* Data management */}
        <section className="card-mac p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mb-3">数据管理</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={handleExportOPML} className="btn-mac-ghost gap-2 flex-1 justify-center text-xs">
                <Download className="w-3.5 h-3.5" />
                导出 OPML
              </button>
              <button onClick={handleExportJSON} className="btn-mac-ghost gap-2 flex-1 justify-center text-xs">
                <Download className="w-3.5 h-3.5" />
                导出 JSON
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => opmlInputRef.current?.click()} className="btn-mac-ghost gap-2 flex-1 justify-center text-xs">
                <Upload className="w-3.5 h-3.5" />
                导入 OPML
              </button>
              <button onClick={() => jsonInputRef.current?.click()} className="btn-mac-ghost gap-2 flex-1 justify-center text-xs">
                <Upload className="w-3.5 h-3.5" />
                导入 JSON
              </button>
            </div>
          </div>
          <input ref={opmlInputRef} type="file" accept=".opml,.xml" className="hidden" onChange={handleImportOPML} />
          <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </section>

        {/* Danger zone */}
        <section className="card-mac p-4 border-mac-red/20">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-mac-red mb-3">危险操作</h3>
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
    </div>
  );
}

/* ---- Color swatch group (sub-component) ---- */

function ColorSwatchGroup({
  title,
  colors,
  selectedHex,
  onSelect,
}: {
  title: string;
  colors: ColorSwatch[];
  selectedHex: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-mac-text-secondary/70 dark:text-mac-text-dark-secondary/70 mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map(({ hex, label }) => {
          const isSelected = selectedHex === hex;
          return (
            <button
              key={hex}
              onClick={() => onSelect(hex)}
              title={label}
              className={`group relative w-10 h-10 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center ${
                isSelected ? 'scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            >
              {/* Color name tooltip on hover */}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium text-white bg-black/70 dark:bg-white/20 backdrop-blur-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {label}
              </span>

              {/* Selected checkmark */}
              {isSelected && (
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}

              {/* Selection ring */}
              {isSelected && (
                <span className="absolute -inset-[4px] rounded-xl ring-2 ring-offset-1 ring-current opacity-40 pointer-events-none"
                  style={{ color: hex }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
