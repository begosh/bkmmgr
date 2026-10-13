import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
const previous=(globalThis as any).chrome;
let updateError=false,createError=false;
const changes:any[]=[];
(globalThis as any).chrome={runtime:{},bookmarks:{
  update:(id:string,fields:any,cb:Function)=>{changes.push({id,fields});(globalThis as any).chrome.runtime.lastError=updateError?{message:'Managed bookmark'}:undefined;cb({});(globalThis as any).chrome.runtime.lastError=undefined;},
  create:(_fields:any,cb:Function)=>{(globalThis as any).chrome.runtime.lastError=createError?{message:'No permission'}:undefined;cb(createError?undefined:{id:'folder-7',title:'Test'});(globalThis as any).chrome.runtime.lastError=undefined;},
}};
const {updateBookmark,createFolder,createBookmark}=await import('../src/services/bookmarkManager');
afterEach(()=>{updateError=false;createError=false;});
test('combined bookmark edits apply both fields and propagate rejected edits',async()=>{
  await updateBookmark('b',{title:'Updated',url:'https://example.com/new'});
  assert.deepEqual(changes.at(-1),{id:'b',fields:{title:'Updated',url:'https://example.com/new'}});
  updateError=true;await assert.rejects(updateBookmark('b',{title:'Rejected',url:'https://example.com/'}),/Managed bookmark/);
});
test('folder creation and page saving reject browser failures instead of reporting success',async()=>{
  assert.equal(await createFolder('Folder','1'),'folder-7');
  createError=true;await assert.rejects(createFolder('Folder','1'),/No permission/);
  await assert.rejects(createBookmark('Page','https://example.com/','1'),/No permission/);
});
test('saved safety backup export preserves the snapshot rather than replacing it',async()=>{
  const originalDocument=(globalThis as any).document;
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
  let blob:Blob|undefined;let writes=0;
  (globalThis as any).chrome.storage={local:{get:(_keys:any,cb:Function)=>cb({lastBookmarkSnapshot:{data:[{id:'0',title:'',children:[{id:'1',title:'Bookmarks bar',children:[{id:'b',title:'Deleted bookmark',url:'https://example.com/'}]}]}]}}),set:()=>{writes++;}}};
  (globalThis as any).document={createElement:()=>({click:()=>{}})};
  URL.createObjectURL=(value:any)=>{blob=value;return 'blob:test';};URL.revokeObjectURL=()=>{};
  try{
    const {downloadSavedSnapshot}=await import('../src/services/backupService');
    await downloadSavedSnapshot();assert.match(await blob!.text(),/Deleted bookmark/);assert.equal(writes,0);
  }finally{(globalThis as any).document=originalDocument;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;(globalThis as any).chrome=previous;}
});
