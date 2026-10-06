import { BookmarkItem, DuplicateGroup } from '../types';
import { getNormalizedComparisonUrl } from './urlSanitizer';

/**
 * Finds all duplicate bookmarks across the library.
 * Groups by normalized comparison URL.
 */
export function findDuplicates(bookmarks: BookmarkItem[]): DuplicateGroup[] {
  const urlMap = new Map<string, BookmarkItem[]>();

  for (const bkm of bookmarks) {
    if (!bkm.url || !bkm.url.startsWith('http')) {
      continue;
    }
    const normalized = getNormalizedComparisonUrl(bkm.url);
    const existing = urlMap.get(normalized) || [];
    existing.push(bkm);
    urlMap.set(normalized, existing);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  let groupIdCounter = 1;

  for (const [normalizedUrl, items] of urlMap.entries()) {
    if (items.length > 1) {
      // Sort items: preferred primary is oldest dateAdded, or first created
      items.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));

      const primary = items[0];
      const duplicates = items.slice(1);

      // Check if exact or normalized match
      const isExact = duplicates.every((d) => d.url === primary.url);

      duplicateGroups.push({
        id: `dup-${groupIdCounter++}`,
        normalizedUrl,
        primary,
        duplicates,
        matchType: isExact ? 'exact' : 'normalized',
      });
    }
  }

  return duplicateGroups;
}
