import { useState, useRef } from 'react';
import { X, Rss, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useTagStore } from '@/stores/tagStore';
import { fetchFeedMeta, detectFeedUrl } from '@/services/rssService';
import { fetchArticles } from '@/services/rssService';
import { generateUUID } from '@/utils/uuid';
import type { Feed } from '@/types';

interface AddFeedDialogProps {
  open: boolean;
  onClose: () => void;
  onRefreshRequested?: () => void;
}

type Step = 'input' | 'detecting' | 'confirm' | 'loading' | 'success' | 'error';

export function AddFeedDialog({ open, onClose, onRefreshRequested }: AddFeedDialogProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [detectedFeeds, setDetectedFeeds] = useState<string[]>([]);
  const [feedPreview, setFeedPreview] = useState<Partial<Feed> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { folders, addSubscription } = useSubscriptionStore();
  const { tags, addTag, addTagToSubscription } = useTagStore();

  const handleDetect = async () => {
    if (!url.trim()) return;
    setStep('detecting');

    const trimmed = url.trim();

    // Validate URL scheme
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setErrorMsg('仅支持 http 和 https 协议的 URL');
        setStep('error');
        return;
      }
    } catch {
      setErrorMsg('请输入有效的 URL');
      setStep('error');
      return;
    }

    const isDirectFeed = trimmed.endsWith('.xml') || trimmed.endsWith('.rss') || trimmed.includes('/feed') || trimmed.includes('/rss');

    if (isDirectFeed) {
      await handleAddDirect(trimmed);
    } else {
      try {
        const feeds = await detectFeedUrl(trimmed);
        if (feeds.length > 0) {
          setDetectedFeeds(feeds);
          setStep('confirm');
        } else {
          await handleAddDirect(trimmed);
        }
      } catch {
        setErrorMsg('无法检测到 RSS 源，请检查 URL');
        setStep('error');
      }
    }
  };

  const handleAddDirect = async (feedUrl: string) => {
    setStep('loading');
    try {
      const meta = await fetchFeedMeta(feedUrl);
      setFeedPreview(meta);
      const feed: Feed = {
        id: meta.id || generateUUID(),
        url: feedUrl,
        title: meta.title || feedUrl,
        description: meta.description || '',
        link: meta.link || feedUrl,
        imageUrl: meta.imageUrl || '',
        lastFetchedAt: Date.now(),
        errorCount: 0,
        isActive: true,
      };
      await addSubscription(feed, selectedFolderId);

      // Apply tags to the new subscription
      if (selectedTagIds.length > 0) {
        const newSub = useSubscriptionStore.getState().subscriptions.find(s => s.feedId === feed.id);
        if (newSub) {
          for (const tagId of selectedTagIds) {
            await addTagToSubscription(newSub.id, tagId);
          }
        }
      }

      // Fetch initial articles
      await fetchArticles(feedUrl, feed.id);

      setStep('success');
    } catch (err) {
      setErrorMsg(`添加失败：${err instanceof Error ? err.message : '未知错误'}`);
      setStep('error');
    }
  };

  const handleSelectDetected = (feedUrl: string) => {
    handleAddDirect(feedUrl);
  };

  const handleClose = () => {
    setUrl('');
    setStep('input');
    setDetectedFeeds([]);
    setFeedPreview(null);
    setErrorMsg('');
    setSelectedFolderId(undefined);
    setSelectedTagIds([]);
    setNewTagName('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step === 'input') {
      handleDetect();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative card-mac w-full max-w-md mx-4 p-0 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-base font-semibold">添加 RSS 订阅</h2>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* URL Input */}
          {(step === 'input' || step === 'detecting') && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                订阅源地址
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入网站 URL 或 RSS 链接..."
                  className="input-mac flex-1"
                  autoFocus
                  disabled={step === 'detecting'}
                />
                <button
                  onClick={handleDetect}
                  disabled={!url.trim() || step === 'detecting'}
                  className="btn-mac-primary shrink-0"
                >
                  {step === 'detecting' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '添加'
                  )}
                </button>
              </div>
              <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary mt-2">
                支持直接输入 RSS/Atom 链接，或输入网站地址自动检测
              </p>
            </div>
          )}

          {/* Detected feeds */}
          {step === 'confirm' && detectedFeeds.length > 0 && (
            <div>
              <p className="text-sm mb-3">检测到以下 RSS 源：</p>
              <div className="space-y-2">
                {detectedFeeds.map((feedUrl) => (
                  <button
                    key={feedUrl}
                    onClick={() => handleSelectDetected(feedUrl)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-mac-blue/5 hover:border-mac-blue/30 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Rss className="w-4 h-4 text-mac-blue shrink-0" />
                      <span className="text-sm truncate group-hover:text-mac-blue transition-colors" title={feedUrl}>
                        {feedUrl}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-mac-blue animate-spin mb-3" />
              <p className="text-sm">正在获取订阅源信息...</p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && feedPreview && (
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-8 h-8 text-mac-green mb-3" />
              <p className="text-sm font-medium">订阅成功</p>
              <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary mt-1">
                {feedPreview.title}
              </p>
              <p className="text-xs text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mt-4 mb-4">
                是否立即刷新获取文章？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onRefreshRequested?.();
                    handleClose();
                  }}
                  className="btn-mac-primary px-6 text-xs"
                >
                  立即刷新
                </button>
                <button
                  onClick={handleClose}
                  className="btn-mac-ghost px-4 text-xs"
                >
                  稍后再说
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6">
              <AlertCircle className="w-8 h-8 text-mac-red mb-3" />
              <p className="text-sm font-medium">添加失败</p>
              <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary mt-1 text-center">
                {errorMsg}
              </p>
              <button
                onClick={() => setStep('input')}
                className="btn-mac-ghost mt-3 text-xs"
              >
                重试
              </button>
            </div>
          )}
        </div>

        {/* Folder & Tag selectors */}
        {step === 'input' && (
          <div className="px-5 pb-5 space-y-3">
            {folders.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">选择文件夹（可选）</label>
                <select
                  value={selectedFolderId || ''}
                  onChange={(e) => setSelectedFolderId(e.target.value || undefined)}
                  className="input-mac"
                >
                  <option value="">无文件夹</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">选择标签（可选）</label>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                          } else {
                            setSelectedTagIds(prev => [...prev, tag.id]);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                          isSelected ? 'ring-1 shadow-sm' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: `${tag.color || '#007AFF'}15`,
                          color: tag.color || '#007AFF',
                          ...(isSelected ? { borderColor: tag.color || '#007AFF' } : {}),
                        }}
                      >
                        {isSelected && <span className="font-bold">✓</span>}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {/* Create new tag inline */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = newTagName.trim();
                  if (!name) return;

                  // Check for duplicate name in current tags
                  const existing = tags.find(t => t.name === name);
                  if (existing) {
                    if (!selectedTagIds.includes(existing.id)) {
                      setSelectedTagIds(prev => [...prev, existing.id]);
                    }
                    setNewTagName('');
                    return;
                  }

                  // Create new tag
                  await addTag(name);
                  // Find the newly created tag in updated store
                  const created = useTagStore.getState().tags.find(t => t.name === name);
                  if (created && !selectedTagIds.includes(created.id)) {
                    setSelectedTagIds(prev => [...prev, created.id]);
                  }
                  setNewTagName('');
                }}
                className="flex gap-1 mt-2"
              >
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="+ 新建标签"
                  className="flex-1 text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:border-mac-blue/50"
                  maxLength={20}
                />
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
