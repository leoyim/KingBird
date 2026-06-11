import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, FolderOpen, Inbox,
  Rss, Star, MoreHorizontal
} from 'lucide-react';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useArticleStore } from '@/stores/articleStore';
import { useUIStore } from '@/stores/uiStore';
import type { Feed, Folder } from '@/types';

interface SidebarProps {
  onSelectFeed: (feedId: string) => void;
  onSelectFolder: (folderId: string) => void;
}

export function Sidebar({ onSelectFeed, onSelectFolder }: SidebarProps) {
  const { subscriptions, feeds, folders, selectedFeedId, selectedFolderId, setSelectedFeedId, setSelectedFolderId } = useSubscriptionStore();
  const readStates = useArticleStore((s) => s.readStates);
  const articles = useArticleStore((s) => s.articles);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const getFeedById = (feedId: string): Feed | undefined => {
    return feeds.find(f => f.id === feedId);
  };

  const getFolderById = (folderId: string): Folder | undefined => {
    return folders.find(f => f.id === folderId);
  };

  const handleFeedClick = (feedId: string) => {
    setSelectedFeedId(feedId);
    onSelectFeed(feedId);
  };

  const handleFolderClick = (folderId: string) => {
    setSelectedFolderId(folderId);
    onSelectFolder(folderId);
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
          isActive={false}
          onClick={() => {
            setSelectedFeedId(null);
            setSelectedFolderId(null);
          }}
        />
        <SidebarItem
          icon={<Star className="w-4 h-4 text-mac-orange" />}
          label="收藏"
          count={starredCount}
          isActive={false}
          onClick={() => {}}
        />
      </div>

      <div className="h-px bg-black/5 dark:bg-white/5 mx-3 my-1" />

      {/* Subscriptions */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 px-2 mb-1 mt-2">
          订阅源
        </div>

        {/* Folders */}
        {folders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.id);
          const feedIds = folderSubscriptions.map.get(folder.id) || [];
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
                    return (
                      <FeedSidebarItem
                        key={feed.id}
                        feed={feed}
                        unreadCount={getUnreadCount(feed.id)}
                        isSelected={selectedFeedId === feed.id}
                        onClick={() => handleFeedClick(feed.id)}
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
          return (
            <FeedSidebarItem
              key={feed.id}
              feed={feed}
              unreadCount={getUnreadCount(feed.id)}
              isSelected={selectedFeedId === feed.id}
              onClick={() => handleFeedClick(feed.id)}
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
  unreadCount,
  isSelected,
  onClick,
}: {
  feed: Feed;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
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
      {unreadCount > 0 && (
        <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary tabular-nums">
          {unreadCount}
        </span>
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
