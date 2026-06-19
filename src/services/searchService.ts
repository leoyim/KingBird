import FlexSearch from 'flexsearch';
import type { SearchResult, Article } from '@/types';
import { db } from '@/db/schema';

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  feedId: string;
  [x: string]: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let searchIndex: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getIndex(): any {
  if (!searchIndex) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchIndex = new (FlexSearch.Document as any)({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['id', 'title', 'feedId'],
      },
      tokenize: 'forward',
      encoder: 'CJK',
      context: true,
      cache: true,
    });
  }
  return searchIndex;
}

export async function buildSearchIndex(): Promise<void> {
  // Reset index to avoid stale/duplicate entries
  searchIndex = null;
  const index = getIndex();
  const articles = await db.articles.toArray();

  for (const article of articles) {
    const textContent = stripHtml(article.content || article.summary || '');
    index.add({
      id: article.id,
      title: article.title,
      content: textContent,
      feedId: article.feedId,
    });
  }

  console.log(`[Kingbird] Search index rebuilt: ${articles.length} articles`);
}

export async function search(query: string, limit = 50): Promise<SearchResult[]> {
  const index = getIndex();

  if (!query.trim()) {
    return [];
  }

  const q = query.trim();

  // FlexSearch.Document.searchAsync returns [{ field, result: [...] }, ...]
  // result items are ID strings (without enrich)
  const raw = await index.searchAsync(q, { limit });

  const ids = new Set<string>();
  for (const fieldResult of raw) {
    if (!fieldResult.result || !Array.isArray(fieldResult.result)) continue;
    for (const item of fieldResult.result) {
      const id = typeof item === 'string' || typeof item === 'number'
        ? String(item)
        : String(item?.id ?? '');
      if (id) ids.add(id);
    }
  }

  return Array.from(ids).slice(0, limit).map(id => ({ articleId: id, score: 1 }));
}

/**
 * Fetch full Article records for a list of article IDs from DB.
 */
export async function getArticlesByIds(ids: string[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const results: Article[] = [];
  // Dexie bulkGet for performance
  const found = await db.articles.bulkGet(ids);
  for (const a of found) {
    if (a) results.push(a);
  }
  return results;
}

export async function addToIndex(article: { id: string; title: string; content?: string }): Promise<void> {
  const index = getIndex();
  const textContent = stripHtml(article.content || '');
  index.add({
    id: article.id,
    title: article.title,
    content: textContent,
    feedId: '',
  });
}

export async function removeFromIndex(id: string): Promise<void> {
  const index = getIndex();
  index.remove(id);
}

export async function clearIndex(): Promise<void> {
  searchIndex = null;
}

function stripHtml(html: string): string {
  if (!html) return '';
  // Simple HTML tag stripping
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
