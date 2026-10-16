// T12 · 合规扫描（04 §7.1 锚点 B / 01 §2 / 05 §4.4 C2–C3）：扫描 js/survivor/data/strings.js
// 全部面向玩家文案。只扫字符串取值，不扫键名与源码注释。
import test from 'node:test'
import assert from 'node:assert/strict'
import { STRINGS } from '../js/survivor/data/strings.js'

const EAT_VERBS = ['吃', '食用', '采食', '美味']
const MUSHROOM_NOUNS = ['蘑菇', '菌']
const VIOLENT_WORDS = ['击杀', '消灭', '屠杀', '死亡', '血', '尸']

// Flattens nested objects/arrays into [path, string] pairs so future nested copy is scanned too.
function collectStrings(node, path = 'STRINGS', out = []) {
  if (typeof node === 'string') out.push([path, node])
  else if (Array.isArray(node)) node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) collectStrings(v, `${path}.${k}`, out)
  }
  return out
}

const entries = collectStrings(STRINGS)

test('strings.js 有可扫描的文案', () => {
  assert.ok(entries.length > 0)
})

test('无 {吃,食用,采食,美味}×{蘑菇,菌} 组合', () => {
  for (const [path, text] of entries) {
    for (const verb of EAT_VERBS) {
      if (!text.includes(verb)) continue
      for (const noun of MUSHROOM_NOUNS) {
        assert.ok(!text.includes(noun), `${path} 含「${verb}…${noun}」违规组合：${text}`)
      }
    }
  }
})

test('无暴力类词 {击杀,消灭,屠杀,死亡,血,尸}', () => {
  for (const [path, text] of entries) {
    for (const word of VIOLENT_WORDS) {
      assert.ok(!text.includes(word), `${path} 含违规词「${word}」：${text}`)
    }
  }
})

test('结算与 HUD 计数统一用“净化数”', () => {
  assert.equal(STRINGS.resultPurified, '净化数')
  assert.equal(STRINGS.hudPurified, '净化数')
})

test('失败文案统一用“被浊雾笼罩”', () => {
  assert.equal(STRINGS.resultLose, '被浊雾笼罩')
})

test('S1 界面文案齐全：HUD、三选一卡、结算、新手首条提示', () => {
  const required = [
    'hudTime', 'hudPurified', 'hudLevel', 'hudHp',
    'levelUpTitle', 'levelUpHintFirst', 'cardNewWeapon', 'cardUpgrade',
    'cardHealDew', 'cardHealDewDesc', 'cardShinySpore', 'cardShinySporeDesc',
    'resultWin', 'resultLose', 'resultSurvivalTime', 'resultPurified', 'resultLevel', 'resultCrystals',
    'tutorialMove',
  ]
  for (const key of required) {
    assert.equal(typeof STRINGS[key], 'string', `缺少 STRINGS.${key}`)
    assert.ok(STRINGS[key].length > 0, `STRINGS.${key} 为空`)
  }
  assert.equal(STRINGS.tutorialMove, '按住屏幕下方拖动来移动，攻击是自动的')
  assert.equal(STRINGS.levelUpHintFirst, '选一个能力，组合越多越强')
})
