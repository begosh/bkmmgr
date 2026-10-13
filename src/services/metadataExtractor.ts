import { PageMetadata } from '../types';

/**
 * Extracts metadata from a document (DOM or HTML string)
 */
export function extractMetadataFromDocument(doc: Document, url: string, includeContent = false): PageMetadata {
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = '';
  }

  // 1. Standard HTML tags
  const title =
    doc.querySelector('title')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
    '';

  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
    doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')?.trim() ||
    '';

  const keywordsAttr = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
  const keywords = keywordsAttr
    ? keywordsAttr.slice(0, 4000).split(',').slice(0, 30).map((k) => k.trim().slice(0, 120)).filter(Boolean)
    : [];

  // 2. OpenGraph tags
  const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content') || undefined;
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || undefined;

  // Add article:tag if present
  const articleTags = Array.from(doc.querySelectorAll('meta[property="article:tag"]'))
    .slice(0, 30)
    .map((el) => el.getAttribute('content')?.trim())
    .filter((t): t is string => Boolean(t));
  if (articleTags.length > 0) {
    keywords.push(...articleTags);
  }

  // 3. Schema.org JSON-LD extraction
  const schemaTypes: string[] = [];
  const breadcrumbs: string[] = [];

  const scriptTags = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scriptTags.slice(0, 10)) {
    try {
      if ((script.textContent || '').length > 100000) continue;
      const json = JSON.parse(script.textContent || '');
      traverseJsonLd(json, schemaTypes, breadcrumbs, keywords);
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  // 4. Fallback DOM breadcrumb elements
  if (breadcrumbs.length === 0) {
    const breadcrumbNodes = Array.from(
      doc.querySelectorAll('[aria-label*="breadcrumb" i] a, .breadcrumb a, nav.breadcrumbs a')
    );
    for (const node of breadcrumbNodes.slice(0, 20)) {
      const text = node.textContent?.trim();
      if (text && text.length < 40 && !['home', 'index', '›', '/', '>'].includes(text.toLowerCase())) {
        breadcrumbs.push(text);
      }
    }
  }

  // 5. Headings (H1/H2)
  const headings = Array.from(doc.querySelectorAll('h1, h2'))
    .slice(0, 5)
    .map((h) => h.textContent?.trim() || '')
    .filter((t) => t.length > 2 && t.length < 80);

  return {
    url,
    title: title.slice(0, 300),
    description: description.slice(0, 600),
    keywords: Array.from(new Set(keywords)).slice(0, 30).map(text => text.slice(0, 120)),
    ogType: ogType?.slice(0, 80),
    ogSiteName: ogSiteName?.slice(0, 120),
    schemaTypes: Array.from(new Set(schemaTypes)).slice(0, 20),
    headings,
    breadcrumbs: Array.from(new Set(breadcrumbs)).slice(0, 20).map(text => text.slice(0, 120)),
    domain,
    ...(includeContent ? { contentExcerpt: extractContentExcerpt(doc) } : {}),
  };
}

/** Collect a small visible text sample, never form values or editable content. */
export function extractContentExcerpt(doc: Document): string {
  const root = doc.querySelector('main, article, [role="main"]') || doc.body;
  if (!root) return '';
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const parts: string[] = [];
  let length = 0;
  let scanned = 0;
  const excluded = 'script, style, noscript, template, nav, header, footer, form, input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [hidden], [aria-hidden="true"]';
  while (scanned++ < 10000 && length < 2000) {
    const node = walker.nextNode();
    if (!node) break;
    const parent = node.parentElement;
    if (!parent || parent.closest(excluded)) continue;
    let hidden = false;
    for (let element: Element | null = parent; element; element = element.parentElement) {
      const style = doc.defaultView?.getComputedStyle(element);
      if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' ||
          style?.opacity === '0' || style?.contentVisibility === 'hidden') {
        hidden = true;
        break;
      }
    }
    if (hidden) continue;
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const remaining = 2000 - length - (parts.length ? 1 : 0);
    if (remaining <= 0) break;
    const part = text.slice(0, remaining);
    parts.push(part);
    length += part.length + (parts.length > 1 ? 1 : 0);
  }
  return parts.join(' ');
}

/**
 * Traverses JSON-LD trees to collect types, breadcrumb items, and keywords
 */
function traverseJsonLd(
  obj: any,
  schemaTypes: string[],
  breadcrumbs: string[],
  keywords: string[],
  depth = 0,
  budget = { remaining: 1000 }
): void {
  if (!obj || typeof obj !== 'object' || depth > 20 || budget.remaining-- <= 0) return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      traverseJsonLd(item, schemaTypes, breadcrumbs, keywords, depth + 1, budget);
      if (budget.remaining <= 0) break;
    }
    return;
  }

  if (obj['@type']) {
    if (Array.isArray(obj['@type'])) {
      schemaTypes.push(...obj['@type'].slice(0, 20).filter((type: unknown) => typeof type === 'string'));
    } else if (typeof obj['@type'] === 'string') {
      schemaTypes.push(obj['@type']);
    }
  }

  // Extract breadcrumbs from BreadcrumbList
  if (obj['@type'] === 'BreadcrumbList' && Array.isArray(obj.itemListElement)) {
    for (const elem of obj.itemListElement.slice(0, 20)) {
      const name = elem.name || elem.item?.name;
      if (typeof name === 'string' && name.trim()) {
        breadcrumbs.push(name.trim());
      }
    }
  }

  // Extract keywords
  if (typeof obj.keywords === 'string') {
    const kList = obj.keywords.slice(0, 4000).split(',').slice(0, 30).map((k: string) => k.trim());
    keywords.push(...kList);
  } else if (Array.isArray(obj.keywords)) {
    keywords.push(...obj.keywords.slice(0, 30).map((k: any) => String(k).trim()));
  }

  // Recursively inspect nested objects
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      traverseJsonLd(obj[key], schemaTypes, breadcrumbs, keywords, depth + 1, budget);
      if (budget.remaining <= 0) break;
    }
  }
}
