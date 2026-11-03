// Read-only runtime/configuration audit; does not simulate player DPS or spend saves.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { FLOORS, ARCHETYPES, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { demonEssenceXp } from '../js/xianxia/TowerEconomy.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { towerKillXp } from '../js/xianxia/TowerCultivationRewards.js'

const archetypes = new Map(ARCHETYPES.map(a => [a.id, a]))
const menu = readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMenu.ts', import.meta.url), 'utf8')
const storyBlock = menu.match(/const stories = \[([\s\S]*?)\];/)?.[1]
assert.ok(storyBlock, 'Tower lore must be available for comparison')
const stories = [...storyBlock.matchAll(/'([^']+)'/g)].map(m => m[1])
assert.equal(stories.length, FLOORS.length)
let totalXp = 0
const countById = groups => {
  const counts = {}
  for (const g of groups) counts[g.archetype] = (counts[g.archetype] ?? 0) + g.count
  return counts
}
const rows = FLOORS.map(f => {
  const boss = archetypes.get(f.boss_id)
  assert.equal(boss?.role, 'boss', `floor ${f.floor} boss identity`)
  assert.equal(boss.name, f.boss_name)
  assert.ok(stories[f.floor - 1].includes(boss.name), `floor ${f.floor} lore identity`)
  const members = new Map()
  let xp = 0, bossCount = 0, kills = 0
  assert.equal(f.waves.length, 20)
  for (const w of f.waves) {
    // Floor 1 actually spawns authored batches, including delayed boss support.
    const groups = f.floor === 1
      ? FLOOR01.waves[w.wave - 1].batches.map(b => ({ archetype: b.archetype, count: b.unit_ids.length }))
      : w.enemy_groups
    assert.deepEqual(countById(groups), countById(w.enemy_groups), `floor ${f.floor} wave ${w.wave} batch parity`)
    for (const g of w.enemy_groups) {
      assert.equal(g.rank, archetypes.get(g.archetype)?.rank, `${g.archetype} rank parity`)
    }
    for (const g of groups) {
      const a = archetypes.get(g.archetype)
      assert.ok(a, g.archetype)
      if (a.role === 'boss') {
        assert.equal(a.id, f.boss_id)
        assert.equal(w.wave, 20)
        bossCount += g.count
      } else {
        // Rank is the beast's cultivation tier; a same-tier boss still uses
        // the much stronger boss role template (e.g. floor 4's ape elite).
        assert.ok(a.rank <= boss.rank, `${a.id} must not outrank this floor's boss`)
      }
      const prior = members.get(a.id)
      members.set(a.id, { id: a.id, name: a.name, role: a.role, rank: a.rank,
        count: (prior?.count ?? 0) + g.count, baseXpWeight: demonEssenceXp(a.rank, a.role),
        wave5Stats: towerEnemyStats(a, f.floor, 5) })
      xp += demonEssenceXp(a.rank, a.role) * g.count
      kills += g.count
    }
  }
  assert.equal(bossCount, 1, `floor ${f.floor} must have exactly one boss`)
  let allocatedXp = 0
  for (const w of f.waves) {
    const ids = f.floor === 1
      ? FLOOR01.waves[w.wave - 1].batches.flatMap(b => b.unit_ids)
      : Array.from({ length: w.enemy_groups.reduce((n, g) => n + g.count, 0) }, (_, i) => `u${i + 1}`)
    for (const id of ids) allocatedXp += towerKillXp(f.floor, w.wave, id)
  }
  assert.equal(allocatedXp, f.cultivation_xp_budget ?? xp)
  xp = allocatedXp
  const run = new TowerRun({ attemptId: 1, floor: f.floor, seed: 42, hp: 100, xp: 0,
    loadout: { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  const actor = run._enemy({ id: 'audit-boss', archetype: boss.id, x: 0, y: 0 })
  assert.equal(actor.name, f.boss_name)
  assert.equal(actor.rank, boss.rank)
  assert.equal(actor.family, boss.id.split('_')[0])
  assert.equal(actor.maxHp, towerEnemyStats(boss, f.floor, 20).hp)
  const entryLevel = cultivationAt(Math.min(totalXp, TOWER_XP_CAP)).level
  totalXp += xp
  return { floor: f.floor, name: f.name, mainFamily: f.main_family,
    boss: { id: boss.id, name: boss.name, rank: boss.rank, family: actor.family,
      hp: actor.maxHp, lightDamage: actor.damage, heavyDamageBudget: f.floor_stat_scale.boss_heavy_damage,
      nominalSeconds: 55 * boss.floor_hp_factor },
    members: [...members.values()], kills, xp, cumulativeXp: totalXp, entryLevel,
    exitLevel: cultivationAt(Math.min(totalXp, TOWER_XP_CAP)).level,
    targetLevels: [f.floor * 3 - 2, f.floor * 3] }
})
const out = new URL('../docs/xianxia/reports/tower-roster-review-2026-10-29/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(new URL('audit.json', out), JSON.stringify({
  scope: 'Static roster, real actor construction, authored first-floor batches; not measured gameplay balance',
  assumptions: 'New character, every required kill once, no pills or replays, no missed kills',
  checks: 'Nine lore identities, single wave-20 boss, group/archetype rank parity, first-floor batch parity, runtime boss identity/stats',
  totalKills: rows.reduce((n, r) => n + r.kills, 0), totalXp,
  xpMissingForLevel27: Math.max(0, TOWER_XP_CAP - totalXp), floors: rows,
}, null, 2) + '\n')
const roster = role => row => row.members.filter(m => m.role === role).map(m => `${m.name}（${m.rank}阶）`).join('、')
writeFileSync(new URL('roster.md', out),
  '| 层 | 普通怪 | 精英怪 | 层主 | 生命 | 单次轻击 / 重招预算 | 本层经验 | 无重刷进入→离开等级 | 目标等级段 |\n' +
  '|---|---|---|---|---:|---:|---:|---|---|\n' +
  rows.map(r => `| ${r.floor} | ${roster('normal')(r)} | ${roster('elite')(r)} | ${r.boss.name}（${r.boss.rank}阶） | ${Math.round(r.boss.hp)} | ${r.boss.lightDamage} / ${r.boss.heavyDamageBudget} | ${r.xp} | ${r.entryLevel}→${r.exitLevel} | ${r.targetLevels.join('–')} |`).join('\n') +
  '\n\n轻击/重招列是层级预算；具体攻击是否使用重招取决于招式。远程投射、蛛网等不使用重招预算。生命已含家族倍率。\n')
console.table(rows.map(r => ({ floor: r.floor, boss: r.boss.name, rank: r.boss.rank,
  xp: r.xp, levels: `${r.entryLevel}→${r.exitLevel}`, target: r.targetLevels.join('–') })))
console.log(`Roster checks passed; ${totalXp} XP, ${Math.max(0, TOWER_XP_CAP - totalXp)} short of level 27. Report: ${out.pathname}`)
