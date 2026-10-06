import { TaxonomyTemplate } from '../types';

export const TAXONOMY_TEMPLATES: TaxonomyTemplate[] = [
  {
    id: 'para',
    name: 'PARA Method',
    description: 'Organize by actionability: Projects (active deadlines), Areas (ongoing responsibilities & operations), Resources (knowledge & reference), and Archives (inactive).',
    rootFolders: [
      {
        name: '1. Projects',
        description: 'Short-term efforts and active projects you are currently working on with a specific goal/deadline.',
        subfolders: ['Active Tasks & Sprints', 'Project Deliverables', 'Planning & Roadmaps'],
        matchKeywords: ['sprint', 'task', 'roadmap', 'board', 'jira', 'trello', 'asana', 'linear', 'notion', 'milestone', 'launch', 'todo', 'powerppm', 'backlog', 'kanban'],
        matchTypes: ['project', 'task', 'issue']
      },
      {
        name: '2. Areas',
        description: 'Ongoing spheres of activity, corporate operations, infrastructure, and standards to maintain over time.',
        subfolders: ['Workplace & Corporate Portals', 'Cloud, IT & Infrastructure', 'Security & Compliance', 'Finances & Billing', 'Homelab & Self-Hosted', 'Personal & Health'],
        matchKeywords: [
          'service-now', 'servicenow', 'snowflake', 'azure', 'aws', 'cloud', 'datalake', 'ipam', 'ddi',
          'medvind', 'visma', 'chefsportal', 'manager portal', 'intelex', 'brand hub', 'sverige portal',
          'sharepoint', 'portal', 'dashboard', 'billing', 'invoice', 'payroll', 'timesheet',
          'homelab', 'sonarr', 'radarr', 'plex', 'jellyfin', 'proxmox', 'truenas', 'unraid', 'homeassistant', 'pihole', 'portainer'
        ],
        matchTypes: ['admin', 'dashboard', 'service']
      },
      {
        name: '3. Resources',
        description: 'Topics, standards, skills, documentation, and interests you want to collect and reference.',
        subfolders: ['Security & Compliance Standards', 'Development & Code', 'Design & UI/UX', 'Personal & Recipes', 'Guides & Reference', 'Articles & Research'],
        matchKeywords: [
          'standards', 'isa', 'iec', '62443', 'nist', 'isms', 'tisax', 'security', 'cybersecurity', 'compliance',
          'enisa', 'ncsc', 'cyber.mil', 'acquisition.gov', 'eca', 'far', 'biso',
          'docs', 'tutorial', 'reference', 'guide', 'cheatsheet', 'api', 'library', 'framework', 'github', 'stackoverflow', 'npm',
          'recipe', 'cooking', 'food', 'dinner', 'article', 'spec', 'rfc'
        ],
        matchTypes: ['TechArticle', 'Article', 'SoftwareSourceCode', 'HowTo', 'Course']
      },
      {
        name: '4. Archives',
        description: 'Inactive items from the other three categories that you want to preserve for the record.',
        subfolders: ['Past Projects', 'Completed Courses', 'Archived References'],
        matchKeywords: ['archive', 'deprecated', 'completed', 'past', 'history', 'legacy'],
        matchTypes: ['archive']
      }
    ]
  },
  {
    id: 'johnny-decimal',
    name: 'Johnny.Decimal',
    description: 'Structured 10-category numbered system for clear hierarchy and instant navigation.',
    rootFolders: [
      {
        name: '10-19 Core & Projects',
        description: 'Direct active projects, sprint deliverables, and daily workflows',
        subfolders: ['11 Active Tasks', '12 Sprint Deadlines', '13 Project Management (PPM)'],
        matchKeywords: ['sprint', 'task', 'jira', 'trello', 'linear', 'asana', 'milestone', 'todo', 'board', 'powerppm', 'backlog', 'kanban']
      },
      {
        name: '20-29 Engineering & Tech',
        description: 'Cloud systems, enterprise data, IT infrastructure, network, and source code',
        subfolders: ['21 Frontend & Web', '22 Systems & Cloud', '23 IT & Infrastructure', '24 Data & AI Platforms'],
        matchKeywords: [
          'snowflake', 'azure', 'aws', 'cloud', 'datalake', 'service-now', 'servicenow', 'ipam', 'ddi',
          'network', 'api', 'code', 'git', 'github', 'powerapps', 'openai', 'chatgpt', 'docker', 'infrastructure'
        ]
      },
      {
        name: '30-39 Knowledge & Reference',
        description: 'Standards, regulations, technical specifications, guides, and personal reading',
        subfolders: ['31 Articles & Reference', '34 Standards & Compliance', '35 Personal & Lifestyle'],
        matchKeywords: [
          'standards', 'isa', 'iec', '62443', 'nist', 'isms', 'tisax', 'security', 'cybersecurity', 'compliance',
          'enisa', 'ncsc', 'cyber.mil', 'acquisition.gov', 'eca', 'far', 'biso',
          'recipe', 'cooking', 'food', 'reference', 'guide', 'cheatsheet', 'research', 'article'
        ]
      },
      {
        name: '40-49 Administration & Finance',
        description: 'Corporate intranet, workplace tools, HR, payroll, billing, and management portals',
        subfolders: ['41 Financial & Tax', '42 Workplace & HR Portals', '43 Corporate Intranet & Portals'],
        matchKeywords: [
          'finance', 'billing', 'invoice', 'tax', 'payroll', 'timesheet',
          'medvind', 'visma', 'chefsportal', 'manager portal', 'intelex', 'brand hub', 'sverige portal',
          'sharepoint', 'portal', 'print.corp', 'my code', 'admin', 'corporate'
        ]
      }
    ]
  },
  {
    id: 'topic',
    name: 'Topic & Functional',
    description: 'Clean categorical organization grouped by domain, field of knowledge, and utility.',
    rootFolders: [
      {
        name: 'Security & Compliance Standards',
        description: 'Information security frameworks, regulatory standards, and compliance audits.',
        subfolders: ['Industrial Standards (62443)', 'ISMS & Frameworks', 'Government & Defense (NCSC, DoD)', 'Compliance Registers'],
        matchKeywords: ['standards', 'isa', 'iec', '62443', 'nist', 'isms', 'tisax', 'security', 'cybersecurity', 'compliance', 'enisa', 'ncsc', 'cyber.mil', 'acquisition.gov', 'eca', 'far', 'biso']
      },
      {
        name: 'Corporate & Workplace',
        description: 'Enterprise portals, SharePoint workspaces, HR, timesheets, and internal management.',
        subfolders: ['Intranet Portals', 'HR & Time Management', 'Finance & Billing', 'EHS & Incident Management'],
        matchKeywords: ['sharepoint', 'medvind', 'visma', 'chefsportal', 'manager portal', 'intelex', 'brand hub', 'sverige portal', 'billing', 'finance', 'invoice', 'timesheet', 'print.corp', 'my code']
      },
      {
        name: 'Cloud, IT & Infrastructure',
        description: 'Enterprise cloud consoles, data platforms, ServiceNow, and network management.',
        subfolders: ['Data & Snowflake', 'Cloud Platforms (Azure, AWS)', 'IT Service Management', 'Network & IPAM'],
        matchKeywords: ['snowflake', 'azure', 'aws', 'cloud', 'datalake', 'service-now', 'servicenow', 'ipam', 'ddi', 'network', 'powerapps', 'openai', 'chatgpt']
      },
      {
        name: 'Development & Tech',
        description: 'Programming languages, frameworks, cloud services, and source code.',
        subfolders: ['Frontend', 'Backend', 'DevOps & Cloud', 'AI & Data', 'Libraries & Packages'],
        matchKeywords: ['github', 'typescript', 'javascript', 'python', 'react', 'rust', 'docker', 'kubernetes', 'npm', 'api', 'code', 'git', 'terminal'],
        matchTypes: ['SoftwareSourceCode', 'TechArticle']
      },
      {
        name: 'Personal & Lifestyle',
        description: 'Personal references, recipes, travel, and non-work bookmarks.',
        subfolders: ['Cooking & Recipes', 'Travel & Bookings', 'Personal References'],
        matchKeywords: ['recipe', 'cooking', 'food', 'dinner', 'kitchen', 'allrecipes', 'travel', 'hotel', 'flight']
      },
      {
        name: 'Tools & Utilities',
        description: 'Web applications, converters, benchmarkers, and online utilities.',
        subfolders: ['Converters & Generators', 'Calculators', 'Generative AI Tools', 'Homelab & Self-Hosted'],
        matchKeywords: ['generator', 'converter', 'calculator', 'online-tool', 'compressor', 'formatter', 'linter', 'json-viewer', 'homelab', 'sonarr', 'radarr', 'pihole'],
        matchTypes: ['WebApplication', 'SoftwareApplication']
      }
    ]
  }
];

export const DEFAULT_TAXONOMY = TAXONOMY_TEMPLATES[0]; // PARA

export const PREFERRED_TAXONOMY_KEY = 'edgemark_preferred_taxonomy_id';

let memoryFallbackTaxonomyId = DEFAULT_TAXONOMY.id;

/**
 * Returns the currently preferred taxonomy ID from storage, defaulting to 'para'
 */
export function getPreferredTaxonomyId(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
      try {
        chrome.storage.local.get([PREFERRED_TAXONOMY_KEY], (data) => {
          if (data && data[PREFERRED_TAXONOMY_KEY]) {
            resolve(data[PREFERRED_TAXONOMY_KEY]);
          } else {
            resolve(memoryFallbackTaxonomyId);
          }
        });
        return;
      } catch {
        // Fallback
      }
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(PREFERRED_TAXONOMY_KEY);
        if (val) return resolve(val);
      } catch {}
    }
    resolve(memoryFallbackTaxonomyId);
  });
}

/**
 * Returns the full preferred TaxonomyTemplate
 */
export async function getPreferredTaxonomy(): Promise<TaxonomyTemplate> {
  const id = await getPreferredTaxonomyId();
  const found = TAXONOMY_TEMPLATES.find((t) => t.id === id);
  return found || DEFAULT_TAXONOMY;
}

/**
 * Saves the user's preferred taxonomy ID to storage
 */
export function setPreferredTaxonomy(taxonomyId: string): Promise<void> {
  memoryFallbackTaxonomyId = taxonomyId;
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      try {
        chrome.storage.local.set({ [PREFERRED_TAXONOMY_KEY]: taxonomyId }, () => resolve());
        return;
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(PREFERRED_TAXONOMY_KEY, taxonomyId);
      } catch {}
    }
    resolve();
  });
}
