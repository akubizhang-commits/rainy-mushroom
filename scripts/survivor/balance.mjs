// 生存玩法多种子自动对局统计（04 §2.3 L3 完整档的 S2 版本，08 L7）。
// 不进构建、不被 sync；只读数据文件，不改数值。用法：
//   node scripts/survivor/balance.mjs [--seeds 50] [--moves flee,spore]
//        [--picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang]
//        [--max-sec 1020] [--json tmp/survivor-balance.json]
// 种子为 balance-0 … balance-(N-1)；同参数两次运行输出一致。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { playRun, buildKey, cardName, pickLabel, MOVES, MAX_SEC } from './bot.mjs'
import { WEAPONS } from '../../js/survivor/data/weapons.js'
import { PASSIVES } from '../../js/survivor/data/passives.js'

const WEAPON_IDS = Object.keys(WEAPONS)
const PASSIVE_IDS = Object.keys(PASSIVES)
const MINUTES = Math.ceil(MAX_SEC / 60) // 统计到上限所在分钟

function parseArgs(argv) {
  const opts = {
    seeds: 50,
    moves: ['flee', 'spore'],
    picks: ['random', ...WEAPON_IDS.map((id) => `prefer:${id}`)],
    maxSec: MAX_SEC,
    json: 'tmp/survivor-balance.json',
  }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    const v = argv[i + 1]
    if (a === '--seeds') { opts.seeds = Math.max(1, parseInt(v, 10) || 50); i += 1 }
    else if (a === '--moves') { opts.moves = v.split(',').filter(Boolean); i += 1 }
    else if (a === '--picks') { opts.picks = v.split(',').filter(Boolean); i += 1 }
    else if (a === '--max-sec') { opts.maxSec = Number(v) || MAX_SEC; i += 1 }
    else if (a === '--json') { opts.json = v; i += 1 }
    else throw new Error(`unknown argument: ${a}`)
  }
  for (const m of opts.moves) if (!MOVES[m]) throw new Error(`unknown move style: ${m}`)
  return opts
}

// --- 小工具 ---
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
function median(xs) {
  if (!xs.length) return NaN
  const s = xs.slice().sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : '—')
const pct1 = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—')
const mmss = (sec) => (Number.isFinite(sec) ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}` : '—')
const num = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '—')
// 终端里中日韩字符占 2 列。
const width = (s) => [...String(s)].reduce((w, ch) => w + (/[\u1100-\uffff]/.test(ch) ? 2 : 1), 0)
const padTo = (s, n) => String(s) + ' '.repeat(Math.max(0, n - width(s)))
function table(head, rows) {
  const ws = head.map((h, i) => Math.max(width(h), ...rows.map((r) => width(r[i]))))
  const line = (r) => r.map((c, i) => padTo(c, ws[i])).join('  ')
  return [line(head), ws.map((w) => '-'.repeat(w)).join('  '), ...rows.map(line)].join('\n')
}

// 武器组合键（只看武器，不含被动与等级）；放弃的武器 = 5 把里没拿的。
const weaponKey = (r) => r.weapons.map((x) => x.id).sort().map(cardName).join('+')
const abandonedKey = (r) => {
  const own = new Set(r.weapons.map((x) => x.id))
  const miss = WEAPON_IDS.filter((id) => !own.has(id))
  return miss.length ? miss.map(cardName).join('+') : '无（5把全拿）'
}

// --- 运行 ---
const opts = parseArgs(process.argv.slice(2))
const configs = []
for (const move of opts.moves) for (const pick of opts.picks) configs.push({ move, pick, label: `${MOVES[move]}·${pickLabel(pick)}` })

const t0 = process.hrtime.bigint()
const all = []
for (const cfg of configs) {
  cfg.recs = []
  for (let i = 0; i < opts.seeds; i += 1) {
    const { rec } = playRun({ seed: `balance-${i}`, move: cfg.move, pick: cfg.pick, maxSec: opts.maxSec })
    rec.config = cfg.label
    cfg.recs.push(rec)
    all.push(rec)
  }
}
const elapsedSec = Number(process.hrtime.bigint() - t0) / 1e9

// --- 汇总 ---
function summarize(recs) {
  const n = recs.length
  const won = recs.filter((r) => r.outcome === 'won')
  const lost = recs.filter((r) => r.outcome === 'lost')
  const timeout = recs.filter((r) => r.outcome === 'timeout')
  const reachedBoss = recs.filter((r) => r.bossSpawnSec !== null)
  const bossFight = recs.filter((r) => r.bossDefeatSec !== null).map((r) => r.bossDefeatSec - r.bossSpawnSec)
  const extract = won.map((r) => r.wonSec - r.extractOpenSec)
  const lv = (k) => recs.filter((r) => r.levelAt[k] !== undefined).map((r) => r.levelAt[k])
  const killers = {}
  for (const r of lost) killers[r.killer] = (killers[r.killer] || 0) + 1
  const builds = {}
  for (const r of recs) {
    const k = buildKey(r)
    if (!builds[k]) builds[k] = { n: 0, won: 0 }
    builds[k].n += 1
    if (r.outcome === 'won') builds[k].won += 1
  }
  const preRate = recs.filter((r) => r.spawnedPreBoss !== null).map((r) => r.purifiedPreBoss / r.spawnedPreBoss)
  const weaponCombos = count(recs.map(weaponKey))
  const abandoned = count(recs.map(abandonedKey))
  const wonAbandoned = count(won.map(abandonedKey))
  return {
    n,
    won: won.length,
    lost: lost.length,
    timeout: timeout.length,
    survivalMean: mean(recs.map((r) => r.survivalSec)),
    survivalMedian: median(recs.map((r) => r.survivalSec)),
    wonDurationMean: mean(won.map((r) => r.survivalSec)),
    wonDurationMedian: median(won.map((r) => r.survivalSec)),
    lostInBoss: lost.filter((r) => r.bossSpawnSec !== null).length,
    deathMinute: count(lost.map((r) => Math.min(MINUTES - 1, Math.floor(r.survivalSec / 60)))),
    death630to730: lost.filter((r) => r.survivalSec >= 390 && r.survivalSec < 450).length,
    past12: recs.filter((r) => r.survivalSec > 720).length,
    weaponCombos,
    abandoned,
    wonAbandoned,
    weaponLevelSum: mean(recs.map((r) => r.weapons.reduce((a, w) => a + w.level, 0))),
    passiveMean: mean(recs.map((r) => r.passives.length)),
    hpAtBossSpawn: mean(reachedBoss.map((r) => r.hpAtBossSpawn)),
    hpAtBossDefeat: mean(recs.filter((r) => r.bossDefeatSec !== null).map((r) => r.hpAtBossDefeat)),
    minutes: Array.from({ length: MINUTES }, (_, m) => {
      const xs = recs.filter((r) => r.minutes[m]).map((r) => r.minutes[m])
      return { n: xs.length, enemies: mean(xs.map((x) => x.enemies)), purified: mean(xs.map((x) => x.purified)), hurt: mean(xs.map((x) => x.hurt)) }
    }),
    in6to9: recs.filter((r) => r.survivalSec >= 360 && r.survivalSec <= 540).length,
    won6to9: won.filter((r) => r.survivalSec >= 360 && r.survivalSec <= 540).length,
    wonDurationMin: Math.min(...won.map((r) => r.survivalSec)),
    wonDurationMax: Math.max(...won.map((r) => r.survivalSec)),
    bossFightMin: Math.min(...bossFight),
    bossFightMax: Math.max(...bossFight),
    reachedBoss: reachedBoss.length,
    bossFightMedian: median(bossFight),
    bossFightMean: mean(bossFight),
    extractMean: mean(extract),
    firstLevelUpMedian: median(recs.filter((r) => r.firstLevelUpSec !== null).map((r) => r.firstLevelUpSec)),
    lv60: lv(60), lv180: lv(180), lv300: lv(300),
    lvBoss: reachedBoss.map((r) => r.bossLevel),
    finalLevelMean: mean(recs.map((r) => r.level)),
    purifyPreBoss: mean(preRate),
    purifyPreBossN: preRate.length,
    purifyCombat: mean(recs.map((r) => r.purifiedCombat / Math.max(1, r.spawned))),
    sporeCollect: mean(recs.map((r) => r.xpBanked / Math.max(1, r.xpDropped))),
    killers,
    builds,
    weaponCount: count(recs.map((r) => r.weapons.length)),
    passiveCount: count(recs.map((r) => r.passives.length)),
    capSkipped: recs.reduce((a, r) => a + ((r.capSkipped && r.capSkipped.enemies) || 0), 0),
    dropped: recs.reduce((a, r) => ({
      enemies: a.enemies + (r.dropped.enemies || 0),
      shots: a.shots + (r.dropped.shots || 0),
      bubbles: a.bubbles + (r.dropped.bubbles || 0),
    }), { enemies: 0, shots: 0, bubbles: 0 }),
    droppedTimeMax: Math.max(...recs.map((r) => r.droppedTime)),
  }
}
function count(xs) {
  const o = {}
  for (const x of xs) o[x] = (o[x] || 0) + 1
  return o
}
function cardTally(recs) {
  const offered = {}
  const picked = {}
  for (const r of recs) {
    for (const [k, v] of Object.entries(r.offered)) offered[k] = (offered[k] || 0) + v
    for (const [k, v] of Object.entries(r.picked)) picked[k] = (picked[k] || 0) + v
  }
  return { offered, picked }
}
for (const cfg of configs) cfg.sum = summarize(cfg.recs)
const total = summarize(all)
// 按走位合计（保守逃跑 ≈ 新手型，贴孢子 ≈ 熟练型）
const groups = opts.moves.map((m) => [`${MOVES[m]}·合计`, summarize(all.filter((r) => r.move === m))])
const rowsOf = () => [...configs.map((c) => [c.label, c.sum]), ...groups, ['全部', total]]

// --- 输出 ---
const out = []
const say = (s = '') => out.push(s)
const avgN = (xs) => (xs.length ? `${num(mean(xs))}（n=${xs.length}）` : '—')
say(`雨后菌语 · 自动对局平衡统计   种子 balance-0…balance-${opts.seeds - 1} × ${configs.length} 种组合 = ${all.length} 局   上限 ${mmss(opts.maxSec)}   耗时 ${elapsedSec.toFixed(1)}s`)
say('通关 = 击败浊雾巨蜗并撤离；超时 = 到上限仍未结束。目标：通关率 30–60%、一局 6–9 分钟（00 M2）。')
say()
say('【1】总览')
say(table(
  ['组合', '局数', '通关率', '阵亡', '超时', '平均存活', '中位存活', '6–9分钟占比', '通关局时长(均/中位)', '通关局6–9分', '到达Boss', 'Boss战中位(最短–最长)', '12:00后仍在场', '首升中位'],
  rowsOf().map(([label, s]) => [
    label, s.n, pct(s.won, s.n), s.lost, s.timeout, mmss(s.survivalMean), mmss(s.survivalMedian),
    pct(s.in6to9, s.n), s.won ? `${mmss(s.wonDurationMean)} / ${mmss(s.wonDurationMedian)}` : '—', s.won ? `${s.won6to9}/${s.won}` : '—', pct(s.reachedBoss, s.n),
    Number.isFinite(s.bossFightMedian) ? `${s.bossFightMedian.toFixed(0)}s（${s.bossFightMin.toFixed(0)}–${s.bossFightMax.toFixed(0)}）` : '—', s.past12,
    Number.isFinite(s.firstLevelUpMedian) ? `${s.firstLevelUpMedian.toFixed(0)}s` : '—',
  ]),
))
say()
say('【2】成长节奏：平均等级（n=到达该时间点的局数）  对照 01 §8.4 目标')
say(table(
  ['组合', 'Lv@1:00', 'Lv@3:00', 'Lv@5:00', 'Lv@Boss出现(7:00)', '结束时平均等级'],
  [
    ['01 §8.4 目标', '5（保守 4）', '12–14', '18–20', '24–26', ''],
    ...rowsOf().map(([label, s]) => [
      label, avgN(s.lv60), avgN(s.lv180), avgN(s.lv300), avgN(s.lvBoss), num(s.finalLevelMean),
    ]),
  ],
))
say()
say('【3】净化率与拾取（00 R11 / 01 §15.2：按预期成长需净化约 90%）')
say('净化率 = 战斗中净化的普通敌人 / 生成的普通敌人（不含 Boss 与 cleansing 全场净化）；拾取率 = 已拾取经验 / 净化掉落经验。')
say(table(
  ['组合', '净化率(0–7:00)', '净化率(全程)', '孢子拾取率', 'Boss撤离平均耗时'],
  rowsOf().map(([label, s]) => [
    label, `${pct1(s.purifyPreBoss)}（n=${s.purifyPreBossN}）`, pct1(s.purifyCombat), pct1(s.sporeCollect),
    Number.isFinite(s.extractMean) ? `${s.extractMean.toFixed(1)}s` : '—',
  ]),
))
say()
say('【4】阵亡原因分布（最后一次造成伤害的来源）')
const killerIds = [...new Set(all.filter((r) => r.outcome === 'lost').map((r) => r.killer))].sort()
say(table(
  ['组合', '阵亡局数', ...killerIds.map(cardName)],
  rowsOf().map(([label, s]) => [
    label, s.lost, ...killerIds.map((k) => (s.killers[k] ? `${s.killers[k]}（${pct(s.killers[k], s.lost)}）` : '0')),
  ]),
))
say()
say('阵亡时间分布（按分钟，第 7 分钟起为 Boss 战；“Boss战阵亡”= 到达 Boss 后阵亡局数）：')
say(table(
  ['组合', ...Array.from({ length: MINUTES }, (_, m) => `${m}:xx`), '6:30–7:30阵亡', 'Boss战阵亡', 'Boss出现时生命', 'Boss击败时生命'],
  rowsOf().map(([label, s]) => [
    label, ...Array.from({ length: MINUTES }, (_, m) => s.deathMinute[m] || 0), `${s.death630to730}（${pct(s.death630to730, s.lost)}）`, s.lostInBoss, num(s.hpAtBossSpawn, 0), num(s.hpAtBossDefeat, 0),
  ]),
))
say()
say('【4b】每分钟节奏（存活局平均）：同屏普通敌人 / 本分钟战斗净化数 / 本分钟受击次数')
say(table(
  ['组合', ...Array.from({ length: 12 }, (_, m) => `${m}–${m + 1}分`)],
  rowsOf().map(([label, s]) => [
    label, ...s.minutes.slice(0, 12).map((x) => (x.n ? `${num(x.enemies, 0)}/${num(x.purified, 0)}/${num(x.hurt, 1)}` : '—')),
  ]),
))
say()
say('【5】各卡被提供 / 被选次数')
const cardIds = [...WEAPON_IDS, ...PASSIVE_IDS, 'heal_dew', 'shiny_spore']
const tallyAll = cardTally(all)
const randomRecs = all.filter((r) => r.pick === 'random')
const tallyRand = cardTally(randomRecs)
const offeredTotal = Object.values(tallyAll.offered).reduce((a, b) => a + b, 0)
say(table(
  ['卡', '提供(全部)', '提供占比', '被选(全部)', '选取率', '提供(随机选卡局)', '被选(随机选卡局)'],
  cardIds.map((id) => [
    cardName(id), tallyAll.offered[id] || 0, pct(tallyAll.offered[id] || 0, offeredTotal), tallyAll.picked[id] || 0,
    pct(tallyAll.picked[id] || 0, tallyAll.offered[id] || 0), tallyRand.offered[id] || 0, tallyRand.picked[id] || 0,
  ]),
))
say()
say('【6】最终构筑分化（武器 + 被动组合，不计等级与获得顺序）')
say(table(
  ['组合', '不同构筑数', '不同武器组合数', '武器数分布(1/2/3/4)', '被动数分布(0/1/2/3/4)', '平均被动数', '武器等级合计(均)'],
  rowsOf().map(([label, s]) => [
    label, `${Object.keys(s.builds).length} / ${s.n}局`, Object.keys(s.weaponCombos).length,
    [1, 2, 3, 4].map((k) => s.weaponCount[k] || 0).join('/'),
    [0, 1, 2, 3, 4].map((k) => s.passiveCount[k] || 0).join('/'), num(s.passiveMean), num(s.weaponLevelSum),
  ]),
))
say()
say('放弃的武器（5 选 4，没拿的那把；全部局 / 通关局）：')
const abandonIds = [...new Set(Object.keys(total.abandoned))].sort()
say(table(
  ['组合', ...abandonIds.map((k) => `缺${k}`)],
  rowsOf().map(([label, s]) => [label, ...abandonIds.map((k) => `${s.abandoned[k] || 0}/${s.wonAbandoned[k] || 0}`)]),
))
say()
say('出现最多的 10 种构筑（全部局）：')
const topBuilds = Object.entries(total.builds).sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1)).slice(0, 10)
say(table(['构筑（武器 | 被动）', '局数', '通关'], topBuilds.map(([k, v]) => [k, v.n, `${v.won}（${pct(v.won, v.n)}）`])))
say()
say('通关局的构筑：')
const wonBuilds = {}
for (const r of all.filter((x) => x.outcome === 'won')) wonBuilds[buildKey(r)] = (wonBuilds[buildKey(r)] || 0) + 1
const wonList = Object.entries(wonBuilds).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
say(wonList.length ? table(['构筑（武器 | 被动）', '通关局数'], wonList.map(([k, v]) => [k, v])) : '（无通关局）')
say()
say('通关局的武器组合（只看武器）：')
const wonWeapons = count(all.filter((x) => x.outcome === 'won').map(weaponKey))
const wonWList = Object.entries(wonWeapons).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
say(wonWList.length ? table(['武器组合', '通关局数'], wonWList.map(([k, v]) => [k, v])) : '（无通关局）')
say()
say('【7】诊断')
say(`diag.capSkipped（全部局合计）：敌人 ${total.capSkipped}（同屏上限/全局硬上限已满跳过的刷怪，设计内行为）`)
say(`diag.dropped（全部局合计，对象池满丢弃，应为 0）：敌人 ${total.dropped.enemies} / 弹体 ${total.dropped.shots} / 浊雾泡 ${total.dropped.bubbles}；droppedTime 最大值 ${total.droppedTimeMax}（应为 0）`)
say(table(['组合', '敌人上限跳过', '敌人池满丢弃', '弹体丢弃', '浊雾泡丢弃'], configs.map((c) => [c.label, c.sum.capSkipped, c.sum.dropped.enemies, c.sum.dropped.shots, c.sum.dropped.bubbles])))
console.log(out.join('\n'))

// JSON（tmp/ 已在 .gitignore）
const jsonPath = resolve(opts.json)
mkdirSync(dirname(jsonPath), { recursive: true })
writeFileSync(jsonPath, JSON.stringify({
  opts,
  configs: configs.map((c) => ({ label: c.label, move: c.move, pick: c.pick, summary: c.sum })),
  total,
  cards: { all: tallyAll, random: tallyRand },
  runs: all.map((r) => ({ ...r, picks: r.picks.map((p) => `${p.t.toFixed(1)}:${p.picked}`) })),
}, null, 1))
console.log(`\nJSON 已写入 ${opts.json}`)
