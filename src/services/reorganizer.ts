import { BookmarkItem, ProposedFolder, TaxonomyTemplate, FolderSortOptions } from '../types';
import { proposeBookmarkFolder } from './classifier';
import { PageMetadata } from '../types';
import { DEFAULT_TAXONOMY } from './taxonomyTemplates';
import { ensureFolderPath, moveBookmark } from './bookmarkManager';
import { createBookmarkSnapshot } from './backupService';
import { getAISettings, batchClassifyWithAI } from './aiProvider';
import { sortFolder } from './bookmarkSorter';

export interface ProposedMove {
  bookmark: BookmarkItem;
  currentFolder: string;
  proposedCategory: string;
  proposedSubfolder: string;
  targetPath: string[];
  confidence: number;
  reasoning: string;
  accepted: boolean;
  classifiedBy?: 'rules' | 'gemini' | 'ollama';
}

export interface ReorganizationPlan {
  taxonomy: TaxonomyTemplate;
  moves: ProposedMove[];
  unmovedCount: number;
}

/**
 * Determines if a bookmark is already located in its exact proposed category and subfolder
 */
export function isAlreadyInTargetFolder(currentFolder: string, proposal: ProposedFolder): boolean {
  if (!currentFolder) return false;

  const currentSegments = currentFolder
    .split(/\s*[\/\\]\s*/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const targetCategory = proposal.category.trim().toLowerCase();
  const targetSubfolder = (proposal.subfolder || '').trim().toLowerCase();

  if (targetSubfolder) {
    const lastSegment = currentSegments[currentSegments.length - 1];
    const secondLastSegment = currentSegments[currentSegments.length - 2];
    return lastSegment === targetSubfolder && secondLastSegment === targetCategory;
  } else {
    const lastSegment = currentSegments[currentSegments.length - 1];
    return lastSegment === targetCategory;
  }
}

/**
 * Analyzes bookmarks and constructs a proposed reorganization plan
 */
export function generateReorganizationPlan(
  bookmarks: BookmarkItem[],
  taxonomy: TaxonomyTemplate = DEFAULT_TAXONOMY
): ReorganizationPlan {
  const moves: ProposedMove[] = [];
  let unmovedCount = 0;

  for (const bkm of bookmarks) {
    if (!bkm.url || !bkm.url.startsWith('http')) {
      unmovedCount++;
      continue;
    }

    let domain = '';
    try {
      domain = new URL(bkm.url).hostname;
    } catch {
      domain = '';
    }

    // Construct metadata for classification from known bookmark info
    const meta: PageMetadata = {
      url: bkm.url,
      title: bkm.title,
      domain,
      keywords: [],
      schemaTypes: [],
      headings: [],
      breadcrumbs: [],
    };

    const proposal: ProposedFolder = proposeBookmarkFolder(meta, taxonomy);
    const currentFolder = bkm.folderPath || 'Unsorted';

    // If already in target folder, no move needed
    if (isAlreadyInTargetFolder(currentFolder, proposal)) {
      unmovedCount++;
      continue;
    }

    moves.push({
      bookmark: bkm,
      currentFolder,
      proposedCategory: proposal.category,
      proposedSubfolder: proposal.subfolder || '',
      targetPath: proposal.fullPath,
      confidence: proposal.confidence,
      reasoning: proposal.reasoning,
      accepted: true, // Default to accepted, user can toggle in UI
      classifiedBy: 'rules',
    });
  }

  // Sort by confidence descending
  moves.sort((a, b) => b.confidence - a.confidence);

  return {
    taxonomy,
    moves,
    unmovedCount,
  };
}

/**
 * Analyzes bookmarks with heuristic rules and AI classification
 */
export async function generateReorganizationPlanAsync(
  bookmarks: BookmarkItem[],
  taxonomy: TaxonomyTemplate = DEFAULT_TAXONOMY,
  useAi: boolean = false,
  onAiProgress?: (statusMsg: string) => void
): Promise<ReorganizationPlan> {
  const basePlan = generateReorganizationPlan(bookmarks, taxonomy);
  if (!useAi) return basePlan;

  const aiSettings = await getAISettings();
  if (!aiSettings.enabled || aiSettings.provider === 'disabled') {
    return basePlan;
  }

  // Identify candidates for AI:
  // In hybrid mode, refine ambiguous or low-confidence (<0.80) or fallback matches
  const aiCandidates = basePlan.moves.filter((m) => {
    if (aiSettings.classificationMode === 'ai-only') return true;
    return (
      m.confidence < 0.85 ||
      m.reasoning.toLowerCase().includes('fallback') ||
      m.reasoning.toLowerCase().includes('default')
    );
  });

  if (aiCandidates.length === 0) {
    return basePlan;
  }

  if (onAiProgress) {
    const providerName =
      aiSettings.provider === 'ollama' ? 'Ollama' : `Gemini (${aiSettings.geminiModel || 'Flash'})`;
    onAiProgress(`Consulting ${providerName} for ${aiCandidates.length} ambiguous bookmarks...`);
  }

  try {
    const candidateBookmarks = aiCandidates.map((c) => c.bookmark);
    const aiResults = await batchClassifyWithAI(candidateBookmarks, taxonomy, aiSettings);

    const providerType = aiSettings.provider === 'ollama' ? 'ollama' : 'gemini';

    for (const move of basePlan.moves) {
      const aiResult = aiResults[move.bookmark.id];
      if (aiResult) {
        move.proposedCategory = aiResult.category;
        move.proposedSubfolder = aiResult.subfolder;
        move.targetPath = aiResult.subfolder
          ? [aiResult.category, aiResult.subfolder]
          : [aiResult.category];
        move.confidence = aiResult.confidence;
        move.reasoning = aiResult.reasoning;
        move.classifiedBy = providerType;
      }
    }
  } catch (err: any) {
    console.warn('AI classification failed, maintaining heuristic proposals:', err);
    if (onAiProgress) {
      onAiProgress(`AI note: ${err.message || 'AI request failed; used rules.'}`);
    }
  }

  basePlan.moves.sort((a, b) => b.confidence - a.confidence);
  return basePlan;
}

/**
 * Executes the accepted moves in Edge bookmarks, optionally sorting destination folders
 */
export async function executeReorganizationPlan(
  moves: ProposedMove[],
  onProgress?: (completed: number, total: number) => void,
  sortOptions?: FolderSortOptions
): Promise<{ movedCount: number; foldersSorted: number }> {
  // 1. Take safety snapshot before moving
  await createBookmarkSnapshot();

  const acceptedMoves = moves.filter((m) => m.accepted);
  let count = 0;

  // Cache folder IDs so we don't query chrome.bookmarks redundantly
  const folderIdCache = new Map<string, string>();
  const modifiedFolderIds = new Set<string>();

  for (const move of acceptedMoves) {
    const cacheKey = move.targetPath.join('/');
    let targetFolderId = folderIdCache.get(cacheKey);

    if (!targetFolderId) {
      targetFolderId = await ensureFolderPath(move.targetPath);
      folderIdCache.set(cacheKey, targetFolderId);
    }

    modifiedFolderIds.add(targetFolderId);
    await moveBookmark(move.bookmark.id, targetFolderId);
    count++;
    if (onProgress) {
      onProgress(count, acceptedMoves.length);
    }
  }

  // 2. Post-sort modified destination folders if requested
  let foldersSorted = 0;
  if (sortOptions && modifiedFolderIds.size > 0) {
    for (const folderId of modifiedFolderIds) {
      try {
        await sortFolder(folderId, sortOptions);
        foldersSorted++;
      } catch (err) {
        console.warn(`Failed to sort destination folder ${folderId}:`, err);
      }
    }
  }

  return { movedCount: count, foldersSorted };
}
