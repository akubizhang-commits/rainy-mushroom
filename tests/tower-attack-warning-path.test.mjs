import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerAttackWarningPath.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/^export /gm,'');
const draw=runInNewContext(source+';ordinarySectorPath');
test('ordinary warning follows the damaging sector in every heading, including sectors over 180 degrees',()=>{
 for(const degrees of [100,140,170,190])for(const dir of [0,Math.PI,Math.PI/2,-Math.PI/2]){
  const vertices=[];let closed=false;
  draw({moveTo:(x,y)=>vertices.push([x,y]),lineTo:(x,y)=>vertices.push([x,y]),close:()=>closed=true},20,30,140,dir,degrees*Math.PI/360);
  assert.deepEqual(vertices.shift(),[20,30]);assert.ok(closed);
  for(const [x,y]of vertices){
   assert.ok(Math.abs(Math.hypot(x-20,y-30)-140)<1e-8);
   const delta=Math.atan2(Math.sin(Math.atan2(y-30,x-20)-dir),Math.cos(Math.atan2(y-30,x-20)-dir));
   assert.ok(Math.abs(delta)<=degrees*Math.PI/360+1e-8);
  }
  const dot=vertices.reduce((v,[x,y])=>v+(x-20)*Math.cos(dir)+(y-30)*Math.sin(dir),0);
  assert.ok(dot>0,'arc must occupy the facing side, not its complement');
 }
});
