import React, { useState, useEffect } from 'react';
import {
  BookmarkItem,
  LinkHealthResult,
  DuplicateGroup,
  EmptyFolderItem,
} from '../types';
import { batchCheckHealth, getWaybackUrl, isLoginOrAuthRedirect } from '../services/healthChecker';
import { findDuplicates } from '../services/deduplicator';
import {
  deleteBookmark,
  updateBookmarkUrl,
  findEmptyFolders,
  deleteFolder,
  batchDeleteEmptyFolders,
} from '../services/bookmarkManager';
import { createBookmarkSnapshot } from '../services/backupService';
import {
  ShieldAlert,
  RotateCw,
  ExternalLink,
  Trash2,
  Copy,
  ArrowRight,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  FolderX,
  FolderOpen,
  Lock,
} from 'lucide-react';

interface AuditTabProps {
  bookmarks: BookmarkItem[];
  onReload: () => void;
}

export const AuditTab: React.FC<AuditTabProps> = ({ bookmarks, onReload }) => {
  const [healthResults, setHealthResults] = useState<LinkHealthResult[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>(() =>
    findDuplicates(bookmarks)
  );
  const [emptyFolders, setEmptyFolders] = useState<EmptyFolderItem[]>([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthProgress, setHealthProgress] = useState<{
    completed: number;
    total: number;
    currentTitle: string;
  } | null>(null);

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'broken' | 'redirect' | 'duplicates' | 'empty' | 'alive'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load empty folders from Edge
  const loadEmptyFolders = async () => {
    try {
      const folders = await findEmptyFolders();
      setEmptyFolders(folders);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadEmptyFolders();
  }, [bookmarks]);

  // Run health check on all bookmarks
  const handleStartHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthProgress({ completed: 0, total: bookmarks.length, currentTitle: 'Starting...' });

    try {
      const results = await batchCheckHealth(bookmarks, {
        concurrency: 5,
        timeoutMs: 7000,
        onProgress: (p) => setHealthProgress(p),
      });
      setHealthResults(results);
      setDuplicateGroups(findDuplicates(bookmarks));
      await loadEmptyFolders();
    } finally {
      setIsCheckingHealth(false);
      setHealthProgress(null);
    }
  };

  // Delete single bookmark
  const handleDeleteItem = async (id: string) => {
    await deleteBookmark(id);
    setHealthResults((prev) => prev.filter((r) => r.id !== id));
    await loadEmptyFolders();
    onReload();
  };

  // Delete single empty folder
  const handleDeleteEmptyFolder = async (id: string) => {
    await deleteFolder(id);
    await loadEmptyFolders();
    onReload();
  };

  // Delete all empty folders in 1 click
  const handleDeleteAllEmptyFolders = async () => {
    if (emptyFolders.length === 0) return;
    if (
      !window.confirm(
        `Delete ${emptyFolders.length} empty folders? A safety backup snapshot will be saved first.`
      )
    ) {
      return;
    }

    await createBookmarkSnapshot();
    await batchDeleteEmptyFolders(emptyFolders.map((f) => f.id));
    await loadEmptyFolders();
    onReload();
  };

  // Update redirect target
  const handleApplyRedirect = async (id: string, redirectUrl: string, originalUrl?: string) => {
    if (originalUrl) {
      const authCheck = isLoginOrAuthRedirect(originalUrl, redirectUrl);
      if (authCheck.isAuthRedirect) {
        alert(
          `Cannot update bookmark to:\n${redirectUrl}\n\nThis is an authentication gateway (${authCheck.providerName}). Replacing your bookmark with this URL would destroy your original link!`
        );
        return;
      }
    }
    await createBookmarkSnapshot();
    await updateBookmarkUrl(id, redirectUrl);
    setHealthResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, url: redirectUrl, status: 'alive' } : r))
    );
    onReload();
  };

  // Delete all broken links in 1 click
  const handleDeleteAllBroken = async () => {
    const brokenItems = healthResults.filter((r) => r.status === 'broken' || r.status === 'timeout');
    if (!window.confirm(`Are you sure you want to delete ${brokenItems.length} dead bookmarks?`)) {
      return;
    }
    await createBookmarkSnapshot();
    for (const item of brokenItems) {
      await deleteBookmark(item.id);
    }
    setHealthResults((prev) => prev.filter((r) => r.status !== 'broken' && r.status !== 'timeout'));
    await loadEmptyFolders();
    onReload();
  };

  // Clean all exact duplicates (keep primary)
  const handleResolveAllDuplicates = async () => {
    const duplicateIdsToDelete: string[] = [];
    duplicateGroups.forEach((g) => {
      g.duplicates.forEach((d) => duplicateIdsToDelete.push(d.id));
    });

    if (
      !window.confirm(
        `Are you sure you want to remove ${duplicateIdsToDelete.length} duplicate bookmarks? The primary bookmark in each group will be kept.`
      )
    ) {
      return;
    }

    await createBookmarkSnapshot();
    for (const id of duplicateIdsToDelete) {
      await deleteBookmark(id);
    }
    setDuplicateGroups([]);
    await loadEmptyFolders();
    onReload();
  };

  // Update all permanent redirects
  const handleUpdateAllRedirects = async () => {
    const redirectItems = healthResults.filter(
      (r) => r.status === 'redirect' && r.redirectUrl && !isLoginOrAuthRedirect(r.url, r.redirectUrl).isAuthRedirect
    );

    if (redirectItems.length === 0) {
      alert('No genuine permanent redirects found to update. (Authentication and sign-in pages are safely protected).');
      return;
    }

    if (
      !window.confirm(
        `Update ${redirectItems.length} bookmarks to their destination URLs?\nA safety backup snapshot will be saved first.`
      )
    ) {
      return;
    }

    await createBookmarkSnapshot();
    for (const item of redirectItems) {
      if (item.redirectUrl) {
        await updateBookmarkUrl(item.id, item.redirectUrl);
      }
    }
    setHealthResults((prev) =>
      prev.map((r) => {
        if (r.status === 'redirect' && r.redirectUrl && !isLoginOrAuthRedirect(r.url, r.redirectUrl).isAuthRedirect) {
          return { ...r, url: r.redirectUrl, status: 'alive' };
        }
        return r;
      })
    );
    onReload();
  };

  // Filtered counts
  const brokenCount = healthResults.filter((r) => r.status === 'broken' || r.status === 'timeout').length;
  const redirectCount = healthResults.filter((r) => r.status === 'redirect').length;
  const aliveCount = healthResults.filter((r) => r.status === 'alive').length;
  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0);

  // Combine items for display
  const displayItems = bookmarks.filter((bkm) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = bkm.title.toLowerCase().includes(q);
      const matchUrl = bkm.url.toLowerCase().includes(q);
      if (!matchTitle && !matchUrl) return false;
    }

    const health = healthResults.find((h) => h.id === bkm.id);
    const isDup = duplicateGroups.some((g) => g.duplicates.some((d) => d.id === bkm.id));

    if (activeFilter === 'broken') {
      return health?.status === 'broken' || health?.status === 'timeout';
    }
    if (activeFilter === 'redirect') {
      return health?.status === 'redirect';
    }
    if (activeFilter === 'duplicates') {
      return isDup;
    }
    if (activeFilter === 'alive') {
      return health?.status === 'alive';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Bookmarks */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{bookmarks.length}</div>
            <div className="text-[11px] text-slate-500 font-medium">Total Bookmarks</div>
          </div>
        </div>

        {/* Dead Links */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{brokenCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Dead Links</div>
            </div>
          </div>
          {brokenCount > 0 && (
            <button
              onClick={handleDeleteAllBroken}
              className="text-[10px] px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Redirects */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{redirectCount}</div>
              <div className="text-[11px] text-slate-500 font-medium">Redirects</div>
            </div>
          </div>
          {redirectCount > 0 && (
            <button
              onClick={handleUpdateAllRedirects}
              className="text-[10px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded transition-colors"
            >
              Update
            </button>
          )}
        </div>

        {/* Duplicates */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{totalDuplicates}</div>
              <div className="text-[11px] text-slate-500 font-medium">Duplicates</div>
            </div>
          </div>
          {totalDuplicates > 0 && (
            <button
              onClick={handleResolveAllDuplicates}
              className="text-[10px] px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded transition-colors"
            >
              Clean
            </button>
          )}
        </div>

        {/* Empty Folders */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
              <FolderX className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{emptyFolders.length}</div>
              <div className="text-[11px] text-slate-500 font-medium">Empty Folders</div>
            </div>
          </div>
          {emptyFolders.length > 0 && (
            <button
              onClick={handleDeleteAllEmptyFolders}
              className="text-[10px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded transition-colors"
            >
              Prune All
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartHealthCheck}
              disabled={isCheckingHealth}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isCheckingHealth
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Verifying URLs...' : 'Check All URLs Live'}</span>
            </button>

            {healthResults.length > 0 && (
              <span className="text-xs text-slate-500">
                Audit finished: {aliveCount} live, {brokenCount} dead, {redirectCount} redirects
              </span>
            )}
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search audited bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-3 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Progress bar during health verification */}
        {isCheckingHealth && healthProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="truncate max-w-md font-mono">{healthProgress.currentTitle}</span>
              <span>
                {healthProgress.completed} / {healthProgress.total} (
                {Math.round((healthProgress.completed / healthProgress.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(healthProgress.completed / healthProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-t border-slate-100 pt-3">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Filter view:</span>
          {(['all', 'broken', 'redirect', 'duplicates', 'empty', 'alive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                activeFilter === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'empty' ? 'Empty Folders' : tab}
              {tab === 'broken' && brokenCount > 0 && ` (${brokenCount})`}
              {tab === 'redirect' && redirectCount > 0 && ` (${redirectCount})`}
              {tab === 'duplicates' && totalDuplicates > 0 && ` (${totalDuplicates})`}
              {tab === 'empty' && emptyFolders.length > 0 && ` (${emptyFolders.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: Empty Folders Management View */}
      {activeFilter === 'empty' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <FolderX className="w-4 h-4 text-amber-600" />
                <span>Vacant & Empty Bookmark Folders ({emptyFolders.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                These folders contain no bookmarks in their hierarchy and can be safely pruned.
              </p>
            </div>

            {emptyFolders.length > 0 && (
              <button
                onClick={handleDeleteAllEmptyFolders}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Prune All Empty Folders</span>
              </button>
            )}
          </div>

          {emptyFolders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <span>Great job! No empty bookmark folders found in your library.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
              {emptyFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="p-3 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {folder.title}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        Level {folder.depth}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {folder.folderPath}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteEmptyFolder(folder.id)}
                    title="Delete empty folder"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Bookmarks List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {displayItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No bookmarks match the current filter or search criteria.
            </div>
          ) : (
            displayItems.map((bkm) => {
              const health = healthResults.find((h) => h.id === bkm.id);
              const dupGroup = duplicateGroups.find(
                (g) => g.primary.id === bkm.id || g.duplicates.some((d) => d.id === bkm.id)
              );
              const isDuplicate = Boolean(dupGroup && dupGroup.primary.id !== bkm.id);

              return (
                <div
                  key={bkm.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  {/* Left Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-slate-900 truncate" title={bkm.title}>
                        {bkm.title || 'Untitled Bookmark'}
                      </span>

                      {/* Status Badges */}
                      {health && health.status === 'alive' && (
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            health.statusText?.includes('Sign-In') ||
                            health.statusText?.includes('Auth') ||
                            health.statusText?.includes('Entra')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {health.statusText?.includes('Sign-In') ||
                          health.statusText?.includes('Auth') ||
                          health.statusText?.includes('Entra') ? (
                            <Lock className="w-3 h-3 text-blue-600" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>
                            {health.statusText?.includes('Sign-In') ||
                            health.statusText?.includes('Auth') ||
                            health.statusText?.includes('Entra')
                              ? health.statusText
                              : `Live (${health.latencyMs}ms)`}
                          </span>
                        </span>
                      )}

                      {health && health.status === 'broken' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Dead ({health.statusCode || health.errorMsg})</span>
                        </span>
                      )}

                      {health && health.status === 'redirect' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          <RotateCw className="w-3 h-3" />
                          <span>
                            {health.statusCode === 410
                              ? 'Moved / Retired (410)'
                              : `Redirect ${health.statusCode || ''}`}
                          </span>
                        </span>
                      )}

                      {health && health.status === 'timeout' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" />
                          <span>Timeout</span>
                        </span>
                      )}

                      {isDuplicate && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                          <Copy className="w-3 h-3" />
                          <span>Duplicate</span>
                        </span>
                      )}
                    </div>

                    {/* URL & Path */}
                    <div className="flex items-center space-x-2 text-xs text-slate-500 truncate">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">
                        {bkm.folderPath || 'Favorites bar'}
                      </span>
                      <a
                        href={bkm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-md flex items-center space-x-1"
                      >
                        <span>{bkm.url}</span>
                        <ExternalLink className="w-3 h-3 inline-block shrink-0" />
                      </a>
                    </div>

                    {/* Migration / Announcement Notice */}
                    {health?.notice && (
                      <div className="text-[11px] text-amber-800 bg-amber-50/90 px-2 py-1 rounded border border-amber-200/70 font-medium">
                        📢 {health.notice}
                      </div>
                    )}

                    {/* Redirect notice if redirected or moved */}
                    {health?.status === 'redirect' && health.redirectUrl && (
                      <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md mt-1">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          Destination: <strong>{health.redirectUrl}</strong>
                        </span>
                        <button
                          onClick={() => handleApplyRedirect(bkm.id, health.redirectUrl!, bkm.url)}
                          className="ml-auto underline font-medium hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded text-[11px] transition-colors"
                        >
                          Update to Destination
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {(health?.status === 'broken' || health?.status === 'timeout') && (
                      <a
                        href={getWaybackUrl(bkm.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View snapshot on Internet Archive (Wayback Machine)"
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleDeleteItem(bkm.id)}
                      title="Delete this bookmark"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
