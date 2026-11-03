import test from 'node:test'
import assert from 'node:assert/strict'
import * as Timing from '../js/xianxia/TowerSkillTiming.js'
import * as Actions from '../js/xianxia/TowerAttackActions.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { createIronWeapon } from '../js/xianxia/TowerWeapons.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'

test('cast schedule scales body phases but does not include independent effect lifetime', () => {
  assert.equal(typeof Timing.castActionTiming, 'function')
  const normal = Timing.castActionTiming('sj_line', 3, 0)
  const fast = Timing.castActionTiming('sj_line', 3, 1)
  assert.deepEqual(normal.releases, [21, 31, 41].map(t => t / 60))
  assert.equal(normal.duration, 45 / 60)
  assert.equal(fast.releases.length, 3)
  assert.ok(fast.duration < normal.duration)
  assert.equal(Timing.castActionTiming('evo_sixiang', 9, 0).releases.length, 1)
  assert.equal(Timing.castActionTiming('evo_sixiang', 9, 0).duration, .55)
  assert.throws(() => Timing.castActionTiming('sj_line', 1, NaN))
})

test('eligible skills age while busy; oldest wins and basic retains one bypass', () => {
  assert.equal(typeof Actions.updateSkillCandidates, 'function')
  const a = Actions.newAttackActions()
  a.busyUntil = 1
  Actions.updateSkillCandidates(a, ['sj_line'], .2)
  Actions.updateSkillCandidates(a, ['sj_arc', 'sj_line'], .5)
  assert.equal(Actions.nextSkillCandidate(a, 1, false), 'sj_line')
  Actions.startSkillAction(a, 1, .5, 'sj_line', true)
  assert.equal(Actions.nextSkillCandidate(a, 1.5, true), null)
  Actions.updateSkillCandidates(a, ['sj_arc'], 1.5)
  assert.equal(a.waiting.sj_arc, .5)
  Actions.updateSkillCandidates(a, [], 1.6)
  assert.deepEqual(a.waiting, {})
})

function fixture(active, evolution = null) {
  const weapon = createIronWeapon()
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 41, hp: 100, xp: 0, training: true,
    loadout: { growthVersion: 1, skillsInitialized: true, active, passive: {}, evolutions: evolution ? [evolution] : [],
      evolutionLevels: evolution ? { [evolution]: 2 } : {}, tutorialWaves: 0, weapon, weaponId: weapon.id,
      weaponQuality: weapon.quality, weaponRefine: 0, weaponFocusCount: 0 } })
  for (const id of Object.keys(active)) run.state.cooldowns[id] = 100
  for (let i = 0; i < 600 && !run.state.enemies.length; i++) run.advance(1 / 60)
  for (const e of run.state.enemies) e.ai.graceUntil = 9999
  const enemy = run.state.enemies[0]
  enemy.x = run.state.player.x + 220; enemy.y = run.state.player.y
  return { run, enemy }
}

test('longhong reserves one action through recovery, moves during windup and restores exactly', () => {
  const { run } = fixture({ sj_line: 1 })
  run.state.cooldowns.sj_line = 0
  run.advance(1 / 60)
  const cast = run.state.casts[0]
  assert.ok(cast)
  assert.ok(Math.abs(cast.releaseAt - cast.startedAt - .35) < 1e-8)
  assert.ok(run.state.actions.busyUntil > cast.releaseAt)
  assert.equal(validateTowerSnapshot(run.snapshot()), true)
  const restored = TowerRun.restore(run.snapshot())
  const x = run.state.player.x
  run.setInput(0, 1); restored.setInput(0, 1)
  for (let i = 0; i < 30; i++) { run.advance(1 / 60); restored.advance(1 / 60) }
  assert.equal(run.state.player.x, x)
  assert.deepEqual(restored.snapshot(), run.snapshot())
})

for (const [id, evolution] of [
  ['sj_yujian', null], ['sj_arc', null], ['sj_cross', null], ['sj_line', null],
  ['sj_shadow', null], ['sj_formation', null], ['sj_wanjian', null],
  ['sj_yujian', 'evo_wanjian'], ['sj_line', 'evo_tiandi'],
  ['sj_wanjian', 'evo_wuwo'], ['sj_formation', 'evo_sixiang'],
]) test(`${evolution ?? id}: all action phases validate and resume deterministically`, () => {
  const { run, enemy } = fixture({ [id]: 10 }, evolution)
  enemy.x = run.state.player.x + 90
  run.state.cooldowns[id] = 0
  if (evolution) run.state.cooldowns[evolution] = 0
  for (let i = 0; i < 100; i++) {
    run.advance(1 / 60)
    const snap = run.snapshot()
    assert.ok(validateTowerSnapshot(snap), `${evolution ?? id} at ${snap.time}`)
    if (i % 10 === 0) {
      const restored = TowerRun.restore(snap)
      restored.advance(1 / 60); run.advance(1 / 60)
      assert.deepEqual(restored.snapshot(), run.snapshot())
    }
  }
})

test('orbit has a real startup and only begins duration when activated', () => {
  const { run } = fixture({ sj_wanjian: 1 })
  run.state.cooldowns.sj_wanjian = 0
  run.advance(1 / 60)
  const started = run.state.time
  assert.ok(run.state.casts.length === 1)
  assert.ok((run.state.orbitUntil ?? 0) <= started)
  for (let i = 0; i < 12; i++) run.advance(1 / 60)
  assert.ok(run.state.orbitUntil > started + 4)
  assert.equal(validateTowerSnapshot(run.snapshot()), true)
})

test('skill details expose body timing separately from independent damage', () => {
  const state = structuredClone(new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state)
  state.skills.sj_formation = 1
  const view = skillPresentation(state, 'sj_formation')
  assert.equal(view.stats.find(row => row.key === 'windup')?.value, .35)
  assert.equal(view.stats.find(row => row.key === 'actionDuration')?.value, 26 / 60)
  assert.equal(view.stats.find(row => row.key === 'initialDelay')?.value, .5)
})

test('animation events carry body release and end, not delayed zone damage timing', () => {
  const { run } = fixture({ sj_formation: 1 })
  run.state.cooldowns.sj_formation = 0
  const events = []
  run.advance(1 / 60, e => events.push(e))
  const event = events.find(e => e.skill === 'sj_formation')
  assert.equal(event.bodyReleaseAt, run.state.casts[0].releaseAt)
  assert.equal(event.endsAt, run.state.actions.busyUntil)
  assert.ok(event.releaseAt > event.endsAt)
})

test('moving during convergence keeps its final strike aligned with the locked ground point', () => {
  const { run } = fixture({ sj_yujian: 10 }, 'evo_wanjian')
  run.state.cooldowns.evo_wanjian = 0
  run.setInput(0, 1)
  for (let i = 0; i < 40 && !run.state.zones.some(z => z.kind === 'sword_rain'); i++) run.advance(1 / 60)
  const z = run.state.zones.find(z => z.kind === 'sword_rain')
  assert.ok(z)
  const cross = (z.x - z.originX) * z.dirY - (z.y - z.originY) * z.dirX
  assert.ok(Math.abs(cross) < 1e-7, 'final line passes through the fixed zone center')
})

test('speed sweep preserves positive ordered phases and monotonically shortens actions', () => {
  for (const id of Object.keys(Timing.CAST_ACTIONS)) {
    let previous = Infinity
    for (const speed of [0, .1, .25, .5, 1, 2, 10, 1000]) {
      const t = Timing.castActionTiming(id, 3, speed)
      assert.ok(t.duration <= previous, `${id}/${speed}`)
      assert.ok(t.lock > 0 && t.lock <= t.windup)
      assert.ok(t.duration > t.releases.at(-1))
      for (let i = 1; i < t.releases.length; i++) assert.ok(t.releases[i] > t.releases[i - 1])
      previous = t.duration
    }
  }
})

test('cancelling an action removes pending strikes and windup art but retains an active orbit', () => {
  const { run } = fixture({ sj_line: 10 }, 'evo_tiandi')
  run.state.cooldowns.sj_line = 0
  run.advance(1 / 60)
  assert.equal(run.state.casts.length, 1)
  const windup = run.state.casts[0].windupEffectId
  assert.ok(run.state.effects.some(e => e.id === windup))
  const orbit = run.state.actions.orbit
  run._cancelBodyAction()
  assert.equal(run.state.casts.length, 0)
  assert.equal(run.state.actions.current, null)
  assert.equal(run.state.actions.basic, null)
  assert.equal(run.state.actions.orbit, orbit)
  assert.equal(run.state.actions.busyUntil, run.state.time)
  assert.ok(!run.state.effects.some(e => e.id === windup))
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('snapshot rejects nonfinite action direction and simultaneous basic and skill actions', () => {
  const { run } = fixture({ sj_line: 1 })
  run.state.cooldowns.sj_line = 0
  run.advance(1 / 60)
  const saved = run.snapshot()
  for (const mutate of [
    s => { s.actions.current.dirX = null; s.actions.current.dirY = null },
    s => { s.actions.basic = { skill: 'basic_attack' } },
  ]) {
    const bad = structuredClone(saved); mutate(bad)
    assert.equal(validateTowerSnapshot(bad), false)
  }
})
