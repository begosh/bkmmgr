import { BookmarkItem, BookmarkFolder, EmptyFolderItem } from '../types';

// Check if running inside Chrome / Edge extension environment
export const isExtensionEnvironment = typeof chrome !== 'undefined' && Boolean(chrome.bookmarks);

const bookmarksApi = () => (chrome.bookmarks as any);

// System protected root folder titles and IDs that must never be deleted
export const SYSTEM_FOLDER_IDS: ReadonlySet<string> = new Set(['0', '1', '2', '3']);
export const SYSTEM_FOLDER_TITLES: ReadonlySet<string> = new Set([
  'favorites bar',
  'other favorites',
  'mobile favorites',
  'bookmarks bar',
  'other bookmarks',
  'synced bookmarks',
  'managed bookmarks',
]);

let mockEmptyFolders: EmptyFolderItem[] = [
  {
    id: 'mock-empty-1',
    title: 'Vacant Old Folder',
    folderPath: 'Favorites bar / Vacant Old Folder',
    depth: 2,
  },
  {
    id: 'mock-empty-2',
    title: 'Temporary Downloads',
    folderPath: 'Other favorites / Temporary Downloads',
    depth: 2,
  },
];

// Mock bookmark data for local development/testing outside the extension
const MOCK_BOOKMARKS: BookmarkItem[] = [
  {
    id: 'mock-1',
    title: 'Vite | Next Generation Frontend Tooling',
    url: 'https://vitejs.dev/?utm_source=docs&utm_medium=referral',
    folderPath: 'Favorites bar / Web Dev',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'mock-2',
    title: 'Vite Next Gen Tooling (Duplicate)',
    url: 'https://vitejs.dev/',
    folderPath: 'Other favorites / Unsorted',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'mock-3',
    title: 'MDN Web Docs: Array.prototype.map()',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map?ref=dev_newsletter',
    folderPath: 'Favorites bar / Docs',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'mock-4',
    title: 'Linear – A better way to build products',
    url: 'https://linear.app/?source=twitter&fbclid=IwAR3xYz99',
    folderPath: 'Favorites bar / Work',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'mock-5',
    title: 'Dead Example Page (Returns 404)',
    url: 'https://httpstat.us/404',
    folderPath: 'Other favorites / Old Links',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 100,
  },
  {
    id: 'mock-6',
    title: 'Redirect Test (301 to Target)',
    url: 'https://httpstat.us/301',
    folderPath: 'Other favorites / Old Links',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 60,
  },
  {
    id: 'mock-7',
    title: 'AWS Management Console',
    url: 'https://aws.amazon.com/console/',
    folderPath: 'Favorites bar / Cloud',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
  {
    id: 'mock-8',
    title: 'Figma: Collaborative Interface Design Tool',
    url: 'https://www.figma.com/?utm_campaign=product_launch',
    folderPath: 'Favorites bar / Design',
    dateAdded: Date.now() - 1000 * 60 * 60 * 24 * 15,
  }
];

let mockState = [...MOCK_BOOKMARKS];

/**
 * Retrieves all bookmarks flattened with full folder path hierarchy
 */
export async function getAllBookmarks(): Promise<BookmarkItem[]> {
  if (!isExtensionEnvironment) {
    return [...mockState];
  }

  const tree: chrome.bookmarks.BookmarkTreeNode[] = await new Promise((resolve) => {
    bookmarksApi().getTree((results: chrome.bookmarks.BookmarkTreeNode[]) => resolve(results));
  });

  const items: BookmarkItem[] = [];

  function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[], currentPath: string[]) {
    for (const node of nodes) {
      const nextPath = node.title ? [...currentPath, node.title] : currentPath;

      if (node.url) {
        items.push({
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          parentId: node.parentId,
          dateAdded: node.dateAdded,
          folderPath: currentPath.join(' / ') || 'Favorites bar',
        });
      }

      if (node.children) {
        traverse(node.children, nextPath);
      }
    }
  }

  traverse(tree, []);
  return items;
}

/**
 * Retrieves the full hierarchical bookmark folder tree
 */
export async function getBookmarkTree(): Promise<BookmarkFolder[]> {
  if (!isExtensionEnvironment) {
    return [
      {
        id: 'root-1',
        title: 'Favorites bar',
        children: mockState,
      },
    ];
  }

  const rawTree: chrome.bookmarks.BookmarkTreeNode[] = await new Promise((resolve) => {
    bookmarksApi().getTree((results: chrome.bookmarks.BookmarkTreeNode[]) => resolve(results));
  });

  function mapNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkFolder | BookmarkItem {
    if (node.url) {
      return {
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        parentId: node.parentId,
        dateAdded: node.dateAdded,
      };
    }

    return {
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      children: node.children?.map(mapNode) || [],
    };
  }

  return rawTree.map(mapNode) as BookmarkFolder[];
}

/**
 * Updates a bookmark's URL
 */
export async function updateBookmarkUrl(id: string, newUrl: string): Promise<void> {
  if (!isExtensionEnvironment) {
    mockState = mockState.map((b) => (b.id === id ? { ...b, url: newUrl } : b));
    return;
  }
  await new Promise<void>((resolve) => {
    bookmarksApi().update(id, { url: newUrl }, () => resolve());
  });
}

/**
 * Updates a bookmark's title
 */
export async function updateBookmarkTitle(id: string, newTitle: string): Promise<void> {
  if (!isExtensionEnvironment) {
    mockState = mockState.map((b) => (b.id === id ? { ...b, title: newTitle } : b));
    return;
  }
  await new Promise<void>((resolve) => {
    bookmarksApi().update(id, { title: newTitle }, () => resolve());
  });
}

/**
 * Removes a bookmark by ID
 */
export async function deleteBookmark(id: string): Promise<void> {
  if (!isExtensionEnvironment) {
    mockState = mockState.filter((b) => b.id !== id);
    return;
  }
  await new Promise<void>((resolve) => {
    bookmarksApi().remove(id, () => resolve());
  });
}

/**
 * Moves a bookmark to a destination folder, optionally at a specific index
 */
export async function moveBookmark(id: string, parentId: string, index?: number): Promise<void> {
  if (!isExtensionEnvironment) {
    mockState = mockState.map((b) => (b.id === id ? { ...b, parentId } : b));
    return;
  }
  await new Promise<void>((resolve) => {
    const destination: { parentId: string; index?: number } = { parentId };
    if (typeof index === 'number') {
      destination.index = index;
    }
    bookmarksApi().move(id, destination, () => resolve());
  });
}

/**
 * Creates a new bookmark, optionally with a specific index
 */
export async function createBookmark(
  title: string,
  url: string,
  parentId?: string,
  index?: number
): Promise<BookmarkItem> {
  if (!isExtensionEnvironment) {
    const newBkm: BookmarkItem = {
      id: `mock-${Date.now()}`,
      title,
      url,
      parentId: parentId || 'root-1',
      dateAdded: Date.now(),
    };
    if (typeof index === 'number' && index >= 0 && index <= mockState.length) {
      mockState.splice(index, 0, newBkm);
    } else {
      mockState.push(newBkm);
    }
    return newBkm;
  }

  const payload: { title: string; url: string; parentId?: string; index?: number } = { title, url };
  if (parentId) payload.parentId = parentId;
  if (typeof index === 'number') payload.index = index;

  const created: chrome.bookmarks.BookmarkTreeNode = await new Promise((resolve) => {
    bookmarksApi().create(payload, (res: chrome.bookmarks.BookmarkTreeNode) => resolve(res));
  });

  return {
    id: created.id,
    title: created.title,
    url: created.url || url,
    parentId: created.parentId,
    dateAdded: created.dateAdded,
  };
}

/**
 * Gets direct children (bookmarks & subfolders) for a given folder ID
 */
export async function getFolderChildren(folderId: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  if (!isExtensionEnvironment) {
    return mockState
      .filter((b) => b.parentId === folderId)
      .map((b) => ({
        id: b.id,
        title: b.title,
        url: b.url,
        parentId: b.parentId,
        dateAdded: b.dateAdded,
      }));
  }

  return new Promise((resolve) => {
    bookmarksApi().getChildren(folderId, (res: chrome.bookmarks.BookmarkTreeNode[]) => resolve(res || []));
  });
}

/**
 * Finds or creates a nested folder structure like ["3. Resources", "Development & Code"]
 * Returns the final folder's ID.
 */
export async function ensureFolderPath(
  pathSegments: string[],
  targetRootFolderTitle = 'Favorites bar'
): Promise<string> {
  if (!isExtensionEnvironment) {
    return 'mock-folder-id';
  }

  const tree: chrome.bookmarks.BookmarkTreeNode[] = await new Promise((resolve) => {
    bookmarksApi().getTree((results: chrome.bookmarks.BookmarkTreeNode[]) => resolve(results));
  });

  const topFolders = tree[0]?.children || [];
  let currentParent = topFolders.find((f) => f.title.toLowerCase().includes(targetRootFolderTitle.toLowerCase())) || topFolders[0];

  let currentParentId = currentParent?.id || '1';

  for (const segment of pathSegments) {
    if (!segment.trim()) continue;

    const children: chrome.bookmarks.BookmarkTreeNode[] = await new Promise((resolve) => {
      bookmarksApi().getChildren(currentParentId, (res: chrome.bookmarks.BookmarkTreeNode[]) => resolve(res));
    });

    const existingFolder = children.find((c) => !c.url && c.title.toLowerCase() === segment.toLowerCase());

    if (existingFolder) {
      currentParentId = existingFolder.id;
    } else {
      const newFolder: chrome.bookmarks.BookmarkTreeNode = await new Promise((resolve) => {
        bookmarksApi().create({ parentId: currentParentId, title: segment }, (res: chrome.bookmarks.BookmarkTreeNode) => resolve(res));
      });
      currentParentId = newFolder.id;
    }
  }

  return currentParentId;
}

/**
 * Recursively inspects the bookmark tree and returns all empty folders
 * (folders with no descendant bookmarks), sorted by depth descending (deepest first).
 */
export async function findEmptyFolders(): Promise<EmptyFolderItem[]> {
  if (!isExtensionEnvironment) {
    return [...mockEmptyFolders];
  }

  const rawTree: chrome.bookmarks.BookmarkTreeNode[] = await new Promise((resolve) => {
    bookmarksApi().getTree((results: chrome.bookmarks.BookmarkTreeNode[]) => resolve(results));
  });

  const emptyFolders: EmptyFolderItem[] = [];

  // Helper returns whether a node contains any bookmarks
  function checkNode(node: chrome.bookmarks.BookmarkTreeNode, currentPath: string[]): boolean {
    const isFolder = !node.url;
    const nextPath = node.title ? [...currentPath, node.title] : currentPath;

    if (!isFolder) {
      return true; // Node itself is a bookmark
    }

    let hasBookmarks = false;
    if (node.children) {
      for (const child of node.children) {
        const childHasBookmarks = checkNode(child, nextPath);
        if (childHasBookmarks) {
          hasBookmarks = true;
        }
      }
    }

    // Check if this folder is a system root
    const isSystemRoot =
      SYSTEM_FOLDER_IDS.has(node.id) ||
      !node.parentId ||
      node.parentId === '0' ||
      SYSTEM_FOLDER_TITLES.has((node.title || '').trim().toLowerCase());

    // If it's a user folder and has NO bookmarks in its tree, it's empty!
    if (!isSystemRoot && !hasBookmarks) {
      emptyFolders.push({
        id: node.id,
        title: node.title || 'Untitled Folder',
        folderPath: nextPath.join(' / ') || node.title || 'Folder',
        parentId: node.parentId,
        depth: nextPath.length,
      });
    }

    return hasBookmarks;
  }

  for (const root of rawTree) {
    checkNode(root, []);
  }

  // Sort by depth descending so child folders are placed before parent folders
  emptyFolders.sort((a, b) => b.depth - a.depth);
  return emptyFolders;
}

/**
 * Removes a folder (and any empty subfolders inside it)
 */
export async function deleteFolder(id: string): Promise<void> {
  if (SYSTEM_FOLDER_IDS.has(id)) {
    throw new Error('Cannot delete system protected bookmark folder');
  }

  if (!isExtensionEnvironment) {
    mockEmptyFolders = mockEmptyFolders.filter((f) => f.id !== id);
    return;
  }

  await new Promise<void>((resolve) => {
    bookmarksApi().removeTree(id, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        // Fallback to remove() in case removeTree is restricted
        bookmarksApi().remove(id, () => resolve());
      } else {
        resolve();
      }
    });
  });
}

/**
 * Batch deletes empty folders safely
 */
export async function batchDeleteEmptyFolders(ids: string[]): Promise<number> {
  let count = 0;
  for (const id of ids) {
    try {
      await deleteFolder(id);
      count++;
    } catch {
      // Ignore if folder was already deleted as child of previously deleted parent
    }
  }
  return count;
}
