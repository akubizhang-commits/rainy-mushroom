import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {FLOOR01} from '../js/xianxia/TowerContent.js'
const loadout={active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
const portals=FLOOR01.arena.portals
const inPortal=(point,portal)=>portal.candidates.some(c=>c.x===point.x&&c.y===point.y)

for(const arenaVersion of [0,1])test(`all first-floor waves preserve reserved directions and recover after release (arena ${arenaVersion})`,()=>{
 for(let wave=1;wave<=20;wave++){
  const run=new TowerRun({attemptId:1,floor:1,seed:wave,hp:100,xp:0,arenaVersion,loadout}),s=run.state
  s.wave=wave;run._registerWave();s.time=100
  const unit=s.pending.find(p=>p.trigger==='start'),reserved=FLOOR01.waves[wave-1].reserved_portals
  // Isolate one authored unit; this fixture tests scheduling, not save validity.
  s.pending=[unit]
  const safe=run._spawnSafe.bind(run)
  run._spawnSafe=(point,radius,ignore)=>portals.some(p=>reserved.includes(p.id)&&inPortal(point,p))&&safe(point,radius,ignore)
  run._spawn()
  assert.equal(s.reserved.length,0,`wave ${wave}: protected direction used`)
  assert.equal(s.pending.length,1)
  assert.equal(s.pending[0].id,unit.id)
  assert.equal(s.killLedger.length,0)
  assert.deepEqual(s.earned,{xp:0,cores:0,contribution:0})
  const allowed=portals.find(p=>!reserved.includes(p.id)&&p.id!==unit.portal&&p.candidates.some(c=>safe(c,34)))
  assert.ok(allowed,`wave ${wave}: alternate allowed area exists`)
  run._spawnSafe=(point,radius,ignore)=>inPortal(point,allowed)&&safe(point,radius,ignore)
  s.time+=.25;run._spawn()
  assert.equal(s.reserved.length,1,`wave ${wave}: release must allow progress`)
  const r=s.reserved[0]
  assert.equal(r.id,unit.id)
  assert.ok(inPortal(r,allowed))
  assert.ok(Math.abs(r.readyAt-s.time-unit.warning)<1e-8)
  s.time=r.readyAt-1/60;run._spawn();assert.equal(s.enemies.length,0)
  s.time=r.readyAt;run._spawn()
  assert.equal(s.enemies.length,1);assert.equal(s.enemies[0].id,unit.id)
  assert.equal(s.pending.length,0);assert.equal(s.reserved.length,0)
 }
})

test('higher floors do not inherit first-floor reserved directions',()=>{
 for(let floor=2;floor<=9;floor++){
  const run=new TowerRun({attemptId:1,floor,seed:floor,hp:100,xp:0,loadout}),s=run.state
  s.wave=10;run._registerWave();s.time=100;s.pending=[s.pending[0]]
  const protectedOnFirstFloor=portals.find(p=>FLOOR01.waves[9].reserved_portals.includes(p.id))
  const safe=run._spawnSafe.bind(run)
  run._spawnSafe=(point,radius,ignore)=>inPortal(point,protectedOnFirstFloor)&&safe(point,radius,ignore)
  run._spawn();assert.equal(s.reserved.length,1,`floor ${floor}`)
 }
})
