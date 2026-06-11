import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { search } from '@/services/searchService';
import { useArticleStore } from '@/stores/articleStore';
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
  const articles = useArticleStore((s) => s.articles);

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
      const searchResults = await search(query);
      const foundArticles = searchResults
        .map((r) => articles.find((a) => a.id === r.articleId))
        .filter(Boolean) as Article[];
      setResults(foundArticles);
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, [query, articles]);

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
    <div className="absolute inset-0 z-40 bg-white/80 dark:bg-mac-bg-dark/80 backdrop-blur-xl animate-fade-in">
      <div className="max-w-2xl mx-auto px-6 pt-8">
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
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mac-blue animate-spin" />
          )}
        </div>

        {/* Results */}
        {query && (
          <div className="mt-4 space-y-1 max-h-[60vh] overflow-y-auto">
            {results.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
                  未找到相关文章
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
                <p className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary line-clamp-2">
                  {article.summary?.replace(/<[^>]*>/g, '').slice(0, 120)}
                </p>
                <span className="text-[10px] text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mt-1 inline-block">
                  {formatRelativeTime(article.publishedAt)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Shortcuts hint */}
        {!query && (
          <div className="text-center py-12">
            <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
              输入关键词搜索文章
            </p>
            <p className="text-xs text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 mt-2">
              按 <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px]">ESC</kbd> 关闭搜索
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
