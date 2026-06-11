export async function detectFeedURLs(url: string): Promise<string[]> {
  const found: string[] = [];
  const feedPatterns = [
    /\/feed\/?$/i, /\/rss\/?$/i, /\.rss$/i, /\.xml$/i,
    /\/atom\.xml$/i, /\/feeds\/posts\/default/i,
  ];

  // Check if URL itself is likely a feed
  if (feedPatterns.some(p => p.test(url))) {
    found.push(url);
  }

  // Try adding common feed paths
  const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml'];
  const baseUrl = new URL(url).origin;
  for (const path of commonPaths) {
    found.push(`${baseUrl}${path}`);
  }

  return [...new Set(found)];
}
