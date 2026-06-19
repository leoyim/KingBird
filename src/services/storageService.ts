import type { Article, ArticleReadState, Feed, Subscription, Tag, Folder } from '@/types';
import { db } from '@/db/schema';

// Feed operations
export async function getAllFeeds(): Promise<Feed[]> {
  return db.feeds.toArray();
}

export async function getFeed(id: string): Promise<Feed | undefined> {
  return db.feeds.get(id);
}

export async function saveFeed(feed: Feed): Promise<void> {
  await db.feeds.put(feed);
}

export async function deleteFeed(id: string): Promise<void> {
  await db.feeds.delete(id);
}

// Article operations
export async function getArticlesByFeed(feedId: string): Promise<Article[]> {
  return db.articles
    .where('feedId')
    .equals(feedId)
    .reverse()
    .sortBy('publishedAt');
}

export async function getAllArticles(): Promise<Article[]> {
  return db.articles
    .orderBy('publishedAt')
    .reverse()
    .toArray();
}

export async function getArticle(id: string): Promise<Article | undefined> {
  return db.articles.get(id);
}

export async function saveArticle(article: Article): Promise<void> {
  await db.articles.put(article);
}

export async function saveArticles(articles: Article[]): Promise<void> {
  await db.articles.bulkPut(articles);
}

export async function deleteArticlesByFeed(feedId: string): Promise<void> {
  await db.articles.where('feedId').equals(feedId).delete();
}

export async function getTotalArticleCount(): Promise<number> {
  return db.articles.count();
}

export async function pruneOldArticles(maxCount: number): Promise<void> {
  const count = await db.articles.count();
  if (count > maxCount) {
    const toDelete = await db.articles
      .orderBy('publishedAt')
      .limit(count - maxCount)
      .toArray();
    const ids = toDelete.map(a => a.id);
    await db.articles.bulkDelete(ids);
    await db.readStates.bulkDelete(ids);
  }
}

// Read state operations
export async function getReadState(articleId: string): Promise<ArticleReadState | undefined> {
  return db.readStates.get(articleId);
}

export async function saveReadState(state: ArticleReadState): Promise<void> {
  await db.readStates.put(state);
}

export async function getUnreadCount(feedId?: string): Promise<number> {
  let articles: Article[];
  if (feedId) {
    articles = await db.articles.where('feedId').equals(feedId).toArray();
  } else {
    articles = await db.articles.toArray();
  }

  const readStates = await db.readStates.toArray();
  const readMap = new Map(readStates.map(r => [r.articleId, r.isRead]));

  return articles.filter(a => !readMap.get(a.id)).length;
}

// Subscription operations
export async function getAllSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.orderBy('sortOrder').toArray();
}

export async function getSubscription(id: string): Promise<Subscription | undefined> {
  return db.subscriptions.get(id);
}

export async function saveSubscription(sub: Subscription): Promise<void> {
  await db.subscriptions.put(sub);
}

// Tag operations
export async function getAllTags(): Promise<Tag[]> {
  const tags = await db.tags.toArray();
  tags.sort((a, b) => a.createdAt - b.createdAt);
  return tags;
}

export async function saveTag(tag: Tag): Promise<void> {
  await db.tags.put(tag);
}

// Folder operations
export async function getAllFolders(): Promise<Folder[]> {
  return db.folders.orderBy('sortOrder').toArray();
}

export async function saveFolder(folder: Folder): Promise<void> {
  await db.folders.put(folder);
}

// Bulk export
export async function exportAllData(): Promise<{
  feeds: Feed[];
  subscriptions: Subscription[];
  articles: Article[];
  readStates: ArticleReadState[];
  tags: Tag[];
  folders: Folder[];
}> {
  const [feeds, subscriptions, articles, readStates, tags, folders] = await Promise.all([
    db.feeds.toArray(),
    db.subscriptions.toArray(),
    db.articles.toArray(),
    db.readStates.toArray(),
    db.tags.toArray(),
    db.folders.toArray(),
  ]);
  return { feeds, subscriptions, articles, readStates, tags, folders };
}

// Bulk import
export async function importAllData(data: {
  feeds: Feed[];
  subscriptions?: Subscription[];
  articles?: Article[];
  readStates?: ArticleReadState[];
  tags?: Tag[];
  folders?: Folder[];
}): Promise<void> {
  await db.transaction('rw', [db.feeds, db.subscriptions, db.articles, db.readStates, db.tags, db.folders], async () => {
    if (data.feeds) await db.feeds.bulkPut(data.feeds);
    if (data.subscriptions) await db.subscriptions.bulkPut(data.subscriptions);
    if (data.articles) await db.articles.bulkPut(data.articles);
    if (data.readStates) await db.readStates.bulkPut(data.readStates);
    if (data.tags) await db.tags.bulkPut(data.tags);
    if (data.folders) await db.folders.bulkPut(data.folders);
  });
}
