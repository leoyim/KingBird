import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  ArrowLeft, ExternalLink, Star, StarOff,
  BookmarkPlus, BookmarkCheck, Type, Eye, EyeOff,
  ChevronLeft, ChevronRight, Maximize2, Minimize2
} from 'lucide-react';
import { useArticleStore } from '@/stores/articleStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useUIStore } from '@/stores/uiStore';
import { useTagStore } from '@/stores/tagStore';
import { formatRelativeTime, formatDate } from '@/utils/dateFormatter';
import { sanitizeHTML } from '@/utils/htmlSanitizer';
import { highlightAllCodeBlocks } from '@/services/highlightService';
import { convertToBionicReading, extractPlainText, cleanArticleContent } from '@/services/readabilityService';
import type { Article, ReadingMode } from '@/types';
import { LazyImage } from './LazyImage';

interface ReaderViewProps {
  articleId: string | null;
  onClose: () => void;
}

export function ReaderView({ articleId, onClose }: ReaderViewProps) {
  const articles = useArticleStore((s) => s.articles);
  const readStates = useArticleStore((s) => s.readStates);
  const toggleStar = useArticleStore((s) => s.toggleStar);
  const markAsRead = useArticleStore((s) => s.markAsRead);
  const markAsUnread = useArticleStore((s) => s.markAsUnread);
  const setSelectedArticleId = useArticleStore((s) => s.setSelectedArticleId);
  const feeds = useSubscriptionStore((s) => s.feeds);
  const preferences = useUIStore((s) => s.preferences);
  const setReaderFontSize = useUIStore((s) => s.setReaderFontSize);
  const setReadingMode = useUIStore((s) => s.setReadingMode);

  const [localReadingMode, setLocalReadingMode] = useState<ReadingMode>(preferences.defaultReadingMode);
  const contentRef = useRef<HTMLDivElement>(null);

  const article = articles.find((a) => a.id === articleId);
  const readState = articleId ? readStates.get(articleId) : undefined;
  const feed = article ? feeds.find((f) => f.id === article.feedId) : undefined;

  // Navigate to next/prev article
  const articleIndex = articles.findIndex((a) => a.id === articleId);
  const nextArticle = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null;
  const prevArticle = articleIndex > 0 ? articles[articleIndex - 1] : null;

  useEffect(() => {
    if (articleId) {
      markAsRead(articleId);
    }
  }, [articleId, markAsRead]);

  // Highlight code blocks after content renders
  useEffect(() => {
    if (article?.content && localReadingMode !== 'bionic') {
      highlightAllCodeBlocks();
    }
  }, [article?.content, localReadingMode]);

  const renderedContent = useMemo(() => {
    if (!article?.content && !article?.summary) return '';

    const raw = article.content || article.summary || '';
    const cleaned = cleanArticleContent(raw);

    switch (localReadingMode) {
      case 'plain':
        return `<div style="white-space: pre-wrap;">${extractPlainText(cleaned)}</div>`;
      case 'bionic':
        return convertToBionicReading(cleaned);
      case 'original':
      default:
        return sanitizeHTML(cleaned);
    }
  }, [article?.content, article?.summary, localReadingMode]);

  const handleStarToggle = useCallback(() => {
    if (articleId) toggleStar(articleId);
  }, [articleId, toggleStar]);

  const handleReadToggle = useCallback(() => {
    if (!articleId) return;
    if (readState?.isRead) {
      markAsUnread(articleId);
    } else {
      markAsRead(articleId);
    }
  }, [articleId, readState?.isRead, markAsRead, markAsUnread]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prevArticle : nextArticle;
    if (target) {
      setSelectedArticleId(target.id);
      markAsRead(target.id);
    }
  }, [prevArticle, nextArticle, setSelectedArticleId, markAsRead]);

  if (!article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-mac-blue/5 dark:bg-mac-blue/10 flex items-center justify-center mx-auto mb-4">
            <Type className="w-8 h-8 text-mac-blue/30" />
          </div>
          <p className="text-sm text-mac-text-secondary dark:text-mac-text-dark-secondary">
            选择一篇文章开始阅读
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Reader Toolbar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="btn-mac-ghost h-7 w-7 p-0 rounded-lg" title="关闭">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />
          <button
            onClick={() => handleNavigate('prev')}
            disabled={!prevArticle}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg disabled:opacity-30"
            title="上一篇 (K)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavigate('next')}
            disabled={!nextArticle}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg disabled:opacity-30"
            title="下一篇 (J)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Reading mode toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 mr-2">
            {(['original', 'plain', 'bionic'] as ReadingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setLocalReadingMode(mode)}
                className={`px-2 py-1 rounded-md text-[11px] transition-all ${
                  localReadingMode === mode
                    ? 'bg-white dark:bg-white/10 shadow-sm font-medium'
                    : 'text-mac-text-secondary dark:text-mac-text-dark-secondary hover:text-mac-text dark:hover:text-mac-text-dark'
                }`}
              >
                {mode === 'original' ? '原文' : mode === 'plain' ? '纯文本' : '仿生'}
              </button>
            ))}
          </div>

          {/* Font size */}
          <button
            onClick={() => setReaderFontSize(Math.max(12, preferences.readerFontSize - 1))}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg text-xs font-bold"
            title="缩小字体"
          >
            A-
          </button>
          <button
            onClick={() => setReaderFontSize(Math.min(24, preferences.readerFontSize + 1))}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg text-xs font-bold"
            title="放大字体"
          >
            A+
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

          {/* Star */}
          <button
            onClick={handleStarToggle}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg"
            title="收藏 (S)"
          >
            {readState?.isStarred ? (
              <Star className="w-4 h-4 text-mac-orange fill-mac-orange" />
            ) : (
              <Star className="w-4 h-4" />
            )}
          </button>

          {/* Read/Unread */}
          <button
            onClick={handleReadToggle}
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg"
            title="标记已读/未读 (M)"
          >
            {readState?.isRead ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          {/* Open original */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-mac-ghost h-7 w-7 p-0 rounded-lg"
            title="打开原文 (V)"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Article Content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <article className="max-w-3xl mx-auto px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              {feed && (
                <span className="text-xs font-medium text-mac-blue bg-mac-blue/8 dark:bg-mac-blue/12 px-2 py-0.5 rounded-md">
                  {feed.title}
                </span>
              )}
              <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary">
                {formatRelativeTime(article.publishedAt)}
              </span>
              {article.author && (
                <>
                  <span className="text-xs text-mac-text-secondary/40">·</span>
                  <span className="text-xs text-mac-text-secondary dark:text-mac-text-dark-secondary">
                    {article.author}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight text-mac-text dark:text-mac-text-dark">
              {article.title}
            </h1>
          </header>

          {/* Body */}
          <div
            className={`article-content ${localReadingMode === 'bionic' ? 'bionic-reading' : ''}`}
            style={{ fontSize: `${preferences.readerFontSize}px` }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </article>
      </div>
    </div>
  );
}
