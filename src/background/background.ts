import { sanitizeUrl } from '../services/urlSanitizer';
import { createBookmark, ensureFolderPath } from '../services/bookmarkManager';
import { proposeBookmarkFolder } from '../services/classifier';
import { PageMetadata } from '../types';
import { applyToolbarBehavior, getToolbarOpensSidebar } from '../services/sidePanelPreferences';

const restoreToolbar = () => getToolbarOpensSidebar().then(applyToolbarBehavior).catch(console.warn);
restoreToolbar();
chrome.runtime.onStartup.addListener(restoreToolbar);
const browserApi = chrome as any;
browserApi.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  if (tab.windowId !== undefined) browserApi.sidePanel.open({windowId: tab.windowId}).catch(console.warn);
});
browserApi.commands.onCommand.addListener((command: string, tab?: chrome.tabs.Tab) => {
  if (command !== 'open-bookmarks-sidebar') return;
  if (tab?.windowId !== undefined) browserApi.sidePanel.open({windowId: tab.windowId}).catch(console.warn);
  else browserApi.windows.getLastFocused().then((window: chrome.windows.Window) => {
    if (window.id !== undefined) return browserApi.sidePanel.open({windowId: window.id});
  }).catch(console.warn);
});

// Initialize context menus and extension behavior on install
chrome.runtime.onInstalled.addListener(() => {
  restoreToolbar();
  // Context menus for quick actions
  chrome.contextMenus.create({
    id: 'edgemark_clean_save',
    title: 'Clean URL & Add to Smart Bookmarks',
    contexts: ['page', 'link'],
  });

  chrome.contextMenus.create({
    id: 'edgemark_open_manager',
    title: 'Open Edge Bookmark Manager Dashboard',
    contexts: ['action'],
  });

  // Enable side panel on Edge / Chrome
  const chromeAny = chrome as any;
  if (chromeAny.sidePanel?.setPanelBehavior) {
    chromeAny.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
      // In case sidePanel isn't supported in this specific browser version
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'edgemark_open_manager') {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (info.menuItemId === 'edgemark_clean_save') {
    const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
    if (!targetUrl) return;

    const cleaned = sanitizeUrl(targetUrl).cleanedUrl;
    const title = tab?.title || targetUrl;

    let domain = '';
    try {
      domain = new URL(cleaned).hostname;
    } catch {
      domain = '';
    }

    const meta: PageMetadata = {
      url: cleaned,
      title,
      domain,
    };

    const proposal = proposeBookmarkFolder(meta);
    const folderId = await ensureFolderPath(proposal.fullPath);
    await createBookmark(title, cleaned, folderId);

    // Show a lightweight badge notification
    const chromeAny = chrome as any;
    if (tab?.id && chromeAny.action) {
      chromeAny.action.setBadgeText({ tabId: tab.id, text: '✓' });
      chromeAny.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#107C41' });
      setTimeout(() => {
        chromeAny.action.setBadgeText({ tabId: tab.id, text: '' });
      }, 2500);
    }
  }
});
