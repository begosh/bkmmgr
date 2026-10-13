import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {applyToolbarBehavior, getToolbarOpensSidebar, setToolbarOpensSidebar} from '../src/services/sidePanelPreferences';
const previous=(globalThis as any).chrome;
afterEach(()=>{(globalThis as any).chrome=previous;});
test('toolbar sidebar preference changes action popup and survives reload without claiming a native pin',async()=>{
  let saved:any={};const popups:string[]=[];
  (globalThis as any).chrome={sidePanel:{open:async()=>{}},action:{setPopup:async(value:any)=>popups.push(value.popup),setTitle:async()=>{}},storage:{local:{get:(_keys:any,cb:Function)=>cb(saved),set:async(value:any)=>{saved={...saved,...value};}}}};
  assert.equal(await getToolbarOpensSidebar(),false);
  await setToolbarOpensSidebar(true);
  assert.equal(await getToolbarOpensSidebar(),true);
  await applyToolbarBehavior(await getToolbarOpensSidebar());
  assert.deepEqual(popups,['','']);
  await setToolbarOpensSidebar(false);
  assert.equal(popups.at(-1),'src/popup/index.html');
  assert.equal(await getToolbarOpensSidebar(),false);
});
test('unsupported sidebar or rejected browser action does not save a false success',async()=>{
  let writes=0;
  (globalThis as any).chrome={action:{setPopup:async()=>{}},storage:{local:{set:async()=>{writes++;}}}};
  await assert.rejects(setToolbarOpensSidebar(true),/does not support/);
  assert.equal(writes,0);
  (globalThis as any).chrome.sidePanel={open:async()=>{}};
  (globalThis as any).chrome.action.setPopup=async()=>{throw new Error('Browser rejected');};
  await assert.rejects(setToolbarOpensSidebar(true),/Browser rejected/);
  assert.equal(writes,0);
});
