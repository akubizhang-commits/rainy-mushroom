import test from 'node:test'
import { resonanceDamageFactor } from '../js/xianxia/TowerResonance.js'
import assert from 'node:assert/strict'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { skillForm, convergenceRainMultiplier } from '../js/xianxia/TowerSkillForms.js'
import { COMBAT_SKILLS, COMBAT_EVOLUTIONS } from '../js/xianxia/TowerCombatSkills.js'

for (const rank of [1, 2]) test(`convergence rank ${rank}: triple pierces, one terminal, extended duration and retained total budget`, () => {
  const s = structuredClone(new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state)
  s.xp = 10920; s.skillsInitialized = true; s.skills = { sj_yujian: 10 }
  s.evolutionRanks = { evo_wanjian: rank }; s.evolutions = ['evo_wanjian']
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 1, xp: s.xp, hp: 100, loadout: combatLoadout(s), training: true })
  Object.assign(run.state.player, { x: 0, y: 0 })
  run.state.enemies = [{ id: 'probe', hp: 1e9, x: 80, y: 0, radius: 22, woundBudget: 0, woundUntil: 0, orbitNextAt: 0 }]
  run._random = () => .5
  const hits = [], effects = []
  for (let i = 0; i < 180; i++) {
    run.state.ticks = i; run.state.time = i / 60
    const outgoing = []
    run._skills(outgoing); run._zones([], outgoing)
    hits.push(...outgoing.filter(h => h.impact?.skill === 'evo_wanjian'))
    effects.push(...run.state.effects.filter(e => e.kind === 'convergence'))
    run.state.effects = []
  }
  const count = rank === 1 ? 19 : 25
  assert.equal(hits.length, count)
  assert.deepEqual(hits.map(h => h.impact.pulseIndex), Array.from({ length: count }, (_, i) => i + 1))
  assert.equal(effects.filter(e => !e.terminal).length, count - 1)
  assert.equal(effects.filter(e => e.terminal).length, 1)
  assert.equal(run.state.cooldowns.evo_wanjian, 15)
  const form = skillForm('evo_wanjian', rank)
  assert.ok(Math.abs(form.duration - (rank === 1 ? 2 : 2.6)) < 1e-8)
  const parent = COMBAT_SKILLS.find(x => x.id === 'sj_yujian')
  const evo = COMBAT_EVOLUTIONS.find(x => x.id === 'evo_wanjian')
  const oldMultiplier = (evo.budgetMultipliers[rank - 1] - evo.regularMultiplier) * 8 / parent.cooldown + (rank === 1 ? 1.1 : 1.4) / parent.cooldown
  assert.ok(Math.abs(convergenceRainMultiplier(rank) - oldMultiplier) < 1e-8)
  const panel = skillPresentation(s, 'evo_wanjian')
  assert.equal(panel.stats.find(r => r.key === 'rainTicks').value, count)
  // 85号：面板显示实际伤害（含主修共鸣）；区域原始伤害在命中结算时才乘共鸣。
  assert.ok(Math.abs(hits.reduce((sum, h) => sum + h.damage, 0) * resonanceDamageFactor(combatLoadout(s), 'sj_yujian') - panel.stats.find(r => r.key === 'rainFullDamage').value) < 1e-8)
})
