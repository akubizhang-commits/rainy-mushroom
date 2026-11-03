// Headless real-combat QA, not a human playability or GPU/FPS verdict.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'
import { skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { webEscape } from './verify-tower-growth-balance.mjs'

const output = new URL('../docs/xianxia/reports/growth-feedback-2026-10-30/', import.meta.url)
const priorities = [['sj_yujian',3],['sj_arc',2],['sj_line',3],['sj_wanjian',2],
  ['sj_shadow',2],['sj_formation',2],['sj_yujian',10],['sj_arc',6],['vajra',3]]
const xpAt = level => level === 1 ? 0 : 30*(level-1)+15*(level-1)**2
const rounded = n => Math.round(n*1000)/1000
const report = { kind:'real combat with scripted movement, no assist', natural:[], fixtures:[] }
function context(floor = 1) {
  const memory=new Map()
  const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}
  let store=new TowerCampaignStore(storage,0)
  if(floor>1){
    const s=structuredClone(store.state)
    s.xp=xpAt((floor-1)*3+1);s.hp=cultivationAt(s.xp).maxHp;s.clearedFloor=floor-1
    s.tutorialWaves=floor===2?1:3
    s.skills=floor===2?{sj_yujian:1,sj_arc:1}:{sj_yujian:1,sj_arc:1,sj_wanjian:1}
    s.spiritStones=5000
    const weapon=rollWeapon(floor>=7?'xuan':'huang',2,()=>.4,'weapon-1')
    s.weapons[weapon.id]=weapon;s.weaponSequence=1;s.weaponCounters[weapon.id]=0
    s.loadouts[0].weaponId=weapon.id
    const data=JSON.stringify(s)
    storage.setItem(TOWER_CAMPAIGN_KEY,JSON.stringify({format:'xianxia-sect-tower-campaign',
      schema:11,data,checksum:checksum(data)}))
    store=new TowerCampaignStore(storage,0)
    assert.equal(store.readOnly,false,store.error)
  }
  return {store,storage}
}
function learn(store,inTower=false){
  for(const [id,max] of priorities)while((store.state.skills[id]||0)<max){
    if(!skillRequirement(store.state,id,{inTower}).ok)break
    if(!store.act({type:'learnSkill',id},0).ok)break
  }
}
function combat(ctx,floor,seed){
  learn(ctx.store)
  const start=ctx.store.act({type:'startFloor',floor,seed},0)
  assert.equal(start.ok,true,start.reason)
  let run=TowerRun.restore(ctx.store.state.activeRun.snapshot)
  const entry={xp:ctx.store.state.xp,skills:{...ctx.store.state.skills},weapon:run.state.loadout.weapon}
  const waves=[],times=[]
  let previousWave=0,previousLevel=cultivationAt(run.state.player.xp).level
  while(run.state.phase==='playing'&&run.state.time<1200){
    webEscape(run,true)
    const p=run.state.player
    run.setViewport({xmin:p.x-422,xmax:p.x+422,ymin:p.y-195,ymax:p.y+195})
    const begin=performance.now()
    run.advance(1/60)
    times.push(performance.now()-begin)
    const level=cultivationAt(run.state.player.xp).level
    if(run.state.clearedWaves.length!==previousWave){
      previousWave=run.state.clearedWaves.length
      waves.push({wave:previousWave,seconds:rounded(run.state.time),xp:run.state.player.xp,
        skills:{...run.state.loadout.active}})
    }
    if((level!==previousLevel || waves.at(-1)?.seconds===rounded(run.state.time))
      &&run.state.phase==='playing'){
      previousLevel=level
      run.pause()
      assert.equal(ctx.store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
      learn(ctx.store,true)
      run=TowerRun.restore(ctx.store.state.activeRun.snapshot);run.resume()
    }
  }
  if(run.state.phase==='playing')run.abandon()
  const snapshot=run.snapshot()
  assert.ok(validateTowerSnapshot(snapshot),'real combat snapshot valid')
  assert.equal(ctx.store.act({type:'finishFloor',snapshot},0).ok,true)
  const restored=new TowerCampaignStore(ctx.storage,0)
  assert.equal(restored.readOnly,false,restored.error)
  assert.deepEqual(restored.state,ctx.store.state)
  times.sort((a,b)=>a-b)
  const result={floor,seed,outcome:run.state.phase,seconds:rounded(run.state.time),
    clearedWaves:previousWave,xp:run.state.player.xp,entry,waves,
    advanceMs:{p95:rounded(times[Math.floor(times.length*.95)]),max:rounded(times.at(-1))}}
  console.log(JSON.stringify({floor,seed,outcome:result.outcome,seconds:result.seconds,waves:previousWave}))
  return result
}
mkdirSync(output,{recursive:true})
const flush=()=>writeFileSync(new URL('combat-after.json',output),JSON.stringify(report,null,2)+'\n')
for(let floor=1;floor<=9;floor++)context(floor) // validate fixtures before lengthy combat
for(const seed of (process.argv.includes('--fixtures-only') ? [] : [1,7])){
  const ctx=context()
  const journey={seed,attempts:[]}
  report.natural.push(journey)
  for(let attempt=0;attempt<12&&ctx.store.state.clearedFloor<9;attempt++){
    // Real consumables only; no virtual camp waiting or raw HP writes.
    for(let n=0;n<2&&ctx.store.state.hp<cultivationAt(ctx.store.state.xp).maxHp;n++){
      if(!ctx.store.state.pills.huichun)
        if(!ctx.store.act({type:'buyPill',id:'huichun',count:1},0).ok)break
      assert.equal(ctx.store.act({type:'usePill',id:'huichun'},0).ok,true)
    }
    const floor=ctx.store.state.clearedFloor+1
    journey.attempts.push(combat(ctx,floor,seed+attempt));flush()
  }
  journey.clearedFloor=ctx.store.state.clearedFloor
  flush()
}
// Independent authored-entry fixtures cover all floors even if a natural bot
// stalls. Levels, granted money and rolled mid-quality weapons are disclosed.
for(let floor=1;floor<=9;floor++){report.fixtures.push(combat(context(floor),floor,43));flush()}
report.sourceHashes=Object.fromEntries(await Promise.all(
  ['Run','Growth','Profile','Weapons','Content','Campaign','SkillForms','CultivationRewards'].map(async n=>{
    const bytes=await readFile(new URL(`../js/xianxia/Tower${n}.js`,import.meta.url))
    return [`Tower${n}.js`,createHash('sha256').update(bytes).digest('hex')]
  })))
await mkdir(output,{recursive:true})
await writeFile(new URL('combat-after.json',output),JSON.stringify(report,null,2)+'\n')
