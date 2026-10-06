import React, { useState, useEffect } from 'react';
import { PageMetadata, ProposedFolder, TaxonomyTemplate, AISettings } from '../types';
import { sanitizeUrl } from '../services/urlSanitizer';
import { proposeBookmarkFolder } from '../services/classifier';
import {
  createBookmark,
  ensureFolderPath,
  getAllBookmarks,
} from '../services/bookmarkManager';
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
  Link2Off,
  CheckCircle2,
  FolderPlus,
  PanelRight,
  Maximize2,
  Tag,
  Layers,
  RotateCcw,
  Bot,
  Loader2,
  Coffee,
} from 'lucide-react';

export const PopupApp: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [cleanedUrl, setCleanedUrl] = useState('');
  const [title, setTitle] = useState('');
  const [strippedParams, setStrippedParams] = useState<string[]>([]);
  const [proposal, setProposal] = useState<ProposedFolder | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active taxonomy model & metadata cache for instant re-classification
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyTemplate>(DEFAULT_TAXONOMY);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [existingFolders, setExistingFolders] = useState<string[]>([]);

  // Auto-sort preference (automatically tidy destination folder with dividers on save)
  const [autoSortFolder, setAutoSortFolder] = useState<boolean>(true);

  // AI settings and status
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAI, setUseAI] = useState<boolean>(false);
  const [isClassifyingWithAI, setIsClassifyingWithAI] = useState<boolean>(false);
  const [isAIProposed, setIsAIProposed] = useState<boolean>(false);

  const isAIConfigured = Boolean(
    aiSettings?.enabled &&
      (aiSettings.geminiApiKey || aiSettings.googleAccessToken || aiSettings.provider === 'ollama')
  );

  // 1. Initial Load
  useEffect(() => {
    async function init() {
      // Load preferred taxonomy
      const preferred = await getPreferredTaxonomy();
      setSelectedTaxonomy(preferred);

      // Load AI settings
      const ai = await getAISettings();
      setAiSettings(ai);

      // Load preferences from storage
      let initialUseAI = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
        chrome.storage.local.get(
          ['edgemark_autosort_on_save', 'edgemark_use_ai_in_popup'],
          (res) => {
            if (res) {
              if (typeof res.edgemark_autosort_on_save === 'boolean') {
                setAutoSortFolder(res.edgemark_autosort_on_save);
              }
              if (typeof res.edgemark_use_ai_in_popup === 'boolean') {
                initialUseAI = res.edgemark_use_ai_in_popup;
                setUseAI(initialUseAI);
              } else if (ai.enabled && isAIConfigured) {
                initialUseAI = true;
                setUseAI(true);
              }
            }
          }
        );
      }

      // Load existing folders for autocompletion
      try {
        const bookmarks = await getAllBookmarks();
        const folders = Array.from(
          new Set(bookmarks.map((b) => b.folderPath).filter((p): p is string => Boolean(p)))
        ).sort();
        setExistingFolders(folders);
      } catch {
        // Fallback
      }

      // Query active tab in Edge / Chrome
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab?.url) {
            const rawUrl = tab.url;
            const cleanRes = sanitizeUrl(rawUrl);
            setCurrentUrl(rawUrl);
            setCleanedUrl(cleanRes.cleanedUrl);
            setStrippedParams(cleanRes.strippedParams);
            setTitle(tab.title || rawUrl);

            // Ask content script for rich on-page metadata
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
                  meta = {
                    url: rawUrl,
                    title: tab.title || rawUrl,
                    domain,
                  };
                }

                setPageMetadata(meta);
                calculateProposal(meta, preferred, initialUseAI, ai);
              });
            }
          }
        });
      } else {
        // Mock tab for test / standalone environment
        const sampleUrl = 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API?utm_source=docs';
        const cleanRes = sanitizeUrl(sampleUrl);
        setCurrentUrl(sampleUrl);
        setCleanedUrl(cleanRes.cleanedUrl);
        setStrippedParams(cleanRes.strippedParams);
        setTitle('Fetch API - Web APIs | MDN');

        const mockMeta: PageMetadata = {
          url: cleanRes.cleanedUrl,
          title: 'Fetch API - Web APIs | MDN',
          domain: 'developer.mozilla.org',
          schemaTypes: ['TechArticle'],
          breadcrumbs: ['Web APIs', 'Fetch API'],
        };
        setPageMetadata(mockMeta);
        calculateProposal(mockMeta, preferred, initialUseAI, ai);
      }
    }

    init();
  }, []);

  // 2. Proposal Calculator (Heuristic with optional AI enhancement)
  const calculateProposal = async (
    meta: PageMetadata,
    taxonomy: TaxonomyTemplate,
    shouldUseAI: boolean,
    settings: AISettings | null
  ) => {
    // Immediate heuristic baseline
    const baselineProp = proposeBookmarkFolder(meta, taxonomy);
    setProposal(baselineProp);
    setSelectedFolder(baselineProp.fullPath.join(' / '));
    setCustomTags(baselineProp.suggestedTags || []);
    setIsAIProposed(false);

    // If AI is requested and configured, refine with AI
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
          setProposal({
            taxonomyName: taxonomy.name,
            category: aiRes.category,
            subfolder: aiRes.subfolder,
            fullPath,
            confidence: aiRes.confidence,
            reasoning: `AI (${settings.geminiModel || 'Gemini'}): ${aiRes.reasoning}`,
            suggestedTags: ['ai-classified', ...(meta.keywords?.slice(0, 3) || [])],
          });
          setSelectedFolder(fullPath.join(' / '));
          setIsAIProposed(true);
        }
      } catch (err) {
        console.warn('AI classification failed, kept rule-based proposal:', err);
      } finally {
        setIsClassifyingWithAI(false);
      }
    }
  };

  // 3. Handle Taxonomy Model Change
  const handleTaxonomyChange = async (taxonomyId: string) => {
    const template = TAXONOMY_TEMPLATES.find((t) => t.id === taxonomyId) || DEFAULT_TAXONOMY;
    setSelectedTaxonomy(template);
    await setPreferredTaxonomy(template.id);

    if (pageMetadata) {
      calculateProposal(pageMetadata, template, useAI, aiSettings);
    }
  };

  // 4. Handle AI Toggle
  const handleToggleAI = (enable: boolean) => {
    setUseAI(enable);
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      chrome.storage.local.set({ edgemark_use_ai_in_popup: enable });
    }
    if (pageMetadata) {
      calculateProposal(pageMetadata, selectedTaxonomy, enable, aiSettings);
    }
  };

  // 5. Handle Auto-Sort Toggle
  const handleToggleAutoSort = (enable: boolean) => {
    setAutoSortFolder(enable);
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      chrome.storage.local.set({ edgemark_autosort_on_save: enable });
    }
  };

  // 6. Execute Bookmark Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const pathSegments = selectedFolder.split(' / ').map((s) => s.trim()).filter(Boolean);
      const folderId = await ensureFolderPath(pathSegments);
      await createBookmark(title, cleanedUrl, folderId);

      // Automatically sort folder and arrange visual dividers if enabled
      if (autoSortFolder) {
        try {
          await sortFolder(folderId);
        } catch (sortErr) {
          console.warn('Auto-sort folder notice:', sortErr);
        }
      }

      setIsSaved(true);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.close) {
          window.close();
        }
      }, 1400);
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

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && (chrome as any).sidePanel?.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.windowId) {
          (chrome as any).sidePanel.open({ windowId: tabs[0].windowId });
        }
      });
    } else {
      window.open('/src/sidepanel/index.html', '_blank');
    }
  };

  return (
    <div className="w-[395px] bg-white text-slate-800 p-4 font-sans text-xs space-y-3.5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Bookmark className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-slate-900 tracking-tight">EdgeMark Quick Save</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleOpenSidePanel}
            title="Open Edge Sidebar"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenManager}
            title="Open Full Dashboard"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* URL Sanitization Notice */}
      {strippedParams.length > 0 && (
        <div className="p-2 bg-indigo-50/80 border border-indigo-200/70 rounded-lg space-y-1">
          <div className="flex items-center space-x-1.5 text-indigo-700 font-medium text-[11px]">
            <Link2Off className="w-3.5 h-3.5 shrink-0" />
            <span>Tracking Junk Stripped ({strippedParams.length} params)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {strippedParams.map((p, i) => (
              <span key={i} className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-indigo-700 rounded border border-indigo-200">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <label className="font-medium text-slate-600 text-[11px]">Bookmark Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Cleaned URL */}
        <div className="space-y-1">
          <label className="font-medium text-slate-600 text-[11px]">Clean URL</label>
          <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-[11px] text-slate-700 truncate select-all" title={cleanedUrl || currentUrl}>
            {cleanedUrl || currentUrl}
          </div>
        </div>

        {/* Organization Model & AI Bar */}
        <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 gap-2">
          <div className="flex items-center space-x-1.5 text-slate-700 min-w-0">
            <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-[11px] truncate">Model:</span>
            <select
              value={selectedTaxonomy.id}
              onChange={(e) => handleTaxonomyChange(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded px-2 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {TAXONOMY_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI Toggle / Status Button */}
          {isAIConfigured ? (
            <button
              type="button"
              onClick={() => handleToggleAI(!useAI)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                useAI
                  ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title={useAI ? 'Gemini AI is actively classifying this bookmark' : 'Click to enable Gemini AI classification'}
            >
              <Bot className={`w-3.5 h-3.5 ${useAI ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>{useAI ? 'AI Active' : 'Use AI'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenManager}
              className="text-[10px] text-slate-400 hover:text-purple-600 hover:underline flex items-center space-x-1 shrink-0"
              title="Configure Gemini API in Settings"
            >
              <Bot className="w-3 h-3 text-slate-400" />
              <span>Setup AI</span>
            </button>
          )}
        </div>

        {/* Proposed Folder Location */}
        {proposal && (
          <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 flex items-center space-x-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Proposed Location ({selectedTaxonomy.name})</span>
              </span>

              {isClassifyingWithAI ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  <span>Gemini AI...</span>
                </span>
              ) : isAIProposed ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span>AI ({Math.round(proposal.confidence * 100)}%)</span>
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">
                  {Math.round(proposal.confidence * 100)}% match
                </span>
              )}
            </div>

            {/* Editable Destination Folder with Autocomplete */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-blue-800">
                <span className="font-medium">Destination Folder Path:</span>
                {selectedFolder !== proposal.fullPath.join(' / ') && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolder(proposal.fullPath.join(' / '))}
                    className="flex items-center space-x-0.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    title="Reset to automatically proposed location"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                list="popup-existing-folders"
                className="w-full font-mono text-xs font-semibold text-blue-900 bg-white px-2 py-1.5 rounded border border-blue-200 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-sm"
                placeholder="e.g. Development & Tech / Frontend"
              />
              <datalist id="popup-existing-folders">
                {existingFolders.map((f, i) => (
                  <option key={i} value={f} />
                ))}
              </datalist>
            </div>

            {/* Auto-sort Folder Checkbox */}
            <label className="flex items-center space-x-1.5 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={autoSortFolder}
                onChange={(e) => handleToggleAutoSort(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Auto-sort folder by site and arrange visual dividers</span>
            </label>

            <p className="text-[10px] text-blue-700 italic leading-snug">
              {proposal.reasoning}
            </p>
          </div>
        )}

        {/* Tags */}
        {customTags.length > 0 && (
          <div className="space-y-1">
            <label className="font-medium text-slate-600 text-[11px] flex items-center space-x-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Extracted Page Tags</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {customTags.map((tag, idx) => (
                <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-1">
        <button
          onClick={handleSave}
          disabled={isSaving || isSaved}
          className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg font-semibold text-xs shadow-sm transition-all cursor-pointer ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved and Sorted!</span>
            </>
          ) : (
            <>
              <FolderPlus className="w-4 h-4" />
              <span>{isSaving ? 'Saving & Sorting...' : 'Save Clean Bookmark'}</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Links & Buy Me a Coffee */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
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
