import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {forgingRecipe,forgingQuote,dismantleStoneRefund} from '../js/xianxia/TowerForging.js'
import {createFixedWeapon,weaponFlatAttack,weaponFlatMagicAttack} from '../js/xianxia/TowerWeapons.js'
import {stats,characterCombatAttributes} from '../js/xianxia/TowerRun.js'
import {EQUIPMENT_RANGES} from '../js/xianxia/TowerEquipmentRanges.js'
import {inventoryEntries,inventoryDetail} from '../js/xianxia/TowerInventory.js'
import {FLOOR01} from '../js/xianxia/TowerContent.js'
import {towerKillXp} from '../js/xianxia/TowerCultivationRewards.js'
const recipeId='weapon:fan:q2'
function fixture(xp=45){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}}
 const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0)
 const envelope=JSON.parse(disk.raw)
 envelope.data=JSON.stringify({...initial.state,xp,pills:{...initial.state.pills,forge_xuantie:2,forge_lingmu:1,forge_lingyu:1,forge_tiejing:1}})
 envelope.checksum=checksum(envelope.data);disk.raw=JSON.stringify(envelope)
 return {disk,store:new TowerCampaignStore(disk,0)}
}
test('second weapon opens at level two with deterministic purchase only',()=>{
 const r=forgingRecipe(recipeId);assert.ok(r)
 assert.deepEqual(r.definitionIds,['eq_sword_qingfeng'])
 const {store}=fixture();assert.equal(forgingQuote(store.state,recipeId,1,'buy').spiritStones,72)
 assert.equal(forgingQuote(store.state,recipeId,1,'craft').reason,'invalid-source')
 assert.deepEqual(r.ingredients,[])
 for(const mode of ['buy']){
  assert.equal(forgingQuote({...store.state,xp:44},recipeId,1,mode).reason,'realm-locked')
  assert.equal(forgingQuote(store.state,recipeId,1,mode).ok,true)
 }
 assert.equal(forgingQuote({...store.state,pills:{}},recipeId,1,'buy').ok,true)
 assert.equal(forgingQuote({...store.state,pills:{}},recipeId,1,'craft').reason,'invalid-source')
 let xp=0;for(const w of FLOOR01.waves.slice(0,8))for(const b of w.batches)for(const id of b.unit_ids)xp+=towerKillXp(1,w.wave,id)
 assert.ok(xp>=45&&xp<225)
})
test('purchase survives save failure, retry and reload without duplicate gear or charges',()=>{
 for(const type of ['buyGear']){
  const {disk,store}=fixture(),before=store.state
  const action={type,id:recipeId,count:1,sequence:1,requestId:type}
  disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before)
  disk.fail=false;const result=store.act(action,0);assert.equal(result.ok,true)
  assert.equal(store.state.spiritStones,before.spiritStones-(type==='buyGear'?72:20))
  assert.equal(store.state.pills.forge_xuantie,type==='buyGear'?2:0)
  const gear=store.state.weapons[result.ids[0]];assert.equal(gear.definitionId,'eq_sword_qingfeng')
  assert.equal(dismantleStoneRefund(gear),28)
  const loadout={...store.state.loadouts[0],weaponId:gear.id}
  assert.equal(store.act({type:'setLoadout',index:0,loadout},0).ok,true)
  const reload=new TowerCampaignStore(disk,0);assert.equal(reload.readOnly,false)
  assert.equal(reload.state.loadouts[0].weaponId,gear.id)
  const stones=reload.state.spiritStones;assert.equal(reload.act(action,0).duplicate,true);assert.equal(reload.state.spiritStones,stones)
 }
})
test('new weapon cannot be equipped below its own gate even though other fan weapons can',()=>{
 const {disk,store}=fixture(0),gear=createFixedWeapon('eq_sword_qingfeng','weapon-1')
 const e=JSON.parse(disk.raw);e.data=JSON.stringify({...store.state,weapons:{...store.state.weapons,[gear.id]:gear},weaponSequence:1,weaponCounters:{...store.state.weaponCounters,[gear.id]:0}});e.checksum=checksum(e.data);disk.raw=JSON.stringify(e)
 const reload=new TowerCampaignStore(disk,0);assert.equal(reload.readOnly,false)
 const before=reload.state;assert.equal(reload.act({type:'setLoadout',index:0,loadout:{...before.loadouts[0],weaponId:gear.id}},0).ok,false)
 assert.equal(reload.state,before)
})
test('transition base attack stays between starter shop weapon and formal general weapon',()=>{
 for(const value of [weaponFlatAttack,weaponFlatMagicAttack]){
 const values=['eq_sword_suwen','eq_sword_qingfeng','eq_sword_guiyan'].map(id=>value(createFixedWeapon(id,'test-'+id)))
 assert.ok(values[0]<values[1]&&values[1]<values[2],JSON.stringify(values))
 }
})

test('crafting shop-only transition weapon rejects without charging or saving',()=>{
 const {disk,store}=fixture(),before=store.state,raw=disk.raw
 assert.equal(store.act({type:'craftGear',id:recipeId,count:1,sequence:1,requestId:'no-craft'},0).reason,'invalid-source')
 assert.equal(store.state,before);assert.equal(disk.raw,raw)
})

test('combat damage and inventory requirement preserve the intended progression',()=>{
 const {store}=fixture()
 const values=['eq_sword_suwen','eq_sword_qingfeng','eq_sword_guiyan'].map(id=>{
  const weapon=createFixedWeapon(id,'test-'+id),loadout={weapon,weaponEquipped:true,active:{},passive:{},evolutions:[]}
  const sheet=stats(225,loadout),attributes=characterCombatAttributes(loadout,225)
  return {physical:sheet.attack*(1+attributes.physicalDamageIncrease),magic:sheet.magicAttack*(1+attributes.magicDamageIncrease)}
 })
 for(const channel of ['physical','magic'])assert.ok(values[0][channel]<values[1][channel]&&values[1][channel]<values[2][channel])
 assert.deepEqual(EQUIPMENT_RANGES['fan:2'].weapon.general,[[24,24],[24,24]])
 const result=store.act({type:'buyGear',id:recipeId,count:1,sequence:1,requestId:'inspect'},0)
 const row=inventoryEntries(store.state).find(row=>row.id===result.ids[0]),detail=inventoryDetail(store.state,row)
 assert.equal(detail.requirement,'炼气·二层');assert.equal(detail.requirementMet,true)
 assert.equal(inventoryDetail({...store.state,xp:44},row).requirementMet,false)
})
