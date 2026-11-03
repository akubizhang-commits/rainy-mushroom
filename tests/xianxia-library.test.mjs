import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import {
  LIBRARY_VOLUMES, LIBRARY_ENTRIES, LIBRARY_QUALITY_NAMES,
  libraryEntries, libraryChapters, libraryDetails,
} from '../js/xianxia/TowerLibrary.js'
import { CAMP_PILLS, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { WEAPONS, WEAPON_BASE_ATTACK, createFixedWeapon, weaponDescription } from '../js/xianxia/TowerWeapons.js'
import { EQUIPMENT, RING_AFFIX_RANGES, ARMOR_AFFIX_RANGES, createFixedEquipment, equipmentDescription } from '../js/xianxia/TowerEquipment.js'
import { OPEN_EQUIPMENT_TIERS, equipmentTierRequirement } from '../js/xianxia/TowerEquipmentTiers.js'

const amount = n => String(Number(n.toFixed(12)))
const range = r => r[0] === r[1] ? amount(r[0]) : `${amount(r[0])}～${amount(r[1])}`

test('encyclopedia contains every open definition and only this mode’s camp medicine', () => {
  assert.deepEqual(LIBRARY_VOLUMES.map(v => v.id), ['pills', 'weapons', 'equipment', 'materials'])
  assert.deepEqual(libraryEntries('pills').map(e => e.id), Object.keys(CAMP_PILLS).filter(id => !CAMP_PILLS[id].material).map(id => `pill_${id}`))
  const definitions = [...WEAPONS, ...EQUIPMENT].filter(d => OPEN_EQUIPMENT_TIERS.includes(d.tier))
  assert.deepEqual(new Set(LIBRARY_ENTRIES.filter(e => ['weapons', 'equipment'].includes(e.volume)).map(e => e.id)), new Set(definitions.map(d => d.id)))
  assert.equal(LIBRARY_ENTRIES.length, new Set(LIBRARY_ENTRIES.map(e => e.id)).size)
  assert.equal(LIBRARY_QUALITY_NAMES.length, 5)
  for (const entry of LIBRARY_ENTRIES) {
    assert.ok(entry.description)
    assert.ok(entry.name)
    assert.ok(entry.qualities.length)
    for (const quality of entry.qualities) {
      const details = libraryDetails(entry.id, quality)
      for (const key of ['summary', 'requirement', 'source', 'note']) assert.equal(typeof details[key], 'string')
      for (const key of ['effects', 'conditions', 'tips']) assert.ok(details[key].length)
    }
  }
  // Knowledge of top-tier items is available without a player/ownership input.
  assert.ok(libraryEntries('weapons', '灵器').length)
  assert.ok(libraryEntries('equipment', '灵器').length)
})

test('only real accepted icons are referenced, missing art does not remove entries', () => {
  const base = new URL('../cocos-pilot/assets/resources/', import.meta.url)
  for (const entry of LIBRARY_ENTRIES.filter(e => e.icon)) {
    assert.ok(existsSync(new URL(`${entry.icon}.png`, base)), entry.icon)
    assert.ok(entry.icon.endsWith(entry.id))
  }
  const illustrated = new Set(LIBRARY_ENTRIES.filter(e => ['weapons', 'equipment'].includes(e.volume) && e.icon).map(e => `${e.id}.png`))
  const files = readdirSync(new URL('tower-equipment/', base)).filter(name => name.endsWith('.png'))
  assert.deepEqual(illustrated, new Set(files), 'new accepted icons must be explicitly added to the library artwork list')
  assert.equal(LIBRARY_ENTRIES.find(e => e.id === 'eq_ring_dingwei').icon, '')
  assert.ok(libraryDetails('eq_ring_dingwei'))
})

test('search and chapters are deterministic, detached, and do not expose unrelated categories', () => {
  assert.deepEqual(libraryChapters('pills'), ['丹药篇'])
  assert.deepEqual(libraryChapters('equipment'), ['防具篇', '戒指篇'])
  assert.deepEqual(libraryEntries('equipment', '  破隙  戒指  ', '戒指篇').map(e => e.id), ['eq_ring_wenpo'])
  assert.deepEqual(libraryEntries('equipment', '破隙', '防具篇'), [])
  assert.deepEqual(libraryEntries('weapons', '不存在'), [])
  assert.deepEqual(libraryEntries('other'), [])
  assert.deepEqual(libraryChapters('other'), [])
  const filtered = libraryEntries('equipment')
  filtered.length = 0
  assert.equal(libraryEntries('equipment').length, EQUIPMENT.filter(d => OPEN_EQUIPMENT_TIERS.includes(d.tier)).length)
})

test('medicine amounts, prices, cap, and non-consumption rules follow camp definitions', () => {
  const healing = libraryDetails('pill_huichun')
  assert.ok(healing.effects.some(text => text.includes(`${CAMP_PILLS.huichun.healShare * 100}%`)))
  assert.ok(healing.source.includes(`${CAMP_PILLS.huichun.price}下品灵石`))
  assert.match(healing.conditions.join(' '), /满血.*不消耗/)
  assert.match(healing.conditions.join(' '), /塔内不可服用/)
  const training = libraryDetails('pill_peiyuan')
  assert.ok(training.effects.some(text => text.includes(`${CAMP_PILLS.peiyuan.xp}`)))
  assert.ok(training.conditions.some(text => text.includes(`${TOWER_XP_CAP}`)))
  assert.match(training.conditions.join(' '), /封顶.*不消耗/)
  assert.match(training.conditions.join(' '), /事先确认实际收益与浪费/)
})

test('initial equipment has no realm prerequisite; all others show their actual tier requirement', () => {
  for (const d of [...WEAPONS, ...EQUIPMENT]) {
    const details = libraryDetails(d.id)
    assert.equal(details.requirement, d.qualities.includes(0) ? '境界要求：无' : `境界要求：${equipmentTierRequirement(d.tier)}`)
    assert.deepEqual(libraryDetails(d.id, 'invalid'), details)
    assert.deepEqual(libraryDetails(d.id, 99), details)
  }
  assert.equal(libraryDetails('unknown'), null)
  assert.equal(libraryDetails(null), null)
  assert.deepEqual(libraryDetails('eq_ring_basic').effects, ['法术防御 +1'])
  assert.deepEqual(libraryDetails('eq_sword_iron').effects, weaponDescription(createFixedWeapon('eq_sword_iron', 'iron')))
})

test('weapon descriptions show the unique fixed identity rather than random ranges', () => {
  for(const d of WEAPONS.filter(d=>d.quality)) assert.deepEqual(libraryDetails(d.id).effects,weaponDescription(createFixedWeapon(d.id,'library-test')))
})
test('ring descriptions preserve distinct burst and cadence attributes', () => {
  for(const d of EQUIPMENT.filter(d=>d.category==='ring'&&d.quality)) {
    const details=libraryDetails(d.id), text=details.effects.join(' ')
    assert.deepEqual(details.effects,equipmentDescription(createFixedEquipment(d.id,'library-test')))
    if(['transition','burst','graduate'].includes(d.role)){
      assert.match(text,/暴击伤害 \+/);assert.doesNotMatch(text,/所有技能冷却时间 -/)
    } else {
      assert.match(text,/所有技能冷却时间 -/);assert.doesNotMatch(text,/暴击伤害 \+/)
    }
    assert.doesNotMatch(text,/不缩短|独立判定/)
    for(const line of details.effects)assert.doesNotMatch(line,/[：；]/)
  }
})
test('armor descriptions list defenses and distinguish conditional periodic recovery', () => {
  for(const d of EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)) {
    const details=libraryDetails(d.id), text=details.effects.join(' ')
    assert.deepEqual(details.effects,equipmentDescription(createFixedEquipment(d.id,'library-test')))
    assert.match(text,/物理防御 \+/);assert.doesNotMatch(text,/法术防御 \+/);assert.match(text,/气血回复 \+[\d.]+%\/3秒/)
    for(const line of details.effects){
      if(d.id==='eq_armor_chengxiao'&&line.startsWith('连续4秒未受伤：'))
        assert.match(line,/^连续4秒未受伤：每3秒气血回复额外 \+[\d.]+%（总回复上限2.5%）$/)
      else assert.doesNotMatch(line,/[：；]/)
    }
    if(d.id==='eq_armor_chengxiao')assert.match(text,/连续4秒未受伤.*3秒.*总回复上限2.5%/)
  }
})

test('all catalogue and detail results are immutable and leave game definitions untouched', () => {
  const before = JSON.stringify({ CAMP_PILLS, WEAPONS, EQUIPMENT, RING_AFFIX_RANGES, ARMOR_AFFIX_RANGES, createFixedEquipment, equipmentDescription })
  assert.ok(Object.isFrozen(LIBRARY_ENTRIES))
  assert.throws(() => LIBRARY_ENTRIES.push({}))
  assert.throws(() => LIBRARY_ENTRIES[0].qualities.push(1))
  assert.throws(() => { LIBRARY_VOLUMES[0].name = 'changed' })
  for (const entry of LIBRARY_ENTRIES) for (const quality of entry.qualities) {
    const details = libraryDetails(entry.id, quality)
    assert.ok(Object.isFrozen(details))
    assert.throws(() => details.effects.push('changed'))
  }
  assert.equal(JSON.stringify({ CAMP_PILLS, WEAPONS, EQUIPMENT, RING_AFFIX_RANGES, ARMOR_AFFIX_RANGES, createFixedEquipment, equipmentDescription }), before)
})

 test('materials have their own complete illustrated catalogue and truthful uses', () => {
  const materials = libraryEntries('materials')
  assert.equal(materials.length, 24)
  assert.deepEqual(new Set(materials.map(e => e.id)), new Set(Object.entries(CAMP_PILLS).filter(([,p]) => p.material).map(([id]) => `pill_${id}`)))
  assert.deepEqual(new Set(libraryChapters('materials')), new Set(['炼丹材料篇', '炼器材料篇', '突破灵材篇']))
  assert.equal(libraryEntries('materials', '玄铁')[0].id, 'pill_forge_xuantie')
  for (const entry of materials) {
    const pill = CAMP_PILLS[entry.id.slice(5)], detail = libraryDetails(entry.id)
    assert.ok(existsSync(new URL(`../cocos-pilot/assets/resources/tower-library-items/${entry.id}.png`, import.meta.url)))
    assert.equal(detail.source, pill.source)
    assert.ok(detail.tips.some(t => t.includes(`${pill.sellPrice}下品灵石／份`)))
    assert.ok(detail.tips.every(t => t !== '用于：'))
  }
  assert.match(libraryDetails('pill_forge_tiejing').effects.join(''), /出售/)
  assert.doesNotMatch(libraryDetails('pill_forge_tiejing').effects.join(''), /用于炼制/)
  assert.match(libraryDetails('pill_huichuncao').tips.join(''), /回春丹/)
  assert.match(libraryDetails('pill_xiaoyue').effects.join(''), /75%/)
  assert.match(libraryDetails('pill_chilin').effects.join(''), /80%/)
 })
