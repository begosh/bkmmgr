import {
  FolderSortOptions,
  FolderSortPreview,
  FolderSortPreviewItem,
  DividerStyle,
} from '../types';
import {
  getFolderChildren,
  moveBookmark,
  createBookmark,
  deleteBookmark,
  getBookmarkTree,
} from './bookmarkManager';
import { createBookmarkSnapshot } from './backupService';

export const DIVIDER_URL = 'about:blank#separator';

/**
 * Checks if a bookmark item or node is a visual divider/separator
 */
export function isDividerBookmark(node: { url?: string; title?: string }): boolean {
  if (node.url && (node.url.startsWith('about:blank#separator') || node.url.startsWith('data:text/html,<title>Divider'))) {
    return true;
  }
  const title = (node.title || '').trim();
  return (
    title.startsWith('───') ||
    title.startsWith('───') ||
    title.startsWith('──────') ||
    title.startsWith('---') ||
    title === '────────────────────'
  );
}

/**
 * Normalizes URL to its domain name
 */
export function getDomainFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'other';
  }
}

const KNOWN_BRANDS: Record<string, string> = {
  'github.com': 'GitHub',
  'azure.com': 'Azure',
  'portal.azure.com': 'Azure',
  'learn.microsoft.com': 'Microsoft Learn',
  'microsoft.com': 'Microsoft',
  'aws.amazon.com': 'AWS',
  'amazon.com': 'Amazon',
  'google.com': 'Google',
  'reddit.com': 'Reddit',
  'linear.app': 'Linear',
  'notion.so': 'Notion',
  'jira.com': 'Jira',
  'atlassian.com': 'Atlassian',
  'servicenow.com': 'ServiceNow',
  'service-now.com': 'ServiceNow',
  'skf.net': 'SKF Internal',
  'skf.com': 'SKF Portal',
  'youtube.com': 'YouTube',
  'docker.com': 'Docker',
  'kubernetes.io': 'Kubernetes',
  'openai.com': 'OpenAI',
  'chatgpt.com': 'ChatGPT',
  'stackoverflow.com': 'Stack Overflow',
  'wikipedia.org': 'Wikipedia',
};

/**
 * Formats a clean display name for a domain
 */
export function getDomainDisplayName(domain: string): string {
  if (!domain || domain === 'other') return 'General Links';

  const clean = domain.toLowerCase().replace(/^(www\.|portal\.|login\.|app\.)+/, '');
  if (KNOWN_BRANDS[clean]) return KNOWN_BRANDS[clean];
  if (KNOWN_BRANDS[domain.toLowerCase()]) return KNOWN_BRANDS[domain.toLowerCase()];

  // Check homelab / local network (.lan, .local, .home)
  if (clean.endsWith('.lan') || clean.endsWith('.local') || clean.endsWith('.home')) {
    const host = clean.split('.')[0];
    return `${host.charAt(0).toUpperCase() + host.slice(1)} (Homelab)`;
  }

  // Capitalize main domain
  const parts = clean.split('.');
  if (parts.length >= 2) {
    const main = parts[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  }

  return clean;
}

/**
 * Formats divider title string based on style
 */
export function formatDividerTitle(style: DividerStyle, domain: string): string {
  if (style === 'domain-named') {
    const label = getDomainDisplayName(domain);
    return `─── ${label} ───`;
  }
  if (style === 'clean-line') {
    return '────────────────────';
  }
  return '';
}

/**
 * Sorts bookmark items by the specified criteria
 */
export function sortBookmarkList<T extends { title?: string; url?: string; dateAdded?: number }>(
  items: T[],
  options: FolderSortOptions
): T[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    const titleA = (a.title || '').trim().toLowerCase();
    const titleB = (b.title || '').trim().toLowerCase();

    switch (options.criteria) {
      case 'domain-alpha': {
        const domA = getDomainFromUrl(a.url || '');
        const domB = getDomainFromUrl(b.url || '');
        const nameA = getDomainDisplayName(domA);
        const nameB = getDomainDisplayName(domB);
        const domCmp = nameA.localeCompare(nameB);
        if (domCmp !== 0) return domCmp;
        return titleA.localeCompare(titleB);
      }
      case 'alpha-asc':
        return titleA.localeCompare(titleB);
      case 'alpha-desc':
        return titleB.localeCompare(titleA);
      case 'date-desc':
        return (b.dateAdded || 0) - (a.dateAdded || 0);
      case 'date-asc':
        return (a.dateAdded || 0) - (b.dateAdded || 0);
      default:
        return titleA.localeCompare(titleB);
    }
  });

  return sorted;
}

/**
 * Builds the final sequence of items with dividers inserted between domain groups
 */
export function generatePlannedItemsWithDividers<T extends { id?: string; title?: string; url?: string }>(
  sortedBookmarks: T[],
  options: FolderSortOptions
): FolderSortPreviewItem[] {
  if (sortedBookmarks.length === 0) return [];

  // If no dividers requested or sort criteria is pure date/alpha without domain clustering
  if (options.dividerStyle === 'none' || options.criteria !== 'domain-alpha') {
    return sortedBookmarks.map((b) => ({
      id: b.id,
      title: b.title || b.url || 'Untitled',
      url: b.url,
      isDivider: false,
      domain: getDomainFromUrl(b.url || ''),
    }));
  }

  // Group by friendly domain display name (e.g. portal.azure.com and azure.com group under Azure)
  const domainGroups = new Map<string, { label: string; items: T[] }>();
  for (const b of sortedBookmarks) {
    const rawDomain = getDomainFromUrl(b.url || '');
    const displayName = getDomainDisplayName(rawDomain);
    const group = domainGroups.get(displayName) || { label: displayName, items: [] };
    group.items.push(b);
    domainGroups.set(displayName, group);
  }

  // If folder only contains links from 1 single domain group, dividers are redundant
  if (domainGroups.size < 2) {
    return sortedBookmarks.map((b) => ({
      id: b.id,
      title: b.title || b.url || 'Untitled',
      url: b.url,
      isDivider: false,
      domain: getDomainFromUrl(b.url || ''),
    }));
  }

  const result: FolderSortPreviewItem[] = [];
  let isFirstGroup = true;

  for (const [displayName, group] of domainGroups.entries()) {
    if (options.dividerStyle === 'domain-named') {
      result.push({
        title: `─── ${displayName} ───`,
        url: DIVIDER_URL,
        isDivider: true,
        domain: displayName,
      });
    } else if (options.dividerStyle === 'clean-line' && !isFirstGroup) {
      result.push({
        title: formatDividerTitle('clean-line', ''),
        url: DIVIDER_URL,
        isDivider: true,
        domain: displayName,
      });
    }

    for (const item of group.items) {
      result.push({
        id: item.id,
        title: item.title || item.url || 'Untitled',
        url: item.url,
        isDivider: false,
        domain: getDomainFromUrl(item.url || ''),
      });
    }

    isFirstGroup = false;
  }

  return result;
}

/**
 * Previews the sort and divider outcome for a given folder
 */
export async function previewFolderSort(
  folderId: string,
  folderTitle: string,
  folderPath: string,
  options: FolderSortOptions
): Promise<FolderSortPreview> {
  const children = await getFolderChildren(folderId);

  // Filter out existing divider bookmarks
  const actualBookmarks = children.filter((c) => Boolean(c.url) && !isDividerBookmark(c));
  const sorted = sortBookmarkList(actualBookmarks, options);
  const planned = generatePlannedItemsWithDividers(sorted, options);

  const uniqueDomains = new Set(actualBookmarks.map((b) => getDomainFromUrl(b.url || '')));

  return {
    folderId,
    folderTitle,
    folderPath,
    itemCount: actualBookmarks.length,
    domainCount: uniqueDomains.size,
    items: planned,
  };
}

/**
 * Sorts bookmarks inside a single folder in Edge and inserts requested dividers
 */
export async function sortFolder(
  folderId: string,
  options: FolderSortOptions = { criteria: 'domain-alpha', dividerStyle: 'domain-named', sortSubfoldersFirst: true }
): Promise<{ modifiedCount: number; dividersCreated: number }> {
  const children = await getFolderChildren(folderId);

  // 1. Separate subfolders, dividers, and bookmarks
  const subfolders = children.filter((c) => !c.url);
  const existingDividers = children.filter((c) => isDividerBookmark(c));
  const bookmarks = children.filter((c) => Boolean(c.url) && !isDividerBookmark(c));

  if (bookmarks.length === 0) {
    return { modifiedCount: 0, dividersCreated: 0 };
  }

  // 2. Remove stale existing dividers so they never duplicate
  for (const div of existingDividers) {
    await deleteBookmark(div.id);
  }

  // 3. Sort bookmarks
  const sortedBookmarks = sortBookmarkList(bookmarks, options);
  const plannedItems = generatePlannedItemsWithDividers(sortedBookmarks, options);

  // 4. Calculate starting index (subfolders at top if sortSubfoldersFirst is true)
  const sortSubfoldersFirst = options.sortSubfoldersFirst !== false;
  let currentIndex = sortSubfoldersFirst ? subfolders.length : 0;

  // If subfolders first, ensure subfolders are in positions 0..subfolders.length-1
  if (sortSubfoldersFirst) {
    for (let i = 0; i < subfolders.length; i++) {
      await moveBookmark(subfolders[i].id, folderId, i);
    }
  }

  let dividersCreated = 0;

  // 5. Position bookmarks and create dividers
  for (const item of plannedItems) {
    if (item.isDivider) {
      await createBookmark(item.title, DIVIDER_URL, folderId, currentIndex);
      dividersCreated++;
    } else if (item.id) {
      await moveBookmark(item.id, folderId, currentIndex);
    }
    currentIndex++;
  }

  return {
    modifiedCount: bookmarks.length,
    dividersCreated,
  };
}

/**
 * Recursively retrieves all folder IDs under a root node
 */
function collectFolderNodes(
  node: chrome.bookmarks.BookmarkTreeNode | any,
  currentPath = ''
): { id: string; title: string; path: string; childBookmarkCount: number }[] {
  const folders: { id: string; title: string; path: string; childBookmarkCount: number }[] = [];
  const nextPath = node.title ? (currentPath ? `${currentPath} / ${node.title}` : node.title) : currentPath;

  if (!node.url && node.id) {
    const childBookmarks = (node.children || []).filter((c: any) => Boolean(c.url) && !isDividerBookmark(c));
    folders.push({
      id: node.id,
      title: node.title || 'Folder',
      path: nextPath || 'Favorites bar',
      childBookmarkCount: childBookmarks.length,
    });
  }

  if (node.children) {
    for (const child of node.children) {
      if (!child.url) {
        folders.push(...collectFolderNodes(child, nextPath));
      }
    }
  }

  return folders;
}

/**
 * Sorts all folders in the bookmark tree matching the options
 */
export async function sortAllFolders(
  options: FolderSortOptions,
  onProgress?: (completed: number, total: number, currentFolder: string) => void
): Promise<{ foldersSorted: number; bookmarksSorted: number; dividersCreated: number }> {
  // Take safety backup snapshot first
  await createBookmarkSnapshot();

  const tree = await getBookmarkTree();
  let allFolders: { id: string; title: string; path: string; childBookmarkCount: number }[] = [];

  for (const root of tree) {
    allFolders.push(...collectFolderNodes(root));
  }

  // Filter to folders that actually contain at least 2 bookmarks
  const candidateFolders = allFolders.filter((f) => f.childBookmarkCount >= 2);

  let foldersSorted = 0;
  let bookmarksSorted = 0;
  let dividersCreated = 0;

  for (let i = 0; i < candidateFolders.length; i++) {
    const f = candidateFolders[i];
    if (onProgress) {
      onProgress(i + 1, candidateFolders.length, f.path);
    }

    try {
      const res = await sortFolder(f.id, options);
      if (res.modifiedCount > 0) {
        foldersSorted++;
        bookmarksSorted += res.modifiedCount;
        dividersCreated += res.dividersCreated;
      }
    } catch (err) {
      console.warn(`Failed to sort folder "${f.path}":`, err);
    }
  }

  return { foldersSorted, bookmarksSorted, dividersCreated };
}
