import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {collectHitFeedback,skillHitFeedback,HIT_PROFILES} from '../js/xianxia/TowerHitFeedback.js'
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
class Graphics{
 calls=[]
 moveTo(...p){this.calls.push(p)}lineTo(...p){this.calls.push(p)}stroke(){this.calls.push([this.lineWidth,this.strokeColor.a])}close(){}fill(){this.calls.push([this.fillColor.a])}
}
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerHitArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const Art=runInNewContext(`${source};TowerHitArt`,{Color,Graphics,collectHitFeedback,skillHitFeedback})
test('all skill styles draw finite foreground strokes only for settled hits and clear on exit',()=>{
 const art=new Art(),state={time:1.02,player:{hp:100},effects:[]}
 for(const skill of Object.keys(HIT_PROFILES)){
  state.effects=[{id:skill,kind:'hit',source:skill,targetId:'enemy',x:100,y:30,damage:4,startedAt:1,
   impact:{skill,dirX:0,dirY:1,pulseIndex:1,pulseCount:1}}]
  const before=JSON.stringify(state),g=new Graphics();art.sample(state);art.draw(g,{x:0,y:0})
  assert.equal(art.poses.length,1);assert.equal(art.covered.size,1);assert.equal(art.bodies.size,1)
  assert.ok(g.calls.length>5);assert.ok(g.calls.flat().every(Number.isFinite))
  assert.equal(JSON.stringify(state),before)
  const again=new Graphics();art.sample(state);art.draw(again,{x:0,y:0});assert.deepEqual(again.calls,g.calls)
 }
 state.player.hp=0;art.sample(state);assert.equal(art.poses.length,0);assert.equal(art.covered.size,0);assert.equal(art.bodies.size,0)
})
test('grouped and off-window hits remain covered so generic sparks cannot double the burst',()=>{
 const art=new Art(),hit={kind:'hit',targetId:'enemy',x:0,y:0,damage:4,startedAt:1,impact:{skill:'sj_cross',dirX:1,dirY:0,pulseIndex:1,pulseCount:1}}
 art.sample({time:1.2,player:{hp:100},effects:[{...hit,id:'a'},{...hit,id:'b'}]})
 assert.equal(art.poses.length,0);assert.equal(art.covered.size,2)
 art.reset();assert.equal(art.covered.size,0)
})
