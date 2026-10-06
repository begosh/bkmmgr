import React, { useState, useEffect } from 'react';
import { AISettings } from '../types';
import {
  getAISettings,
  saveAISettings,
  testAIConnection,
  loginWithGoogleOAuth,
  getOAuthRedirectUrl,
  fetchAvailableGeminiModels,
  getModelIntelligence,
  DEPRECATED_GEMINI_MODELS,
  CURRENT_DEFAULT_GEMINI_MODEL,
} from '../services/aiProvider';
import {
  Bot,
  Key,
  Server,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  LogIn,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Leaf,
  Zap,
  Waves,
  Award,
} from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; name: string }[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    getAISettings().then(setSettings);
  }, []);

  const handleDiscoverModels = async () => {
    if (!settings?.geminiApiKey) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Please enter a Gemini API Key first to discover models.',
      });
      return;
    }
    setIsDiscovering(true);
    try {
      const models = await fetchAvailableGeminiModels(settings.geminiApiKey);
      setDiscoveredModels(models);
      if (models.length > 0) {
        const match = models.find((m) => m.id === settings.geminiModel);
        if (!match || DEPRECATED_GEMINI_MODELS.has(settings.geminiModel || '')) {
          const preferred =
            models.find((m) => m.id.includes('3.8-flash')) ||
            models.find((m) => m.id.includes('3.5-flash')) ||
            models.find((m) => m.id.includes('flash') && !DEPRECATED_GEMINI_MODELS.has(m.id)) ||
            models.find((m) => m.id.includes('flash')) ||
            models[0];
          await handleUpdate({ geminiModel: preferred.id });
        }
        setTestStatus({
          loading: false,
          success: true,
          message: `Discovered ${models.length} active models for your API key!`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: `Model discovery failed: ${err.message}`,
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading AI settings...
      </div>
    );
  }

  const currentModelIntel = getModelIntelligence(settings.geminiModel || CURRENT_DEFAULT_GEMINI_MODEL);

  const handleUpdate = async (patch: Partial<AISettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setIsSaving(true);
    try {
      await saveAISettings(patch);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await testAIConnection(settings);
      setTestStatus({
        loading: false,
        success: res.success,
        message: res.message,
      });
      // Synchronize UI state if model was upgraded during connection test
      if (res.modelInfo && res.modelInfo !== settings.geminiModel) {
        setSettings((prev) => (prev ? { ...prev, geminiModel: res.modelInfo! } : prev));
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Connection test failed',
      });
    }
  };

  const handleGoogleOAuthLogin = async () => {
    if (!settings.googleOAuthClientId) {
      setOauthError('Please enter a Google Cloud OAuth Client ID first.');
      return;
    }
    setOauthLoading(true);
    setOauthError(null);
    try {
      const token = await loginWithGoogleOAuth(
        settings.googleOAuthClientId,
        settings.googleOAuthScope
      );
      await handleUpdate({ googleAccessToken: token });
      setTestStatus({
        loading: false,
        success: true,
        message: 'Successfully authenticated with Google OAuth in Edge!',
      });
    } catch (err: any) {
      setOauthError(err.message || 'Google sign-in failed');
    } finally {
      setOauthLoading(false);
    }
  };

  const redirectUrl = getOAuthRedirectUrl();

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">AI Assistant & Sorting Settings</h2>
              {settings.enabled ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  AI Active
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Rules Only
                </span>
              )}
              {isSaving && <span className="text-xs text-slate-400 italic">Saving...</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure Google Gemini or local LLM models to organize ambiguous bookmarks and suggest
              subfolders beyond static heuristics.
            </p>
          </div>
        </div>

        {/* Master AI Toggle */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-700">Enable AI Assistance</span>
          <button
            type="button"
            onClick={() => handleUpdate({ enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.enabled ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Bot className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-800">AI Provider Selection</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Gemini API Key */}
          <button
            onClick={() => handleUpdate({ provider: 'gemini-api' })}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              settings.provider === 'gemini-api'
                ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Recommended
              </span>
              <Key className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Google Gemini API Key</h4>
            <p className="text-xs text-slate-500 mt-1">
              Zero backend required. Uses generous Google AI Studio free tier (15 RPM / 1M tokens).
            </p>
          </button>

          {/* Option 2: Google OAuth */}
          <button
            onClick={() => handleUpdate({ provider: 'google-oauth' })}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              settings.provider === 'google-oauth'
                ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Edge WebAuth
              </span>
              <LogIn className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Google Sign-In (OAuth)</h4>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your Google account via Edge’s native launchWebAuthFlow.
            </p>
          </button>

          {/* Option 3: Ollama */}
          <button
            onClick={() => handleUpdate({ provider: 'ollama' })}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              settings.provider === 'ollama'
                ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                100% Private
              </span>
              <Server className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Local LLM (Ollama)</h4>
            <p className="text-xs text-slate-500 mt-1">
              Runs locally on your PC or homelab server. No corporate URLs ever leave your network.
            </p>
          </button>
        </div>

        {/* Provider Specific Configuration Forms */}
        {settings.provider === 'gemini-api' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => handleUpdate({ geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full text-xs font-mono px-3 py-2 pr-10 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Model</label>
                <button
                  type="button"
                  onClick={handleDiscoverModels}
                  disabled={isDiscovering || !settings.geminiApiKey}
                  className="text-xs font-medium text-purple-600 hover:text-purple-800 disabled:text-slate-400 flex items-center space-x-1"
                  title="Query Google ModelService.ListModels API to fetch active models for your API key"
                >
                  <RefreshCw className={`w-3 h-3 ${isDiscovering ? 'animate-spin' : ''}`} />
                  <span>{isDiscovering ? 'Discovering...' : 'Auto-Discover Models'}</span>
                </button>
              </div>

              {settings.geminiModel && DEPRECATED_GEMINI_MODELS.has(settings.geminiModel) && (
                <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>{settings.geminiModel}</strong> is retired by Google for new keys.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ geminiModel: CURRENT_DEFAULT_GEMINI_MODEL })}
                    className="text-xs font-semibold px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm whitespace-nowrap"
                  >
                    Upgrade to {CURRENT_DEFAULT_GEMINI_MODEL}
                  </button>
                </div>
              )}

              <select
                value={settings.geminiModel || CURRENT_DEFAULT_GEMINI_MODEL}
                onChange={(e) => handleUpdate({ geminiModel: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              >
                {discoveredModels.length > 0 ? (
                  discoveredModels.map((m) => {
                    const intel = getModelIntelligence(m.id);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.id} — {intel.efficiencyTag} | {intel.freeTierQuota}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="gemini-3.8-flash">
                      gemini-3.8-flash — 🌱 Eco-Lean (&lt;0.20s) | 🎁 15 req/min Free | 🏆 Google Recommended for New Users
                    </option>
                    <option value="gemini-3.5-flash-lite">
                      gemini-3.5-flash-lite — 🍃 Featherweight (&lt;0.10s) | 🎁 30 req/min Free
                    </option>
                    <option value="gemini-3.5-flash">
                      gemini-3.5-flash — 🌱 Eco-Lean (&lt;0.22s) | 🎁 15 req/min Free
                    </option>
                    <option value="gemini-3.8-pro">
                      gemini-3.8-pro — 🌊 Boils the Ocean (&gt;2.5s) | ⚠️ Strict 2 req/min | 🧠 Overkill
                    </option>
                    {settings.geminiModel && DEPRECATED_GEMINI_MODELS.has(settings.geminiModel) && (
                      <option value={settings.geminiModel}>
                        {settings.geminiModel} — ⚠️ Discontinued / Deprecated (Upgrade recommended)
                      </option>
                    )}
                  </>
                )}
              </select>

              {/* Model Intelligence & Efficiency Profile Card */}
              <div
                className={`mt-2.5 p-3 rounded-xl border transition-all ${
                  currentModelIntel.oceanBoilRisk === 'extreme'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{currentModelIntel.name}</span>
                    {currentModelIntel.isRecommended && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                        <Award className="w-3 h-3 text-emerald-600" />
                        <span>Best for Bookmarks</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-amber-500 text-xs">
                    <span>{'★'.repeat(currentModelIntel.clevernessStars)}</span>
                    <span className="text-slate-300">{'★'.repeat(5 - currentModelIntel.clevernessStars)}</span>
                    <span className="text-[10px] font-semibold text-slate-600 ml-1">
                      {currentModelIntel.clevernessTier}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Compute / Eco Indicator */}
                  <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg">
                    {currentModelIntel.oceanBoilRisk === 'extreme' ? (
                      <Waves className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                        Compute & Eco Footprint
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          currentModelIntel.oceanBoilRisk === 'extreme'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {currentModelIntel.efficiencyTag}
                      </span>
                    </div>
                  </div>

                  {/* Free Quota Allowance */}
                  <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg">
                    <Zap className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                        Free Tier Allowance
                      </span>
                      <span className="text-[11px] font-bold text-purple-700">
                        {currentModelIntel.freeTierQuota}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 mt-2 leading-snug">
                  {currentModelIntel.bestFor}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Tip: Click <em>Auto-Discover Models</em> above to pull live model IDs enabled on your Google AI Studio key.
              </p>
            </div>
          </div>
        )}

        {settings.provider === 'google-oauth' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 space-y-1">
              <p className="font-semibold">How Edge OAuth works with Google Cloud:</p>
              <p>
                1. Go to{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  Google Cloud Console &gt; Credentials
                </a>
                .
              </p>
              <p>
                2. Create an <strong>OAuth 2.0 Client ID</strong> (Application type: <em>Web application</em>).
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <span>3. Add this exact Authorized Redirect URI:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-blue-300 font-mono text-[11px]">
                  {redirectUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyRedirect}
                  className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100"
                  title="Copy Redirect URL"
                >
                  {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Google Cloud OAuth Client ID
              </label>
              <input
                type="text"
                value={settings.googleOAuthClientId || ''}
                onChange={(e) => handleUpdate({ googleOAuthClientId: e.target.value })}
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                OAuth Authorization Scope
              </label>
              <select
                value={settings.googleOAuthScope || 'https://www.googleapis.com/auth/generative-language'}
                onChange={(e) => handleUpdate({ googleOAuthScope: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              >
                <option value="https://www.googleapis.com/auth/generative-language">
                  https://www.googleapis.com/auth/generative-language (Generative Language API)
                </option>
                <option value="https://www.googleapis.com/auth/cloud-platform">
                  https://www.googleapis.com/auth/cloud-platform (Standard Google Cloud Platform)
                </option>
                <option value="https://www.googleapis.com/auth/generative-language https://www.googleapis.com/auth/cloud-platform">
                  Both Scopes (generative-language + cloud-platform)
                </option>
              </select>
            </div>

            {/* Troubleshooting Alert for Error 400: invalid_scope */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold flex items-center space-x-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Fixing "Error 400: invalid_scope: Some requested scopes cannot be shown"</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Google blocks OAuth scopes if they are not enabled in your Google Cloud Project or added to your Consent Screen:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-amber-900 font-medium">
                <li>
                  <a
                    href="https://console.cloud.google.com/flows/enableapi?apiid=generativelanguage.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-700 hover:text-blue-900"
                  >
                    Click here to enable Google Generative Language API
                  </a>{' '}
                  in your project.
                </li>
                <li>
                  In{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-700 hover:text-blue-900"
                  >
                    OAuth Consent Screen &gt; Edit App &gt; Scopes
                  </a>
                  , click <em>Add or remove scopes</em> and add the scope.
                </li>
                <li>
                  Under <em>Audience &gt; Test users</em>, add your Google email address.
                </li>
                <li>
                  Alternatively, switch the scope dropdown above to <code>https://www.googleapis.com/auth/cloud-platform</code>.
                </li>
              </ol>
              <div className="pt-1 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                <span className="text-amber-800 font-semibold">Tip: Want zero setup?</span>
                <button
                  type="button"
                  onClick={() => handleUpdate({ provider: 'gemini-api' })}
                  className="font-bold text-purple-700 hover:text-purple-900 underline"
                >
                  Use Gemini API Key instead (1-click free, no GCP setup) &rarr;
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={handleGoogleOAuthLogin}
                disabled={oauthLoading || !settings.googleOAuthClientId}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{oauthLoading ? 'Signing in via Edge...' : 'Sign in with Google Account'}</span>
              </button>
              {settings.googleAccessToken && (
                <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Account Linked</span>
                </span>
              )}
            </div>

            {oauthError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{oauthError}</span>
              </div>
            )}
          </div>
        )}

        {settings.provider === 'ollama' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Ollama API Endpoint
              </label>
              <input
                type="text"
                value={settings.ollamaEndpoint || 'http://localhost:11434'}
                onChange={(e) => handleUpdate({ ollamaEndpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Note: In Windows PowerShell, run <code>$env:OLLAMA_ORIGINS="*" ; ollama serve</code> to allow browser extension CORS.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Model Name
              </label>
              <input
                type="text"
                value={settings.ollamaModel || 'llama3.2'}
                onChange={(e) => handleUpdate({ ollamaModel: e.target.value })}
                placeholder="llama3.2 or mistral"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Test Connection Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.loading}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{testStatus.loading ? 'Testing...' : 'Test AI Connection'}</span>
          </button>

          {testStatus.message && (
            <div
              className={`flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
                testStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sorting Strategy & Privacy Configuration */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-800">Sorting Strategy & Enterprise Privacy</h3>
        </div>

        {/* Classification Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">Classification Workflow</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleUpdate({ classificationMode: 'hybrid' })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.classificationMode === 'hybrid'
                  ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Hybrid (Recommended)</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Fast & Accurate
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Runs local heuristics first (0ms, 100% offline). Only unclassified or low-confidence bookmarks are routed to the AI.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleUpdate({ classificationMode: 'ai-only' })}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.classificationMode === 'ai-only'
                  ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">AI Primary</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Comprehensive
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sends all eligible bookmarks through the AI batch organizer for pure semantic categorization.
              </p>
            </button>
          </div>
        </div>

        {/* Privacy Safeguards */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Privacy & Data Protection Safeguards</span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.stripQueryParamsBeforeAI}
              onChange={(e) => handleUpdate({ stripQueryParamsBeforeAI: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800">
                Strip tracking parameters & session tokens before sending to AI
              </span>
              <p className="text-xs text-slate-500">
                Removes UTM tokens, click IDs (gclid, fbclid), and session queries so credentials are never sent to external LLMs.
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.excludeLocalAndIntranet}
              onChange={(e) => handleUpdate({ excludeLocalAndIntranet: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800">
                Never send homelab or intranet bookmarks to cloud AI
              </span>
              <p className="text-xs text-slate-500">
                Bookmarks with private IP addresses (192.168.*, 10.*), <code>.lan</code>, or local domains are sorted purely offline via local heuristic rules.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
