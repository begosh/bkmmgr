import {
  AISettings,
  AIClassificationResult,
  BookmarkItem,
  TaxonomyTemplate,
  ModelIntelligenceMeta,
} from '../types';
import { isLocalOrPrivateHost, sanitizeUrl } from './urlSanitizer';

export const KNOWN_MODELS_INTEL: Record<string, ModelIntelligenceMeta> = {
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    clevernessTier: 'Smart & Sharp (Latest Gen 3)',
    clevernessStars: 5,
    efficiencyTag: '🌱 Eco-Lean (<0.20s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '🎁 15 req/min, 1,500/day (Free on AI Studio)',
    bestFor: '🏆 Google Recommended for New Users: Ultra-fast Gen 3 model, perfect for JSON taxonomy sorting.',
    isRecommended: true,
  },
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    clevernessTier: 'Featherweight & Fast',
    clevernessStars: 4,
    efficiencyTag: '🍃 Ultra-Lean (<0.10s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '🎁 30 req/min, 4M tokens/min (Free)',
    bestFor: 'Massive bookmark collections (>5,000 links) where latency and lowest compute footprint are paramount.',
  },
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    clevernessTier: 'Smart & Sharp',
    clevernessStars: 4,
    efficiencyTag: '🌱 Eco-Lean (<0.22s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '🎁 15 req/min (Free on AI Studio)',
    bestFor: 'High-speed bookmark categorization with strong schema compliance and low energy use.',
  },
  'gemini-3.8-pro': {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    clevernessTier: 'Genius (Overkill)',
    clevernessStars: 5,
    efficiencyTag: '🌊 Boils the Ocean (>2.5s)',
    oceanBoilRisk: 'extreme',
    freeTierQuota: '⚠️ Strict: Only 2 req/min, 50/day (Free)',
    bestFor: 'Overkill for bookmarks. Consumes massive GPU compute clusters; designed for deep multi-step coding/math.',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    clevernessTier: 'Smart (Legacy Gen 2)',
    clevernessStars: 4,
    efficiencyTag: '🌱 Eco-Lean (<0.25s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '⚠️ Legacy Users Only',
    bestFor: 'No longer available to new API keys. Please switch to gemini-3.8-flash.',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    clevernessTier: 'Smart (Legacy)',
    clevernessStars: 4,
    efficiencyTag: '🌱 Eco-Lean (<0.3s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '⚠️ Deprecated',
    bestFor: 'Legacy model. Please use gemini-3.8-flash.',
  },
  'gemini-1.5-flash-latest': {
    id: 'gemini-1.5-flash-latest',
    name: 'Gemini 1.5 Flash (Latest)',
    clevernessTier: 'Smart & Sharp',
    clevernessStars: 4,
    efficiencyTag: '🌱 Eco-Lean (<0.35s)',
    oceanBoilRisk: 'low',
    freeTierQuota: '🎁 15 req/min (Free on AI Studio)',
    bestFor: 'Legacy alias. Please use gemini-3.8-flash.',
  },
};

/**
 * Returns practical intelligence, free tier limits, and compute footprint info for a model
 */
export function getModelIntelligence(modelId: string): ModelIntelligenceMeta {
  const normalized = modelId.replace(/^models\//, '').toLowerCase();

  if (KNOWN_MODELS_INTEL[normalized]) {
    return KNOWN_MODELS_INTEL[normalized];
  }

  // Dynamic heuristic for any discovered or custom model ID
  const isPro = normalized.includes('pro') || normalized.includes('ultra');
  const isLite =
    normalized.includes('lite') ||
    normalized.includes('8b') ||
    normalized.includes('micro') ||
    normalized.includes('nano');
  const isFlash = normalized.includes('flash');

  if (isPro) {
    return {
      id: modelId,
      name: modelId,
      clevernessTier: 'Genius (Heavy)',
      clevernessStars: 5,
      efficiencyTag: '🌊 Boils the Ocean (>2.5s)',
      oceanBoilRisk: 'extreme',
      freeTierQuota: '⚠️ Strict: Usually 2 req/min free',
      bestFor: 'Heavy compute cluster model. Great for deep analysis, overkill for bookmark folders.',
    };
  }

  if (isLite) {
    return {
      id: modelId,
      name: modelId,
      clevernessTier: 'Featherweight & Fast',
      clevernessStars: 3,
      efficiencyTag: '🍃 Ultra-Lean (<0.15s)',
      oceanBoilRisk: 'low',
      freeTierQuota: '🎁 High Throughput Free (30+ req/min)',
      bestFor: 'Ultra-fast, lowest compute footprint. Ideal for huge bookmark libraries.',
    };
  }

  if (isFlash) {
    return {
      id: modelId,
      name: modelId,
      clevernessTier: 'Smart & Sharp (Ideal)',
      clevernessStars: 4,
      efficiencyTag: '🌱 Eco-Lean (<0.3s)',
      oceanBoilRisk: 'low',
      freeTierQuota: '🎁 15 req/min (Free on AI Studio)',
      bestFor: '🏆 Excellent choice for bookmark organization: fast, accurate, and gentle on compute.',
      isRecommended: true,
    };
  }

  return {
    id: modelId,
    name: modelId,
    clevernessTier: 'General Purpose',
    clevernessStars: 4,
    efficiencyTag: '⚖️ Standard Compute (~0.8s)',
    oceanBoilRisk: 'moderate',
    freeTierQuota: '🎁 Standard Free Tier Quota',
    bestFor: 'Standard model for classification and structured output.',
  };
}

export const DEPRECATED_GEMINI_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
]);

export const CURRENT_DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  provider: 'gemini-api',
  geminiApiKey: '',
  geminiModel: CURRENT_DEFAULT_GEMINI_MODEL,
  googleOAuthClientId: '',
  googleOAuthScope: 'https://www.googleapis.com/auth/generative-language',
  googleAccessToken: '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  classificationMode: 'hybrid',
  stripQueryParamsBeforeAI: true,
  excludeLocalAndIntranet: true,
};

const STORAGE_KEY = 'edgemark_ai_settings';

/**
 * Loads AI settings from chrome.storage.local or localStorage.
 * Automatically migrates deprecated models (e.g. gemini-1.5-flash, gemini-2.5-flash) to gemini-3.8-flash.
 */
export async function getAISettings(): Promise<AISettings> {
  let loaded: AISettings = { ...DEFAULT_AI_SETTINGS };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const saved = await new Promise<any>((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (res) => resolve(res?.[STORAGE_KEY]));
    });
    if (saved) {
      loaded = { ...DEFAULT_AI_SETTINGS, ...saved };
    }
  } else {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        loaded = { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback
    }
  }

  // Auto-migration: if loaded model is deprecated or missing, upgrade to CURRENT_DEFAULT_GEMINI_MODEL
  if (!loaded.geminiModel || DEPRECATED_GEMINI_MODELS.has(loaded.geminiModel)) {
    const oldModel = loaded.geminiModel;
    loaded.geminiModel = CURRENT_DEFAULT_GEMINI_MODEL;
    // Persist migrated settings back to storage immediately
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: loaded });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      } catch {
        // fallback
      }
    }
    console.info(
      `[EdgeMark AI] Auto-migrated deprecated model "${oldModel}" to "${CURRENT_DEFAULT_GEMINI_MODEL}" in storage.`
    );
  }

  return loaded;
}

/**
 * Saves AI settings to chrome.storage.local
 */
export async function saveAISettings(settings: Partial<AISettings>): Promise<AISettings> {
  const current = await getAISettings();
  const updated: AISettings = { ...current, ...settings };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => resolve());
    });
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // fallback
    }
  }

  return updated;
}

/**
 * Returns the exact OAuth redirect URL for this extension in Chromium / Edge
 */
export function getOAuthRedirectUrl(): string {
  if (typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL) {
    try {
      return chrome.identity.getRedirectURL();
    } catch {
      // fallback
    }
  }
  const extId =
    typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'your-extension-id';
  return `https://${extId}.chromiumapp.org/`;
}

/**
 * Triggers interactive Google OAuth 2.0 Web Auth Flow in Edge / Chromium
 */
export async function loginWithGoogleOAuth(
  clientId: string,
  customScope?: string
): Promise<string> {
  if (!clientId || clientId.trim() === '') {
    throw new Error(
      'Google OAuth Client ID is required. Please provide a Client ID created in Google Cloud Console.'
    );
  }

  if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) {
    throw new Error('chrome.identity API is not available in this environment.');
  }

  const redirectUri = getOAuthRedirectUrl();
  const effectiveScope =
    customScope && customScope.trim() !== ''
      ? customScope.trim()
      : 'https://www.googleapis.com/auth/generative-language';

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId.trim())}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(effectiveScope)}` +
    `&prompt=consent`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          return reject(
            new Error(chrome.runtime.lastError.message || 'OAuth flow failed or was cancelled.')
          );
        }
        if (!responseUrl) {
          return reject(new Error('No response URL received from Google login.'));
        }
        try {
          const url = new URL(responseUrl);
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
          const token = hashParams.get('access_token');
          if (token) {
            resolve(token);
          } else {
            const error =
              hashParams.get('error') || url.searchParams.get('error') || 'Access token missing';
            reject(new Error(`OAuth error: ${error}`));
          }
        } catch (err: any) {
          reject(new Error(`Failed to parse redirect response: ${err.message}`));
        }
      }
    );
  });
}

/**
 * Queries Google's ModelService.ListModels to retrieve models supporting generateContent
 */
export async function fetchAvailableGeminiModels(
  apiKey?: string,
  accessToken?: string
): Promise<{ id: string; name: string; description?: string }[]> {
  let url = 'https://generativelanguage.googleapis.com/v1beta/models';
  const headers: Record<string, string> = {};

  if (apiKey && apiKey.trim()) {
    url += `?key=${apiKey.trim()}`;
  } else if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    throw new Error('API Key or OAuth Access Token required to list models.');
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    const errMsg = errorData.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
    throw new Error(`Failed to list models: ${errMsg}`);
  }

  const data = await resp.json();
  const rawList: any[] = data.models || [];

  return rawList
    .filter((m: any) => {
      const methods: string[] = m.supportedMethods || m.supportedGenerationMethods || [];
      return methods.includes('generateContent');
    })
    .map((m: any) => {
      const cleanId = m.name.replace(/^models\//, '');
      return {
        id: cleanId,
        name: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
        description: m.description,
      };
    });
}

/**
 * Extracts a suggested replacement model from Google error messages like:
 * "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features..."
 */
export function extractSuggestedReplacementModel(errorMessage: string, currentModel: string): string | null {
  if (!errorMessage) return null;

  // 1. Look for explicit recommendation: "use models/xyz" or "to models/xyz"
  const explicitMatch = errorMessage.match(/(?:use|to)\s+models\/([a-zA-Z0-9.-]+)/i);
  if (
    explicitMatch &&
    explicitMatch[1] &&
    explicitMatch[1] !== currentModel &&
    !DEPRECATED_GEMINI_MODELS.has(explicitMatch[1])
  ) {
    return explicitMatch[1];
  }

  // 2. Look for any models/<id> that is different from currentModel and not in deprecated set
  const allMatches = Array.from(errorMessage.matchAll(/models\/([a-zA-Z0-9.-]+)/g));
  for (const m of allMatches) {
    const candidate = m[1];
    if (candidate && candidate !== currentModel && !DEPRECATED_GEMINI_MODELS.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Verifies connection and credentials with the selected AI provider
 */
export async function testAIConnection(
  settings: AISettings
): Promise<{ success: boolean; message: string; modelInfo?: string }> {
  if (settings.provider === 'gemini-api') {
    if (!settings.geminiApiKey || settings.geminiApiKey.trim() === '') {
      return { success: false, message: 'Please enter a Gemini API Key.' };
    }

    let model = settings.geminiModel || CURRENT_DEFAULT_GEMINI_MODEL;
    if (DEPRECATED_GEMINI_MODELS.has(model)) {
      model = CURRENT_DEFAULT_GEMINI_MODEL;
      await saveAISettings({ geminiModel: CURRENT_DEFAULT_GEMINI_MODEL });
    }

    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey.trim()}`;

    try {
      let resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with exactly the word: CONNECTED' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      // If requested model was deprecated or not found, auto-discover models or parse Google error suggestion
      if (!resp.ok && (resp.status === 404 || resp.status === 400)) {
        try {
          const errData = await resp.clone().json().catch(() => ({}));
          const errMsgText: string = errData.error?.message || '';

          let targetReplacement = extractSuggestedReplacementModel(errMsgText, model);

          if (!targetReplacement) {
            const availableModels = await fetchAvailableGeminiModels(settings.geminiApiKey);
            const preferred =
              availableModels.find((m) => m.id.includes('3.8-flash')) ||
              availableModels.find((m) => m.id.includes('3.5-flash')) ||
              availableModels.find((m) => m.id.includes('flash') && !DEPRECATED_GEMINI_MODELS.has(m.id)) ||
              availableModels.find((m) => m.id.includes('flash')) ||
              availableModels[0];

            if (preferred) {
              targetReplacement = preferred.id;
            }
          }

          if (targetReplacement && targetReplacement !== model) {
            const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetReplacement}:generateContent?key=${settings.geminiApiKey.trim()}`;
            const retryResp = await fetch(retryUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Respond with exactly the word: CONNECTED' }] }],
                generationConfig: { maxOutputTokens: 10 },
              }),
            });

            if (retryResp.ok) {
              await saveAISettings({ geminiModel: targetReplacement });
              return {
                success: true,
                message: `Connection successful! Auto-upgraded from "${model}" to active model "${targetReplacement}".`,
                modelInfo: targetReplacement,
              };
            }
          }
        } catch {
          // Continue to standard error reporting
        }
      }

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        return { success: false, message: `Gemini API Error: ${errMsg}` };
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
      return {
        success: true,
        message: `Connection successful! Gemini answered: "${text}"`,
        modelInfo: model,
      };
    } catch (err: any) {
      return { success: false, message: `Network request failed: ${err.message}` };
    }
  }

  if (settings.provider === 'google-oauth') {
    if (!settings.googleAccessToken) {
      return { success: false, message: 'No active Google OAuth token found. Please sign in.' };
    }

    let model = settings.geminiModel || CURRENT_DEFAULT_GEMINI_MODEL;
    if (DEPRECATED_GEMINI_MODELS.has(model)) {
      model = CURRENT_DEFAULT_GEMINI_MODEL;
      await saveAISettings({ geminiModel: CURRENT_DEFAULT_GEMINI_MODEL });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      let resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.googleAccessToken}`,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the word: CONNECTED' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (!resp.ok && (resp.status === 404 || resp.status === 400)) {
        try {
          const errData = await resp.clone().json().catch(() => ({}));
          const errMsgText: string = errData.error?.message || '';

          let targetReplacement = extractSuggestedReplacementModel(errMsgText, model);

          if (!targetReplacement) {
            const availableModels = await fetchAvailableGeminiModels(undefined, settings.googleAccessToken);
            const preferred =
              availableModels.find((m) => m.id.includes('3.8-flash')) ||
              availableModels.find((m) => m.id.includes('3.5-flash')) ||
              availableModels.find((m) => m.id.includes('flash') && !DEPRECATED_GEMINI_MODELS.has(m.id)) ||
              availableModels.find((m) => m.id.includes('flash')) ||
              availableModels[0];

            if (preferred) {
              targetReplacement = preferred.id;
            }
          }

          if (targetReplacement && targetReplacement !== model) {
            const retryResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${targetReplacement}:generateContent`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${settings.googleAccessToken}`,
                },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Respond with the word: CONNECTED' }] }],
                  generationConfig: { maxOutputTokens: 10 },
                }),
              }
            );

            if (retryResp.ok) {
              await saveAISettings({ geminiModel: targetReplacement });
              return {
                success: true,
                message: `Google OAuth connection verified with Gemini! Auto-upgraded to active model "${targetReplacement}".`,
                modelInfo: targetReplacement,
              };
            }
          }
        } catch {
          // Continue to error reporting
        }
      }

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        return { success: false, message: `OAuth Gemini API Error: ${errMsg}` };
      }

      return {
        success: true,
        message: `Google OAuth connection verified with Gemini!`,
        modelInfo: model,
      };
    } catch (err: any) {
      return { success: false, message: `OAuth test failed: ${err.message}` };
    }
  }

  if (settings.provider === 'ollama') {
    const endpoint = (settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
    try {
      const resp = await fetch(`${endpoint}/api/tags`);
      if (!resp.ok) {
        return { success: false, message: `Ollama returned HTTP ${resp.status}` };
      }
      const data = await resp.json();
      const models = data.models?.map((m: any) => m.name).join(', ') || 'No local models found';
      return {
        success: true,
        message: `Connected to Ollama! Available models: ${models}`,
        modelInfo: settings.ollamaModel || 'default',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Could not reach Ollama at ${endpoint}. Ensure Ollama is running and CORS allows web extensions (OLLAMA_ORIGINS="*"). Error: ${err.message}`,
      };
    }
  }

  return { success: false, message: 'AI assistance is disabled.' };
}

/**
 * Batches bookmark classification requests to the AI provider
 */
export async function batchClassifyWithAI(
  items: BookmarkItem[],
  taxonomy: TaxonomyTemplate,
  customSettings?: AISettings
): Promise<Record<string, AIClassificationResult>> {
  const settings = customSettings || (await getAISettings());
  if (!settings.enabled || settings.provider === 'disabled' || items.length === 0) {
    return {};
  }

  // Filter items according to privacy options
  const eligibleItems: { id: string; title: string; url: string; domain: string }[] = [];

  for (const item of items) {
    if (!item.url || !item.url.startsWith('http')) continue;

    let domain = '';
    try {
      domain = new URL(item.url).hostname;
    } catch {
      continue;
    }

    // Skip private & homelab hosts if user selected protection
    if (settings.excludeLocalAndIntranet && isLocalOrPrivateHost(domain)) {
      continue;
    }

    const effectiveUrl = settings.stripQueryParamsBeforeAI
      ? sanitizeUrl(item.url).cleanedUrl
      : item.url;

    eligibleItems.push({
      id: item.id,
      title: item.title,
      url: effectiveUrl,
      domain,
    });
  }

  if (eligibleItems.length === 0) {
    return {};
  }

  // Format the taxonomy specification for the prompt
  const taxonomySpec = taxonomy.rootFolders.map((root) => ({
    category: root.name,
    description: root.description,
    allowedSubfolders: root.subfolders || [],
  }));

  const prompt = `You are a professional knowledge management & bookmark classification assistant.
Organize each bookmark into the provided taxonomy structure based on the URL, title, and domain.

Taxonomy structure:
${JSON.stringify(taxonomySpec, null, 2)}

Bookmarks to classify:
${JSON.stringify(eligibleItems, null, 2)}

Rules:
1. "category" MUST strictly match one of the category names listed in the taxonomy.
2. "subfolder" MUST strictly match one of the allowedSubfolders for that category (or empty string if none).
3. Provide a confidence score between 0.0 and 1.0.
4. Provide a concise 1-sentence reasoning explaining why it belongs there.
5. Return ONLY a valid JSON array of objects adhering to this schema:
[
  {
    "id": "bookmark_id",
    "category": "Exact Category Name",
    "subfolder": "Exact Subfolder Name",
    "confidence": 0.95,
    "reasoning": "Brief explanation"
  }
]`;

  if (settings.provider === 'gemini-api' || settings.provider === 'google-oauth') {
    let model = settings.geminiModel || CURRENT_DEFAULT_GEMINI_MODEL;
    if (DEPRECATED_GEMINI_MODELS.has(model)) {
      model = CURRENT_DEFAULT_GEMINI_MODEL;
      await saveAISettings({ geminiModel: CURRENT_DEFAULT_GEMINI_MODEL });
    }

    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (settings.provider === 'gemini-api') {
      url += `?key=${settings.geminiApiKey?.trim()}`;
    } else {
      headers['Authorization'] = `Bearer ${settings.googleAccessToken}`;
    }

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    let resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Auto-recovery if configured model is 404 / deprecated
    if (!resp.ok && (resp.status === 404 || resp.status === 400)) {
      try {
        const errData = await resp.clone().json().catch(() => ({}));
        const errMsgText: string = errData.error?.message || '';

        let targetReplacement = extractSuggestedReplacementModel(errMsgText, model);

        if (!targetReplacement) {
          const availableModels = await fetchAvailableGeminiModels(
            settings.geminiApiKey,
            settings.googleAccessToken
          );
          const preferred =
            availableModels.find((m) => m.id.includes('3.8-flash')) ||
            availableModels.find((m) => m.id.includes('3.5-flash')) ||
            availableModels.find((m) => m.id.includes('flash') && !DEPRECATED_GEMINI_MODELS.has(m.id)) ||
            availableModels.find((m) => m.id.includes('flash')) ||
            availableModels[0];

          if (preferred) {
            targetReplacement = preferred.id;
          }
        }

        if (targetReplacement && targetReplacement !== model) {
          model = targetReplacement;
          let retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          if (settings.provider === 'gemini-api') {
            retryUrl += `?key=${settings.geminiApiKey?.trim()}`;
          }
          resp = await fetch(retryUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            await saveAISettings({ geminiModel: model });
          }
        }
      } catch {
        // Fall through to error handler
      }
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Gemini classification failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      return {};
    }

    return parseAIClassificationResponse(rawContent, taxonomy);
  }

  if (settings.provider === 'ollama') {
    const endpoint = (settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
    const model = settings.ollamaModel || 'llama3.2';

    const resp = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Ollama classification failed with HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return parseAIClassificationResponse(data.response, taxonomy);
  }

  return {};
}

/**
 * Validates and normalizes AI response against taxonomy bounds
 */
function parseAIClassificationResponse(
  rawJson: string,
  taxonomy: TaxonomyTemplate
): Record<string, AIClassificationResult> {
  const result: Record<string, AIClassificationResult> = {};

  try {
    let parsed: any;
    // Strip markdown backticks if present
    const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      // Check if wrapped in object like { items: [...] }
      if (parsed.items && Array.isArray(parsed.items)) {
        parsed = parsed.items;
      } else {
        return result;
      }
    }

    for (const item of parsed) {
      if (!item.id || !item.category) continue;

      // Verify category exists in taxonomy
      const matchedCategory = taxonomy.rootFolders.find(
        (c) => c.name.toLowerCase() === item.category.trim().toLowerCase()
      );

      if (!matchedCategory) continue;

      // Verify subfolder
      let matchedSubfolder = '';
      if (item.subfolder && matchedCategory.subfolders) {
        const found = matchedCategory.subfolders.find(
          (sf) => sf.toLowerCase() === item.subfolder.trim().toLowerCase()
        );
        matchedSubfolder = found || matchedCategory.subfolders[0] || '';
      }

      result[item.id] = {
        id: item.id,
        category: matchedCategory.name,
        subfolder: matchedSubfolder,
        confidence: typeof item.confidence === 'number' ? Math.min(Math.max(item.confidence, 0), 1) : 0.85,
        reasoning: item.reasoning || `Classified by AI into ${matchedCategory.name}`,
      };
    }
  } catch (err) {
    console.error('Failed to parse AI classification output:', err, rawJson);
  }

  return result;
}

/**
 * Classifies a single webpage or bookmark using the configured AI provider
 */
export async function classifySingleWithAI(
  page: { url: string; title: string },
  taxonomy: TaxonomyTemplate,
  customSettings?: AISettings
): Promise<AIClassificationResult | null> {
  const fakeId = 'quick-save-active-tab';
  const item: BookmarkItem = {
    id: fakeId,
    url: page.url,
    title: page.title,
  };
  const results = await batchClassifyWithAI([item], taxonomy, customSettings);
  return results[fakeId] || null;
}
