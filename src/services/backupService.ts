import { getBookmarkTree } from './bookmarkManager';
import { BookmarkFolder, BookmarkItem } from '../types';

/**
 * Creates an exportable JSON snapshot of all current bookmarks
 */
export async function createBookmarkSnapshot(): Promise<{ timestamp: number; data: BookmarkFolder[] }> {
  const tree = await getBookmarkTree();
  const snapshot = {
    timestamp: Date.now(),
    data: tree,
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ lastBookmarkSnapshot: snapshot });
  }

  return snapshot;
}

/**
 * Triggers a download of the bookmarks snapshot as a JSON file
 */
export async function downloadJsonBackup(): Promise<void> {
  const snapshot = await createBookmarkSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const a = document.createElement('a');
  a.href = url;
  a.download = `edgemark-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates standard Netscape Bookmark HTML file format for universal browser compatibility
 */
export async function downloadNetscapeHtmlBackup(): Promise<void> {
  const tree = await getBookmarkTree();
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  function renderNode(node: BookmarkFolder | BookmarkItem, indent = '    ') {
    if ('url' in node && node.url) {
      const addDate = Math.floor((node.dateAdded || Date.now()) / 1000);
      html += `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(node.title || node.url)}</A>\n`;
    } else if ('children' in node && node.children) {
      const folder = node as BookmarkFolder;
      html += `${indent}<DT><H3>${escapeHtml(folder.title || 'Folder')}</H3>\n`;
      html += `${indent}<DL><p>\n`;
      if (folder.children) {
        for (const child of folder.children) {
          renderNode(child, indent + '    ');
        }
      }
      html += `${indent}</DL><p>\n`;
    }
  }

  for (const root of tree) {
    if (root.children) {
      for (const child of root.children) {
        renderNode(child);
      }
    }
  }

  html += `</DL><p>\n`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const a = document.createElement('a');
  a.href = url;
  a.download = `edge-bookmarks-${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
