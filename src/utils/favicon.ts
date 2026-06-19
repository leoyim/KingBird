import { db } from '@/db/schema';
import type { Feed } from '@/types';

/**
 * Extract the hostname from a feed URL or site link.
 */
function getHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Get favicon URL for a feed.
 *
 * Strategy:
 * 1. If feed.faviconUrl is already stored, use it.
 * 2. Otherwise derive from Google's favicon service (reliable, no CORS issues).
 *
 * The derived URL is persisted to DB for long-term use.
 */
export function getFaviconUrl(feed: Feed): string | undefined {
  if (feed.faviconUrl) return feed.faviconUrl;

  const hostname = getHostname(feed.link || feed.url);
  if (!hostname) return undefined;

  // Use Google's favicon service — reliable and CORS-friendly
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

/**
 * Persist favicon URL to the feed record in DB.
 * Called once when a feed is added or when faviconUrl is missing.
 */
export async function ensureFavicon(feed: Feed): Promise<string | undefined> {
  if (feed.faviconUrl) return feed.faviconUrl;

  const faviconUrl = getFaviconUrl(feed);
  if (faviconUrl) {
    await db.feeds.update(feed.id, { faviconUrl });
  }
  return faviconUrl;
}
