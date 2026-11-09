// Before/after tables for the 2026-11-09 skill unlock rebalance.
// Usage: node scripts/skill-unlock-balance-compare.mjs <beforeDir> <afterDir> <beforeJsRoot> <afterJsRoot> <out.md>
// beforeDir / afterDir hold qi.json, qiHeavy.json, formation.json, yujian.json, qinglian.json written by
// verify-skill-school-curve.mjs (--floors=2..9 --seeds=101,211 --modes=move,half).
// beforeJsRoot / afterJsRoot are the repository roots whose js/xianxia/TowerGrowth.js supply the skill tables.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [, , beforeDir, afterDir, beforeRoot, afterRoot, outPath] = process.argv
if (!outPath) throw new Error('usage: <beforeDir> <afterDir> <beforeJsRoot> <afterJsRoot> <out.md>')
const SCHOOLS = ['qi', 'qiHeavy', 'formation', 'yujian', 'qinglian']
const NAME = { qiHeavy: '剑气重招（补充，脚本新增）', qi: '剑气', formation: '剑阵', yujian: '御剑', qinglian: '青莲' }
const SKILL = { sj_arc: '流云斩', sj_moon: '玄月斩', sj_line: '剑破虚空', evo_tiandi: '一剑开天', sj_cross: '双月斩', sj_moon_triple: '逐月斩',
  sj_yujian: '御剑术', sj_shadow: '分光连斩', evo_wanjian: '万剑归宗', sj_wanjian: '周天剑阵', sj_sancai: '三才剑阵', sj_formation: '两仪剑阵',
  evo_sixiang: '四象剑阵', evo_wuwo: '周天剑域', sj_qinglian: '青莲剑阵', sj_bone: '剑骨', vajra: '金刚', sj_spirit: '凝神诀', sj_heart: '剑心',
  sj_gate: '剑罡爆裂', sj_mark: '蚀骨剑意', sj_flight: '御剑飞行' }
const load = (dir, school) => JSON.parse(readFileSync(resolve(dir, `${school}.json`), 'utf8'))
const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const fmt = (x, d = 0) => x === null || x === undefined ? '—' : x.toFixed(d)
const pct = (a, b) => a === null || b === null || b === 0 ? '—' : `${a >= b ? '+' : ''}${((a - b) / b * 100).toFixed(1)}%`
const bought = b => Object.entries(b).map(([id, n]) => `${SKILL[id] || id}${n}`).join('、')
const lines = []
lines.push('# 技能可学等级调整 平衡前后对照（8 层 × 4 流派）', '')
lines.push('生成方式：`node scripts/verify-skill-school-curve.mjs --school=<qi|qiHeavy|formation|yujian|qinglian> --floors=2,3,4,5,6,7,8,9 --seeds=101,211 --modes=move,half --out=<目录>`。')
lines.push('改动前在基线 `62de5b02`（临时 detached worktree）运行，改动后在分支 `codex/skill-unlock-rebalance-2026-11-09` 运行，两侧脚本文件相同。')
lines.push('每层每流派 4 局（种子 101、211 × 操作 move、half）。“通关秒数”为 4 局平均战斗时长（失败局按失败时刻计）；“Boss秒数”为击杀 Boss 用时（首伤到死亡）的平均值，只计击杀成功的局；“受伤”为玩家受到的伤害平均值；“最低血”为 4 局最低血量比例的平均值。', '')
lines.push('购买规则（脚本既有）：按流派列表贪心把悟道点全部点完，被境界挡住的技能跳过，剩余点数投入心法/通用被动。剑气列表：玄月斩→流云斩→剑破虚空→一剑开天→双月斩→逐月斩。剑气重招（本次新增的补充流派）：玄月斩→剑破虚空→一剑开天→双月斩→逐月斩→流云斩。剑阵列表：周天剑阵→三才剑阵6→两仪剑阵→四象剑阵→三才剑阵10→周天剑域→流云斩。青莲列表：青莲剑阵。', '')
for (const school of SCHOOLS) {
  const b = load(beforeDir, school), a = load(afterDir, school)
  lines.push(`## ${NAME[school]}（${school}）`, '')
  lines.push('| 层 | 胜/4 前→后 | 通关秒数 前→后 | 变化 | Boss秒数 前→后 | 变化 | 受伤 前→后 | 最低血 前→后 |')
  lines.push('|---|---|---|---|---|---|---|---|')
  const floors = [...new Set(b.rows.map(r => r.floor))].sort((x, y) => x - y)
  for (const floor of floors) {
    const rb = b.rows.filter(r => r.floor === floor), ra = a.rows.filter(r => r.floor === floor)
    if (rb.length !== ra.length) throw new Error(`${school} floor ${floor}: run count mismatch`)
    const win = rs => rs.filter(r => r.outcome === 'won').length
    const secs = rs => mean(rs.map(r => r.seconds)), boss = rs => mean(rs.filter(r => r.bossSeconds !== null).map(r => r.bossSeconds))
    const hurt = rs => mean(rs.map(r => r.received)), low = rs => mean(rs.map(r => r.minHp))
    lines.push(`| ${floor} | ${win(rb)}→${win(ra)} | ${fmt(secs(rb))}→${fmt(secs(ra))} | ${pct(secs(ra), secs(rb))} | ${fmt(boss(rb))}→${fmt(boss(ra))} | ${pct(boss(ra), boss(rb))} | ${fmt(hurt(rb))}→${fmt(hurt(ra))} | ${fmt(low(rb), 2)}→${fmt(low(ra), 2)} |`)
  }
  lines.push('', '各层购买结果（前 / 后）：', '')
  lines.push('| 层 | 改动前 | 改动后 |', '|---|---|---|')
  for (const f of b.fixtures) {
    const g = a.fixtures.find(x => x.floor === f.floor)
    lines.push(`| ${f.floor} | ${bought(f.bought)} | ${bought(g.bought)} |`)
  }
  lines.push('')
}
const growth = async root => import(pathToFileURL(resolve(root, 'js/xianxia/TowerGrowth.js')).href)
const before = await growth(beforeRoot), after = await growth(afterRoot)
const row = (m, id) => [...m.GROWTH_SKILLS, ...m.GROWTH_EVOLUTIONS].find(s => s.id === id)
lines.push('## 数据表对照（每次施放倍率与每秒倍率）', '')
lines.push('倍率为 TowerGrowth 的 damage（相对攻击力）。“每秒”= 每次施放 ÷ 冷却，只用于比较同一技能前后，不代表实际战斗输出。', '')
lines.push('| 技能 | 等级 | 每次施放 前→后 | 冷却 前→后 | 每秒 前→后 | 变化 |', '|---|---|---|---|---|---|')
for (const id of ['sj_line', 'sj_sancai', 'sj_qinglian']) for (const rank of [1, 4, 7, 10]) {
  const x = row(before, id), y = row(after, id), db = x.damage[rank - 1], da = y.damage[rank - 1]
  lines.push(`| ${SKILL[id]} | ${rank} | ${db.toFixed(2)}→${da.toFixed(2)} | ${x.cooldown}→${y.cooldown} | ${(db / x.cooldown).toFixed(3)}→${(da / y.cooldown).toFixed(3)} | ${pct(da / y.cooldown, db / x.cooldown)} |`)
}
lines.push('')
lines.push('## 可学等级与等级段对照', '')
lines.push('| 技能 | 可学等级 前→后 | 各等级段开放等级 前 | 后 |', '|---|---|---|---|')
for (const id of ['sj_mark', 'sj_moon_triple', 'sj_cross', 'sj_line', 'evo_wuwo', 'evo_tiandi']) {
  const x = row(before, id), y = row(after, id)
  const bands = r => [...new Set(r.rankRequirements.map(q => q.characterLevel))].join('/')
  lines.push(`| ${SKILL[id]} | ${x.learnLevel}→${y.learnLevel} | ${bands(x)} | ${bands(y)} |`)
}
lines.push('')
writeFileSync(resolve(outPath), lines.join('\n') + '\n')
console.log(`wrote ${outPath}`)
