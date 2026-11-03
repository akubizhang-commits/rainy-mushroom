import {equipmentPrimaryBonuses} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { createIronWeapon, createFixedWeapon, weaponFlatAttack, weaponAttackProfile, rollWeapon, validateWeapon, weaponDamageModifiers, WEAPONS } from '../js/xianxia/TowerWeapons.js'
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
  // This suite isolates the parent hit's crit/passive formula. Independent
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
    const baseAttack = 100 * cultivationAt(xp).attackMultiplier
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
  close(stats(0, { passive: {}, weaponQuality: 4, weaponRefine: 4 }).attack, 130)
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

// Independent arithmetic from the approved attribute rules. These expectations
// use item data and explicit passive ranks, never the runtime damage-factor helper.
const affix = (item, type) => item?.affixes.filter(a => a.type === type).reduce((n, a) => n + a.value, 0) ?? 0
function rank(loadout, id) {
  const learned = loadout.passive[id] ?? 0
  if (!learned) return 0
  const bonus = ['weapon','armor','ring'].reduce((n, slot) => n + (loadout[slot]?.affixes
    .filter(a => a.type === 'skillLevel' && (a.target === 'all' || a.target === id))
    .reduce((sum, a) => sum + a.value, 0) ?? 0), 0)
  return Math.min(5, learned + bonus)
}
function ordinaryFactor(l, parent, type) {
  const skill = parent !== 'basic_attack'
  const formation = ['sj_wanjian','sj_formation','evo_wuwo','evo_sixiang'].includes(parent)
  let product = 1
  for (const slot of ['weapon','armor','ring']) {
    const item = l[slot]
    const bonus = (slot === 'weapon' ? weaponDamageModifiers(item, parent, type).flat : 0)
      + (skill ? affix(item, 'skillDamage') / 100 : 0)
      + (skill && formation ? affix(item, 'formationDamage') / 100 : 0)
    product *= 1 + bonus
  }
  return product + [0,.06,.12,.18,.25,.32][rank(l,'sj_bone')]
}
function expectedOrdinary(l, parent, parts) {
  return parts.physical * ordinaryFactor(l,parent,'physical')
    + parts.magic * ordinaryFactor(l,parent,'magic')
}
function critical(l) { return 1.5 + (affix(l.weapon,'critBonus') + affix(l.ring,'critBonus')) / 100 }
function directShare(l) { return 1 - affix(l.weapon,'bleedConversion') / 100 }
function regenStep(run) {
  for (const e of run.state.enemies) { e.x = -700; e.y = -900 }
  safeStep(run)
}
function toPulse(run, count = 1) {
  const target = (Math.floor(run.state.ticks / 180) + count) * 180
  while (run.state.ticks < target) regenStep(run)
}
function pulseRate(run, safe = false) {
  return run.state.player.maxHp * Math.min(1/40, 1/60 + affix(run.state.loadout.armor,'healthRegen')/100
    + (safe ? affix(run.state.loadout.armor,'safeRecovery')/100 : 0))
}

test('weapon and ring multiply by source, then add bone before the full critical multiplier', () => {
  for (const fixed of [false, true]) {
    const w = weapon('ling', 4, 'qi', fixed), ring = equipment('ring')
    const run = make(w, { ring, focus: 4, passive: { sj_bone: 4, sj_heart: 4 } })
    run._random = () => 0
    const raw = run.state.player.attack * 2, l = run.state.loadout
    const parts = {physical:raw,magic:0}
    const expected = expectedOrdinary(l,'sj_line',parts) * critical(l)
    const cast = run._weaponCast('sj_line')
    for (const id of ['target','other']) close(hit(run,dummy(run,id),'sj_line',
      {...cast,damage:raw,damageParts:parts}),expected)
    assert.equal(run.state.weaponState.effectiveCasts, 0)
    assert.equal(run.state.weaponState.focusCount, 4)
    assert.equal(run.state.loadout.weaponFocusCount, 4)
    assert.ok(!run.state.effects.some(e => e.weaponFocus))
    assert.equal(run.state.player.hp, 50, 'outgoing hits never heal through the weapon or ring')
  }
})

test('retired focus never triggers on the fifth cast, whiffs, zero hits, corpses or training', () => {
  for (const ring of [undefined, createBasicEquipment('ring'), equipment('ring','fa',3), equipment('ring')]) {
    const run = make(weapon(), {ring,focus:4}), e = dummy(run)
    run._random = () => .99999
    const miss = run._weaponCast('sj_arc')
    run._damageEnemy({target:'absent',damage:100,direct:true,source:'sj_arc',...miss})
    hit(run,e,'sj_arc',{...miss,damage:0})
    for (const source of ['sj_yujian','sj_arc','sj_shadow','sj_line','sj_arc','sj_line']) {
      close(hit(run,e,source,{...run._weaponCast(source),damageParts:{physical:100,magic:0}}),
        expectedOrdinary(run.state.loadout,source,{physical:100,magic:0}))
    }
    assert.equal(run.state.weaponState.focusCount, 4)
    assert.equal(run.state.weaponState.effectiveCasts, 0)
    e.hp=0
    assert.equal(hit(run,e,'sj_arc',run._weaponCast('sj_arc')),0)
    assert.equal(run.state.weaponState.effectiveCasts, 0)
    assert.ok(!run.state.effects.some(e=>e.weaponFocus))
  }
  const training=make(weapon(),{ring:equipment('ring'),focus:4,run:{training:true}})
  hit(training,dummy(training),'sj_line',training._weaponCast('sj_line'))
  assert.equal(training.state.weaponState.focusCount,0)
  assert.equal(training.state.loadout.weaponFocusCount,4)
})

test('zone aliases retain their skill family and continuous damage uses ring bonuses and critical hits', () => {
  const ring=equipment('ring')
  for (const [affinity,pairs] of [
    ['general',[['shadow','sj_shadow'],['sword_rain','sj_yujian'],['rain','sj_yujian'],['evo_wanjian','sj_yujian']]],
    ['formation',[['formation','sj_formation'],['evo_sixiang','sj_formation'],['orbit','sj_wanjian'],['evo_wuwo','sj_wanjian']]],
    ['qi',[['evo_tiandi','sj_line']]],
  ]) {
    const w=weapon('fa',3,affinity),run=make(w,{ring,focus:4,passive:{sj_heart:4}}),e=dummy(run)
    for (const crit of [false,true]) for (const [source,parent] of pairs) {
      run._random=()=>crit?0:.99999
      const parts={physical:50,magic:50}
      close(hit(run,e,source,{direct:false,damageParts:parts}),
        expectedOrdinary(run.state.loadout,parent,parts)*(crit?critical(run.state.loadout):1)*directShare(run.state.loadout))
    }
    assert.equal(run.state.weaponState.focusCount,4)
    assert.equal(e.qingping,undefined,'continuous damage cannot trigger direct-only wounds')
    assert.equal(run.state.swordBursts?.length??0,0)
  }
})

test('scaled wound and already-settled burst never repeat enhancement, critical, conversion, attached damage or healing', () => {
  const run=make(weapon('ling',4,'qi',true),{ring:equipment('ring'),armor:equipment('armor'),focus:4,
    passive:{sj_mark:4,sj_gate:4,sj_bone:4,sj_heart:4}})
  let rolls=0;run._random=()=>{rolls++;return 0}
  const e=dummy(run),direct=hit(run,e,'sj_line',run._weaponCast('sj_line'))
  close(e.qingping.amount,direct*1.5)
  close(e.woundBudget,direct*1.5)
  assert.equal(run.state.swordBursts.length,1)
  assert.equal(run.state.gateEntries.length,0)
  const before=clone(run.state.weaponState),armorBefore=clone(run.state.armorState),beforeRolls=rolls
  for (const source of ['wound','sword_burst']) {
    const count=run.state.effects.length
    close(hit(run,e,source,{scaled:true,direct:false,damage:13}),13)
    assert.equal(run.state.effects.length,count+1,'settled damage adds no attached hit')
  }
  assert.equal(rolls,beforeRolls)
  close(e.qingping.amount,direct*1.5)
  close(e.woundBudget,direct*1.5)
  assert.deepEqual(run.state.weaponState,before)
  assert.deepEqual(run.state.armorState,armorBefore)
  assert.equal(run.state.player.hp,50)
})

test('representative two-slot weapon/ring single hits obey current arithmetic and the sixfold ceiling', () => {
  const bands=['fan','fa','bao','ling'].flatMap(tier=>(tier==='fan'?[1]:[1,2,3,4]).map(quality=>[tier,quality]))
  for(let wi=-1;wi<bands.length;wi++)for(let ri=-1;ri<bands.length;ri++){
    const minXp=Math.max(wi<0?0:unlockXp[bands[wi][0]],ri<0?0:unlockXp[bands[ri][0]])
    for(const cdr of [false,true])for(const fixed of [false,true])for(const xp of [minXp,cultivationLevelXp(30)])for(const passives of [false,true]){
      const w=wi<0?createIronWeapon():weapon(...bands[wi],'qi',fixed)
      const ring=ri<0?undefined:equipment('ring',...bands[ri],cdr)
      const run=make(w,{ring,focus:4,passive:passives?{sj_heart:4,sj_bone:4}:{},run:{xp}}),l=run.state.loadout
      const raw=run.state.player.attack,parts={physical:raw,magic:0},e=dummy(run)
      const p=Math.min(1,[0,.08,.14,.20,.28,.36][rank(l,'sj_heart')]+(affix(w,'critChance')+affix(ring,'critChance'))/100)
      const ordinary=expectedOrdinary(l,'sj_line',parts),share=directShare(l)
      run._random=()=>.999999
      close(hit(run,e,'sj_line',{damage:raw,damageParts:parts}),ordinary*share)
      run._random=()=>0
      close(hit(run,e,'sj_line',{damage:raw,damageParts:parts}),ordinary*share*(p>0?critical(l):1))
      const dot=affix(w,'bleedConversion')/100*(1+(affix(w,'bleed')+affix(ring,'dotDamage'))/100)
      const resolved=ordinary*(1-p+p*critical(l))*(share*(1+affix(w,'onHit')/100)+dot)
      const mean=resolved/(1-affix(ring,'cooldownReduction')/100)
      const base=(100*cultivationAt(xp).attackMultiplier+5)*(passives?1.25:1)*(1+(passives ? .28 : 0)*.5)
      assert.ok(mean/base<=6+1e-8,`weapon=${w.definitionId},ring=${ring?.definitionId},xp=${xp}: ${mean/base} > 6`)
    }
  }
})

test('physical armor defense composes with vajra; hits do not schedule the retired reactive heal', () => {
  const armor=equipment('armor'),m=armorModifiers(armor)
  const run=make(createIronWeapon(),{armor,passive:{vajra:4},run:{hp:100}})
  incoming(run,10)
  const damage=10*(1-.15)*(1-m.physicalReduction)
  close(run.state.player.hp,100-damage)
  assert.equal(run.state.armorState.healedTotal,0)
  assert.equal(run.state.armorState.pending,undefined)
  const before=run.state.player.hp,armorBefore=clone(run.state.armorState)
  incoming(run,50,'during-invulnerability')
  close(run.state.player.hp,before)
  assert.deepEqual(run.state.armorState,armorBefore)
  for(let i=0;i<36;i++)regenStep(run)
  incoming(run,10,'second-actual-hit')
  close(run.state.player.hp,before-damage)
  assert.equal(run.state.armorState.healedTotal,0)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

for(const tier of ['fan','fa','bao','ling'])for(const quality of (tier==='fan'?[1]:[1,4])){
  test(`${tier}/${quality} armor recovers on three-second pulses, bounded by missing HP without the retired floor cap`,()=>{
    const run=make(createIronWeapon(),{armor:equipment('armor',tier,quality)})
    incoming(run,.01)
    const before=run.state.player.hp
    while(run.state.ticks<179)regenStep(run)
    close(run.state.player.hp,before)
    regenStep(run)
    const first=Math.min(run.state.player.maxHp-before,pulseRate(run))
    close(run.state.player.hp,before+first)
    close(run.state.armorState.healedTotal,first)
    assert.equal(run.state.armorState.pending,undefined)
    const initialMax=run.state.player.maxHp
    for(let n=0;n<10;n++){
      const hp=run.state.player.hp,healed=run.state.armorState.healedTotal
      toPulse(run)
      const amount=Math.min(initialMax-hp,pulseRate(run,true))
      close(run.state.player.hp,hp+amount)
      close(run.state.armorState.healedTotal,healed+amount)
      assert.ok(validateTowerSnapshot(run.snapshot()))
    }
    assert.ok(run.state.armorState.healedTotal>initialMax*.1,'current periodic recovery has no old per-floor ten-percent budget')
    assert.ok(run.state.player.hp<=initialMax)
  })
}

test('level-up changes the next pulse size; full HP never banks unused recovery', () => {
  const run=make(createIronWeapon(),{armor:equipment('armor','fan',1),run:{xp:44}})
  const [target]=realTargets(run),entryMax=run.state.player.maxHp
  run._damageEnemy({target:target.id,damage:target.hp,direct:false,scaled:true,source:'fixture'})
  safeStep(run)
  assert.ok(run.state.player.maxHp>entryMax)
  run.state.player.hp=run.state.player.maxHp
  toPulse(run)
  assert.equal(run.state.armorState.healedTotal,0)
  incoming(run,10)
  const hurt=run.state.player.hp
  toPulse(run)
  const amount=Math.min(run.state.player.maxHp-hurt,pulseRate(run))
  close(run.state.player.hp,hurt+amount)
  close(run.state.armorState.healedTotal,amount)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('periodic recovery never revives, including a lethal hit on the exact pulse tick', () => {
  const run=make(createIronWeapon(),{armor:equipment('armor')})
  while(run.state.ticks<179)regenStep(run)
  incoming(run,1e9,'lethal-on-pulse-tick')
  assert.equal(run.state.ticks,180)
  assert.equal(run.state.phase,'lost')
  assert.equal(run.state.player.hp,0)
  assert.equal(run.state.armorState.healedTotal,0)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const restored=TowerRun.restore(run.snapshot())
  restored.advance(60)
  assert.equal(restored.state.player.hp,0)
  assert.deepEqual(restored.snapshot(),run.snapshot())
})

test('regeneration clock and ledger survive pause, JSON restore and paused skill learning unchanged', () => {
  const run=make(createIronWeapon(),{armor:equipment('armor'),ring:equipment('ring')})
  incoming(run,10);for(let i=0;i<30;i++)regenStep(run);run.pause()
  const saved=run.snapshot(),restored=TowerRun.restore(saved)
  run.advance(60);assert.deepEqual(run.snapshot(),saved)
  for(const actor of [run,restored]){
    actor.setGrowthLoadout({...saved.loadout,passive:{sj_bone:1}})
    assert.deepEqual(actor.state.armorState,saved.armorState)
    actor.resume();toPulse(actor)
  }
  assert.deepEqual(run.snapshot(),restored.snapshot())
  assert.ok(run.state.armorState.healedTotal>0)
  const after=run.snapshot(),again=TowerRun.restore(after)
  again.pause();again.advance(60);again.resume()
  assert.deepEqual(again.snapshot(),after)
})

test('strict armor snapshots reject forged recovery totals, premature pulses and retired state fields', () => {
  const run=make(createIronWeapon(),{armor:equipment('armor','ling',1)})
  incoming(run,10);run.pause()
  const saved=run.snapshot()
  assert.ok(validateTowerSnapshot(saved))
  assert.deepEqual(TowerRun.restore(saved).snapshot(),saved)
  for(const mutate of [
    s=>{delete s.armorState},s=>{s.armorState.armorId='other'},
    s=>{s.armorState.healedTotal=-1},s=>{s.armorState.healedTotal=1},
    s=>{s.armorState.healedTotal=Infinity},s=>{s.armorState.healedTotal='0'},
    s=>{s.armorState.entryMaxHp=s.player.maxHp},s=>{s.armorState.pending=null},
    s=>{s.armorState.cooldownUntil=0},s=>{s.armorState.triggerCount=0},
    s=>{s.armorState.lastTriggerAt=null},s=>{s.armorState.shield=1},
  ]){
    const corrupt=clone(saved);mutate(corrupt)
    assert.equal(validateTowerSnapshot(corrupt),false)
    assert.throws(()=>TowerRun.restore(corrupt))
  }
  run.resume();toPulse(run);const pulse=run.snapshot()
  assert.ok(validateTowerSnapshot(pulse),'a genuine pulse is accepted')
  const corrupt=clone(pulse)
  corrupt.armorState.healedTotal=pulseRate(run)+1
  assert.equal(validateTowerSnapshot(corrupt),false,'one elapsed pulse cannot claim more than its maximum')
  assert.throws(()=>TowerRun.restore(corrupt))
})

test('real multi-sword hit receipts survive a save between projectile hits without resurrecting focus', () => {
  const run=make(weapon(),{ring:equipment('ring'),focus:4,active:{sj_yujian:10}})
  const targets=realTargets(run,2)
  run.state.yujian.ready=10
  targets[0].x=run.state.player.x+160;targets[0].y=run.state.player.y-70
  targets[1].x=run.state.player.x+340;targets[1].y=run.state.player.y+100
  run.state.cooldowns.sj_yujian=0
  for(let i=0;i<90&&!run.state.effects.some(e=>e.source==='sj_yujian');i++){
    run.advance(STEP)
    if(run.state.projectiles.length)run.state.cooldowns.sj_yujian=99999
  }
  assert.ok(run.state.effects.some(e=>e.source==='sj_yujian'))
  assert.ok(run.state.projectiles.length>0)
  assert.ok(run.state.projectiles.find(p=>p.hitIds.length)?.weaponCastId,'first volley retains a hit receipt')
  run.pause()
  const saved=run.snapshot(),restored=TowerRun.restore(saved)
  assert.equal(saved.weaponState.focusCount,4)
  assert.equal(saved.loadout.weaponFocusCount,4)
  for(const actor of [run,restored]){actor.resume();safeAdvance(actor,1)}
  assert.deepEqual(run.snapshot(),restored.snapshot())
  assert.equal(run.state.weaponState.effectiveCasts,0)
  assert.equal(run.state.weaponState.casts.length,0)
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
    passive: { sj_bone: 4, sj_heart: 4, sj_mark: 4, sj_gate: 4 },
    evolutions: { evo_wanjian: 2, evo_wuwo: 2, evo_tiandi: 2, evo_sixiang: 2 } })
  incoming(run, 10)
  const healed = run.state.armorState.healedTotal
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
  assert.ok(run.state.weaponState.nextCastId > 1, 'real direct actions created receipts')
  assert.equal(run.state.weaponState.effectiveCasts, 0)
  assert.equal(run.state.weaponState.focusCount, 2)
  assert.ok(run.state.armorState.healedTotal >= healed)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})
