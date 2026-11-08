import test from 'node:test'
import assert from 'node:assert/strict'
import {PlayerDamageFeedback} from '../js/xianxia/TowerPlayerDamageFeedback.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerRun} from '../js/xianxia/TowerRun.js'
const hit=(id,at,damage=12,extra={})=>({id,kind:'player_hit',startedAt:at,expiresAt:at+.25,damage,hpLoss:damage,maxHp:100,...extra})
const state=()=>({time:1,player:{hp:100,maxHp:100},effects:[]})
test('immediate receipt, deduplication, pause and expiration use simulation time',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1)]
 assert.equal(f.update(s)[0].damage,12)
 for(let i=0;i<20;i++)assert.equal(f.update(s)[0].damage,12)
 s.time=1.3;s.effects=[];assert.equal(f.update(s).length,1)
 s.time=2;assert.equal(f.update(s).length,0)
})
test('rapid small hits merge, heavy hit stays distinct and at most three rows survive',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1,3)];f.update(s)
 s.time=1.1;s.effects.push(hit('b',1.1,4));assert.equal(f.update(s)[0].damage,7)
 s.time=1.12;s.effects.push(hit('c',1.12,10));assert.equal(f.update(s).length,2)
 assert.equal(f.update(s)[1].heavy,true)
 s.time=1.3;s.effects.push(hit('d',1.3,20),hit('e',1.3,30));assert.equal(f.update(s).length,3)
})
test('absorbed and status receipts never produce minus zero; death retains last hit',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1,0,{absorbed:20})]
 assert.equal(f.update(s)[0].text,'吸收 20')
 s.effects.push(hit('b',1,0,{outcome:'dodge'}),hit('c',1,0,{outcome:'immune'}))
 assert.deepEqual(f.update(s).map(r=>r.text),['吸收 20','闪避','免疫'])
 s.player.hp=0;s.time=1.1;s.effects.push(hit('d',1.1,7,{absorbed:3}));assert.equal(f.update(s).at(-1).text,'−7 · 吸收 3')
})
test('turning numbers off clears them without replay; heavy feedback remains independent',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1)]
 assert.equal(f.update(s,false).length,0);assert.ok(f.heavyPulse(s)>0)
 assert.equal(f.update(s,true).length,0)
 s.time=1.05;s.effects.push(hit('b',1.05,2));assert.equal(f.update(s)[0].damage,2)
 const other=state();assert.equal(f.update(other).length,0)
 s.time=.5;s.effects=[];assert.equal(f.update(s).length,0)
})
test('real lethal settlement records hp actually lost and max hp for presentation',()=>{
 const r=new TowerRun({attemptId:91,floor:1,seed:4,xp:cultivationLevelXp(6),hp:7,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
 r.state.player.hp=7
 r._projectile(r.state.player.x,r.state.player.y,0,0,10,10000,true)
 r.advance(1/60)
 const e=r.state.effects.find(e=>e.kind==='player_hit')
 assert.ok(e);assert.equal(e.hpLoss,7);assert.equal(e.maxHp,r.state.player.maxHp)
 assert.equal(r.state.phase,'lost')
})
test('single-hit severity does not become heavy when several small hits merge',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1,6),hit('b',1.1,6)];s.time=1.1
 const before=structuredClone(s),rows=f.update(s)
 assert.equal(rows.length,1);assert.equal(rows[0].damage,12);assert.equal(rows[0].heavy,false)
 assert.equal(f.heavyPulse(s),0);assert.deepEqual(s,before)
})
test('rewinding the same run clears future rows and accepts receipts again',()=>{
 const f=new PlayerDamageFeedback(),s=state();s.effects=[hit('a',1)];f.update(s)
 s.time=.5;s.effects=[];assert.equal(f.update(s).length,0)
 s.time=1;s.effects=[hit('a',1)];assert.equal(f.update(s)[0].damage,12)
})
