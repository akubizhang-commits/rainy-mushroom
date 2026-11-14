import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {FORGING_RECIPES,createForgedGear,equipmentSellPrice,dismantleMaterials,DISMANTLE_MATERIAL_SHARE} from '../js/xianxia/TowerForging.js'
import {inventoryQuote,gearDisposalQuote,disposableGear} from '../js/xianxia/TowerInventory.js'
import {STONE_CAP} from '../js/xianxia/TowerEconomy.js'
import {TOWER_RESOURCE_CAP} from '../js/xianxia/TowerProfile.js'
// Selling equipment returns 40% of the stone cost; dismantling returns 50% of the
// same tier/quality recipe's materials (rounded down) and no stones.
function rewrite(disk,patch){const e=JSON.parse(disk.raw),s=JSON.parse(e.data);patch(s);e.data=JSON.stringify(s);e.checksum=checksum(e.data);disk.raw=JSON.stringify(e)}
function fixture(){
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 new TowerCampaignStore(disk,0).act({type:'sync'},0)
 const recipe=id=>FORGING_RECIPES.find(r=>r.id===id)
 rewrite(disk,s=>{s.xp=1800;s.contribution=100;s.spiritStones=100000;for(const r of ['weapon:fa:q1','armor:fa:q2'])for(const a of recipe(r).ingredients)s.pills[a.id]=(s.pills[a.id]||0)+a.count*3})
 let store=new TowerCampaignStore(disk,0),sequence=0
 const make=(type,id)=>{const r=store.act({type,id,count:1,sequence:++sequence,requestId:'t'+sequence},0);assert.equal(r.ok,true,r.reason);return r.ids[0]}
 const fan=make('buyGear','weapon:fan:q1'),fa=make('craftGear','weapon:fa:q1'),armor=make('craftGear','armor:fa:q2')
 return{disk,store,fan,fa,armor,reload(){store=new TowerCampaignStore(disk,0);return store},get s(){return store}}
}
test('sell price is 40% of stone cost and dismantle returns half of each recipe material',()=>{
 assert.equal(DISMANTLE_MATERIAL_SHARE,.5)
 for(const recipe of FORGING_RECIPES){
  const item=createForgedGear(recipe.id,'test'),price=equipmentSellPrice(item)
  assert.equal(price,Math.floor(recipe.spiritStones*(recipe.source==='shopOnly'?3:1)*2/5))
  assert.deepEqual(dismantleMaterials(item),recipe.ingredients.map(a=>({id:a.id,count:Math.floor(a.count/2)})).filter(a=>a.count>0))
  if(recipe.tier==='fan')assert.deepEqual(dismantleMaterials(item),[])
 }
})
test('single sale returns stones only; single dismantle returns materials only',()=>{
 const f=fixture(),before=f.s.state
 const sale=inventoryQuote(before,f.fa,'sell');assert.equal(sale.ok,true);assert.equal(sale.refund,equipmentSellPrice(before.weapons[f.fa]))
 const sold=f.s.act(sale.action,0);assert.equal(sold.ok,true);assert.equal(sold.gained,sale.refund)
 assert.equal(f.s.state.spiritStones,before.spiritStones+sale.refund);assert.deepEqual(f.s.state.pills,before.pills);assert.equal(f.s.state.weapons[f.fa],undefined)
 const mid=f.s.state,split=inventoryQuote(mid,f.armor,'dismantle');assert.equal(split.ok,true)
 const done=f.s.act(split.action,0);assert.equal(done.ok,true);assert.equal(f.s.state.spiritStones,mid.spiritStones)
 for(const m of dismantleMaterials(mid.equipment[f.armor]))assert.equal(f.s.state.pills[m.id],mid.pills[m.id]+m.count)
 assert.equal(f.s.state.equipment[f.armor],undefined);assert.equal(f.s.state.inventoryMeta[f.armor],undefined)
 assert.deepEqual(f.reload().state,f.s.state)
})
test('凡器 can be sold but not dismantled; starter and loadout gear are never listed or accepted',()=>{
 const f=fixture(),state=f.s.state
 assert.match(inventoryQuote(state,f.fan,'dismantle').reason,/凡器/);assert.equal(f.s.act({type:'dismantleGear',ids:[f.fan]},0).reason,'no-materials')
 assert.equal(inventoryQuote(state,f.fan,'sell').ok,true)
 for(const id of ['iron','basic-armor','basic-ring']){assert.equal(gearDisposalQuote(state,[id],'sell').ok,false);assert.equal(f.s.act({type:'sellGear',ids:[id]},0).ok,false)}
 assert.ok(!disposableGear(state).some(r=>['iron','basic-armor','basic-ring'].includes(r.id)))
 assert.ok(f.s.act({type:'setLoadout',index:2,loadout:{...state.loadouts[2],weaponId:f.fa}},0).ok)
 assert.ok(!disposableGear(f.s.state).some(r=>r.id===f.fa));assert.equal(f.s.act({type:'sellGear',ids:[f.fa]},0).reason,'equipped-weapon')
})
test('batch sale and dismantle are atomic: one bad id, save failure or cap leaves the save untouched',()=>{
 const f=fixture(),ids=[f.fan,f.fa,f.armor]
 for(const bad of [[...ids,'iron'],[f.fa,f.fa],[],[...ids,'missing']]){const raw=f.disk.raw;assert.equal(f.s.act({type:'sellGear',ids:bad},0).ok,false);assert.equal(f.disk.raw,raw)}
 assert.equal(f.s.act({type:'dismantleGear',ids},0).reason,'no-materials')
 const raw=f.disk.raw,before=f.s.state;f.disk.fail=true
 assert.equal(f.s.act({type:'sellGear',ids},0).reason,'save-failed');assert.equal(f.s.state,before);assert.equal(f.disk.raw,raw);f.disk.fail=false
 const quote=gearDisposalQuote(before,ids,'sell');assert.equal(quote.ok,true)
 const result=f.s.act(quote.action,0);assert.equal(result.ok,true);assert.equal(result.gained,quote.gained)
 assert.equal(f.s.state.spiritStones,before.spiritStones+quote.gained);for(const id of ids)assert.ok(!f.s.state.weapons[id]&&!f.s.state.equipment[id])
 const again=f.disk.raw;assert.equal(f.s.act(quote.action,0).ok,false);assert.equal(f.disk.raw,again)
})
test('batch dismantle sums materials; stone and material caps reject before any change',()=>{
 const f=fixture(),ids=[f.fa,f.armor],before=f.s.state,quote=gearDisposalQuote(before,ids,'dismantle')
 assert.equal(quote.ok,true);assert.equal(quote.gained,0)
 const capped=fixture();rewrite(capped.disk,s=>{s.spiritStones=STONE_CAP});capped.reload()
 assert.match(gearDisposalQuote(capped.s.state,[capped.fa],'sell').reason,/灵石/);assert.equal(capped.s.act({type:'sellGear',ids:[capped.fa]},0).reason,'capacity')
 const full=fixture(),first=dismantleMaterials(full.s.state.weapons[full.fa])[0].id;rewrite(full.disk,s=>{s.pills[first]=TOWER_RESOURCE_CAP});full.reload()
 const raw=full.disk.raw;assert.match(gearDisposalQuote(full.s.state,[full.fa],'dismantle').reason,/材料/);assert.equal(full.s.act({type:'dismantleGear',ids:[full.fa]},0).reason,'material-capacity');assert.equal(full.disk.raw,raw)
 assert.equal(f.s.act(quote.action,0).ok,true)
 for(const m of quote.materials)assert.equal(f.s.state.pills[m.id],before.pills[m.id]+m.count)
 assert.equal(f.s.state.spiritStones,before.spiritStones)
})
