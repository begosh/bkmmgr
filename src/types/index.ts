export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  parentId?: string;
  dateAdded?: number;
  folderPath?: string; // e.g. "Favorites bar / Resources / Tech"
}

export interface BookmarkFolder {
  id: string;
  title: string;
  parentId?: string;
  children?: (BookmarkFolder | BookmarkItem)[];
}

export interface CleanUrlResult {
  originalUrl: string;
  cleanedUrl: string;
  strippedParams: string[];
  hasChanges: boolean;
}

export type HealthStatusType = 'alive' | 'broken' | 'redirect' | 'timeout' | 'error' | 'untested';

export interface LinkHealthResult {
  id: string;
  url: string;
  title: string;
  folderPath?: string;
  status: HealthStatusType;
  statusCode?: number;
  statusText?: string;
  redirectUrl?: string;
  pageTitle?: string;
  notice?: string;
  errorMsg?: string;
  latencyMs?: number;
  checkedAt?: number;
}

export interface DuplicateGroup {
  id: string;
  normalizedUrl: string;
  primary: BookmarkItem;
  duplicates: BookmarkItem[];
  matchType: 'exact' | 'normalized';
}

export interface EmptyFolderItem {
  id: string;
  title: string;
  folderPath: string;
  parentId?: string;
  depth: number;
}

export interface PageMetadata {
  url: string;
  title: string;
  description?: string;
  keywords?: string[];
  ogType?: string;
  ogSiteName?: string;
  schemaTypes?: string[];
  headings?: string[];
  breadcrumbs?: string[];
  domain: string;
}

export interface ProposedFolder {
  taxonomyName: string;
  category: string; // e.g. "Resources" or "Projects"
  subfolder?: string; // e.g. "Development" or "Design"
  fullPath: string[]; // ["Resources", "Development"]
  confidence: number; // 0 to 1
  reasoning: string;
  suggestedTags: string[];
}

export interface TaxonomyTemplate {
  id: string;
  name: string;
  description: string;
  rootFolders: {
    name: string;
    description: string;
    subfolders?: string[];
    matchKeywords?: string[];
    matchTypes?: string[];
  }[];
}

export type AIProviderType = 'gemini-api' | 'google-oauth' | 'ollama' | 'disabled';

export interface AISettings {
  enabled: boolean;
  provider: AIProviderType;
  geminiApiKey?: string;
  geminiModel?: string; // 'gemini-3.8-flash' | 'gemini-3.5-flash-lite' | 'gemini-3.5-flash'
  googleOAuthClientId?: string;
  googleOAuthScope?: string;
  googleAccessToken?: string;
  ollamaEndpoint?: string; // e.g. 'http://localhost:11434'
  ollamaModel?: string; // e.g. 'llama3.2', 'mistral'
  classificationMode: 'hybrid' | 'ai-only'; // hybrid = rules first, AI for ambiguous/unclassified
  stripQueryParamsBeforeAI: boolean;
  excludeLocalAndIntranet: boolean; // Protect .lan and internal hostnames from cloud AI
}

export interface AIClassificationResult {
  id: string;
  category: string;
  subfolder: string;
  confidence: number;
  reasoning: string;
  suggestedTags?: string[];
}

export interface ModelIntelligenceMeta {
  id: string;
  name: string;
  clevernessTier: string;
  clevernessStars: number;
  efficiencyTag: string;
  oceanBoilRisk: 'low' | 'moderate' | 'extreme' | 'none';
  freeTierQuota: string;
  bestFor: string;
  isRecommended?: boolean;
}

export type SortOrderMode = 'domain-alpha' | 'alpha-asc' | 'alpha-desc' | 'date-desc' | 'date-asc';
export type DividerStyle = 'domain-named' | 'clean-line' | 'none';

export interface FolderSortOptions {
  criteria: SortOrderMode;
  dividerStyle: DividerStyle;
  sortSubfoldersFirst?: boolean;
}

export interface FolderSortPreviewItem {
  id?: string;
  title: string;
  url?: string;
  isDivider: boolean;
  domain?: string;
}

export interface FolderSortPreview {
  folderId: string;
  folderTitle: string;
  folderPath: string;
  itemCount: number;
  domainCount: number;
  items: FolderSortPreviewItem[];
}
