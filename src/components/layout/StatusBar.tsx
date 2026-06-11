import { Wifi, WifiOff, Clock } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatRelativeTime } from '@/utils/dateFormatter';
import { useArticleStore } from '@/stores/articleStore';

export function StatusBar() {
  const isOnline = useOnlineStatus();
  const lastUpdatedAt = useUIStore((s) => s.lastUpdatedAt);
  const articles = useArticleStore((s) => s.articles);
  const readStates = useArticleStore((s) => s.readStates);
  const subscriptions = useArticleStore((s) => s.articles.length);

  const unreadCount = articles.filter(a => !readStates.get(a.id)?.isRead).length;
  const totalCount = articles.length;

  return (
    <footer className="h-7 flex items-center px-3 text-[11px] text-mac-text-secondary dark:text-mac-text-dark-secondary border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/[0.02] select-none">
      <div className="flex items-center gap-3 flex-1">
        <span>{unreadCount} 未读</span>
        <span className="text-black/10 dark:text-white/10">·</span>
        <span>{totalCount} 篇文章</span>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdatedAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>更新于 {formatRelativeTime(lastUpdatedAt)}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-mac-green" />
              <span>在线</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-mac-orange" />
              <span className="text-mac-orange">离线</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
