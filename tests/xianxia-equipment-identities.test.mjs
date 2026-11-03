import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createFixedWeapon,weaponSummary,WEAPONS} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,equipmentSummary,EQUIPMENT} from '../js/xianxia/TowerEquipment.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import {regenerationFraction,outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {newArmorState,resolveArmorHit,tickArmorEffects,validArmorEffectState} from '../js/xianxia/TowerArmorEffects.js'
import {steerMechanics} from '../scripts/verify-monster-mechanics-balance.mjs'
const value=(item,type)=>item.affixes.find(a=>a.type===type)?.value??0
const gear=(id)=>createFixedEquipment(id,id)
const weapon=id=>createFixedWeapon(id,id)
const fixture=()=>structuredClone(JSON.parse(fs.readFileSync('reports/flow-equal-budget-2026-11-02/controlled.json')).fixtures[0])
function make(armorId='eq_armor_wugou',ringId='eq_ring_dingwei'){
 const f=fixture(),l=f.loadout;l.weapon=weapon('eq_sword_taiheng');l.armor=gear(armorId);l.ring=gear(ringId)
 for(const k of ['weapon','armor','ring'])l[k+'Id']=l[k].id
 l.weaponQuality=4;l.weaponRefine=0
 return new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,l).maxHp,loadout:l,arenaVersion:1})
}
test('all ring qualities maintain burst versus cadence and only two identities gain specials',()=>{
 for(const tier of ['fa','bao','ling'])for(let q=1;q<=4;q++){
  const a=gear(EQUIPMENT.find(d=>d.category==='ring'&&d.tier===tier&&d.quality===q&&d.role===(q===4?'graduate':'burst')).id)
  const b=gear(EQUIPMENT.find(d=>d.category==='ring'&&d.tier===tier&&d.quality===q&&d.role===(q===4?'master':'cadence')).id)
  assert.ok(value(a,'critChance')>value(b,'critChance'));assert.ok(value(a,'critBonus')>value(b,'critBonus'));assert.equal(value(a,'cooldownReduction'),0);assert.ok(value(b,'cooldownReduction')>0)
 }
 assert.equal(EQUIPMENT.filter(d=>d.category==='ring'&&d.quality&&equipmentSummary(gear(d.id)).specialLines.length>0).length,2)
})
test('supreme sword roles are distinct and Taiheng preserves universal skill-level identity',()=>{
 const a=weapon('eq_sword_chengming'),b=weapon('eq_sword_kunwu');assert.equal(a.affixes.find(a=>a.type==='flow').target,'qi');assert.equal(b.affixes.find(a=>a.type==='flow').target,'formation')
 const t=weapon('eq_sword_taiheng');assert.ok(value(t,'physical')>=20&&value(t,'physical')<=42);assert.equal(value(t,'skillLevel'),1)
 const base=equipmentBaseAttributes(WEAPONS.find(d=>d.id==='eq_sword_taiheng'));assert.equal(base.physicalAttack,base.magicAttack);assert.ok(base.physicalAttack>=468);assert.equal(base.vitality,undefined)
})
test('shield never rescues lethal trigger damage, absorbs subsequent hits, expires and has a cooldown',()=>{
 const r=make(),s=r.state,p=s.player;p.hp=p.maxHp*.31;s.time=1
 const first=resolveArmorHit(s,p.maxHp*.02);assert.ok(first.shieldTriggered);assert.equal(first.absorbed,0);assert.equal(s.armorState.shield,p.maxHp*value(s.loadout.armor,'lowHealthShield')/100)
 s.time=2;const next=resolveArmorHit(s,p.maxHp*.05);assert.equal(next.damage,0);assert.ok(validArmorEffectState(s));assert.equal(next.shieldTriggered,false)
 s.time=7;tickArmorEffects(s);assert.equal(s.armorState.shield,0)
 s.time=8;assert.equal(resolveArmorHit(s,1).shieldTriggered,false)
 s.time=21;assert.equal(resolveArmorHit(s,1).shieldTriggered,true)
 s.time=22;resolveArmorHit(s,p.maxHp*2);assert.equal(p.hp,0);assert.equal(s.armorState.shield,0)
 const t=make().state;t.player.hp=10;assert.equal(resolveArmorHit(t,11).shieldTriggered,false);assert.equal(t.player.hp,0)
})
test('safe recovery waits four simulation seconds, resets on damage and respects global cap',()=>{
 const s=make('eq_armor_chengxiao').state
 s.time=3;assert.ok(regenerationFraction(s.loadout,s)<.025)
 s.time=4;assert.ok(Math.abs(regenerationFraction(s.loadout,s)-(1/60+.002+.006))<1e-12)
 resolveArmorHit(s,1);assert.ok(regenerationFraction(s.loadout,s)<.025)
 s.time=8;assert.ok(Math.abs(regenerationFraction(s.loadout,s)-(1/60+.002+.006))<1e-12)
})
test('formation ring applies only to its family; funded common skill damage is lower',()=>{
 const l=make().state.loadout;assert.equal(value(l.ring,'skillDamage'),10)
 const base=outgoingDamageFactor(l,'sj_arc','physical',true)
 assert.ok(outgoingDamageFactor(l,'sj_formation','physical',true)>base)
 assert.equal(outgoingDamageFactor(l,'evo_sixiang','physical',true),outgoingDamageFactor(l,'sj_formation','physical',true))
})
test('both armor effects run through actual battle updates and deterministic snapshot restoration',()=>{
 for(const a of ['eq_armor_wugou','eq_armor_chengxiao']){
  const r=make(a);for(let i=0;i<2400;i++){steerMechanics(r);r.advance(1/60);if(i%300===0)assert.ok(validateTowerSnapshot(r.snapshot()),a+' '+r.state.time)}
  const restored=TowerRun.restore(r.snapshot());r.advance(1/60);restored.advance(1/60);assert.deepEqual(restored.snapshot(),r.snapshot())
 }
})
test('shield triggers through actual incoming-damage step, pauses and resumes without refresh',()=>{
 const r=make(),s=r.state,p=s.player;p.hp=p.maxHp*.31
 const original=r._projectiles;r._projectiles=function(incoming,...args){original.call(this,incoming,...args);incoming.push({id:'shield-contact',damage:p.maxHp*.04,damageType:'physical'})}
 r.advance(1/60);r._projectiles=original
 assert.ok(s.armorState.shield>0);assert.ok(validateTowerSnapshot(r.snapshot()))
 r.pause();const snapshot=r.snapshot(),restored=TowerRun.restore(snapshot);r.advance(2);assert.deepEqual(r.snapshot(),snapshot)
 r.resume();restored.resume();r.advance(1/60);restored.advance(1/60);assert.deepEqual(r.snapshot(),restored.snapshot())
 const bad=r.snapshot();bad.armorState.shield=bad.player.maxHp;assert.equal(validateTowerSnapshot(bad),false)
})
test('paused equipment refresh preserves the full authored shield and never restores consumed shield',()=>{
 const r=make(),s=r.state,p=s.player;p.hp=p.maxHp*.32
 const original=r._projectiles
 r._projectiles=function(incoming,...args){original.call(this,incoming,...args);incoming.push({id:'shield-contact',damage:p.maxHp*.04,damageType:'physical'})}
 r.advance(1/60);r._projectiles=original;r.pause()
 const shield=r.state.armorState.shield,ready=r.state.armorState.shieldReadyAt
 assert.ok(shield>p.maxHp*.12)
 r.setEquipmentLoadout(structuredClone(r.state.loadout))
 assert.equal(r.state.armorState.shield,shield)
 assert.equal(r.state.armorState.shieldReadyAt,ready)
 resolveArmorHit(r.state,10)
 const remainder=r.state.armorState.shield
 r.setEquipmentLoadout(structuredClone(r.state.loadout))
 assert.equal(r.state.armorState.shield,remainder)
 assert.ok(validateTowerSnapshot(r.snapshot()))
})
test('DOT ring boosts only converted budget and never grants a missing damage source',()=>{
 const r=make('eq_armor_chengxiao','eq_ring_weiming');for(let i=0;i<300&&!r.state.enemies.length;i++)r.advance(1/60)
 const e=r.state.enemies[0];e.hp=e.maxHp=1e7;r._random=()=>.99
 const before=e.hp;r._damageEnemy({target:e.id,source:'sj_arc',damage:100,direct:true})
 const direct=100*outgoingDamageFactor(r.state.loadout,'sj_arc','physical',true)*.5
 // Taiheng boosts learned mark 4 -> 5 (20%); the ring adds 12 percentage points.
 assert.ok(Math.abs(e.qingpingDot.remaining/direct-1.32)<1e-8)
 const t=make('eq_armor_chengxiao','eq_ring_weiming');delete t.state.loadout.passive.sj_mark;delete t.state.loadout.trainedSkills.passive.sj_mark
 for(let i=0;i<300&&!t.state.enemies.length;i++)t.advance(1/60)
 const enemy=t.state.enemies[0];enemy.hp=1e7;t._random=()=>.99;t._damageEnemy({target:enemy.id,source:'sj_arc',damage:100,direct:true})
 assert.equal(enemy.qingpingDot,undefined);assert.equal(enemy.weaponBleed,undefined)
})
test('safe-recovery pulse heals the authored amount below the cap and only two armor identities have conditional effects',()=>{
 const r=make('eq_armor_chengxiao'),s=r.state;s.player.hp=s.player.maxHp*.5;s.time=6;s.ticks=360
 const before=s.player.hp;r._regenerateHp();assert.ok(Math.abs(s.player.hp-before-s.player.maxHp*regenerationFraction(s.loadout,s))<1e-8)
 const zero=make().state;zero.player.hp=zero.player.maxHp*.2;assert.equal(resolveArmorHit(zero,0).shieldTriggered,false)
 assert.equal(EQUIPMENT.filter(d=>d.category==='armor'&&d.quality&&gear(d.id).affixes.some(a=>['safeRecovery','lowHealthShield'].includes(a.type))).length,2)
})
test('Zhaoyuan remains a stable physical weapon without a flow restriction',()=>{
 const w=weapon('eq_sword_zhaoyuan'),d=WEAPONS.find(d=>d.id===w.definitionId),b=equipmentBaseAttributes(d)
 assert.ok(b.physicalAttack>b.magicAttack);assert.equal(w.affixes.some(a=>a.type==='flow'),false)
})
test('campaign persists an active shield atomically and restores its original cooldown',async()=>{
 const {TowerCampaignStore,combatLoadout}=await import('../js/xianxia/TowerCampaign.js')
 const {cultivationLevelXp}=await import('../js/xianxia/TowerProfile.js')
 const {checksum}=await import('../js/xianxia/Checksum.js')
 let raw=null,fail=false;const disk={getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw Error('disk failure');raw=value}}
 const fresh=new TowerCampaignStore(disk,0);fresh.act({type:'sync'},0);const envelope=JSON.parse(raw),state=JSON.parse(envelope.data)
 state.xp=cultivationLevelXp(21);state.equipmentSequence=1;state.equipment['gear-1']=createFixedEquipment('eq_armor_wugou','gear-1');state.loadouts[0].armorId='gear-1'
 state.hp=stats(state.xp,combatLoadout(state)).maxHp
 const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false);assert.equal(store.state.equipment['gear-1'].definitionId,'eq_armor_wugou')
 const start=store.act({type:'startFloor',floor:1,seed:101},0);assert.ok(start.ok)
 const r=TowerRun.restore(start.snapshot),s=r.state;s.player.hp=s.player.maxHp*.31
 const original=r._projectiles;r._projectiles=function(incoming,...args){original.call(this,incoming,...args);incoming.push({id:'shield-contact',damage:s.player.maxHp*.06,damageType:'physical'})};r.advance(1/60);r._projectiles=original;r.pause()
 assert.ok(s.armorState.shield>0);const prior=raw
 fail=true;assert.equal(store.act({type:'checkpoint',snapshot:r.snapshot()},0).ok,false);assert.equal(raw,prior)
 fail=false;assert.ok(store.act({type:'checkpoint',snapshot:r.snapshot()},0).ok)
 const restored=new TowerCampaignStore(disk,0);assert.deepEqual(restored.state.activeRun.snapshot.armorState,s.armorState)
})
