import test from 'node:test'
import assert from 'node:assert/strict'
import {primaryAttributes} from '../js/xianxia/TowerCharacterStats.js'
import {stats,TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {TowerCampaignStore,combatLoadout,campaignMaxHp,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {equipmentCastSpeed} from '../js/xianxia/TowerSkillTiming.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {budgetRows,definitions} from '../scripts/lib/equipment-budget.mjs'

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
function fixture(){
 const data=new Map()
 const disk={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 return {data,disk,store:new TowerCampaignStore(disk,0)}
}
test('sword starts with explicit vitality and distinct physical/magic attack',()=>{
 const {store}=fixture(),l=combatLoadout(store.state)
 assert.deepEqual(primaryAttributes(0,l),{strength:110,intelligence:90,awareness:100,vitality:10,maxMana:100,manaRegen:3})
 const s=stats(0,l)
 assert.equal(s.attack,115);assert.equal(s.magicAttack,95)
 assert.equal(s.maxHp,100);assert.equal(campaignMaxHp(store.state),100)
})
test('all sword level boundaries preserve HP and hybrid baseline without double growth',()=>{
 const l=combatLoadout(fixture().store.state)
 for(let level=1;level<=30;level++){
  const xp=cultivationLevelXp(level),g=cultivationAt(xp),s=stats(xp,l)
  near(s.strength,110*g.attackMultiplier);near(s.intelligence,90*g.attackMultiplier)
  near(s.vitality,10*g.attackMultiplier);near(s.maxHp,g.maxHp)
  near((s.attack+s.magicAttack)/2,100*g.attackMultiplier+5)
  near(s.awareness,99+level);near(equipmentCastSpeed(l,xp),(level-1)/100)
 }
})
test('reserved class can be calculated but cannot start a sword battle',()=>{
 const l={...combatLoadout(fixture().store.state),classId:'body'}
 assert.equal(primaryAttributes(0,l).vitality,14)
 assert.equal(stats(0,l).maxHp,140)
 assert.equal(equipmentCastSpeed(l,0),0)
 assert.throws(()=>new TowerRun({attemptId:1,floor:1,xp:0,hp:100,loadout:l}),/Invalid tower attempt/)
 assert.throws(()=>primaryAttributes(0,{...l,classId:'unknown'}),/class/i)
})
test('new campaign and restored paused snapshot keep class identity',()=>{
 const {store,disk}=fixture()
 assert.equal(store.state.classId,'sword')
 const entered=store.act({type:'startFloor',floor:1,seed:41},0)
 assert.equal(entered.ok,true);assert.equal(entered.snapshot.loadout.classId,'sword')
 const run=TowerRun.restore(entered.snapshot)
 run.advance(1/60);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},100).ok,true)
 assert.equal(new TowerCampaignStore(disk,100).state.activeRun.snapshot.loadout.classId,'sword')
 for(const classId of ['body','unknown',null]){
  const bad=run.snapshot();bad.loadout.classId=classId
  assert.equal(validateTowerSnapshot(bad),false)
  assert.equal(store.act({type:'checkpoint',snapshot:bad},100).ok,false)
 }
 const before=JSON.stringify(store.state)
 const save=disk.setItem;disk.setItem=()=>{throw Error('disk full')}
 run.resume();run.advance(1/60);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},200).ok,false)
 assert.equal(JSON.stringify(store.state),before);disk.setItem=save
})
test('previous campaign schema resets only this mode',()=>{
 const {store,disk,data}=fixture()
 store.act({type:'sync'},0)
 const record=JSON.parse(data.get(TOWER_CAMPAIGN_KEY))
 record.schema--;const state=JSON.parse(record.data);delete state.classId
 record.data=JSON.stringify(state);record.checksum=checksum(record.data)
 data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(record));data.set('another-game','keep')
 const restored=new TowerCampaignStore(disk,0)
 assert.equal(restored.state.classId,'sword')
 assert.equal(restored.state.hp,100)
 assert.equal(data.get('another-game'),'keep')
})
test('offline equipment budget normalizes each channel against its class baseline',()=>{
 const w=definitions.find(d=>d.category==='weapon'&&d.quality===1)
 const a=definitions.find(d=>d.category==='armor'&&d.quality===0)
 const r=definitions.find(d=>d.category==='ring'&&d.quality===0)
 const xp=cultivationLevelXp(w.minLevel),g=cultivationAt(xp).attackMultiplier
 const rows=budgetRows(w,w.minLevel,a,r,0)
 const physical=110*g+w.base.physicalAttack+(w.base.strength??0)
 const magic=90*g+w.base.magicAttack+(w.base.intelligence??0)
 near(rows.find(row=>row.channel==='qi').coefficient/rows.find(row=>row.channel==='magic').coefficient,
  (physical/(110*g+5))/(magic/(90*g+5)))
})
test('paused loadout updates inherit identity but cannot change it or erase it from snapshots',()=>{
 const {store}=fixture(),entered=store.act({type:'startFloor',floor:1,seed:7},0)
 const run=TowerRun.restore(entered.snapshot);run.pause()
 const update=structuredClone(run.state.loadout);delete update.classId
 run.setGrowthLoadout(update)
 assert.equal(run.state.loadout.classId,'sword')
 run.setEquipmentLoadout(update)
 assert.equal(run.state.loadout.classId,'sword')
 assert.ok(validateTowerSnapshot(run.snapshot()))
 for(const method of ['setGrowthLoadout','setEquipmentLoadout']){
  assert.throws(()=>run[method]({...update,classId:'body'}))
  assert.equal(run.state.loadout.classId,'sword')
 }
 const erased=run.snapshot();delete erased.loadout.classId
 assert.equal(validateTowerSnapshot(erased),false)
})
