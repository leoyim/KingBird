import { Star, ExternalLink, Circle } from 'lucide-react';
import { formatRelativeTime } from '@/utils/dateFormatter';
import type { Article } from '@/types';
import { useArticleStore } from '@/stores/articleStore';

interface ArticleItemProps {
  article: Article;
  feedTitle: string;
  isRead: boolean;
  isStarred: boolean;
  isSelected: boolean;
  isEven: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function ArticleItem({
  article,
  feedTitle,
  isRead,
  isStarred,
  isSelected,
  isEven,
  onClick,
  style,
}: ArticleItemProps) {
  const toggleStar = useArticleStore((s) => s.toggleStar);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(article.id);
  };

  return (
    <div
      style={style}
      className={`px-4 py-2 cursor-pointer transition-all duration-150 border-b border-black/3 dark:border-white/3 group relative ${
        isSelected
          ? 'bg-mac-blue/8 dark:bg-mac-blue/12 border-l-2 border-l-mac-blue'
          : `${isEven ? 'bg-black/[0.02] dark:bg-white/[0.02]' : 'bg-transparent'} hover:bg-black/3 dark:hover:bg-white/3 border-l-2 border-l-transparent`
      }`}
      onClick={onClick}
    >
      {/* Star button — absolute positioned, visible on hover */}
      <button
        onClick={handleStarClick}
        className={`absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-opacity ${
          isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Star
          className={`w-3.5 h-3.5 ${
            isStarred ? 'text-mac-orange fill-mac-orange' : 'text-mac-text-secondary/40'
          }`}
        />
      </button>
      <div className="flex items-start gap-2">
        {/* Unread indicator dot */}
        <div className="pt-[7px] shrink-0">
          {isRead ? (
            <div className="w-2 h-2 rounded-full border border-mac-text-secondary/20" />
          ) : (
            <Circle className="w-2 h-2 fill-mac-blue text-mac-blue" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Feed + Time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-mac-blue font-medium truncate" title={feedTitle}>
              {feedTitle}
            </span>
            <span className="text-[10px] text-mac-text-secondary/60 dark:text-mac-text-dark-secondary/60 shrink-0">
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`text-sm leading-snug mb-1 line-clamp-1 ${
              isRead
                ? 'text-mac-text-secondary dark:text-mac-text-dark-secondary font-normal'
                : 'text-mac-text dark:text-mac-text-dark font-semibold'
            }`}
          >
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-xs text-mac-text-secondary/80 dark:text-mac-text-dark-secondary/80 line-clamp-2 leading-relaxed">
              {article.summary.replace(/<[^>]*>/g, '').slice(0, 120)}
            </p>
          )}
        </div>

        {/* Thumbnail */}
        {article.imageUrl && (
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-black/5 dark:bg-white/5">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

    </div>
  );
}
