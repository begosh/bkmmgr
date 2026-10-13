import { AISettings, BookmarkItem, PageMetadata } from '../types';
import { isLocalOrPrivateHost, sanitizeUrl } from './urlSanitizer';

export const AI_CONTENT_LIMIT = 2000;

/** The local exception applies to loopback Ollama, never arbitrary remote servers. */
export function isLocalOllama(settings: AISettings): boolean {
  if (settings.provider !== 'ollama') return false;
  try {
    const endpoint = new URL(settings.ollamaEndpoint || 'http://localhost:11434');
    const host = endpoint.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return ['http:', 'https:'].includes(endpoint.protocol) && !endpoint.username && !endpoint.password &&
      (host === 'localhost' || host === '::1' || /^127\.\d+\.\d+\.\d+$/.test(host));
  } catch { return false; }
}

export function getAIPageContextMode(settings: AISettings): 'off' | 'metadata' | 'content' {
  return settings.pageContextMode === 'metadata' || settings.pageContextMode === 'content'
    ? settings.pageContextMode : 'off';
}

export function isProtectedAIHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const mapped = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return isProtectedAIHost(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  if (normalized.startsWith('::ffff:') && normalized.slice(7).includes('.')) {
    return isProtectedAIHost(normalized.slice(7));
  }
  return isLocalOrPrivateHost(normalized) || (!normalized.includes('.') && !normalized.includes(':')) ||
    normalized.endsWith('.localhost') || /^169\.254\./.test(normalized) ||
    normalized === '::' || /^(fc|fd)[0-9a-f]{2}:/.test(normalized) || /^fe[89ab][0-9a-f]:/.test(normalized);
}

export function canSharePageContext(url: string, settings: AISettings): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
      !(settings.excludeLocalAndIntranet && !isLocalOllama(settings) && isProtectedAIHost(parsed.hostname));
  } catch { return false; }
}

// Provider-only cleaning: the original bookmark is never changed.
export function cleanAIUrl(rawUrl: string, settings: AISettings): string {
  try {
    const parsed = new URL(settings.stripQueryParamsBeforeAI ? sanitizeUrl(rawUrl).cleanedUrl : rawUrl);
    parsed.username = '';
    parsed.password = '';
    if (settings.stripQueryParamsBeforeAI) {
      for (const name of [...parsed.searchParams.keys()]) {
        if (/token|secret|password|passwd|session|authorization|credential|api.?key|signature|^sig$|^code$|^state$/i.test(name)) {
          parsed.searchParams.delete(name);
        }
      }
      parsed.hash = '';
    }
    return parsed.toString();
  } catch { return ''; }
}

export function cleanAIText(value: unknown, limit: number, settings: AISettings): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, Math.max(limit * 4, 8000))
    .replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
      if (!canSharePageContext(url, settings)) return '[private link]';
      return cleanAIUrl(url, settings);
    })
    .replace(/\b(?:AIza[\w-]{35}|gh[pousr]_[\w]{20,}|github_pat_[\w]{30,}|sk-(?:proj-)?[\w-]{30,})\b/g, '[redacted]')
    .replace(/\beyJ[\w-]{15,}\.[\w-]{15,}\.[\w-]{15,}\b/g, '[redacted]')
    .replace(/\b(?:password|passwd|api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|session[ _-]?id)\s*[:=]\s*["']?[^\s"'<>,;]+/gi, '[redacted]')
    .replace(/\bBearer\s+[\w.+/=-]+/gi, '[redacted]')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function buildAIPageContext(page: PageMetadata, settings: AISettings): Record<string, unknown> | undefined {
  const mode = getAIPageContextMode(settings);
  if (mode === 'off' || !canSharePageContext(page.url, settings)) return undefined;
  const context: Record<string, unknown> = {};
  for (const [key, limit] of [['description', 600], ['ogSiteName', 120], ['ogType', 80]] as const) {
    const value = cleanAIText(page[key], limit, settings);
    if (value) context[key] = value;
  }
  for (const key of ['keywords', 'schemaTypes', 'headings', 'breadcrumbs'] as const) {
    const values = Array.isArray(page[key]) ? page[key]!.slice(0, 8)
      .map(value => cleanAIText(value, 120, settings)).filter(Boolean) : [];
    if (values.length) context[key] = values;
  }
  if (mode === 'content') {
    const excerpt = cleanAIText(page.contentExcerpt, AI_CONTENT_LIMIT, settings);
    if (excerpt) context.contentExcerpt = excerpt;
  }
  if (!Object.keys(context).length) return undefined;
  const title = cleanAIText(page.title, 300, settings);
  if (title) context.pageTitle = title;
  return context;
}

function samePage(a: string, b: string): boolean {
  try { return new URL(a).href === new URL(b).href; } catch { return false; }
}

export function matchesContextPage(bookmarkUrl: string, page: PageMetadata): boolean {
  return samePage(bookmarkUrl, page.url);
}

export function describeAIPageContext(page: PageMetadata | null, settings: AISettings): string {
  const mode = getAIPageContextMode(settings);
  if (mode === 'off') return 'AI context: titles and URLs only';
  const context = page && buildAIPageContext(page, settings);
  if (!context) return 'AI context: page context unavailable; using title and URL';
  if (context.contentExcerpt) return 'AI context: page metadata and short excerpt';
  return mode === 'content' ? 'AI context: page metadata; excerpt unavailable' : 'AI context: page metadata';
}

async function queryOpenTabs(): Promise<chrome.tabs.Tab[]> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return [];
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve([]), 1500);
    try {
      chrome.tabs.query({}, tabs => {
        const error = chrome.runtime?.lastError;
        clearTimeout(timer);
        resolve(error ? [] : tabs || []);
      });
    } catch { clearTimeout(timer); resolve([]); }
  });
}

async function readTabContext(tabId: number, url: string, settings: AISettings): Promise<PageMetadata | undefined> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(undefined), 1500);
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_PAGE_METADATA', includeContent: getAIPageContextMode(settings) === 'content',
      }, response => {
        const error = chrome.runtime?.lastError;
        clearTimeout(timer);
        const page = response?.metadata as PageMetadata | undefined;
        resolve(!error && response?.success && page && samePage(url, page.url) ? page : undefined);
      });
    } catch { clearTimeout(timer); resolve(undefined); }
  });
}

export async function readActivePageMetadata(tabId: number, url: string, title: string, settings: AISettings): Promise<PageMetadata> {
  const fallback: PageMetadata = { url, title, domain: '' };
  try { fallback.domain = new URL(url).hostname; } catch {}
  const page = await readTabContext(tabId, url, {
    ...settings,
    pageContextMode: settings.enabled && settings.provider !== 'disabled' && canSharePageContext(url, settings)
      ? getAIPageContextMode(settings) : 'off',
  });
  return page || fallback;
}

/** Reuse open pages only. Never navigate, fetch saved URLs, or persist page text. */
export async function collectOpenPageContexts(
  items: BookmarkItem[], settings: AISettings
): Promise<Record<string, PageMetadata>> {
  if (getAIPageContextMode(settings) === 'off' || !settings.enabled || settings.provider === 'disabled') return {};
  const eligible = items.filter(item => canSharePageContext(item.url, settings));
  if (!eligible.length) return {};
  const tabs = await queryOpenTabs();
  const result: Record<string, PageMetadata> = {};
  let next = 0;
  await Promise.all(Array.from({length: Math.min(4, eligible.length)}, async () => {
    while (next < eligible.length) {
      const item = eligible[next++];
      const tab = tabs.find(tab => tab.id !== undefined && tab.url && samePage(item.url, tab.url));
      if (tab?.id === undefined) continue;
      const page = await readTabContext(tab.id, item.url, settings);
      if (page) result[item.id] = page;
    }
  }));
  return result;
}
