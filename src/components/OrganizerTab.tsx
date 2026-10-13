import React, { useState, useEffect } from 'react';
import {
  BookmarkItem,
  TaxonomyTemplate,
  AISettings,
  FolderSortOptions,
  SortOrderMode,
  FolderSortPreview,
  AIClassificationRun,
} from '../types';
import {
  TAXONOMY_TEMPLATES,
  getPreferredTaxonomy,
  setPreferredTaxonomy,
} from '../services/taxonomyTemplates';
import {
  generateReorganizationPlanAsync,
  executeReorganizationPlan,
  ProposedMove,
} from '../services/reorganizer';
import { getAISettings } from '../services/aiProvider';
import { describeAIRun, getAIModelName } from '../services/aiRunStatus';
import {
  findEmptyFolders,
  batchDeleteEmptyFolders,
  getBookmarkTree,
} from '../services/bookmarkManager';
import {
  sortFolder,
  sortAllFolders,
  previewFolderSort,
} from '../services/bookmarkSorter';
import {
  Sparkles,
  FolderTree,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Play,
  CheckSquare,
  Square,
  Shield,
  Layers,
  FolderX,
  Bot,
  ArrowDownAZ,
  Folder,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';

interface OrganizerTabProps {
  bookmarks: BookmarkItem[];
  onReload: () => void;
}

type OrganizerSubTab = 'reorganize' | 'sort-tidy';

export const OrganizerTab: React.FC<OrganizerTabProps> = ({ bookmarks, onReload }) => {
  const [subTab, setSubTab] = useState<OrganizerSubTab>('reorganize');

  // Reorganization state
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyTemplate>(TAXONOMY_TEMPLATES[0]);
  const [moves, setMoves] = useState<ProposedMove[]>([]);
  const [unmovedCount, setUnmovedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [aiProgressMsg, setAiProgressMsg] = useState<string | null>(null);
  const [aiRun, setAiRun] = useState<AIClassificationRun | null>(null);

  // Post-reorganization auto-sort config
  const [autoSortDestination, setAutoSortDestination] = useState(true);
  const [reorgSortCriteria, setReorgSortCriteria] = useState<SortOrderMode>('domain-alpha');

  // Standalone Bookmark Sorter state
  const [availableFolders, setAvailableFolders] = useState<
    { id: string; title: string; path: string; count: number }[]
  >([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [standaloneSortCriteria, setStandaloneSortCriteria] = useState<SortOrderMode>('domain-alpha');
  const [sortSubfoldersFirst, setSortSubfoldersFirst] = useState(true);

  const [isSorting, setIsSorting] = useState(false);
  const [sortError, setSortError] = useState<string | null>(null);
  const [sortProgress, setSortProgress] = useState<{
    current: number;
    total: number;
    folderName: string;
  } | null>(null);
  const [sortPreview, setSortPreview] = useState<FolderSortPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    getAISettings().then((cfg) => {
      setAiSettings(cfg);
      setUseAi(cfg.enabled);
    });
  }, []);

  useEffect(() => {
    getPreferredTaxonomy().then((preferred) => {
      setSelectedTaxonomy(preferred);
    });
  }, []);

  // Populate folder dropdown for Bookmark Sorter
  useEffect(() => {
    getBookmarkTree().then((tree) => {
      const list: { id: string; title: string; path: string; count: number }[] = [];
      function walk(node: any, path: string) {
        const nextPath = node.title ? (path ? `${path} / ${node.title}` : node.title) : path;
        if (!node.url && node.id) {
          const directBookmarks = (node.children || []).filter((c: any) => Boolean(c.url));
          if (directBookmarks.length > 0) {
            list.push({
              id: node.id,
              title: node.title || 'Folder',
              path: nextPath || 'Favorites bar',
              count: directBookmarks.length,
            });
          }
        }
        if (node.children) {
          for (const child of node.children) {
            walk(child, nextPath);
          }
        }
      }
      for (const root of tree) {
        walk(root, '');
      }
      setAvailableFolders(list);
    });
  }, [bookmarks]);

  // Update live preview when folder or sort parameters change
  useEffect(() => {
    if (subTab !== 'sort-tidy') return;
    if (availableFolders.length === 0) {
      setSortPreview(null);
      setSelectedFolderId('all');
      return;
    }

    let targetFolder = availableFolders.find((f) => f.id === selectedFolderId);
    if (!targetFolder && selectedFolderId === 'all') {
      targetFolder = availableFolders[0];
    }
    if (!targetFolder) {
      setSortPreview(null);
      setSelectedFolderId('all');
      return;
    }

    setPreviewLoading(true);
    previewFolderSort(targetFolder.id, targetFolder.title, targetFolder.path, {
      criteria: standaloneSortCriteria,
      sortSubfoldersFirst,
    })
      .then(setSortPreview)
      .finally(() => setPreviewLoading(false));
  }, [
    subTab,
    selectedFolderId,
    standaloneSortCriteria,
    sortSubfoldersFirst,
    availableFolders,
  ]);

  // Generate reorganization plan
  const handleGeneratePlan = async () => {
    setIsAnalyzing(true);
    setSuccessMessage(null);
    setAiProgressMsg(null);
    setAiRun(null);
    try {
      setAiSettings(await getAISettings());
      const plan = await generateReorganizationPlanAsync(
        bookmarks,
        selectedTaxonomy,
        useAi,
        (msg) => setAiProgressMsg(msg)
      );
      setMoves(plan.moves);
      setUnmovedCount(plan.unmovedCount);
      setAiRun(plan.aiRun || null);
    } finally {
      setIsAnalyzing(false);
      setAiProgressMsg(null);
    }
  };

  // Toggle accepted state for individual move
  const handleToggleMove = (index: number) => {
    setMoves((prev) =>
      prev.map((m, i) => (i === index ? { ...m, accepted: !m.accepted } : m))
    );
  };

  // Select / Deselect all
  const handleToggleAll = (accept: boolean) => {
    setMoves((prev) => prev.map((m) => ({ ...m, accepted: accept })));
  };

  // Execute reorganization migration in Edge
  const handleExecute = async () => {
    const acceptedMoves = moves.filter((m) => m.accepted);
    if (acceptedMoves.length === 0) return;

    if (
      !window.confirm(
        `Apply reorganization plan? This will organize ${acceptedMoves.length} bookmarks into the ${selectedTaxonomy.name} hierarchy. A safety backup snapshot will be saved first.`
      )
    ) {
      return;
    }

    setIsExecuting(true);
    setExecutionProgress({ completed: 0, total: acceptedMoves.length });

    try {
      const sortOpts: FolderSortOptions | undefined = autoSortDestination
        ? {
            criteria: reorgSortCriteria,
            sortSubfoldersFirst: true,
          }
        : undefined;

      const result = await executeReorganizationPlan(
        moves,
        (completed, total) => {
          setExecutionProgress({ completed, total });
        },
        sortOpts
      );

      setSuccessMessage(
        `Successfully organized ${result.movedCount} bookmarks into ${selectedTaxonomy.name}${
          result.foldersSorted
            ? ` and sorted ${result.foldersSorted} destination folders`
            : ''
        }!`
      );
      setMoves([]);
      onReload();
    } finally {
      setIsExecuting(false);
      setExecutionProgress(null);
    }
  };

  // Execute standalone sorting across all or selected folders
  const handleExecuteSort = async () => {
    setSuccessMessage(null);
    setSortError(null);
    const options: FolderSortOptions = {
      criteria: standaloneSortCriteria,
      sortSubfoldersFirst,
    };

    if (selectedFolderId === 'all') {
      if (
        !window.confirm(
          `Sort all folders in your bookmark library by "${standaloneSortCriteria}"? A safety backup snapshot will be saved first.`
        )
      ) {
        return;
      }

      setIsSorting(true);
      setSortProgress(null);
      try {
        const res = await sortAllFolders(options, (current, total, folderName) => {
          setSortProgress({ current, total, folderName });
        });
        setSuccessMessage(
          `Sorted ${res.foldersSorted} folders and ${res.bookmarksSorted} bookmarks (${res.dividersRemoved} old dividers removed in completed folders).`
        );
        if (res.failedFolders) {
          setSortError(`${res.failedFolders} folders could not be fully sorted. Some old dividers may remain; retry after checking bookmark permissions.`);
        }
        onReload();
      } catch (error) {
        setSortError(error instanceof Error ? error.message : 'Sorting failed.');
        onReload();
      } finally {
        setIsSorting(false);
        setSortProgress(null);
      }
    } else {
      const targetFolder = availableFolders.find((f) => f.id === selectedFolderId);
      setIsSorting(true);
      try {
        const res = await sortFolder(selectedFolderId, options);
        setSuccessMessage(
          `Successfully sorted "${targetFolder?.title || 'folder'}" (${res.modifiedCount} bookmarks, ${res.dividersRemoved} old dividers removed)!`
        );
        onReload();
      } catch (error) {
        setSortError(error instanceof Error ? error.message : 'Sorting failed.');
        onReload();
      } finally {
        setIsSorting(false);
      }
    }
  };

  const handlePruneEmptyAfterMigration = async () => {
    const empty = await findEmptyFolders();
    if (empty.length === 0) {
      setSuccessMessage('No empty folders found to prune.');
      return;
    }
    const count = await batchDeleteEmptyFolders(empty.map((f) => f.id));
    setSuccessMessage(`Successfully pruned ${count} vacant folders left behind after reorganization.`);
    onReload();
  };

  const acceptedCount = moves.filter((m) => m.accepted).length;

  return (
    <div className="space-y-6">
      {/* Sub-Nav Pill Mode Selector */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        <button
          onClick={() => setSubTab('reorganize')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'reorganize'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Taxonomy Reorganizer</span>
        </button>

        <button
          onClick={() => setSubTab('sort-tidy')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'sort-tidy'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownAZ className="w-4 h-4 text-indigo-600" />
          <span>Sort Bookmarks</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
            New
          </span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-800 text-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={handlePruneEmptyAfterMigration}
            className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 ml-3"
          >
            <FolderX className="w-3.5 h-3.5 text-amber-600" />
            <span>Prune Empty Folders</span>
          </button>
        </div>
      )}

      {/* ===================== TAB 1: REORGANIZE TAXONOMY ===================== */}
      {subTab === 'reorganize' && (
        <>
          {/* Top Banner & Taxonomy Picker */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Structure & Taxonomy Reorganizer
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Proposes a clean folder hierarchy by analyzing page metadata, Schema.org categories,
                  breadcrumbs, and domain rules. Choose your preferred framework below.
                </p>
              </div>

              {/* Taxonomy selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-slate-600">Framework:</label>
                <select
                  value={selectedTaxonomy.id}
                  onChange={(e) => {
                    const found = TAXONOMY_TEMPLATES.find((t) => t.id === e.target.value);
                    if (found) {
                      setSelectedTaxonomy(found);
                      setPreferredTaxonomy(found.id);
                      setMoves([]);
                    }
                  }}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TAXONOMY_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Taxonomy Structure Preview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {selectedTaxonomy.rootFolders.map((root, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 space-y-1"
                >
                  <div className="font-semibold text-xs text-slate-900 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>{root.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {root.description}
                  </p>
                  {root.subfolders && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {root.subfolders.slice(0, 3).map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          {sub}
                        </span>
                      ))}
                      {root.subfolders.length > 3 && (
                        <span className="text-[10px] text-slate-400">
                          +{root.subfolders.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Post-Reorganization Auto-Sort Config */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center space-x-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSortDestination}
                  onChange={(e) => setAutoSortDestination(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800">
                  Auto-sort destination folders
                </span>
              </label>

              {autoSortDestination && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-500 font-medium">Order:</span>
                    <select
                      value={reorgSortCriteria}
                      onChange={(e) => setReorgSortCriteria(e.target.value as SortOrderMode)}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="domain-alpha">Group by Domain / Site (A-Z)</option>
                      <option value="alpha-asc">Alphabetical (A to Z)</option>
                      <option value="date-desc">Date Added (Newest First)</option>
                    </select>
                  </div>

                </div>
              )}
            </div>

            {/* Action button & AI Toggle */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGeneratePlan}
                  disabled={isAnalyzing || isExecuting}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {isAnalyzing
                      ? 'Analyzing Bookmarks...'
                      : 'Generate Reorganization Plan'}
                  </span>
                </button>

                {aiSettings && (
                  <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={useAi}
                      onChange={(e) => setUseAi(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                    />
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      Use AI Assistance ({aiSettings.provider === 'ollama' ? 'Ollama' : 'Gemini'})
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
                <Shield className="w-3.5 h-3.5" />
                <span>Automatic safety backup before migration</span>
              </div>
            </div>
            {aiSettings && useAi && (
              <p className="text-xs text-purple-700">
                {aiSettings.classificationMode === 'ai-only' ? 'AI Primary: all eligible bookmarks' : 'Hybrid: ambiguous proposed moves only'} · {getAIModelName(aiSettings)}
              </p>
            )}
            {isAnalyzing && aiProgressMsg && <p role="status" className="text-xs text-slate-600">{aiProgressMsg}</p>}
          </div>

          {aiRun && (
            <p role="status" className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {describeAIRun(aiRun)}
            </p>
          )}

          {/* Proposed Moves Table */}
          {moves.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Proposed Reorganization ({acceptedCount} of {moves.length} selected)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {unmovedCount} bookmarks require no move or are unsupported.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleAll(true)}
                    className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select All</span>
                  </button>
                  <button
                    onClick={() => handleToggleAll(false)}
                    className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deselect All</span>
                  </button>

                  <button
                    onClick={handleExecute}
                    disabled={isExecuting || acceptedCount === 0}
                    className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                      isExecuting || acceptedCount === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {isExecuting
                        ? `Moving (${executionProgress?.completed}/${executionProgress?.total})...`
                        : `Apply Changes (${acceptedCount})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Moves items list */}
              <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
                {moves.map((move, idx) => (
                  <div
                    key={move.bookmark.id}
                    onClick={() => handleToggleMove(idx)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors flex items-start space-x-3 ${
                      move.accepted
                        ? 'bg-blue-50/30 hover:bg-blue-50/60'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={move.accepted}
                      onChange={() => {}}
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-900 truncate max-w-sm">
                          {move.bookmark.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            move.confidence >= 0.85
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {Math.round(move.confidence * 100)}% match
                        </span>
                        {move.classifiedBy && move.classifiedBy !== 'rules' ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                            <span>
                              {move.classifiedBy === 'ollama' ? 'Ollama AI' : 'Gemini AI'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Rule Engine
                          </span>
                        )}
                      </div>

                      {/* Move Path Indicator */}
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono truncate max-w-[180px]">
                          {move.currentFolder}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-700 bg-blue-100/70 font-semibold px-1.5 py-0.5 rounded font-mono">
                          {move.targetPath.join(' / ')}
                        </span>
                      </div>

                      {/* Metadata Reasoning Pill */}
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 pt-0.5">
                        <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="italic">{move.reasoning}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================== TAB 2: SORT BOOKMARKS ===================== */}
      {subTab === 'sort-tidy' && (
        <div className="space-y-6">
          {sortError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
              {sortError}
            </p>
          )}
          {/* Main Controls Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <ArrowDownAZ className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Bookmark Sorter
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Sort bookmarks inside folders by site, title, or date added. Old EdgeMark
                  divider bookmarks are removed when you sort; a safety backup is saved first.
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                <Shield className="w-3.5 h-3.5" />
                <span>Automatic safety backup before sorting</span>
              </div>
            </div>

            {/* Configuration Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Option 1: Target Folder */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target Folder Scope</span>
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">🌐 All Folders (Entire Bookmark Library)</option>
                  {availableFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.path} ({f.count} links)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Select a specific folder to preview or apply across the whole tree.
                </p>
              </div>

              {/* Option 2: Sort Criteria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sort Order</span>
                </label>
                <select
                  value={standaloneSortCriteria}
                  onChange={(e) => setStandaloneSortCriteria(e.target.value as SortOrderMode)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="domain-alpha">
                    🌐 Group by Domain / Site, then A-Z (Recommended)
                  </option>
                  <option value="alpha-asc">🔤 Alphabetical (A to Z by Title)</option>
                  <option value="alpha-desc">🔤 Reverse Alphabetical (Z to A)</option>
                  <option value="date-desc">📅 Date Added (Most Recent First)</option>
                  <option value="date-asc">⏳ Date Added (Oldest First)</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Domain grouping keeps all links from the same service contiguous.
                </p>
              </div>

            </div>

            {/* Checkbox and Action row */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sortSubfoldersFirst}
                  onChange={(e) => setSortSubfoldersFirst(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Keep subfolders at the very top of each folder</span>
              </label>

              <button
                onClick={handleExecuteSort}
                disabled={isSorting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                <ArrowDownAZ className="w-4 h-4" />
                <span>
                  {isSorting
                    ? sortProgress
                      ? `Sorting (${sortProgress.current}/${sortProgress.total})...`
                      : 'Sorting Folders...'
                    : selectedFolderId === 'all'
                    ? 'Sort All Folders'
                    : 'Sort Selected Folder'}
                </span>
              </button>
            </div>

            {/* Multi-folder progress bar */}
            {isSorting && sortProgress && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5 text-xs text-indigo-900">
                <div className="flex justify-between font-medium">
                  <span className="truncate max-w-md">Sorting: {sortProgress.folderName}</span>
                  <span>
                    {sortProgress.current} of {sortProgress.total} folders
                  </span>
                </div>
                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-150"
                    style={{
                      width: `${Math.round((sortProgress.current / sortProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live Preview Card */}
          {sortPreview && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Live Layout Preview:
                    </span>
                    <span className="font-bold text-sm text-slate-900 font-mono">
                      {sortPreview.folderPath}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {sortPreview.itemCount} bookmarks across {sortPreview.domainCount} distinct
                    domain groups
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                    Order: {standaloneSortCriteria}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                    Old dividers to remove: {sortPreview.dividersToRemove}
                  </span>
                </div>
              </div>

              {previewLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Updating preview...</div>
              ) : sortPreview.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No bookmarks in this folder to sort.
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-[450px] overflow-y-auto space-y-1.5">
                  {sortPreview.items.map((item, idx) => {
                    return (
                      <div
                        key={`bkm-${item.id || idx}`}
                        className="p-2 bg-white rounded border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-medium text-slate-900 truncate max-w-md">
                            {item.title}
                          </span>
                          {item.domain && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {item.domain}
                            </span>
                          )}
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-blue-600 shrink-0 ml-2"
                            title={item.url}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
