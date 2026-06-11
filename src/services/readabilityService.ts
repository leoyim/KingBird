// HTML content cleaning using DOM manipulation
export function cleanArticleContent(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'iframe', 'noscript',
    '.advertisement', '.ad', '.ads', '.social-share',
    '.comments', '#comments', '.related-posts',
    '.sidebar', '.widget', '.nav', '.navigation',
    '[class*="cookie"]', '[id*="cookie"]',
  ];

  for (const selector of removeSelectors) {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  }

  // Remove inline styles except for images
  doc.querySelectorAll('*:not(img):not(pre):not(code)').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('class');
  });

  // Clean links - keep href but remove tracking params
  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      const url = new URL(href, window.location.origin);
      url.searchParams.delete('utm_source');
      url.searchParams.delete('utm_medium');
      url.searchParams.delete('utm_campaign');
      url.searchParams.delete('utm_term');
      url.searchParams.delete('utm_content');
      a.setAttribute('href', url.toString());
    }
  });

  return doc.body.innerHTML;
}

export function extractPlainText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function applyBionicReading(text: string): string {
  if (!text.trim()) return '';

  const words = text.split(/\s+/);
  return words.map(word => {
    // Bold the first half of each word
    const splitPoint = Math.ceil(word.length / 2);
    if (splitPoint > 0 && word.length > 1) {
      return `<b>${word.slice(0, splitPoint)}</b>${word.slice(splitPoint)}`;
    }
    return word;
  }).join(' ');
}

export function convertToBionicReading(html: string): string {
  if (!html) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const textNodes = getTextNodes(doc.body);

  for (const node of textNodes) {
    const text = node.textContent || '';
    if (text.trim().length > 3) {
      const span = doc.createElement('span');
      span.innerHTML = applyBionicReading(text);
      node.parentNode?.replaceChild(span, node);
    }
  }

  return doc.body.innerHTML;
}

function getTextNodes(node: Node): Node[] {
  const textNodes: Node[] = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.parentElement &&
        ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD'].includes(n.parentElement.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current: Node | null;
  while ((current = walker.nextNode())) {
    textNodes.push(current);
  }

  return textNodes;
}
