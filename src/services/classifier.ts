import { PageMetadata, ProposedFolder, TaxonomyTemplate } from '../types';
import { DEFAULT_TAXONOMY } from './taxonomyTemplates';
import { isLocalOrPrivateHost } from './urlSanitizer';

// Catalog of known self-hosted and homelab applications
export const HOMELAB_SERVICES: Record<string, { label: string; subfolder: string; tags: string[] }> = {
  // Media Automation & Arr Suite
  sonarr: { label: 'Sonarr', subfolder: 'Media & Downloads (Sonarr)', tags: ['homelab', 'sonarr', 'media', 'tv'] },
  radarr: { label: 'Radarr', subfolder: 'Media & Downloads (Radarr)', tags: ['homelab', 'radarr', 'media', 'movies'] },
  lidarr: { label: 'Lidarr', subfolder: 'Media & Downloads (Lidarr)', tags: ['homelab', 'lidarr', 'music'] },
  prowlarr: { label: 'Prowlarr', subfolder: 'Indexers (Prowlarr)', tags: ['homelab', 'prowlarr', 'indexers'] },
  bazarr: { label: 'Bazarr', subfolder: 'Subtitles (Bazarr)', tags: ['homelab', 'bazarr', 'subtitles'] },
  readarr: { label: 'Readarr', subfolder: 'Books (Readarr)', tags: ['homelab', 'readarr', 'books'] },
  plex: { label: 'Plex', subfolder: 'Media Streaming (Plex)', tags: ['homelab', 'plex', 'streaming'] },
  jellyfin: { label: 'Jellyfin', subfolder: 'Media Streaming (Jellyfin)', tags: ['homelab', 'jellyfin', 'streaming'] },
  emby: { label: 'Emby', subfolder: 'Media Streaming (Emby)', tags: ['homelab', 'emby', 'streaming'] },
  tautulli: { label: 'Tautulli', subfolder: 'Monitoring (Tautulli)', tags: ['homelab', 'tautulli', 'plex'] },
  overseerr: { label: 'Overseerr', subfolder: 'Media Requests (Overseerr)', tags: ['homelab', 'overseerr'] },
  jellyseerr: { label: 'Jellyseerr', subfolder: 'Media Requests (Jellyseerr)', tags: ['homelab', 'jellyseerr'] },
  transmission: { label: 'Transmission', subfolder: 'Downloads (Transmission)', tags: ['homelab', 'torrents'] },
  qbittorrent: { label: 'qBittorrent', subfolder: 'Downloads (qBittorrent)', tags: ['homelab', 'torrents'] },
  deluge: { label: 'Deluge', subfolder: 'Downloads (Deluge)', tags: ['homelab', 'torrents'] },
  sabnzbd: { label: 'SABnzbd', subfolder: 'Usenet (SABnzbd)', tags: ['homelab', 'usenet'] },

  // Home Automation & IoT
  homeassistant: { label: 'Home Assistant', subfolder: 'Home Automation & IoT', tags: ['homelab', 'iot', 'smart-home'] },
  hass: { label: 'Home Assistant', subfolder: 'Home Automation & IoT', tags: ['homelab', 'iot', 'smart-home'] },
  esphome: { label: 'ESPHome', subfolder: 'Home Automation & IoT', tags: ['homelab', 'iot', 'esphome'] },
  zigbee2mqtt: { label: 'Zigbee2MQTT', subfolder: 'Home Automation & IoT', tags: ['homelab', 'iot', 'zigbee'] },
  nodered: { label: 'Node-RED', subfolder: 'Home Automation & IoT', tags: ['homelab', 'automation'] },

  // Virtualization, Storage & OS
  proxmox: { label: 'Proxmox VE', subfolder: 'Servers & Hypervisors (Proxmox)', tags: ['homelab', 'proxmox', 'vms'] },
  esxi: { label: 'VMware ESXi', subfolder: 'Servers & Hypervisors', tags: ['homelab', 'esxi', 'vms'] },
  truenas: { label: 'TrueNAS', subfolder: 'Storage & NAS (TrueNAS)', tags: ['homelab', 'nas', 'storage'] },
  unraid: { label: 'Unraid', subfolder: 'Storage & NAS (Unraid)', tags: ['homelab', 'unraid', 'nas'] },
  portainer: { label: 'Portainer', subfolder: 'Containers & Docker (Portainer)', tags: ['homelab', 'docker', 'containers'] },
  synology: { label: 'Synology DSM', subfolder: 'Storage & NAS (Synology)', tags: ['homelab', 'synology', 'nas'] },

  // Network, DNS & Firewall
  pihole: { label: 'Pi-hole', subfolder: 'Network & DNS (Pi-hole)', tags: ['homelab', 'dns', 'adblock'] },
  adguard: { label: 'AdGuard Home', subfolder: 'Network & DNS (AdGuard)', tags: ['homelab', 'dns', 'adblock'] },
  pfsense: { label: 'pfSense', subfolder: 'Network & Firewall (pfSense)', tags: ['homelab', 'router', 'firewall'] },
  opnsense: { label: 'OPNsense', subfolder: 'Network & Firewall (OPNsense)', tags: ['homelab', 'router', 'firewall'] },
  openwrt: { label: 'OpenWrt', subfolder: 'Network & Router (OpenWrt)', tags: ['homelab', 'router'] },
  wireguard: { label: 'WireGuard', subfolder: 'Network & VPN', tags: ['homelab', 'vpn'] },
  tailscale: { label: 'Tailscale', subfolder: 'Network & VPN', tags: ['homelab', 'vpn', 'tailscale'] },
  unifi: { label: 'UniFi Controller', subfolder: 'Network Infrastructure (UniFi)', tags: ['homelab', 'network', 'unifi'] },

  // Self-Hosted Cloud, Passwords & Tools
  vaultwarden: { label: 'Vaultwarden', subfolder: 'Security & Passwords', tags: ['homelab', 'vault', 'passwords'] },
  bitwarden: { label: 'Bitwarden', subfolder: 'Security & Passwords', tags: ['homelab', 'vault', 'passwords'] },
  nextcloud: { label: 'Nextcloud', subfolder: 'Personal Cloud (Nextcloud)', tags: ['homelab', 'cloud', 'storage'] },
  gitea: { label: 'Gitea', subfolder: 'Git & Code Hosting (Gitea)', tags: ['homelab', 'git', 'dev'] },
  forgejo: { label: 'Forgejo', subfolder: 'Git & Code Hosting (Forgejo)', tags: ['homelab', 'git', 'dev'] },
  immich: { label: 'Immich', subfolder: 'Personal Cloud & Photos', tags: ['homelab', 'photos'] },
  paperless: { label: 'Paperless-ngx', subfolder: 'Personal Cloud & Documents', tags: ['homelab', 'documents'] },
  'uptime-kuma': { label: 'Uptime Kuma', subfolder: 'Monitoring (Uptime Kuma)', tags: ['homelab', 'monitoring'] },
  grafana: { label: 'Grafana', subfolder: 'Dashboards (Grafana)', tags: ['homelab', 'metrics', 'dashboards'] }
};

/**
 * Checks if a domain/url corresponds to a local network homelab application
 */
function detectHomelabService(domain: string, fullText: string): { key: string; service: typeof HOMELAB_SERVICES[string] } | null {
  const domainParts = domain.toLowerCase().split(/[\.:]/);

  for (const [key, service] of Object.entries(HOMELAB_SERVICES)) {
    if (domainParts.includes(key)) {
      return { key, service };
    }
    if (domain.toLowerCase().startsWith(key)) {
      return { key, service };
    }
  }

  if (isLocalOrPrivateHost(domain)) {
    for (const [key, service] of Object.entries(HOMELAB_SERVICES)) {
      if (fullText.includes(key)) {
        return { key, service };
      }
    }
  }

  return null;
}

/**
 * Maps a standardized concept category into a concrete folder path for the chosen taxonomy
 */
function getConceptualPath(
  concept:
    | 'PERSONAL_LIFESTYLE'
    | 'SECURITY_STANDARDS'
    | 'INTERNAL_SECURITY_OPS'
    | 'WORKPLACE_HR'
    | 'WORKPLACE_FINANCE'
    | 'CLOUD_DATA_IT'
    | 'ACTIVE_PROJECT'
    | 'CORP_WORKSPACE'
    | 'DEV_DOCS'
    | 'DESIGN'
    | 'ARTICLES'
    | 'DEFAULT_FALLBACK',
  taxonomyId: string
): { category: string; subfolder: string; fullPath: string[] } {
  switch (concept) {
    case 'PERSONAL_LIFESTYLE':
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Personal & Recipes', fullPath: ['3. Resources', 'Personal & Recipes'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '30-39 Knowledge & Reference', subfolder: '35 Personal & Lifestyle', fullPath: ['30-39 Knowledge & Reference', '35 Personal & Lifestyle'] };
      } else {
        return { category: 'Personal & Lifestyle', subfolder: 'Cooking & Recipes', fullPath: ['Personal & Lifestyle', 'Cooking & Recipes'] };
      }

    case 'SECURITY_STANDARDS':
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Security & Compliance Standards', fullPath: ['3. Resources', 'Security & Compliance Standards'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '30-39 Knowledge & Reference', subfolder: '34 Standards & Compliance', fullPath: ['30-39 Knowledge & Reference', '34 Standards & Compliance'] };
      } else {
        return { category: 'Security & Compliance Standards', subfolder: 'Industrial Standards (62443)', fullPath: ['Security & Compliance Standards', 'Industrial Standards (62443)'] };
      }

    case 'INTERNAL_SECURITY_OPS':
      if (taxonomyId === 'para') {
        return { category: '2. Areas', subfolder: 'Security & Compliance', fullPath: ['2. Areas', 'Security & Compliance'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '30-39 Knowledge & Reference', subfolder: '34 Standards & Compliance', fullPath: ['30-39 Knowledge & Reference', '34 Standards & Compliance'] };
      } else {
        return { category: 'Security & Compliance Standards', subfolder: 'Compliance Registers', fullPath: ['Security & Compliance Standards', 'Compliance Registers'] };
      }

    case 'WORKPLACE_HR':
      if (taxonomyId === 'para') {
        return { category: '2. Areas', subfolder: 'Workplace & Corporate Portals', fullPath: ['2. Areas', 'Workplace & Corporate Portals'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '40-49 Administration & Finance', subfolder: '42 Workplace & HR Portals', fullPath: ['40-49 Administration & Finance', '42 Workplace & HR Portals'] };
      } else {
        return { category: 'Corporate & Workplace', subfolder: 'HR & Time Management', fullPath: ['Corporate & Workplace', 'HR & Time Management'] };
      }

    case 'WORKPLACE_FINANCE':
      if (taxonomyId === 'para') {
        return { category: '2. Areas', subfolder: 'Finances & Billing', fullPath: ['2. Areas', 'Finances & Billing'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '40-49 Administration & Finance', subfolder: '41 Financial & Tax', fullPath: ['40-49 Administration & Finance', '41 Financial & Tax'] };
      } else {
        return { category: 'Corporate & Workplace', subfolder: 'Finance & Billing', fullPath: ['Corporate & Workplace', 'Finance & Billing'] };
      }

    case 'CLOUD_DATA_IT':
      if (taxonomyId === 'para') {
        return { category: '2. Areas', subfolder: 'Cloud, IT & Infrastructure', fullPath: ['2. Areas', 'Cloud, IT & Infrastructure'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '20-29 Engineering & Tech', subfolder: '22 Systems & Cloud', fullPath: ['20-29 Engineering & Tech', '22 Systems & Cloud'] };
      } else {
        return { category: 'Cloud, IT & Infrastructure', subfolder: 'Cloud Platforms (Azure, AWS)', fullPath: ['Cloud, IT & Infrastructure', 'Cloud Platforms (Azure, AWS)'] };
      }

    case 'ACTIVE_PROJECT':
      if (taxonomyId === 'para') {
        return { category: '1. Projects', subfolder: 'Active Tasks & Sprints', fullPath: ['1. Projects', 'Active Tasks & Sprints'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '10-19 Core & Projects', subfolder: '11 Active Tasks', fullPath: ['10-19 Core & Projects', '11 Active Tasks'] };
      } else {
        return { category: 'Corporate & Workplace', subfolder: 'Project Management', fullPath: ['Corporate & Workplace', 'Project Management'] };
      }

    case 'CORP_WORKSPACE':
      if (taxonomyId === 'para') {
        return { category: '2. Areas', subfolder: 'Workplace & Corporate Portals', fullPath: ['2. Areas', 'Workplace & Corporate Portals'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '40-49 Administration & Finance', subfolder: '43 Corporate Intranet & Portals', fullPath: ['40-49 Administration & Finance', '43 Corporate Intranet & Portals'] };
      } else {
        return { category: 'Corporate & Workplace', subfolder: 'Intranet Portals', fullPath: ['Corporate & Workplace', 'Intranet Portals'] };
      }

    case 'DEV_DOCS':
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Development & Code', fullPath: ['3. Resources', 'Development & Code'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '20-29 Engineering & Tech', subfolder: '21 Frontend & Web', fullPath: ['20-29 Engineering & Tech', '21 Frontend & Web'] };
      } else {
        return { category: 'Development & Tech', subfolder: 'Libraries & Packages', fullPath: ['Development & Tech', 'Libraries & Packages'] };
      }

    case 'DESIGN':
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Design & UI/UX', fullPath: ['3. Resources', 'Design & UI/UX'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '20-29 Engineering & Tech', subfolder: '21 Frontend & Web', fullPath: ['20-29 Engineering & Tech', '21 Frontend & Web'] };
      } else {
        return { category: 'Development & Tech', subfolder: 'Design & UI', fullPath: ['Development & Tech', 'Design & UI'] };
      }

    case 'ARTICLES':
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Articles & Research', fullPath: ['3. Resources', 'Articles & Research'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '30-39 Knowledge & Reference', subfolder: '31 Articles & Reference', fullPath: ['30-39 Knowledge & Reference', '31 Articles & Reference'] };
      } else {
        return { category: 'Articles & Reading', subfolder: 'Engineering Blogs', fullPath: ['Articles & Reading', 'Engineering Blogs'] };
      }

    case 'DEFAULT_FALLBACK':
    default:
      if (taxonomyId === 'para') {
        return { category: '3. Resources', subfolder: 'Guides & Reference', fullPath: ['3. Resources', 'Guides & Reference'] };
      } else if (taxonomyId === 'johnny-decimal') {
        return { category: '30-39 Knowledge & Reference', subfolder: '31 Articles & Reference', fullPath: ['30-39 Knowledge & Reference', '31 Articles & Reference'] };
      } else {
        return { category: 'Tools & Utilities', subfolder: 'General Utilities', fullPath: ['Tools & Utilities', 'General Utilities'] };
      }
  }
}

/**
 * Classifies page metadata into a proposed folder within the chosen taxonomy.
 */
export function proposeBookmarkFolder(
  metadata: PageMetadata,
  taxonomy: TaxonomyTemplate = DEFAULT_TAXONOMY
): ProposedFolder {
  const url = metadata.url.toLowerCase();
  const domain = metadata.domain.toLowerCase();
  const title = (metadata.title || '').toLowerCase();
  const desc = (metadata.description || '').toLowerCase();
  const keywords = (metadata.keywords || []).map((k) => k.toLowerCase());
  const schemaTypes = (metadata.schemaTypes || []).map((s) => s.toLowerCase());
  const breadcrumbs = metadata.breadcrumbs || [];

  // Extract embedded SSO destination (e.g. login.microsoftonline.com?redirect_uri=https://dxcportal.sharepoint.com)
  let ssoDestination = '';
  if (domain.includes('login.microsoftonline.com') || domain.includes('visma.com') || domain.includes('okta.com')) {
    try {
      const parsed = new URL(metadata.url);
      const targetParam = parsed.searchParams.get('redirect_uri') || parsed.searchParams.get('wtrealm');
      if (targetParam) ssoDestination = targetParam.toLowerCase();
    } catch {}
  }

  // Combine searchable text tokens
  const fullText = [title, desc, domain, ssoDestination, url, ...keywords, ...schemaTypes, ...breadcrumbs.map((b) => b.toLowerCase())].join(' ');

  // -------------------------------------------------------------
  // STRATEGY 0: Local Network, Private DNS & Homelab Services
  // -------------------------------------------------------------
  const isLocalHost = isLocalOrPrivateHost(domain);
  const homelabMatch = detectHomelabService(domain, fullText);

  if (homelabMatch) {
    const { service } = homelabMatch;
    if (taxonomy.id === 'para') {
      return {
        taxonomyName: taxonomy.name,
        category: '2. Areas',
        subfolder: `Homelab / ${service.label}`,
        fullPath: ['2. Areas', 'Homelab & Self-Hosted', service.subfolder],
        confidence: 0.98,
        reasoning: `Identified self-hosted ${service.label} service on ${isLocalHost ? 'local DNS domain' : 'domain'} (${domain})`,
        suggestedTags: [...service.tags, 'lan', 'local'],
      };
    } else if (taxonomy.id === 'johnny-decimal') {
      return {
        taxonomyName: taxonomy.name,
        category: '20-29 Engineering & Tech',
        subfolder: '23 IT & Infrastructure',
        fullPath: ['20-29 Engineering & Tech', '23 IT & Infrastructure', service.subfolder],
        confidence: 0.98,
        reasoning: `Matched self-hosted homelab service (${service.label}) on ${domain}`,
        suggestedTags: [...service.tags, 'lan'],
      };
    } else {
      return {
        taxonomyName: taxonomy.name,
        category: 'Tools & Utilities',
        subfolder: 'Homelab & Self-Hosted',
        fullPath: ['Tools & Utilities', 'Homelab & Self-Hosted', service.subfolder],
        confidence: 0.98,
        reasoning: `Matched homelab service (${service.label}) on ${domain}`,
        suggestedTags: [...service.tags, 'lan'],
      };
    }
  }

  if (isLocalHost) {
    const hostPrefix = domain.split('.')[0] || 'Local Device';
    const subfolderName = `Local Network & Services (${hostPrefix})`;

    if (taxonomy.id === 'para') {
      return {
        taxonomyName: taxonomy.name,
        category: '2. Areas',
        subfolder: 'Homelab & Self-Hosted',
        fullPath: ['2. Areas', 'Homelab & Self-Hosted', subfolderName],
        confidence: 0.92,
        reasoning: `Identified local network host on private DNS domain (${domain})`,
        suggestedTags: ['lan', 'local', 'homelab', hostPrefix],
      };
    } else {
      const c = getConceptualPath('CLOUD_DATA_IT', taxonomy.id);
      return {
        taxonomyName: taxonomy.name,
        category: c.category,
        subfolder: c.subfolder,
        fullPath: c.fullPath,
        confidence: 0.9,
        reasoning: `Identified local network device (${domain})`,
        suggestedTags: ['lan', 'local', 'device'],
      };
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 1: Personal Lifestyle, Food & Recipes
  // -------------------------------------------------------------
  if (
    domain.includes('allrecipes.com') ||
    fullText.includes('recipe') ||
    fullText.includes('cooking') ||
    fullText.includes('dinner') ||
    fullText.includes('kitchen')
  ) {
    const c = getConceptualPath('PERSONAL_LIFESTYLE', taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.95,
      reasoning: 'Recognized personal cooking/recipe reference',
      suggestedTags: ['recipe', 'food', 'cooking', 'personal'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Cybersecurity, Compliance & Industry Standards
  // (ISA/IEC 62443, NIST, TISAX, ISMS, ENISA, NCSC, DoD Cyber Exchange, etc.)
  // -------------------------------------------------------------
  if (
    domain.includes('enisa.europa.eu') ||
    domain.includes('ncsc.gov.uk') ||
    domain.includes('cyber.mil') ||
    domain.includes('isa.org') ||
    domain.includes('acquisition.gov') ||
    domain.includes('isms.online') ||
    fullText.includes('isms') ||
    fullText.includes('62443') ||
    fullText.includes('nist') ||
    fullText.includes('tisax') ||
    fullText.includes('cybersecurity') ||
    fullText.includes('biso') ||
    fullText.includes('security assurance') ||
    fullText.includes('exception register') ||
    fullText.includes('attack on clients')
  ) {
    const isInternalRegister = fullText.includes('exception register') || fullText.includes('biso');
    const concept = isInternalRegister ? 'INTERNAL_SECURITY_OPS' : 'SECURITY_STANDARDS';
    const c = getConceptualPath(concept, taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.96,
      reasoning: isInternalRegister
        ? 'Identified internal security operations and compliance registers'
        : 'Recognized cybersecurity standards, regulatory guidance, or compliance framework',
      suggestedTags: ['security', 'compliance', 'standards', ...(fullText.includes('62443') ? ['62443'] : [])],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Corporate HR, Workforce Management, Admin & Finance
  // (Medvind, Visma, Chefsportal, Intelex EHS, Brand Hub, Billing)
  // -------------------------------------------------------------
  if (
    domain.includes('visma.com') ||
    fullText.includes('medvind') ||
    fullText.includes('chefsportal') ||
    fullText.includes('manager portal') ||
    fullText.includes('intelex') ||
    fullText.includes('brand hub') ||
    fullText.includes('sverige portal') ||
    fullText.includes('print.corp') ||
    fullText.includes('my code') ||
    fullText.includes('billing') ||
    fullText.includes('finance') ||
    fullText.includes('invoice') ||
    fullText.includes('monthly billing')
  ) {
    const isFinance = fullText.includes('finance') || fullText.includes('billing') || fullText.includes('invoice');
    const concept = isFinance ? 'WORKPLACE_FINANCE' : 'WORKPLACE_HR';
    const c = getConceptualPath(concept, taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.95,
      reasoning: isFinance
        ? 'Identified corporate finance, billing reports, or invoicing documents'
        : 'Recognized corporate workforce management, HR, or workplace operations portal',
      suggestedTags: isFinance ? ['finance', 'billing', 'admin'] : ['hr', 'workplace', 'portal', 'corporate'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 4: Enterprise Cloud, IT Infrastructure, Data & AI
  // (ServiceNow, Snowflake, Data lake, Azure, PowerApps, IPAM / DDI)
  // -------------------------------------------------------------
  if (
    domain.includes('service-now.com') ||
    domain.includes('snowflake.com') ||
    domain.includes('datalake') ||
    domain.includes('azure.com') ||
    domain.includes('azurewebsites.net') ||
    domain.includes('cloudprice.net') ||
    domain.includes('powerapps.com') ||
    domain.includes('ddi.skf.net') ||
    domain.includes('ipam') ||
    domain.includes('aws.amazon.com') ||
    domain.includes('portal.azure.com') ||
    domain.includes('console.cloud.google.com') ||
    domain.includes('cloudflare.com') ||
    domain.includes('datadog') ||
    fullText.includes('infrastructure services') ||
    fullText.includes('network knowledge') ||
    fullText.includes('openai') ||
    fullText.includes('chatgpt')
  ) {
    const c = getConceptualPath('CLOUD_DATA_IT', taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.94,
      reasoning: 'Recognized enterprise IT operations, data platforms, or cloud infrastructure consoles',
      suggestedTags: ['cloud', 'it', 'infrastructure', 'data'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 5: Active Projects & Task Boards (Strict match)
  // -------------------------------------------------------------
  if (
    fullText.includes('powerppm') ||
    fullText.includes('ppm') ||
    domain.includes('linear.app') ||
    domain.includes('jira') ||
    domain.includes('trello.com') ||
    domain.includes('asana.com') ||
    url.includes('/issues/') ||
    url.includes('/pull/') ||
    url.includes('/sprint') ||
    url.includes('/board')
  ) {
    const c = getConceptualPath('ACTIVE_PROJECT', taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.95,
      reasoning: 'Matched active project portfolio management (PPM) or task tracker',
      suggestedTags: ['project', 'task', 'active'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 6: Corporate SharePoint & M365 Workspaces
  // -------------------------------------------------------------
  if (
    domain.includes('sharepoint.com') ||
    domain.includes('microsoft365') ||
    domain.includes('delve') ||
    domain.includes('office.com') ||
    ssoDestination.includes('sharepoint.com')
  ) {
    const c = getConceptualPath('CORP_WORKSPACE', taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.9,
      reasoning: 'Recognized internal Microsoft 365 or SharePoint team workspace',
      suggestedTags: ['sharepoint', 'm365', 'intranet', 'workspace'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 7: Developer Documentation & Design Resources
  // -------------------------------------------------------------
  if (
    domain.includes('developer.mozilla.org') ||
    domain.includes('stackoverflow.com') ||
    domain.includes('github.com') ||
    domain.includes('npmjs.com') ||
    domain.includes('docs.') ||
    domain.endsWith('.dev') ||
    schemaTypes.includes('techarticle') ||
    schemaTypes.includes('softwaresourcecode')
  ) {
    const c = getConceptualPath('DEV_DOCS', taxonomy.id);
    let subfolder = c.subfolder;
    if (breadcrumbs.length > 0) {
      const relevantBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      if (relevantBreadcrumb && relevantBreadcrumb.length < 30) {
        subfolder = `${c.subfolder} / ${relevantBreadcrumb}`;
      }
    }
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder,
      fullPath: [c.category, subfolder],
      confidence: 0.95,
      reasoning: `Detected developer documentation / technical reference (${domain})`,
      suggestedTags: ['dev', 'reference', 'code', ...(keywords.slice(0, 3))],
    };
  }

  if (
    domain.includes('figma.com') ||
    domain.includes('dribbble.com') ||
    domain.includes('behance.net') ||
    domain.includes('awwwards.com')
  ) {
    const c = getConceptualPath('DESIGN', taxonomy.id);
    return {
      taxonomyName: taxonomy.name,
      category: c.category,
      subfolder: c.subfolder,
      fullPath: c.fullPath,
      confidence: 0.93,
      reasoning: `Recognized UI/UX design resource (${domain})`,
      suggestedTags: ['design', 'ui', 'inspiration'],
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 8: Breadcrumbs & Schema.org Category Mapping
  // -------------------------------------------------------------
  if (breadcrumbs.length >= 2) {
    const primarySection = breadcrumbs[0];
    const secondarySection = breadcrumbs[1];
    const sub = `${primarySection} / ${secondarySection}`;

    if (taxonomy.id === 'para') {
      return {
        taxonomyName: taxonomy.name,
        category: '3. Resources',
        subfolder: sub,
        fullPath: ['3. Resources', sub],
        confidence: 0.88,
        reasoning: `Proposed folder derived from page breadcrumbs: "${breadcrumbs.join(' > ')}"`,
        suggestedTags: [primarySection.toLowerCase(), secondarySection.toLowerCase()],
      };
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 9: General Keyword & Scoring Matching
  // -------------------------------------------------------------
  let bestRoot = taxonomy.rootFolders[0];
  let bestScore = -1;
  let matchedKeyword = '';

  for (const root of taxonomy.rootFolders) {
    let score = 0;

    if (root.matchKeywords) {
      for (const kw of root.matchKeywords) {
        if (fullText.includes(kw)) {
          score += 3;
          if (!matchedKeyword) matchedKeyword = kw;
        }
      }
    }

    if (root.matchTypes) {
      for (const st of root.matchTypes) {
        if (schemaTypes.includes(st.toLowerCase())) {
          score += 5;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRoot = root;
    }
  }

  if (bestScore > 0) {
    let chosenSubfolder = bestRoot.subfolders?.[0] || 'General';
    if (bestRoot.subfolders) {
      for (const sub of bestRoot.subfolders) {
        const subLower = sub.toLowerCase();
        if (fullText.includes(subLower)) {
          chosenSubfolder = sub;
          break;
        }
      }
    }

    return {
      taxonomyName: taxonomy.name,
      category: bestRoot.name,
      subfolder: chosenSubfolder,
      fullPath: [bestRoot.name, chosenSubfolder],
      confidence: Number(Math.min(0.65 + bestScore * 0.05, 0.92).toFixed(2)),
      reasoning: `Content matches keywords in ${bestRoot.name} (matched "${matchedKeyword || chosenSubfolder}")`,
      suggestedTags: Array.from(new Set([...keywords.slice(0, 4)])),
    };
  }

  // -------------------------------------------------------------
  // STRATEGY 10: Safe Reference Fallback
  // (Never default unclassified bookmarks to Projects/Active Tasks!)
  // -------------------------------------------------------------
  const fallback = getConceptualPath('DEFAULT_FALLBACK', taxonomy.id);
  return {
    taxonomyName: taxonomy.name,
    category: fallback.category,
    subfolder: fallback.subfolder,
    fullPath: fallback.fullPath,
    confidence: 0.6,
    reasoning: `General reference material (${taxonomy.name} library)`,
    suggestedTags: Array.from(new Set([...keywords.slice(0, 3)])),
  };
}
