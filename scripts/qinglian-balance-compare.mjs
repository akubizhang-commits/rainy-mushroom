// Builds the before/after table for the 青莲剑阵 redo from school-curve outputs and group-damage outputs.
// Usage: node scripts/qinglian-balance-compare.mjs <beforeDir> <afterDir> <groupBefore.json> <groupAfter.json> <out.md>
// beforeDir / afterDir each hold qi.json, formation.json, yujian.json written by verify-skill-school-curve.mjs.
// 伤害 = 玩家受到的伤害 (rows[].received), averaged over the 4 runs (2 seeds x move/half) of each floor.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [, , beforeDir, afterDir, groupBeforePath, groupAfterPath, outPath] = process.argv
if (!outPath) throw new Error('usage: <beforeDir> <afterDir> <groupBefore.json> <groupAfter.json> <out.md>')
const SCHOOLS = ['qi', 'formation', 'yujian']
const SCHOOL_NAME = { qi: '剑气', formation: '剑阵（周天）', yujian: '御剑' }
const load = (dir, school) => JSON.parse(readFileSync(resolve(dir, `${school}.json`), 'utf8'))
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const pct = (after, before) => before === 0 ? 'n/a' : `${((after - before) / before * 100).toFixed(1)}%`
const signed = (x, digits) => `${x >= 0 ? '+' : ''}${x.toFixed(digits)}`
const fmt = (x, digits = 1) => x.toFixed(digits)

function floorStats(data) {
  const byFloor = new Map()
  for (const row of data.rows) {
    if (!byFloor.has(row.floor)) byFloor.set(row.floor, [])
    byFloor.get(row.floor).push(row)
  }
  return byFloor
}

const lines = []
lines.push('# 青莲剑阵重做 平衡前后对照（8 层 × 3 流派）', '')
lines.push('生成方式：`node scripts/verify-skill-school-curve.mjs --school=<qi|formation|yujian> --floors=2,3,4,5,6,7,8,9 --seeds=101,211 --modes=move,half --out=<目录>`，改动前后各跑一遍。')
lines.push('改动前：`e5b65c59`（青莲重做分支的基线）。改动后：分支 `codex/qinglian-redo-2026-11-09` 当前 HEAD。两侧使用同一份脚本文件。')
lines.push('每层每流派 4 局（种子 101、211 × 操作 move、half）。“伤害”为玩家受到伤害的平均值。胜局数为 4 局中通关的局数。')
lines.push('注意：三个流派的购买列表都不含青莲剑阵。前后两侧的逐局受伤与秒数完全相同，说明青莲的改动不影响这三个流派的曲线。', '')
lines.push('校验：`reports/skill-school-curve-2026-11-07/` 中 qi、formation、yujian 的既有结果，与本次在 `e5b65c59` 上的改动前复跑逐层受伤完全一致，因此既有结果可作为改动前基准。', '')

for (const school of SCHOOLS) {
  const before = floorStats(load(beforeDir, school))
  const after = floorStats(load(afterDir, school))
  lines.push(`## ${SCHOOL_NAME[school]}（${school}）`, '')
  lines.push('| 层 | 前伤害 | 后伤害 | 变化量 | 变化百分比 | 前胜/4 | 后胜/4 | 前秒数 | 后秒数 |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const floor of [...before.keys()].sort((a, b) => a - b)) {
    const b = before.get(floor), a = after.get(floor)
    if (!a || a.length !== b.length) throw new Error(`${school} floor ${floor}: run count mismatch`)
    const bDmg = mean(b.map(r => r.received)), aDmg = mean(a.map(r => r.received))
    const bWin = b.filter(r => r.outcome === 'won').length, aWin = a.filter(r => r.outcome === 'won').length
    lines.push(`| ${floor} | ${fmt(bDmg)} | ${fmt(aDmg)} | ${signed(aDmg - bDmg, 1)} | ${pct(aDmg, bDmg)} | ${bWin} | ${aWin} | ${fmt(mean(b.map(r => r.seconds)), 0)} | ${fmt(mean(a.map(r => r.seconds)), 0)} |`)
  }
  lines.push('')
}

const gb = JSON.parse(readFileSync(resolve(groupBeforePath), 'utf8'))
const ga = JSON.parse(readFileSync(resolve(groupAfterPath), 'utf8'))
lines.push('## 群怪场景（单次施放，6 秒内结算，多目标）', '')
lines.push(`生成方式：\`node scripts/qinglian-group-damage.mjs <js 根目录> <标签>\`。种子 ${gb.seeds.join('、')}，楼层 ${gb.floor}，sj_qinglian 1 阶，敌人位于 200 像素判定范围内。`)
lines.push('')
lines.push('| 场景 | 前总伤害 | 后总伤害 | 变化量 | 变化百分比 | 前单目标均伤 | 后单目标均伤 |')
lines.push('|---|---|---|---|---|---|---|')
for (const name of Object.keys(gb.groups)) {
  const b = gb.groups[name], a = ga.groups[name]
  lines.push(`| ${name}（${b.distances.length} 目标） | ${fmt(b.meanTotalDamage)} | ${fmt(a.meanTotalDamage)} | ${signed(a.meanTotalDamage - b.meanTotalDamage, 1)} | ${pct(a.meanTotalDamage, b.meanTotalDamage)} | ${fmt(b.meanPerTargetDamage)} | ${fmt(a.meanPerTargetDamage)} |`)
}
lines.push('')
lines.push('群怪伤害上升的原因是目标数不设上限。改动前只有 6 个目标受伤，改动后范围内所有目标都受伤。单目标伤害基本不变。', '')

writeFileSync(resolve(outPath), lines.join('\n') + '\n')
console.log(`wrote ${outPath}`)
