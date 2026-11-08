import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { skillForm, qinglianPetalPose, QINGLIAN_BLADE_HALF_WIDTH } from '../js/xianxia/TowerSkillForms.js'

const source = stripTypeScriptTypes(
  readFileSync(new URL('../cocos-pilot/assets/scripts/QinglianFormationArt.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, ''),
  { mode: 'transform' },
).replace(/^export /gm, '')
const art = runInNewContext(
  `(()=>{${source};return {qinglianPetals,QINGLIAN_PALETTE}})()`,
  { skillForm, qinglianPetalPose, QINGLIAN_BLADE_HALF_WIDTH },
)
const { qinglianPetals, QINGLIAN_PALETTE } = art

test('qinglian petals draw 8/12/16 blades, all of them judgment blades from the eye to radius 200', () => {
  const petals = qinglianPetals(.4, [1, 1, 1], [], 1)
  for (const ring of [0, 1, 2]) {
    const mine = petals.filter(petal => petal.ring === ring)
    assert.equal(mine.length, [8, 12, 16][ring])
    for (const petal of mine) {
      assert.ok(Math.abs(Math.hypot(petal.base.x, petal.base.y)) < 1e-6)
      assert.ok(Math.abs(Math.hypot(petal.tip.x, petal.tip.y) - 200) < 1e-6)
    }
  }
})

test('outer ring fades below the inner ring and windup outlines stay limited', () => {
  const petals = qinglianPetals(.4, [1, 1, 1], [], 1)
  const alpha = ring => petals.find(petal => petal.ring === ring).alpha
  assert.ok(alpha(2) < alpha(0))
  const windup = qinglianPetals(.1, [.6, 0, 0], [4, 0, 0], 1)
  assert.equal(windup.length, 4)
  assert.ok(windup.every(petal => petal.ring === 0))
})

test('palette stays in the cool blue-white range without green', () => {
  // Hue in degrees: green sits near 120, cyan 180, blue 240. The palette must stay in 180–200.
  const hue = ([r, g, b]) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    if (d === 0) return 0
    if (max === r) return (60 * ((g - b) / d) + 360) % 360
    if (max === g) return 60 * ((b - r) / d) + 120
    return 60 * ((r - g) / d) + 240
  }
  for (const [name, colour] of Object.entries(QINGLIAN_PALETTE)) {
    const h = hue(colour)
    assert.ok(h >= 180 && h <= 200, `${name} hue ${h.toFixed(1)} must sit in the 180–200 cyan band`)
  }
})
