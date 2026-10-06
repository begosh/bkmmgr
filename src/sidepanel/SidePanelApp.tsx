import React, { useState, useEffect } from 'react';
import { BookmarkItem, ProposedFolder, PageMetadata, TaxonomyTemplate, AISettings } from '../types';
import { getAllBookmarks, createBookmark, ensureFolderPath } from '../services/bookmarkManager';
import { sanitizeUrl } from '../services/urlSanitizer';
import { proposeBookmarkFolder } from '../services/classifier';
import {
  TAXONOMY_TEMPLATES,
  DEFAULT_TAXONOMY,
  getPreferredTaxonomy,
  setPreferredTaxonomy,
} from '../services/taxonomyTemplates';
import { sortFolder } from '../services/bookmarkSorter';
import { getAISettings, classifySingleWithAI } from '../services/aiProvider';
import {
  Bookmark,
  Sparkles,
  FolderPlus,
  ExternalLink,
  Search,
  CheckCircle2,
  Maximize2,
  Layers,
  Bot,
  Loader2,
  Coffee,
} from 'lucide-react';

export const SidePanelApp: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyTemplate>(DEFAULT_TAXONOMY);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [autoSortFolder, setAutoSortFolder] = useState<boolean>(true);

  // AI settings
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAI, setUseAI] = useState<boolean>(false);
  const [isClassifyingWithAI, setIsClassifyingWithAI] = useState<boolean>(false);
  const [isAIProposed, setIsAIProposed] = useState<boolean>(false);

  const isAIConfigured = Boolean(
    aiSettings?.enabled &&
      (aiSettings.geminiApiKey || aiSettings.googleAccessToken || aiSettings.provider === 'ollama')
  );

  const [activeTabInfo, setActiveTabInfo] = useState<{
    url: string;
    cleanedUrl: string;
    title: string;
    strippedParams: string[];
    proposal: ProposedFolder | null;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing bookmarks
  const refreshBookmarks = async () => {
    const items = await getAllBookmarks();
    setBookmarks(items);
  };

  // Run classification (Heuristic baseline + optional AI)
  const runClassification = async (
    meta: PageMetadata,
    taxonomy: TaxonomyTemplate,
    shouldUseAI: boolean,
    settings: AISettings | null
  ) => {
    const baseline = proposeBookmarkFolder(meta, taxonomy);
    setSelectedFolder(baseline.fullPath.join(' / '));
    setIsAIProposed(false);
    setActiveTabInfo((prev) => (prev ? { ...prev, proposal: baseline } : null));

    if (
      shouldUseAI &&
      settings?.enabled &&
      (settings.geminiApiKey || settings.googleAccessToken || settings.provider === 'ollama')
    ) {
      setIsClassifyingWithAI(true);
      try {
        const aiRes = await classifySingleWithAI(
          { url: meta.url, title: meta.title },
          taxonomy,
          settings
        );
        if (aiRes) {
          const fullPath = aiRes.subfolder
            ? [aiRes.category, aiRes.subfolder]
            : [aiRes.category];
          const aiProp: ProposedFolder = {
            taxonomyName: taxonomy.name,
            category: aiRes.category,
            subfolder: aiRes.subfolder,
            fullPath,
            confidence: aiRes.confidence,
            reasoning: `AI (${settings.geminiModel || 'Gemini'}): ${aiRes.reasoning}`,
            suggestedTags: ['ai-classified', ...(meta.keywords?.slice(0, 3) || [])],
          };
          setSelectedFolder(fullPath.join(' / '));
          setIsAIProposed(true);
          setActiveTabInfo((prev) => (prev ? { ...prev, proposal: aiProp } : null));
        }
      } catch (err) {
        console.warn('Sidebar AI classification failed:', err);
      } finally {
        setIsClassifyingWithAI(false);
      }
    }
  };

  // Inspect current tab
  const inspectCurrentTab = (
    activeTaxonomy: TaxonomyTemplate = selectedTaxonomy,
    shouldUseAI: boolean = useAI,
    settings: AISettings | null = aiSettings
  ) => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url) {
          const rawUrl = tab.url;
          const cleanRes = sanitizeUrl(rawUrl);
          const title = tab.title || rawUrl;

          if (tab.id && !rawUrl.startsWith('edge://') && !rawUrl.startsWith('chrome://')) {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' }, (response) => {
              let meta: PageMetadata;
              if (response?.success && response.metadata) {
                meta = response.metadata;
              } else {
                let domain = '';
                try {
                  domain = new URL(rawUrl).hostname;
                } catch {}
                meta = { url: rawUrl, title, domain };
              }
              setPageMetadata(meta);
              const baselineProp = proposeBookmarkFolder(meta, activeTaxonomy);
              setSelectedFolder(baselineProp.fullPath.join(' / '));
              setActiveTabInfo({
                url: rawUrl,
                cleanedUrl: cleanRes.cleanedUrl,
                title,
                strippedParams: cleanRes.strippedParams,
                proposal: baselineProp,
              });
              runClassification(meta, activeTaxonomy, shouldUseAI, settings);
            });
          }
        }
      });
    } else {
      // Mock data outside extension
      const sampleUrl = 'https://react.dev/reference/react/useState?utm_campaign=react19';
      const cleanRes = sanitizeUrl(sampleUrl);
      const mockMeta: PageMetadata = {
        url: cleanRes.cleanedUrl,
        title: 'useState – React',
        domain: 'react.dev',
        schemaTypes: ['TechArticle'],
        breadcrumbs: ['Reference', 'Hooks', 'useState'],
      };
      setPageMetadata(mockMeta);
      const baseline = proposeBookmarkFolder(mockMeta, activeTaxonomy);
      setSelectedFolder(baseline.fullPath.join(' / '));
      setActiveTabInfo({
        url: sampleUrl,
        cleanedUrl: cleanRes.cleanedUrl,
        title: 'useState – React',
        strippedParams: cleanRes.strippedParams,
        proposal: baseline,
      });
      runClassification(mockMeta, activeTaxonomy, shouldUseAI, settings);
    }
  };

  useEffect(() => {
    async function init() {
      const preferred = await getPreferredTaxonomy();
      setSelectedTaxonomy(preferred);
      const ai = await getAISettings();
      setAiSettings(ai);

      let initialUseAI = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
        chrome.storage.local.get(['edgemark_autosort_on_save', 'edgemark_use_ai_in_popup'], (res) => {
          if (res) {
            if (typeof res.edgemark_autosort_on_save === 'boolean') {
              setAutoSortFolder(res.edgemark_autosort_on_save);
            }
            if (typeof res.edgemark_use_ai_in_popup === 'boolean') {
              initialUseAI = res.edgemark_use_ai_in_popup;
              setUseAI(initialUseAI);
            }
          }
        });
      }

      await refreshBookmarks();
      inspectCurrentTab(preferred, initialUseAI, ai);
    }
    init();

    // Listen to tab activation changes in Edge
    if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
      const listener = () => inspectCurrentTab();
      chrome.tabs.onActivated.addListener(listener);
      return () => chrome.tabs.onActivated.removeListener(listener);
    }
  }, []);

  const handleTaxonomyChange = async (taxonomyId: string) => {
    const template = TAXONOMY_TEMPLATES.find((t) => t.id === taxonomyId) || DEFAULT_TAXONOMY;
    setSelectedTaxonomy(template);
    await setPreferredTaxonomy(template.id);

    if (pageMetadata) {
      runClassification(pageMetadata, template, useAI, aiSettings);
    }
  };

  const handleToggleAI = (enable: boolean) => {
    setUseAI(enable);
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      chrome.storage.local.set({ edgemark_use_ai_in_popup: enable });
    }
    if (pageMetadata) {
      runClassification(pageMetadata, selectedTaxonomy, enable, aiSettings);
    }
  };

  const handleSaveCurrentTab = async () => {
    if (!activeTabInfo) return;
    setIsSaving(true);
    try {
      const pathSegments = selectedFolder.split(' / ').map((s) => s.trim()).filter(Boolean);
      const folderId = await ensureFolderPath(pathSegments);
      await createBookmark(activeTabInfo.title, activeTabInfo.cleanedUrl, folderId);

      // Auto-sort folder and insert dividers if enabled
      if (autoSortFolder) {
        try {
          await sortFolder(folderId);
        } catch (sortErr) {
          console.warn('Auto-sort folder error in sidebar:', sortErr);
        }
      }

      setIsSaved(true);
      await refreshBookmarks();
      setTimeout(() => setIsSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAbout = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/manager/index.html#about') });
    } else {
      window.open('/src/manager/index.html#about', '_blank');
    }
  };

  const handleOpenManager = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/src/manager/index.html', '_blank');
    }
  };

  // Filter bookmarks for search in sidebar
  const filteredBookmarks = bookmarks.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
  });

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-xs text-slate-800">
      {/* Top Sidebar Header */}
      <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 leading-tight">EdgeMark</h1>
            <p className="text-[10px] text-slate-400">Edge Sidebar Assistant</p>
          </div>
        </div>

        <button
          onClick={handleOpenManager}
          title="Open Full Management Dashboard"
          className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md border border-slate-200 text-[11px] font-medium transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Current Page Assistant Section */}
      {activeTabInfo && (
        <div className="p-3 bg-white border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-[11px] flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Current Page Analysis</span>
            </span>
            {activeTabInfo.strippedParams.length > 0 && (
              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                Stripped {activeTabInfo.strippedParams.length} tracking tags
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-900 text-xs truncate" title={activeTabInfo.title}>
              {activeTabInfo.title}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {activeTabInfo.cleanedUrl}
            </div>
          </div>

          {/* Model & AI Selector Bar */}
          <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-200 text-[11px] gap-1">
            <div className="flex items-center space-x-1 min-w-0">
              <Layers className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="font-medium text-slate-600 truncate">Model:</span>
              <select
                value={selectedTaxonomy.id}
                onChange={(e) => handleTaxonomyChange(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-[11px] font-medium rounded px-1.5 py-0.5 focus:outline-none"
              >
                {TAXONOMY_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {isAIConfigured && (
              <button
                type="button"
                onClick={() => handleToggleAI(!useAI)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all shrink-0 ${
                  useAI
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                title="Toggle Gemini AI classification"
              >
                <Bot className={`w-3 h-3 ${useAI ? 'text-purple-600' : 'text-slate-400'}`} />
                <span>{useAI ? 'AI On' : 'AI Off'}</span>
              </button>
            )}
          </div>

          {activeTabInfo.proposal && (
            <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-blue-800 font-semibold truncate">
                  Suggested Folder ({selectedTaxonomy.name}):
                </span>
                {isClassifyingWithAI ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-purple-700 bg-purple-100 px-1 py-0.2 rounded animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-purple-600" />
                    <span>AI...</span>
                  </span>
                ) : isAIProposed ? (
                  <span className="text-[10px] font-semibold text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                    ✨ AI ({Math.round(activeTabInfo.proposal.confidence * 100)}%)
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-blue-700">
                    {Math.round(activeTabInfo.proposal.confidence * 100)}% match
                  </span>
                )}
              </div>
              <input
                type="text"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full font-mono text-xs font-semibold text-blue-900 bg-white p-1 rounded border border-blue-200 focus:outline-none"
              />

              <label className="flex items-center space-x-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSortFolder}
                  onChange={(e) => setAutoSortFolder(e.target.checked)}
                  className="rounded text-blue-600 w-3 h-3"
                />
                <span>Auto-sort folder with dividers</span>
              </label>

              <p className="text-[10px] text-blue-600/90 italic leading-tight">
                {activeTabInfo.proposal.reasoning}
              </p>
            </div>
          )}

          <button
            onClick={handleSaveCurrentTab}
            disabled={isSaving || isSaved}
            className={`w-full py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved and Sorted!</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving & Sorting...' : '1-Click Save Clean Bookmark'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Bookmarks Search & Navigation in Sidebar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {filteredBookmarks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {searchQuery ? 'No bookmarks match your search.' : 'No bookmarks found.'}
          </div>
        ) : (
          filteredBookmarks.map((bkm) => (
            <div
              key={bkm.id}
              className="p-2.5 hover:bg-slate-50 flex items-center justify-between group transition-colors"
            >
              <div className="min-w-0 flex-1 pr-2">
                <a
                  href={bkm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-800 hover:text-blue-600 truncate block text-xs"
                  title={bkm.title}
                >
                  {bkm.title || bkm.url}
                </a>
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 truncate mt-0.5">
                  <span className="bg-slate-100 px-1 rounded text-slate-500 font-mono">
                    {bkm.folderPath || 'Favorites bar'}
                  </span>
                  <span className="truncate">{bkm.url}</span>
                </div>
              </div>

              <a
                href={bkm.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer with About & Buy Me a Coffee */}
      <div className="p-2 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] shrink-0">
        <button
          onClick={handleOpenAbout}
          className="text-slate-500 hover:text-blue-600 transition-colors cursor-pointer flex items-center space-x-1"
          title="About EdgeMark, documentation and shortcuts"
        >
          <span>EdgeMark v1.0.0</span>
          <span>•</span>
          <span className="underline decoration-slate-300">About</span>
        </button>

        <a
          href="https://buymeacoffee.com/jonasaspma3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors font-medium cursor-pointer"
          title="Support EdgeMark on Buy Me a Coffee"
        >
          <Coffee className="w-3 h-3 text-amber-600" />
          <span>Buy Me a Coffee</span>
        </a>
      </div>
    </div>
  );
};
