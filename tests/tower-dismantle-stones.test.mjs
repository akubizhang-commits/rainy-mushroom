import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {FORGING_RECIPES,createForgedGear,dismantleStoneRefund} from '../js/xianxia/TowerForging.js'
import {inventoryQuote} from '../js/xianxia/TowerInventory.js'
import {STONE_CAP} from '../js/xianxia/TowerEconomy.js'
function fixture(category,cap=false){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const env=JSON.parse(disk.raw),state=JSON.parse(env.data);state.contribution=100;state.spiritStones=500;
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);disk.raw=JSON.stringify(env);store=new TowerCampaignStore(disk,0)
 const bought=store.act({type:'buyGear',id:`${category}:fan:q1`,count:1,sequence:1,requestId:'test'},0);assert.equal(bought.ok,true,bought.reason)
 if(cap){const e=JSON.parse(disk.raw),s=JSON.parse(e.data);s.spiritStones=STONE_CAP;e.data=JSON.stringify(s);e.checksum=checksum(e.data);disk.raw=JSON.stringify(e);store=new TowerCampaignStore(disk,0)}
 return{store,disk,id:bought.ids[0],type:category==='weapon'?'dismantleWeapon':'dismantleEquipment'}
}
test('all recipes recover 40% of stone cost and cannot fund a buy/craft loop',()=>{
 for(const recipe of FORGING_RECIPES){const refund=dismantleStoneRefund(createForgedGear(recipe.id,'test'));assert.equal(refund,Math.floor(recipe.spiritStones*(recipe.source==='shopOnly'?3:1)*2/5));assert.ok(refund>0&&refund<recipe.spiritStones*(recipe.source==='shopOnly'?3:1))}
})
for(const category of ['weapon','armor','ring'])test(`${category} quote and commit return only stones, once; failed save and cap preserve item`,()=>{
 const f=fixture(category),before=f.store.state,quote=inventoryQuote(before,f.id,'dismantle');assert.equal(quote.refund,9)
 f.disk.fail=true;assert.equal(f.store.act({type:f.type,id:f.id},0).reason,'save-failed');assert.equal(f.store.state,before)
 f.disk.fail=false;const result=f.store.act({type:f.type,id:f.id},0);assert.equal(result.ok,true);assert.equal(result.refund,quote.refund)
 assert.equal(f.store.state.spiritStones,before.spiritStones+quote.refund);assert.equal(f.store.state.contribution,before.contribution);assert.deepEqual(f.store.state.pills,before.pills)
 const raw=f.disk.raw;assert.equal(f.store.act({type:f.type,id:f.id},0).ok,false);assert.equal(f.disk.raw,raw);assert.deepEqual(new TowerCampaignStore(f.disk,0).state,f.store.state)
 const capped=fixture(category,true),old=capped.disk.raw;assert.match(inventoryQuote(capped.store.state,capped.id,'dismantle').reason,/灵石/);assert.equal(capped.store.act({type:capped.type,id:capped.id},0).reason,'capacity');assert.equal(capped.disk.raw,old)
})
