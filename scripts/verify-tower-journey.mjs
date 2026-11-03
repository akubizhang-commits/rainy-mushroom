// Deterministic, unmodified combat with a deliberately simple movement policy.
// This verifies progression transactions; it is not a human difficulty verdict.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'

const reportDir = 'docs/xianxia/reports/tower-functional-alpha-2026-10-27'
mkdirSync(reportDir, { recursive: true })
const plain = { active: { sj_yujian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
function steer(run, pursue = false) {
  const p = run.state.player, theta = run.state.time * .24
  let dx = 33 + 490 * Math.cos(theta) - p.x, dy = -60 + 490 * Math.sin(theta) - p.y
  const d = Math.max(1, Math.hypot(dx, dy)); dx /= d; dy /= d
  const near = [...run.state.enemies].sort((a, b) =>
    Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]
  if (pursue && near) {
    const distance = Math.hypot(near.x - p.x, near.y - p.y)
    if (distance > 250) { dx = (near.x - p.x) / distance; dy = (near.y - p.y) / distance }
  }
  for (const e of run.state.enemies) {
    const distance = Math.hypot(p.x - e.x, p.y - e.y)
    if (distance < 135) {
      dx += (p.x - e.x) / Math.max(1, distance) * (135 - distance) / 45
      dy += (p.y - e.y) / Math.max(1, distance) * (135 - distance) / 45
    }
  }
  if (pursue && (run.state.zones.some(z=>z.hostile) || run.state.projectiles.some(b=>b.hostile))) {
    const norm=Math.max(1,Math.hypot(dx,dy)), bx=dx/norm, by=dy/norm
    let best=-Infinity, chosen={x:bx,y:by}
    for(let i=0;i<24;i++){
      const x=Math.cos(i*Math.PI/12),y=Math.sin(i*Math.PI/12)
      let score=x*bx+y*by
      for(const lead of [.25,.5,.85]){
        const q={x:p.x+x*p.moveSpeed*lead,y:p.y+y*p.moveSpeed*lead}
        if(q.x < -860 || q.x > 925 || q.y < -1080 || q.y > 960)score-=15
        for(const z of run.state.zones.filter(z=>z.hostile)){
          let danger=false
          if(z.shape==='capsule'){
            const ax=z.x,ay=z.y,ex=z.toX-ax,ey=z.toY-ay
            const t=Math.max(0,Math.min(1,((q.x-ax)*ex+(q.y-ay)*ey)/(ex*ex+ey*ey||1)))
            danger=Math.hypot(q.x-ax-t*ex,q.y-ay-t*ey)<(z.width||24)/2+28
          }else if(z.shape==='sector'){
            const ex=q.x-z.x,ey=q.y-z.y,d=Math.hypot(ex,ey)
            danger=d<(Math.hypot(z.toX-z.x,z.toY-z.y)||z.radius)+22
              && (ex*z.faceX+ey*z.faceY)/(d||1)>Math.cos((z.angle||90)*Math.PI/360)
          }else danger=Math.hypot(q.x-z.x,q.y-z.y)<z.radius+28
          if(danger)score-=8
        }
        for(const b of run.state.projectiles.filter(b=>b.hostile)){
          if(Math.hypot(q.x-b.x-(b.vx||0)*lead,q.y-b.y-(b.vy||0)*lead)<(b.radius||8)+25)score-=8
        }
      }
      if(score>best){best=score;chosen={x,y}}
    }
    dx=chosen.x;dy=chosen.y
  }
  run.setInput(dx, dy)
}
function play(run, pursue, checkpoint) {
  let checked = false
  for (let i = 0; i < 1800 * 30 && run.state.phase === 'playing'; i++) {
    if (pursue) {
      const p=run.state.player
      run.setViewport({xmin:p.x-352,xmax:p.x+352,ymin:p.y-506,ymax:p.y+511})
    }
    steer(run, pursue)
    run.advance(1 / 30)
    if (!checked && run.state.time >= 80) {
      run.pause()
      const snapshot = run.snapshot()
      assert.ok(validateTowerSnapshot(snapshot))
      const reloaded = TowerRun.restore(snapshot)
      assert.deepEqual(reloaded.snapshot(), snapshot)
      checkpoint?.(snapshot)
      run = reloaded; run.resume(); checked = true
    }
  }
  return run
}
const baseline = [1, 7, 43].map(seed => {
  const run = play(new TowerRun({attemptId:1, floor:1, seed, hp:100, xp:0, loadout:plain}), false)
  const s = run.state
  assert.equal(s.phase, 'won')
  assert.equal(s.killLedger.length, 378)
  assert.deepEqual(s.earned, { xp:452, cores:63, contribution:100 })
  return { seed, seconds:s.time, hp:s.player.hp, kills:s.killLedger.length, earned:s.earned }
})

const data = new Map(), storage = { getItem:k => data.get(k) ?? null, setItem:(k,v) => data.set(k,v) }
let now = 0, store = new TowerCampaignStore(storage, now)
const act = action => store.act(action, now)
assert.ok(act({type:'sync'}).ok)
const journey = []
for (let floor = 1; floor <= 9; floor++) {
  let cleared = false
  for (let attempt = 1; attempt <= 8 && !cleared; attempt++) {
    // Purchases use only starter grants and actually earned resources.
    const priorities = [
      ['sj_wanjian',2],['sj_yujian',2],['sj_arc',1],['vajra',1],
      ['sj_yujian',5],['sj_wanjian',5],['sj_arc',5],['sj_line',5],
      ['vajra',5],['sj_heart',5],['sj_bone',5],
    ]
    for (const [id,target] of priorities) {
      while ((store.state.skills[id] || 0) < target) if (!act({type:'buyBook',id}).ok) break
    }
    const loadout = JSON.parse(JSON.stringify(store.state.loadouts[0]))
    loadout.active = ['sj_yujian','sj_wanjian','sj_arc','sj_line'].filter(id=>store.state.skills[id])
    loadout.passive = ['vajra','sj_heart','sj_bone'].filter(id=>store.state.skills[id])
    assert.ok(act({type:'setLoadout',index:0,loadout}).ok)
    if (store.state.contribution > 150) act({type:'refineWeapon',id:'eq_sword_suwen'})
    for (let i=0;i<2 && store.state.hp<cultivationAt(store.state.xp).maxHp;i++) {
      if (!store.state.pills.huichun) assert.ok(act({type:'buyPill',id:'huichun',count:1}).ok)
      assert.ok(act({type:'usePill',id:'huichun'}).ok)
    }
    const started = act({type:'startFloor',floor,seed:43+attempt})
    assert.ok(started.ok, started.reason)
    let run = play(TowerRun.restore(started.snapshot), true, snapshot => {
      now += 80000
      assert.ok(act({type:'checkpoint',snapshot}).ok)
      store = new TowerCampaignStore(storage, now)
      assert.equal(store.readOnly,false)
      assert.deepEqual(store.state.activeRun.snapshot,snapshot)
    })
    if (run.state.phase === 'playing') run.abandon()
    now += Math.ceil(Math.max(0,run.state.time-80)*1000)
    const before = {...store.state}, snapshot = run.snapshot()
    const finished = act({type:'finishFloor',snapshot})
    assert.ok(finished.ok,finished.reason)
    assert.equal(act({type:'finishFloor',snapshot}).ok,false,'no duplicate settlement')
    assert.ok(store.state.cores>=before.cores && store.state.contribution>=before.contribution)
    cleared = snapshot.phase==='won'
    journey.push({floor,attempt,outcome:snapshot.phase,seconds:snapshot.time,hp:store.state.hp,
      xp:store.state.xp,earned:finished.earned,skills:{...store.state.skills}})
    if (snapshot.phase==='lost') assert.equal(store.state.hp,1)
    store = new TowerCampaignStore(storage,now)
    assert.equal(store.readOnly,false)
  }
  if (!cleared) break
}
const report = {kind:'unmodified-combat bot smoke; not human balance acceptance',baseline,journey,
  clearedFloor:store.state.clearedFloor,finalXp:store.state.xp,finalWallet:{cores:store.state.cores,contribution:store.state.contribution},
  finalSkills:store.state.skills}
writeFileSync(`${reportDir}/journey.json`, JSON.stringify(report,null,2))
console.log(JSON.stringify({baseline:baseline.map(v=>({seconds:v.seconds,hp:v.hp})),
  journey:journey.map(({floor,attempt,outcome,seconds})=>({floor,attempt,outcome,seconds})),
  clearedFloor:store.state.clearedFloor},null,2))
