import { PageMetadata } from '../types';

/**
 * Extracts metadata from a document (DOM or HTML string)
 */
export function extractMetadataFromDocument(doc: Document, url: string): PageMetadata {
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
    ? keywordsAttr.split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  // 2. OpenGraph tags
  const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content') || undefined;
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || undefined;

  // Add article:tag if present
  const articleTags = Array.from(doc.querySelectorAll('meta[property="article:tag"]'))
    .map((el) => el.getAttribute('content')?.trim())
    .filter((t): t is string => Boolean(t));
  if (articleTags.length > 0) {
    keywords.push(...articleTags);
  }

  // 3. Schema.org JSON-LD extraction
  const schemaTypes: string[] = [];
  const breadcrumbs: string[] = [];

  const scriptTags = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scriptTags) {
    try {
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
    for (const node of breadcrumbNodes) {
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
    title,
    description,
    keywords: Array.from(new Set(keywords)),
    ogType,
    ogSiteName,
    schemaTypes: Array.from(new Set(schemaTypes)),
    headings,
    breadcrumbs: Array.from(new Set(breadcrumbs)),
    domain,
  };
}

/**
 * Traverses JSON-LD trees to collect types, breadcrumb items, and keywords
 */
function traverseJsonLd(
  obj: any,
  schemaTypes: string[],
  breadcrumbs: string[],
  keywords: string[]
): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      traverseJsonLd(item, schemaTypes, breadcrumbs, keywords);
    }
    return;
  }

  if (obj['@type']) {
    if (Array.isArray(obj['@type'])) {
      schemaTypes.push(...obj['@type']);
    } else if (typeof obj['@type'] === 'string') {
      schemaTypes.push(obj['@type']);
    }
  }

  // Extract breadcrumbs from BreadcrumbList
  if (obj['@type'] === 'BreadcrumbList' && Array.isArray(obj.itemListElement)) {
    for (const elem of obj.itemListElement) {
      const name = elem.name || elem.item?.name;
      if (typeof name === 'string' && name.trim()) {
        breadcrumbs.push(name.trim());
      }
    }
  }

  // Extract keywords
  if (typeof obj.keywords === 'string') {
    const kList = obj.keywords.split(',').map((k: string) => k.trim());
    keywords.push(...kList);
  } else if (Array.isArray(obj.keywords)) {
    keywords.push(...obj.keywords.map((k: any) => String(k).trim()));
  }

  // Recursively inspect nested objects
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      traverseJsonLd(obj[key], schemaTypes, breadcrumbs, keywords);
    }
  }
}
