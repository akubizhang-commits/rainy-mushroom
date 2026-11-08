import {outgoingDamageFactor,criticalMultiplier,regenerationAmount,maximumRegenerationAmount} from '../js/xianxia/TowerAttributeRules.js'
import {weaponAttackProfile} from '../js/xianxia/TowerWeapons.js'
import {equipmentPrimaryBonuses} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { createIronWeapon, createFixedWeapon, weaponFlatAttack, rollWeapon, validateWeapon, weaponDamageModifiers, WEAPONS } from '../js/xianxia/TowerWeapons.js'
import { createBasicEquipment, createFixedEquipment, EQUIPMENT, rollEquipment, validateEquipment, ringDamageModifiers, ringCooldownReduction, armorModifiers } from '../js/xianxia/TowerEquipment.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'

const STEP = 1 / 60
const clone = value => JSON.parse(JSON.stringify(value))
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`)
const maximum = () => 1 - Number.EPSILON
function weapon(tier = 'ling', quality = 4, affinity = 'qi', fixed = false) {
  const candidates = WEAPONS.filter(d => d.tier === tier && d.quality === quality)
  const selected = quality === 4 ? candidates[fixed ? 0 : 1] : candidates.find(d => d.affinity === affinity) ?? (tier === 'fan' ? candidates[0] : null)
  assert.ok(selected, `${tier}/${quality} has ${affinity} weapons`)
  const w = createFixedWeapon(selected.id, `weapon-${tier}-${quality}-${affinity}-${fixed}`)
  assert.equal(w.refine, 0)
  assert.ok(validateWeapon(w))
  return w
}
function equipment(category, tier = 'ling', quality = 4, cdr = false) {
  const candidates = EQUIPMENT.filter(d => d.category === category && d.tier === tier && d.quality === quality)
  const selected = quality === 4 ? candidates[cdr ? 0 : 1] : candidates.find(d => d.role === (category === 'armor' ? 'sustain' : cdr ? 'cooldown' : 'crit')) ?? candidates[0]
  assert.ok(selected, `${tier}/${quality} has ${category}`)
  const item = createFixedEquipment(selected.id, `${category}-${tier}-${quality}`)
  assert.equal(item.refine, 0)
  assert.ok(validateEquipment(item, category))
  return item
}
function loadout(w = weapon(), options = {}) {
  const result = {
    growthVersion: 1, active: { sj_yujian: 1, ...options.active }, passive: options.passive ?? {},
    evolutions: Object.keys(options.evolutions ?? {}), evolutionLevels: options.evolutions ?? {},
    tutorialWaves: 0, weapon: clone(w), weaponId: w.id, weaponQuality: w.quality, weaponRefine: w.refine,
    weaponFocusCount: options.focus ?? 0,
  }
  for (const kind of ['ring', 'armor']) if (options[kind]) {
    result[kind] = clone(options[kind]); result[`${kind}Id`] = options[kind].id
  }
  return result
}
const unlockXp = { fan: 0, fa: cultivationLevelXp(4), bao: cultivationLevelXp(11), ling: cultivationLevelXp(21) }
const make = (w = weapon(), options = {}) => new TowerRun({
  attemptId: 17, floor: 9, seed: 123,
  xp: Math.max(...[w, options.ring, options.armor].filter(Boolean).map(item => unlockXp[item.tier])),
  hp: 50, loadout: loadout(w, options), ...options.run,
})
function dummy(run, id = 'target') {
  const enemy = { id, x: 100, y: -60, radius: 20, hp: 1e6, maxHp: 1e6, woundBudget: 0, woundUntil: 0 }
  run.state.enemies.push(enemy)
  return enemy
}
function hit(run, enemy, source, extra = {}) {
  const before = run.state.effects.length
  run._damageEnemy({ target: enemy.id, damage: 100, direct: true, source, ...extra })
  // This suite isolates the parent hit's crit/focus/passive formula. Independent
  // attached hits are asserted separately in xianxia-weapon-actions.test.mjs.
  return run.state.effects.slice(before).findLast(e => e.kind === 'hit' && e.source === source && e.targetId === enemy.id)?.damage ?? 0
}
function safeStep(run) {
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 99999
  for (const e of run.state.enemies) e.ai.graceUntil = 99999
  run.advance(STEP)
}
function safeAdvance(run, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) safeStep(run)
}
function realTargets(run, count = 1) {
  for (let i = 0; i < 1200 && run.state.enemies.length < count; i++) safeStep(run)
  assert.ok(run.state.enemies.length >= count)
  for (const [i, e] of run.state.enemies.entries()) {
    e.ai.graceUntil = 99999; e.x = run.state.player.x + 130 + i * 35; e.y = run.state.player.y
  }
  return run.state.enemies.slice(0, count)
}
function incoming(run, damage, id = 'test-hit') {
  run.state.projectiles.push({ id, x: run.state.player.x, y: run.state.player.y,
    vx: 0, vy: 0, radius: 10, damage, hostile: true, hitIds: [], expiresAt: run.state.time + 1 })
  safeStep(run)
}

// Starter +5 and any replacement weapon are added once after cultivation.
test('iron follows growth; fixed attack stays constant and is added once across the whole multi-sword cast', () => {
  const fixed = weapon('ling', 1, 'general', true)
  const tampered = clone(fixed); tampered.affixes[0].value += 1
  assert.equal(validateWeapon(tampered), false)
  for (const xp of [0, unlockXp.ling, cultivationLevelXp(27)]) {
    const baseAttack = 110 * cultivationAt(xp).attackMultiplier
    for (const w of xp < unlockXp.ling ? [createIronWeapon()] : [createIronWeapon(), fixed]) {
      const added = weaponFlatAttack(w)+equipmentPrimaryBonuses({weapon:w}).strength
      const run = make(w, { active: { sj_yujian: 10 }, run: { xp } })
      close(run.state.player.attack, baseAttack + added)
      assert.ok(validateTowerSnapshot(run.snapshot()))
      close(TowerRun.restore(run.snapshot()).state.player.attack, baseAttack + added)
      const e = dummy(run), skill = GROWTH_SKILLS.find(s => s.id === 'sj_yujian')
      run._releaseSkill({ skill: skill.id, level: 10, x: 33, y: -60,
        targetX: e.x, targetY: e.y, dirX: 1, dirY: 0,
        castContext: { xp, loadout: clone(run.state.loadout) }, ...run._weaponCast(skill.id) }, [])
      assert.equal(run.state.projectiles.length, 1)
      const total = run.state.projectiles.reduce((sum, p) => sum + p.damage, 0)
      close(total, (baseAttack + added) * skill.damage[9])
      close(total - baseAttack * skill.damage[9], added * skill.damage[9])
    }
  }
  close(stats(0, { passive: {}, weaponQuality: 4, weaponRefine: 4 }).attack, 143)
})

test('all three slots validate, omitted slots stay bare, and identities/categories cannot be forged', () => {
  const full = make(weapon(), { ring: equipment('ring'), armor: equipment('armor') })
  assert.ok(validateTowerSnapshot(full.snapshot()))
  assert.equal(full.state.weaponState.ringId, full.state.loadout.ringId)
  assert.equal(full.state.armorState.armorId, full.state.loadout.armorId)
  const bare = make()
  assert.equal(bare.state.weaponState.ringId, null)
  assert.equal(bare.state.armorState, undefined)
  assert.ok(validateTowerSnapshot(bare.snapshot()))
  const basic = make(createIronWeapon(), { ring: createBasicEquipment('ring'), armor: createBasicEquipment('armor') })
  assert.ok(validateTowerSnapshot(basic.snapshot()))
  for (const mutate of [
    l => { l.ringId = 'wrong' }, l => { l.armorId = 'wrong' },
    l => { l.ring = l.armor; l.ringId = l.armor.id },
    l => { delete l.armor }, l => { l.ring.affixes[0].value = 999 },
    l => { l.weapon.affixes.push({ type: 'lifesteal', value: .5 }) },
    l => { l.weaponQuality = 0 }, l => { l.weaponFocusCount = 5 },
  ]) {
    const l = clone(full.state.loadout); mutate(l)
    assert.throws(() => new TowerRun({ attemptId: 1, floor: 1, hp: 50, xp: 5400, loadout: l }))
  }
})

test('disabled refinement is rejected for every slot without changing a paused run', () => {
  const run = make(weapon(), { ring: equipment('ring'), armor: equipment('armor') })
  run.pause()
  const saved = run.snapshot()
  for (const category of ['weapon', 'ring', 'armor']) {
    for (const refine of [1, 4]) {
      const next = clone(saved.loadout)
      next[category].refine = refine
      if (category === 'weapon') next.weaponRefine = refine
      assert.throws(() => run.setGrowthLoadout(next), `${category} +${refine}`)
      assert.deepEqual(run.snapshot(), saved)
      assert.equal(validateTowerSnapshot({ ...clone(saved), loadout: next }), false)
    }
  }
  const restored = TowerRun.restore(saved)
  assert.deepEqual(weaponDamageModifiers(restored.state.loadout.weapon, 'sj_line', 'physical'), weaponDamageModifiers(saved.loadout.weapon, 'sj_line', 'physical'))
  assert.deepEqual(ringDamageModifiers(restored.state.loadout.ring), ringDamageModifiers(saved.loadout.ring))
  assert.deepEqual(armorModifiers(restored.state.loadout.armor), armorModifiers(saved.loadout.armor))
})

test('equipment factors and current critical multiplier settle once without healing or legacy focus',()=>{
 for(const fixed of [false,true]){
  const w=weapon('ling',4,'qi',fixed),ring=equipment('ring')
  const run=make(w,{ring,focus:4,passive:{sj_bone:4,sj_heart:4}});run._random=()=>0
  const raw=run.state.player.attack*2
  const expected=raw*outgoingDamageFactor(run.state.loadout,'sj_line','physical',true)
   *criticalMultiplier([ringDamageModifiers(ring).critBonus,weaponDamageModifiers(w,'sj_line','physical').critBonus])
   *(1-weaponAttackProfile(w).bleedConversion)
  const cast=run._weaponCast('sj_line')
  close(hit(run,dummy(run),'sj_line',{...cast,damage:raw}),expected)
  close(hit(run,dummy(run,'other'),'sj_line',{...cast,damage:raw}),expected)
  assert.equal(run.state.weaponState.effectiveCasts,0);assert.equal(run.state.weaponState.focusCount,4)
  assert.equal(run.state.player.hp,50)
 }
})
test('current fixed rings never fabricate retired fifth-hit progress on misses or effective hits',()=>{
 for(const ring of [undefined,createBasicEquipment('ring'),equipment('ring'),equipment('ring','fa',3)]){
  const run=make(createIronWeapon(),{ring}),e=dummy(run);run._random=()=>.99999
  run._damageEnemy({target:'absent',damage:100,direct:true,source:'sj_arc'})
  hit(run,e,'sj_arc',{damage:0})
  for(const source of ['sj_yujian','sj_arc','sj_shadow','sj_line','sj_arc','sj_line'])hit(run,e,source,run._weaponCast(source))
  e.hp=0;hit(run,e,'sj_arc')
  assert.equal(run.state.weaponState.focusCount,0);assert.equal(run.state.weaponState.effectiveCasts,0)
  assert.ok(run.state.effects.every(e=>!e.weaponFocus))
 }
})
test('zone aliases use their family bonuses and periodic damage can independently crit',()=>{
 const ring=equipment('ring')
 for(const [source,parent] of [['shadow','sj_shadow'],['sword_rain','sj_yujian'],['formation','sj_formation'],['orbit','sj_wanjian']]){
  const run=make(weapon('fa',3,'formation'),{ring,passive:{sj_heart:4}}),e=dummy(run)
  const parts={physical:50,magic:50}
  const normal=50*outgoingDamageFactor(run.state.loadout,parent,'physical',true)+50*outgoingDamageFactor(run.state.loadout,parent,'magic',true)
  run._random=()=>.99999;close(hit(run,e,source,{direct:false,damageParts:parts}),normal)
  run._random=()=>0;close(hit(run,e,source,{direct:false,damageParts:parts}),normal*criticalMultiplier([ringDamageModifiers(ring).critBonus]))
  assert.equal(run.state.weaponState.effectiveCasts,0)
 }
})
test('already scaled damage cannot apply equipment twice or start another mark and never heals',()=>{
 const run=make(createIronWeapon(),{ring:equipment('ring'),armor:equipment('armor'),passive:{sj_mark:1,sj_gate:2,sj_bone:4,sj_heart:4}})
 run._random=()=>0;const e=dummy(run)
 hit(run,e,'sj_line',run._weaponCast('sj_line'));assert.ok(e.scarDebuff)
 const mark=clone(e.scarDebuff),before=clone(run.state.weaponState),armorBefore=clone(run.state.armorState)
 for(const source of ['wound','sword_burst'])close(hit(run,e,source,{scaled:true,direct:false,damage:13}),13)
 assert.deepEqual(e.scarDebuff,mark);assert.equal(e.qingpingDot,undefined)
 assert.deepEqual(run.state.weaponState,before);assert.deepEqual(run.state.armorState,armorBefore)
 assert.equal(run.state.player.hp,50)
})

test('all legal weapon/ring grade combinations stay within the shared total budget using actual combat hits', () => {
  const bands = ['fan','fa','bao','ling'].flatMap(tier => (tier==='fan'?[1]:[1,2,3,4]).map(quality=>[tier,quality]))
  for (let wi = -1; wi < bands.length; wi++) for (let ri = -1; ri < bands.length; ri++) {
    const minXp = Math.max(wi < 0 ? 0 : unlockXp[bands[wi][0]], ri < 0 ? 0 : unlockXp[bands[ri][0]])
    for (const cdr of [false, true]) for (const fixed of [false, true]) for (const xp of [minXp, cultivationLevelXp(27)]) for (const passives of [false, true]) {
      const w = wi < 0 ? createIronWeapon() : weapon(...bands[wi], 'qi', fixed)
      const ring = ri < 0 ? undefined : equipment('ring', ...bands[ri], cdr)
      const r = ring ? ringDamageModifiers(ring) : { critChance: 0, critBonus: 0, special: 0 }
      const run = make(w, { ring, focus: 4, passive: passives ? { sj_heart: 4, sj_bone: 4 } : {}, run: { xp } })
      const e = dummy(run), raw = run.state.player.attack, baseP = run._passive('sj_heart','crit_chance')
      const cast = run._weaponCast('sj_line')
      run._random = () => .999999
      const normal = hit(run, e, 'sj_line', { ...cast, damage: raw })
      run._random = () => 0
      const crit = hit(run, e, 'sj_line', { ...cast, damage: raw })
      const mean = (normal * (1 - baseP - r.critChance) + crit * (baseP + r.critChance)) / (1 - (ring ? ringCooldownReduction(ring) : 0))
      const bare=make(createIronWeapon(),{passive:passives?{sj_heart:4,sj_bone:4}:{},run:{xp}})
      const baseline=bare.state.player.attack*outgoingDamageFactor(bare.state.loadout,'sj_line','physical',true)*(1+baseP*.5)
      const cap=6 // Integer V2 sampled ceiling; this two-slot test is not a universal build proof.
      const factor=outgoingDamageFactor(run.state.loadout,'sj_line','physical',true)
      const expected=raw*factor*(1+(baseP+r.critChance)*(.5+r.critBonus))*(1-weaponAttackProfile(w).bleedConversion)/(1-(ring?ringCooldownReduction(ring):0))
      close(mean, expected)
      assert.ok(mean / baseline <= cap + 1e-8, `weapon=${wi},ring=${ri},fixed=${fixed},xp=${xp}: ${mean / baseline} > ${cap}`)
    }
  }
})

test('armor physical reduction composes once with vajra and invulnerability ignores a second hit',()=>{
 const armor=equipment('armor'),m=armorModifiers(armor)
 const run=make(createIronWeapon(),{armor,passive:{vajra:4},run:{hp:100}})
 incoming(run,10)
 const expected=20*(1-run._passive('vajra','reduction'))*(1-m.physicalReduction)
 close(run.state.player.hp,100-expected)
 incoming(run,50,'invulnerable-hit');close(run.state.player.hp,100-expected)
 assert.equal(run.state.armorState.healedTotal,0);assert.equal('pending' in run.state.armorState,false)
 assert.ok(validateTowerSnapshot(run.snapshot()))
})
for(const tier of ['fan','fa','bao','ling'])for(const quality of tier==='fan'?[1]:[1,4]){
 test(`${tier}/${quality} armor recovers at three-second boundaries and never exceeds missing HP`,()=>{
  const run=make(createIronWeapon(),{armor:equipment('armor',tier,quality)})
  run._basicTarget=()=>null
  const expected=regenerationAmount(run.state.player.maxHp,run.state.loadout)
  safeAdvance(run,3-STEP);close(run.state.player.hp,50);close(run.state.armorState.healedTotal,0)
  safeStep(run);close(run.state.player.hp,Math.min(run.state.player.maxHp,50+expected))
  close(run.state.armorState.healedTotal,Math.min(run.state.player.maxHp-50,expected))
  run.state.player.hp=run.state.player.maxHp-.001
  const before=run.state.armorState.healedTotal;safeAdvance(run,3)
  close(run.state.player.hp,run.state.player.maxHp);close(run.state.armorState.healedTotal,before+.001)
  safeAdvance(run,3);close(run.state.armorState.healedTotal,before+.001)
  assert.ok(validateTowerSnapshot(run.snapshot()))
 })
}
test('periodic recovery follows the new HP cap after growth and full HP never banks healing',()=>{
 const run=make(createIronWeapon(),{armor:equipment('armor','fan',1),run:{xp:44}});run._basicTarget=()=>null
 const beforeMax=run.state.player.maxHp;run._gainXp(1);assert.ok(run.state.player.maxHp>beforeMax)
 run.state.player.hp=run.state.player.maxHp;safeAdvance(run,3);assert.equal(run.state.armorState.healedTotal,0)
 run.state.player.hp=10;const expected=regenerationAmount(run.state.player.maxHp,run.state.loadout)
 safeAdvance(run,3);close(run.state.player.hp,10+expected)
})
test('lethal damage on a recovery tick cannot be revived by periodic armor healing',()=>{
 const run=make(createIronWeapon(),{armor:equipment('armor')});run._basicTarget=()=>null
 safeAdvance(run,3-STEP);incoming(run,1e9,'lethal-on-pulse')
 assert.equal(run.state.phase,'lost');assert.equal(run.state.player.hp,0);assert.equal(run.state.armorState.healedTotal,0)
 assert.ok(validateTowerSnapshot(run.snapshot()));const restored=TowerRun.restore(run.snapshot());restored.advance(60);assert.equal(restored.state.player.hp,0)
})
test('periodic armor clock survives pause, JSON restoration and paused skill learning',()=>{
 const run=make(createIronWeapon(),{armor:equipment('armor'),ring:equipment('ring')});run._basicTarget=()=>null
 incoming(run,10);safeAdvance(run,.5);run.pause();const saved=run.snapshot(),restored=TowerRun.restore(saved)
 run.advance(60);assert.deepEqual(run.snapshot(),saved)
 for(const actor of [run,restored]){actor._basicTarget=()=>null;actor.setGrowthLoadout({...saved.loadout,passive:{sj_bone:1}});assert.deepEqual(actor.state.armorState,saved.armorState);actor.resume();safeAdvance(actor,3)}
 assert.deepEqual(run.snapshot(),restored.snapshot());assert.ok(run.state.armorState.healedTotal>0);assert.ok(validateTowerSnapshot(run.snapshot()))
})
test('armor snapshots reject forged identity, impossible periodic totals and retired delay fields',()=>{
 const run=make(createIronWeapon(),{armor:equipment('armor')});incoming(run,10);run.pause();const saved=run.snapshot()
 for(const mutate of [s=>{delete s.armorState},s=>{s.armorState.armorId='other'},s=>{s.armorState.healedTotal=-1},
  s=>{s.armorState.healedTotal=1},s=>{s.armorState.pending={amount:1}},s=>{s.armorState.cooldownUntil=20},s=>{s.armorState.entryMaxHp=999}]){
  const bad=clone(saved);mutate(bad);assert.equal(validateTowerSnapshot(bad),false);assert.throws(()=>TowerRun.restore(bad))
 }
})
test('real multi-sword flight restores deterministically without creating retired focus progress',()=>{
 const run=make(weapon(),{ring:equipment('ring'),focus:4,active:{sj_yujian:10}})
 const targets=realTargets(run,2);run.state.yujian.ready=10
 targets[0].x=run.state.player.x+160;targets[0].y=run.state.player.y-70
 targets[1].x=run.state.player.x+340;targets[1].y=run.state.player.y+100
 run.state.cooldowns.sj_yujian=0
 for(let i=0;i<90&&!run.state.projectiles.length;i++)run.advance(STEP)
 assert.ok(run.state.projectiles.length>0);run.pause();const saved=run.snapshot(),restored=TowerRun.restore(saved)
 assert.equal(saved.weaponState.focusCount,4);assert.equal(saved.weaponState.effectiveCasts,0)
 for(const actor of [run,restored]){actor.resume();safeAdvance(actor,1)}
 assert.deepEqual(run.snapshot(),restored.snapshot());assert.equal(run.state.weaponState.effectiveCasts,0)
 assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('cast snapshots bind ring and armor instances and reject counter/source tampering', () => {
  const run = make(weapon(), { ring: equipment('ring'), armor: equipment('armor'), focus: 3 })
  const [e] = realTargets(run); e.x = run.state.player.x + 340
  run.state.cooldowns.sj_yujian = 0
  for(let i=0;i<60&&!run.state.projectiles.length;i++)run.advance(1/60)
  run.pause()
  const saved = run.snapshot()
  assert.ok(saved.projectiles.length > 0)
  assert.ok(validateTowerSnapshot(saved))
  for (const mutate of [
    s => { s.weaponState.ringId = 'wrong' }, s => { s.weaponState.focusCount = 4 },
    s => { s.weaponState.casts[0].ordinal = 1 }, s => { s.weaponState.casts[0].skillId = 'sj_line' },
    s => { s.projectiles[0].source = 'wound' }, s => { delete s.projectiles[0].weaponCastId },
    s => { s.projectiles[0].castContext.loadout.ring = createBasicEquipment('ring') },
    s => { s.projectiles[0].castContext.loadout.armor = createBasicEquipment('armor') },
    s => { delete s.loadout.ring; delete s.loadout.ringId },
  ]) {
    const corrupt = clone(saved); mutate(corrupt)
    assert.equal(validateTowerSnapshot(corrupt), false)
  }
  for (const kind of ['ring', 'armor']) {
    const l = clone(saved.loadout); l[kind] = createBasicEquipment(kind); l[`${kind}Id`] = l[kind].id
    assert.throws(() => run.setGrowthLoadout(l))
    assert.deepEqual(run.snapshot(), saved)
  }
})

test('all active skills and evolutions cross real waves with ring/armor state and deterministic replay', () => {
  const active = Object.fromEntries(GROWTH_SKILLS.filter(s => s.kind === 'active').map(s => [s.id, s.maxLevel]))
  const run = make(weapon('ling', 4, 'formation'), { active, ring: equipment('ring'), armor: equipment('armor'), focus: 2,
    passive: { sj_bone: 4, sj_heart: 4, sj_mark: 1, sj_gate: 2 }, run:{xp:cultivationLevelXp(30)},
    evolutions: { evo_wanjian: 2, evo_wuwo: 2, evo_tiandi: 2, evo_sixiang: 2 } })
  incoming(run, 10)
  const cooldown = run.state.armorState.cooldownUntil
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 0
  for (let i = 0; i < 3600 && run.state.wave < 3; i++) {
    run.state.player.hp = Math.max(50, run.state.player.hp)
    for (const e of run.state.enemies) {
      e.x = run.state.player.x + 70; e.y = run.state.player.y; e.ai.graceUntil = run.state.time + 10
    }
    run.advance(STEP)
    if (i % 113 === 0) {
      const restored = TowerRun.restore(run.snapshot())
      run.advance(STEP); restored.advance(STEP)
      assert.deepEqual(run.snapshot(), restored.snapshot())
    }
  }
  assert.ok(run.state.wave >= 3)
  assert.equal(run.state.weaponState.effectiveCasts,0)
  assert.equal(run.state.armorState.cooldownUntil, cooldown)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})
