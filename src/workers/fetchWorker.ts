// Web Worker for background RSS fetching
// Uses DOMParser-based RSS parsing (no Node.js dependencies)

interface FetchMessage {
  type: 'fetchAll' | 'fetchFeed';
  feedId?: string;
}

interface FetchResult {
  type: 'fetchComplete';
  feedId: string;
  newArticlesCount: number;
  error?: string;
}

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

const FETCH_TIMEOUT_MS = 15000;

function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '');
}

function extractImage(content: string): string | undefined {
  const match = content.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : undefined;
}

function stripHTML(html: string): string {
  if (!html) return '';
  // Worker doesn't have document, use regex fallback
  return html.replace(/<[^>]+>/g, '').trim();
}

function safeText(el: Element | null, ...tagNames: string[]): string {
  if (!el) return '';
  for (const tag of tagNames) {
    const nsMatch = el.querySelector(tag.replace(':', '\\:'));
    if (nsMatch?.textContent) return nsMatch.textContent.trim();
    try {
      const byTag = el.getElementsByTagName(tag)[0] as Element | undefined;
      if (byTag?.textContent) return byTag.textContent.trim();
    } catch { /* ignore */ }
    const plain = el.querySelector(tag.split(':')[1] || tag);
    if (plain?.textContent && tag.includes(':')) return plain.textContent.trim();
  }
  return '';
}

function parseDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

async function fetchWithProxy(url: string): Promise<string> {
  // Try direct first
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { mode: 'cors', signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) return await res.text();
  } catch { /* fallthrough */ }

  // Try proxies
  let lastError: Error | null = null;
  for (const proxyBase of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxyBase}${encodeURIComponent(url)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.text();
      lastError = new Error(`Proxy returned ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('All fetch methods failed');
}

interface ParsedItem {
  title: string;
  link: string;
  content: string;
  author: string;
  pubDate: string;
}

function parseFeedXML(xmlString: string): ParsedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check parse errors
  const parseErr = doc.querySelector('parsererror');
  if (parseErr || doc.documentElement.nodeName === 'parsererror') {
    throw new Error('Invalid XML feed');
  }

  // Detect format
  const isAtom = doc.documentElement.nodeName.toLowerCase() === 'feed'
    || doc.querySelector('feed') !== null;

  if (isAtom) return parseAtomItems(doc);
  return parseRSSItems(doc);
}

function parseRSSItems(doc: Document): ParsedItem[] {
  const channel = doc.querySelector('channel');
  if (!channel) return [];

  const items: ParsedItem[] = [];
  channel.querySelectorAll('item').forEach((item) => {
    const content =
      safeText(item, 'content\\:encoded', 'content:encoded')
      || item.querySelector('description')?.textContent
      || '';

    items.push({
      title: safeText(item, 'title') || '(No title)',
      link: safeText(item, 'link') || '',
      content,
      author: safeText(item, 'author', 'dc\\:creator', 'dc:creator'),
      pubDate: safeText(item, 'pubDate'),
    });
  });

  return items;
}

function parseAtomItems(doc: Document): ParsedItem[] {
  const feed = doc.querySelector('feed');
  if (!feed) return [];

  const items: ParsedItem[] = [];
  feed.querySelectorAll('entry').forEach((entry) => {
    const content =
      entry.querySelector('content')?.textContent
      || entry.querySelector('summary')?.textContent
      || '';

    let link = '';
    entry.querySelectorAll('link').forEach((l) => {
      if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
        link = l.getAttribute('href') || link;
      }
    });
    if (!link) {
      link = entry.querySelector('link[href]')?.getAttribute('href') || '';
    }

    items.push({
      title: safeText(entry, 'title') || '(No title)',
      link,
      content,
      author: safeText(entry, 'author > name', 'author'),
      pubDate: safeText(entry, 'published', 'updated'),
    });
  });

  return items;
}

async function fetchAndParseFeed(feedId: string, feedUrl: string): Promise<number> {
  const xml = await fetchWithProxy(feedUrl);
  const items = parseFeedXML(xml);
  const articles: any[] = [];

  for (const item of items.slice(0, 50)) {
    const link = item.link || feedUrl;
    // Deterministic ID from link → dedup on bulkPut (same link = same id)
    let hash = 0;
    for (let i = 0; i < link.length; i++) {
      hash = ((hash << 5) - hash + link.charCodeAt(i)) | 0;
    }
    const id = 'a_' + Math.abs(hash).toString(36) + '_' + btoa(encodeURIComponent(link.slice(0, 80))).replace(/[+/=]/g, '').slice(-12);

    const rawContent = item.content || '';
    articles.push({
      id,
      feedId,
      title: item.title || '无标题',
      summary: sanitizeHTML(stripHTML(rawContent).slice(0, 300)),
      content: sanitizeHTML(rawContent),
      originalContent: sanitizeHTML(rawContent),
      link,
      author: item.author || '',
      publishedAt: parseDate(item.pubDate),
      fetchedAt: Date.now(),
      imageUrl: extractImage(rawContent),
    });
  }

  const { db } = await import('../db/schema');
  if (articles.length > 0) {
    await db.articles.bulkPut(articles);
    await db.feeds.update(feedId, { lastFetchedAt: Date.now() });
  }

  return articles.length;
}

self.onmessage = async (e: MessageEvent<FetchMessage>) => {
  const { type, feedId } = e.data;
  const { db } = await import('../db/schema');

  if (type === 'fetchAll') {
    const subscriptions = await db.subscriptions.toArray();
    for (const sub of subscriptions) {
      const feed = await db.feeds.get(sub.feedId);
      if (feed && feed.isActive) {
        try {
          const count = await fetchAndParseFeed(feed.id, feed.url);
          self.postMessage({ type: 'fetchComplete', feedId: feed.id, newArticlesCount: count } as FetchResult);
        } catch (err) {
          self.postMessage({
            type: 'fetchComplete',
            feedId: feed.id,
            newArticlesCount: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
          } as FetchResult);
        }
      }
    }
  } else if (type === 'fetchFeed' && feedId) {
    const feed = await db.feeds.get(feedId);
    if (feed) {
      try {
        const count = await fetchAndParseFeed(feed.id, feed.url);
        self.postMessage({ type: 'fetchComplete', feedId: feed.id, newArticlesCount: count } as FetchResult);
      } catch (err) {
        self.postMessage({
          type: 'fetchComplete',
          feedId: feed.id,
          newArticlesCount: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        } as FetchResult);
      }
    }
  }
};

export {};
