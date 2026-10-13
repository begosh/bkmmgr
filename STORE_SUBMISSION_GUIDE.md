# EdgeMark — Store Submission & Publishing Guide

This guide walks you through the step-by-step process of packaging and publishing **EdgeMark** to the **Microsoft Edge Add-ons Store** and the **Google Chrome Web Store**.

---

## Table of Contents
1. [Phase 1: Generating the Store Package ZIP](#phase-1-generating-the-store-package-zip)
2. [Phase 2: Microsoft Edge Add-ons Submission Walkthrough](#phase-2-microsoft-edge-add-ons-submission-walkthrough)
3. [Phase 3: Google Chrome Web Store Submission Walkthrough](#phase-3-google-chrome-web-store-submission-walkthrough)
4. [Phase 4: Privacy Policy Template](#phase-4-privacy-policy-template)
5. [Phase 5: Publishing Future Updates](#phase-5-publishing-future-updates)

---

## Phase 1: Generating the Store Package ZIP

EdgeMark includes an automated packaging pipeline that builds the production code, verifies all store assets, and creates an optimized ZIP archive.

### 1. Run Verification & Build
Open your terminal in the `bkmmgr` directory and run:

```powershell
# 1. Run unit test suite
npm test

# 2. Run packaging pipeline
npm run package
```

### 2. Verify Output Archive
The packaging script will output:
```
release/edgemark-extension-v1.0.0.zip
```

#### Package Validation Checklist
- [x] `manifest.json` is located at the root of the ZIP archive (not inside a subfolder).
- [x] All icon resolutions (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`, `icon512.png`) are included.
- [x] No source `.ts` files, test files, or `node_modules` are bundled.
- [x] Background worker (`background.js`) and content script (`content.js`) are compiled at root.

---

## Phase 2: Microsoft Edge Add-ons Submission Walkthrough

Microsoft Edge extensions are managed through the **Microsoft Partner Center**.

### Step 1: Create a Microsoft Partner Center Account
1. Visit the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Sign in with your Microsoft Account (personal or work).
3. If this is your first time, register as a Microsoft Edge developer:
   - **Individual Account**: Fast approval, requires your name and contact details. Registration is currently **free**.
   - Complete the contact verification.

### Step 2: Create a New Extension Submission
1. In the Partner Center dashboard, click **"Create new extension"**.
2. Drag and drop `release/edgemark-extension-v1.0.0.zip` into the package upload area.
3. Partner Center will inspect the ZIP and validate the `manifest.json`.

### Step 3: Fill in Store Properties
- **Category**: Select `Productivity` (Secondary: `Workflow & Planning`).
- **Support URL**: `https://github.com/begosh/bkmmgr/issues`
- **Developer Website**: `https://github.com/begosh/bkmmgr`
- **Privacy Policy URL**: Point to your hosted privacy policy (see [Phase 4](#phase-4-privacy-policy-template)).

### Step 4: Complete Store Listing
Navigate to **Store listings** -> **English (United States)**:
1. **Extension Name**: `EdgeMark - Smart Bookmark Manager & AI Organizer`
2. **Short Description**: Copy from `STORE_LISTING.md` Section 2:
   > `AI-powered bookmark manager: PARA organizer, duplicate detector, link health auditor, tracking cleaner & automatic sorting.`
3. **Detailed Description**: Copy the full markdown text from `STORE_LISTING.md` Section 3.
4. **Extension Logo**: Upload `public/icons/icon128.png` (or a 300x300 version).
5. **Screenshots**: Upload 3 to 5 screenshots (1280x800 resolution recommended):
   - Screenshot 1: PARA Reorganizer with interactive diff.
   - Screenshot 2: Link Health Auditor detecting 404s and permanent redirects.
   - Screenshot 3: URL Cleaner with stripped tracking tags.
   - Screenshot 4: Quick Save popup with auto-sort.
   - Screenshot 5: AI & Settings tab with Gemini model discovery.
6. **Search Keywords**: Add `bookmarks`, `bookmark manager`, `para method`, `url cleaner`, `dead link checker`.

### Step 5: Availability & Pricing
- **Pricing**: `Free`
- **Markets**: Select `All markets` (worldwide distribution).

### Step 6: Notes for Certification (Crucial Step!)
In the **Notes for certification** box, Microsoft reviewers require an explanation for broad host permissions (`<all_urls>`):

> **Copy and paste this exact note to reviewers:**
>
> *"EdgeMark is a local-first bookmark manager and link maintenance tool. The `<all_urls>` host permission supports link health checks across saved URLs, current/open-page metadata extraction for folder suggestions, and requests to the user's selected AI endpoint. Optional AI sends bookmark titles and URLs, plus available metadata or a short visible-text excerpt only when selected. Context comes from the current page or matching open tabs, without opening saved pages. Cloud/remote AI excludes intranet URLs by default; loopback Ollama can classify them locally. Bookmark storage remains local and no data is sold or used for advertising."*

### Step 7: Submit for Review
1. Click **Submit**.
2. Microsoft review typically takes **1 to 3 business days**.
3. Once approved, your extension will be live on the [Microsoft Edge Add-ons Store](https://microsoftedge.microsoft.com/addons).

---

## Phase 3: Google Chrome Web Store Submission Walkthrough

Because EdgeMark is built on the standard Manifest V3 standard, the exact same ZIP works seamlessly in Google Chrome!

### Step 1: Chrome Web Store Developer Dashboard
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. Pay the one-time $5 developer registration fee (if not already paid).

### Step 2: Upload Package
1. Click **"New Item"**.
2. Upload `release/edgemark-extension-v1.0.0.zip`.

### Step 3: Complete Store Listing
1. Use the title, short description, and detailed description from `STORE_LISTING.md`.
2. Upload the extension icon (`128x128`).
3. Upload at least 1 screenshot (`1280x800`).
4. Select Category: `Productivity`.

### Step 4: Privacy Practices Questionnaire
In the **Privacy practices** tab:
1. **Single Purpose**:
   > *"EdgeMark is a bookmark management and link maintenance utility that organizes browser bookmarks into structured taxonomies, audits link health, strips tracking parameters, and deduplicates bookmarks."*
2. **Permission Justification**:
   - `bookmarks`: Read and reorganize user bookmarks upon command.
   - `tabs` / `activeTab`: Detect active URL and title for 1-click Quick Save.
   - `storage`: Save local user preferences and taxonomy templates.
   - `sidePanel`: Render the sidebar assistant panel.
   - `scripting`: Extract on-page breadcrumbs and OpenGraph data for folder recommendations.
   - `identity`: Connect optional Google OAuth for Gemini AI integration.
   - `contextMenus`: Provide quick-save and dashboard commands in browser context menus.
   - `<all_urls>`: Verify saved links, extract current/open-page metadata, and reach the user's configured AI provider.
3. **Data Usage Disclosures**:
   - Declare bookmark titles/URLs and optional page metadata/excerpts used for AI classification using the store's current data disclosure fields. Do not claim no data use or transmission when optional AI is enabled.
   - Check all three developer compliance boxes (no selling data, no credit lending, no advertising).

### Step 5: Submit for Review
1. Click **Submit for Review**.
2. Chrome Web Store review typically takes **1 to 2 business days**.

---

## Phase 4: Privacy Policy Template

Both Microsoft and Google require a publicly accessible Privacy Policy URL. You can host this for free on **GitHub Pages**, **GitHub Gist**, or your personal website.

### Quick Privacy Policy Markdown:

```markdown
# Privacy Policy for EdgeMark

Last Updated: September 30, 2026

EdgeMark ("the Extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding user data.

1. Data Collection & Storage
EdgeMark operates on a 100% local-first architecture. All bookmarks, folder structures, URL metadata, and user settings are stored locally on your device via the browser's native storage APIs. We do not operate a server that collects or sells your bookmark data. When you enable optional AI classification, selected bookmark information is sent directly to your configured provider as described below.

2. Tracking Parameters & URL Sanitization
EdgeMark includes a local URL sanitizer that strips advertising and tracking query parameters (e.g., UTM tags, Facebook click IDs, Google click IDs) directly in your browser. No telemetry is logged or reported.

3. Optional Cloud AI Services
If you choose to enable the Google Gemini AI integration:
- Bookmark classification requests are sent directly from your browser to Google's official Gemini API using your personal API key or OAuth token.
- Localhost, intranet domains (.lan, .local), and private network IP addresses are shielded from cloud transmission by default.
- Titles and URLs are sent by default. You can separately enable available page metadata (description, keywords, headings, site name, page types, breadcrumbs) or metadata plus a visible-text excerpt of up to 2,000 characters.
- The popup and sidebar use the current page; bulk organization uses matching open tabs. Saved URLs are never opened or fetched for enrichment. Page context is not persisted in bookmark backups.
- Excerpts omit form fields and editable, hidden, navigation, and script content. Signed-in page text can still be sensitive. Automatic filtering cannot identify every sensitive detail.
- Tracking and common credential parameters are removed when URL privacy filtering is enabled. Obvious token strings are redacted from context, but this is not a guarantee that all sensitive data will be removed.
- Ollama classification sends the same selected information to the endpoint you configure. The homelab/intranet safeguard allows protected bookmarks when Ollama runs on loopback (localhost, 127.0.0.1, or [::1]); it remains active for cloud providers and remote Ollama endpoints. Optional context and credential filtering still apply locally.

4. Third-Party Services
EdgeMark does not include any third-party analytics (no Google Analytics, no telemetry trackers, no advertising networks).

5. Contact
For questions or issues, please open an issue at:
https://github.com/begosh/bkmmgr/issues
```

---

## Phase 5: Publishing Future Updates

When releasing a new version (e.g., `1.0.1`):

1. Update the version in `package.json`:
   ```json
   "version": "1.0.1"
   ```
2. Update the version in `public/manifest.json`:
   ```json
   "version": "1.0.1"
   ```
3. Run tests and packaging:
   ```powershell
   npm test
   npm run package
   ```
4. Upload `release/edgemark-extension-v1.0.1.zip` to the Partner Center and Chrome Developer Dashboard.
5. In the update submission, add a brief description of what changed (e.g. bug fixes, performance improvements).
