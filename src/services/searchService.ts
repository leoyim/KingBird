import FlexSearch from 'flexsearch';
import type { SearchResult } from '@/types';
import { db } from '@/db/schema';

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  feedId: string;
}

let searchIndex: FlexSearch.Document<SearchDocument, string[]> | null = null;

function getIndex(): FlexSearch.Document<SearchDocument, string[]> {
  if (!searchIndex) {
    searchIndex = new FlexSearch.Document<SearchDocument, string[]>({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['id', 'title', 'feedId'],
      },
      tokenize: 'forward',
      context: true,
      cache: true,
    });
  }
  return searchIndex;
}

export async function buildSearchIndex(): Promise<void> {
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
}

export async function search(query: string, limit = 50): Promise<SearchResult[]> {
  const index = getIndex();

  if (!query.trim()) {
    return [];
  }

  const results = await index.searchAsync(query, { limit });

  const searchResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    for (const fieldResult of result.result) {
      const id = typeof fieldResult === 'string' ? fieldResult : fieldResult;
      if (!seen.has(id)) {
        seen.add(id);
        searchResults.push({
          articleId: id,
          score: 1,
        });
      }
    }
  }

  return searchResults.slice(0, limit);
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
