import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {equipmentDamageMultiplier} from '../js/xianxia/TowerEquipment.js'

function make(passive={}){
 return new TowerRun({attemptId:1,floor:1,seed:101,hp:100,xp:0,loadout:{
  active:{sj_yujian:1},passive,evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
}
function shot(r,damage=10,type='physical'){
 const p=r.state.player
 r.state.projectiles.push({id:`probe-${r.state.ticks}-${damage}`,x:p.x,y:p.y,vx:0,vy:0,
  radius:10,damage,damageType:type,hostile:true,source:'fixture',hitIds:[],expiresAt:r.state.time+1})
}
for(const type of ['physical','magic','hybrid'])test(`survival pressure doubles incoming ${type} once before defense`,()=>{
 const r=make()
 shot(r,10,type);r.advance(1/60)
 assert.ok(Math.abs(r.state.player.hp-(100-20*equipmentDamageMultiplier(r.state.loadout,type)))<1e-8)
})
test('hostile zones share the same pressure and simultaneous hits still choose the strongest',()=>{
 const r=make(),p=r.state.player
 r.state.zones.push({id:'hostile-test',x:p.x,y:p.y,radius:80,hostile:true,damage:12,
  ticks:1,nextAt:0,interval:1,expiresAt:2})
 shot(r,10);r.advance(1/60)
 assert.equal(r.state.player.hp,76)
 shot(r,10);r.advance(1/60)
 assert.equal(r.state.player.hp,76,'hurt invulnerability still applies')
})
test('stronger incoming damage remains lethal before same-tick healing',()=>{
 const r=make();r.state.player.hp=15
 shot(r,10)
 r.state.drops.push({id:'healing-probe',kind:'heal',...r.state.player,radius:9,amount:100,expiresAt:2})
 r.advance(1/60)
 assert.equal(r.state.phase,'lost');assert.equal(r.state.player.hp,0)
})
