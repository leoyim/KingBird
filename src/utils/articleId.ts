/**
 * Generate a deterministic, stable ID from an article's URL.
 * Same URL always produces the same ID → enables upsert on bulkPut for dedup.
 *
 * Uses a simple string hash + base64-encoded URL prefix for readability.
 */
export function articleIdFromLink(link: string): string {
  let hash = 0;
  for (let i = 0; i < link.length; i++) {
    hash = ((hash << 5) - hash + link.charCodeAt(i)) | 0; // hash * 31 + char, keep as int32
  }
  // Prepend 'a_' prefix to distinguish article IDs from feed/folder IDs
  return 'a_' + Math.abs(hash).toString(36) + '_' +
    btoa(encodeURIComponent(link.slice(0, 80)))
      .replace(/[+/=]/g, '')
      .slice(-12);
}
