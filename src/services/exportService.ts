import type { Feed, Subscription, Folder } from '@/types';
import { db } from '@/db/schema';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FEEDS_IMPORT = 500;
const MAX_ARTICLES_IMPORT = 10000;

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface OPMLOutline {
  title?: string;
  text?: string;
  type?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  children?: OPMLOutline[];
}

export interface OPMLDocument {
  head?: {
    title?: string;
  };
  body?: {
    outline?: OPMLOutline[];
    outlines?: OPMLOutline[];
  };
}

function parseOPML(xmlString: string): OPMLDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const parseOutline = (el: Element): OPMLOutline => {
    const outline: OPMLOutline = {};
    if (el.getAttribute('title')) outline.title = el.getAttribute('title')!;
    if (el.getAttribute('text')) outline.text = el.getAttribute('text')!;
    if (el.getAttribute('type')) outline.type = el.getAttribute('type')!;
    if (el.getAttribute('xmlUrl')) outline.xmlUrl = el.getAttribute('xmlUrl')!;
    if (el.getAttribute('htmlUrl')) outline.htmlUrl = el.getAttribute('htmlUrl')!;

    const children = el.querySelectorAll(':scope > outline');
    if (children.length > 0) {
      outline.children = Array.from(children).map(parseOutline);
    }

    return outline;
  };

  const headTitle = doc.querySelector('head > title')?.textContent || '';
  const outlines = Array.from(doc.querySelectorAll('body > outline')).map(parseOutline);

  return {
    head: { title: headTitle },
    body: { outline: outlines.length > 0 ? outlines : undefined },
  };
}

function flattenOutlines(outlines: OPMLOutline[]): OPMLOutline[] {
  const result: OPMLOutline[] = [];
  for (const outline of outlines) {
    if (outline.xmlUrl) {
      result.push(outline);
    }
    if (outline.children) {
      result.push(...flattenOutlines(outline.children));
    }
  }
  return result;
}

export async function importOPML(file: File): Promise<{ feeds: number; folders: number }> {
  const text = await file.text();
  const opml = parseOPML(text);
  const outlines = opml.body?.outline || opml.body?.outlines || [];
  const flat = flattenOutlines(outlines);

  const existingFeeds = await db.feeds.toArray();
  const existingUrls = new Set(existingFeeds.map(f => f.url));

  const feedsToAdd: Feed[] = [];
  const subscriptionsToAdd: Subscription[] = [];
  const existingSubs = await db.subscriptions.toArray();
  let sortOrder = existingSubs.length;

  for (const outline of flat) {
    if (!outline.xmlUrl || existingUrls.has(outline.xmlUrl)) continue;
    if (!isValidHttpUrl(outline.xmlUrl)) continue;

    const feedId = crypto.randomUUID();
    const feed: Feed = {
      id: feedId,
      url: outline.xmlUrl,
      title: outline.title || outline.text || outline.xmlUrl,
      description: '',
      link: outline.htmlUrl || outline.xmlUrl,
      imageUrl: '',
      lastFetchedAt: 0,
      errorCount: 0,
      isActive: true,
    };

    feedsToAdd.push(feed);

    subscriptionsToAdd.push({
      id: crypto.randomUUID(),
      feedId,
      sortOrder: sortOrder++,
      updateInterval: 30,
      autoRefresh: true,
      createdAt: Date.now(),
    });
  }

  await db.transaction('rw', db.feeds, db.subscriptions, async () => {
    if (feedsToAdd.length > 0) await db.feeds.bulkPut(feedsToAdd);
    if (subscriptionsToAdd.length > 0) await db.subscriptions.bulkPut(subscriptionsToAdd);
  });

  return { feeds: feedsToAdd.length, folders: 0 };
}

export async function exportOPML(): Promise<string> {
  const feeds = await db.feeds.toArray();
  const folders = await db.folders.toArray();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<opml version="2.0">\n';
  xml += '  <head>\n';
  xml += '    <title>Kingbird Subscriptions</title>\n';
  xml += `    <dateCreated>${new Date().toISOString()}</dateCreated>\n`;
  xml += '  </head>\n';
  xml += '  <body>\n';

  for (const folder of folders) {
    xml += `    <outline text="${escapeXml(folder.name)}" title="${escapeXml(folder.name)}">\n`;
    const subs = await db.subscriptions.where('folderId').equals(folder.id).toArray();
    for (const sub of subs) {
      const feed = feeds.find(f => f.id === sub.feedId);
      if (feed) {
        xml += `      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.link || '')}"/>\n`;
      }
    }
    xml += '    </outline>\n';
  }

  // Uncategorized feeds
  const uncategorizedSubs = await db.subscriptions.filter(s => !s.folderId).toArray();
  for (const sub of uncategorizedSubs) {
    const feed = feeds.find(f => f.id === sub.feedId);
    if (feed) {
      xml += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.link || '')}"/>\n`;
    }
  }

  xml += '  </body>\n';
  xml += '</opml>';

  return xml;
}

export async function exportJSON(): Promise<string> {
  const data = await import('@/services/storageService').then(m => m.exportAllData());
  return JSON.stringify(data, null, 2);
}

export async function importJSON(file: File): Promise<{ feeds: number; articles: number }> {
  if (file.size > MAX_IMPORT_SIZE) {
    throw new Error('文件大小不能超过 5MB');
  }

  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || typeof data !== 'object') {
    throw new Error('无效的 JSON 格式');
  }

  if (!Array.isArray(data.feeds)) {
    throw new Error('缺少 feeds 数组');
  }

  if (data.feeds.length > MAX_FEEDS_IMPORT) {
    throw new Error(`订阅源数量不能超过 ${MAX_FEEDS_IMPORT}`);
  }

  if (Array.isArray(data.articles) && data.articles.length > MAX_ARTICLES_IMPORT) {
    throw new Error(`文章数量不能超过 ${MAX_ARTICLES_IMPORT}`);
  }

  // Validate feed objects have required fields
  for (const feed of data.feeds) {
    if (!feed.id || !feed.url || !feed.title) {
      throw new Error('订阅源数据格式不正确：缺少必需字段 (id, url, title)');
    }
    if (!isValidHttpUrl(feed.url)) {
      throw new Error(`无效的订阅源 URL: ${feed.url}`);
    }
  }

  const module = await import('@/services/storageService');
  await module.importAllData(data);

  const feeds = data.feeds?.length || 0;
  const articles = data.articles?.length || 0;

  return { feeds, articles };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
