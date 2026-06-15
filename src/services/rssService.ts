import type { Feed, Article } from '@/types';
import { db } from '@/db/schema';
import { MAX_ARTICLES_PER_FETCH } from '@/utils/constants';
import { articleIdFromLink } from '@/utils/articleId';
import { sanitizeHTML } from '@/utils/htmlSanitizer';

// Multiple CORS proxies for fallback
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

function generateId(): string {
  return crypto.randomUUID();
}

function extractImageFromContent(content: string): string | undefined {
  const match = content.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : undefined;
}

// ---- Robust XML Parser ----

interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  items: ParsedItem[];
}

interface ParsedItem {
  title: string;
  link: string;
  content: string;
  contentSnippet: string;
  author: string;
  pubDate: string;
  isoDate: string;
}

/**
 * Safely get text content from an element, supporting both namespaced and non-namespaced tags.
 * Handles cases like `content:encoded`, `dc:creator`, `itunes:image`.
 */
function getText(el: Element | null, ...tagNames: string[]): string {
  if (!el) return '';
  for (const tag of tagNames) {
    // Normalize: strip existing CSS escapes, then properly re-escape
    const normalized = tag.replace(/\\:/g, ':');
    const escaped = normalized.replace(/:/g, '\\:');
    // Try namespaced selector first (e.g., content\:encoded)
    try {
      const nsMatch = el.querySelector(escaped);
      if (nsMatch?.textContent) return nsMatch.textContent.trim();
    } catch {
      // Ignore invalid selector errors
    }
    // Try getElementsByTagName for namespaced tags
    try {
      const byTag = el.getElementsByTagName(normalized)[0] as Element | undefined;
      if (byTag?.textContent) return byTag.textContent.trim();
    } catch {
      // Ignore errors from getElementsByTagName with special chars
    }
    // Try plain selector
    const plain = el.querySelector(normalized.split(':')[1] || normalized);
    if (plain?.textContent && normalized.includes(':')) return plain.textContent.trim();
  }
  return '';
}

function getAttr(el: Element | null, tag: string, attr: string): string {
  if (!el) return '';
  // Normalize: strip existing CSS escapes, then properly re-escape
  const normalized = tag.replace(/\\:/g, ':');
  const escaped = normalized.replace(/:/g, '\\:');
  // Try namespaced
  try {
    const nsEl = el.querySelector(escaped);
    if (nsEl?.getAttribute(attr)) return nsEl.getAttribute(attr)!;
  } catch { /* ignore */ }
  // Try getElementsByTagName
  try {
    const byTag = el.getElementsByTagName(normalized)[0] as Element | undefined;
    if (byTag?.getAttribute(attr)) return byTag.getAttribute(attr)!;
  } catch { /* ignore */ }
  return '';
}

/** Strip HTML tags to get plain text */
function stripHTML(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

/** Parse ISO date or RFC-822 date to timestamp */
function parseDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
}

/**
 * Main parser entry point - handles RSS 2.0, Atom 1.0, and malformed feeds
 */
function parseFeed(xmlString: string): ParsedFeed {
  const parser = new DOMParser();

  // Try XML parsing first
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (!parseError && doc.documentElement.nodeName !== 'parsererror') {
    // Check root element to determine feed type
    const root = doc.documentElement;
    const rootName = root.nodeName.toLowerCase();

    if (rootName === 'feed' || rootName === 'atom') {
      return parseAtom(doc);
    }
    if (rootName === 'rss' || rootName === 'rdf:rdf') {
      return parseRSS(doc);
    }
    // Unknown but valid XML - try RSS first
    if (doc.querySelector('channel')) return parseRSS(doc);
    if (doc.querySelector('feed')) return parseAtom(doc);
  }

  // Fallback: try as text/html
  const htmlDoc = parser.parseFromString(xmlString, 'text/html');
  return parseFromHTML(htmlDoc);
}

function parseRSS(doc: Document): ParsedFeed {
  const channel = doc.querySelector('channel');
  if (!channel) {
    return emptyFeed();
  }

  const title = getText(channel, 'title') || 'Untitled Feed';
  const description = getText(channel, 'description') || '';
  const link = getText(channel, 'link') || '';

  // Image: try <image><url>, <itunes:image href="...">
  let imageUrl = getText(channel, 'image > url', 'url')
    || getAttr(channel, 'itunes:image', 'href')
    || '';

  const items: ParsedItem[] = [];
  const itemEls = channel.querySelectorAll('item');

  itemEls.forEach((item) => {
    // Content: content:encoded > description > (empty)
    const content =
      getText(item, 'content\\:encoded', 'content:encoded')
      || item.querySelector('description')?.textContent
      || '';

    items.push({
      title: getText(item, 'title') || '(No title)',
      link: getText(item, 'link') || '',
      content,
      contentSnippet: stripHTML(content).slice(0, 300),
      author:
        getText(item, 'author', 'dc\\:creator', 'dc:creator')
        || '',
      pubDate: getText(item, 'pubDate') || '',
      isoDate: getText(item, 'pubDate') || '',
    });
  });

  return { title, description, link, imageUrl, items };
}

function parseAtom(doc: Document): ParsedFeed {
  const feed = doc.querySelector('feed');
  if (!feed) return emptyFeed();

  const title = getText(feed, 'title') || 'Untitled Feed';
  const subtitle = getText(feed, 'subtitle');

  // Find alternate link
  let link = '';
  feed.querySelectorAll('link').forEach((l) => {
    if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
      link = l.getAttribute('href') || link;
    }
  });
  // Fallback: first link with href
  if (!link) {
    const l = feed.querySelector('link[href]');
    link = l?.getAttribute('href') || '';
  }

  const imageUrl = getText(feed, 'logo', 'icon') || '';

  const items: ParsedItem[] = [];
  const entries = feed.querySelectorAll('entry');

  entries.forEach((entry) => {
    const content =
      entry.querySelector('content')?.textContent
      || entry.querySelector('summary')?.textContent
      || '';

    let entryLink = '';
    entry.querySelectorAll('link').forEach((l) => {
      if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
        entryLink = l.getAttribute('href') || entryLink;
      }
    });
    if (!entryLink) {
      entryLink = entry.querySelector('link[href]')?.getAttribute('href') || '';
    }

    items.push({
      title: getText(entry, 'title') || '(No title)',
      link: entryLink,
      content,
      contentSnippet: stripHTML(content).slice(0, 300),
      author: getText(entry, 'author > name', 'author') || '',
      pubDate: getText(entry, 'published', 'updated') || '',
      isoDate:getText(entry, 'published', 'updated') || '',
    });
  });

  return { title, description: subtitle, link, imageUrl, items };
}

function parseFromHTML(_doc: Document): ParsedFeed {
  // Minimal fallback — most feeds are proper XML
  return emptyFeed();
}

function emptyFeed(): ParsedFeed {
  return { title: '', description: '', link: '', imageUrl: '', items: [] };
}

// ---- Fetch with multi-proxy fallback & timeout ----

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithProxy(
  url: string,
  opts?: { eTag?: string; lastModified?: string }
): Promise<{ body: string; eTag?: string; lastModified?: string } | null> {
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  };

  // Conditional request headers
  if (opts?.eTag) headers['If-None-Match'] = opts.eTag;
  if (opts?.lastModified) headers['If-Modified-Since'] = opts.lastModified;

  // Strategy 1: Direct fetch with conditional headers
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      mode: 'cors',
      signal: ctrl.signal,
      headers,
    });
    clearTimeout(timer);

    if (res.status === 304) return null; // Not modified — save bandwidth!
    if (res.ok) {
      const body = await res.text();
      return {
        body,
        eTag: res.headers.get('ETag') || undefined,
        lastModified: res.headers.get('Last-Modified') || undefined,
      };
    }
    if (res.status === 405 || res.status === 403) {
      // CORS blocked, fallthrough to proxy
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (directErr: unknown) {
    if (directErr instanceof DOMException && directErr.name === 'AbortError') {
      console.warn(`[EZRSS] Direct fetch timed out for ${url}`);
    } else {
      console.warn(`[EZRSS] Direct fetch failed: ${directErr instanceof Error ? directErr.message : String(directErr)}`);
    }
  }

  // Strategy 2: CORS proxies (no conditional headers — proxies typically strip them)
  let lastError: Error | null = null;
  for (const proxyBase of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxyBase}${encodeURIComponent(url)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        if (text.includes('<') && (text.includes('<rss') || text.includes('<feed') || text.includes('<entry') || text.includes('<item') || text.includes('<?xml'))) {
          return { body: text };
        }
        lastError = new Error('Response is not valid RSS/Atom XML');
        continue;
      }
      lastError = new Error(`Proxy ${proxyBase} returned ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[EZRSS] Proxy ${proxyBase} failed: ${lastError.message}`);
    }
  }

  throw lastError || new Error('All fetch methods failed');
}

// ---- Legacy data migration (UUID → deterministic ID) ----

/**
 * Remove old articles that used random UUIDs (causing duplicates).
 * Deterministic IDs start with 'a_' prefix; legacy UUIDs do not.
 * This runs once per feed on the first fetch after code update.
 */
let migrationDone = false;
async function migrateLegacyArticles(feedId: string): Promise<void> {
  if (migrationDone) return;

  try {
    // Check if any legacy (non-'a_') articles exist for this feed
    const allFeedArticles = await db.articles.where('feedId').equals(feedId).toArray();
    const legacyArticles = allFeedArticles.filter(a => !a.id.startsWith('a_'));

    if (legacyArticles.length > 0) {
      console.log(`[EZRS] Migrating ${legacyArticles.length} legacy articles for feed ${feedId}...`);
      const legacyIds = legacyArticles.map(a => a.id);
      // Also clean up associated readStates
      await db.readStates.bulkDelete(legacyIds);
      await db.articles.bulkDelete(legacyIds);
      console.log('[EZRS] Migration complete: old duplicate articles removed.');
    }
  } catch {
    // Silently ignore migration errors — not critical
  }

  migrationDone = true;
}

// ---- Public API ----

export async function fetchFeedMeta(url: string): Promise<Partial<Feed>> {
  const result = await fetchWithProxy(url);
  if (!result) throw new Error('Feed not available');
  const parsed = parseFeed(result.body);

  return {
    id: generateId(),
    url,
    title: parsed.title || url,
    description: parsed.description || '',
    link: parsed.link || url,
    imageUrl: parsed.imageUrl || '',
    lastFetchedAt: Date.now(),
    errorCount: 0,
    isActive: true,
    eTag: result.eTag,
    lastModified: result.lastModified,
  };
}

export async function fetchArticles(feedUrl: string, feedId: string): Promise<{ articles: Article[]; notModified: boolean }> {
  // Load feed to get conditional headers
  const feed = await db.feeds.get(feedId);

  const result = await fetchWithProxy(feedUrl, {
    eTag: feed?.eTag,
    lastModified: feed?.lastModified,
  });

  // 304 Not Modified — feed unchanged, skip all processing!
  if (!result) {
    // Still update lastFetchedAt so we know we checked
    await db.feeds.update(feedId, { lastFetchedAt: Date.now() });
    return { articles: [], notModified: true };
  }

  const { body: xml, eTag, lastModified } = result;
  const parsed = parseFeed(xml);

  // Update conditional headers on the feed
  await db.feeds.update(feedId, {
    eTag: eTag || feed?.eTag,
    lastModified: lastModified || feed?.lastModified,
    lastFetchedAt: Date.now(),
  });

  // One-time cleanup: remove legacy UUID-based articles for this feed
  await migrateLegacyArticles(feedId);

  // Build articles with deterministic IDs (based on link) for dedup
  const articles: Article[] = [];

  for (const item of parsed.items.slice(0, MAX_ARTICLES_PER_FETCH)) {
    const link = item.link || feedUrl;
    const id = articleIdFromLink(link);
    const rawContent = item.content || '';
    const content = sanitizeHTML(rawContent);
    const summary = sanitizeHTML(stripHTML(rawContent).slice(0, 300));

    articles.push({
      id,
      feedId,
      title: item.title || '无标题',
      summary,
      content,
      link,
      author: item.author || '',
      publishedAt: parseDate(item.isoDate),
      fetchedAt: Date.now(),
      imageUrl: extractImageFromContent(content),
    });
  }

  if (articles.length > 0) {
    await db.articles.bulkPut(articles);
  }

  return { articles, notModified: false };
}

export async function refreshAllFeeds(
  onProgress?: (feedId: string, status: 'pending' | 'success' | 'failure') => void,
  options?: { includeDisabled?: boolean }
): Promise<number> {
  const subscriptions = await db.subscriptions.toArray();
  const includeDisabled = options?.includeDisabled ?? false;

  const results = await Promise.allSettled(
    subscriptions
      .map(async (sub) => {
        const feed = await db.feeds.get(sub.feedId);
        if (!feed || !feed.isActive) return 0;

        // Skip feeds with auto-refresh disabled — unless explicitly overriding
        if (!includeDisabled && sub.autoRefresh === false) return 0;

        onProgress?.(feed.id, 'pending');

        try {
          const existingLinks = new Set(
            (await db.articles.where('feedId').equals(feed.id).toArray()).map(a => a.link)
          );
          const { articles } = await fetchArticles(feed.url, feed.id);
          const newCount = articles.filter(a => !existingLinks.has(a.link)).length;

          onProgress?.(feed.id, 'success');
          return newCount;
        } catch (err) {
          onProgress?.(feed.id, 'failure');
          throw err;
        }
      })
  );

  return results.reduce((total, r) => {
    if (r.status === 'fulfilled') return total + r.value;
    console.warn('[EZRS] Refresh feed failed:', r.reason);
    return total;
  }, 0);
}

export async function detectFeedUrl(url: string): Promise<string[]> {
  const found: string[] = [];

  // If URL looks like a direct feed endpoint
  const feedPatterns = [/\.rss$/i, /\.xml$/i, /\/feed\/?$/i, /\/rss\/?$/i, /feed\.xml$/i, /atom\.xml$/i];
  if (feedPatterns.some(p => p.test(url))) {
    found.push(url);
  }

  // Fetch page and look for <link rel="alternate" type="application/rss+xml">
  try {
    const result = await fetchWithProxy(url);
    if (!result) return found;
    const linkPattern = /<link[^>]+rel=["'](?:alternate)["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(result.body)) !== null) {
      const href = match[2];
      found.push(href.startsWith('http') ? href : new URL(href, url).href);
    }
  } catch {
    // Can't fetch page, return what we have
  }

  return [...new Set(found)];
}
