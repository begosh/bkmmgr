import React, { useState } from 'react';
import {
  Bookmark,
  Coffee,
  ShieldCheck,
  Sparkles,
  Github,
  ExternalLink,
  Link2Off,
  Lock,
  Zap,
  MessageSquare,
  FolderTree,
  Check,
  Copy,
} from 'lucide-react';

export const AboutTab: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState(false);
  const buyMeACoffeeUrl = 'https://buymeacoffee.com/jonasaspma3';
  const githubRepoUrl = 'https://github.com/begosh/bkmmgr';
  const issuesUrl = 'https://github.com/begosh/bkmmgr/issues';

  const handleCopySupportLink = () => {
    navigator.clipboard.writeText(buyMeACoffeeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30">
                <Bookmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl font-black tracking-tight">EdgeMark</h1>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                    v1.0.0 Production Release
                  </span>
                </div>
                <p className="text-sm text-blue-100 font-medium">
                  Smart Bookmark Manager & AI Organizer for Microsoft Edge & Chrome
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              EdgeMark is an open, privacy-first browser extension engineered to keep your digital workspace tidy, organized, and secure. Built with local-first intelligence, enterprise SSO protection, and optional Google Gemini AI categorization.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <Coffee className="w-4 h-4 fill-amber-950" />
              <span>Buy Me a Coffee</span>
            </a>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* Support & Buy Me a Coffee Section */}
      <div className="bg-white rounded-2xl border border-amber-200/80 p-6 sm:p-8 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
              <Coffee className="w-4 h-4" />
              <span>Support Independent Open-Source Development</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Enjoying EdgeMark? Consider Buying Me a Coffee! ☕
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              EdgeMark is 100% free, telemetry-free, and contains no ads or paywalls. Your support helps maintain the extension, cover developer store fees (Microsoft Partner Center & Chrome Web Store), and continually benchmark the latest Gemini models.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full md:w-auto">
            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-102 cursor-pointer"
            >
              <Coffee className="w-4 h-4" />
              <span>Support via Buy Me a Coffee</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <button
              onClick={handleCopySupportLink}
              className="flex items-center justify-center space-x-2 px-3.5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-sm transition-colors cursor-pointer"
              title="Copy support link to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-amber-100">
          <a
            href={`${buyMeACoffeeUrl}?amount=3`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-amber-200/70 hover:border-amber-300 hover:bg-white transition-all cursor-pointer group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">☕</span>
            <div>
              <div className="text-xs font-bold text-slate-900">$3 — Espresso</div>
              <div className="text-[11px] text-slate-500">Fuel a bugfix or fast test run</div>
            </div>
          </a>

          <a
            href={`${buyMeACoffeeUrl}?amount=5`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-amber-200/70 hover:border-amber-300 hover:bg-white transition-all cursor-pointer group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🍵</span>
            <div>
              <div className="text-xs font-bold text-slate-900">$5 — Cappuccino</div>
              <div className="text-[11px] text-slate-500">Help cover store registration costs</div>
            </div>
          </a>

          <a
            href={`${buyMeACoffeeUrl}?amount=15`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-amber-200/70 hover:border-amber-300 hover:bg-white transition-all cursor-pointer group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🫘</span>
            <div>
              <div className="text-xs font-bold text-slate-900">$15 — Whole Bean Bag</div>
              <div className="text-[11px] text-slate-500">Sponsor new AI features & taxonomies</div>
            </div>
          </a>
        </div>
      </div>

      {/* Feature & Architecture Grid */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">What Makes EdgeMark Different?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pillar 1: Enterprise SSO & Auth Safe */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2.5 text-blue-700">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Enterprise SSO & Auth Protection</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Never lose your original bookmarked URLs when testing links. EdgeMark identifies Microsoft Online (Azure AD), Google Accounts, Okta, Ping, and corporate SSO portals. It refuses to overwrite deep-linked SharePoint or Jira documents with transient login pages.
            </p>
          </div>

          {/* Pillar 2: Homelab & Privacy Shields */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2.5 text-emerald-700">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Homelab & Privacy Shield</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Internal network hosts (`.lan`, `.local`, RFC1918 IPs like 192.168.* and 10.*) are automatically safeguarded. They are classified 100% offline via local heuristics and never sent to cloud AI providers.
            </p>
          </div>

          {/* Pillar 3: PARA & Universal Taxonomies */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2.5 text-purple-700">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <FolderTree className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Flexible Taxonomies & Dividers</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Choose between Tiago Forte's PARA method (Projects, Areas, Resources, Archives), Topic-based, Tech Stack, or custom hierarchies. Clean visual dividers (`─── Domain ───`) keep your folders neat and organized.
            </p>
          </div>

          {/* Pillar 4: Telemetry Stripper & Link Health */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2.5 text-indigo-700">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Link2Off className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">URL Sanitizer & Link Health</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strips 25+ invasive marketing tracking parameters (`utm_*`, `fbclid`, `gclid`, `si`, `msclkid`) and shortens Amazon links to clean ASIN paths. Concurrency-controlled link audits detect dead 404s with direct Wayback Machine links.
            </p>
          </div>
        </div>
      </div>

      {/* Pro Tips & Keyboard Shortcuts */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Workflow Tips & Shortcuts</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
            <span className="font-bold text-slate-800">Quick Save Popup</span>
            <p className="text-slate-500">
              Click the EdgeMark toolbar icon on any page. It cleans the URL, proposes a folder according to your preferred taxonomy, and auto-sorts on save.
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
            <span className="font-bold text-slate-800">Edge Sidebar Assistant</span>
            <p className="text-slate-500">
              Dock EdgeMark in your Edge Sidebar for persistent 1-click bookmarking while researching across multiple tabs without popup dismissals.
            </p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
            <span className="font-bold text-slate-800">Safety & Backups</span>
            <p className="text-slate-500">
              Before running any batch reorganizations or deletions, EdgeMark creates an instantaneous safety snapshot. You can also export universal Netscape HTML files.
            </p>
          </div>
        </div>
      </div>

      {/* Community, Issues & License */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 gap-4">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-700">Open Source (MIT License)</span>
          <span>•</span>
          <a
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Report an Issue</span>
          </a>
        </div>
        <div>
          Made with care for organized web researchers & professionals.
        </div>
      </div>
    </div>
  );
};
