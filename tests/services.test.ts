import assert from 'node:assert';
import test, { describe, it } from 'node:test';
import { sanitizeUrl, getNormalizedComparisonUrl, isLocalOrPrivateHost } from '../src/services/urlSanitizer';
import { findDuplicates } from '../src/services/deduplicator';
import { proposeBookmarkFolder } from '../src/services/classifier';
import { generateReorganizationPlan } from '../src/services/reorganizer';
import { TAXONOMY_TEMPLATES } from '../src/services/taxonomyTemplates';
import {
  findEmptyFolders,
  batchDeleteEmptyFolders,
  SYSTEM_FOLDER_IDS,
  SYSTEM_FOLDER_TITLES,
} from '../src/services/bookmarkManager';
import { BookmarkItem, PageMetadata } from '../src/types';

describe('URL Sanitizer', () => {
  it('strips standard UTM and analytics tracking parameters', () => {
    const dirtyUrl = 'https://example.com/article?utm_source=twitter&utm_medium=social&utm_campaign=launch&id=42';
    const result = sanitizeUrl(dirtyUrl);

    assert.strictEqual(result.hasChanges, true);
    assert.strictEqual(result.cleanedUrl, 'https://example.com/article?id=42');
    assert.deepStrictEqual(result.strippedParams, ['utm_source', 'utm_medium', 'utm_campaign']);
  });

  it('strips platform click tokens (fbclid, gclid, si, msclkid)', () => {
    const dirtyUrl = 'https://example.com/shop?fbclid=IwAR123&gclid=Cjw456&msclkid=789';
    const result = sanitizeUrl(dirtyUrl);

    assert.strictEqual(result.hasChanges, true);
    assert.strictEqual(result.cleanedUrl, 'https://example.com/shop');
    assert.strictEqual(result.strippedParams.length, 3);
  });

  it('cleans Amazon product URLs to canonical /dp/{ASIN}', () => {
    const amazonUrl = 'https://www.amazon.com/Apple-AirPods-Charging-Latest-Model/dp/B07PXGQC1Q/ref=sr_1_1?crid=123&keywords=airpods';
    const result = sanitizeUrl(amazonUrl);

    assert.strictEqual(result.hasChanges, true);
    assert.strictEqual(result.cleanedUrl, 'https://www.amazon.com/dp/B07PXGQC1Q');
  });

  it('cleans login redirect junk from homelab / local DNS URL (e.g. sonarr.aspwest.lan)', () => {
    const sonarrUrl = 'http://sonarr.aspwest.lan/login?returnUrl=%2F';
    const result = sanitizeUrl(sonarrUrl);

    assert.strictEqual(result.hasChanges, true);
    assert.strictEqual(result.cleanedUrl, 'http://sonarr.aspwest.lan/');
    assert.strictEqual(result.strippedParams.includes('returnUrl'), true);
  });

  it('preserves clean URLs without modifications', () => {
    const cleanUrl = 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API';
    const result = sanitizeUrl(cleanUrl);

    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.cleanedUrl, cleanUrl);
    assert.strictEqual(result.strippedParams.length, 0);
  });

  it('correctly identifies local and private network hosts', () => {
    assert.strictEqual(isLocalOrPrivateHost('sonarr.aspwest.lan'), true);
    assert.strictEqual(isLocalOrPrivateHost('pihole.local'), true);
    assert.strictEqual(isLocalOrPrivateHost('proxmox.home.arpa'), true);
    assert.strictEqual(isLocalOrPrivateHost('192.168.1.50'), true);
    assert.strictEqual(isLocalOrPrivateHost('10.0.0.1'), true);
    assert.strictEqual(isLocalOrPrivateHost('localhost'), true);
    assert.strictEqual(isLocalOrPrivateHost('github.com'), false);
    assert.strictEqual(isLocalOrPrivateHost('google.com'), false);
  });
});

describe('Deduplicator', () => {
  it('detects exact and normalized duplicates with tracking variations', () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: '1',
        title: 'Vite Guide',
        url: 'https://vitejs.dev/guide/',
        dateAdded: 1000,
        folderPath: 'Favorites',
      },
      {
        id: '2',
        title: 'Vite Guide with Tracking',
        url: 'https://vitejs.dev/guide?utm_source=twitter&fbclid=abc',
        dateAdded: 2000,
        folderPath: 'Other favorites',
      },
      {
        id: '3',
        title: 'React Docs',
        url: 'https://react.dev',
        dateAdded: 1500,
      },
    ];

    const duplicates = findDuplicates(bookmarks);
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].primary.id, '1');
    assert.strictEqual(duplicates[0].duplicates[0].id, '2');
  });

  it('detects duplicates for local LAN services with and without login junk', () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: 'lan-1',
        title: 'Sonarr TV',
        url: 'http://sonarr.aspwest.lan/',
        dateAdded: 1000,
      },
      {
        id: 'lan-2',
        title: 'Sonarr (from login redirect)',
        url: 'http://sonarr.aspwest.lan/login?returnUrl=%2F',
        dateAdded: 2000,
      },
    ];

    const duplicates = findDuplicates(bookmarks);
    assert.strictEqual(duplicates.length, 1);
    assert.strictEqual(duplicates[0].primary.id, 'lan-1');
    assert.strictEqual(duplicates[0].duplicates[0].id, 'lan-2');
  });
});

describe('Page Metadata Classifier & PARA Proposals', () => {
  const paraTaxonomy = TAXONOMY_TEMPLATES[0];

  it('classifies local DNS homelab service (sonarr.aspwest.lan) to Areas / Homelab', () => {
    const meta: PageMetadata = {
      url: 'http://sonarr.aspwest.lan/login?returnUrl=%2F',
      title: 'Sonarr',
      domain: 'sonarr.aspwest.lan',
    };

    const proposal = proposeBookmarkFolder(meta, paraTaxonomy);
    assert.strictEqual(proposal.category, '2. Areas');
    assert.ok(proposal.fullPath.includes('2. Areas'));
    assert.ok(proposal.fullPath.includes('Homelab & Self-Hosted'));
    assert.ok(proposal.fullPath.some((p) => p.includes('Sonarr')));
    assert.strictEqual(proposal.confidence, 0.98);
    assert.ok(proposal.suggestedTags.includes('sonarr'));
    assert.ok(proposal.suggestedTags.includes('lan'));
  });

  it('classifies generic local network host (router.aspwest.lan) to Areas / Homelab', () => {
    const meta: PageMetadata = {
      url: 'http://router.aspwest.lan/admin',
      title: 'Network Gateway',
      domain: 'router.aspwest.lan',
    };

    const proposal = proposeBookmarkFolder(meta, paraTaxonomy);
    assert.strictEqual(proposal.category, '2. Areas');
    assert.ok(proposal.fullPath.includes('Homelab & Self-Hosted'));
    assert.ok(proposal.suggestedTags.includes('lan'));
  });

  it('classifies developer documentation to Resources', () => {
    const meta: PageMetadata = {
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
      title: 'Array.prototype.map() - JavaScript | MDN',
      domain: 'developer.mozilla.org',
      schemaTypes: ['TechArticle'],
      breadcrumbs: ['JavaScript', 'Reference', 'Array'],
    };

    const proposal = proposeBookmarkFolder(meta, paraTaxonomy);
    assert.strictEqual(proposal.category, '3. Resources');
    assert.ok(proposal.confidence >= 0.85);
    assert.ok(proposal.fullPath.includes('3. Resources'));
  });

  it('classifies project management boards to Projects', () => {
    const meta: PageMetadata = {
      url: 'https://linear.app/team/issue/ENG-1234/sprint-planning',
      title: 'ENG-1234 Sprint Planning',
      domain: 'linear.app',
    };

    const proposal = proposeBookmarkFolder(meta, paraTaxonomy);
    assert.strictEqual(proposal.category, '1. Projects');
    assert.strictEqual(proposal.subfolder, 'Active Tasks & Sprints');
  });

  it('classifies cloud infrastructure dashboards to Areas', () => {
    const meta: PageMetadata = {
      url: 'https://aws.amazon.com/console/',
      title: 'AWS Management Console',
      domain: 'aws.amazon.com',
    };

    const proposal = proposeBookmarkFolder(meta, paraTaxonomy);
    assert.strictEqual(proposal.category, '2. Areas');
    assert.strictEqual(proposal.subfolder, 'Cloud, IT & Infrastructure');
  });
});

describe('Reorganization Plan Generator', () => {
  it('generates migration moves for unorganized bookmarks including local LAN services', () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: 'b1',
        title: 'React Documentation',
        url: 'https://react.dev/learn',
        folderPath: 'Other favorites / Random Stuff',
      },
      {
        id: 'b2',
        title: 'Sonarr Media Management',
        url: 'http://sonarr.aspwest.lan/login?returnUrl=%2F',
        folderPath: 'Favorites bar / Unsorted',
      },
      {
        id: 'b3',
        title: 'Already in PARA',
        url: 'https://github.com/microsoft/TypeScript',
        folderPath: 'Favorites bar / 3. Resources / Development & Code',
      },
    ];

    const plan = generateReorganizationPlan(bookmarks, TAXONOMY_TEMPLATES[0]);
    assert.strictEqual(plan.moves.length, 2);
    assert.strictEqual(plan.unmovedCount, 1);

    const sonarrMove = plan.moves.find((m) => m.bookmark.id === 'b2');
    assert.ok(sonarrMove);
    assert.strictEqual(sonarrMove.proposedCategory, '2. Areas');
    assert.ok(sonarrMove.targetPath.includes('Homelab & Self-Hosted'));
  });

  it('correctly migrates bookmarks stranded inside old PARA folders when using Topic taxonomy', () => {
    const topicTaxonomy = TAXONOMY_TEMPLATES.find((t) => t.id === 'topic')!;
    const strandedBookmarks: BookmarkItem[] = [
      {
        id: 'azure1',
        title: 'Azure Portal',
        url: 'https://portal.azure.com/',
        folderPath: 'Root / Favorites bar / 2. Areas / Cloud, IT & Infrastructure',
      },
    ];

    const plan = generateReorganizationPlan(strandedBookmarks, topicTaxonomy);
    assert.strictEqual(plan.moves.length, 1);
    assert.strictEqual(plan.unmovedCount, 0);
    assert.strictEqual(plan.moves[0].proposedCategory, 'Cloud, IT & Infrastructure');
    assert.strictEqual(plan.moves[0].proposedSubfolder, 'Cloud Platforms (Azure, AWS)');
  });
});

describe('Empty Folder Management', () => {
  it('protects browser system roots from being classified as empty', () => {
    assert.ok(SYSTEM_FOLDER_IDS.has('1'));
    assert.ok(SYSTEM_FOLDER_IDS.has('2'));
    assert.ok(SYSTEM_FOLDER_TITLES.has('favorites bar'));
    assert.ok(SYSTEM_FOLDER_TITLES.has('other favorites'));
  });

  it('detects vacant empty folders and allows batch pruning', async () => {
    const emptyList = await findEmptyFolders();
    assert.ok(emptyList.length > 0);
    assert.ok(emptyList.every((f) => !SYSTEM_FOLDER_IDS.has(f.id)));
    assert.ok(emptyList.every((f) => !SYSTEM_FOLDER_TITLES.has(f.title.toLowerCase())));

    const count = await batchDeleteEmptyFolders(emptyList.map((f) => f.id));
    assert.strictEqual(count, emptyList.length);

    const remaining = await findEmptyFolders();
    assert.strictEqual(remaining.length, 0);
  });
});

describe('AI Provider & Settings', () => {
  it('generates a standard chromiumapp redirect URI for Edge OAuth', async () => {
    const { getOAuthRedirectUrl } = await import('../src/services/aiProvider');
    const redirect = getOAuthRedirectUrl();
    assert.ok(redirect.startsWith('https://'));
    assert.ok(redirect.includes('.chromiumapp.org/'));
  });

  it('provides default AI settings with enterprise privacy safeguards enabled', async () => {
    const { DEFAULT_AI_SETTINGS } = await import('../src/services/aiProvider');
    assert.strictEqual(DEFAULT_AI_SETTINGS.enabled, false);
    assert.strictEqual(DEFAULT_AI_SETTINGS.provider, 'gemini-api');
    assert.strictEqual(DEFAULT_AI_SETTINGS.stripQueryParamsBeforeAI, true);
    assert.strictEqual(DEFAULT_AI_SETTINGS.excludeLocalAndIntranet, true);
    assert.strictEqual(DEFAULT_AI_SETTINGS.classificationMode, 'hybrid');
  });

  it('gracefully handles missing credentials in testAIConnection', async () => {
    const { testAIConnection, DEFAULT_AI_SETTINGS } = await import('../src/services/aiProvider');
    const res = await testAIConnection(DEFAULT_AI_SETTINGS);
    assert.strictEqual(res.success, false);
    assert.ok(res.message.includes('API Key'));
  });

  it('correctly extracts recommended replacement model from Google deprecation errors', async () => {
    const { extractSuggestedReplacementModel } = await import('../src/services/aiProvider');
    const googleErrMsg =
      'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.';

    const suggested = extractSuggestedReplacementModel(googleErrMsg, 'gemini-2.5-flash');
    assert.strictEqual(suggested, 'gemini-3.8-flash');
  });

  it('returns null when error message does not contain a valid modern replacement model', async () => {
    const { extractSuggestedReplacementModel } = await import('../src/services/aiProvider');
    const googleErrMsg =
      'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods.';

    const suggested = extractSuggestedReplacementModel(googleErrMsg, 'gemini-1.5-flash');
    assert.strictEqual(suggested, null);
  });

  it('auto-migrates deprecated models in getAISettings', async () => {
    const { getAISettings, CURRENT_DEFAULT_GEMINI_MODEL } = await import(
      '../src/services/aiProvider'
    );
    // Simulate legacy storage containing deprecated model
    const mockStorage = {
      edgemark_ai_settings: {
        enabled: true,
        geminiApiKey: 'test-key',
        geminiModel: 'gemini-2.5-flash',
      },
    };
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: (keys: string[], cb: Function) => cb(mockStorage),
          set: (data: any, cb?: Function) => {
            Object.assign(mockStorage, data);
            if (cb) cb();
          },
        },
      },
    };

    const loaded = await getAISettings();
    assert.strictEqual(loaded.geminiModel, CURRENT_DEFAULT_GEMINI_MODEL);
    assert.strictEqual(
      mockStorage.edgemark_ai_settings.geminiModel,
      CURRENT_DEFAULT_GEMINI_MODEL
    );
  });
});

describe('Bookmark Sorting', () => {
  it('correctly detects divider bookmarks', async () => {
    const { isLegacyDividerBookmark } = await import('../src/services/bookmarkSorter');
    assert.ok(isLegacyDividerBookmark({ url: 'about:blank#separator', title: '─── Azure ───' }));
    assert.ok(!isLegacyDividerBookmark({ title: '─── GitHub ───' }));
    assert.ok(!isLegacyDividerBookmark({ title: '────────────────────' }));
    assert.ok(!isLegacyDividerBookmark({ url: 'https://azure.microsoft.com', title: 'Azure Portal' }));
  });

  it('formats friendly display names for known and local domains', async () => {
    const { getDomainDisplayName } = await import('../src/services/bookmarkSorter');
    assert.strictEqual(getDomainDisplayName('portal.azure.com'), 'Azure');
    assert.strictEqual(getDomainDisplayName('github.com'), 'GitHub');
    assert.strictEqual(getDomainDisplayName('sonarr.aspwest.lan'), 'Sonarr (Homelab)');
    assert.strictEqual(getDomainDisplayName('linear.app'), 'Linear');
  });

  it('sorts bookmarks by domain and then by title A-Z', async () => {
    const { sortBookmarkList } = await import('../src/services/bookmarkSorter');
    const items = [
      { id: '1', title: 'Repo B', url: 'https://github.com/b' },
      { id: '2', title: 'Azure VMs', url: 'https://portal.azure.com/vms' },
      { id: '3', title: 'Repo A', url: 'https://github.com/a' },
      { id: '4', title: 'Azure Storage', url: 'https://portal.azure.com/storage' },
    ];

    const sorted = sortBookmarkList(items, {
      criteria: 'domain-alpha',
    });

    assert.strictEqual(sorted[0].title, 'Azure Storage');
    assert.strictEqual(sorted[1].title, 'Azure VMs');
    assert.strictEqual(sorted[2].title, 'Repo A');
    assert.strictEqual(sorted[3].title, 'Repo B');
  });

});

describe('Auth & SSO Redirect Protection', () => {
  it('detects Microsoft Online OAuth redirect and prevents overwriting original SharePoint URL', async () => {
    const { isLoginOrAuthRedirect } = await import('../src/services/healthChecker');
    const originalUrl = 'https://mycompany.sharepoint.com/sites/engineering/docs';
    const ssoRedirectUrl =
      'https://login.microsoftonline.com/common/oauth2/authorize?client_id=00000003-0000-0ff1-ce00-000000000000&response_mode=form_post&redirect_uri=https%3A%2F%2Fmycompany.sharepoint.com%2Fsites%2Fengineering%2Fdocs';

    const check = isLoginOrAuthRedirect(originalUrl, ssoRedirectUrl);
    assert.strictEqual(check.isAuthRedirect, true);
    assert.ok(check.providerName?.includes('Microsoft'));
  });

  it('detects Google Accounts and AWS Sign-In portals', async () => {
    const { isLoginOrAuthRedirect } = await import('../src/services/healthChecker');
    const gCheck = isLoginOrAuthRedirect(
      'https://console.cloud.google.com/welcome',
      'https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fconsole.cloud.google.com%2F'
    );
    assert.strictEqual(gCheck.isAuthRedirect, true);
    assert.ok(gCheck.providerName?.includes('Google'));

    const awsCheck = isLoginOrAuthRedirect(
      'https://console.aws.amazon.com/ec2',
      'https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com%2Fec2'
    );
    assert.strictEqual(awsCheck.isAuthRedirect, true);
    assert.ok(awsCheck.providerName?.includes('AWS'));
  });

  it('detects same-host login redirects (e.g. Jira / Confluence / GitLab)', async () => {
    const { isLoginOrAuthRedirect } = await import('../src/services/healthChecker');
    const jiraCheck = isLoginOrAuthRedirect(
      'https://jira.internal.corp/browse/PROJ-100',
      'https://jira.internal.corp/login.jsp?os_destination=%2Fbrowse%2FPROJ-100'
    );
    assert.strictEqual(jiraCheck.isAuthRedirect, true);

    const gitlabCheck = isLoginOrAuthRedirect(
      'https://gitlab.com/group/private-project',
      'https://gitlab.com/users/sign_in'
    );
    assert.strictEqual(gitlabCheck.isAuthRedirect, true);
  });

  it('detects corporate SSO and IDP subdomains', async () => {
    const { isLoginOrAuthRedirect } = await import('../src/services/healthChecker');
    const ssoCheck = isLoginOrAuthRedirect(
      'https://intranet.company.com/benefits',
      'https://sso.company.com/idp/profile/SAML2/Redirect/SSO?SAMLRequest=fdf392...'
    );
    assert.strictEqual(ssoCheck.isAuthRedirect, true);
  });

  it('permits genuine non-auth permanent redirects to be updated', async () => {
    const { isLoginOrAuthRedirect } = await import('../src/services/healthChecker');
    const httpToHttps = isLoginOrAuthRedirect(
      'http://example.com/blog/article',
      'https://example.com/blog/article'
    );
    assert.strictEqual(httpToHttps.isAuthRedirect, false);

    const brandRename = isLoginOrAuthRedirect(
      'https://twitter.com/tech',
      'https://x.com/tech'
    );
    assert.strictEqual(brandRename.isAuthRedirect, false);
  });

  it('urlSanitizer preserves OAuth parameters on login.microsoftonline.com bookmarks', () => {
    const msLoginUrl =
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=my-app-id&redirect_uri=https%3A%2F%2Fportal.azure.com&response_type=code';
    const result = sanitizeUrl(msLoginUrl);

    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.cleanedUrl, msLoginUrl);
  });

  it('urlSanitizer does not strip deep-link returnUrl parameters', () => {
    const deepLinkUrl = 'https://app.company.com/login?returnUrl=%2Fanalytics%2Fdashboard';
    const result = sanitizeUrl(deepLinkUrl);

    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.cleanedUrl, deepLinkUrl);
  });
});

describe('Taxonomy Model Selection & Preferences', () => {
  it('loads default preferred taxonomy as PARA', async () => {
    const { getPreferredTaxonomyId, getPreferredTaxonomy } = await import(
      '../src/services/taxonomyTemplates'
    );
    const id = await getPreferredTaxonomyId();
    assert.ok(['para', 'topic', 'johnny-decimal'].includes(id));
    const taxonomy = await getPreferredTaxonomy();
    assert.ok(taxonomy.id);
  });

  it('updates and persists preferred taxonomy', async () => {
    const { getPreferredTaxonomy, setPreferredTaxonomy, TAXONOMY_TEMPLATES } = await import(
      '../src/services/taxonomyTemplates'
    );
    await setPreferredTaxonomy('topic');
    const topicTaxonomy = await getPreferredTaxonomy();
    assert.strictEqual(topicTaxonomy.id, 'topic');
    assert.strictEqual(topicTaxonomy.name, 'Topic & Functional');

    // Reset back to para for other tests
    await setPreferredTaxonomy('para');
  });

  it('proposes folder according to selected non-PARA taxonomy model', async () => {
    const { TAXONOMY_TEMPLATES } = await import('../src/services/taxonomyTemplates');
    const topicModel = TAXONOMY_TEMPLATES.find((t) => t.id === 'topic')!;

    const meta: PageMetadata = {
      url: 'https://github.com/microsoft/typescript',
      title: 'microsoft/typescript: TypeScript is a typed superset of JavaScript',
      domain: 'github.com',
      schemaTypes: ['SoftwareSourceCode'],
    };

    // Classify using Topic model instead of PARA
    const proposal = proposeBookmarkFolder(meta, topicModel);
    assert.strictEqual(proposal.taxonomyName, 'Topic & Functional');
    assert.strictEqual(proposal.category, 'Development & Tech');
    assert.ok(proposal.fullPath.includes('Development & Tech'));
    assert.ok(!proposal.fullPath[0].includes('3. Resources')); // Not PARA!
  });
});
