import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
test('web boot art remains until native loading artwork or its error UI is ready',()=>{
 let removed=0;const callbacks=[];
 const context={_decorator:{},Component:class{},sys:{isBrowser:true},Director:{EVENT_AFTER_DRAW:'after-draw'},director:{once:(event,callback)=>callbacks.push(callback)},document:{getElementById:()=>({remove:()=>removed++})}};
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/PinePilot.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^@ccclass.*$/gm,'');
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'}).replace(/^export /gm,'')+'\nglobalThis.Host=PinePilot',context);
 const host=new context.Host();host.assetLoading={presentationReady:false,blocked:true};
 host.revealCanvas();assert.equal(removed,0);assert.equal(callbacks.length,1);
 host.assetLoading.presentationReady=true;callbacks.shift()();assert.equal(removed,1);
});
