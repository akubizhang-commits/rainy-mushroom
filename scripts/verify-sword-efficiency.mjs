// Observe the existing replay driver without changing combat state or RNG.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {skillManaCost} from '../js/xianxia/TowerCharacterStats.js'

const output=process.argv.find(a=>a.startsWith('--detail='))?.slice(9)
assert.ok(output,'--detail=<new evidence file> is required')
assert.ok(!fs.existsSync(output),'Refusing to overwrite evidence')
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const selfHash=hash('scripts/verify-sword-efficiency.mjs')
const records=new Map(),originals={}
function row(run){
  if(!records.has(run))records.set(run,{attemptId:run.state.attemptId,floor:run.state.floor,
    skills:{},damage:{},releases:[],launched:new Set(),hits:new Set(),allTargetHits:new Set(),
    paidStarts:new Set(),paidLaunched:new Set(),paidDirectBossDamage:0,
    entryShots:new Set(run.state.projectiles.map(p=>p.id))})
  return records.get(run)
}
function wrap(name,observe){
  const original=originals[name]=TowerRun.prototype[name]
  TowerRun.prototype[name]=function(...args){return observe.call(this,original,args)}
}
wrap('_startSkillAction',function(original,args){
  const r=row(this),id=args[0],s=this.state
  const form=id==='evo_wanjian'?id:this._castForm({skill:id,level:s.loadout.active[id],castContext:{loadout:s.loadout}}).id
  const entry=r.skills[form]??={casts:0,mana:0,maxWait:0,readySwords:[]}
  entry.casts++;entry.mana+=skillManaCost(form)
  entry.maxWait=Math.max(entry.maxWait,s.time-(s.actions.waiting[id]??s.time))
  if(form==='sj_yujian'){entry.readySwords.push(s.yujian.ready);r.paidStarts.add(s.time)}
  return original.apply(this,args)
})
wrap('_releaseGrowthSkill',function(original,args){
  const c=args[0],r=row(this),before=this.state.projectiles.length
  const result=original.apply(this,args)
  if(c.skill==='sj_yujian'&&c.formId!=='evo_wanjian'){
    const shots=this.state.projectiles.slice(before).filter(p=>p.yujianSlot!==undefined)
    r.releases.push({at:this.state.time,reserved:c.swordCount,launched:shots.length})
    for(const p of shots){
      r.launched.add(p.id)
      if(r.paidStarts.has(c.startedAt))r.paidLaunched.add(p.id)
    }
  }
  return result
})
wrap('_effect',function(original,args){
  if(args[0]==='hit'){
    const r=row(this),data=args[4],target=this.state.enemies.find(e=>e.id===data?.targetId)
    if(target&&data.source==='sj_yujian'&&data.impact?.castId){
      r.allTargetHits.add(data.impact.castId)
      if(target.role==='boss'&&!target.temporary&&r.paidLaunched.has(data.impact.castId))
        r.paidDirectBossDamage+=data.damage
    }
    if(target&&!target.temporary){
      const d=r.damage[data.source]??={all:0,boss:0,hits:0}
      d.all+=data.damage;d.hits++;if(target.role==='boss')d.boss+=data.damage
      if(data.source==='sj_yujian'&&data.impact?.castId)r.hits.add(data.impact.castId)
    }
  }
  return original.apply(this,args)
})
try{
  await import('./verify-mana-queue.mjs')
}finally{
  for(const [name,original] of Object.entries(originals))TowerRun.prototype[name]=original
}
const rows=[...records.entries()].map(([run,r])=>{
  const skill=r.skills.sj_yujian
  const observedHits=[...r.hits].filter(id=>r.launched.has(id)).length
  return {...r,launched:r.launched.size,hits:r.hits.size,entryShots:r.entryShots.size,observedHits,
    allTargetHits:[...r.allTargetHits].filter(id=>r.launched.has(id)).length,
    paidStarts:r.paidStarts.size,paidLaunched:r.paidLaunched.size,
    unresolved:[...r.launched].filter(id=>!r.hits.has(id)&&run.state.projectiles.some(p=>p.id===id&&p.dissolveAt===null)).length,
    meanReadySwordsPerCast:skill?skill.readySwords.reduce((a,b)=>a+b,0)/skill.casts:0,
    meanPaidLaunchedSwordsPerCast:skill?r.paidLaunched.size/skill.casts:0,
    windowDirectBossDamagePerMana:skill?(r.damage.sj_yujian?.boss??0)/skill.mana:0,
    paidDirectBossDamagePerMana:skill?r.paidDirectBossDamage/skill.mana:0}
})
fs.writeFileSync(output,JSON.stringify({selfHash,sourceStable:selfHash===hash('scripts/verify-sword-efficiency.mjs'),
  method:'Actual skill starts, releases and hit receipts. Direct damage excludes bleed and attached weapon damage; those remain separate sources. Paid cohort excludes entry casts/projectiles but ends at Boss death (pending shots have not settled). Window ratio may include prepaid entry damage. Native observedHits excludes temporary actors; allTargetHits includes them. No per-source causal attribution of shared bleed.',
  rows},null,2)+'\n')
