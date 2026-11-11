// 生成所有攻击功法的强度表（伤害系数，未乘攻击力/装备/共鸣/暴击）。
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS } from '../../js/xianxia/TowerGrowth.js'
import { skillForm, convergenceRainMultiplier } from '../../js/xianxia/TowerSkillForms.js'
import { MANA_COSTS } from '../../js/xianxia/TowerCharacterStats.js'
const S = Object.fromEntries(GROWTH_SKILLS.map(s => [s.id, s])), E = Object.fromEntries(GROWTH_EVOLUTIONS.map(s => [s.id, s]))
const v = (s, k, lv) => Array.isArray(s[k]) ? s[k][lv - 1] : s[k]
const f = n => n == null ? '—' : n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)
const ids = ['sj_arc','sj_moon','sj_moon_triple','sj_cross','sj_line','sj_yujian','sj_shadow','sj_jinghong','sj_wanjian','sj_qinglian','sj_sancai','sj_formation']
const school = { sj_arc:'通用', sj_moon:'剑气', sj_moon_triple:'剑气', sj_cross:'剑气', sj_line:'剑气', sj_yujian:'御剑', sj_shadow:'御剑', sj_jinghong:'御剑', sj_wanjian:'剑阵', sj_qinglian:'剑阵', sj_sancai:'剑阵', sj_formation:'剑阵' }
function row(id, lv) {
  const s = S[id], form = skillForm(id, lv, 1, lv), d = v(s, 'damage', lv), cd = id === 'sj_yujian' ? 1 : s.cooldown
  let total = d, cap = form.targetCap ?? v(s, 'target_cap', lv), note = ''
  if (id === 'sj_wanjian') { total = d * 10; note = '贴身4秒共7击' }
  if (id === 'sj_formation') total = d * s.ticks
  if (id === 'sj_yujian') { note = '总输出不随目标数增加'; cap = 1 }
  if (id === 'sj_qinglian') { cap = null; note = '目标不限' }
  if (id === 'sj_line') note = `贯穿${cap}目标`
  const dps = total / cd, first = (s.windup ?? .18) + (form.initialDelay ?? 0)
  return { id, name: s.name, lv, unlock: s.rankRequirements[lv - 1].characterLevel, cd, total, dps,
    aoe: cap ? dps * cap : dps * 10, cap: cap ?? '不限(按10)', mana: MANA_COSTS[id], perMana: id === 'sj_yujian' ? null : total / MANA_COSTS[id],
    hits: form.hits ?? (id === 'sj_wanjian' ? 7 : id === 'sj_yujian' ? form.swords : 1), dur: form.duration || 0, first,
    slow: s.slow_fraction ? `${s.slow_fraction * 100}%` : '', note }
}
const out = []
out.push('| 流派 | 功法 | 级 | 需角色等级 | 冷却 | 单目标整招 | 单目标秒伤 | 目标上限 | 满目标秒伤 | 灵力 | 伤害/灵力 | 同敌击数 | 持续 | 首伤时间 | 减速 | 备注 |')
out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
const rows = []
for (const id of ids) for (const lv of [1, 4, 7, 10]) rows.push(row(id, lv))
// 进阶（基础功法10级时）
const y10 = v(S.sj_yujian, 'damage', 10), l10 = v(S.sj_line, 'damage', 10), g10 = v(S.sj_formation, 'damage', 10)
for (const r of [1, 2]) {
  const rain = y10 * convergenceRainMultiplier(r), wf = skillForm('evo_wanjian', r)
  rows.push({ id:'evo_wanjian', name:'万剑归宗', lv:`进${r}`, unlock: E.evo_wanjian.rankRequirements[r-1].characterLevel, cd:15, total: rain, dps: y10 + rain / 15,
    aoe: y10 + rain / 15 * wf.targetCap, cap: wf.targetCap, mana: MANA_COSTS.evo_wanjian, perMana: rain / MANA_COSTS.evo_wanjian, hits: wf.hits, dur: wf.duration, first: .35 + wf.initialDelay, slow:'', note:'整招=剑雨；秒伤含御剑10级常驻' })
  const tf = skillForm('evo_tiandi', r), tt = l10 * E.evo_tiandi.budgetMultipliers[r-1] * 12 / S.sj_line.cooldown
  rows.push({ id:'evo_tiandi', name:'一剑开天', lv:`进${r}`, unlock: E.evo_tiandi.rankRequirements[r-1].characterLevel, cd:12, total: tt, dps: tt/12,
    aoe: tt/12 * (tf.targetCap ?? S.sj_line.target_cap[9]), cap: tf.targetCap ?? S.sj_line.target_cap[9], mana: MANA_COSTS.evo_tiandi, perMana: tt / MANA_COSTS.evo_tiandi, hits: 1, dur: 0, first: .45, slow:'', note:'' })
  const sf = skillForm('evo_sixiang', r), st = g10 * 6 * E.evo_sixiang.budgetMultipliers[r-1] * 15 / 12
  rows.push({ id:'evo_sixiang', name:'四象剑阵', lv:`进${r}`, unlock: E.evo_sixiang.rankRequirements[r-1].characterLevel, cd:15, total: st, dps: st/15,
    aoe: st/15*8, cap: 8, mana: MANA_COSTS.evo_sixiang, perMana: st / MANA_COSTS.evo_sixiang, hits: sf.hits, dur: sf.duration, first: .45 + sf.initialDelay, slow:'40%', note:'按两仪10级' })
}
const sch = id => school[id] ?? (id === 'evo_wanjian' ? '御剑' : id === 'evo_tiandi' ? '剑气' : '剑阵')
for (const r of rows) out.push(`| ${sch(r.id)} | ${r.name} | ${r.lv} | ${r.unlock} | ${r.cd} | ${f(r.total)} | ${f(r.dps)} | ${r.cap} | ${f(r.aoe)} | ${r.mana} | ${f(r.perMana)} | ${r.hits} | ${r.dur ? +r.dur.toFixed(2) : '—'} | ${+r.first.toFixed(2)} | ${r.slow} | ${r.note} |`)
console.log(out.join('\n'))
// 满级单目标秒伤排行
console.log('\nRANK10'); for (const r of rows.filter(r => r.lv === 10 || r.lv === '进2').sort((a,b)=>b.dps-a.dps)) console.log(r.name, r.lv, f(r.dps), f(r.aoe))
