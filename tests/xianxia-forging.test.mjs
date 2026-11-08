import test from 'node:test'
import assert from 'node:assert/strict'
import {FORGING_RECIPES,createForgedGear} from '../js/xianxia/TowerForging.js'
import {equipmentSource} from '../js/xianxia/TowerEquipmentSources.js'
import {WEAPONS,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,validateEquipment} from '../js/xianxia/TowerEquipment.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {FORGE_MATERIALS} from '../js/xianxia/TowerForgeMaterials.js'
import {materialDrops} from '../js/xianxia/TowerMaterialLoot.js'
function fixture(patch={}){const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error();this.raw=v}};const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0);const envelope=JSON.parse(disk.raw),data=JSON.stringify({...initial.state,...patch,pills:{...initial.state.pills,...Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,100])),...patch.pills}});disk.raw=JSON.stringify({...envelope,data,checksum:checksum(data)});return {store:new TowerCampaignStore(disk,0),disk}}
test('fixed catalog identities enter one legal source and one recipe only',()=>{
 const counts={qualityPool:0,shopOnly:0,starter:0};for(const d of [...WEAPONS,...EQUIPMENT])counts[equipmentSource(d.id)]++
 assert.deepEqual(counts,{qualityPool:81,shopOnly:4,starter:3});assert.equal(FORGING_RECIPES.length,40)
 for(const r of FORGING_RECIPES)for(const id of r.definitionIds){const item=createForgedGear(r.id,'test-1',id);assert.equal(r.category==='weapon'?validateWeapon(item):validateEquipment(item),true,id)}
})
test('common forge material slots stay deterministic and Boss guarantee is not first-clear gated',()=>{
 for(let floor=1;floor<=9;floor++){
 const snapshot={floor,loot:{seed:76},killLedger:[{id:'normal',wave:1,archetype:'boar_normal'},{id:'elite',wave:5,archetype:'boar_elite'},{id:'boss',wave:20,archetype:'boar_boss'}]}
 const drops=materialDrops(snapshot).filter(id=>id.startsWith('forge_'));assert.equal(drops.filter(id=>id==='forge_ninglingjing').length,1);assert.equal(drops.filter(id=>/tiejing|hanjingsha|chitongjing|zijingsui/.test(id)).length,6)
 assert.deepEqual([...drops].sort(),materialDrops({...snapshot,killLedger:[...snapshot.killLedger].reverse()}).filter(id=>id.startsWith('forge_')).sort());assert.deepEqual(materialDrops({...snapshot,rewardIsolated:true}),[])
 }
})
test('reject malformed, locked and insufficient pool requests without mutation',()=>{
 for(const [patch,reason] of [[{id:'weapon:fan:q4'},'unknown-recipe'],[{id:'eq_sword_guiyan:q1'},'unknown-recipe'],[{count:0},'invalid-count'],[{count:11},'invalid-count'],[{count:1.5},'invalid-count'],[{sequence:0},'stale-forge-sequence'],[{requestId:''},'invalid-request-id'],[{id:'weapon:ling:q1'},'realm-locked']]){
 const {store}=fixture({xp:225}),before=store.state;assert.equal(store.act({type:'craftGear',id:'weapon:fa:q1',count:1,sequence:1,requestId:'test',...patch},0).reason,reason);assert.equal(store.state,before)
 }
 const {store,disk}=fixture(),old=new TowerCampaignStore(disk,0),action={type:'buyGear',id:'weapon:fan:q1',count:1,sequence:1,requestId:'one'}
 assert.equal(store.act(action,0).ok,true);assert.equal(old.act(action,0).reason,'stale-save');assert.equal(store.act({...action,requestId:'new'},0).reason,'stale-forge-sequence')
})
test('in-tower rejects crafting buying and retired draw endpoints',()=>{
 const {store}=fixture();assert.equal(store.act({type:'startFloor',floor:1,seed:1},0).ok,true)
 for(const type of ['craftGear','buyGear','drawForge','drawWeapon','drawEquipment'])assert.equal(store.act({type,id:'weapon:fan:q1',requestId:'tower',sequence:1,count:1,category:'armor',tier:'fan'},0).reason,'in-tower')
})
test('bounded receipt cache rejects evicted requests and gear capacity is atomic',()=>{
 const {store,disk}=fixture({spiritStones:100000,contribution:100000})
 const action={type:'buyGear',id:'weapon:fan:q1',count:1,sequence:1,requestId:'receipt-1'}
 for(let sequence=1;sequence<=65;sequence++)assert.equal(store.act({...action,sequence,requestId:'receipt-'+sequence},0).ok,true)
 const reload=new TowerCampaignStore(disk,0),before=reload.state
 assert.equal(reload.state.forgeReceipts.length,64);assert.equal(reload.act(action,0).reason,'stale-forge-sequence');assert.equal(reload.state,before)
 for(let sequence=66;sequence<=82;sequence++)assert.equal(reload.act({...action,count:10,sequence,requestId:'receipt-'+sequence},0).ok,true)
 assert.equal(Object.keys(reload.state.weapons).length+Object.keys(reload.state.equipment).length,238)
 const fullBefore=reload.state
 assert.equal(reload.act({...action,count:3,sequence:83,requestId:'capacity'},0).reason,'capacity');assert.equal(reload.state,fullBefore)
 assert.equal(reload.act({...action,count:2,sequence:83,requestId:'capacity'},0).ok,true)
 assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
})
test('fan crafting is rejected while purchase yields fixed attributes',()=>{const {store}=fixture(),id='weapon:fan:q1';assert.equal(store.act({type:'craftGear',id,count:1,sequence:1,requestId:'c'},0).reason,'invalid-source');assert.equal(store.act({type:'buyGear',id,count:1,sequence:1,requestId:'b'},0).ok,true);assert.deepEqual(store.state.weapons['weapon-1'].affixes,createForgedGear(id,'preview').affixes)})
