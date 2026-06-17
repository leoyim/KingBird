import { useCallback } from 'react';
import { requestNotificationPermission, showNotification, getNotificationPermissionStatus } from '@/services/notificationService';
import { useUIStore } from '@/stores/uiStore';
import type { Article } from '@/types';

export function useNotification() {
  const { preferences } = useUIStore();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!preferences.notificationsEnabled) return false;
    return requestNotificationPermission();
  }, [preferences.notificationsEnabled]);

  const notifyNewArticle = useCallback((article: Article, feedTitle: string) => {
    showNotification(article.title, {
      body: `${feedTitle}\n${article.summary?.slice(0, 100) || ''}`,
      data: { url: article.link },
      icon: '/kingbird-icon.png',
      badge: '/kingbird-icon.png',
      tag: `article-${article.id}`,
    });
  }, []);

  const notifyNewArticles = useCallback((articles: Article[], feedTitle: string) => {
    if (articles.length === 0) return;
    if (articles.length === 1) {
      notifyNewArticle(articles[0], feedTitle);
    } else {
      showNotification(`${articles.length} 篇新文章`, {
        body: `来自 ${feedTitle}`,
        tag: 'kingbird-batch-update',
      });
    }
  }, [notifyNewArticle]);

  return {
    status: getNotificationPermissionStatus(),
    requestPermission,
    notifyNewArticle,
    notifyNewArticles,
  };
}
