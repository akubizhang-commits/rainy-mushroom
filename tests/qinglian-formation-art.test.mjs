import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { skillForm, qinglianPetalPose } from '../js/xianxia/TowerSkillForms.js'

const source = stripTypeScriptTypes(
  readFileSync(new URL('../cocos-pilot/assets/scripts/QinglianFormationArt.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, ''),
  { mode: 'transform' },
).replace(/^export /gm, '')
const art = runInNewContext(
  `(()=>{${source};return {qinglianPetals,QINGLIAN_PALETTE}})()`,
  { skillForm, qinglianPetalPose },
)
const { qinglianPetals, QINGLIAN_PALETTE } = art

test('qinglian petals draw 8/12/16 visual petals and only even petals are judgment blades', () => {
  const petals = qinglianPetals(.4, [1, 1, 1], [], 1)
  for (const ring of [0, 1, 2]) {
    const mine = petals.filter(petal => petal.ring === ring)
    assert.equal(mine.length, [8, 12, 16][ring])
    assert.equal(mine.filter(petal => petal.judgment).length, [4, 6, 8][ring])
  }
  const judged = petals.filter(petal => petal.judgment).length
  assert.equal(judged, 18)
})

test('outer ring fades below the inner ring and windup outlines stay limited', () => {
  const petals = qinglianPetals(.4, [1, 1, 1], [], 1)
  const alpha = ring => petals.find(petal => petal.ring === ring && petal.judgment).alpha
  assert.ok(alpha(2) < alpha(0))
  const windup = qinglianPetals(.1, [.6, 0, 0], [4, 0, 0], 1)
  assert.equal(windup.length, 4)
  assert.ok(windup.every(petal => petal.ring === 0))
})

test('palette stays in the cool blue-white range without green', () => {
  for (const colour of Object.values(QINGLIAN_PALETTE)) {
    const [r, g, b] = colour
    assert.ok(g >= r && b >= r, `colour ${colour} must lean cyan, not warm or green`)
    assert.ok(g < 250 || r < 250)
  }
})
