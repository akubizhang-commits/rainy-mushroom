import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, GROWTH_STAGES, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { TowerRun, characterCombatAttributes, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { checksum } from '../js/xianxia/Checksum.js'

test('passives use realm-scaled costs and preserve all terminal effects', () => {
  const caps = {
    sj_spirit: { reach_bonus: .12, pickup_bonus: .5 },
    sj_heart: { crit_chance: .28 },
    sj_mark: { vulnerability: .2, icd:10 },
    sj_bone: { damage_bonus: .25, speed_bonus: .08 },
    sj_gate: { proc_damage: 1.2, radius: 110 },
    vajra: { reduction: .15 },
  }
  for (const [id, effects] of Object.entries(caps)) {
    const skill = GROWTH_SKILLS.find(s => s.id === id)
    assert.equal(skill.maxLevel, id === 'sj_gate' ? 2 : id === 'sj_mark' ? 1 : id === 'sj_spirit' ? 3 : 4)
    assert.deepEqual(skill.pointCosts, id === 'sj_gate' ? [1,1] : id === 'sj_mark' ? [1] : id === 'sj_spirit' ? [1,1,1] : ['sj_heart','sj_bone','sj_gate','vajra'].includes(id) ? [1,1,1,1] : [2,2,2,2])
    for (const [key, cap] of Object.entries(effects)) {
      if(id==='sj_mark'){assert.equal(skill[key],cap);continue}
      assert.equal(skill[key].length, skill.maxLevel)
      assert.equal(skill[key].at(-1), cap)
      assert.ok(skill[key].every((value, i, array) => id==='sj_gate'&&key==='radius' ? value === 110 : value > (array[i - 1] || 0)))
    }
  }
  assert.equal(GROWTH_SKILLS.find(s=>s.id==='sj_gate').trigger_cooldown,10)
  assert.ok(!GROWTH_SKILLS.some(s => s.id === 'magnet'))
  assert.ok(!GROWTH_STAGES.some(s => s.skillIds.includes('magnet')))
  assert.equal(skillRequirement(new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state, 'magnet').ok, false)
})

test('merged spirit pickup works in combat, character sheet, detail and restored runs', () => {
  for (const [rank, bonus] of [[0, 0], [1, .2], [2, .35], [3, .5]]) {
    const loadout = { growthVersion: 1, active: { sj_arc: 1 }, passive: rank ? { sj_spirit: rank } : {},
      evolutions: [], evolutionLevels: {}, tutorialWaves: 0, weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
    const run = new TowerRun({ attemptId: 1, floor: 1, seed: 123, hp: 30, xp: 0, loadout })
    assert.equal(characterCombatAttributes(run.state.loadout).pickupBonus, bonus)
    const player = run.state.player
    run.state.drops.push({ id: 'heal', kind: 'heal', amount: 10, radius: 0,
      x: player.x + 36 * (1 + bonus) - .01, y: player.y, expiresAt: 10 })
    run._drops()
    assert.equal(player.hp, 40)
    assert.equal(run.state.drops.length, 0)
    run.state.drops.push({ id: 'outside', kind: 'heal', amount: 10, radius: 0,
      x: player.x + 36 * (1 + bonus) + .01, y: player.y, expiresAt: 10 })
    run._drops()
    assert.equal(player.hp, 40)
    run.state.drops = []
    assert.ok(validateTowerSnapshot(run.snapshot()))
    assert.deepEqual(TowerRun.restore(run.snapshot()).snapshot(), run.snapshot())
    if (rank) {
      const state = { ...new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state,
        skills: { sj_spirit: rank }, xp: 10920 }
      const info = skillPresentation(state, 'sj_spirit')
      assert.equal(info.stats.find(s => s.key === 'pickupBonus').value, `${bonus * 100}%`)
      assert.equal(info.stats.find(s => s.key === 'reachBonus').value, `${rank * 4}%`)
    }
  }
})

test('old passive saves reset only this mode and failed resets preserve the original record', () => {
  const fresh = new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state
  const data = JSON.stringify({ ...fresh, xp: 10920, skills: { sj_arc: 1, magnet: 8 } })
  const old = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: 17, data, checksum: checksum(data) })
  for (const fail of [false, true]) {
    const records = new Map([[TOWER_CAMPAIGN_KEY, old], ['other-game', 'keep']])
    const disk = {
      getItem: key => records.get(key) ?? null,
      setItem(key, value) {
        assert.equal(key, TOWER_CAMPAIGN_KEY)
        if (fail) throw Error('disk full')
        records.set(key, value)
      },
    }
    const store = new TowerCampaignStore(disk, 0)
    assert.equal(records.get('other-game'), 'keep')
    if (fail) {
      assert.equal(store.readOnly, true)
      assert.equal(records.get(TOWER_CAMPAIGN_KEY), old)
    } else {
      assert.equal(store.readOnly, false)
      assert.deepEqual(store.state.skills, { sj_arc: 1 })
      assert.equal(JSON.parse(records.get(TOWER_CAMPAIGN_KEY)).schema, currentCampaignSchema)
      assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
    }
  }
})
