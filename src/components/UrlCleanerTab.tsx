import React, { useState, useMemo } from 'react';
import { BookmarkItem, CleanUrlResult } from '../types';
import { sanitizeUrl } from '../services/urlSanitizer';
import { updateBookmarkUrl } from '../services/bookmarkManager';
import {
  Link2Off,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface UrlCleanerTabProps {
  bookmarks: BookmarkItem[];
  onReload: () => void;
}

interface DirtyBookmark {
  bookmark: BookmarkItem;
  cleanResult: CleanUrlResult;
  selected: boolean;
}

export const UrlCleanerTab: React.FC<UrlCleanerTabProps> = ({ bookmarks, onReload }) => {
  const [stripHash, setStripHash] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanedSuccessCount, setCleanedSuccessCount] = useState<number | null>(null);

  // Identify all bookmarks that have tracking parameters or need cleaning
  const dirtyList: DirtyBookmark[] = useMemo(() => {
    return bookmarks
      .map((bkm) => {
        const cleanResult = sanitizeUrl(bkm.url, { stripHash });
        return {
          bookmark: bkm,
          cleanResult,
          selected: cleanResult.hasChanges,
        };
      })
      .filter((item) => item.cleanResult.hasChanges);
  }, [bookmarks, stripHash]);

  const [items, setItems] = useState<DirtyBookmark[]>(dirtyList);

  // Sync items when dirtyList changes
  React.useEffect(() => {
    setItems(dirtyList);
    setCleanedSuccessCount(null);
  }, [dirtyList]);

  // Toggle selection
  const handleToggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select all / Deselect all
  const handleToggleAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Execute cleaning batch
  const handleCleanAll = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    if (
      !window.confirm(
        `Sanitize ${selectedItems.length} bookmark URLs? Tracking parameters (utm, fbclid, click IDs) will be removed.`
      )
    ) {
      return;
    }

    setIsCleaning(true);
    let count = 0;

    try {
      for (const item of selectedItems) {
        await updateBookmarkUrl(item.bookmark.id, item.cleanResult.cleanedUrl);
        count++;
      }
      setCleanedSuccessCount(count);
      onReload();
    } finally {
      setIsCleaning(false);
    }
  };

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link2Off className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">URL Sanitizer & Junk Stripper</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Removes telemetry tokens, marketing parameters (e.g. <code className="text-indigo-600">utm_*</code>,{' '}
              <code className="text-indigo-600">fbclid</code>, <code className="text-indigo-600">gclid</code>,{' '}
              <code className="text-indigo-600">si</code>), and normalizes long referral links into clean URLs.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={stripHash}
                onChange={(e) => setStripHash(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Also strip anchor hashes (#)</span>
            </label>
          </div>
        </div>

        {/* Clean action buttons */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div className="text-xs text-slate-600">
            {items.length === 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>All {bookmarks.length} bookmark URLs are clean! No tracking parameters found.</span>
              </span>
            ) : (
              <span>
                Found <strong className="text-indigo-600">{items.length}</strong> bookmarks with tracking parameters.
              </span>
            )}
          </div>

          {items.length > 0 && (
            <button
              onClick={handleCleanAll}
              disabled={isCleaning || selectedCount === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all ${
                isCleaning || selectedCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCleaning ? 'Cleaning URLs...' : `Clean Selected (${selectedCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {cleanedSuccessCount !== null && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Successfully cleaned and updated {cleanedSuccessCount} bookmark URLs!</span>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold text-slate-700">Affected Bookmarks Preview</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleAll(true)}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => handleToggleAll(false)}
                className="text-xs text-slate-500 hover:underline font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={item.bookmark.id}
                onClick={() => handleToggleItem(idx)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-start space-x-3 ${
                  item.selected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'opacity-60 hover:opacity-90'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => {}}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {item.bookmark.title}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({item.bookmark.folderPath})
                    </span>
                  </div>

                  {/* Stripped parameters badges */}
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-slate-400 font-medium">Removed junk:</span>
                    {item.cleanResult.strippedParams.map((param, pIdx) => (
                      <span
                        key={pIdx}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium"
                      >
                        {param}
                      </span>
                    ))}
                  </div>

                  {/* URL Diff View */}
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-slate-400 line-through truncate max-w-2xl">
                      {item.cleanResult.originalUrl}
                    </div>
                    <div className="text-indigo-700 font-semibold truncate max-w-2xl flex items-center space-x-1">
                      <ArrowRight className="w-3 h-3 inline-block shrink-0" />
                      <span>{item.cleanResult.cleanedUrl}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
