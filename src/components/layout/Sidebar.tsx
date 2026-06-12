import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, FolderOpen, Inbox,
  Rss, Star, Tags, MoreHorizontal, X, Plus, Pencil, Trash2
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
  const readStates = useArticleStore((s) => s.readStates);
  const articles = useArticleStore((s) => s.articles);
  const { tags, subscriptionTags, getTagsForSubscription, getSubscriptionsForTag, addTagToSubscription, removeTagFromSubscription, addTag } = useTagStore();
  const starredFilter = useUIStore((s) => s.starredFilter);
  const setStarredFilter = useUIStore((s) => s.setStarredFilter);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagEditorSubId, setTagEditorSubId] = useState<string | null>(null);
  const [contextMenuSubId, setContextMenuSubId] = useState<string | null>(null);

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

      {/* Subscriptions */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 px-2 mb-1 mt-2">
          订阅源
          {selectedTagId && (
            <span className="normal-case ml-1 text-mac-blue font-normal">
              (已筛选)
            </span>
          )}
        </div>

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
                        subTags={subId ? getTagsForSubscription(subId) : []}
                        allTags={tags}
                        onClick={() => handleFeedClick(feed.id)}
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
              subTags={subId ? getTagsForSubscription(subId!) : []}
              allTags={tags}
              onClick={() => handleFeedClick(feed.id)}
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
      </div>
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
  onClick: () => void;
  showTagEditor?: boolean;
  showContextMenu?: boolean;
  subTags: import('@/types').Tag[];
  allTags: import('@/types').Tag[];
  onToggleTagEditor: (subId: string) => void;
  onToggleContextMenu: (subId: string) => void;
  onEditFeed?: () => void;
  onAddTag: (subId: string, tagName: string) => Promise<void>;
  onRemoveTag: (subId: string, tagId: string) => Promise<void>;
}) {
  const [newTagName, setNewTagName] = useState('');
  const availableTags = allTags.filter(t => !subTags.some(st => st.id === t.id));

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'bg-mac-blue/10 text-mac-blue border-l-2 border-mac-blue'
            : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-2 border-transparent'
        }`}
        onClick={onClick}
      >
        {feed.imageUrl ? (
          <img
            src={feed.imageUrl}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-4 h-4 rounded-sm shrink-0 bg-mac-blue/20 flex items-center justify-center">
            <Rss className="w-2.5 h-2.5 text-mac-blue" />
          </div>
        )}
        <span className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'font-medium' : ''}`}>
          {feed.title}
        </span>
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
        {/* Action menu trigger */}
        {subId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
            }}
            className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-mac-blue transition-all p-0.5"
            title="更多操作"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Context menu */}
      {showContextMenu && subId && (
        <div className="ml-6 mr-1 mb-1 py-1 rounded-lg bg-card-mac border border-black/10 dark:border-white/10 shadow-lg z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
              onEditFeed?.();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
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
            <Tags className="w-3.5 h-3.5" />
            管理标签
          </button>
          <div className="h-px bg-black/5 dark:bg-white/5 mx-2 my-0.5" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleContextMenu(subId);
              if (onEditFeed) onEditFeed();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-mac-red hover:bg-mac-red/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除订阅
          </button>
        </div>
      )}

      {/* Tag editor panel */}
      {showTagEditor && subId && (
        <div className="ml-6 mr-1 mb-1 p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
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
