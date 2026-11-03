import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { assertCurrentCampaign } from './helpers/tower-current-state.mjs'
import { checksum } from '../js/xianxia/Checksum.js'

// Integration guard for the main-owned Campaign: scaled Ling fixed attack may
// never be equipped below level 21, even through a direct setLoadout action.
for(const level of [1,20,21])test(`ling weapon equip gate at level ${level}`,()=>{
  const now=1800000000000,records=new Map()
  const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)}
  const initial=new TowerCampaignStore(storage,now)
  assert.ok(initial.act({type:'sync'},now).ok)
  const record=JSON.parse(records.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(record.data)
  state.xp=cultivationLevelXp(level)
  const item=rollWeapon('ling',4,()=>0,'weapon-1')
  state.weapons[item.id]=item;state.weaponSequence=1;state.weaponCounters[item.id]=0
  if(state.inventoryMeta)state.inventoryMeta[item.id]={order:1,seen:true}
  record.data=JSON.stringify(state);record.checksum=checksum(record.data)
  records.set(TOWER_CAMPAIGN_KEY,JSON.stringify(record))
  const store=new TowerCampaignStore(storage,now)
  assertCurrentCampaign(store,state)
  const before=JSON.stringify(store.state),beforeRecord=records.get(TOWER_CAMPAIGN_KEY)
  const result=store.act({type:'setLoadout',index:0,loadout:{...store.state.loadouts[0],weaponId:item.id}},now)
  assert.equal(result.ok,level>=21,`level ${level} must ${level>=21?'allow':'reject'} Ling weapon`)
  if(level<21){assert.equal(JSON.stringify(store.state),before);assert.equal(records.get(TOWER_CAMPAIGN_KEY),beforeRecord)}
})
