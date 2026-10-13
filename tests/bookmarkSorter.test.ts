import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

type Node = { id: string; title: string; url?: string; children?: Node[]; dateAdded?: number };
let tree: Node[];
let events: string[];
let removalFails = false;
let snapshotFails = false;
let savedSnapshot: unknown;
let moveFailureId: string | undefined;

function find(id: string, nodes = tree): Node | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = find(id, node.children || []);
    if (child) return child;
  }
}

const runtime: { lastError?: { message: string } } = {};
(globalThis as any).chrome = {
  runtime,
  storage: { local: { set: async (data: any) => {
    events.push('snapshot');
    if (snapshotFails) throw new Error('Storage unavailable');
    savedSnapshot = data.lastBookmarkSnapshot;
  } } },
  bookmarks: {
    getTree: (callback: (result: Node[]) => void) => callback(structuredClone(tree)),
    getChildren: (id: string, callback: (result: Node[]) => void) => callback(structuredClone(find(id)?.children || [])),
    create: () => { throw new Error('Sorting must never create bookmarks'); },
    remove: (id: string, callback: () => void) => {
      events.push(`remove:${id}`);
      if (removalFails) runtime.lastError = { message: 'Managed bookmark cannot be removed' };
      else {
        const parent = tree.flatMap(function flatten(node): Node[] { return [node, ...(node.children || []).flatMap(flatten)]; })
          .find((node) => node.children?.some((child) => child.id === id));
        assert.ok(parent);
        parent.children = parent.children!.filter((child) => child.id !== id);
      }
      callback();
      delete runtime.lastError;
    },
    move: (id: string, destination: { parentId: string; index: number }, callback: () => void) => {
      events.push(`move:${id}`);
      if (id === moveFailureId) {
        runtime.lastError = { message: 'Managed bookmark cannot be moved' };
        callback();
        delete runtime.lastError;
        return;
      }
      const parent = find(destination.parentId)!;
      const source = tree.flatMap(function flatten(node): Node[] { return [node, ...(node.children || []).flatMap(flatten)]; })
        .find((node) => node.children?.some((child) => child.id === id))!;
      const index = source.children!.findIndex((child) => child.id === id);
      assert.ok(index >= 0);
      const [node] = source.children!.splice(index, 1);
      parent.children!.splice(destination.index ?? parent.children!.length, 0, node);
      callback();
    },
  },
};

const { isLegacyDividerBookmark, previewFolderSort, sortFolder, sortAllFolders, sortBookmarkList } =
  await import('../src/services/bookmarkSorter');
const marker = (id: string, title = '─── Azure ───'): Node => ({ id, title, url: 'about:blank#separator' });
const link = (id: string, title: string, url = `https://example.com/${id}`): Node => ({ id, title, url });

beforeEach(() => {
  tree = [{ id: '0', title: '', children: [{ id: '1', title: 'Favorites bar', children: [] }] }];
  events = [];
  removalFails = false;
  snapshotFails = false;
  savedSnapshot = undefined;
  moveFailureId = undefined;
});

test('legacy cleanup requires both the exact marker URL and a generated title', () => {
  assert.ok(isLegacyDividerBookmark(marker('m')));
  assert.ok(isLegacyDividerBookmark(marker('m', '────────────────────')));
  for (const node of [
    { title: '─── Azure ───' },
    { title: '────────────────────' },
    link('b', '─── Azure ───'),
    link('b', '---Notes'),
    link('b', '────────────────────'),
    link('b', '─── Azure ───', 'about:blank'),
    link('b', '─── Azure ───', 'about:blank#separator-notes'),
    marker('b', 'My blank page'),
  ]) assert.equal(isLegacyDividerBookmark(node), false);
});

test('preview and sorting remove markers, preserve real bookmarks/folders, and never create entries', async () => {
  const folder: Node = { id: 'f', title: '─── GitHub ───', children: [] };
  const bookmarks = [link('b', 'Zulu'), link('a', '─── Real bookmark ───'), marker('user', 'My blank page')];
  find('1')!.children = [marker('m1'), ...bookmarks, marker('m2', '────────────────────'), folder];
  const preview = await previewFolderSort('1', 'Favorites bar', 'Favorites bar', { criteria: 'alpha-asc' });
  assert.equal(preview.itemCount, 3);
  assert.equal(preview.dividersToRemove, 2);
  assert.deepEqual(new Set(preview.items.map((item) => item.id)), new Set(bookmarks.map((item) => item.id)));
  assert.deepEqual(events, []);
  const result = await sortFolder('1', { criteria: 'alpha-asc' });
  assert.deepEqual(result, { modifiedCount: 3, dividersRemoved: 2 });
  assert.equal(events[0], 'snapshot');
  assert.deepEqual(find('1')!.children!.map((node) => node.id), ['f', ...preview.items.map((item) => item.id)]);
  assert.equal((savedSnapshot as any).data[0].children[0].children.length, 6);
  const second = await sortFolder('1', { criteria: 'alpha-asc' });
  assert.equal(second.dividersRemoved, 0);
  assert.equal(events.filter((event) => event.startsWith('remove')).length, 2);
});

test('bulk cleanup includes marker-only and single-bookmark folders with one pre-change backup', async () => {
  find('1')!.children = [
    { id: 'empty', title: 'Only markers', children: [marker('m1')] },
    { id: 'single', title: 'One bookmark', children: [link('b', 'Real'), marker('m2')] },
  ];
  const result = await sortAllFolders({ criteria: 'domain-alpha' });
  assert.equal(result.dividersRemoved, 2);
  assert.equal(result.foldersSorted, 2);
  assert.equal(result.bookmarksSorted, 1);
  assert.equal(events.filter((event) => event === 'snapshot').length, 1);
  assert.deepEqual(find('empty')!.children, []);
  assert.deepEqual(find('single')!.children!.map((node) => node.id), ['b']);
});

test('bookmarks can precede subfolders and every title/date order remains supported', async () => {
  const items = [
    { ...link('b', 'Beta'), dateAdded: 100 },
    { ...link('a', 'Alpha'), dateAdded: 200 },
  ];
  for (const [criteria, ids] of [
    ['alpha-asc', ['a', 'b']], ['alpha-desc', ['b', 'a']],
    ['date-desc', ['a', 'b']], ['date-asc', ['b', 'a']],
  ] as const) assert.deepEqual(sortBookmarkList(items, { criteria }).map((node) => node.id), ids);
  find('1')!.children = [{ id: 'f', title: 'Folder', children: [] }, ...items];
  await sortFolder('1', { criteria: 'alpha-asc', sortSubfoldersFirst: false });
  assert.deepEqual(find('1')!.children!.map((node) => node.id), ['a', 'b', 'f']);
});

test('backup failures prevent any deletion and rejected removals fail sorting', async () => {
  find('1')!.children = [marker('m')];
  snapshotFails = true;
  await assert.rejects(sortFolder('1'), /Storage unavailable/);
  assert.deepEqual(events, ['snapshot']);
  snapshotFails = false;
  removalFails = true;
  await assert.rejects(sortFolder('1'), /Managed bookmark/);
  assert.equal(find('1')!.children!.length, 1);
  assert.equal(events.some((event) => event.startsWith('move:')), false);
});

test('bulk sorting reports a folder that rejects placeholder deletion', async () => {
  find('1')!.children = [marker('m')];
  removalFails = true;
  const result = await sortAllFolders({ criteria: 'domain-alpha' });
  assert.equal(result.failedFolders, 1);
  assert.equal(result.foldersSorted, 0);
  assert.equal(result.dividersRemoved, 0);
  assert.equal(find('1')!.children!.length, 1);
});

test('post-reorganization sorting preserves the pre-migration backup', async () => {
  savedSnapshot = { timestamp: 1, data: [] };
  find('1')!.children = [marker('m'), link('b', 'Real')];
  await sortFolder('1', { criteria: 'domain-alpha' }, true);
  assert.deepEqual(savedSnapshot, { timestamp: 1, data: [] });
  assert.equal(events.includes('snapshot'), false);
});

test('bulk sorting continues after a move fails and reports completed cleanup separately', async () => {
  find('1')!.children = [
    { id: 'failed', title: 'Failed folder', children: [marker('m1'), link('blocked', 'Real')] },
    { id: 'ok', title: 'Other folder', children: [marker('m2'), link('b', 'Other')] },
  ];
  moveFailureId = 'blocked';
  const result = await sortAllFolders({ criteria: 'domain-alpha' });
  assert.equal(result.failedFolders, 1);
  assert.equal(result.foldersSorted, 1);
  assert.equal(result.dividersRemoved, 1);
  assert.deepEqual(find('failed')!.children!.map((node) => node.id), ['blocked']);
  assert.deepEqual(find('ok')!.children!.map((node) => node.id), ['b']);
});

test('reorganization snapshots before moving and keeps that snapshot through destination sorting', async () => {
  const { executeReorganizationPlan } = await import('../src/services/reorganizer');
  find('1')!.children = [
    { id: 'source', title: 'Source', children: [link('b', 'Real')] },
    { id: 'target', title: 'Target', children: [marker('m')] },
  ];
  const originalTree = structuredClone(tree);
  const result = await executeReorganizationPlan([{
    bookmark: { ...link('b', 'Real'), url: 'https://example.com/b' },
    currentFolder: 'Source', proposedCategory: 'Target', proposedSubfolder: '',
    targetPath: ['Target'], confidence: 1, reasoning: 'Test', accepted: true,
  }], undefined, { criteria: 'domain-alpha' });
  assert.deepEqual(result, { movedCount: 1, foldersSorted: 1 });
  assert.equal(events[0], 'snapshot');
  assert.equal(events.filter((event) => event === 'snapshot').length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify((savedSnapshot as any).data)), originalTree);
  assert.deepEqual(find('source')!.children, []);
  assert.deepEqual(find('target')!.children!.map((node) => node.id), ['b']);
});
