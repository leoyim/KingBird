import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  ArrowLeft, ExternalLink, Star, Type, Eye, EyeOff,
  ChevronLeft, ChevronRight, ArrowUp,
  ImageIcon, Clock, QrCode, X
} from 'lucide-react';
import QRCode from 'qrcode';
import { useArticleStore } from '@/stores/articleStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useUIStore } from '@/stores/uiStore';
import { formatRelativeTime } from '@/utils/dateFormatter';
import { sanitizeHTML } from '@/utils/htmlSanitizer';
import { highlightAllCodeBlocks } from '@/services/highlightService';
import { convertToBionicReading, extractPlainText, cleanArticleContent } from '@/services/readabilityService';
import type { ReadingMode } from '@/types';

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

  const [localReadingMode, setLocalReadingMode] = useState<ReadingMode>(preferences.defaultReadingMode);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const article = articles.find((a) => a.id === articleId);
  const readState = articleId ? readStates.get(articleId) : undefined;
  const feed = article ? feeds.find((f) => f.id === article.feedId) : undefined;

  // Navigate to next/prev article
  const articleIndex = articles.findIndex((a) => a.id === articleId);
  const nextArticle = articleIndex < articles.length - 1 ? articles[articleIndex + 1] : null;
  const prevArticle = articleIndex > 0 ? articles[articleIndex - 1] : null;

  // Reset progress when article changes
  useEffect(() => {
    setProgress(0);
    setCompleted(false);
    setShowQR(false);
    setQrDataUrl(null);
    setShowStickyHeader(false);
    setShowBackToTop(false);
  }, [articleId]);

  // IntersectionObserver: toggle sticky header when original header scrolls away
  useEffect(() => {
    const header = headerRef.current;
    const scrollContainer = contentRef.current;
    if (!header || !scrollContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting);
      },
      { root: scrollContainer, threshold: 0 }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, [articleId]);

  // Generate QR code when requested
  const handleShowQR = useCallback(async () => {
    if (qrDataUrl) {
      setShowQR(!showQR);
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(article?.link || window.location.href, {
        width: 180,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch {
      // QR generation failed silently
    }
  }, [article?.link, qrDataUrl, showQR]);

  // Reading statistics
  const readingStats = useMemo(() => {
    if (!article?.content && !article?.summary) return null;
    const raw = article.content || article.summary || '';
    const plainText = extractPlainText(raw);
    const charCount = plainText.replace(/\s/g, '').length;
    const imageCount = (raw.match(/<img\s/gi) || []).length;
    const minutes = Math.max(1, Math.ceil(charCount / 400));
    return { charCount, imageCount, minutes };
  }, [article?.content, article?.summary]);

  // Scroll progress tracking
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !articleId) return;

    // For short content that doesn't scroll, mark as read immediately
    if (el.scrollHeight <= el.clientHeight + 10) {
      setProgress(100);
      setCompleted(true);
      markAsRead(articleId);
      return;
    }

    const handleScroll = () => {
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.round((el.scrollTop / scrollHeight) * 100);
      const pctClamped = Math.min(100, Math.max(0, pct));
      setProgress(pctClamped);
      setShowBackToTop(el.scrollTop > 400);
      if (pctClamped >= 100 && !completed) {
        setCompleted(true);
        markAsRead(articleId);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [articleId, completed, markAsRead]);

  // Scroll to top when article changes
  useEffect(() => {
    if (articleId && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [articleId]);

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
        return sanitizeHTML(convertToBionicReading(cleaned));
      case 'original':
      default:
        return sanitizeHTML(cleaned);
    }
  }, [article?.id, article?.content, article?.summary, localReadingMode]);

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

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    <div className="flex-1 flex flex-col overflow-hidden relative">
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

          {/* QR Code */}
          <button
            onClick={handleShowQR}
            className={`btn-mac-ghost h-7 w-7 p-0 rounded-lg ${showQR ? 'bg-mac-blue/10 text-mac-blue' : ''}`}
            title="显示二维码"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QR Code Popover */}
      {showQR && qrDataUrl && (
        <div className="absolute right-4 top-11 z-50 card-mac p-3 animate-scale-in shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-mac-text-secondary">扫描二维码打开原文</span>
            <button
              onClick={() => setShowQR(false)}
              className="hover:bg-black/5 dark:hover:bg-white/5 rounded-full p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="w-[140px] h-[140px] rounded-md"
          />
          <p className="text-[10px] text-mac-text-secondary/60 mt-1.5 max-w-[140px] truncate" title={article.link}>
            {article.link}
          </p>
        </div>
      )}

      {/* Article Content */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {/* Sticky header — slides in when original header scrolls out of view */}
        <div
          className={`sticky top-0 z-10 bg-white dark:bg-[#1e1e1e] transition-all duration-300 ease-out ${
            showStickyHeader
              ? 'max-h-40 shadow-sm border-b border-black/5 dark:border-white/5 opacity-100'
              : 'max-h-0 shadow-none border-transparent opacity-0 overflow-hidden'
          }`}
        >
          {/* Reading stats (compact) */}
          {readingStats && (
            <div className="flex justify-center pt-0.5 pb-1">
              <div className="flex items-center gap-2 text-[11px] text-mac-text-secondary/50">
                <span className="inline-flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  {readingStats.charCount.toLocaleString()} 字
                </span>
                <span className="text-mac-text-secondary/15">|</span>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {readingStats.imageCount} 图
                </span>
                <span className="text-mac-text-secondary/15">|</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readingStats.minutes} min
                </span>
                <span className="text-mac-text-secondary/15">|</span>
                <ReadingProgressRing progress={progress} completed={completed} compact />
              </div>
            </div>
          )}

          {/* Article meta and title (compact) */}
          <div className="max-w-3xl mx-auto px-8 pb-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              {feed && (
                <span className="text-[11px] font-medium text-mac-blue bg-mac-blue/8 dark:bg-mac-blue/12 px-1.5 py-0.5 rounded-md">
                  {feed.title}
                </span>
              )}
              <span className="text-[11px] text-mac-text-secondary dark:text-mac-text-dark-secondary">
                {formatRelativeTime(article.publishedAt)}
              </span>
              {article.author && (
                <>
                  <span className="text-[11px] text-mac-text-secondary/40">·</span>
                  <span className="text-[11px] text-mac-text-secondary dark:text-mac-text-dark-secondary">
                    {article.author}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-base font-semibold leading-snug text-mac-text dark:text-mac-text-dark line-clamp-1">
              {article.title}
            </h1>
          </div>
        </div>

        {/* Article with original header inside */}
        <article className="max-w-3xl mx-auto px-8 pt-3 pb-8">
          {/* Original header — tracked by IntersectionObserver */}
          <div ref={headerRef}>
            {/* Reading stats */}
            {readingStats && (
              <div className="flex items-center justify-center mb-5">
                <div className="flex items-center gap-3 text-xs text-mac-text-secondary/50">
                  <span className="inline-flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    {readingStats.charCount.toLocaleString()} 字
                  </span>
                  <span className="text-mac-text-secondary/15">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {readingStats.imageCount} 图
                  </span>
                  <span className="text-mac-text-secondary/15">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readingStats.minutes} min
                  </span>
                  <span className="text-mac-text-secondary/15">|</span>
                  <ReadingProgressRing progress={progress} completed={completed} compact />
                </div>
              </div>
            )}

            {/* Article meta and title */}
            <div className="mb-8">
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
            </div>
          </div>

          {/* Article body */}
          <div
            className={`article-content ${localReadingMode === 'bionic' ? 'bionic-reading' : ''}`}
            style={{ fontSize: `${preferences.readerFontSize}px` }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </article>
      </div>

      {/* Back to top floating button */}
      <button
        onClick={scrollToTop}
        className={`absolute bottom-5 right-5 z-50 w-9 h-9 rounded-full bg-white dark:bg-[#2a2a2a] shadow-md ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-center transition-all duration-300 ease-out hover:shadow-lg hover:scale-105 active:scale-95 ${
          showBackToTop
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
        title="返回顶部"
      >
        <ArrowUp className="w-4 h-4 text-mac-text-secondary dark:text-mac-text-dark-secondary" />
      </button>
    </div>
  );
}

// --- Reading progress ring ---

function ReadingProgressRing({ progress, completed, compact }: { progress: number; completed: boolean; compact?: boolean }) {
  const r = compact ? 5 : 7;
  const size = compact ? 14 : 18;
  const strokeW = compact ? 1.5 : 1.5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <span className={`inline-flex items-center gap-1 ${compact ? '' : 'px-2'}`} title={`阅读进度 ${Math.round(progress)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          className="text-black/10 dark:text-white/10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={`transition-all duration-200 ${completed ? 'text-mac-green' : 'text-mac-blue'}`}
        />
      </svg>
      <span className={`font-medium tabular-nums ${compact ? 'text-[11px]' : 'text-xs'} ${completed ? 'text-mac-green' : 'text-mac-blue'}`}>
        {Math.round(progress)}%
      </span>
    </span>
  );
}
