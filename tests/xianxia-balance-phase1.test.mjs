import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { CAMP_PILLS } from '../js/xianxia/TowerProfile.js'
import { ALCHEMY_RECIPES } from '../js/xianxia/TowerAlchemy.js'
import * as pills from '../js/xianxia/TowerPills.js'
import { inventoryEntries, inventoryDescription, inventoryQuote } from '../js/xianxia/TowerInventory.js'
import { checksum } from '../js/xianxia/Checksum.js'

function fixture(patch={}) {
  const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}}
  const initial=new TowerCampaignStore(disk,0)
  initial.act({type:'sync'},0)
  const envelope=JSON.parse(disk.raw)
  const data=JSON.stringify({...initial.state,clearedFloor:1,...patch,pills:{...initial.state.pills,...patch.pills}})
  disk.raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
  const store=new TowerCampaignStore(disk,0)
  assert.equal(store.readOnly,false)
  return {store,disk}
}

test('huichun crafting has the same opportunity cost as buying and preserves atomic retry',()=>{
  const recipe=ALCHEMY_RECIPES.huichun
  const materials=recipe.ingredients.reduce((n,r)=>n+r.count*CAMP_PILLS[r.id].sellPrice,0)
  assert.equal(recipe.spiritStoneCost,1)
  assert.equal(materials+recipe.spiritStoneCost,CAMP_PILLS.huichun.price)
  const {store,disk}=fixture({spiritStones:2,pills:{huichuncao:4,bailuhua:2,linglu:2}})
  const action={type:'craftPill',id:'huichun',count:2,sequence:1,requestId:'phase1-huichun'}
  const before=store.state,saved=disk.raw,held=store.state.pills.huichun
  disk.fail=true
  assert.equal(store.act(action,0).reason,'save-failed')
  assert.equal(store.state,before);assert.equal(disk.raw,saved)
  disk.fail=false
  assert.equal(store.act(action,0).ok,true)
  assert.equal(store.state.spiritStones,0)
  assert.equal(store.state.pills.huichun,held+2)
  assert.equal(store.state.pills.huichuncao,0)
  assert.equal(store.state.pills.bailuhua,0)
  assert.equal(store.state.pills.linglu,0)
  const reloaded=new TowerCampaignStore(disk,0)
  assert.equal(reloaded.act(action,0).ok,true)
  assert.equal(reloaded.state.pills.huichun,held+2)
  assert.equal(reloaded.state.spiritStones,0)
})

for(const [xp,realm,base,advanced,yield1,yield2] of [
  [0,'炼气','peiyuan','ningqi',50,90],
  [1801,'筑基','heqi','yangyuan',100,180],
  [6601,'金丹','zhenyuan','zifu',160,280],
]) {
  test(`${realm} pill details show shared allowance, both yields and actual next-use gain`,()=>{
    for(const id of [base,advanced]) {
      const {store}=fixture({xp,cultivationPillUses:{炼气:0,筑基:0,金丹:0,[realm]:5},pills:{[base]:1,[advanced]:1}})
      const hint=pills.cultivationPillHint(store.state,id)
      assert.match(hint,/已服5\/6颗/)
      assert.match(hint,/剩余1颗/)
      assert.ok(hint.includes(`${CAMP_PILLS[base].name}${yield1}`))
      assert.ok(hint.includes(`${CAMP_PILLS[advanced].name}${yield2}`))
      const row=inventoryEntries(store.state).find(r=>r.id===id)
      const text=inventoryDescription(store.state,row).join('\n')
      assert.ok(text.includes(`本次可得${CAMP_PILLS[id].xp}修为`))
      assert.match(text,/服用后剩余0颗/)
      // Informational only: normal use does not acquire an extra modal or new transaction gate.
      assert.equal(inventoryQuote(store.state,id,'use').confirmation,undefined)
      assert.equal(store.act({type:'usePill',id},0).ok,true)
      assert.equal(store.state.cultivationPillUses[realm],6)
    }
  })
}

test('overflow preview matches enforced confirmation and never promises full gain',()=>{
  const {store}=fixture({xp:1780,pills:{ningqi:1}})
  const text=pills.cultivationPillUseHint(store.state,'ningqi')
  assert.match(text,/本次可得20修为/)
  assert.match(text,/超出70修为/)
  assert.match(text,/服用后剩余5颗/)
  assert.equal(store.act({type:'usePill',id:'ningqi'},0).reason,'cultivation-overflow-confirmation')
  assert.match(inventoryQuote(store.state,'ningqi','use').confirmation,/浪费70修为/)
})

test('selected pill uses its own realm counter and blocked use has no actionable gain',()=>{
  const {store}=fixture({cultivationPillUses:{炼气:5,筑基:2,金丹:0},pills:{heqi:1}})
  assert.match(pills.cultivationPillHint(store.state,'heqi'),/筑基修为丹已服2\/6颗/)
  assert.match(pills.cultivationPillUseHint(store.state,'heqi'),/仅限筑基服用/)
  for(const [patch,id,expected] of [
    [{clearedFloor:0},'peiyuan',/通关镇妖塔第1层/],
    [{xp:1800},'ningqi',/突破后/],
    [{xp:14400},'zifu',/修为已满/],
    [{cultivationPillUses:{炼气:6,筑基:0,金丹:0}},'peiyuan',/额度已用尽/],
  ]) {
    const f=fixture(patch),hint=pills.cultivationPillUseHint(f.store.state,id)
    assert.match(hint,expected);assert.doesNotMatch(hint,/本次可得|服用后剩余/)
  }
  assert.equal(pills.cultivationPillUseHint(store.state,'huichun'),'')
})
