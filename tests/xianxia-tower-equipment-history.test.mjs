import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, campaignMaxHp } from '../js/xianxia/TowerCampaign.js'
import { rollEquipment, armorModifiers } from '../js/xianxia/TowerEquipment.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { assertCurrentCampaign } from './helpers/tower-current-state.mjs'
import { checksum } from '../js/xianxia/Checksum.js'

// Exercise the Campaign trust boundary with real Run snapshots. Standalone
// validation deliberately permits some helper-built states; Campaign must also
// check their history against its last committed checkpoint.
const NOW = 1_800_000_000_000
const STEP = 1 / 60
const copy = value => JSON.parse(JSON.stringify(value))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

function fixture() {
  const records = new Map(), writes = []
  const disk = {
    getItem: key => records.get(key) ?? null,
    setItem(key, value) { writes.push({ key, value }); records.set(key, value) },
  }
  const fresh = new TowerCampaignStore(disk, NOW), state = copy(fresh.state)
  state.equipment['gear-1'] = rollEquipment('armor', 'fa', 4, () => 1 - Number.EPSILON, 'gear-1')
  state.equipment['gear-2'] = rollEquipment('ring', 'fa', 4, () => 1 - Number.EPSILON, 'gear-2')
  state.xp = 225
  state.equipmentSequence = 2
  state.equipmentDraws = { armor: 1, ring: 1 }
  state.equipmentPity = { armor: 0, ring: 0 }
  state.equipmentCounters['gear-2'] = 0
  state.loadouts[0].armorId = 'gear-1'
  state.loadouts[0].ringId = 'gear-2'
  state.hp = campaignMaxHp(state)
  const data = JSON.stringify(state)
  records.set(TOWER_CAMPAIGN_KEY, JSON.stringify({
    format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data),
  }))
  const store = new TowerCampaignStore(disk, NOW)
  assertCurrentCampaign(store,state)
  const entered = store.act({ type: 'startFloor', floor: 1, seed: 123 }, NOW)
  assert.equal(entered.ok, true, entered.reason)
  return { store, disk, records, writes, run: TowerRun.restore(entered.snapshot) }
}

function accept(store, snapshot, type = 'checkpoint') {
  assert.equal(validateTowerSnapshot(snapshot), true, 'real snapshot must remain structurally valid')
  const result = store.act({ type, snapshot }, NOW)
  assert.equal(result.ok, true, result.reason)
  return result
}

function reject(f, snapshot, type = 'checkpoint') {
  assert.equal(validateTowerSnapshot(snapshot), true,
    'this regression must reach Campaign history checks, not fail standalone shape validation')
  const before = f.store.state, records = new Map(f.records), writes = f.writes.length
  const input = copy(snapshot)
  const result = f.store.act({ type, snapshot }, NOW)
  assert.equal(result.ok, false, `Campaign accepted forged ${type} history`)
  assert.equal(typeof result.reason, 'string')
  assert.strictEqual(f.store.state, before, 'rejection cannot publish a new state')
  assert.deepEqual(f.records, records, 'rejection cannot change storage')
  assert.equal(f.writes.length, writes, 'rejection cannot attempt a save')
  assert.deepEqual(snapshot, input, 'rejection cannot rewrite its caller snapshot')
}

function advance(run, ticks) {
  for(let i=0;i<ticks;i++){
    for(const enemy of run.state.enemies)enemy.ai.graceUntil=99999
    run.advance(STEP)
  }
}
function incoming(run) {
  // One real projectile loses less HP than a complete regeneration pulse.
  // Unspent healing is not a bank that a later checkpoint may fabricate.
  run.state.projectiles.push({
    id:'history-test-hit',x:run.state.player.x,y:run.state.player.y,
    vx:0,vy:0,radius:10,damage:1,hostile:true,
    hitIds:[],expiresAt:run.state.time+1,
  })
  const before=run.state.player.hp
  advance(run,1)
  assert.ok(run.state.player.hp<before)
  assert.equal(run.state.armorState.healedTotal,0)
}
function healedFixture() {
  const f=fixture(),entryArmor=copy(f.run.state.armorState)
  incoming(f.run)
  const lost=f.run.state.player.maxHp-f.run.state.player.hp
  advance(f.run,179);f.run.pause()
  const snapshot=f.run.snapshot()
  close(snapshot.armorState.healedTotal,lost)
  close(snapshot.player.hp,snapshot.player.maxHp)
  assert.ok(lost>0)
  accept(f.store,snapshot)
  return {...f,snapshot,entryArmor}
}

for (const type of ['checkpoint', 'finishFloor']) {
  test(`armor entry-state rollback at unchanged time/HP is rejected by ${type}`, () => {
    const f = healedFixture(), forged = copy(f.snapshot)
    forged.armorState = f.entryArmor
    if (type === 'finishFloor') forged.phase = 'abandoned'
    assert.equal(forged.time, f.snapshot.time)
    assert.equal(forged.player.hp, f.snapshot.player.hp)
    reject(f, forged, type)
  })
}

test('a later tick cannot reset or fabricate regeneration without a new three-second pulse', () => {
  const f=healedFixture()
  f.run.resume();advance(f.run,1);f.run.pause()
  const later=f.run.snapshot();assert.ok(later.ticks>f.snapshot.ticks)
  for(const change of [
    s=>{s.armorState=copy(f.entryArmor)},
    s=>{s.armorState.healedTotal/=2},
    s=>{s.armorState.healedTotal+=.1},
  ]){const forged=copy(later);change(forged);reject(f,forged)}
  accept(f.store,later)
})

for (const type of ['checkpoint', 'finishFloor']) {
  test(`zero-time four-cast receipt fabrication is rejected by ${type}`, () => {
    const f = fixture(), forged = f.run.snapshot()
    assert.equal(forged.time, 0)
    assert.equal(forged.weaponState.casts.length, 0)
    const retired=copy(forged)
    Object.assign(retired.weaponState,{effectiveCasts:4,nextCastId:5,focusCount:4})
    assert.equal(validateTowerSnapshot(retired),false,'retired focus cannot be reintroduced')
    const before=f.store.state,raw=new Map(f.records),writes=f.writes.length
    assert.equal(f.store.act({type,snapshot:retired},NOW).ok,false)
    assert.equal(f.store.state,before);assert.deepEqual(f.records,raw);assert.equal(f.writes.length,writes)
    forged.weaponState.nextCastId = 5
    if (type === 'finishFloor') forged.phase = 'abandoned'
    reject(f, forged, type)
    assert.equal(f.store.state.equipmentCounters['gear-2'], 0)
  })
}

test('one elapsed tick cannot hide four fabricated casts behind a later timestamp', () => {
  const f = fixture()
  f.run.advance(STEP); f.run.pause()
  const forged = f.run.snapshot()
  assert.equal(forged.ticks, 1)
  assert.equal(Object.keys(forged.loadout.active).length, 1)
  assert.equal(forged.weaponState.casts.length, 0)
  forged.weaponState.nextCastId = 5
  reject(f, forged)
  accept(f.store, f.run.snapshot())
})

test('real cast receipt progress cannot roll back after its projectiles have expired', () => {
  const f=fixture()
  for(let i=0;i<900&&f.run.state.weaponState.nextCastId===1;i++){
    for(const e of f.run.state.enemies){e.x=f.run.state.player.x+60;e.y=f.run.state.player.y;e.ai.graceUntil=99999}
    f.run.advance(STEP)
  }
  assert.ok(f.run.state.weaponState.nextCastId>1,'must create a real cast receipt')
  assert.equal(f.run.state.weaponState.effectiveCasts,0,'retired focus effects cannot charge')
  for(const id of Object.keys(f.run.state.cooldowns))f.run.state.cooldowns[id]=99999
  // Move supported enemies beyond basic reach so no new basic receipts start.
  for(let i=0;i<300&&f.run.state.weaponState.casts.length;i++){
    for(const e of f.run.state.enemies){e.x=f.run.state.player.x+500;e.y=f.run.state.player.y;e.ai.graceUntil=99999}
    f.run.advance(STEP)
  }
  assert.equal(f.run.state.weaponState.casts.length,0)
  f.run.pause();const committed=f.run.snapshot();accept(f.store,committed)
  f.run.resume();advance(f.run,1);f.run.pause();const later=f.run.snapshot()
  for(const nextCastId of [1,committed.weaponState.nextCastId-1]){
    const forged=copy(later);forged.weaponState.nextCastId=nextCastId;reject(f,forged)
  }
  accept(f.store,later)
})

test('normal pre-pulse reload and repeated checkpoints do not duplicate regeneration', () => {
  const f = fixture()
  incoming(f.run); f.run.pause()
  const pending = f.run.snapshot(), expected = pending.player.maxHp - pending.player.hp
  const hpBefore = pending.player.hp
  accept(f.store, pending)
  accept(f.store, copy(pending))
  const loaded = new TowerCampaignStore(f.disk, NOW)
  assert.equal(loaded.readOnly, false, loaded.error)
  assert.deepEqual(loaded.state.activeRun.snapshot, pending)
  const replay = TowerRun.restore(loaded.state.activeRun.snapshot)
  replay.resume(); advance(replay,179); replay.pause()
  const healed = replay.snapshot()
  close(healed.player.hp - hpBefore, expected)
  close(healed.armorState.healedTotal, expected)
  assert.equal(healed.ticks,180)
  accept(loaded, healed)
  accept(loaded, copy(healed))
  replay.resume(); replay.advance(STEP); replay.pause()
  close(replay.state.player.hp, healed.player.hp)
  close(replay.state.armorState.healedTotal, expected)
  accept(loaded, replay.snapshot())
  replay.abandon()
  accept(loaded, replay.snapshot(), 'finishFloor')
  const records = new Map(f.records), writes = f.writes.length
  assert.equal(loaded.act({ type: 'finishFloor', snapshot: replay.snapshot() }, NOW).ok, false)
  assert.equal(f.writes.length, writes)
  assert.deepEqual(f.records, records)
})
