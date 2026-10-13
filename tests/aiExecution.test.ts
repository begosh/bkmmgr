import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { batchClassifyWithAI, DEFAULT_AI_SETTINGS, testAIConnection } from '../src/services/aiProvider';
import { generateReorganizationPlan, generateReorganizationPlanAsync } from '../src/services/reorganizer';
import { DEFAULT_TAXONOMY } from '../src/services/taxonomyTemplates';
import { describeAIRun, getQuickSavePreferences, isAIConfigured } from '../src/services/aiRunStatus';
import { AIClassificationRun, AISettings } from '../src/types';

const originalFetch = globalThis.fetch;
const originalChrome = (globalThis as any).chrome;
afterEach(() => {globalThis.fetch = originalFetch; (globalThis as any).chrome = originalChrome;});
const settings: AISettings = {...DEFAULT_AI_SETTINGS, enabled: true, provider: 'ollama'};
const taxonomy = {id: 'test', name: 'Test', description: '', rootFolders: [{name: 'Cooking', description: 'Food'}]};
const bookmark = {id: 'github', title: 'GitHub repository', url: 'https://github.com/example/repo', folderPath: 'Unsorted'};
const itemsFrom = (init?: RequestInit): any[] => JSON.parse(JSON.parse(String(init?.body)).prompt.split('Bookmarks to classify:\n')[1].split('\n\nRules:')[0]);
const answer = (items: any[], category = 'Cooking', subfolder = '') => JSON.stringify(items.map(item => ({id: item.id, category, subfolder, confidence: 0.9, reasoning: 'Test classification'})));
function saveSettings(saved: AISettings) {
  (globalThis as any).chrome = {storage: {local: {
    get: (_keys: any, cb: Function) => cb({edgemark_ai_settings: saved}),
    set: (_values: any, cb?: Function) => cb?.(),
  }}};
}

test('Hybrid reports why confident rule proposals made zero model requests', async () => {
  saveSettings(settings);
  let requests = 0;
  globalThis.fetch = (async () => {requests++; throw new Error('Should not call AI');}) as typeof fetch;
  const plan = await generateReorganizationPlanAsync([bookmark], DEFAULT_TAXONOMY, true);
  assert.equal(requests, 0);
  assert.equal(plan.moves[0].classifiedBy, 'rules');
  assert.equal(plan.aiRun?.status, 'skipped');
  assert.match(describeAIRun(plan.aiRun!), /AI not called.*Hybrid.*AI Primary/);
  const deselected = await generateReorganizationPlanAsync([bookmark]);
  assert.match(deselected.aiRun!.reason!, /not selected/);
  saveSettings({...settings, enabled: false});
  assert.match((await generateReorganizationPlanAsync([bookmark], DEFAULT_TAXONOMY, true)).aiRun!.reason!, /disabled/);
});

test('AI Primary reconsiders already-filed bookmarks and filters moves after the answer', async () => {
  saveSettings({...settings, classificationMode: 'ai-only'});
  const baseline = generateReorganizationPlan([bookmark]).moves[0];
  const filed = {...bookmark, folderPath: baseline.targetPath.join(' / ')};
  assert.equal(generateReorganizationPlan([filed]).moves.length, 0);
  let requests = 0;
  globalThis.fetch = (async (_url, init) => {
    requests++;
    assert.deepEqual(itemsFrom(init).map(item => item.id), ['github']);
    return new Response(JSON.stringify({response: answer(itemsFrom(init), '1. Projects', 'Active Tasks & Sprints')}));
  }) as typeof fetch;
  const changed = await generateReorganizationPlanAsync([filed], DEFAULT_TAXONOMY, true);
  assert.equal(requests, 1);
  assert.equal(changed.moves[0].classifiedBy, 'ollama');
  assert.equal(changed.moves[0].proposedCategory, '1. Projects');
  assert.equal(changed.unmovedCount, 0);
  globalThis.fetch = (async (_url, init) => new Response(JSON.stringify({response: answer(itemsFrom(init), baseline.proposedCategory, baseline.proposedSubfolder)}))) as typeof fetch;
  const confirmed = await generateReorganizationPlanAsync([filed], DEFAULT_TAXONOMY, true);
  assert.equal(confirmed.moves.length, 0);
  assert.equal(confirmed.unmovedCount, 1);
  assert.equal(confirmed.aiRun?.classifiedCount, 1);
  assert.equal(confirmed.aiRun?.requestCount, 1);
});

test('empty AI Primary scope reports the selected mode truthfully', async () => {
  saveSettings({...settings, classificationMode: 'ai-only'});
  globalThis.fetch = (async () => {throw new Error('No provider request expected');}) as typeof fetch;
  const plan = await generateReorganizationPlanAsync([{...bookmark, url: 'about:blank'}], DEFAULT_TAXONOMY, true);
  assert.equal(plan.aiRun?.classificationMode, 'ai-only');
  assert.equal(plan.aiRun?.requestCount, 0);
  assert.match(plan.aiRun!.reason!, /AI Primary found no supported/);
  assert.ok(!plan.aiRun!.reason!.includes('Hybrid'));
});

test('run report measures actual inference, returned model, tokens, and supplied context', async () => {
  const reports: AIClassificationRun[] = [];
  globalThis.fetch = (async (_url, init) => {
    assert.equal(reports.at(-1)?.requestCount, 1);
    assert.equal(reports.at(-1)?.completedRequestCount, 0);
    await new Promise(resolve => setTimeout(resolve, 40));
    return new Response(JSON.stringify({model: 'qwen-actual', prompt_eval_count: 210, eval_count: 42, response: answer(itemsFrom(init))}));
  }) as typeof fetch;
  const results = await batchClassifyWithAI([bookmark], taxonomy, {...settings, pageContextMode: 'metadata'}, {
    github: {url: bookmark.url, title: bookmark.title, domain: 'github.com', description: 'A recipe'},
  }, run => reports.push(run));
  const final = reports.at(-1)!;
  assert.equal(results.github.category, 'Cooking');
  assert.equal(final.status, 'completed');
  assert.equal(final.model, 'qwen-actual');
  assert.equal(final.requestCount, 1);
  assert.equal(final.completedRequestCount, 1);
  assert.equal(final.contextCount, 1);
  assert.equal(final.classifiedCount, 1);
  assert.equal(final.promptTokens, 210);
  assert.equal(final.responseTokens, 42);
  assert.ok(final.elapsedMs >= 35);
  assert.match(describeAIRun(final), /Ollama \(qwen-actual\).*1 request.*42 output tokens/);
  assert.ok(!JSON.stringify(final).includes(bookmark.url));
});

test('empty, malformed, or invalid output is a reported rule fallback', async () => {
  for (const response of ['', 'nonsense', '[]', '[{"id":"github","category":"Unknown"}]']) {
    let report: AIClassificationRun | undefined;
    globalThis.fetch = (async () => new Response(JSON.stringify({response}))) as typeof fetch;
    assert.deepEqual(await batchClassifyWithAI([bookmark], taxonomy, settings, {}, r => {report = r;}), {});
    assert.equal(report?.requestCount, 1);
    assert.equal(report?.status, 'partial');
    assert.match(report!.reason!, /Missing or invalid.*rules/);
  }
});

test('HTTP and network errors remain visible and never expose raw errors', async () => {
  for (const provider of ['ollama', 'gemini-api', 'google-oauth'] as const) {
    let report: AIClassificationRun | undefined;
    globalThis.fetch = (async () => new Response('secret-error-body', {status: 503})) as typeof fetch;
    assert.deepEqual(await batchClassifyWithAI([bookmark], taxonomy, {...settings, provider}, {}, r => {report = r;}), {});
    assert.equal(report?.status, 'failed');
    assert.equal(report?.completedRequestCount, 0);
    assert.match(report!.reason!, /HTTP 503.*rules/);
    assert.ok(!report!.reason!.includes('secret-error-body'));
  }
  let report: AIClassificationRun | undefined;
  globalThis.fetch = (async () => {throw new Error('private-credential');}) as typeof fetch;
  await batchClassifyWithAI([bookmark], taxonomy, settings, {}, r => {report = r;});
  assert.match(report!.reason!, /Check the connection/);
  assert.ok(!JSON.stringify(report).includes('private-credential'));
});

test('Ollama 403 explains browser access and preserves rules without exposing the response', async () => {
  const privateBody = 'private error token=do-not-display';
  globalThis.fetch = (async () => new Response(privateBody, {status: 403})) as typeof fetch;
  saveSettings({...settings, classificationMode: 'ai-only'});
  const plan = await generateReorganizationPlanAsync([bookmark], DEFAULT_TAXONOMY, true);
  assert.equal(plan.moves[0].classifiedBy, 'rules');
  assert.equal(plan.aiRun?.requestCount, 1);
  assert.equal(plan.aiRun?.completedRequestCount, 0);
  assert.equal(plan.aiRun?.classifiedCount, 0);
  assert.equal(plan.aiRun?.status, 'failed');
  assert.match(plan.aiRun!.reason!, /HTTP 403.*OLLAMA_ORIGINS.*restart.*used rules/);
  assert.ok(!JSON.stringify(plan.aiRun).includes(privateBody));
  const connection = await testAIConnection(settings);
  assert.equal(connection.success, false);
  assert.match(connection.message, /OLLAMA_ORIGINS/);
  let cloudReport: AIClassificationRun | undefined;
  await batchClassifyWithAI([bookmark], taxonomy, {...settings, provider: 'gemini-api'}, {}, r=>{cloudReport=r;});
  assert.match(cloudReport!.reason!, /HTTP 403/);
  assert.ok(!cloudReport!.reason!.includes('OLLAMA_ORIGINS'));
});

test('a later failed batch preserves earlier AI classifications and reports unfinished work', async () => {
  const items = Array.from({length: 9}, (_, i) => ({...bookmark, id: String(i)}));
  let requests = 0;
  let report: AIClassificationRun | undefined;
  globalThis.fetch = (async (_url, init) => {
    if (++requests === 2) return new Response('', {status: 503});
    return new Response(JSON.stringify({response: answer(itemsFrom(init))}));
  }) as typeof fetch;
  const result = await batchClassifyWithAI(items, taxonomy, {...settings, pageContextMode: 'metadata'}, {}, r => {report = r;});
  assert.equal(Object.keys(result).length, 4);
  assert.equal(report?.status, 'partial');
  assert.equal(report?.requestCount, 2);
  assert.equal(report?.completedRequestCount, 1);
  assert.equal(report?.sentCount, 8);
  assert.equal(report?.candidateCount, 9);
});

test('validation continues after malformed items and rejects invented subfolders and invalid shapes', async () => {
  const taxonomyWithChildren = {...taxonomy, rootFolders: [{name: 'Cooking', description: '', subfolders: ['Recipes']}]};
  const items = Array.from({length: 5}, (_, i) => ({...bookmark, id: String(i)}));
  globalThis.fetch = (async () => new Response(JSON.stringify({response: JSON.stringify([
    null,
    {id: '0', category: 123},
    {id: '1', category: 'Cooking', subfolder: 'Invented folder'},
    {id: '2', category: 'Cooking', subfolder: 'Recipes', reasoning: {nested: 'unsafe'}},
    {id: '3', category: 'Cooking', subfolder: 'Recipes', confidence: 'high'},
    {id: '4', category: 'Cooking', subfolder: 'Recipes', confidence: .9, reasoning: 'Valid recipe'},
  ])}))) as typeof fetch;
  let report: AIClassificationRun | undefined;
  const result = await batchClassifyWithAI(items, taxonomyWithChildren, settings, {}, r=>{report=r;});
  assert.deepEqual(Object.keys(result), ['4']);
  assert.equal(report?.classifiedCount, 1);
  assert.equal(report?.status, 'partial');
});

test('inference requests have a deadline and a timeout is reported as a fallback', async () => {
  let report: AIClassificationRun | undefined;
  globalThis.fetch = (async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    throw new DOMException('Sensitive endpoint details', 'TimeoutError');
  }) as typeof fetch;
  await batchClassifyWithAI([bookmark], taxonomy, settings, {}, r=>{report=r;});
  assert.equal(report?.status, 'failed');
  assert.match(report!.reason!, /timed out after 120 seconds.*rules/);
  assert.ok(!report!.reason!.includes('Sensitive'));
});

test('privacy exclusions report zero requests and protected bookmarks retain rules', async () => {
  let report: AIClassificationRun | undefined;
  globalThis.fetch = (async () => {throw new Error('Should never contact provider');}) as typeof fetch;
  await batchClassifyWithAI([{...bookmark, url: 'http://router.local/'}], taxonomy, {...settings, provider: 'gemini-api'}, {}, r => {report = r;});
  assert.equal(report?.status, 'skipped');
  assert.equal(report?.requestCount, 0);
  assert.match(describeAIRun(report!), /AI not called.*privacy/);
});

test('saved quick-save preferences are awaited and default to configured AI', async () => {
  let callback: Function | undefined;
  (globalThis as any).chrome = {storage: {local: {get: (_keys: any, cb: Function) => {callback = cb;}}}};
  let loaded = false;
  const pending = getQuickSavePreferences(settings).then(result => {loaded = true; return result;});
  await Promise.resolve();
  assert.equal(loaded, false);
  callback!({edgemark_use_ai_in_popup: true, edgemark_autosort_on_save: false});
  assert.deepEqual(await pending, {useAI: true, autoSort: false});
  const defaults = getQuickSavePreferences(settings);
  callback!({});
  assert.equal((await defaults).useAI, true);
  assert.equal(isAIConfigured({...settings, provider: 'disabled', geminiApiKey: 'old-key'}), false);
  assert.equal(isAIConfigured({...settings, provider: 'gemini-api', googleAccessToken: 'unrelated-token'}), false);
});

test('Ollama connection test runs inference even with master disabled and rejects empty output', async () => {
  globalThis.fetch = (async (url, init) => {
    assert.equal(url, 'http://localhost:11434/api/generate');
    assert.equal(JSON.parse(String(init?.body)).model, settings.ollamaModel);
    return new Response(JSON.stringify({response: answer(itemsFrom(init)), eval_count: 30}));
  }) as typeof fetch;
  const success = await testAIConnection({...settings, enabled: false});
  assert.equal(success.success, true);
  assert.match(success.message, /1 request.*1\/1 classified.*Cooking/);
  globalThis.fetch = (async () => new Response(JSON.stringify({response: ''}))) as typeof fetch;
  assert.equal((await testAIConnection(settings)).success, false);
});
