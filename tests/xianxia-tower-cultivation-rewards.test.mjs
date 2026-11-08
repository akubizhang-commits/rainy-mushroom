import test from 'node:test'
import assert from 'node:assert/strict'
import { FLOORS, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { towerKillXp } from '../js/xianxia/TowerCultivationRewards.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'
import { readFileSync } from 'node:fs'

test('authored integer rewards are order independent; nominal totals include the Foundation barrier', () => {
  let cumulative = 0, previous = 0
  for (const f of FLOORS) {
    const units = f.waves.flatMap(w => (f.floor === 1
      ? FLOOR01.waves[w.wave - 1].batches.flatMap(b => b.unit_ids)
      : Array.from({ length: w.enemy_groups.reduce((n, g) => n + g.count, 0) }, (_, i) => `u${i + 1}`))
      .map(id => [w.wave, id]))
    const values = units.map(([wave, id]) => towerKillXp(f.floor, wave, id))
    assert.ok(values.every(x => Number.isSafeInteger(x) && x >= 0))
    const total = values.reduce((a, b) => a + b, 0)
    assert.equal(total, f.cultivation_xp_budget)
    assert.ok(total > previous, 'higher floors must not yield less XP')
    assert.equal(units.reverse().reduce((n, [w, id]) => n + towerKillXp(f.floor, w, id), 0), total)
    previous = total
    cumulative += total
    assert.equal(cultivationAt(cumulative).level, [3,6,9,12,15,18,20,24,27][f.floor-1])
  }
  assert.equal(cumulative, 10920)
  assert.equal(towerKillXp(9, 20, 'forged-unit'), undefined)
})

test('white tiger has an independent resource used by both tower and battle views', () => {
  const read = p => readFileSync(new URL(`../${p}`, import.meta.url))
  const base = 'cocos-pilot/assets/resources/tower-monsters/'
  assert.notDeepEqual(read(`${base}tiger.png`), read(`${base}white-tiger.png`))
  assert.notEqual(JSON.parse(read(`${base}tiger.png.meta`)).uuid,
    JSON.parse(read(`${base}white-tiger.png.meta`)).uuid)
  assert.match(read('cocos-pilot/assets/scripts/TowerMonsterArt.ts').toString(), /white-tiger/)
  for (const name of ['TowerMenu', 'TowerView']) {
    assert.match(read(`cocos-pilot/assets/scripts/${name}.ts`).toString(),
      /TowerMonsterArt\.artFamily\(/)
  }
})
