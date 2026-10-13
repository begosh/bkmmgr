const KEY = 'edgemark_toolbar_opens_sidebar';

export async function getToolbarOpensSidebar(): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise(resolve => chrome.storage.local.get([KEY], saved => resolve(saved[KEY] === true)));
  }
  return localStorage.getItem(KEY) === 'true';
}

export async function applyToolbarBehavior(enabled: boolean): Promise<void> {
  if (typeof chrome === 'undefined') return;
  const api = chrome as any;
  if (!api.action?.setPopup) return;
  if (enabled && !api.sidePanel?.open) throw new Error('This browser does not support the extension sidebar. Update Edge or Chrome.');
  // Removing the popup enables action.onClicked, which opens a window-wide panel.
  await api.action.setPopup({popup: enabled ? '' : 'src/popup/index.html'});
  await api.action.setTitle({title: enabled ? 'Open EdgeMark bookmarks sidebar' : 'EdgeMark Quick Save'});
}

export async function setToolbarOpensSidebar(enabled: boolean): Promise<void> {
  await applyToolbarBehavior(enabled);
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({[KEY]: enabled});
  } else localStorage.setItem(KEY, String(enabled));
}
