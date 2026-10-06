import { CleanUrlResult } from '../types';

// Curated list of known marketing, telemetry, and tracking query parameters
export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  // Google / Analytics
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_cid',
  'utm_reader',
  'utm_place',
  'utm_userid',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  '_ga',
  '_gl',
  'gad_source',

  // Facebook / Meta / Instagram
  'fbclid',
  'igshid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',

  // Microsoft / Bing
  'msclkid',

  // Twitter / X
  'twclid',

  // Yandex & TikTok
  'yclid',
  'ttclid',

  // Mailchimp, HubSpot, Marketo & Email
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'vero_conv',

  // Referrals & Social shares
  'ref',
  'ref_src',
  'ref_url',
  'share_id',
  'source',
  'si', // YouTube tracking query
  'feature', // YouTube feature referral
  'ab_channel',
  'spm', // AliExpress / Taobao tracking
  'scm',
  'pvid',
  'zanpid'
]);

// Ephemeral login and redirect parameters that shouldn't be preserved in bookmarks
export const REDIRECT_AUTH_PARAMS: ReadonlySet<string> = new Set([
  'returnurl',
  'return_url',
  'returnto',
  'return_to',
  'redirect_to',
  'redirect_url',
  'redirect',
  'callback_url',
  'callback',
  'next',
  'goto',
  'continue',
  'target',
  'relaystate',
]);

const LOGIN_PATHNAMES: ReadonlySet<string> = new Set([
  '/login',
  '/signin',
  '/sign-in',
  '/auth/login',
  '/users/sign_in',
  '/login.php',
  '/login.html',
]);

/**
 * Normalizes Amazon product URLs to clean canonical /dp/{ASIN} format
 */
function cleanAmazonUrl(url: URL): boolean {
  if (!url.hostname.includes('amazon.')) {
    return false;
  }

  // Look for /dp/{ASIN} or /gp/product/{ASIN}
  const asinMatch = url.pathname.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i);
  if (asinMatch && asinMatch[1]) {
    const asin = asinMatch[1].toUpperCase();
    url.pathname = `/dp/${asin}`;
    // Clear all query params except essential ones if any
    const allowedParams = ['th']; // 'th' indicates product variant
    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      if (!allowedParams.includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return true;
  }
  return false;
}

/**
 * Cleans YouTube URLs, preserving only video ID (v) and timestamp (t)
 */
function cleanYouTubeUrl(url: URL): boolean {
  if (!url.hostname.includes('youtube.com') && !url.hostname.includes('youtu.be')) {
    return false;
  }

  if (url.hostname.includes('youtu.be')) {
    const allowed = ['t'];
    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      if (!allowed.includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return true;
  }

  if (url.pathname === '/watch') {
    const allowed = ['v', 't', 'list', 'index'];
    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      if (!allowed.includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return true;
  }

  return false;
}

export interface SanitizeOptions {
  stripHash?: boolean;
  normalizeLoginUrls?: boolean; // default true: converts /login?returnUrl=%2F -> /
}

/**
 * Sanitizes a URL by stripping known tracking parameters, ephemeral auth redirects, and normalizing formats.
 */
export function sanitizeUrl(rawUrl: string, options: SanitizeOptions = {}): CleanUrlResult {
  const { stripHash = false, normalizeLoginUrls = true } = options;
  const strippedParams: string[] = [];

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { originalUrl: rawUrl, cleanedUrl: rawUrl, strippedParams: [], hasChanges: false };
  }

  try {
    const parsed = new URL(rawUrl);

    // Skip special browser protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { originalUrl: rawUrl, cleanedUrl: rawUrl, strippedParams: [], hasChanges: false };
    }

    // Site-specific cleaners
    const isAmazon = cleanAmazonUrl(parsed);
    const isYouTube = !isAmazon && cleanYouTubeUrl(parsed);

    let hadLoginRedirectParam = false;

    const host = parsed.hostname.toLowerCase();
    const isIdpHost =
      host.includes('microsoftonline.com') ||
      host.includes('login.live.com') ||
      host.includes('login.windows.net') ||
      host.includes('accounts.google.com') ||
      host.endsWith('.okta.com') ||
      host.endsWith('.auth0.com') ||
      host.endsWith('.onelogin.com');

    // Generic tracking parameter and auth redirect stripper
    if (!isAmazon && !isYouTube) {
      const keys = Array.from(parsed.searchParams.keys());
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        const value = (parsed.searchParams.get(key) || '').trim();

        if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
          strippedParams.push(key);
          parsed.searchParams.delete(key);
        } else if (REDIRECT_AUTH_PARAMS.has(lowerKey)) {
          // Check if returnUrl points to root ('/' or '%2F' or empty or current origin)
          const isRootRedirect =
            value === '/' ||
            value === '%2F' ||
            value === '' ||
            value === parsed.origin ||
            value === `${parsed.origin}/`;

          // Protect identity provider endpoints and specific deep-link return targets;
          // only clean ephemeral root redirects on standard web apps
          if (!isIdpHost && isRootRedirect && normalizeLoginUrls) {
            strippedParams.push(key);
            parsed.searchParams.delete(key);
            hadLoginRedirectParam = true;
          }
        }
      }
    }

    // Smart login screen cleanup: If user bookmarked /login?returnUrl=%2F on a self-hosted or web app,
    // normalize the path to root '/' only when no deep-link parameters remain.
    if (
      normalizeLoginUrls &&
      !isIdpHost &&
      (hadLoginRedirectParam || (LOGIN_PATHNAMES.has(parsed.pathname.toLowerCase()) && parsed.search === ''))
    ) {
      const lowerPath = parsed.pathname.toLowerCase().replace(/\/+$/, '');
      if (LOGIN_PATHNAMES.has(lowerPath)) {
        parsed.pathname = '/';
      }
    }

    if (stripHash && parsed.hash) {
      parsed.hash = '';
    }

    // Remove trailing slash if root path or duplicate slashes
    let cleaned = parsed.toString();
    if (cleaned.endsWith('/') && parsed.pathname === '/') {
      // keep standard origin/
    } else if (cleaned.endsWith('/') && parsed.search === '' && parsed.hash === '') {
      cleaned = cleaned.slice(0, -1);
    }

    const hasChanges = cleaned !== rawUrl;

    return {
      originalUrl: rawUrl,
      cleanedUrl: cleaned,
      strippedParams,
      hasChanges,
    };
  } catch {
    // If URL parsing fails, return as-is
    return {
      originalUrl: rawUrl,
      cleanedUrl: rawUrl,
      strippedParams: [],
      hasChanges: false,
    };
  }
}

/**
 * Generates a normalized URL string for duplicate comparison.
 * Normalizes protocol to https, strips tracking params, lowers case domain, strips trailing slash.
 */
export function getNormalizedComparisonUrl(rawUrl: string): string {
  try {
    const cleaned = sanitizeUrl(rawUrl).cleanedUrl;
    const parsed = new URL(cleaned);

    // For local domains or IP addresses, keep original protocol; for public web, normalize to https
    const isLocal = isLocalOrPrivateHost(parsed.hostname);
    if (!isLocal) {
      parsed.protocol = 'https:';
    }
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Sort search parameters for deterministic comparison
    const sortedParams = new URLSearchParams();
    const keys = Array.from(parsed.searchParams.keys()).sort();
    for (const key of keys) {
      sortedParams.set(key, parsed.searchParams.get(key) || '');
    }
    parsed.search = sortedParams.toString();

    let result = parsed.toString();
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Helper to identify if a hostname is local, LAN, or private IP
 */
export function isLocalOrPrivateHost(hostname: string): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();

  // Local TLDs and names
  if (
    lower === 'localhost' ||
    lower.endsWith('.lan') ||
    lower.endsWith('.local') ||
    lower.endsWith('.home.arpa') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lab') ||
    lower.endsWith('.home') ||
    lower.endsWith('.corp') ||
    lower.endsWith('.box') ||
    lower.endsWith('.intra') ||
    lower.endsWith('.localdomain')
  ) {
    return true;
  }

  // IPv4 private ranges: 127.*, 10.*, 192.168.*, 172.16.* to 172.31.*
  if (
    /^127\./.test(lower) ||
    /^10\./.test(lower) ||
    /^192\.168\./.test(lower) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return true;
  }

  // IPv6 local
  if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:')) {
    return true;
  }

  return false;
}
