// T12 · 合规扫描（04 §7.1 锚点 B / 01 §2 / 05 §4.4 C2–C3）：扫描 js/survivor/data/strings.js
// 全部面向玩家文案。只扫字符串取值，不扫键名与源码注释。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

test('雨滴坠击卡面与首局提示（09 A6 / S3-D2）：提示键存在，卡面说明含“不用瞄准”', () => {
  assert.equal(STRINGS.levelUpHintRaindrop, '雨滴会自己找浊雾生灵，边躲边打也稳')
  assert.ok(STRINGS.card_raindrop_desc.includes('不用瞄准'))
})

// CMP-05（04 §7.1）：cocos-pilot/assets/scripts/Survivor*.ts 中的中文字符串字面量自动扫描。
// 只扫字符串取值：跳过 // 与 /* */ 注释；console.* 日志的参数不属于面向玩家文案（04 §7.1），不扫。
// 白名单按 04 §7.1 写成精确条目 { file, text, word, reason }；当前为空。
const SCRIPTS_DIR = fileURLToPath(new URL('../cocos-pilot/assets/scripts/', import.meta.url))
const TS_WHITELIST = []
const CJK = /[\u4e00-\u9fff]/
// 极简词法：按顺序识别注释、'…' "…" `…` 字面量，返回 [行号, 文本, 是否 console 参数]。
function cjkLiterals(src) {
  const out = []
  let i = 0, line = 1
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (c === '\n') { line++; i++; continue }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && n === '*') { const end = src.indexOf('*/', i + 2); const stop = end < 0 ? src.length : end + 2; for (; i < stop; i++) if (src[i] === '\n') line++; continue }
    if (c === "'" || c === '"' || c === '`') {
      const start = i, startLine = line
      let text = ''
      i++
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') { text += src[i + 1]; i += 2; continue }
        if (src[i] === '\n') line++
        text += src[i++]
      }
      i++
      if (CJK.test(text)) out.push([startLine, text, /console\.\w+\(\s*$/.test(src.slice(Math.max(0, start - 40), start))])
      continue
    }
    i++
  }
  return out
}
const tsFiles = readdirSync(SCRIPTS_DIR).filter(f => /^Survivor.*\.ts$/.test(f)).sort()
const tsEntries = tsFiles.flatMap(f => cjkLiterals(readFileSync(join(SCRIPTS_DIR, f), 'utf8')).filter(e => !e[2]).map(([l, text]) => [`${f}:${l}`, f, text]))
const whitelisted = (file, text, word) => TS_WHITELIST.some(w => w.file === file && w.text === text && w.word === word)

test('CMP-05 Survivor*.ts 有可扫描的文件与中文字面量', () => {
  assert.ok(tsFiles.length >= 8, `只找到 ${tsFiles.length} 个 Survivor*.ts`)
  assert.ok(tsEntries.length > 0)
})

test('CMP-05 Survivor*.ts 中文字面量无 {吃,食用,采食,美味}×{蘑菇,菌} 组合', () => {
  for (const [where, file, text] of tsEntries) {
    for (const verb of EAT_VERBS) {
      if (!text.includes(verb)) continue
      for (const noun of MUSHROOM_NOUNS) {
        assert.ok(!text.includes(noun) || whitelisted(file, text, verb), `${where} 含「${verb}…${noun}」违规组合：${text}`)
      }
    }
  }
})

test('CMP-05 Survivor*.ts 中文字面量无暴力类词 {击杀,消灭,屠杀,死亡,血,尸}', () => {
  for (const [where, file, text] of tsEntries) {
    for (const word of VIOLENT_WORDS) {
      assert.ok(!text.includes(word) || whitelisted(file, text, word), `${where} 含违规词「${word}」：${text}`)
    }
  }
})

test('CMP-05 扫描器跳过注释与 console 日志、能识别字面量', () => {
  const sample = "// 血 注释\n/* 尸\n */ const a='净化'; console.warn('日志 血'); const b=`第 ${1} 行`\n"
  const found = cjkLiterals(sample)
  assert.deepEqual(found.map(e => [e[0], e[1], e[2]]), [[3, '净化', false], [3, '日志 血', true], [3, '第 ${1} 行', false]])
})
