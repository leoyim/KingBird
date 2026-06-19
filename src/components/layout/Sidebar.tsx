import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, FolderOpen, Inbox,
  Rss, Star, Tags, MoreHorizontal, X, Plus, SquarePen, Trash2, Clock, CheckSquare, RotateCcw, RotateCw, Tag, RefreshCcw
} from 'lucide-react';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useArticleStore } from '@/stores/articleStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import type { Feed, Folder } from '@/types';

interface SidebarProps {
  onSelectFeed: (feedId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onEditFeed?: (feedId: string) => void;
}

export function Sidebar({ onSelectFeed, onSelectFolder, onEditFeed }: SidebarProps) {
  const { subscriptions, feeds, folders, selectedFeedId, selectedFolderId, setSelectedFeedId, setSelectedFolderId } = useSubscriptionStore();
  const feedRefreshState = useSubscriptionStore((s) => s.feedRefreshState);
  const readStates = useArticleStore((s) => s.readStates);
  const articles = useArticleStore((s) => s.articles);
  const { tags, subscriptionTags, getTagsForSubscription, getSubscriptionsForTag, addTagToSubscription, removeTagFromSubscription, addTag } = useTagStore();
  const starredFilter = useUIStore((s) => s.starredFilter);
  const setStarredFilter = useUIStore((s) => s.setStarredFilter);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagEditorSubId, setTagEditorSubId] = useState<string | null>(null);
  const [contextMenuSubId, setContextMenuSubId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedSubId, setLastClickedSubId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleAutoRefresh = useSubscriptionStore((s) => s.toggleAutoRefresh);
  const removeSubscription = useSubscriptionStore((s) => s.removeSubscription);

  // Get flat ordered list of all subscription IDs (for Shift range selection)
  const allSubIdsOrdered = useMemo(() => {
    const ids: string[] = [];
    const collectFromSubs = (subs: typeof subscriptions) => {
      for (const s of subs) {
        if (s.id) ids.push(s.id);
      }
    };
    collectFromSubs(subscriptions.filter(s => !s.folderId));
    for (const folder of folders) {
      collectFromSubs(subscriptions.filter(s => s.folderId === folder.id));
    }
    return ids;
  }, [subscriptions, folders]);

  // Handle Ctrl/Shift multi-select
  const handleMultiSelectClick = (e: React.MouseEvent, subId: string) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle single item
      setBatchSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(subId)) next.delete(subId);
        else next.add(subId);
        return next;
      });
      setBatchMode(true);
      setLastClickedSubId(subId);
    } else if (e.shiftKey && lastClickedSubId) {
      // Range select
      const startIdx = allSubIdsOrdered.indexOf(lastClickedSubId);
      const endIdx = allSubIdsOrdered.indexOf(subId);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = allSubIdsOrdered.slice(from, to + 1);
        setBatchSelectedIds(prev => new Set([...prev, ...rangeIds]));
        setBatchMode(true);
      }
    } else {
      setLastClickedSubId(subId);
      return false; // Signal: normal click
    }
    return true; // Signal: handled as multi-select
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getUnreadCount = (feedId: string) => {
    return articles.filter(a => a.feedId === feedId && !readStates.get(a.id)?.isRead).length;
  };

  const totalUnread = articles.filter(a => !readStates.get(a.id)?.isRead).length;
  const starredCount = articles.filter(a => readStates.get(a.id)?.isStarred).length;

  // Organize subscriptions by folder
  const folderSubscriptions = useMemo(() => {
    const map = new Map<string, string[]>();
    const uncategorized: string[] = [];

    for (const sub of subscriptions) {
      if (sub.folderId) {
        const list = map.get(sub.folderId) || [];
        list.push(sub.feedId);
        map.set(sub.folderId, list);
      } else {
        uncategorized.push(sub.feedId);
      }
    }

    return { map, uncategorized };
  }, [subscriptions]);

  // Organize subscriptions by tag
  const tagSubscriptions = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tag of tags) {
      const subIds = getSubscriptionsForTag(tag.id);
      if (subIds.length > 0) {
        map.set(tag.id, subIds);
      }
    }
    return map;
  }, [tags, subscriptionTags]);

  // Filter feeds when a tag is selected
  const visibleFeedIds = useMemo(() => {
    if (!selectedTagId) return null; // null means show all
    return new Set(getSubscriptionsForTag(selectedTagId));
  }, [selectedTagId, subscriptionTags]);

  const getFeedById = (feedId: string): Feed | undefined => {
    return feeds.find(f => f.id === feedId);
  };

  const getFolderById = (folderId: string): Folder | undefined => {
    return folders.find(f => f.id === folderId);
  };

  const handleFeedClick = (feedId: string) => {
    setStarredFilter(false);
    setSelectedFeedId(feedId);
    onSelectFeed(feedId);
  };

  const handleFolderClick = (folderId: string) => {
    setStarredFilter(false);
    setSelectedFolderId(folderId);
    onSelectFolder(folderId);
  };

  const handleTagClick = (tagId: string) => {
    setStarredFilter(false);
    setSelectedTagId(prev => prev === tagId ? null : tagId);
    setSelectedFeedId(null);
    setSelectedFolderId(null);
  };

  const getSubIdByFeedId = (feedId: string): string | undefined => {
    return subscriptions.find(s => s.feedId === feedId)?.id;
  };

  return (
    <aside className="w-[260px] min-w-[260px] h-full glass-sidebar flex flex-col overflow-hidden">
      {/* Smart filters */}
      <div className="px-2 pt-3 pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 px-2 mb-1">
          智能过滤
        </div>
        <SidebarItem
          icon={<Inbox className="w-4 h-4" />}
          label="全部未读"
          count={totalUnread}
          isActive={!starredFilter && !selectedTagId && !selectedFeedId && !selectedFolderId}
          onClick={() => {
            setStarredFilter(false);
            setSelectedTagId(null);
            setSelectedFeedId(null);
            setSelectedFolderId(null);
          }}
        />
        <SidebarItem
          icon={<Star className="w-4 h-4 text-mac-orange" />}
          label="收藏"
          count={starredCount}
          isActive={starredFilter}
          onClick={() => {
            setStarredFilter(!starredFilter);
            setSelectedTagId(null);
            setSelectedFeedId(null);
            setSelectedFolderId(null);
          }}
        />
      </div>

      <div className="h-px bg-black/5 dark:bg-white/5 mx-3 my-1" />

      {/* Tag filters */}
      <div className="px-2 pb-1">
        <div className="flex items-center justify-between px-2 mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60">
            标签筛选
          </div>
          {selectedTagId && (
            <button
              onClick={() => setSelectedTagId(null)}
              className="text-[10px] text-mac-blue hover:text-mac-blue/70 transition-colors"
            >
              清除
            </button>
          )}
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 px-2">
            {tags.map((tag) => {
              const subCount = getSubscriptionsForTag(tag.id).length;
              const isActive = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'ring-1 ring-current shadow-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: `${tag.color || '#007AFF'}15`,
                    color: tag.color || '#007AFF',
                  }}
                >
                  <Tags className="w-3 h-3" />
                  {tag.name}
                  {subCount > 0 && (
                    <span className="tabular-nums">{subCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-mac-text-secondary/50 dark:text-mac-text-dark-secondary/50 px-2 py-1">
            暂无标签，可在订阅源上添加标签
          </p>
        )}
      </div>

      <div className="h-px bg-black/5 dark:bg-white/5 mx-3 my-1" />

      {/* Subscriptions header — fixed, outside scroll area */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)] z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60">
            订阅源
            {selectedTagId && (
              <span className="normal-case ml-1 text-mac-blue font-normal">
                (已筛选)
              </span>
            )}
          </span>
          <span className="text-[10px] text-mac-text-secondary/40 tabular-nums">
            {subscriptions.length}
          </span>
          {/* Refresh progress indicator */}
          {(() => {
            const statuses = Object.values(feedRefreshState);
            const pending = statuses.filter(s => s === 'pending').length;
            const success = statuses.filter(s => s === 'success').length;
            const failure = statuses.filter(s => s === 'failure').length;
            if (pending === 0 && success === 0 && failure === 0) return null;
            return (
              <span className="flex items-center gap-1 text-[10px]">
                {pending > 0 && (
                  <span className="flex items-center gap-0.5 text-blue-500">
                    <span className="w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" />
                    {pending}
                  </span>
                )}
                {success > 0 && (
                  <span className="flex items-center gap-0.5 text-green-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    {success}
                  </span>
                )}
                {failure > 0 && (
                  <span className="flex items-center gap-0.5 text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    {failure}
                  </span>
                )}
              </span>
            );
          })()}
        </div>
        <button
          onClick={() => {
            setBatchMode(!batchMode);
            setBatchSelectedIds(new Set());
          }}
          className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
            batchMode
              ? 'bg-mac-blue/10 text-mac-blue'
              : 'text-mac-text-secondary/50 hover:text-mac-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <CheckSquare className="w-3 h-3 inline mr-0.5" />
          {batchMode ? '退出' : '批量'}
        </button>
      </div>

      {/* Subscriptions list — scrollable */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {/* Piano-key row counter */}
        {(() => { let ri = 0;
        return (<>
        {/* Folders */}
        {folders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          let feedIds = folderSubscriptions.map.get(folder.id) || [];
          if (visibleFeedIds) {
            feedIds = feedIds.filter(fid => visibleFeedIds.has(fid));
          }
          if (visibleFeedIds && feedIds.length === 0) return null;

          const folderUnread = feedIds.reduce((sum, fid) => sum + getUnreadCount(fid), 0);

          return (
            <div key={folder.id}>
              <div
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  selectedFolderId === folder.id
                    ? 'bg-mac-blue/10 text-mac-blue'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                onClick={() => {
                  toggleFolder(folder.id);
                  handleFolderClick(folder.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-mac-text-secondary dark:text-mac-text-dark-secondary" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-mac-text-secondary dark:text-mac-text-dark-secondary" />
                )}
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="text-sm truncate flex-1">{folder.name}</span>
                {folderUnread > 0 && (
                  <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary tabular-nums">
                    {folderUnread}
                  </span>
                )}
              </div>

              {isExpanded && (
                <div className="ml-4">
                  {feedIds.map((feedId) => {
                    const feed = getFeedById(feedId);
                    if (!feed) return null;
                    const subId = getSubIdByFeedId(feedId);
                    return (
                      <FeedSidebarItem
                        key={feed.id}
                        feed={feed}
                        subId={subId}
                        unreadCount={getUnreadCount(feed.id)}
                        isSelected={selectedFeedId === feed.id}
                        showTagEditor={tagEditorSubId === subId}
                        showContextMenu={contextMenuSubId === subId}
                        batchMode={batchMode}
                        isBatchSelected={subId ? batchSelectedIds.has(subId) : false}
                        isEven={ri++ % 2 === 0}
                        onBatchToggle={(sid) => {
                          setBatchSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(sid)) next.delete(sid);
                            else next.add(sid);
                            return next;
                          });
                        }}
                        subTags={subId ? getTagsForSubscription(subId) : []}
                        allTags={tags}
                        onClick={(e) => {
                          if (subId && handleMultiSelectClick(e, subId)) return;
                          if (batchMode && subId) {
                            if (batchSelectedIds.has(subId)) {
                              batchSelectedIds.delete(subId);
                            } else {
                              batchSelectedIds.add(subId);
                            }
                            setBatchSelectedIds(new Set(batchSelectedIds));
                          } else {
                            handleFeedClick(feed.id);
                          }
                        }}
                        onToggleTagEditor={(sid) => setTagEditorSubId(tagEditorSubId === sid ? null : sid)}
                        onToggleContextMenu={(sid) => setContextMenuSubId(contextMenuSubId === sid ? null : sid)}
                        onEditFeed={() => onEditFeed?.(feed.id)}
                        onAddTag={async (sid, tagName) => {
                          let tag = tags.find(t => t.name === tagName);
                          if (!tag) {
                            await addTag(tagName);
                            tag = useTagStore.getState().tags.find(t => t.name === tagName);
                            if (!tag) return;
                          }
                          await addTagToSubscription(sid, tag.id);
                        }}
                        onRemoveTag={removeTagFromSubscription}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized feeds */}
        {folderSubscriptions.uncategorized.map((feedId) => {
          const feed = getFeedById(feedId);
          if (!feed) return null;
          if (visibleFeedIds && !visibleFeedIds.has(feedId)) return null;

          const subId = getSubIdByFeedId(feedId);
          return (
            <FeedSidebarItem
              key={feed.id}
              feed={feed}
              subId={subId}
              unreadCount={getUnreadCount(feed.id)}
              isSelected={selectedFeedId === feed.id}
              showTagEditor={tagEditorSubId === subId}
              showContextMenu={contextMenuSubId === subId}
              batchMode={batchMode}
              isBatchSelected={subId ? batchSelectedIds.has(subId) : false}
              isEven={ri++ % 2 === 0}
              onBatchToggle={(sid) => {
                setBatchSelectedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(sid)) next.delete(sid);
                  else next.add(sid);
                  return next;
                });
              }}
              subTags={subId ? getTagsForSubscription(subId!) : []}
              allTags={tags}
              onClick={(e) => {
                if (subId && handleMultiSelectClick(e, subId)) return;
                if (batchMode && subId) {
                  if (batchSelectedIds.has(subId)) {
                    batchSelectedIds.delete(subId);
                  } else {
                    batchSelectedIds.add(subId);
                  }
                  setBatchSelectedIds(new Set(batchSelectedIds));
                } else {
                  handleFeedClick(feed.id);
                }
              }}
              onToggleTagEditor={(sid) => setTagEditorSubId(tagEditorSubId === sid ? null : sid)}
              onToggleContextMenu={(sid) => setContextMenuSubId(contextMenuSubId === sid ? null : sid)}
              onEditFeed={() => onEditFeed?.(feed.id)}
              onAddTag={async (sid, tagName) => {
                let tag = tags.find(t => t.name === tagName);
                if (!tag) {
                  await addTag(tagName);
                  tag = useTagStore.getState().tags.find(t => t.name === tagName);
                  if (!tag) return;
                }
                await addTagToSubscription(sid, tag.id);
              }}
              onRemoveTag={removeTagFromSubscription}
            />
          );
        })}

        {subscriptions.length === 0 && (
          <div className="text-center py-12 px-4">
            <Rss className="w-10 h-10 mx-auto mb-3 text-mac-text-secondary/30 dark:text-mac-text-dark-secondary/30" />
            <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
              还没有订阅源
            </p>
            <p className="text-xs text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mt-1">
              点击「添加订阅」开始
            </p>
          </div>
        )}
      </>); })()}</div>

      {/* Batch action bar — fixed at bottom, outside scroll area */}
      {batchMode && (
        <div className="shrink-0 mx-2 mb-2 mt-2 p-2 rounded-lg bg-mac-blue/5 dark:bg-mac-blue/10 border border-mac-blue/20 border-t-mac-blue/30 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.5)] flex items-center gap-2 flex-wrap">
          {/* Select all toggle */}
            <button
              onClick={() => {
                const allSubIds = subscriptions.map(s => s.id);
                if (batchSelectedIds.size === allSubIds.length) {
                  setBatchSelectedIds(new Set());
                } else {
                  setBatchSelectedIds(new Set(allSubIds));
                }
              }}
              className="text-[11px] font-medium px-2 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              {batchSelectedIds.size === subscriptions.length ? '取消全选' : '全选'}
            </button>

            <span className="text-[11px] text-mac-text-secondary dark:text-mac-text-dark-secondary shrink-0">
              已选 {batchSelectedIds.size}
            </span>
            <div className="flex-1 min-w-0" />
            <button
              onClick={async () => {
                for (const subId of batchSelectedIds) {
                  const sub = subscriptions.find(s => s.id === subId);
                  if (sub?.autoRefresh === false) {
                    await toggleAutoRefresh(subId);
                  }
                }
                setBatchSelectedIds(new Set());
                setBatchMode(false);
              }}
              disabled={batchSelectedIds.size === 0}
              className="text-[11px] font-medium px-2 py-1 rounded bg-mac-blue/10 text-mac-blue hover:bg-mac-blue/20 transition-colors disabled:opacity-30"
            >
              <RotateCw className="w-3 h-3 inline mr-1" />
              开启刷新
            </button>
            <button
              onClick={async () => {
                for (const subId of batchSelectedIds) {
                  const sub = subscriptions.find(s => s.id === subId);
                  if (sub?.autoRefresh !== false) {
                    await toggleAutoRefresh(subId);
                  }
                }
                setBatchSelectedIds(new Set());
                setBatchMode(false);
              }}
              disabled={batchSelectedIds.size === 0}
              className="text-[11px] font-medium px-2 py-1 rounded bg-mac-text-secondary/10 text-mac-text-secondary hover:bg-mac-text-secondary/20 transition-colors disabled:opacity-30"
            >
              <RotateCcw className="w-3 h-3 inline mr-1" />
              取消刷新
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={batchSelectedIds.size === 0 || showDeleteConfirm}
              className="text-[11px] font-medium px-2 py-1 rounded bg-mac-red/10 text-mac-red hover:bg-mac-red/20 transition-colors disabled:opacity-30"
            >
              <Trash2 className="w-3 h-3 inline mr-1" />
              删除
            </button>
            {showDeleteConfirm && (
              <div className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-lg bg-mac-red/10 border border-mac-red/20">
                <span className="text-[10px] text-mac-red font-medium whitespace-nowrap">
                  删除 {batchSelectedIds.size} 项？
                </span>
                <button
                  onClick={async () => {
                    for (const subId of batchSelectedIds) {
                      await removeSubscription(subId);
                    }
                    setBatchSelectedIds(new Set());
                    setBatchMode(false);
                    setShowDeleteConfirm(false);
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-mac-red text-white hover:bg-mac-red/80 transition-colors"
                >
                  确定
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}
    </aside>
  );
}

function FeedSidebarItem({
  feed,
  subId,
  unreadCount,
  isSelected,
  onClick,
  showTagEditor,
  showContextMenu,
  batchMode,
  isBatchSelected,
  onBatchToggle,
  isEven,
  subTags,
  allTags,
  onToggleTagEditor,
  onToggleContextMenu,
  onEditFeed,
  onAddTag,
  onRemoveTag,
}: {
  feed: Feed;
  subId?: string;
  unreadCount: number;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  showTagEditor?: boolean;
  showContextMenu?: boolean;
  batchMode?: boolean;
  isBatchSelected?: boolean;
  onBatchToggle?: (subId: string) => void;
  isEven?: boolean;
  subTags: import('@/types').Tag[];
  allTags: import('@/types').Tag[];
  onToggleTagEditor: (subId: string) => void;
  onToggleContextMenu: (subId: string) => void;
  onEditFeed?: () => void;
  onAddTag: (subId: string, tagName: string) => Promise<void>;
  onRemoveTag: (subId: string, tagId: string) => Promise<void>;
}) {
  const [newTagName, setNewTagName] = useState('');
  const [showDeleteFeedConfirm, setShowDeleteFeedConfirm] = useState(false);
  const availableTags = allTags.filter(t => !subTags.some(st => st.id === t.id));
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset delete confirm when menu closes
  useEffect(() => {
    if (!showContextMenu) setShowDeleteFeedConfirm(false);
  }, [showContextMenu]);

  // Auto-close context menu / tag editor after 1s when mouse leaves
  useEffect(() => {
    if (!showContextMenu && !showTagEditor) return;
    if (!subId) return;

    const startTimer = () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        if (showContextMenu) onToggleContextMenu(subId);
        if (showTagEditor) onToggleTagEditor(subId);
      }, 1_000);
    };

    const clearTimer = () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };

    startTimer();

    const el = contextMenuRef.current;
    if (el) {
      el.addEventListener('mouseenter', clearTimer);
      el.addEventListener('mouseleave', startTimer);
    }

    return () => {
      clearTimer();
      if (el) {
        el.removeEventListener('mouseenter', clearTimer);
        el.removeEventListener('mouseleave', startTimer);
      }
    };
  }, [showContextMenu, showTagEditor, subId, onToggleContextMenu, onToggleTagEditor]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu || !subId) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        onToggleContextMenu(subId);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showContextMenu, subId, onToggleContextMenu]);

  // Per-feed refresh status from store
  const refreshStatus = useSubscriptionStore((s) => s.feedRefreshState[feed.id]) ?? null;
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const toggleAutoRefresh = useSubscriptionStore((s) => s.toggleAutoRefresh);
  const sub = subId ? subscriptions.find(s => s.id === subId) : undefined;
  const autoRefreshDisabled = sub?.autoRefresh === false;

  // Favicon URL — persisted in DB, falls back to Google favicon service
  const faviconUrl = feed.faviconUrl || (feed.link || feed.url ? `https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(feed.link || feed.url).hostname; } catch { return ''; } })()}&sz=64` : '');
  const isRefreshSuccess = refreshStatus === 'success';

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all duration-200 border-b border-black/[0.06] dark:border-white/[0.06] border-l-[5px] ${
          isSelected
            ? 'bg-mac-blue/[0.07] text-mac-blue border-l-mac-blue'
            : `${isEven ? 'bg-black/[0.02] dark:bg-white/[0.02]' : 'bg-transparent'} border-l-black/[0.08] dark:border-l-white/[0.06] hover:border-l-black/[0.12] dark:hover:border-l-white/[0.1]`
        }`}
        onClick={onClick}
      >
        {/* --- Icon: batch checkbox or favicon --- */}
        {batchMode ? (
          <span
            className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
              isBatchSelected
                ? 'bg-mac-blue border-mac-blue text-white'
                : 'border-black/15 dark:border-white/15 hover:border-mac-blue/50'
            }`}
          >
            {isBatchSelected && (
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
        ) : (
          <>
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="w-4 h-4 rounded-sm shrink-0 object-contain"
                loading="lazy"
                onError={(e) => {
                  // Fallback to RSS icon on error
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-4 h-4 rounded-sm shrink-0 bg-mac-blue/20 items-center justify-center ${faviconUrl ? 'hidden' : 'flex'}`}
            >
              <Rss className="w-2.5 h-2.5 text-mac-blue" />
            </div>
          </>
        )}

        {/* Feed title — bold when refresh succeeded */}
        <span className={`text-sm truncate flex-1 ${unreadCount > 0 || isRefreshSuccess ? 'font-semibold' : ''} ${isRefreshSuccess && !isSelected ? 'font-bold' : ''}`}>
          {feed.title}
        </span>

        {/* Auto-refresh disabled indicator */}
        {autoRefreshDisabled && (
          <span title="定时刷新已关闭">
            <Clock className="w-3 h-3 shrink-0 text-mac-text-secondary/40" />
          </span>
        )}

        {/* Sub tags preview */}
        {subTags.length > 0 && !showTagEditor && !showContextMenu && (
          <div className="flex gap-0.5 shrink-0">
            {subTags.slice(0, 2).map(t => (
              <span
                key={t.id}
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.color || '#007AFF' }}
                title={t.name}
              />
            ))}
            {subTags.length > 2 && (
              <span className="text-[9px] text-mac-text-secondary">+{subTags.length - 2}</span>
            )}
          </div>
        )}
        {unreadCount > 0 && (
          <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary tabular-nums">
            {unreadCount}
          </span>
        )}
        {/* End slot: refresh status OR action menu (same position) */}
        {!batchMode && (
          <span className="shrink-0 w-5 h-5 flex items-center justify-center">
            {refreshStatus === 'pending' && (
              <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" title="刷新中…" />
            )}
            {refreshStatus === 'success' && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" title="刷新成功" />
            )}
            {refreshStatus === 'failure' && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" title="刷新失败" />
            )}
            {!refreshStatus && subId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleContextMenu(subId);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-mac-blue transition-all p-0.5"
                title="更多操作"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        )}
      </div>

      {/* Context menu — absolute positioned, floats over content */}
      {showContextMenu && subId && (
        <div ref={contextMenuRef} className="absolute left-4 right-2 top-full mt-1 py-1 rounded-lg bg-white dark:bg-mac-card-dark border border-black/10 dark:border-white/10 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
              onEditFeed?.();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <SquarePen className="w-3.5 h-3.5" />
            编辑订阅
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
              onToggleTagEditor(subId);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            管理标签
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
              toggleAutoRefresh(subId);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {autoRefreshDisabled ? '开启刷新' : '取消刷新'}
          </button>
          <div className="h-px bg-black/5 dark:bg-white/5 mx-2 my-0.5" />
          {showDeleteFeedConfirm ? (
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-mac-red font-medium">确定删除？</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const { removeSubscription } = useSubscriptionStore.getState();
                  if (subId) removeSubscription(subId);
                }}
                className="text-xs font-medium px-2 py-0.5 rounded bg-mac-red text-white hover:bg-mac-red/80 transition-colors"
              >
                删除
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteFeedConfirm(false);
                }}
                className="text-xs font-medium px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteFeedConfirm(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-mac-red hover:bg-mac-red/5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除订阅
            </button>
          )}
        </div>
      )}

      {/* Tag editor panel — absolute positioned */}
      {showTagEditor && subId && (
        <div ref={contextMenuRef} className="absolute left-4 right-2 top-full mt-1 p-2 rounded-lg bg-white dark:bg-mac-card-dark border border-black/10 dark:border-white/10 shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-mac-text-secondary/70">管理标签</span>
            <button
              onClick={() => onToggleTagEditor(subId)}
              className="text-mac-text-secondary hover:text-mac-red transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Current tags */}
          {subTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {subTags.map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ backgroundColor: `${t.color || '#007AFF'}15`, color: t.color || '#007AFF' }}
                >
                  {t.name}
                  <button
                    onClick={() => onRemoveTag(subId!, t.id)}
                    className="hover:opacity-70 ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add existing tag */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {availableTags.map(t => (
                <button
                  key={t.id}
                  onClick={() => onAddTag(subId!, t.name)}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-black/15 dark:border-white/15 hover:border-mac-blue/50 hover:text-mac-blue transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Create new tag */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = newTagName.trim();
              if (name) {
                onAddTag(subId!, name);
                setNewTagName('');
              }
            }}
            className="flex gap-1"
          >
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="+ 新标签"
              className="flex-1 text-[11px] px-1.5 py-1 rounded border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:border-mac-blue/50"
              maxLength={20}
            />
          </form>
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-mac-blue/10 text-mac-blue'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm flex-1">{label}</span>
      {count > 0 && (
        <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}
