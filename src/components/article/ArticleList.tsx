import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useArticleStore } from '@/stores/articleStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFilterStore } from '@/stores/filterStore';
import { useUIStore } from '@/stores/uiStore';
import { ArticleItem } from './ArticleItem';
import { ArticleSkeleton } from './ArticleSkeleton';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { Rss } from 'lucide-react';

interface ArticleListProps {
  onSelectArticle: (articleId: string) => void;
  selectedArticleId: string | null;
}

export function ArticleList({ onSelectArticle, selectedArticleId }: ArticleListProps) {
  const {
    articles,
    readStates,
    isLoading,
    sortOrder,
    loadArticles,
    loadReadStates,
    setSelectedArticleId,
  } = useArticleStore();

  const { selectedFeedId, selectedFolderId, feeds } = useSubscriptionStore();
  const { preferences, starredFilter } = useUIStore();
  const filterRules = useFilterStore((s) => s.rules);

  useEffect(() => {
    loadArticles(selectedFeedId || undefined);
    loadReadStates();
  }, [selectedFeedId, selectedFolderId, loadArticles, loadReadStates]);

  const filteredArticles = useMemo(() => {
    let sorted = [...articles];
    if (starredFilter) {
      sorted = sorted.filter(a => readStates.get(a.id)?.isStarred);
    }
    // Apply active keyword filter rules
    const activeRules = filterRules.filter(r => r.isActive);
    if (activeRules.length > 0) {
      sorted = sorted.filter(a => {
        return activeRules.some(rule => {
          const keyword = rule.keyword.toLowerCase();
          return (
            a.title.toLowerCase().includes(keyword) ||
            (a.summary || '').toLowerCase().includes(keyword) ||
            (a.content || '').toLowerCase().includes(keyword) ||
            (a.author || '').toLowerCase().includes(keyword)
          );
        });
      });
    }
    if (sortOrder === 'newest') {
      sorted.sort((a, b) => b.publishedAt - a.publishedAt);
    } else {
      sorted.sort((a, b) => a.publishedAt - b.publishedAt);
    }
    return sorted;
  }, [articles, sortOrder, starredFilter, readStates, filterRules]);

  const { parentRef, virtualizer, virtualItems, totalSize } = useVirtualScroll(
    filteredArticles,
    96
  );

  const handleArticleClick = useCallback((articleId: string) => {
    setSelectedArticleId(articleId);
    useArticleStore.getState().markAsRead(articleId);
    onSelectArticle(articleId);
  }, [onSelectArticle, setSelectedArticleId]);

  if (!isLoading && articles.length === 0) {
    return (
      <div className="w-[380px] min-w-[320px] border-r border-black/5 dark:border-white/5 flex flex-col items-center justify-center">
        <Rss className="w-12 h-12 text-mac-text-secondary/20 dark:text-mac-text-dark-secondary/20 mb-4" />
        <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
          {selectedFeedId ? '暂无文章' : '选择一个订阅源开始阅读'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[380px] lg:min-w-[320px] border-r border-black/5 dark:border-white/5 flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <span className="text-xs font-medium text-mac-text-secondary dark:text-mac-text-dark-secondary">
          {filteredArticles.length} 篇文章
        </span>
        <select
          value={sortOrder}
          onChange={(e) => useArticleStore.getState().setSortOrder(e.target.value as 'newest' | 'oldest')}
          className="text-xs bg-transparent border-none outline-none cursor-pointer text-mac-text-secondary dark:text-mac-text-dark-secondary"
        >
          <option value="newest">最新优先</option>
          <option value="oldest">最旧优先</option>
        </select>
      </div>

      {/* Virtual list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <ArticleSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div
            style={{
              height: totalSize,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const article = filteredArticles[virtualRow.index];
              if (!article) return null;

              const readState = readStates.get(article.id);
              const feed = feeds.find(f => f.id === article.feedId);

              return (
                <ArticleItem
                  key={article.id}
                  article={article}
                  feedTitle={feed?.title || ''}
                  isRead={readState?.isRead || false}
                  isStarred={readState?.isStarred || false}
                  isSelected={selectedArticleId === article.id}
                  isEven={virtualRow.index % 2 === 0}
                  onClick={() => handleArticleClick(article.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
