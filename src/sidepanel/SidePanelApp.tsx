import React, { useState, useEffect, useRef } from 'react';
import { ProposedFolder, PageMetadata, TaxonomyTemplate, AISettings, AIClassificationRun } from '../types';
import { createBookmark, ensureFolderPath } from '../services/bookmarkManager';
import { sanitizeUrl } from '../services/urlSanitizer';
import { proposeBookmarkFolder } from '../services/classifier';
import {
  TAXONOMY_TEMPLATES,
  DEFAULT_TAXONOMY,
  getPreferredTaxonomy,
  setPreferredTaxonomy,
} from '../services/taxonomyTemplates';
import { sortFolder } from '../services/bookmarkSorter';
import { getAISettings, classifySingleWithAI, DEFAULT_AI_SETTINGS } from '../services/aiProvider';
import { readActivePageMetadata, describeAIPageContext } from '../services/aiPageContext';
import { describeAIRun, getAIModelName, getQuickSavePreferences, isAIConfigured as hasAIConfigured } from '../services/aiRunStatus';
import { SidebarLibrary } from '../components/SidebarLibrary';
import { getToolbarOpensSidebar, setToolbarOpensSidebar } from '../services/sidePanelPreferences';
import {
  Pin, X, PanelRight,
  Bookmark,
  Sparkles,
  FolderPlus,
  CheckCircle2,
  Maximize2,
  Bot,
  Loader2,
} from 'lucide-react';

export const SidePanelApp: React.FC = () => {
  const [view, setView] = useState<'library' | 'save'>('library');
  const [toolbarSidebar, setToolbarSidebar] = useState(false);
  const [showPinHelp, setShowPinHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyTemplate>(DEFAULT_TAXONOMY);
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [autoSortFolder, setAutoSortFolder] = useState<boolean>(true);

  // AI settings
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [useAI, setUseAI] = useState<boolean>(false);
  const [isClassifyingWithAI, setIsClassifyingWithAI] = useState<boolean>(false);
  const [isAIProposed, setIsAIProposed] = useState<boolean>(false);
  const [aiRun, setAiRun] = useState<AIClassificationRun | null>(null);
  const useAIRef = useRef(false);
  const taxonomyRef = useRef(DEFAULT_TAXONOMY);

  const isAIConfigured = hasAIConfigured(aiSettings);

  const [activeTabInfo, setActiveTabInfo] = useState<{
    url: string;
    cleanedUrl: string;
    title: string;
    strippedParams: string[];
    proposal: ProposedFolder | null;
  } | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const requestVersion = useRef(0);
  const initialized = useRef(false);
  const panelWindow = useRef<number | null>(null);

  // Run classification (Heuristic baseline + optional AI)
  const runClassification = async (
    meta: PageMetadata,
    taxonomy: TaxonomyTemplate,
    shouldUseAI: boolean,
    settings: AISettings | null
  ) => {
    const version = ++requestVersion.current;
    setIsClassifyingWithAI(false);
    setAiRun(null);
    const baseline = proposeBookmarkFolder(meta, taxonomy);
    setSelectedFolder(baseline.fullPath.join(' / '));
    setIsAIProposed(false);
    setIsSaved(false);
    setActiveTabInfo((prev) => (prev ? { ...prev, proposal: baseline } : null));

    if (
      shouldUseAI &&
      settings
    ) {
      setIsClassifyingWithAI(true);
      try {
        let completedRun: AIClassificationRun | undefined;
        const aiRes = await classifySingleWithAI(
          meta,
          taxonomy,
          settings,
          report => {completedRun = report; if (version === requestVersion.current) setAiRun(report);}
        );
        if (version !== requestVersion.current) return;
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
            reasoning: `${settings.provider === 'ollama' ? 'Ollama' : 'Gemini'} (${completedRun?.model || getAIModelName(settings)}): ${aiRes.reasoning}`,
            suggestedTags: ['ai-classified', ...(meta.keywords?.slice(0, 3) || [])],
          };
          setSelectedFolder(fullPath.join(' / '));
          setIsAIProposed(true);
          setActiveTabInfo((prev) => (prev ? { ...prev, proposal: aiProp } : null));
        }
      } catch (err) {
        console.warn('Sidebar AI classification failed:', err);
      } finally {
        if (version === requestVersion.current) setIsClassifyingWithAI(false);
      }
    }
  };

  // Inspect current tab
  const inspectCurrentTab = (
    activeTaxonomy: TaxonomyTemplate = selectedTaxonomy,
    settings: AISettings | null = aiSettings
  ) => {
    const inspectionVersion = ++requestVersion.current;
    setActiveTabInfo(null);
    setPageMetadata(null);
    setAiRun(null);
    setIsClassifyingWithAI(false);
    setIsSaved(false);
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, ...(panelWindow.current !== null ? {windowId:panelWindow.current} : {currentWindow:true}) }, (tabs) => {
        if (inspectionVersion !== requestVersion.current) return;
        const tab = tabs[0];
        if (tab?.url) {
          const rawUrl = tab.url;
          const cleanRes = sanitizeUrl(rawUrl);
          const title = tab.title || rawUrl;

          if (tab.id && /^https?:/.test(rawUrl)) {
            readActivePageMetadata(tab.id, rawUrl, title, settings || DEFAULT_AI_SETTINGS).then((meta) => {
              if (inspectionVersion !== requestVersion.current) return;
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
              runClassification(meta, taxonomyRef.current, false, settings);
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
      runClassification(mockMeta, taxonomyRef.current, false, settings);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const preferred = await getPreferredTaxonomy();
      if (cancelled) return;
      setSelectedTaxonomy(preferred);
      taxonomyRef.current = preferred;
      const ai = await getAISettings();
      if (cancelled) return;
      setAiSettings(ai);

      const preferences = await getQuickSavePreferences(ai);
      if (cancelled) return;
      const initialUseAI = preferences.useAI;
      useAIRef.current = initialUseAI;
      setUseAI(initialUseAI);
      setAutoSortFolder(preferences.autoSort);

      setToolbarSidebar(await getToolbarOpensSidebar());
      if (typeof chrome !== 'undefined' && chrome.windows?.getCurrent) panelWindow.current = await new Promise<number | null>(resolve => chrome.windows.getCurrent(window => resolve(window.id ?? null)));
      if (cancelled) return;
      initialized.current = true;
      inspectCurrentTab(preferred, ai);
    }
    init();
    return () => {cancelled = true; initialized.current = false; requestVersion.current++;};

  }, []);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.onActivated) return;
    const activated = (info: chrome.tabs.TabActiveInfo) => {if (initialized.current && (panelWindow.current === null || info.windowId === panelWindow.current)) inspectCurrentTab();};
    const updated = (_id: number, changes: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (!initialized.current || !tab.active || (panelWindow.current !== null && tab.windowId !== panelWindow.current)) return;
      if (changes.url || changes.status === 'loading') {
        requestVersion.current++; setActiveTabInfo(null); setPageMetadata(null); setAiRun(null); setIsClassifyingWithAI(false); setIsSaved(false);
      }
      if (changes.status === 'complete' || (changes.url && tab.status === 'complete')) inspectCurrentTab();
    };
    chrome.tabs.onActivated.addListener(activated);
    chrome.tabs.onUpdated?.addListener(updated);
    return () => {
      chrome.tabs.onActivated.removeListener(activated);
      chrome.tabs.onUpdated?.removeListener(updated);
    };
  }, [selectedTaxonomy, useAI, aiSettings]);

  const handleTaxonomyChange = async (taxonomyId: string) => {
    const template = TAXONOMY_TEMPLATES.find((t) => t.id === taxonomyId) || DEFAULT_TAXONOMY;
    setSelectedTaxonomy(template);
    taxonomyRef.current = template;
    await setPreferredTaxonomy(template.id);

    if (pageMetadata) {
      runClassification(pageMetadata, template, false, aiSettings);
    }
  };

  const handleToggleAI = (enable: boolean) => {
    useAIRef.current = enable;
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
    setSaveError('');
    const savingVersion = requestVersion.current;
    const savingTab = activeTabInfo;
    try {
      const pathSegments = selectedFolder.split(' / ').map((s) => s.trim()).filter(Boolean);
      const folderId = await ensureFolderPath(pathSegments);
      await createBookmark(savingTab.title, savingTab.cleanedUrl, folderId);

      // Auto-sort the destination folder if enabled
      if (autoSortFolder) {
        try {
          await sortFolder(folderId);
        } catch (sortErr) {
          console.warn('Auto-sort folder error in sidebar:', sortErr);
        }
      }

      if (savingVersion === requestVersion.current) setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this page.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenManager = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/src/manager/index.html', '_blank');
    }
  };

  const toggleToolbar = async () => {
    try {
      await setToolbarOpensSidebar(!toolbarSidebar);
      setToolbarSidebar(!toolbarSidebar);
      setNotice(toolbarSidebar ? 'Toolbar button opens Quick Save.' : 'Toolbar button opens this sidebar.');
    } catch (err) {setNotice(err instanceof Error ? err.message : 'Could not change toolbar behavior.');}
  };

  return <div className="relative h-screen min-w-0 bg-slate-50 flex flex-col font-sans text-slate-800">
    <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0"><div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm"><Bookmark className="w-4 h-4"/></div><div><h1 className="font-bold text-sm">EdgeMark</h1><p className="text-[11px] text-slate-500">Your bookmarks, close at hand</p></div></div>
        <div className="flex gap-1"><button aria-label="Sidebar pin and toolbar settings" aria-expanded={showPinHelp} onClick={()=>setShowPinHelp(!showPinHelp)} title="Pin and toolbar settings" className="sidebar-button"><Pin className="w-4 h-4"/></button><button aria-label="Open full dashboard" title="Dashboard" onClick={handleOpenManager} className="sidebar-button"><Maximize2 className="w-4 h-4"/></button></div>
      </div>
      {showPinHelp && <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-3 text-xs">
        <div className="flex items-start justify-between gap-2"><p className="leading-relaxed">Keep EdgeMark handy with the browser's pin control or Extensions menu. Edge manages whether the sidebar stays open.</p><button aria-label="Close pin settings" onClick={()=>setShowPinHelp(false)}><X className="w-4 h-4"/></button></div>
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={toolbarSidebar} onChange={toggleToolbar}/>Open sidebar from toolbar</label>
        <p className="text-slate-500">Shortcut: Alt+Shift+B. Change it in your browser's extension keyboard shortcuts.</p>
        {notice && <p role="status" className="text-blue-700">{notice}</p>}
      </div>}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Sidebar views">
        <button role="tab" aria-selected={view==='library'} onClick={()=>setView('library')} className={`flex justify-center items-center gap-2 rounded-lg py-2 text-xs font-semibold ${view==='library'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><Bookmark className="w-3.5 h-3.5"/>Bookmarks</button>
        <button role="tab" aria-selected={view==='save'} onClick={()=>setView('save')} className={`flex justify-center items-center gap-2 rounded-lg py-2 text-xs font-semibold ${view==='save'?'bg-white text-blue-700 shadow-sm':'text-slate-500'}`}><FolderPlus className="w-3.5 h-3.5"/>Save page</button>
      </div>
    </header>
    <div className={view==='library'?'flex flex-1 min-h-0':'hidden'}><SidebarLibrary/></div>
    {view==='save' && <section className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" aria-label="Save current page">
      {activeTabInfo ? <>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex gap-2 items-center text-xs font-semibold text-slate-500"><PanelRight className="w-4 h-4"/>Current page</div>
          <h2 className="font-semibold text-sm text-slate-900 break-words">{activeTabInfo.title}</h2>
          <p className="text-xs text-slate-500 break-all">{activeTabInfo.cleanedUrl}</p>
          {activeTabInfo.strippedParams.length>0 && <p className="text-xs text-indigo-700">Removed {activeTabInfo.strippedParams.length} tracking parameters.</p>}
          <label className="block text-xs font-medium">Organization framework<select aria-label="Organization framework" value={selectedTaxonomy.id} onChange={e=>handleTaxonomyChange(e.target.value)} className="sidebar-input mt-1">{TAXONOMY_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="block text-xs font-medium">Save to folder<input aria-label="Save to folder" value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} className="sidebar-input mt-1"/></label>
          <p className="text-[11px] text-slate-500">{isAIProposed?'AI classification':'Rule suggestion'} · {Math.round((activeTabInfo.proposal?.confidence || 0)*100)}% match</p>
          <label className="flex gap-2 items-center text-xs text-slate-600"><input type="checkbox" checked={autoSortFolder} onChange={e=>setAutoSortFolder(e.target.checked)}/>Auto-sort destination by site</label>
          <button onClick={handleSaveCurrentTab} disabled={isSaving || isSaved || !selectedFolder.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{isSaved?<CheckCircle2 className="w-4 h-4"/>:<FolderPlus className="w-4 h-4"/>}{isSaved?'Bookmark saved':isSaving?'Saving…':'Save bookmark'}</button>
          {saveError && <p role="alert" className="text-xs text-red-700">{saveError}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600"/>Improve the suggestion</h3>
          <p className="text-xs text-slate-500 leading-relaxed">AI runs when you ask. Browsing bookmarks or switching pages uses local rules.</p>
          {isAIConfigured ? <button onClick={()=>handleToggleAI(true)} disabled={isClassifyingWithAI} className="w-full rounded-xl bg-purple-50 border border-purple-200 text-purple-800 py-2.5 font-medium text-xs flex justify-center gap-2 items-center">{isClassifyingWithAI?<Loader2 className="w-4 h-4 animate-spin"/>:<Bot className="w-4 h-4"/>}{isClassifyingWithAI?'Classifying…':`Ask ${aiSettings?.provider==='ollama'?'Ollama':'Gemini'}`}</button> : <button onClick={handleOpenManager} className="sidebar-button">Configure AI in Dashboard</button>}
          {aiSettings && <p className="text-[11px] text-slate-500">{describeAIPageContext(pageMetadata, aiSettings)}</p>}
          {aiRun && <p role="status" className="text-[11px] text-slate-600 leading-relaxed break-words">{describeAIRun(aiRun)}</p>}
          {isAIProposed && <p className="text-xs text-purple-700">{activeTabInfo.proposal?.reasoning}</p>}
        </div>
      </> : <div className="bg-white border border-slate-200 rounded-2xl px-4 py-8 text-center"><Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-3"/><h2 className="font-medium text-sm">Open a webpage to save it</h2><p className="text-xs text-slate-500 mt-2">Browser settings and extension pages cannot be bookmarked here.</p></div>}
    </section>}
  </div>;
};
