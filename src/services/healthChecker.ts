import { BookmarkItem, LinkHealthResult, HealthStatusType } from '../types';
import { isLocalOrPrivateHost } from './urlSanitizer';

export interface HealthCheckOptions {
  timeoutMs?: number;
  concurrency?: number;
  onProgress?: (progress: { completed: number; total: number; currentTitle: string }) => void;
  signal?: AbortSignal;
}

export interface AuthRedirectDetection {
  isAuthRedirect: boolean;
  providerName?: string;
  reason?: string;
}

/**
 * Standard authentication and sign-in paths across web applications
 */
const AUTH_PATH_PATTERNS = [
  /\/oauth2?\/v?\d*\/?authorize/i,
  /\/adfs\/ls/i,
  /\/saml2?\/(?:idp|sso|login)/i,
  /\/cas\/login/i,
  /^\/(?:login|signin|sign-in|auth\/login|users\/sign_in|session\/new|logon)(?:\.[a-z]+)?$/i,
  /\/identity\/claims/i,
  /\/authorize/i,
];

/**
 * Common query parameter names used by OAuth, SAML, and SSO gateways
 * to remember where the user originally intended to go.
 */
const AUTH_REDIRECT_PARAMS = [
  'redirect_uri',
  'redirect_url',
  'redirect_to',
  'redirect',
  'returnurl',
  'return_url',
  'returnto',
  'return_to',
  'wtrealm',
  'wreply',
  'relaystate',
  'target',
  'callback_url',
  'next',
  'rurl',
  'os_destination',
  'goto',
];

/**
 * Determines whether a redirect destination is an authentication / sign-in screen,
 * which must NEVER overwrite the user's original bookmark URL.
 */
export function isLoginOrAuthRedirect(
  originalUrl: string,
  candidateTargetUrl: string
): AuthRedirectDetection {
  if (!candidateTargetUrl || originalUrl === candidateTargetUrl) {
    return { isAuthRedirect: false };
  }

  let orig: URL;
  let target: URL;
  try {
    orig = new URL(originalUrl);
    target = new URL(candidateTargetUrl);
  } catch {
    return { isAuthRedirect: false };
  }

  const origHost = orig.hostname.toLowerCase();
  const targetHost = target.hostname.toLowerCase();
  const targetPath = target.pathname.toLowerCase();
  const origPath = orig.pathname.toLowerCase();

  // 1. Direct Known Identity Provider Match
  if (
    targetHost === 'login.microsoftonline.com' ||
    targetHost === 'login.windows.net' ||
    targetHost === 'login.live.com' ||
    targetHost === 'account.activedirectory.windowsazure.com'
  ) {
    return {
      isAuthRedirect: true,
      providerName: 'Microsoft Online / Entra ID',
      reason: 'Destination is Microsoft Online authentication gateway',
    };
  }

  if (targetHost === 'accounts.google.com') {
    return {
      isAuthRedirect: true,
      providerName: 'Google Account Sign-In',
      reason: 'Destination is Google Accounts login gateway',
    };
  }

  if (targetHost === 'signin.aws.amazon.com') {
    return {
      isAuthRedirect: true,
      providerName: 'AWS Console Sign-In',
      reason: 'Destination is AWS IAM login gateway',
    };
  }

  if (targetHost.endsWith('.okta.com') || targetHost.endsWith('.oktapreview.com')) {
    return {
      isAuthRedirect: true,
      providerName: 'Okta SSO',
      reason: 'Destination is an Okta authentication portal',
    };
  }

  if (targetHost.endsWith('.auth0.com')) {
    return {
      isAuthRedirect: true,
      providerName: 'Auth0',
      reason: 'Destination is an Auth0 identity provider',
    };
  }

  if (targetHost.endsWith('.onelogin.com')) {
    return {
      isAuthRedirect: true,
      providerName: 'OneLogin SSO',
      reason: 'Destination is a OneLogin portal',
    };
  }

  if (targetHost.endsWith('.cloudflareaccess.com')) {
    return {
      isAuthRedirect: true,
      providerName: 'Cloudflare Zero Trust Access',
      reason: 'Destination is Cloudflare Access login gateway',
    };
  }

  if (targetHost === 'login.salesforce.com') {
    return {
      isAuthRedirect: true,
      providerName: 'Salesforce Login',
      reason: 'Destination is Salesforce login gateway',
    };
  }

  if (targetHost === 'github.com' && (targetPath.startsWith('/login') || targetPath.startsWith('/session'))) {
    return {
      isAuthRedirect: true,
      providerName: 'GitHub Sign-In',
      reason: 'Destination is GitHub login page',
    };
  }

  if (targetHost === 'gitlab.com' && targetPath.startsWith('/users/sign_in')) {
    return {
      isAuthRedirect: true,
      providerName: 'GitLab Sign-In',
      reason: 'Destination is GitLab login page',
    };
  }

  // 2. Generic SSO or Auth Subdomain divergence (e.g. sharepoint.com -> sso.company.com or auth.company.com)
  if (origHost !== targetHost) {
    if (
      targetHost.startsWith('sso.') ||
      targetHost.startsWith('auth.') ||
      targetHost.startsWith('login.') ||
      targetHost.startsWith('idp.') ||
      targetHost.startsWith('iam.') ||
      targetHost.startsWith('identity.')
    ) {
      return {
        isAuthRedirect: true,
        providerName: 'Corporate SSO Gateway',
        reason: `Redirected from ${origHost} to identity gateway ${targetHost}`,
      };
    }
  }

  // 3. Known Auth Endpoints & Paths
  const isTargetAuthPath = AUTH_PATH_PATTERNS.some((p) => p.test(targetPath));
  const isOrigAuthPath = AUTH_PATH_PATTERNS.some((p) => p.test(origPath));

  // If the candidate URL is an auth path, but the original URL was NOT an auth path:
  // e.g. original was /browse/PROJ-123 or /sites/team, and candidate is /login or /oauth2/authorize
  if (isTargetAuthPath && !isOrigAuthPath) {
    return {
      isAuthRedirect: true,
      providerName: 'Login Page',
      reason: `Target path "${target.pathname}" is an authentication screen`,
    };
  }

  // 4. OAuth / SAML Parameters in Target
  const hasClientId = target.searchParams.has('client_id');
  const hasResponseType = target.searchParams.has('response_type');
  const hasSaml = target.searchParams.has('SAMLRequest') || target.searchParams.has('RelayState');
  const hasWtrealm = target.searchParams.has('wtrealm') || target.searchParams.has('wreply');

  if ((hasClientId && hasResponseType) || hasSaml || hasWtrealm) {
    return {
      isAuthRedirect: true,
      providerName: 'OAuth / SAML Authorization',
      reason: 'Target URL contains OAuth / SAML authorization parameters',
    };
  }

  // 5. Target contains a redirect_uri / return_url pointing to original host or URL
  for (const param of AUTH_REDIRECT_PARAMS) {
    const val = target.searchParams.get(param);
    if (val) {
      const lowerVal = val.toLowerCase();
      if (lowerVal.includes(origHost) || lowerVal.startsWith('/') || lowerVal.startsWith('%2f')) {
        return {
          isAuthRedirect: true,
          providerName: 'Sign-In Gateway',
          reason: `Target contains return parameter "${param}" pointing to original resource`,
        };
      }
    }
  }

  return { isAuthRedirect: false };
}

/**
 * Checks a single URL's liveness and redirects with local network / LAN awareness
 */
export async function checkSingleUrlHealth(
  item: BookmarkItem,
  timeoutMs = 8000,
  signal?: AbortSignal
): Promise<LinkHealthResult> {
  const startTime = performance.now();

  // Internal protocols or non-web protocols
  if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
    return {
      id: item.id,
      url: item.url,
      title: item.title,
      folderPath: item.folderPath,
      status: 'alive',
      statusCode: 200,
      statusText: 'Internal Browser Protocol',
      checkedAt: Date.now(),
      latencyMs: 0,
    };
  }

  let hostname = '';
  try {
    hostname = new URL(item.url).hostname;
  } catch {
    hostname = '';
  }
  const isLocalHost = isLocalOrPrivateHost(hostname);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link external signal to internal controller
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    // Attempt 1: HEAD request
    let response: Response;
    try {
      response = await fetch(item.url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edge/120.0.0.0',
        },
      });
    } catch (headErr: any) {
      if (controller.signal.aborted) {
        throw headErr;
      }
      // Retry with GET if HEAD is refused
      response = await fetch(item.url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });
    }

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    const isRedirected = response.redirected && response.url && response.url !== item.url;
    let status: HealthStatusType = 'alive';
    let statusText = response.statusText;
    let redirectUrl: string | undefined = undefined;
    let pageTitle: string | undefined;
    let notice: string | undefined;

    if (response.status >= 200 && response.status < 300) {
      if (isRedirected) {
        const authCheck = isLoginOrAuthRedirect(item.url, response.url);
        if (authCheck.isAuthRedirect) {
          // Link is ALIVE and reachable, protected by an SSO/login gateway!
          // NEVER overwrite the user's original URL with the temporary login page!
          status = 'alive';
          statusText = `Alive (${authCheck.providerName || 'Sign-In Required'})`;
          notice = `Protected by ${authCheck.providerName || 'authentication'}. Original bookmark URL is retained.`;
          redirectUrl = undefined;
        } else {
          status = 'redirect';
          redirectUrl = response.url;
        }
      } else {
        status = 'alive';
      }
    } else if (response.status === 401 || response.status === 403) {
      // 401/403 means service is alive and listening, but password/auth is required (very common on LAN/homelab)
      status = 'alive';
      statusText = 'Alive (Auth Required)';
    } else if (response.status === 410 || response.status === 404) {
      status = 'broken';
      statusText = response.status === 410 ? '410 Gone' : '404 Not Found';

      // Inspect page body for migration announcements (e.g. nzb.su is now nzb.life)
      try {
        const text = await response.text();
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch?.[1]?.trim();

        const isMigrationNotice = /is now|moved to|migrated to|retiring|retired/i.test(text.slice(0, 4000));

        if (isMigrationNotice || (pageTitle && /is now|moved/i.test(pageTitle))) {
          const currentUrlObj = new URL(item.url);
          const apexDomain = currentUrlObj.hostname.replace(/^www\./, '');
          const domainMatches = Array.from(text.matchAll(/https?:\/\/([a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})/g))
            .map((m) => m[1].toLowerCase());

          const candidates = Array.from(new Set(domainMatches)).filter((d) =>
            !d.includes(apexDomain) &&
            !d.includes('cloudflare') &&
            !d.includes('google') &&
            !d.includes('schema.org') &&
            !d.includes('w3.org')
          );

          const preferredDomain =
            candidates.find((c) => c.startsWith('www.')) ||
            candidates.find((c) => !c.startsWith('api.')) ||
            candidates[0];

          if (preferredDomain) {
            const proposedTarget = new URL(item.url);
            proposedTarget.hostname = preferredDomain;
            redirectUrl = proposedTarget.toString();
          }

          status = 'redirect';
          statusText = 'Site Moved / Retired (410)';
          notice = pageTitle ? `Notice on site: "${pageTitle}"` : 'Site announced relocation';
        }
      } catch {
        // Ignore read errors
      }
    } else if (response.status >= 400 && response.status < 500) {
      status = 'broken';
    } else if (response.status >= 500) {
      status = 'error';
    }

    return {
      id: item.id,
      url: item.url,
      title: item.title,
      folderPath: item.folderPath,
      status,
      statusCode: response.status,
      statusText: statusText || response.statusText,
      redirectUrl,
      pageTitle,
      notice,
      latencyMs,
      checkedAt: Date.now(),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (error.name === 'AbortError') {
      return {
        id: item.id,
        url: item.url,
        title: item.title,
        folderPath: item.folderPath,
        status: 'timeout',
        errorMsg: isLocalHost
          ? `Local LAN timeout after ${timeoutMs}ms (Host might be offline or DNS unreachable)`
          : `Request timed out after ${timeoutMs}ms`,
        latencyMs,
        checkedAt: Date.now(),
      };
    }

    const errorMsg = isLocalHost
      ? `Local Network / LAN: Host unreachable (Ensure connected to local network/VPN)`
      : error.message || 'Network / DNS Resolution Error';

    return {
      id: item.id,
      url: item.url,
      title: item.title,
      folderPath: item.folderPath,
      status: 'broken',
      errorMsg,
      latencyMs,
      checkedAt: Date.now(),
    };
  }
}

/**
 * Runs batch health checks with concurrency control (e.g. 5 concurrent requests)
 */
export async function batchCheckHealth(
  items: BookmarkItem[],
  options: HealthCheckOptions = {}
): Promise<LinkHealthResult[]> {
  const { concurrency = 4, timeoutMs = 8000, onProgress, signal } = options;
  const results: LinkHealthResult[] = [];
  let completed = 0;
  const queue = [...items];

  const worker = async () => {
    while (queue.length > 0) {
      if (signal?.aborted) break;
      const item = queue.shift();
      if (!item) break;

      const result = await checkSingleUrlHealth(item, timeoutMs, signal);
      results.push(result);
      completed++;

      if (onProgress) {
        onProgress({
          completed,
          total: items.length,
          currentTitle: item.title || item.url,
        });
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Helper to build Wayback Machine URL for a dead link (only for public URLs)
 */
export function getWaybackUrl(url: string): string {
  return `https://web.archive.org/web/*/${encodeURI(url)}`;
}
