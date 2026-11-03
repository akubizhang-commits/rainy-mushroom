#!/usr/bin/env node
// Read-only game audit: output is confined to docs/xianxia/reports/skill-dps.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, rankCap } from '../js/xianxia/TowerGrowth.js'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'

const output = new URL('../docs/xianxia/reports/skill-dps/', import.meta.url)
const byId = new Map(GROWTH_SKILLS.map(s => [s.id, s]))
const v = (s, key, level) => Array.isArray(s[key]) ? s[key][level - 1] : s[key]
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-5, `${label}: ${a} != ${b}`)
const period = 120, step = 1 / 60
const checkOnly = process.argv.includes('--check-only')
const sourceFiles = ['TowerGrowth.js', 'TowerRun.js', 'TowerSkillPresentation.js', 'TowerCampaign.js',
  'TowerProfile.js', 'TowerWeapons.js', 'TowerEquipment.js', 'TowerContent.js', 'TowerSkillTiming.js']
async function sourceHashes() {
  return Object.fromEntries(await Promise.all(sourceFiles.map(async name => [name,
    createHash('sha256').update(await readFile(new URL(`../js/xianxia/${name}`, import.meta.url))).digest('hex')])) )
}
const hashes = await sourceHashes()
const evidence = []
// Independent acceptance contract from approved doc52, not a copy of values
// observed in the runtime under test. Report generation must wait for landing.
const approvedCurves = { sj_yujian: [1.2, 1.10], sj_arc: [1.5, 1.15], sj_wanjian: [.30, 1.20],
  sj_line: [8, 1.10], sj_shadow: [4.8, 1.20], sj_formation: [32 / 15, 1.15] }
const approvedBudgets = { evo_wanjian: [1.30, 1.43], evo_tiandi: [1.40, 1.54],
  evo_wuwo: [1.20, 1.44], evo_sixiang: [1.25, 1.4375] }
for (const [id, [base, growth]] of Object.entries(approvedCurves)) {
  const skill = byId.get(id)
  assert.equal(skill.maxLevel, 10, `${id} doc52 max rank`)
  for (let rank = 1; rank <= 10; rank++) close(v(skill, 'damage', rank), base * growth ** (rank - 1), `${id} doc52 curve/${rank}`)
}
for (const evo of GROWTH_EVOLUTIONS) {
  assert.equal(evo.maxLevel, 2, 'doc52 does not unlock evolution rank3')
  assert.deepEqual(evo.budgetMultipliers, approvedBudgets[evo.id], `${evo.id} approved custom budgets`)
  assert.deepEqual(evo.rankRequirements.map(r => [r.characterLevel, r.clear, r.parentLevel]),
    [[19, 6, 6], [27, 9, 8]], `${evo.id} evolution requirements unchanged`)
}
const cultivation = []
for (let level = 1; level <= 27; level++) {
  // Locate actual transition without assuming the old XP polynomial.
  let lo = 0, hi = TOWER_XP_CAP
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (cultivationAt(mid).level >= level) hi = mid; else lo = mid + 1 }
  const c = cultivationAt(lo), realm = Math.floor((level - 1) / 9), minor = level - 1 - realm
  assert.equal(c.level, level)
  if (lo) assert.equal(cultivationAt(lo - 1).level, level - 1, 'XP transition boundary')
  close(c.attackMultiplier, 1.06 ** minor * 1.30 ** realm, `doc52 attack at ${level}`)
  close(c.maxHp, 100 * 1.08 ** minor * 1.35 ** realm, `doc52 HP at ${level}`)
  const caps = Object.fromEntries(GROWTH_SKILLS.map(d => [d.id, level < d.learnLevel ? 0 : rankCap(d.id, lo, 9)]))
  cultivation.push({ level, xp: lo, realm: c.realm, attack: 100 * c.attackMultiplier, hp: c.maxHp, rank_caps: caps })
}
let checks = 0
const invested = (s, rank) => s.pointCosts.slice(0, rank).reduce((a, b) => a + b, 0)
  - (['sj_yujian', 'sj_arc', 'sj_wanjian'].includes(s.id) ? s.pointCosts[0] : 0)
function fixture(base, level, evolution, rank = 0, passive) {
  // No persistent storage; xp0 deliberately normalizes attack to100. Skill ranks
  // are isolated combat probes, not claimed to be legal xp0 Campaign builds.
  const state = structuredClone(new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state)
  state.skills = { sj_yujian: 1, [base.id]: level, ...(passive || {}) }
  if (evolution) { state.evolutions = [evolution.id]; state.evolutionRanks = { [evolution.id]: rank } }
  const loadout = combatLoadout(state)
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 1, xp: 0, hp: 100, loadout, training: true })
  run.state.player.x = 0; run.state.player.y = 0
  // Keep a required tutorial attack in the valid loadout, but suppress its cast
  // scheduler when measuring another skill. No gameplay source is modified.
  for (const id of Object.keys(run.state.cooldowns)) if (id !== base.id && id !== evolution?.id) run.state.cooldowns[id] = 1e9
  const enemy = { id: 'audit-target', hp: 1e9, x: 80, y: 0, radius: 5, woundBudget: 0, woundUntil: 0, orbitNextAt: 0 }
  run.state.enemies = [enemy]
  close(run.state.player.attack, 100, 'normalized attack')
  return { state, run, enemy }
}
function probe(base, level, evo, rank, expected, inner = false) {
  const { state, run, enemy } = fixture(base, level, evo, rank)
  if (inner) enemy.x = 10
  let sum = 0, firstHit = null, hits = 0
  const starts = [], releases = [], zoneTicks = {}
  const release = run._releaseSkill.bind(run)
  run._releaseSkill = (cast, outgoing) => { releases.push(run.state.time); release(cast, outgoing) }
  for (let frame = 0; frame < period / step; frame++) {
    run.state.time = frame * step
    const outgoing = [], incoming = []
    const beforeCooldown = run.state.cooldowns[base.id]
    run._skills(outgoing)
    if (run.state.cooldowns[base.id] !== beforeCooldown) starts.push(run.state.time)
    run._projectiles(incoming, outgoing, run.state.player)
    run._zones(incoming, outgoing)
    for (const hit of outgoing) {
      const before = enemy.hp
      run._damageEnemy(hit)
      const actual = before - enemy.hp
      close(actual, hit.damage, `${base.id} unmodified runtime damage`)
      sum += actual; hits++
      if (firstHit === null) firstHit = run.state.time
      if (['formation', 'sword_rain', 'shadow'].includes(hit.source)) zoneTicks[hit.source] = (zoneTicks[hit.source] || 0) + 1
    }
    run.state.effects = []
  }
  close(sum / period, expected, `${evo?.id || base.id} rank${rank || level}/parent${level} 120s DPS${inner ? ' inner' : ''}`)
  if (base.cooldown) {
    const cd = evo?.id === 'evo_tiandi' ? evo.cooldown : base.cooldown
    for (let i = 1; i < starts.length; i++) close(starts[i] - starts[i - 1], cd, 'start-to-start CD')
    close(releases[0] - starts[0], Math.ceil((evo?.windup ?? base.windup) / step - 1e-8) * step, 'tick-quantized windup')
  }
  if (base.id === 'sj_formation') assert.equal(zoneTicks.formation, v(base, 'ticks', level) * period / base.cooldown)
  if (evo?.id === 'evo_wanjian') assert.equal(zoneTicks.sword_rain, evo.rainTicks * period / evo.rainCooldown)
  assert.ok(hits > 0 && firstHit !== null, 'runtime probe must cause actual target HP loss')
  checks++
  evidence.push({ id: evo?.id || base.id, rank: rank || level, parent_rank: evo ? level : null,
    region: inner ? 'inner' : 'main', expected_dps: expected, actual_dps: sum / period,
    hits, casts: starts.length, releases: releases.length, zone_ticks: zoneTicks, first_hit_s: firstHit })
  return { runtime_dps_120s: sum / period, first_hit_s: firstHit, presentation: skillPresentation(state, evo?.id || base.id) }
}
const rows = []
function activeRow(base, level, evo, rank) {
  const budget = evo ? evo.budgetMultipliers[rank - 1] : 1
  const raw = 100 * v(base, 'damage', level)
  const cd = evo?.id === 'evo_tiandi' ? evo.cooldown : base.cooldown ?? base.hit_interval
  let damage = raw * budget, dps, rain = 0, inner = '', condition = base.rule
  if (base.id === 'sj_yujian') {
    damage = raw * (evo ? evo.regularMultiplier : 1)
    rain = evo ? raw / base.cooldown * (budget - evo.regularMultiplier) : 0
    dps = damage / cd + rain
  } else if (base.id === 'sj_formation') dps = damage * base.ticks / cd
  else {
    if (evo?.id === 'evo_tiandi') damage = raw * evo.cooldown / base.cooldown * budget
    dps = damage / cd
  }
  const measured = probe(base, level, evo, rank, dps)
  const display = key => measured.presentation.stats.find(s => s.key === key)?.value
  if (base.id === 'sj_yujian') {
    close(display('roundDamage'), damage, 'presentation round')
    close(display('swordDamage') * v(base, 'swords', level), damage, 'swords share round')
    if (evo) close(display('rainTickDamage') * evo.rainTicks / evo.rainCooldown, rain, 'presentation rain')
  } else close(display(['sj_wanjian', 'sj_formation'].includes(base.id) ? 'tickDamage' : 'hitDamage'), damage, 'presentation hit')
  if (evo?.id === 'evo_wuwo') { inner = raw * evo.innerMultiplier / cd; probe(base, level, evo, rank, inner, true) }
  const cap = v(base, 'target_cap', level)
  const aoe = base.id === 'sj_yujian' ? damage / cd + rain * (evo?.rainTargetCap || 0) : dps * cap
  rows.push({ id: evo?.id || base.id, name: evo?.name || base.name, kind: evo ? 'evolution' : 'active',
    skill_rank: evo ? rank : level, parent_id: evo ? base.id : '', parent_rank: evo ? level : '',
    own_skill_points: invested(evo || base, evo ? rank : level),
    parent_skill_points: evo ? invested(base, level) : '',
    attack: 100, damage_per_hit_or_round: damage, cooldown_or_interval_s: cd,
    radius: v(base, 'radius', level) ?? '', reach: v(base, 'reach', level) ?? '',
    cast_windup_s: base.id === 'sj_wanjian' ? 0 : evo?.windup ?? base.windup,
    ticks_per_zone: base.ticks ?? (evo?.rainTicks || ''), ideal_single_dps: dps,
    inner_single_dps: inner, full_coverage_total_dps_upper: aoe,
    parent_single_dps: evo ? dps / budget : '', parent_relative: evo ? budget : '',
    target_cap: cap, runtime_dps_120s: measured.runtime_dps_120s, first_hit_s: measured.first_hit_s,
    conditional_bonus_at_100_direct_dps: '', conditions: (evo ? `${evo.rule} ` : '') + condition })
}
for (const base of GROWTH_SKILLS.filter(s => s.kind === 'active')) for (let level = 1; level <= rankCap(base.id, TOWER_XP_CAP, 9); level++) activeRow(base, level)
for (const evo of GROWTH_EVOLUTIONS) for (let rank = 1; rank <= rankCap(evo.id, TOWER_XP_CAP, 9); rank++) for (const level of [6, 8, 10]) {
  if (level >= evo.rankRequirements[rank - 1].parentLevel) activeRow(byId.get(evo.parent), level, evo, rank)
}
for (const passive of GROWTH_SKILLS.filter(s => s.kind === 'passive')) {
  for (let level = 1; level <= rankCap(passive.id, TOWER_XP_CAP, 9); level++) {
    const { state, run, enemy } = fixture(byId.get('sj_yujian'), 1, null, 0, { [passive.id]: level })
    run._random = () => 1
    run._damageEnemy({ target: enemy.id, damage: 100, direct: true, source: 'sj_yujian' })
    let bonus = 0, notes = passive.rule
    const observed = { initial_hit_loss: 1e9 - enemy.hp }
    const val = key => v(passive, key, level)
    if (passive.id === 'sj_heart') {
      const before = enemy.hp; run._random = () => 0
      run._damageEnemy({ target: enemy.id, damage: 100, direct: true, source: 'sj_yujian' })
      close(before - enemy.hp, 100 * (1 + val('crit_bonus')), 'runtime crit extra')
      observed.crit_damage = before - enemy.hp
      for (const [roll, multiplier] of [[val('crit_chance') - 1e-7, 1 + val('crit_bonus')], [val('crit_chance') + 1e-7, 1]]) {
        const previous = enemy.hp; run._random = () => roll
        run._damageEnemy({ target: enemy.id, damage: 100, direct: true, source: 'sj_yujian' })
        close(previous - enemy.hp, 100 * multiplier, 'runtime crit threshold')
      }
      Object.assign(observed, { crit_chance: val('crit_chance'), threshold_both_sides: true })
      bonus = 100 * val('crit_chance') * val('crit_bonus')
      notes += ` 每100点/秒可暴击直伤，期望增加${bonus}点/秒；不是独立攻击。`
    } else if (passive.id === 'sj_mark') {
      bonus = 100 * val('wound_share'); close(enemy.woundBudget, bonus, 'runtime wound budget')
      observed.wound_budget = enemy.woundBudget
      notes += ' 表中增量以100有效直伤/秒、目标存活且预算充分释放为上限；刷新剩余预算会延后兑现。'
    } else if (passive.id === 'sj_bone') {
      bonus = 100 * val('damage_bonus'); close(1e9 - enemy.hp, 100 + bonus, 'runtime bone multiplier')
      notes += ` 移速增加${100 * val('speed_bonus')}%；也增强未scaled的剑阵伤害。`
    } else if (passive.id === 'sj_gate') {
      close(run.state.gateEntries[0].amount, 100 * val('share'), 'runtime gate generation')
      observed.gate_budget = run.state.gateEntries[0].amount
      bonus = Math.min(100 * val('share'), 100 * val('proc_damage') / val('icd'))
      notes += ` 单体无小怪可击杀时DPS=0；增量栏为100有效直伤/秒且反复击杀、预算不浪费的总伤害上限；单次上限${100 * val('proc_damage')}。`
    } else if (passive.id === 'vajra') {
      // Inject one external hit, but exercise the real incoming-damage path.
      run.state.enemies = []; run.state.pending = []; run.state.reserved = []
      run._enemyActions = incoming => incoming.push({ id: 'audit-hit', damage: 50 })
      run._skills = () => {}; run._spawn = () => {}; run._requestAttacks = () => {}
      const hp = run.state.player.hp; run._tick()
      close(hp - run.state.player.hp, 50 * (1 - Math.min(.15, val('reduction'))), 'runtime incoming reduction')
      Object.assign(observed, { incoming: 50, actual_hp_loss: hp - run.state.player.hp })
      notes += ` 减伤${100 * val('reduction')}%，实测50点来袭的实际扣血。`
    } else if (passive.id === 'magnet') {
      const radius = 36 * (1 + val('pickup_bonus')) + 9
      run.state.player.hp = 50
      run.state.drops = [{ id: 'inside', kind: 'heal', x: radius - .01, y: 0, radius: 9, amount: 5, expiresAt: 10 },
        { id: 'outside', kind: 'heal', x: radius + .01, y: 0, radius: 9, amount: 5, expiresAt: 10 }]
      run._drops()
      close(run.state.player.hp, 55, 'runtime pickup boundary inside')
      assert.deepEqual(run.state.drops.map(d => d.id), ['outside'], 'runtime pickup boundary outside')
      Object.assign(observed, { boundary_radius: radius, recovered_hp: run.state.player.hp - 50, remaining_drops: run.state.drops.map(d => d.id) })
      notes += ` 拾取半径+${100 * val('pickup_bonus')}%，检查边界内外回血掉落；不改经验。`
    } else if (passive.id === 'sj_flight') notes += ` 移速+${100 * val('speed_bonus')}%。`
    else assert.fail(`missing independent runtime probe for passive ${passive.id}`)
    const presentation = skillPresentation(state, passive.id)
    assert.ok(presentation.stats.length > 0)
    if (passive.id === 'sj_heart') assert.equal(presentation.stats.find(r => r.key === 'critChance').value, `${Number((100 * val('crit_chance')).toFixed(3))}%`)
    if (passive.id === 'sj_gate') close(presentation.stats.find(r => r.key === 'procCap').value, 100 * val('proc_damage'), 'presentation gate')
    if (['sj_flight', 'sj_bone'].includes(passive.id)) close(stats(0, run.state.loadout).moveSpeed / stats(0, { ...run.state.loadout, passive: {} }).moveSpeed, 1 + val('speed_bonus'), 'runtime flight speed')
    if (['sj_flight', 'sj_bone'].includes(passive.id)) observed.move_speed = stats(0, run.state.loadout).moveSpeed
    checks++
    evidence.push({ observed, id: passive.id, rank: level, region: 'passive', result: 'passed', method: ({ sj_heart: 'forced crit HP delta', sj_mark: 'wound budget after actual hit', sj_bone: 'actual hit HP delta and move speed', sj_gate: 'gate budget after actual hit', vajra: 'real tick incoming HP delta', magnet: 'inside/outside pickup boundary', sj_flight: 'runtime move speed' })[passive.id] })
    rows.push({ id: passive.id, name: passive.name, kind: 'passive', skill_rank: level, attack: 100,
      own_skill_points: invested(passive, level),
      ideal_single_dps: 0, conditional_bonus_at_100_direct_dps: bonus, conditions: notes })
  }
}
const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]
const quote = value => `"${String(typeof value === 'number' ? Number(value.toFixed(6)) : value ?? '').replaceAll('"', '""')}"`
const csv = [columns.map(quote).join(','), ...rows.map(row => columns.map(key => quote(row[key])).join(','))].join('\n') + '\n'
const previewState = structuredClone(new TowerCampaignStore({ getItem: () => null, setItem() {} }, 0).state)
const preview = skillPresentation(previewState, 'evo_tiandi')
const tiandiUnlearnedPreview = { parent_rank: previewState.skills.sj_line ?? 0,
  hit_damage: preview.stats.find(r => r.key === 'hitDamage').value, cooldown: preview.cooldown }
const tiandi = GROWTH_EVOLUTIONS.find(e => e.id === 'evo_tiandi'), line = byId.get(tiandi.parent)
const fallbackRank = Math.max(1, previewState.skills[line.id] ?? 0)
const expectedPreview = 100 * v(line, 'damage', fallbackRank) * tiandi.cooldown / v(line, 'cooldown', fallbackRank) * tiandi.budgetMultipliers[0]
close(tiandiUnlearnedPreview.hit_damage, expectedPreview, 'unlearned tiandi preview independently derived at fallback parent rank')
close(tiandiUnlearnedPreview.cooldown, tiandi.cooldown, 'unlearned tiandi preview CD')
const firstTiandi = rows.find(r => r.id === tiandi.id && r.skill_rank === 1 && r.parent_rank === tiandi.rankRequirements[0].parentLevel)
assert.ok(firstTiandi, 'first legal parent-rank probe present')
assert.equal(checks, 134, 'retain all 134 runtime probes; no dropped ranks')
assert.equal(evidence.length, checks)
assert.deepEqual(await sourceHashes(), hashes, 'runtime sources changed during audit; discard and rerun')
if (checkOnly) {
  console.log(JSON.stringify({ rows: rows.length, runtime_checks: checks, cultivation_levels: cultivation.length, status: 'passed', output_written: false }))
  process.exit(0)
}
await mkdir(output, { recursive: true })
await writeFile(new URL('skill-dps.csv', output), '\ufeff' + csv)
await writeFile(new URL('audit.json', output), JSON.stringify({ baseline_attack: 100, runtime_window_s: period, checks,
  schema: 2, method: 'independent table formulas versus actual runtime target HP loss; no equipment or CDR',
  evolution_max_rank: 2, cultivation, runtime_probes: evidence,
  limitations: ['isolated stationary target; no enemy AI or damage overflow', 'normalized xp0 probes are not legal Campaign builds', 'full-coverage AoE is an analytic upper bound, not multi-target runtime sampling', 'no equipment/CDR; equipment budget audits remain separate'],
  tiandi_unlearned_preview: tiandiUnlearnedPreview, rows, source_sha256: hashes }, null, 2) + '\n')
await writeFile(new URL('skill-dps.html', output), `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>剑修技能 DPS 审计</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#25332f;font:15px/1.6 system-ui,sans-serif}
main{max-width:1600px;margin:auto;padding:32px}h1{margin:0;font-size:30px}p{max-width:1000px}
.controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:16px 0}
input,select{font:inherit;padding:8px;border:1px solid #aebbb4;border-radius:6px;background:white}
.table{overflow:auto;max-height:72vh;border:1px solid #cbd3cb;border-radius:8px;background:white}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:12px;text-align:right;border-bottom:1px solid #e4e9e4;white-space:nowrap}
th{position:sticky;top:0;background:#244b40;color:white;z-index:1;font-weight:500}td:first-child,th:first-child{text-align:left}
td:last-child{white-space:normal;min-width:320px;max-width:440px;text-align:left;font-size:13px}
tbody tr:hover{background:#edf5ef}small{display:block;color:#65756c}.dps{font-weight:700;color:#246d50}
#count{color:#65756c}a{color:#246d50}
</style><main><h1>剑修技能 · DPS 审计</h1>
<p>100 攻击，无额外装备与被动增益。共 ${GROWTH_SKILLS.length + GROWTH_EVOLUTIONS.length} 技能、${rows.length} 行；主动按全命中单靶计算。
被动独立 DPS 为 0，条件增益另列，不能直接与主动相加。进阶替换父技能，群体栏为满覆盖上限，不是实战期望。</p>
<p>一剑开天未学父技能的预览为 ${Number(expectedPreview.toFixed(3))}；达到首学父等级（父${firstTiandi.parent_rank}）时，100攻击基准下为 ${Number(firstTiandi.damage_per_hit_or_round.toFixed(3))} / ${firstTiandi.cooldown_or_interval_s}秒 = ${Number(firstTiandi.ideal_single_dps.toFixed(3))} DPS。
完整方法与限制见 audit.json；134项运行时探测保留逐项证据。当前可用进阶最高2级。修为实际曲线另见 progression.html，不能把100攻击归一化值当作金丹实战值。</p>
<div class="controls"><label>搜索 <input id="search" type="search" placeholder="技能名称或 ID"></label>
<label>类别 <select id="kind"><option value="">全部</option><option value="active">基础主动</option><option value="evolution">进阶</option><option value="passive">被动</option></select></label>
<label>等级 <select id="levels"><option value="">全部等级</option><option value="ends">初学 / 最高（进阶保留父级比较）</option></select></label>
<label>排序 <select id="sort"><option value="">原始顺序</option><option value="desc">单体 DPS 从高到低</option><option value="asc">单体 DPS 从低到高</option></select></label>
<span id="count" role="status"></span></div>
<div class="table"><table><thead><tr><th>技能 / 类别</th><th>等级</th><th>父等级</th><th>单击/整轮/每跳</th>
<th>CD/间隔 秒</th><th>单体 DPS</th><th>内圈 DPS</th><th>满覆盖总 DPS</th><th>条件增益*</th><th>自身 SP</th><th>条件与说明</th></tr></thead><tbody id="rows"></tbody></table></div>
<p>* 条件增益：每 100 有效直伤/秒的条件收益或上限。剑开天门无可击杀小怪时为 0；
暴击是期望值，剑痕需目标存活。SP 不含进阶父技能投资。
可直接离线打开此文件，无网络依赖。</p></main>
<script id="data" type="application/json">${JSON.stringify(rows).replaceAll('<', '\\u003c')}</script>
<script>
const data=JSON.parse(document.getElementById('data').textContent);
const kinds={active:'基础主动',evolution:'进阶',passive:'被动'};
const controls=['search','kind','levels','sort'].map(id=>document.getElementById(id));
const format=v=>v==null||v===''?'—':typeof v==='number'?Number(v.toFixed(3)).toLocaleString('zh-CN',{maximumFractionDigits:3}):v;
function render(){
 const [search,kind,levels,sort]=controls.map(e=>e.value);
 const list=data.filter(r=>(!kind||r.kind===kind)&&(!search||(r.name+' '+r.id).toLowerCase().includes(search.toLowerCase()))&&
 (!levels||r.kind==='evolution'||r.skill_rank===1||r.skill_rank===Math.max(...data.filter(x=>x.id===r.id).map(x=>x.skill_rank))));
 if(sort)list.sort((a,b)=>(a.ideal_single_dps-b.ideal_single_dps)*(sort==='asc'?1:-1));
 const body=document.getElementById('rows');body.replaceChildren();
 for(const r of list){
  const tr=document.createElement('tr'),name=document.createElement('td'),small=document.createElement('small');
  name.textContent=r.name+' · '+kinds[r.kind];small.textContent=r.id;name.append(small);tr.append(name);
  for(const key of ['skill_rank','parent_rank','damage_per_hit_or_round','cooldown_or_interval_s','ideal_single_dps','inner_single_dps','full_coverage_total_dps_upper','conditional_bonus_at_100_direct_dps','own_skill_points','conditions']){
   const td=document.createElement('td');td.textContent=format(r[key]);if(key==='ideal_single_dps')td.className='dps';tr.append(td);
  }body.append(tr);
 }document.getElementById('count').textContent=list.length+' / '+data.length+' 行';
}controls.forEach(e=>e.addEventListener('input',render));render();
</script></html>`)
console.log(JSON.stringify({ output: fileURLToPath(output), rows: rows.length, runtime_checks: checks, status: 'passed' }))
