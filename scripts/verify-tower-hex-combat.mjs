// Import-safe, headless real-Run smoke. Only --run advances combat.
// Normal battles never write HP, damage, cooldowns, positions, RNG or kill ledgers.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { cultivationAt } from '../js/xianxia/TowerProfile.js'
import { giftSkills, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { ARCHETYPES, FLOOR01, FLOORS } from '../js/xianxia/TowerContent.js'
import { HEX_VERTICES, insideHex, boundHexActor } from '../js/xianxia/TowerArena.js'
import { checksum } from '../js/xianxia/Checksum.js'
// Only this import-safe movement helper is reused: its play() forces portrait.
import { webEscape } from './verify-tower-growth-balance.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT = resolve(ROOT, 'docs/xianxia/reports/tower-landscape-2026-10-28')
const STEP = 1 / 60, TOLERANCE = 1e-7
const clone = value => JSON.parse(JSON.stringify(value))
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
const round = value => Math.round(value * 1e6) / 1e6
const A = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
const SOURCE_FILES = [
  'js/xianxia/TowerRun.js', 'js/xianxia/TowerEnemyAttacks.js', 'js/xianxia/TowerArena.js',
  'js/xianxia/TowerContent.js', 'js/xianxia/TowerGrowth.js', 'js/xianxia/TowerProfile.js',
  'js/xianxia/TowerCampaign.js', 'js/xianxia/TowerLoot.js', 'js/xianxia/Checksum.js',
  'cocos-pilot/assets/scripts/TowerView.ts', 'scripts/verify-tower-growth-balance.mjs',
  'scripts/verify-tower-hex-combat.mjs',
]
const hashes = () => Object.fromEntries(SOURCE_FILES.map(path => [path, sha(readFileSync(resolve(ROOT, path), 'utf8'))]))

// TowerView.ts: 1280x720 FIXED_WIDTH, cameraY=12, top=108, bottom=72, margin=8.
export function landscapeView(player) {
  return { xmin: player.x - 632, xmax: player.x + 632,
    ymin: player.y - 268, ymax: player.y + 256, followPlayer: true }
}

export function steerHex(run) {
  webEscape(run, true)
  const p = run.state.player, input = run.state.input
  const predicted = { x: p.x + input.x * p.moveSpeed * .35,
    y: p.y + input.y * p.moveSpeed * .35, radius: p.radius + 12 }
  if (!insideHex(predicted, predicted.radius)) {
    boundHexActor(predicted) // Temporary movement proposal only; never the real player.
    run.setInput(predicted.x - p.x, predicted.y - p.y)
  }
}

// Synthetic stage records; actual Campaign transactions enforce skill prerequisites,
// research gates, SP debits, book prices and owned-weapon refinement.
export function stageFixture(floor) {
  assert.ok(Number.isInteger(floor) && floor >= 1 && floor <= 9)
  const stage = floor === 1 ? 'fresh' : floor <= 3 ? 'early' : floor <= 6 ? 'middle' : 'late'
  const level = { fresh: 1, early: 6, middle: 14, late: 23 }[stage]
  const xp = 30 * (level - 1) + 15 * (level - 1) ** 2
  const tutorialWaves = floor === 1 ? 0 : 3
  const memory = new Map()
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  let store = new TowerCampaignStore(storage, 0)
  assert.ok(store.act({ type: 'sync' }, 0).ok)
  const envelope = JSON.parse(memory.get(TOWER_CAMPAIGN_KEY)), state = JSON.parse(envelope.data)
  Object.assign(state, { xp, hp: cultivationAt(xp).maxHp, clearedFloor: floor - 1,
    tutorialWaves, skills: giftSkills(tutorialWaves), cores: 2000, contribution: 300 })
  envelope.data = JSON.stringify(state)
  envelope.checksum = checksum(envelope.data)
  memory.set(TOWER_CAMPAIGN_KEY, JSON.stringify(envelope))
  store = new TowerCampaignStore(storage, 0)
  assert.equal(store.readOnly, false, store.error)
  const transactions = []
  const act = action => {
    const before = growthSummary(store.state), result = store.act(action, 0)
    assert.ok(result.ok, `${stage}/${JSON.stringify(action)}: ${result.reason}`)
    const after = growthSummary(store.state)
    assert.ok(after.total <= 36 && after.spent <= after.total)
    transactions.push({ action, result, pointDelta: after.spent - before.spent })
  }
  for (let i = 0; i < Math.floor((floor - 1) / 3); i++) act({ type: 'researchPoint' })
  const targets = {
    fresh: [],
    early: [['sj_yujian', 3], ['sj_arc', 2], ['sj_wanjian', 2], ['vajra', 1]],
    middle: [['sj_yujian', 6], ['sj_arc', 3], ['sj_wanjian', 3], ['vajra', 3], ['sj_heart', 3], ['magnet', 2]],
    late: [['sj_yujian', 10], ['sj_heart', 4], ['sj_arc', 3], ['sj_wanjian', 3],
      ['vajra', 3], ['magnet', 3], ['evo_wanjian', 1]],
  }[stage]
  for (const [id, target] of targets) {
    while ((store.state.skills[id] || store.state.evolutionRanks[id] || 0) < target) {
      act({ type: 'learnSkill', id })
    }
  }
  const refine = { fresh: 0, early: 0, middle: 2, late: 4 }[stage]
  for (let i = 0; i < refine; i++) act({ type: 'refineWeapon', id: 'eq_sword_suwen' })
  const points = growthSummary(store.state)
  assert.equal(points.spent, { fresh: 0, early: 5, middle: 17, late: 30 }[stage])
  return { floor, stage, synthetic: true, naturalProgression: false,
    sources: { xp, level, clearedFloor: floor - 1, tutorialWaves, cores: 2000, contribution: 300,
      initialHp: state.hp }, points, loadout: combatLoadout(store.state), transactions }
}

function authoredUnits(floor) {
  return FLOORS[floor - 1].waves.flatMap(wave => {
    if (floor === 1) return FLOOR01.waves[wave.wave - 1].batches.flatMap(batch =>
      batch.unit_ids.map(localId => ({ key: `${wave.wave}:${localId}`, archetype: batch.archetype })))
    const groups = [...wave.enemy_groups.filter(g => A[g.archetype].role === 'boss'),
      ...wave.enemy_groups.filter(g => A[g.archetype].role !== 'boss')]
    return groups.flatMap(g => Array(g.count).fill(g.archetype))
      .map((archetype, index) => ({ key: `${wave.wave}:u${index + 1}`, archetype }))
  })
}

// Independent signed edge-clearance measurement, rather than insideHex's boolean.
function violation(point, radius) {
  if (![point.x, point.y, radius].every(Number.isFinite)) throw Error('nonfinite actor geometry')
  return Math.max(...HEX_VERTICES.map((a, i) => {
    const b = HEX_VERTICES[(i + 1) % 6]
    const clearance = ((b.y - a.y) * (point.x - a.x) - (b.x - a.x) * (point.y - a.y))
      / Math.hypot(b.x - a.x, b.y - a.y)
    return radius - clearance
  }))
}

function observer(run) {
  const seenEnemies = new Set(), seenEffects = new Set(), seenShots = new Set()
  const attackStates = new Map()
  const metrics = { observedTicks: 0, actorChecks: 0, peakEnemies: 0, playerHitEvents: 0,
    playerDamage: 0, families: {}, attacksByKind: {}, hostileProjectilesByElement: {},
    spawnPortals: {}, offCandidateSpawns: 0, maxOutsideByKind: { player: 0, enemy: 0, reserved: 0, chargeEndpoint: 0 },
    maxOutside: 0, worstOutside: null, cameraMaxError: 0, snapshots: [], validatedSnapshots: 0,
    invalidSnapshots: 0, structuralErrors: [] }
  const check = (item, kind, radius = item.radius) => {
    metrics.actorChecks++
    const excess = Math.max(0, violation(item, radius))
    metrics.maxOutsideByKind[kind] = Math.max(metrics.maxOutsideByKind[kind], excess)
    if (excess > metrics.maxOutside) {
      metrics.maxOutside = excess
      metrics.worstOutside = { kind, id: item.id ?? null, seconds: run.state.time, wave: run.state.wave,
        x: item.x, y: item.y, radius, excess }
    }
  }
  const observe = () => {
    const s = run.state
    assert.equal(run._playtestAssist, false)
    assert.equal(s.arenaVersion, 1)
    metrics.observedTicks++
    metrics.peakEnemies = Math.max(metrics.peakEnemies, s.enemies.length)
    check(s.player, 'player')
    const expectedView = landscapeView(s.player)
    assert.equal(s.view.followPlayer, true)
    for (const key of ['xmin', 'xmax', 'ymin', 'ymax']) {
      assert.ok(Number.isFinite(s.view[key]), 'nonfinite viewport')
      metrics.cameraMaxError = Math.max(metrics.cameraMaxError, Math.abs(s.view[key] - expectedView[key]))
    }
    for (const reserved of s.reserved) check(reserved, 'reserved')
    for (const enemy of s.enemies) {
      check(enemy, 'enemy')
      const family = metrics.families[enemy.family] ??= { spawned: 0, started: 0, activated: 0, fired: 0, hitFlags: 0 }
      if (!seenEnemies.has(enemy.id)) {
        seenEnemies.add(enemy.id); family.spawned++
        const portal = FLOOR01.arena.portals.find(p => p.candidates.some(c =>
          Math.abs(c.x - enemy.x) < TOLERANCE && Math.abs(c.y - enemy.y) < TOLERANCE))
        if (portal) metrics.spawnPortals[portal.id] = (metrics.spawnPortals[portal.id] || 0) + 1
        else metrics.offCandidateSpawns++
      }
      const a = enemy.ai.attack
      if (!a) continue
      const count = metrics.attacksByKind[a.kind] ??= { started: 0, activated: 0, fired: 0, hitFlags: 0 }
      let seen = attackStates.get(a.id)
      if (!seen) {
        seen = {}; attackStates.set(a.id, seen)
        count.started++; family.started++
      }
      for (const [field, active] of Object.entries({
        activated: enemy.ai.mode === 'active' || a.fired || a.hit || a.travelled > 0,
        fired: a.fired, hitFlags: a.hit,
      })) {
        if (active && !seen[field]) { seen[field] = true; count[field]++; family[field]++ }
      }
      if (a.kind === 'charge') check({ id: a.id, x: a.x + a.dirX * a.range,
        y: a.y + a.dirY * a.range }, 'chargeEndpoint', enemy.radius)
    }
    for (const shot of s.projectiles) if (shot.hostile && !seenShots.has(shot.id)) {
      seenShots.add(shot.id)
      const element = shot.element ?? 'unlabelled'
      metrics.hostileProjectilesByElement[element] = (metrics.hostileProjectilesByElement[element] || 0) + 1
    }
    for (const effect of s.effects) if (!seenEffects.has(effect.id)) {
      seenEffects.add(effect.id)
      if (effect.kind === 'player_hit') { metrics.playerHitEvents++; metrics.playerDamage += effect.damage }
    }
  }
  const checkpoint = label => {
    const snapshot = run.snapshot(), valid = validateTowerSnapshot(snapshot)
    metrics.snapshots.push({ label, seconds: snapshot.time, wave: snapshot.wave, valid, sha256: sha(snapshot) })
    if (valid) {
      metrics.validatedSnapshots++
      assert.deepEqual(TowerRun.restore(snapshot).snapshot(), snapshot, 'snapshot roundtrip')
    } else {
      metrics.invalidSnapshots++
      metrics.firstInvalidSnapshot ??= snapshot
    }
  }
  return { metrics, observe, checkpoint }
}

function newRun(fixture, seed, drain) {
  const run = new TowerRun({ attemptId: (drain ? 10000 : 0) + fixture.floor * 100 + seed,
    floor: fixture.floor, seed, xp: fixture.sources.xp, hp: fixture.sources.initialHp,
    loadout: fixture.loadout, arenaVersion: 1, lootVersion: 1 })
  run.setPlaytestAssist(false)
  run.setViewport(landscapeView(run.state.player))
  return run
}

export function simulate(fixture, seed, options, drain = false) {
  const run = newRun(fixture, seed, drain), watch = observer(run)
  const started = performance.now()
  const expected = authoredUnits(fixture.floor)
  let timeoutReason = null, priorWave = run.state.wave, nextSnapshot = 30
  try {
    watch.observe(); watch.checkpoint('initial')
    while (run.state.phase === 'playing') {
      if (run.state.time >= options.maxSeconds) { timeoutReason = 'simulation-limit'; break }
      if (run.state.ticks % 60 === 0 && options.wallMs > 0
        && performance.now() - started >= options.wallMs) { timeoutReason = 'wall-budget'; break }
      if (drain) run.setInput(0, 0)
      else steerHex(run)
      // Intentionally after steering: never call the portrait-forcing old play().
      run.setViewport(landscapeView(run.state.player))
      run.advance(STEP)
      watch.observe()
      if (drain) {
        // Functional fixture ONLY: consume newly spawned enemies via real damage
        // and death accounting. No player HP writes, assist, moved enemies, edited
        // timers, skipped warnings, manual support release or fabricated receipts.
        for (const enemy of [...run.state.enemies]) run._damageEnemy({
          target: enemy.id, damage: enemy.hp, direct: false, scaled: true, source: 'spawn-drain-fixture',
        })
        run._deaths()
      }
      if (run.state.wave !== priorWave || run.state.time >= nextSnapshot) {
        watch.checkpoint(run.state.wave !== priorWave ? 'wave-change' : '30s')
        priorWave = run.state.wave
        nextSnapshot = Math.floor(run.state.time / 30 + 1) * 30
      }
    }
    watch.checkpoint('final')
  } catch (error) {
    watch.metrics.structuralErrors.push(error.stack)
    timeoutReason = null
  }
  const s = run.state
  const actual = s.killLedger.map(k => ({ key: `${k.wave}:${k.id.split(':').at(-1)}`, archetype: k.archetype }))
  const byKey = new Map(expected.map(k => [k.key, k.archetype]))
  const ledgerMatches = new Set(actual.map(k => k.key)).size === actual.length
    && actual.every(k => byKey.get(k.key) === k.archetype)
  const complete = s.phase === 'won' && actual.length === expected.length
    && s.clearedWaves.length === 20 && !s.pending.length && !s.reserved.length && !s.enemies.length && ledgerMatches
  const metrics = watch.metrics
  const structuralPass = !metrics.structuralErrors.length && !metrics.invalidSnapshots
    && metrics.validatedSnapshots >= 2 && metrics.maxOutside <= TOLERANCE
    && metrics.cameraMaxError <= TOLERANCE && metrics.offCandidateSpawns === 0 && ledgerMatches
  return { kind: drain ? 'spawn-drain-functional-only' : 'normal-combat',
    floor: fixture.floor, seed, outcome: metrics.structuralErrors.length ? 'error' : timeoutReason ? 'timeout' : s.phase,
    timeoutReason, structuralPass, complete, seconds: round(s.time), wallMs: round(performance.now() - started),
    finalPhase: s.phase, hp: s.player.hp, xp: s.player.xp, clearedWaves: s.clearedWaves.length,
    wave: s.wave, kills: actual.length, expectedEntities: expected.length, ledgerMatches,
    pending: s.pending.length, reserved: s.reserved.length, active: s.enemies.length,
    finalActiveFamilies: [...new Set(s.enemies.map(e => e.family))].sort(),
    spawnedFamilies: Object.keys(metrics.families).sort(),
    attackStartedFamilies: Object.keys(metrics.families).filter(f => metrics.families[f].started > 0).sort(),
    attackActivatedFamilies: Object.keys(metrics.families).filter(f => metrics.families[f].activated > 0).sort(),
    earned: clone(s.earned), finalSnapshotHash: sha(run.snapshot()), metrics }
}

function persist(report) {
  mkdirSync(REPORT, { recursive: true })
  writeFileSync(resolve(REPORT, 'hex-combat.json'), JSON.stringify(report, null, 2) + '\n')
  const lines = ['# 六边形与十二族攻击：真实 Run 烟测', '',
    `状态：**${report.status}**。只验证固定配置的运行结果与结构完整性，不是全面平衡验收。`,
    '', '## 方法与限制', '',
    '- 正常组：九层各 seed=1；arenaVersion=1、lootVersion=1、_playtestAssist=false，1/60 秒固定步长。',
    '- 每步先 webEscape/steer 加六边形避墙，再设置 1280×720 横屏的实际 HUD 可见区域 1264×524，followPlayer=true。使用真实 Run 的可见性和移动；未启动 Cocos/browser，不能当作设备画面测试。',
    '- 不调用旧 play()；正常组仅控制移动、视口和推进时间，不写玩家 HP、敌伤、敌人 HP、冷却、位置、奖励或 RNG。',
    '- 以下配置为人为提供阶段 XP、已通层、资源的合法容量 fixture，初始满血来自对应境界。技能、研究、书费和装备精炼经 Campaign 真实事务检查；不是自然养成路径或资源可负担性证明。',
    `- 每局模拟上限 ${report.options.maxSeconds}s，正常组单局墙钟预算 ${report.options.wallMs}ms。墙钟超时依机器负载而异；--wall-ms=0 可只用确定性的模拟上限重放。死亡、超时均保留，不挑种或重试调数。`,
    '- 独立 spawn-drain 组由标准 _damageEnemy/_deaths 立即消耗已正常出生的敌人并产生标准 killLedger，不改出生警示/时序/支援触发；属于人工功能 fixture，绝不计入正常战斗胜率。',
    '- 越界值检查玩家、敌人、预留出生圆及冲锋终点；投射物、范围技能和视觉特效可伸出墙外，不混入角色容纳判定。攻击 started/activated/fired/hitFlags 按真实攻击 id 去重；hitFlags 不是玩家实际承伤，后者另记 playerHitEvents/playerDamage。',
    '', '## 固定成长配置', '', '|层|阶段|XP/等级|已通层|SP 已用/总计|素问剑品质/精炼|',
    '|---|---|---|---|---|---|']
  for (const f of report.fixtures) lines.push(`|${f.floor}|${f.stage}|${f.sources.xp}/${f.sources.level}|${f.sources.clearedFloor}|${f.points.spent}/${f.points.total}|${f.loadout.weaponQuality}/${f.loadout.weaponRefine}|`)
  for (const [title, rows] of [['正常战斗（真实结果）', report.normal], ['出生队列排空（功能 fixture）', report.spawnDrain]]) {
    lines.push('', `## ${title}`, '', '|层/种子|结果|模拟秒|已清波|击杀/总数|HP|pending/reserved/active|最大越界|有效快照|结构检查|',
      '|---|---|---|---|---|---|---|---|---|---|')
    for (const r of rows) lines.push(`|${r.floor}/${r.seed}|${r.outcome}${r.timeoutReason ? ` (${r.timeoutReason})` : ''}|${r.seconds}|${r.clearedWaves}/20|${r.kills}/${r.expectedEntities}|${round(r.hp)}|${r.pending}/${r.reserved}/${r.active}|${r.metrics.maxOutside.toExponential(3)}|${r.metrics.validatedSnapshots}|${r.structuralPass ? '通过' : '失败'}|`)
    if (!rows.length) lines.push('|—|待通知 ready 后运行|—|—|—|—|—|—|—|—|')
  }
  lines.push('', '## 正常组实际攻击覆盖', '', '|层|已出生族|已起手族|已激活族|各 kind 起手/激活/发射/命中标记|',
    '|---|---|---|---|---|')
  for (const r of report.normal) lines.push(`|${r.floor}|${r.spawnedFamilies.join(',')}|${r.attackStartedFamilies.join(',')}|${r.attackActivatedFamilies.join(',')}|${Object.entries(r.metrics.attacksByKind).map(([k, v]) => `${k} ${v.started}/${v.activated}/${v.fired}/${v.hitFlags}`).join('; ')}|`)
  lines.push('', '## 结果边界', '',
    report.summary ? `正常 ${report.summary.normalRuns} 局：${report.summary.won} 胜、${report.summary.lost} 败、${report.summary.timeout} 超时、${report.summary.errors} 异常；功能排空 ${report.summary.spawnDrainComplete}/9。正常组未观察到激活攻击的族：${report.summary.unobservedActivatedFamilies.join(', ') || '无'}。`
      : '等待用户通知 Turing 最终 ready；当前没有实战结果，不据此声称攻击或出生已验证。',
    '', `源码一致性：${report.sourceStable ?? '未运行'}。完整源码哈希、逐局观测与配置购买记录见 hex-combat.json。`,
    '', '命令：`node scripts/verify-tower-hex-combat.mjs --prepare` 只检查配置并生成待跑说明；收到 ready 后执行 `node scripts/verify-tower-hex-combat.mjs --run`。可选 `--max-seconds=360 --wall-ms=3500 --drain-wall-ms=1500`。不会重跑旧 balance 或整个测试套件。')
  writeFileSync(resolve(REPORT, 'hex-combat.md'), lines.join('\n') + '\n')
}

export async function main(args = process.argv.slice(2)) {
  const options = { maxSeconds: 360, wallMs: 3500, drainWallMs: 1500 }
  for (const arg of args) {
    if (['--run', '--prepare'].includes(arg)) continue
    const match = /^--(max-seconds|wall-ms|drain-wall-ms)=(\d+)$/.exec(arg)
    assert.ok(match, `unknown option ${arg}`)
    options[{ 'max-seconds': 'maxSeconds', 'wall-ms': 'wallMs', 'drain-wall-ms': 'drainWallMs' }[match[1]]] = Number(match[2])
  }
  assert.ok(options.maxSeconds > 0)
  assert.ok(!(args.includes('--run') && args.includes('--prepare')))
  const execute = args.includes('--run'), started = performance.now()
  const report = { generatedAt: new Date().toISOString(), status: execute ? 'running' : 'awaiting-turing-ready',
    options, assistEnabled: false, naturalProgression: false, arenaVersion: 1,
    camera: { frame: [1280, 720], visible: [1264, 524], followPlayer: true, headless: true },
    sourceHashes: hashes(), fixtures: [], normal: [], spawnDrain: [] }
  try {
    report.fixtures = Array.from({ length: 9 }, (_, i) => stageFixture(i + 1))
    report.portalRadius42Candidates = Object.fromEntries(FLOOR01.arena.portals.map(p =>
      [p.id, p.candidates.filter(c => insideHex(c, 42)).length]))
    assert.ok(Object.values(report.portalRadius42Candidates).every(count => count > 0))
    persist(report)
    if (!execute) return report
    for (const fixture of report.fixtures) {
      const result = simulate(fixture, 1, options)
      report.normal.push(result); persist(report)
      console.log(`normal f${fixture.floor}/s1: ${result.outcome}, ${result.seconds}s, ${result.clearedWaves}/20, HP ${round(result.hp)}`)
    }
    for (const fixture of report.fixtures) {
      const result = simulate(fixture, 1, { ...options, wallMs: options.drainWallMs }, true)
      report.spawnDrain.push(result); persist(report)
      console.log(`spawn-drain f${fixture.floor}: ${result.outcome}, ${result.kills}/${result.expectedEntities}, structural=${result.structuralPass}`)
    }
    const families = [...new Set(ARCHETYPES.map(a => a.id.split('_')[0]))].sort()
    const activated = new Set(report.normal.flatMap(r => r.attackActivatedFamilies))
    report.summary = { normalRuns: report.normal.length,
      ...Object.fromEntries(['won', 'lost', 'timeout'].map(outcome => [outcome, report.normal.filter(r => r.outcome === outcome).length])),
      errors: report.normal.filter(r => r.outcome === 'error').length,
      spawnDrainComplete: report.spawnDrain.filter(r => r.complete && r.structuralPass).length,
      unobservedActivatedFamilies: families.filter(f => !activated.has(f)),
      maxOutside: Math.max(...[...report.normal, ...report.spawnDrain].map(r => r.metrics.maxOutside)),
      validatedSnapshots: [...report.normal, ...report.spawnDrain].reduce((sum, r) => sum + r.metrics.validatedSnapshots, 0) }
    const valid = [...report.normal, ...report.spawnDrain].every(r => r.structuralPass)
      && report.summary.spawnDrainComplete === 9 && report.normal.length === 9
    report.status = valid ? 'completed-smoke-not-balance-acceptance' : 'completed-with-structural-findings'
    if (!valid) process.exitCode = 2
  } catch (error) {
    report.status = 'harness-or-integration-error'; report.error = error.stack
    process.exitCode = 2
  } finally {
    report.sourceHashesAfter = hashes()
    report.sourceStable = sha(report.sourceHashes) === sha(report.sourceHashesAfter)
    if (!report.sourceStable) { report.status = 'source-changed-rerun-required'; process.exitCode = 3 }
    report.wallMs = round(performance.now() - started)
    persist(report)
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main()
