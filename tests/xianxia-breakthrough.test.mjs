import test from 'node:test'
import assert from 'node:assert/strict'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
const xpAt=cultivationLevelXp
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
function disk(){return {value:null,fail:false,writes:0,getItem(){return this.value},setItem(k,v){
 assert.equal(k,TOWER_CAMPAIGN_KEY);if(this.fail)throw Error('disk');this.value=v;this.writes++
}}}
test('27 minor steps and two breakthroughs compound attack and HP independently without rounding',()=>{
 for(let l=1;l<=30;l++){
  const c=cultivationAt(xpAt(l))
  assert.equal(c.level,l)
  if(l>1){
   const previous=cultivationAt(xpAt(l)-1),major=l===11||l===21
   assert.equal(previous.level,l-1)
   near(c.attackMultiplier/previous.attackMultiplier,major?1.35:1.08)
   near(c.maxHp/previous.maxHp,major?1.35:1.08)
  }
 }
 near(cultivationAt(14400).maxHp,100*1.08**27*1.35**2)
 near(cultivationAt(14400).attackMultiplier,1.08**27*1.35**2)
})

test('actual kill reaches Qi ten without automatically promoting to Foundation',()=>{
 const state=new TowerCampaignStore(disk(),0).state
 const r=new TowerRun({attemptId:1,floor:1,seed:7,xp:1484,hp:37,loadout:combatLoadout(state)})
 const before=r.state.player.attack,skills=structuredClone(r.state.loadout)
 for(let i=0;i<1200&&r.state.player.xp<1485;i++){
  for(const e of r.state.enemies){e.hp=1;e.x=r.state.player.x+60;e.y=r.state.player.y;e.ai.graceUntil=9999}
  r.advance(1/60)
 }
 assert.ok(r.state.player.xp>=1485);near((r.state.player.attack-5)/(before-5),1.08)
 assert.equal(cultivationAt(r.state.player.xp).realm,'炼气')
 assert.ok(r.state.player.hp<r.state.player.maxHp);assert.deepEqual(r.state.loadout,skills)
 assert.equal(validateTowerSnapshot(r.snapshot()),true)
})
