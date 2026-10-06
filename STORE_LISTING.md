# EdgeMark — Store Listing Copy & Marketing Assets

This document contains ready-to-use copy, descriptions, keywords, privacy declarations, and asset guidelines for submitting **EdgeMark** to the **Microsoft Edge Add-ons Store** and the **Google Chrome Web Store**.

---

## 1. Store Metadata & Summary

| Field | Content |
| :--- | :--- |
| **Extension Name** | EdgeMark - Smart Bookmark Manager & AI Organizer |
| **Version** | `1.0.0` |
| **Primary Category** | Productivity |
| **Secondary Category** | Search Tools / Workflow & Planning |
| **Price** | Free |
| **Support URL** | `https://github.com/begosh/bkmmgr/issues` |
| **Support / Tip Link** | `https://buymeacoffee.com/jonasaspma3` |
| **Repository** | `https://github.com/begosh/bkmmgr` |

---

## 2. Short Description (Max 132 Characters)

> **AI-powered bookmark manager: PARA organizer, duplicate detector, link health auditor, tracking cleaner & auto-divider sorting.**

*(Character count: 127 characters — fits both Microsoft Edge Add-ons and Chrome Web Store requirements).*

---

## 3. Detailed Store Description

*Copy and paste the text below into the "Detailed Description" box in the Microsoft Partner Center and Chrome Developer Dashboard:*

```markdown
Tired of bookmark chaos, broken links, duplicate tabs, and cluttered folders?

EdgeMark is the intelligent, privacy-first bookmark manager engineered for modern web researchers, developers, and professionals. Organize thousands of bookmarks in seconds with Tiago Forte’s PARA method, strip invasive marketing telemetry, audit dead links with automatic Wayback Machine recovery, and keep your folders neat with automatic visual dividers.

Built with a local-first architecture and enterprise-grade SSO protection, EdgeMark keeps your data 100% private on your machine—with optional Google Gemini AI for smart semantic categorization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 1. Intelligent Taxonomy & PARA Reorganizer
• Transform messy bookmark lists into structured systems:
  - 1. Projects (Active tasks, milestones, ongoing sprints)
  - 2. Areas (Continuous responsibilities, cloud dashboards, finances)
  - 3. Resources (Documentation, articles, tools, libraries)
  - 4. Archives (Completed projects and inactive references)
• Also supports Topic & Functional, Tech Stack, Business & Finance, and custom structures.
• Interactive diff preview before applying changes—zero surprises.

🧼 2. URL Cleaner & Telemetry Stripper
• Automatically strips 25+ tracking parameters (utm_source, fbclid, gclid, si, msclkid, twclid, ref).
• Canonicalizes Amazon product links into clean /dp/{ASIN} formats.
• Cleans URLs on the active tab with 1 click, or batch cleans your entire bookmark library.

🗂️ 3. Auto-Sort & Visual Dividers
• Sort bookmarks alphabetically by domain and title in one click.
• Inserts clean visual dividers (─── Domain ───) between site groups.
• Auto-sorts target folders instantly upon saving new bookmarks.

🏥 4. Link Health Auditor & Dead Link Repair
• Concurrency-controlled health checker scans all bookmarks for 200 OK, 301/308 redirects, 404 dead links, and timeouts.
• 1-Click Redirect Fix: Safely updates permanent redirects to destination URLs.
• Wayback Machine Integration: 1-click recovery for dead or deleted web pages.
• Enterprise SSO Protection: Detects Microsoft Online, Google Accounts, Okta, and corporate login redirects to prevent corrupting your original bookmarks!

🔍 5. Precision Deduplicator
• Finds exact duplicates across different folders.
• Identifies normalized duplicates (URLs differing only by tracking tokens or http/https).
• Keep the best-organized copy and batch prune duplicates in seconds.

⚡ 6. Quick Save Popup & Docked Sidebar Assistant
• Quick Save: 1-click clean bookmarking with instant folder proposal and auto-sort.
• Edge Sidebar Assistant: Keep EdgeMark docked side-by-side while researching across multiple tabs without popup dismissals.

🤖 7. Privacy-First Hybrid AI (Google Gemini 3.8)
• Blazing-fast 0ms local heuristic classification works 100% offline.
• Optional Google Gemini AI integration for deep contextual folder suggestions.
• Homelab & Privacy Shield: Localhost, .lan, .local, and private IP addresses (192.168.*, 10.*) are NEVER sent to external LLMs.

💾 8. Universal Safety Backups
• 1-click JSON snapshot with instantaneous rollback before any batch migration.
• Universal Netscape Bookmark HTML export (compatible with Edge, Chrome, Safari, and Firefox).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ PRIVACY & ENTERPRISE SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 100% Local-First: Your bookmarks, URLs, and browsing metadata remain on your device.
• Zero Telemetry: No analytics, no tracking pixels, and no third-party data collection.
• Enterprise SSO Safe: Protects SharePoint, Confluence, Jira, and internal portals from login-redirect clobbering.
• Transparent Open Source: Released under the permissive MIT license.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☕ SUPPORT INDEPENDENT DEVELOPMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EdgeMark is free and open-source. If it saves you hours of tab tidying and bookmark cleanup, please consider supporting the project:
• Buy Me a Coffee: https://buymeacoffee.com/jonasaspma3
• GitHub: https://github.com/begosh/bkmmgr
```

---

## 4. Search Keywords / Store Tags

Add these keywords to your store listing to maximize discovery:

- `bookmarks`
- `bookmark manager`
- `para method`
- `url cleaner`
- `utm stripper`
- `broken link checker`
- `duplicate bookmarks`
- `side panel`
- `gemini ai`
- `privacy`
- `productivity`
- `tab manager`
- `homelab`

---

## 5. Privacy Practices Disclosure Form

When filling out the **Privacy Practices** questionnaire in the Chrome Web Store and Microsoft Partner Center:

### A. Single Purpose Description
> "EdgeMark is a bookmark organization and link maintenance utility that organizes browser bookmarks into structured taxonomies, audits link health, removes tracking parameters from bookmark URLs, and identifies duplicate bookmarks."

### B. Justification of Permissions

| Permission | Reviewer Justification |
| :--- | :--- |
| `bookmarks` | Required to read, organize, create, sort, update, and remove bookmark entries and folders as directed by the user. |
| `tabs` / `activeTab` | Required to detect the active page URL and page title in the Quick Save popup and Sidebar assistant. |
| `storage` | Required to store user preferences (taxonomy choice, auto-sort settings, AI provider configuration) locally on the device. |
| `sidePanel` | Required to provide the docked sidebar assistant interface in Microsoft Edge and Chrome. |
| `scripting` | Required to extract on-page metadata (Schema.org JSON-LD and BreadcrumbList) on user request to recommend folder locations. |
| `identity` | Required for optional Google OAuth sign-in when connecting user's Gemini AI account. |
| `<all_urls>` | Required for the Link Health Auditor to send HTTP HEAD/GET health check requests to saved bookmark URLs across diverse domains without being blocked by CORS. |

### C. Data Usage Declarations
- **Data Collection**: Select **"No, I am not collecting or using user data"**.
- **Data Transfer**: Select **"No data is sold to third parties or used for creditworthiness/advertising"**.
- **Cloud AI (Optional)**: If the user enables Google Gemini, bookmark title/URL is sent directly from the client to the official Google Gemini API using the user's private API key. Intranet and local LAN URLs are blocked from transmission by default.

---

## 6. Store Visual Asset Specifications

Prepare the following visual assets for the store listing:

| Asset | Size | Format | Usage |
| :--- | :--- | :--- | :--- |
| **Small Tile / Icon** | `128 x 128 px` | PNG | Extension Icon (included in `public/icons/icon128.png`) |
| **Large Store Logo** | `300 x 300 px` | PNG | Microsoft Partner Center Store Logo |
| **Small Promo Tile** | `440 x 280 px` | PNG | Edge & Chrome featured showcase banner |
| **Large Promo Tile** | `920 x 680 px` | PNG | Edge & Chrome Web Store marquee banner |
| **Screenshots (4-5)** | `1280 x 800 px` (or `640 x 400 px`) | PNG/JPEG | 1. PARA Reorganizer & Folder Diff<br>2. Link Health Auditor & Dead Link Repair<br>3. URL Cleaner & Tracking Parameter Stripper<br>4. Quick Save Popup & Edge Sidebar Assistant<br>5. AI Settings & Model Intelligence |
