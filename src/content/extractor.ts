import { extractMetadataFromDocument } from '../services/metadataExtractor';

// Content script running in the context of the active web page
(() => {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
    return;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_METADATA') {
      try {
        const metadata = extractMetadataFromDocument(document, window.location.href, message.includeContent === true);
        sendResponse({ success: true, metadata });
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || 'Failed to extract metadata' });
      }
      return true; // Keep message channel open for async response
    }
  });
})();
