// Diagnostic observers only. Never write to run.state or consume combat RNG.
import { monsterDamageMultiplier } from '../../js/xianxia/TowerMonsterMechanics.js'
import { pillarSight } from '../../js/xianxia/TowerObstacles.js'
import { equipmentAttackProfile } from '../../js/xianxia/TowerSkillTiming.js'
import { nextSkillCandidate } from '../../js/xianxia/TowerAttackActions.js'
import { skillManaCost } from '../../js/xianxia/TowerCharacterStats.js'

export function actionEnvelope(run) {
  const s=run.state, loadout=s.loadout
  let reach=loadout.weapon&&loadout.weaponEquipped!==false?equipmentAttackProfile(loadout).reach:0
  for(const [id,level] of Object.entries(loadout.active)){
    const form=run._castForm({skill:id,level,castContext:{loadout}})
    let r=form.shape==='cross'?Math.hypot(form.width,form.width/2)+form.bladeWidth/2
      :form.shape==='sector'?form.radius
      :form.shape==='orbit'?form.radius+form.bladeLength/2:form.reach
    if(id==='sj_yujian')r*=1+run._passive('sj_spirit','reach_bonus')
    reach=Math.max(reach,Number.isFinite(r)?r:0)
  }
  if(loadout.evolutions.includes('evo_wanjian'))reach=Math.max(reach,440)
  return reach
}

export class BossTiming {
  constructor({onBoss=()=>{}}={}) { this.rows=new Map();this.frames=new WeakMap();this.onBoss=onBoss }
  key(s,e){return `${s.attemptId}:${s.floor}:${e.id}`}
  discover(run){
    const s=run.state
    for(const e of s.enemies.filter(e=>e.role==='boss'&&!e.temporary&&e.hp>0)){
      const key=this.key(s,e)
      if(this.rows.has(key))continue
      const row={key,floor:s.floor,attemptId:s.attemptId,id:e.id,archetype:e.archetype,
        spawnAt:s.time,maxHp:e.maxHp,entryXp:s.player.xp,entryMana:s.player.mana,
        entryLoadout:structuredClone(s.loadout),seconds:0,damage:0,healing:0,damageBySource:{},
        geometry:{mechanicZero:0,outsideEnvelope:0,lineBlocked:0,withinEnvelopeLineClear:0},
        armorSeconds:0,vulnerableSeconds:0,bodyBusySeconds:0,manaBlockedSeconds:0,
        manaBlockedBySkill:{},manaSpent:0,pillUses:0,offBossDamage:0,
        longestHitGap:0,lastHitAt:s.time,endedAt:null,killed:false}
      this.rows.set(key,row);this.onBoss(run,row)
    }
  }
  before(run){
    this.discover(run)
    const s=run.state,envelope=actionEnvelope(run)
    const bosses=s.enemies.filter(e=>e.role==='boss'&&!e.temporary&&e.hp>0).map(e=>{
      const multiplier=monsterDamageMultiplier(run,e)
      const geometry=multiplier<=0?'mechanicZero'
        :Math.hypot(e.x-s.player.x,e.y-s.player.y)>envelope+e.radius?'outsideEnvelope'
        :s.arenaVersion===1&&!pillarSight(s.player,e)?'lineBlocked':'withinEnvelopeLineClear'
      return {e,row:this.rows.get(this.key(s,e)),hp:e.hp,multiplier,geometry,damage:0}
    })
    this.frames.set(run,{time:s.time,bosses,blocked:null,
      busy:s.actions?.busyUntil>s.time,spent:s.manaState.spent,pills:s.spiritState.uses.length,offBoss:0})
  }
  // Called exactly where the production scheduler falls back to a basic attack.
  basicFallback(run){
    const f=this.frames.get(run),s=run.state
    if(!f?.bosses.length||!s.actions)return
    const chosen=nextSkillCandidate(s.actions,s.time,run._basicReady())
    if(!chosen)return
    const formId=chosen==='evo_wanjian'?chosen:run._castForm({
      skill:chosen,level:s.loadout.active[chosen],castContext:{loadout:s.loadout}}).id
    if(s.player.mana<skillManaCost(formId))f.blocked=formId
  }
  damage(run,e,amount,hit){
    const f=this.frames.get(run)
    if(!f?.bosses.length||amount<=0)return
    const b=f.bosses.find(b=>b.e.id===e.id)
    if(!b){f.offBoss+=amount;return}
    const row=b.row,source=hit.impact?.skill??hit.source??'unknown'
    b.damage+=amount;row.damage+=amount
    row.damageBySource[source]=(row.damageBySource[source]??0)+amount
    row.longestHitGap=Math.max(row.longestHitGap,run.state.time-row.lastHitAt)
    row.lastHitAt=run.state.time
  }
  after(run){
    const f=this.frames.get(run),s=run.state,dt=s.time-f.time
    for(const b of f.bosses){
      const r=b.row
      r.seconds+=dt;r.geometry[b.geometry]+=dt
      if(b.multiplier<1)r.armorSeconds+=dt
      if(b.multiplier>1)r.vulnerableSeconds+=dt
      if(f.busy)r.bodyBusySeconds+=dt
      if(f.blocked){
        r.manaBlockedSeconds+=dt
        r.manaBlockedBySkill[f.blocked]=(r.manaBlockedBySkill[f.blocked]??0)+dt
      }
      r.healing+=Math.max(0,b.e.hp-b.hp+b.damage)
      r.manaSpent+=s.manaState.spent-f.spent
      r.pillUses+=s.spiritState.uses.length-f.pills
      r.offBossDamage+=f.offBoss
      r.longestHitGap=Math.max(r.longestHitGap,s.time-r.lastHitAt)
      if(b.e.hp<=0){r.killed=true;r.endedAt=s.time}
      else if(!['playing','paused'].includes(s.phase))r.endedAt=s.time
    }
    this.discover(run)
  }
  terminal(run){
    const s=run.state
    if(['playing','paused'].includes(s.phase))return
    for(const r of this.rows.values()){
      if(r.attemptId!==s.attemptId||r.floor!==s.floor||r.endedAt!==null)continue
      r.endedAt=s.time;r.outcome=s.phase
      r.longestHitGap=Math.max(r.longestHitGap,s.time-r.lastHitAt)
    }
  }
  results(){return [...this.rows.values()]}
}

export function installBossTiming(TowerRun,probe){
  const originals={advance:TowerRun.prototype.advance,basic:TowerRun.prototype._startBasic,
    damage:TowerRun.prototype._damageEnemy,abandon:TowerRun.prototype.abandon}
  TowerRun.prototype.advance=function(...args){
    probe.before(this)
    const result=originals.advance.apply(this,args)
    probe.after(this);return result
  }
  TowerRun.prototype._startBasic=function(...args){
    probe.basicFallback(this);return originals.basic.apply(this,args)
  }
  TowerRun.prototype._damageEnemy=function(hit){
    const e=this.state.enemies.find(e=>e.id===hit.target&&e.hp>0),hp=e?.hp
    const result=originals.damage.call(this,hit)
    if(e)probe.damage(this,e,Math.max(0,hp-e.hp),hit)
    return result
  }
  TowerRun.prototype.abandon=function(...args){
    const result=originals.abandon.apply(this,args);probe.terminal(this);return result
  }
  return ()=>{TowerRun.prototype.advance=originals.advance;TowerRun.prototype._startBasic=originals.basic;
    TowerRun.prototype._damageEnemy=originals.damage;TowerRun.prototype.abandon=originals.abandon}
}
