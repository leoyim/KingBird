import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { search, getArticlesByIds } from '@/services/searchService';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import type { Article } from '@/types';
import { formatRelativeTime } from '@/utils/dateFormatter';

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectArticle: (articleId: string) => void;
}

export function SearchPanel({ open, onClose, onSelectArticle }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const feeds = useSubscriptionStore((s) => s.feeds);

  const getFeedTitle = (feedId: string) => feeds.find((f) => f.id === feedId)?.title || '';

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search returns IDs from the full index (all articles in DB)
      const searchResults = await search(query);
      // Fetch full Article records directly from DB (not the in-memory store
      // which may only contain articles for the currently selected feed)
      const foundArticles = await getArticlesByIds(searchResults.map(r => r.articleId));
      // Sort by publishedAt desc
      foundArticles.sort((a, b) => b.publishedAt - a.publishedAt);
      setResults(foundArticles);
    } catch (err) {
      console.error('[Kingbird] Search panel error:', err);
      setResults([]);
    }
    setIsSearching(false);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleSelect = (articleId: string) => {
    onSelectArticle(articleId);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 bg-white/80 dark:bg-mac-bg-dark/80 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-3xl mx-auto px-6 pt-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mac-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文章标题和内容..."
            className="w-full h-12 pl-11 pr-10 rounded-xl bg-white dark:bg-mac-card-dark shadow-lg border border-black/5 dark:border-white/5 text-base focus:outline-none focus:ring-2 focus:ring-mac-blue/30 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-mac-blue animate-spin" />
          )}
        </div>

        {/* Results */}
        {query && (
          <div className="mt-4 space-y-1 max-h-[55vh] overflow-y-auto rounded-xl">
            {results.length === 0 && !isSearching && (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                  <Search className="w-5 h-5 text-mac-text-secondary/40" />
                </div>
                <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
                  未找到相关文章
                </p>
                <p className="text-xs text-mac-text-secondary/50 dark:text-mac-text-dark-secondary/50 mt-1">
                  尝试其他关键词
                </p>
              </div>
            )}
            {results.map((article) => (
              <button
                key={article.id}
                onClick={() => handleSelect(article.id)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-black/3 dark:hover:bg-white/3 transition-colors"
              >
                <h4 className="text-sm font-medium text-mac-text dark:text-mac-text-dark mb-1">
                  {article.title}
                </h4>
                <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary line-clamp-2 mb-1.5">
                  {article.summary?.replace(/<[^>]*>/g, '').slice(0, 120)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60">
                  <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 font-medium" title={getFeedTitle(article.feedId)}>{getFeedTitle(article.feedId)}</span>
                  <span>{formatRelativeTime(article.publishedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Shortcuts hint */}
        {!query && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Search className="w-7 h-7 text-mac-text-secondary/30" />
            </div>
            <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary font-medium">
              输入关键词搜索文章
            </p>
            <p className="text-xs text-mac-text-secondary/50 dark:text-mac-text-dark-secondary/50 mt-2">
              支持搜索文章标题和全文内容
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <kbd className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-[10px] text-mac-text-secondary/60 font-mono">ESC</kbd>
              <span className="text-[10px] text-mac-text-secondary/50">关闭搜索</span>
              <kbd className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-[10px] text-mac-text-secondary/60 font-mono">↵</kbd>
              <span className="text-[10px] text-mac-text-secondary/50">跳转首条</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
