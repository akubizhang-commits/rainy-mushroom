import test from 'node:test';import assert from 'node:assert/strict';
import {TowerRun} from '../js/xianxia/TowerRun.js';
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js';
import {EQUIPMENT,createFixedEquipment,ringDamageModifiers,equipmentDescription,validateEquipment} from '../js/xianxia/TowerEquipment.js';
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js';
const ring=()=>createFixedEquipment(EQUIPMENT.find(d=>d.category==='ring'&&d.tier==='fa'&&d.quality===2&&d.role==='burst').id,'test-ring');
function damage(source,direct,equipped){
 const w=createIronWeapon(),r=equipped?ring():undefined;
 const run=new TowerRun({attemptId:1,floor:1,seed:41,xp:cultivationLevelXp(12),hp:100,loadout:{growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0,...(r?{ring:r,ringId:r.id}:{})}});
 for(let n=0;n<120&&!run.state.enemies.length;n++)run.advance(1/60);
 const e=run.state.enemies[0];assert.ok(e);e.hp=e.maxHp=1e9;run._random=()=>.99;
 const before=e.hp;run._damageEnemy({target:e.id,damage:100,damageParts:{physical:50,magic:50},direct,source});return before-e.hp;
}
test('universal ring bonus reaches direct skills, periodic formation and orbit once, excluding basic attacks',()=>{
 for(const [source,direct] of [['sj_arc',true],['formation',false],['orbit',true]])assert.ok(Math.abs(damage(source,direct,true)/damage(source,direct,false)-1.05)<1e-7,source);
 assert.equal(damage('basic_attack',true,true),damage('basic_attack',true,false));
});
test('ring skill damage is fixed, visible and rejects tampered or duplicate slots',()=>{
 const r=ring();assert.equal(ringDamageModifiers(r).skillDamage,.05);assert.match(equipmentDescription(r).join(' '),/功法伤害 \+5%/);
 const altered=structuredClone(r);altered.affixes.find(x=>x.type==='skillDamage').value+=1;assert.equal(validateEquipment(altered),false);
 const duplicated=structuredClone(r);duplicated.affixes.push({...r.affixes.find(x=>x.type==='skillDamage')});assert.equal(validateEquipment(duplicated),false);
});

import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js';
test('schema43 ring saves reset only this mode atomically; current saves reload without writes',()=>{
 const disk=new Map([['other-game','keep']]);let writes=0;
 const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>{writes++;disk.set(k,v)}};
 const fresh=new TowerCampaignStore(storage,0);assert.equal(fresh.act({type:'sync'},0).ok,true);
 const record=JSON.parse(disk.get(TOWER_CAMPAIGN_KEY));assert.equal(record.schema,58);record.schema=43;
 const old=JSON.stringify(record);disk.set(TOWER_CAMPAIGN_KEY,old);
 const failed=new TowerCampaignStore({...storage,setItem(){throw Error('disk full')}},0);
 assert.equal(failed.readOnly,true);assert.equal(failed.error,'save-failed');assert.equal(disk.get(TOWER_CAMPAIGN_KEY),old);
 let reads=0;const newer=old+' ';
 const stale=new TowerCampaignStore({...storage,getItem(k){if(k===TOWER_CAMPAIGN_KEY&&++reads>1){disk.set(k,newer);return newer}return storage.getItem(k)}},0);
 assert.equal(stale.readOnly,true);assert.equal(stale.error,'stale-save');assert.equal(disk.get(TOWER_CAMPAIGN_KEY),newer);
 disk.set(TOWER_CAMPAIGN_KEY,old);
 const reset=new TowerCampaignStore(storage,0);assert.equal(reset.readOnly,false);assert.deepEqual(reset.migrationReport,{reset:true,fromSchema:43});
 assert.equal(disk.get('other-game'),'keep');const count=writes;
 const reload=new TowerCampaignStore(storage,0);assert.deepEqual(reload.state,reset.state);assert.equal(writes,count);
});
