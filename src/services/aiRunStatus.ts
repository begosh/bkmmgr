import { AIClassificationRun, AISettings } from '../types';

export function getAIModelName(settings: AISettings): string {
  return settings.provider === 'ollama'
    ? settings.ollamaModel || 'qwen3.5:4b-q4_K_M'
    : settings.geminiModel || 'gemini-3.8-flash';
}

export function isAIConfigured(settings: AISettings | null): boolean {
  if (!settings?.enabled) return false;
  return settings.provider === 'ollama' ||
    (settings.provider === 'gemini-api' && Boolean(settings.geminiApiKey?.trim())) ||
    (settings.provider === 'google-oauth' && Boolean(settings.googleAccessToken));
}

export async function getQuickSavePreferences(settings: AISettings): Promise<{useAI: boolean; autoSort: boolean}> {
  const saved = typeof chrome !== 'undefined' && chrome.storage?.local?.get
    ? await new Promise<Record<string, unknown>>(resolve => chrome.storage.local.get(
      ['edgemark_autosort_on_save', 'edgemark_use_ai_in_popup'], data => resolve(data || {})
    )) : {};
  return {
    useAI: typeof saved.edgemark_use_ai_in_popup === 'boolean' ? saved.edgemark_use_ai_in_popup : isAIConfigured(settings),
    autoSort: typeof saved.edgemark_autosort_on_save === 'boolean' ? saved.edgemark_autosort_on_save : true,
  };
}

export function createAIRun(settings: AISettings, candidateCount: number): AIClassificationRun {
  return {
    status: 'running', provider: settings.provider, model: getAIModelName(settings), classificationMode: settings.classificationMode,
    candidateCount, sentCount: 0, requestCount: 0, completedRequestCount: 0,
    classifiedCount: 0, contextCount: 0, elapsedMs: 0, promptTokens: 0, responseTokens: 0,
  };
}

export function describeAIRun(run: AIClassificationRun): string {
  const source = run.provider === 'ollama' ? 'Ollama' : 'Gemini';
  if (!run.requestCount) return `AI not called. ${run.reason || 'Preparing classification.'}`;
  const timing = `${(run.elapsedMs / 1000).toFixed(1)}s`;
  const counts = `${run.requestCount} request${run.requestCount === 1 ? '' : 's'} (${run.completedRequestCount} answered) · ${run.classifiedCount}/${run.sentCount} classified · ${timing}`;
  const unsent = run.candidateCount - run.sentCount;
  const mode = run.classificationMode === 'ai-only' ? 'AI Primary' : 'Hybrid';
  const skipped = unsent > 0 ? ` · ${unsent} excluded or not sent` : '';
  const context = ` · ${run.contextCount} with page context`;
  const tokens = run.responseTokens ? ` · ${run.responseTokens} output tokens` : '';
  return `${source} (${run.model}): ${counts}${context}${tokens}${skipped} · ${mode}.${run.reason ? ` ${run.reason}` : ''}`;
}
