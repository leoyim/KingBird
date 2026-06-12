// Web Worker for building FlexSearch index
import FlexSearch from 'flexsearch';
import { db } from '../db/schema';

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  feedId: string;
  [x: string]: string;
}

interface IndexMessage {
  type: 'buildIndex' | 'search';
  query?: string;
}

self.onmessage = async (e: MessageEvent<IndexMessage>) => {
  const { type, query } = e.data;

  if (type === 'buildIndex') {
    const articles = await db.articles.toArray();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = new (FlexSearch.Document as any)({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['id', 'title', 'feedId'],
      },
      tokenize: 'forward',
      context: true,
    });

    for (const article of articles) {
      const textContent = stripHtml(article.content || article.summary || '');
      index.add({
        id: article.id,
        title: article.title,
        content: textContent,
        feedId: article.feedId,
      });
    }

    self.postMessage({
      type: 'indexBuilt',
      articleCount: articles.length,
    });
  } else if (type === 'search' && query) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = new (FlexSearch.Document as any)({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: ['id', 'title', 'feedId'],
      },
      tokenize: 'forward',
      context: true,
    });

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

    const results = await index.searchAsync(query, { limit: 50 });
    const articleIds: string[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      for (const fieldResult of result.result) {
        const id = String(fieldResult);
        if (!seen.has(id)) {
          seen.add(id);
          articleIds.push(id);
        }
      }
    }

    self.postMessage({
      type: 'searchResults',
      articleIds: articleIds.slice(0, 50),
      query,
    });
  }
};

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export {};
