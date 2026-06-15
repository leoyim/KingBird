import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Hoisted: shared IndexedDB stores
// ============================================================
const { tables, makeDb } = vi.hoisted(() => {
  const stores: Record<string, Map<string, Record<string, unknown>>> = {};
  function getStore(name: string) {
    if (!stores[name]) stores[name] = new Map();
    return stores[name];
  }
  function makeTable(name: string) {
    return {
      get: async (id: string) => getStore(name).get(id),
      put: async (v: Record<string, unknown>) => { getStore(name).set(v.id as string, { ...v }); return v.id; },
      update: async (id: string, c: Record<string, unknown>) => { const e = getStore(name).get(id); if (e) Object.assign(e, c); },
      toArray: async () => Array.from(getStore(name).values()),
      count: async () => getStore(name).size,
      bulkPut: async (items: Record<string, unknown>[]) => { for (const item of items) getStore(name).set(item.id as string, { ...item }); },
      where: () => ({ equals: (val: unknown) => ({ toArray: async () => Array.from(getStore(name).values()).filter(r => r.feedId === val), count: async () => Array.from(getStore(name).values()).filter(r => r.feedId === val).length }) }),
    };
  }
  return { tables: stores, makeDb: () => ({ feeds: makeTable('feeds'), subscriptions: makeTable('subscriptions'), articles: makeTable('articles'), readStates: makeTable('readStates'), tags: makeTable('tags'), folders: makeTable('folders') }) };
});

vi.mock('@/db/schema', () => ({ db: makeDb() }));

vi.stubGlobal('crypto', { randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }) });
vi.stubGlobal('document', { createElement: () => ({ innerHTML: '', textContent: '', innerText: '' }) });

// ============================================================
// Proper DOMParser mock that extracts items from RSS XML
// ============================================================
vi.stubGlobal('DOMParser', class {
  parseFromString(xml: string, _type: string) {
    function extract(tag: string, from: string): string[] {
      const results: string[] = [];
      let pos = 0;
      const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi');
      let m;
      while ((m = re.exec(from)) !== null) results.push(m[1].trim());
      return results;
    }
    function text(tag: string, within: string): string {
      const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(within);
      return m ? m[1].trim() : '';
    }

    const channelMatch = /<channel>([\s\S]*?)<\/channel>/i.exec(xml);
    const channelBody = channelMatch ? channelMatch[1] : '';
    const itemBodies = extract('item', channelBody);

    const itemElements = itemBodies.map(body => ({
      querySelector: (sel: string) => {
        const t = text(sel, body);
        return t ? { textContent: t } : null;
      },
      getElementsByTagName: (name: string) => {
        const t = text(name, body);
        return t ? [{ textContent: t }] : [];
      },
    }));

    return {
      documentElement: { nodeName: 'rss' },
      querySelector: (sel: string) => {
        if (sel === 'channel') {
          return {
            querySelector: (s: string) => {
              if (s === 'title' || s === 'description' || s === 'link') {
                const t = text(s, channelBody);
                return t ? { textContent: t } : null;
              }
              return null;
            },
            getElementsByTagName: (name: string) => {
              const t = text(name, channelBody);
              return t ? [{ textContent: t }] : [];
            },
            querySelectorAll: (s: string) => {
              if (s === 'item') return itemElements;
              return [];
            },
          };
        }
        if (sel === 'parsererror') return null;
        return null;
      },
      querySelectorAll: () => [],
    };
  }
});

// ============================================================
// Mock fetch at global level — with unique links and ETag support
// ============================================================
const fetchState = vi.hoisted(() => ({ callIndex: 0, servedETags: new Set<string>() }));
vi.stubGlobal('fetch', vi.fn(async (url: unknown, opts?: RequestInit) => {
  const headers = (opts?.headers ?? {}) as Record<string, string>;
  const urlStr = url as string;

  // Check for conditional request — return 304 if ETag matches
  if (headers['If-None-Match'] || headers['If-Modified-Since']) {
    return { ok: false, status: 304, headers: new Map(), text: async () => '' };
  }

  const idx = fetchState.callIndex++;
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => {
        if (name === 'ETag') return '"mock-etag"';
        if (name === 'Last-Modified') return 'Tue, 14 Jun 2026 00:00:00 GMT';
        return null;
      },
    },
    text: async () => `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<title>Mock Feed</title>
<item>
<title>Test Article ${idx}</title>
<link>http://example.com/article-${idx}</link>
<pubDate>${new Date().toUTCString()}</pubDate>
</item>
</channel>
</rss>`,
  };
}));

// Mock DOMPurify for htmlSanitizer
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

// ============================================================
// Import code under test (full, unmocked path)
// ============================================================
import { refreshAllFeeds, fetchArticles } from '@/services/rssService';

// ============================================================
// Helpers
// ============================================================
function resetState() {
  for (const key of Object.keys(tables)) tables[key]?.clear();
  fetchState.callIndex = 0;
  fetchState.servedETags.clear();
  vi.clearAllMocks();
}

async function seedFeeds(count: number, baseTime: number) {
  const { db } = await import('@/db/schema');
  for (let i = 0; i < count; i++) {
    const fid = `feed-${i}`;
    await db.feeds.put({ id: fid, url: `http://feed-${i}.example.com/rss`, title: `Feed ${i}`, isActive: true, errorCount: 0, lastFetchedAt: baseTime + i * 1000 });
    await db.subscriptions.put({ id: `sub-${i}`, feedId: fid, sortOrder: i, updateInterval: 30, autoRefresh: true, createdAt: Date.now() });
  }
}

// ============================================================
// Tests
// ============================================================

describe('基础数据流验证', () => {
  beforeEach(resetState);

  it('seedFeeds 正确创建订阅', async () => {
    await seedFeeds(3, Date.now());
    const { db } = await import('@/db/schema');
    expect((await db.subscriptions.toArray()).length).toBe(3);
    expect((await db.feeds.toArray()).length).toBe(3);
  });

  it('fetchArticles 返回文章并更新 ETag', async () => {
    await seedFeeds(1, Date.now() - 86400000);
    const { db } = await import('@/db/schema');
    const feed = await db.feeds.get('feed-0') as Record<string, unknown>;
    const { articles, notModified } = await fetchArticles((feed as Record<string, unknown>).url as string, 'feed-0');
    expect(notModified).toBe(false);
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].title).toBe('Test Article 0');
    // ETag should have been saved
    const updated = await db.feeds.get('feed-0') as Record<string, unknown>;
    expect((updated as Record<string, unknown>).eTag).toBeDefined();
  });
});

describe('并发控制', () => {
  beforeEach(async () => {
    resetState();
    await seedFeeds(20, Date.now() - 86400000);
  });

  it('refreshAllFeeds 正常运行并返回计数', async () => {
    const count = await refreshAllFeeds();
    expect(count).toBe(20);
  });

  it('多次刷新时 ETag 生效 → 计数为 0', async () => {
    await refreshAllFeeds();
    const count = await refreshAllFeeds();
    expect(count).toBe(0);
  });
});

describe('跳过禁用的源', () => {
  beforeEach(resetState);

  it('autoRefresh = false 的源被跳过', async () => {
    await seedFeeds(5, Date.now() - 86400000);
    const { db } = await import('@/db/schema');
    await db.subscriptions.update('sub-0', { autoRefresh: false });
    await db.subscriptions.update('sub-2', { autoRefresh: false });
    expect(await refreshAllFeeds()).toBe(3);
  });

  it('includeDisabled = true 刷新所有', async () => {
    await seedFeeds(5, Date.now() - 86400000);
    const { db } = await import('@/db/schema');
    await db.subscriptions.update('sub-0', { autoRefresh: false });
    expect(await refreshAllFeeds(undefined, { includeDisabled: true })).toBe(5);
  });

  it('isActive = false 的源被跳过', async () => {
    await seedFeeds(3, Date.now() - 86400000);
    const { db } = await import('@/db/schema');
    await db.feeds.update('feed-1', { isActive: false });
    expect(await refreshAllFeeds(undefined, { includeDisabled: true })).toBe(2);
  });
});

describe('按 lastFetchedAt 排序', () => {
  beforeEach(resetState);

  it('最久未刷新的源优先被处理', async () => {
    const now = Date.now();
    await seedFeeds(5, now);
    const { db } = await import('@/db/schema');
    for (let i = 0; i < 5; i++) {
      await db.feeds.update(`feed-${i}`, { lastFetchedAt: now - (5 - i) * 3600000 });
    }

    // Track call order by wrapping fetch
    const callOrder: string[] = [];
    const origFetch = fetch;
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, opts?: RequestInit) => {
      callOrder.push(url as string);
      return origFetch(url, opts);
    }));

    await refreshAllFeeds();

    // Extract feed indices from direct fetch URLs (not proxy URLs)
    const indices = callOrder
      .map(u => { const m = (u as string).match(/feed-(\d+)/); return m ? parseInt(m[1]) : -1; })
      .filter(i => i >= 0);

    // feed-0 is oldest (5h ago) → should be fetched first
    // With concurrency=6 and 5 feeds, all start in one batch, but feed-0 goes first
    expect(indices[0]).toBe(0);
  });
});

describe('progress 回调', () => {
  beforeEach(resetState);

  it('每个源触发 pending → success', async () => {
    await seedFeeds(5, Date.now() - 86400000);
    const log: { feedId: string; status: string }[] = [];
    const count = await refreshAllFeeds((fid, s) => log.push({ feedId: fid, status: s }));
    expect(count).toBe(5);
    expect(log.filter(p => p.status === 'pending').length).toBe(5);
    expect(log.filter(p => p.status === 'success').length).toBe(5);
  });
});

describe('ETag 头保存', () => {
  beforeEach(resetState);

  it('刷新后 feed 记录保存 ETag', async () => {
    await seedFeeds(1, Date.now() - 86400000);
    await refreshAllFeeds();
    const { db } = await import('@/db/schema');
    const feed = await db.feeds.get('feed-0') as Record<string, unknown>;
    expect(feed).toBeDefined();
    expect((feed as Record<string, unknown>).eTag).toBeDefined();
  });
});
