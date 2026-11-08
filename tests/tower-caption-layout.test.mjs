import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
function layout(...args){
 const file=new URL('../cocos-pilot/assets/scripts/TowerCaptionLayout.ts',import.meta.url);
 assert.ok(existsSync(file),'mechanic captions need shared collision placement');
 const source=stripTypeScriptTypes(readFileSync(file,'utf8'),{mode:'transform'}).replace(/^export /gm,'');
 return runInNewContext(source+';layoutTowerCaptions')(...args);
}
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.bottom<b.top&&a.top>b.bottom;
const request=(id,x,y,priority=0)=>({id,x,y,width:100,top:16,bottom:-24,priority});
test('dense summon names and health bars avoid crystals, fragments, each other and viewport edges',()=>{
 const reqs=Array.from({length:6},(_,i)=>request(String(i),i%2*20,20, i<2?20:0));
 const objects=[{left:-40,right:40,bottom:-10,top:85},{left:50,right:105,bottom:-20,top:60}];
 const original=JSON.stringify([reqs,objects]);
 const result=layout(reqs,objects,{width:844,height:390});
 assert.equal(result.length,6);assert.equal(JSON.stringify([reqs,objects]),original);
 for(let i=0;i<result.length;i++){
  assert.ok(result[i].box.left>=-422&&result[i].box.right<=422);
  assert.ok(result[i].box.bottom>=-125&&result[i].box.top<=171);
  assert.ok(objects.every(b=>!intersects(result[i].box,b)));
  for(let j=0;j<i;j++)assert.ok(!intersects(result[i].box,result[j].box),'label and bar blocks must not overlap');
 }
 assert.equal(JSON.stringify(layout(reqs,objects,{width:844,height:390})),JSON.stringify(result),'pause is deterministic');
});
test('objective labels win their desired positions and pinned safe-zone names do not wander',()=>{
 const reqs=[request('summon',0,0),request('crystal',0,0,20),{...request('safe',200,0,100),pinned:true}];
 const placed=layout(reqs,[],{width:1280,height:720}),crystal=placed.find(p=>p.request.id==='crystal'),safe=placed.find(p=>p.request.id==='safe');
 assert.equal(crystal.x,0);assert.equal(crystal.y,0);assert.equal(safe.x,200);assert.equal(safe.y,0);
 assert.ok(!intersects(placed[0].box,placed[1].box));
});
test('edge clamping accounts for the entire attached bar and wide status text',()=>{
 const r=layout([{...request('status',600,-300),width:300}],[],{width:844,height:390})[0];
 assert.ok(r.box.right<=422);assert.ok(r.box.bottom>=-125);assert.ok(r.box.top<=171);
});
