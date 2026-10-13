# EdgeMark: Smart Bookmark Manager & AI Organizer

A modern, privacy-first browser extension (Manifest V3) for **Microsoft Edge** and **Google Chrome** that organizes bookmarks with the **PARA** method, cleans URL tracking junk, audits live link health, prevents enterprise SSO redirect clobbering, sorts bookmarks by site, and offers optional **Gemini or local Ollama AI** classification.

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

2. **Auto-Sort on Save**:
   - Automatically sort bookmarks alphabetically by domain and title.
   - Keeps bookmarks from the same site together without creating extra bookmarks.
   - Quick Save automatically sorts the destination folder.

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

7. **Optional AI (Gemini or Ollama)**:
   - Local heuristic classification works offline.
   - Optional Gemini or Ollama classification. In **AI & Settings → Page context sent to AI**, choose titles/URLs only (default), available metadata, or metadata plus a short visible-text excerpt (up to 2,000 characters).
   - The popup and sidebar use the current page. Bulk organization reuses matching open tabs and otherwise falls back to titles/URLs; it never fetches or opens saved pages for context. Page text is used for that request and is not persisted in bookmark backups.
   - Homelab / Intranet Shield: Local network hosts (`.lan`, `.local`, RFC1918 IPs) are blocked from cloud and remote AI by default; loopback Ollama can classify them locally.

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

To remove dividers created by older versions, open **Organizer → Sort Bookmarks**, select **All Folders**, and sort. This removes only recognized EdgeMark placeholders, including those in folders with one or no real bookmarks. A safety snapshot is saved first.

GitHub Actions runs the tests and production build on pushes to `main` and pull requests. The source icons in `public/icons/` are included in Git; the optional `npm run icons` regeneration script requires Windows PowerShell.

Build output (`dist/`), release archives, dependencies, local credentials, and personal bookmark exports are ignored by Git. Generate the extension locally with `npm run build` after cloning. Configure optional AI credentials in the extension's Settings tab.

### Bookmark sidebar

Open the sidebar from the Quick Save popup's sidebar button, or press
**Alt+Shift+B** (customize under your browser's extension keyboard shortcuts).
The sidebar opens on your library: browse folders, search across titles/sites/
folder paths, change the display order, create folders, and edit, move, or delete
bookmarks. Changes refresh live when bookmarks are edited elsewhere. Folder
sorting and bookmark edits/deletions save a safety backup first.

Use the sidebar's pin button for **Open sidebar from toolbar**. When enabled,
the extension's toolbar button opens the window-wide sidebar instead of Quick
Save. The browser controls native pinning and whether the sidebar stays open;
pin EdgeMark through its Extensions menu or the panel's native pin control.
The preference does not force the browser to pin or reopen a closed panel.

**Save page** keeps the current-page assistant available without taking space
from the library. Folder suggestions use local rules while browsing. **Ask
Ollama / Gemini** performs an explicit AI request and shows its real result.

### Local Ollama testing

The Organizer's **Use AI Assistance** checkbox follows your saved AI setting.
**Hybrid** mode asks AI only about ambiguous proposed moves; it can finish with
zero model requests. Select **AI Primary** in Settings to classify all eligible
bookmarks, including those already in the rule engine's suggested folder.
The final status reports actual inference requests and responses, model, elapsed
time, accepted classifications, available page context, and fallback reasons.
Missing or failed AI results retain rule proposals and are reported explicitly.
The popup's AI toggle and the sidebar's **Ask AI** action request classification;
their result status confirms whether the model actually answered. **Test AI Connection** runs a synthetic
recipe bookmark through the selected Ollama model, so it tests inference rather
than just listing installed models.

In **AI & Settings**, select **Local LLM (Ollama)**, enable AI assistance, and set:

- Endpoint: `http://localhost:11434`
- Model: `qwen3.5:4b-q4_K_M` (install with `ollama pull qwen3.5:4b-q4_K_M` if needed)
- Page context: metadata first, or metadata plus a short excerpt for additional context

The homelab/intranet safeguard permits classification with Ollama on localhost,
127.0.0.1, or `[::1]`, including the optional context you select. You can leave
the safeguard checked: it applies again when switching to cloud AI or a remote
Ollama endpoint. Credential filtering remains active for local requests.

The extension uses structured JSON output with thinking disabled for classification.
Ollama requests use an 8,192-token context window and small sequential batches
when enriching a library. Existing saved model choices remain unchanged; the
Qwen model is the default for new settings. Test classification on a sample
before applying a reorganization plan.

### Ollama browser access

Ollama can accept requests from a localhost development page and reject the
installed Edge/Chrome extension with **HTTP 403**. Installed extensions use a
`chrome-extension://` origin. Set `OLLAMA_ORIGINS=chrome-extension://*` for
Chromium extensions, or use `chrome-extension://YOUR_EXTENSION_ID` to allow
one extension. Find the ID on `edge://extensions` or `chrome://extensions`.
Restart the process that actually serves Ollama after changing its environment.

For **WSL / Linux systemd**, run these commands in the Linux distribution that
hosts Ollama (on Windows, open it with `wsl -d Ubuntu-24.04`):

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/browser-extensions.conf <<'EOF'
[Service]
Environment="OLLAMA_ORIGINS=chrome-extension://*"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

For **native Windows Ollama**, quit Ollama from its tray icon first. In
PowerShell, set the user environment for future launches and start the server:

```powershell
[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', 'chrome-extension://*', 'User')
$env:OLLAMA_ORIGINS = 'chrome-extension://*'
ollama serve
```

A Windows environment variable does not change an already-running WSL systemd
service. Keep Ollama's existing loopback binding (`127.0.0.1:11434`) and local
model settings. Changing the browser allowlist does not require cloud inference.
Use **Test AI Connection** in the installed extension to verify a real model
response. An immediate 403 means no classification was performed; the Organizer
reports the rejected request and preserves rule proposals.

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
│   │   ├── bookmarkSorter.ts # Domain, title, and date sorting
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
