import { Sun, Moon, Monitor, Glasses, Download, Upload, Trash2, RefreshCw, Filter, X, Plus, CheckCircle2, Circle, MonitorOff, Palette, Bell } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFilterStore } from '@/stores/filterStore';
import { exportOPML, exportJSON, importOPML, importJSON } from '@/services/exportService';
import { db } from '@/db/schema';
import type { ThemeMode } from '@/types';
import { useRef, useState } from 'react';

/* ---- Constants ---- */

const TABS = [
  { id: 'display', label: '显示', icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'color', label: '色彩', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'features', label: '功能', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { id: 'data', label: '数据', icon: <Download className="w-3.5 h-3.5" /> },
] as const;
type TabId = typeof TABS[number]['id'];

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

/* ---- Toggle Switch ---- */

function Toggle({ enabled, onChange, color = 'bg-mac-blue' }: { enabled: boolean; onChange: () => void; color?: string }) {
  return (
    <div
      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${enabled ? color : 'bg-black/10 dark:bg-white/10'}`}
      onClick={onChange}
    >
      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </div>
  );
}

/* ---- Main ---- */

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { preferences, setTheme, setEyeCareMode, setEinkMode, setReaderFontSize, setAutoRefreshInterval, setNotificationsEnabled, setHighlightColor } = useUIStore();
  const { loadAll } = useSubscriptionStore();
  const { rules, addRule, removeRule, toggleRule } = useFilterStore();
  const [activeTab, setActiveTab] = useState<TabId>('display');
  const [newKeyword, setNewKeyword] = useState('');
  const [customHex, setCustomHex] = useState('');
  const opmlInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: '深色', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: '跟随系统', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-white/80 dark:bg-mac-bg-dark/80 backdrop-blur-xl animate-fade-in flex items-center justify-center p-4">
      <div className="w-full max-w-lg card-mac overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <h2 className="text-base font-semibold">设置</h2>
          <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === id
                  ? 'bg-white dark:bg-white/10 text-mac-blue shadow-sm'
                  : 'text-mac-text-secondary hover:text-mac-text hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'display' && (
            <div className="space-y-4">
              {/* Theme */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">主题</h3>
                <div className="flex gap-2">
                  {themeOptions.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${
                        preferences.theme === value ? 'bg-mac-blue text-white shadow-sm' : 'bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reading modes */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">阅读模式</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <div className="flex items-center gap-2">
                      <Glasses className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">护眼模式</span>
                    </div>
                    <Toggle enabled={preferences.eyeCareMode} onChange={() => setEyeCareMode(!preferences.eyeCareMode)} color="bg-amber-500" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <div className="flex items-center gap-2">
                      <MonitorOff className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">墨水屏模式</span>
                    </div>
                    <Toggle enabled={preferences.einkMode} onChange={() => setEinkMode(!preferences.einkMode)} color="bg-gray-700" />
                  </label>
                </div>
              </div>

              {/* Font size */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">阅读字体</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => setReaderFontSize(Math.max(12, preferences.readerFontSize - 1))} className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold">A-</button>
                  <span className="text-sm tabular-nums font-medium w-10 text-center">{preferences.readerFontSize}px</span>
                  <button onClick={() => setReaderFontSize(Math.min(24, preferences.readerFontSize + 1))} className="btn-mac-ghost h-8 w-8 p-0 rounded-lg text-sm font-bold">A+</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'color' && (
            <div className="space-y-4">
              <ColorSwatchGroup title="传统中国色" colors={CHINESE_COLORS} selectedHex={preferences.highlightColor} onSelect={setHighlightColor} />
              <ColorSwatchGroup title="现代流行色" colors={MODERN_COLORS} selectedHex={preferences.highlightColor} onSelect={setHighlightColor} />
              <div className="pt-3 border-t border-black/5 dark:border-white/5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const hex = customHex.trim();
                    if (/^#[0-9a-fA-F]{6}$/.test(hex)) { setHighlightColor(hex); setCustomHex(''); }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-md border border-black/10 dark:border-white/10 shrink-0" style={{ backgroundColor: preferences.highlightColor }} />
                  <input type="text" value={customHex} onChange={(e) => setCustomHex(e.target.value)} placeholder="#FF461F" className="input-mac flex-1 h-8 text-xs font-mono" maxLength={7} />
                  <button type="submit" disabled={!/^#[0-9a-fA-F]{6}$/.test(customHex.trim())} className="btn-mac-ghost h-8 px-3 text-xs shrink-0 disabled:opacity-30">应用</button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              {/* Auto refresh */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">自动刷新</h3>
                <select value={preferences.autoRefreshInterval} onChange={(e) => setAutoRefreshInterval(Number(e.target.value))} className="input-mac">
                  <option value={0}>手动刷新</option>
                  <option value={15}>每 15 分钟</option>
                  <option value={30}>每 30 分钟</option>
                  <option value={60}>每 1 小时</option>
                  <option value={180}>每 3 小时</option>
                </select>
              </div>

              {/* Notifications */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">推送通知</h3>
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-mac-blue" />
                    <span className="text-sm">新文章推送通知</span>
                  </div>
                  <Toggle enabled={preferences.notificationsEnabled} onChange={() => setNotificationsEnabled(!preferences.notificationsEnabled)} />
                </label>
              </div>

              {/* Keyword filters */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2 flex items-center gap-1.5">
                  <Filter className="w-3 h-3" />
                  关键词过滤
                </h3>
                {rules.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${rule.isActive ? 'border-mac-blue/30 bg-mac-blue/5' : 'border-black/5 dark:border-white/5 opacity-50'}`}>
                        <button onClick={() => toggleRule(rule.id)} className="shrink-0" title={rule.isActive ? '停用' : '启用'}>
                          {rule.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-mac-blue" /> : <Circle className="w-3.5 h-3.5 text-mac-text-secondary" />}
                        </button>
                        <span className="flex-1">{rule.keyword}</span>
                        <button onClick={() => removeRule(rule.id)} className="shrink-0 hover:text-mac-red transition-colors"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const kw = newKeyword.trim();
                    if (!kw || rules.some(r => r.keyword === kw)) { setNewKeyword(''); return; }
                    addRule(kw);
                    setNewKeyword('');
                  }}
                  className="flex gap-2"
                >
                  <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="输入关键词..." className="input-mac flex-1 h-8 text-xs" maxLength={50} />
                  <button type="submit" disabled={!newKeyword.trim()} className="btn-mac-primary h-8 px-2.5 text-xs" title="添加"><Plus className="w-3.5 h-3.5" /></button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Export/Import */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 mb-2">导入导出</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button onClick={async () => { const xml = await exportOPML(); const b = new Blob([xml], { type: 'application/xml' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `ezrss-subscriptions-${new Date().toISOString().split('T')[0]}.opml`; a.click(); URL.revokeObjectURL(u); }} className="btn-mac-ghost gap-1.5 flex-1 justify-center text-xs"><Download className="w-3.5 h-3.5" />导出 OPML</button>
                    <button onClick={async () => { const json = await exportJSON(); const b = new Blob([json], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `ezrss-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u); }} className="btn-mac-ghost gap-1.5 flex-1 justify-center text-xs"><Download className="w-3.5 h-3.5" />导出 JSON</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => opmlInputRef.current?.click()} className="btn-mac-ghost gap-1.5 flex-1 justify-center text-xs"><Upload className="w-3.5 h-3.5" />导入 OPML</button>
                    <button onClick={() => jsonInputRef.current?.click()} className="btn-mac-ghost gap-1.5 flex-1 justify-center text-xs"><Upload className="w-3.5 h-3.5" />导入 JSON</button>
                  </div>
                </div>
                <input ref={opmlInputRef} type="file" accept=".opml,.xml" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await importOPML(f); await loadAll(); } }} />
                <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await importJSON(f); await loadAll(); } }} />
              </div>

              {/* Danger */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mac-red mb-2">危险操作</h3>
                <button
                  onClick={async () => { if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) { await db.delete(); window.location.reload(); } }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs text-mac-red border border-mac-red/20 hover:bg-mac-red/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清除所有数据
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Color swatch group ---- */

function ColorSwatchGroup({ title, colors, selectedHex, onSelect }: { title: string; colors: ColorSwatch[]; selectedHex: string; onSelect: (hex: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-mac-text-secondary/70 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {colors.map(({ hex, label }) => {
          const isSelected = selectedHex === hex;
          return (
            <button
              key={hex}
              onClick={() => onSelect(hex)}
              title={label}
              className={`group relative w-9 h-9 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: hex }}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-black/70 backdrop-blur-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">{label}</span>
              {isSelected && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
              {isSelected && <span className="absolute -inset-[3px] rounded-xl ring-2 ring-offset-1 ring-current opacity-40 pointer-events-none" style={{ color: hex }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
