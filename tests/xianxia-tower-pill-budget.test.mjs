import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { cultivationPillAllowance, cultivationUseQuote } from '../js/xianxia/TowerPills.js'
import { checksum } from '../js/xianxia/Checksum.js'
function fixture(patch={}) {
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 const base=new TowerCampaignStore(disk,0)
 const data=JSON.stringify({...base.state,clearedFloor:1,...patch,pills:{...base.state.pills,...patch.pills}})
 disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 return {disk,store:new TowerCampaignStore(disk,0)}
}
function reject(f,action,reason) {
 const before=f.store.state,raw=f.disk.raw
 assert.equal(f.store.act(action,0).reason,reason)
 assert.equal(f.store.state,before);assert.equal(f.disk.raw,raw)
}
const buy=count=>({type:'buyPill',id:'peiyuan',count})
const use={type:'usePill',id:'peiyuan'}
test('after first clear, six shared uses remain; oversized held stock is retained and acquisition needs confirmation',()=>{
 const f=fixture({pills:{peiyuan:15}})
 assert.equal(cultivationPillAllowance(f.store.state).remaining,6)
 reject(f,buy(1),'cultivation-stock-confirmation')
 assert.equal(f.store.act({...buy(1),confirmed:true},0).ok,true)
 assert.equal(f.store.act(use,0).gained,50)
 assert.equal(f.store.state.pills.peiyuan,15)
})
test('minor layers, floor progress, reload and skill refund preserve used count',()=>{
 const f=fixture({clearedFloor:2,xp:630})
 assert.equal(f.store.act(buy(3),0).ok,true)
 assert.equal(f.store.act(use,0).gained,50)
 f.store=new TowerCampaignStore(f.disk,0)
 assert.equal(f.store.state.cultivationPillUses['炼气'],1)
 assert.equal(f.store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 assert.equal(f.store.act({type:'decreaseSkill',id:'sj_arc'},0).ok,true)
 assert.equal(f.store.act(use,0).gained,50)
 assert.equal(f.store.state.cultivationPillUses['炼气'],2)
 assert.equal(f.store.state.xp,730)
})
test('failed writes consume no allowance, stock or currency',()=>{
 const f=fixture();f.disk.fail=true;reject(f,buy(3),'save-failed');f.disk.fail=false
 assert.equal(f.store.act(buy(3),0).ok,true)
 f.disk.fail=true;reject(f,use,'save-failed');f.disk.fail=false
 assert.equal(f.store.act(use,0).ok,true);assert.equal(f.store.state.cultivationPillUses['炼气'],1)
})
test('current schema requires all three valid realm counters and rejects corruption',()=>{
 for(const value of [undefined,null,{},[],{'炼气':0,'筑基':0},{'炼气':7,'筑基':0,'金丹':0},{'炼气':-1,'筑基':0,'金丹':0},{'炼气':.5,'筑基':0,'金丹':0},{'炼气':'0','筑基':0,'金丹':0}]) {
  const f=fixture({cultivationPillUses:value});assert.equal(f.store.readOnly,true);reject(f,use,'corrupt')
 }
 const f=fixture();const record=JSON.parse(f.disk.raw);record.data=record.data.replace('"炼气":0','"炼气":1');f.disk.raw=JSON.stringify(record)
 assert.equal(new TowerCampaignStore(f.disk,0).readOnly,true)
})
test('each new realm has independent six uses; lower and higher realm purchases and use reject',()=>{
 for(const [xp,id,realm] of [[1801,'heqi','筑基'],[6601,'zhenyuan','金丹']]) {
  const f=fixture({xp,contribution:2000,cultivationPillUses:{'炼气':6,'筑基':realm==='金丹'?6:0,'金丹':0},pills:{peiyuan:1}})
  assert.equal(cultivationPillAllowance(f.store.state).remaining,6)
  reject(f,buy(1),'wrong-realm');reject(f,use,'wrong-realm')
  assert.equal(f.store.act({type:'buyPill',id,count:6},0).ok,true)
  for(let i=0;i<6;i++)assert.equal(f.store.act({type:'usePill',id},0).ok,true)
  assert.equal(f.store.state.cultivationPillUses[realm],6)
  reject(f,{type:'buyPill',id,count:1},'cultivation-allowance')
 }
})
test('last point at final cap needs confirmation, consumes one use and never consumes a second pill',()=>{
 const f=fixture({xp:14399,pills:{zifu:2}}),action={type:'usePill',id:'zifu'}
 assert.deepEqual(cultivationUseQuote(f.store.state,'zifu'),{ok:false,reason:'cultivation-overflow-confirmation',gained:1,wasted:279})
 reject(f,action,'cultivation-overflow-confirmation')
 assert.equal(f.store.act({...action,confirmed:true},0).gained,1)
 reject(f,action,'cultivation-capped')
 assert.equal(f.store.state.cultivationPillUses['金丹'],1);assert.equal(f.store.state.pills.zifu,1)
})
test('stale store cannot spend final shared use twice; reload preserves exhaustion',()=>{
 const f=fixture({pills:{peiyuan:2},cultivationPillUses:{'炼气':5,'筑基':0,'金丹':0}}),stale=new TowerCampaignStore(f.disk,0)
 assert.equal(f.store.act(use,0).ok,true);reject({store:stale,disk:f.disk},use,'stale-save')
 f.store=new TowerCampaignStore(f.disk,0);assert.equal(f.store.state.pills.peiyuan,1)
 assert.equal(cultivationPillAllowance(f.store.state).remaining,0);reject(f,use,'cultivation-allowance')
})
