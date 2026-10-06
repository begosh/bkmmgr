# EdgeMark: Smart Bookmark Manager & AI Organizer

A modern, privacy-first browser extension (Manifest V3) for **Microsoft Edge** and **Google Chrome** that organizes bookmarks with the **PARA** method, cleans URL tracking junk, audits live link health, prevents enterprise SSO redirect clobbering, inserts visual domain dividers, and offers optional **Google Gemini AI** classification.

[![CI](https://github.com/begosh/bkmmgr/actions/workflows/ci.yml/badge.svg)](https://github.com/begosh/bkmmgr/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)](public/manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support: Buy Me a Coffee](https://img.shields.io/badge/Support-Buy%20Me%20a%20Coffee-orange)](https://buymeacoffee.com/jonasaspma3)

---

## 🌟 Key Features

1. **Intelligent Taxonomy & PARA Reorganizer**:
   - Organizes bookmarks into standard **PARA** folders:
     - `1. Projects` (active tasks, sprints, milestones)
     - `2. Areas` (ongoing portals, cloud infra, finances)
     - `3. Resources` (documentation, articles, guides, tools)
     - `4. Archives` (inactive items)
   - Also supports **Topic & Functional**, **Tech Stack**, and **Business & Finance** taxonomies.
   - Interactive diff wizard previews folder changes before applying them.

2. **Auto-Sort on Save & Visual Dividers**:
   - Automatically sort bookmarks alphabetically by domain and title.
   - Inserts clean visual dividers (`─── Domain ───`) between distinct websites.
   - Quick Save automatically arranges visual dividers and keeps folders pristine.

3. **Enterprise SSO & Auth Redirect Protection**:
   - Detects Microsoft Online (`login.microsoftonline.com`), Google Accounts (`accounts.google.com`), Okta, Ping, and corporate SSO portals.
   - Refuses to overwrite bookmarked SharePoint, Confluence, or Jira URLs with transient login pages during link updates.

4. **Live Link Health Auditor & Wayback Machine Repair**:
   - Concurrency-controlled check of all saved bookmarks.
   - Categorizes URLs into **Live (2xx)**, **Dead / Broken (404/410)**, **Redirected (301/308)**, and **Timeouts**.
   - 1-click update of permanent redirects to their destination URLs.
   - 1-click **Wayback Machine (Internet Archive)** lookup for dead links.

5. **Deduplication Engine**:
   - Detects exact duplicate URLs across different folders.
   - Detects normalized duplicates (URLs differing only by tracking query parameters or protocol).
   - Prune duplicates with 1 click while preserving the primary bookmark.

6. **URL Sanitizer & Telemetry Stripper**:
   - Strips 25+ marketing tracking parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, `twclid`, `si`, `ref`, etc.).
   - Canonicalizes Amazon product links to clean `/dp/{ASIN}`.
   - Live URL cleaning on active tab and bulk library cleaning.

7. **Privacy-First Hybrid AI (Google Gemini 3.8)**:
   - 0ms local heuristic classifier works 100% offline.
   - Optional Google Gemini integration for deep semantic classification with model intelligence and energy-efficiency metrics.
   - Homelab / Intranet Shield: Local network hosts (`.lan`, `.local`, RFC1918 IPs) are never transmitted to cloud LLMs.

8. **Safety & Universal Backups**:
   - Generates universal **Netscape Bookmark HTML** files (importable into Edge, Chrome, Safari, Firefox).
   - Automatically takes a safety snapshot before any batch migrations or deletions.

9. **About & Support Tab**:
   - In-app architectural breakdown and workflow tips.
   - Integrated **Buy Me a Coffee** support options.

---

## 🚀 How to Install in Microsoft Edge or Google Chrome

### Option A: Load Unpacked (Development Mode)
1. Install **Node.js 24 LTS** (Node.js 22 or newer is supported) and Git, then build the extension:
   ```bash
   git clone https://github.com/begosh/bkmmgr.git
   cd bkmmgr
   npm ci
   npm run build
   ```
2. Open your browser extension management page:
   - **Microsoft Edge**: `edge://extensions/`
   - **Google Chrome**: `chrome://extensions/`
3. Turn on the **Developer mode** toggle.
4. Click **Load unpacked** and select the `dist/` folder inside your cloned repository.
5. EdgeMark will appear in your toolbar and sidebar!

### Option B: Store Submission Package
On Windows, use the included PowerShell script to generate the production store `.zip` for Microsoft Partner Center or Chrome Web Store:
```powershell
npm run package
```
Output: `release/edgemark-extension-v1.0.0.zip`

For comprehensive publishing instructions, see:
- [STORE_SUBMISSION_GUIDE.md](STORE_SUBMISSION_GUIDE.md): Step-by-step submission guide for Edge Add-ons and Chrome Web Store.
- [STORE_LISTING.md](STORE_LISTING.md): Pre-written marketing copy, keywords, and privacy disclosures.

---

## 🛠️ Development & Testing

```bash
# Install dependencies
npm ci

# Run unit tests
npm test

# Build production bundle
npm run build

# Package store ZIP (Windows PowerShell)
npm run package

# Start Vite dev server for local UI development
npm run dev
```

GitHub Actions runs the tests and production build on pushes to `main` and pull requests. The source icons in `public/icons/` are included in Git; the optional `npm run icons` regeneration script requires Windows PowerShell.

Build output (`dist/`), release archives, dependencies, local credentials, and personal bookmark exports are ignored by Git. Generate the extension locally with `npm run build` after cloning. Configure optional AI credentials in the extension's Settings tab.

---

## 📁 Project Structure

```
bkmmgr/
├── dist/                     # Generated Manifest V3 extension (ignored by Git)
├── public/
│   ├── manifest.json         # Manifest V3 specification
│   └── icons/                # Extension icons (16, 32, 48, 128, 512)
├── release/                  # Generated store submission ZIP archives (ignored by Git)
├── scripts/
│   └── package-extension.ps1 # Packaging automation pipeline
├── src/
│   ├── background/
│   │   └── background.ts     # Service worker (context menus, side panel config)
│   ├── content/
│   │   └── extractor.ts      # Content script for on-page metadata & breadcrumbs
│   ├── services/
│   │   ├── bookmarkManager.ts# Browser bookmarks API wrapper + mock support
│   │   ├── bookmarkSorter.ts # Domain grouping and visual dividers
│   │   ├── urlSanitizer.ts   # Tracking parameter removal & URL normalization
│   │   ├── healthChecker.ts  # Link verifier with SSO redirect protection
│   │   ├── deduplicator.ts   # Exact & normalized duplicate detection
│   │   ├── aiProvider.ts     # Gemini API integration & model intelligence
│   │   ├── classifier.ts     # Multi-signal PARA / taxonomy classifier
│   │   ├── reorganizer.ts    # Migration plan generator & batch executor
│   │   └── backupService.ts  # Netscape HTML and JSON backup generator
│   ├── components/
│   │   ├── Header.tsx        # Navigation and stats header
│   │   ├── AuditTab.tsx      # Link health & duplicate audit center
│   │   ├── OrganizerTab.tsx  # Interactive PARA reorganization wizard
│   │   ├── UrlCleanerTab.tsx # Bulk URL sanitization scanner
│   │   ├── BackupTab.tsx     # Snapshot and HTML export controls
│   │   ├── SettingsTab.tsx   # AI configuration & privacy controls
│   │   └── AboutTab.tsx      # About story, principles & Buy Me a Coffee
│   ├── popup/                # Toolbar quick-save popup
│   ├── sidepanel/            # Docked sidebar application
│   └── manager/              # Full-screen dashboard
├── tests/
│   └── services.test.ts      # Service unit tests
├── STORE_LISTING.md          # Store marketing copy, keywords, and disclosures
└── STORE_SUBMISSION_GUIDE.md # Edge & Chrome store publishing tutorial
```

---

## ☕ Support Independent Open Source

If EdgeMark helps you organize your bookmarks and declutter your browser, please consider supporting the project:

- [Buy Me a Coffee](https://buymeacoffee.com/jonasaspma3)
- [Star on GitHub](https://github.com/begosh/bkmmgr)
- [Report Issues / Suggestions](https://github.com/begosh/bkmmgr/issues)

---

## 📄 License

MIT © EdgeMark Team
