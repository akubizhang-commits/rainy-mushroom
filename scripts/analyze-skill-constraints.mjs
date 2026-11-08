// Doc 84 follow-up: how much do prerequisite / school-point gates restrict "mix everything" builds?
// Additive model on the ideal-probe tables (reports/skill-route-review-2026-11-06/rank-table-*.json):
//   build value V = 0.88 * sum over skills of (single + cluster6 / 4), 0.88 ~ observed shared-cast-channel loss.
// Realm gates (rank caps per level) and point costs come from the live game data.
// Brute-forces each school's rank vectors under the constraint, then combines schools with a knapsack.
// This is an ordering tool, not a fight simulation: it ignores shared mana, geometry and targeting.
// Usage: node scripts/analyze-skill-constraints.mjs [--table=real|unlimited]
import { readFileSync } from 'node:fs'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, rankCap } from '../js/xianxia/TowerGrowth.js'

const option = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d
const table = JSON.parse(readFileSync(new URL(`../reports/skill-route-review-2026-11-06/rank-table-${option('table', 'real') === 'real' ? 'real' : 'unlimited'}-mana.json`, import.meta.url)))
const defs = Object.fromEntries([...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS].map(d => [d.id, d]))
const xpAt = n => 30 * (n - 1) + 15 * (n - 1) ** 2
const value = (id, rank) => rank ? (table[id][rank - 1][0] + table[id][rank - 1][1] / 4) : 0
const cost = (id, rank) => defs[id].pointCosts.slice(0, rank).reduce((a, b) => a + b, 0)
// Single / cluster multipliers over the parent at rank 10: [rank1, rank2]
const EVO_MULT = {
  evo_wanjian: { parent: 'sj_yujian', single: [1.01, 1.20], cluster: [1.21, 1.58] },
  evo_tiandi: { parent: 'sj_line', single: [1.36, 1.74], cluster: [2.71, 4.37] },
  evo_wuwo: { parent: 'sj_wanjian', single: [1.17, 1.39], cluster: [1.22, 1.46] },
  evo_sixiang: { parent: 'sj_formation', single: [1.96, 2.24], cluster: [1.99, 2.29] },
}
const evoValue = (id, evoRank, parentRank) => {
  if (!evoRank) return 0
  const m = EVO_MULT[id], base = table[m.parent][parentRank - 1]
  // An evolution replaces its parent: its value is the parent's value times the multiplier, minus the replaced parent.
  return (base[0] * m.single[evoRank - 1] + base[1] * m.cluster[evoRank - 1] / 4) - (base[0] + base[1] / 4)
}

// School definitions. needs: skill -> [parent, minParentRank?]. tier: used by school-point gates.
const SCHOOLS = {
  qi: { skills: ['sj_arc', 'sj_moon', 'sj_moon_triple', 'sj_cross', 'sj_line'], evo: 'evo_tiandi',
    parent: { sj_moon: 'sj_arc', sj_line: 'sj_arc', sj_cross: 'sj_moon', sj_moon_triple: 'sj_moon' },
    tier: { sj_arc: 1, sj_moon: 1, sj_line: 2, sj_cross: 2, sj_moon_triple: 3 } },
  formation: { skills: ['sj_wanjian', 'sj_sancai', 'sj_formation'], evo: ['evo_wuwo', 'evo_sixiang'],
    parent: { sj_sancai: 'sj_wanjian', sj_formation: 'sj_wanjian' },
    tier: { sj_wanjian: 1, sj_sancai: 2, sj_formation: 3 } },
  yujian: { skills: ['sj_yujian', 'sj_shadow'], evo: 'evo_wanjian',
    parent: { sj_shadow: 'sj_yujian' }, tier: { sj_yujian: 1, sj_shadow: 2 } },
}
const evoParent = { evo_tiandi: 'sj_line', evo_wuwo: 'sj_wanjian', evo_sixiang: 'sj_formation', evo_wanjian: 'sj_yujian' }

function rankVectors(ids, caps) {
  let acc = [[]]
  for (const id of ids) acc = acc.flatMap(v => Array.from({ length: caps[id] + 1 }, (_, r) => [...v, r]))
  return acc
}

// rule: { chain: X } child needs parent rank >= X; { gate: [T2, T3] } tier-2/3 skills need that many points spent
// in the same school on lower tiers; evoNeeds: parent rank needed by an evolution.
function bestPerSchool(name, caps, rule) {
  const sc = SCHOOLS[name], evos = [sc.evo].flat()
  const ids = [...sc.skills, ...evos]
  const best = new Map() // spent -> { v, build }
  const vectors = rankVectors(ids, caps)
  for (const vec of vectors) {
    const rank = Object.fromEntries(ids.map((id, i) => [id, vec[i]]))
    let ok = true, spent = 0
    for (const id of ids) spent += rank[id] ? cost(id, rank[id]) : 0
    // evolutions need their parent
    for (const e of evos) if (rank[e] && (rank[evoParent[e]] < (rule.evoNeeds ?? 1))) ok = false
    if (!ok) continue
    if (rule.chain) for (const [child, parent] of Object.entries(sc.parent)) if (rank[child] && rank[parent] < rule.chain) ok = false
    if (ok && rule.gate) {
      for (const id of sc.skills) {
        if (!rank[id]) continue
        const t = sc.tier[id]; if (t < 2) continue
        const lower = sc.skills.filter(o => o !== id && sc.tier[o] < t).reduce((s, o) => s + (rank[o] ? cost(o, rank[o]) : 0), 0)
        if (lower < rule.gate[t - 2]) ok = false
      }
      for (const e of evos) if (rank[e]) {
        const others = sc.skills.reduce((s, o) => s + (rank[o] ? cost(o, rank[o]) : 0), 0)
        if (others < rule.gate[1]) ok = false
      }
    }
    if (!ok) continue
    let v = 0
    for (const id of sc.skills) v += value(id, rank[id])
    for (const e of evos) v += evoValue(e, rank[e], rank[evoParent[e]] || 1)
    const cur = best.get(spent)
    if (!cur || v > cur.v) best.set(spent, { v, rank })
  }
  // prefix max so that "spend at most s" is monotone
  const out = []
  let run = { v: 0, rank: {} }
  for (let s = 0; s <= 60; s++) { const b = best.get(s); if (b && b.v > run.v) run = { ...b, spent: s }; out[s] = run }
  return out
}

function combine(perSchool, budget, names) {
  let dp = Array.from({ length: budget + 1 }, () => ({ v: 0, parts: {} }))
  for (const name of names) {
    const next = Array.from({ length: budget + 1 }, () => ({ v: -1, parts: {} }))
    for (let s = 0; s <= budget; s++) for (let t = 0; t <= Math.min(s, 60); t++) {
      const cand = dp[s - t].v + perSchool[name][t].v
      if (cand > next[s].v) next[s] = { v: cand, parts: { ...dp[s - t].parts, [name]: { sp: t, rank: perSchool[name][t].rank } } }
    }
    dp = next
  }
  return dp[budget]
}

const LEVELS = { 5: 8, 7: 12, 10: 18, 14: 26, 17: 32, 20: 38, 24: 46, 26: 50, 30: 58 }
const RULES = {
  'S0 当前：无依赖': {},
  'S1 链式：后续技能需前置≥3级': { chain: 3 },
  'S2 链式：后续技能需前置≥6级': { chain: 6 },
  'S3 链式≥6＋进阶需基础≥6': { chain: 6, evoNeeds: 6 },
  'S4 流派点数门：二档≥6点、三档≥14点': { gate: [6, 14] },
  'S5 流派点数门：二档≥10点、三档≥24点': { gate: [10, 24] },
}
const fmt = r => Object.entries(r).filter(([, v]) => v).map(([k, v]) => `${k.replace(/^(sj_|evo_)/, '')}${v}`).join(' ')
const result = []
for (const [label, rule] of Object.entries(RULES)) {
  for (const [level, budget] of Object.entries(LEVELS)) {
    const caps = Object.fromEntries([...Object.values(SCHOOLS).flatMap(s => [...s.skills, ...[s.evo].flat()])].map(id => [id, rankCap(id, xpAt(Number(level)))]))
    const per = Object.fromEntries(Object.keys(SCHOOLS).map(n => [n, bestPerSchool(n, caps, rule)]))
    const pure = Object.fromEntries(Object.keys(SCHOOLS).map(n => [n, combine(per, budget, [n]).v * .88]))
    const mixed = combine(per, budget, Object.keys(SCHOOLS))
    const bestPure = Math.max(...Object.values(pure))
    result.push({ rule: label, level: Number(level), budget, pure, mixed: mixed.v * .88, ratio: mixed.v * .88 / bestPure,
      mixedBuild: Object.fromEntries(Object.entries(mixed.parts).map(([k, v]) => [k, `${v.sp}点 ${fmt(v.rank)}`])) })
  }
}
console.log(JSON.stringify(result, null, 1))
