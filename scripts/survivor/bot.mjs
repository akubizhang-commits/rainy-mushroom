// 自动对局机器人（仅供 scripts/survivor/ 下的平衡与预览脚本使用，不进构建、不被 sync）。
// 驱动纯逻辑层 SurvivorRun 跑完整一局，记录节奏数据。所有随机都来自 SeededRandom，
// 同参数两次运行结果一致。
//
// 移动风格（move）：
//   flee  保守逃跑型 —— 远离附近威胁（敌人/浊雾泡/Boss），只在周围安全时顺手拾取近处孢子；
//                     Boss 战保持 ≥ 260 距离放风筝
//   spore 贴孢子型   —— 只躲贴身威胁，其余时间主动去拾取孢子；Boss 战贴近到约 130 绕圈
//                     （让菌伞旋刃/露珠环能打到 Boss）
//   两者都会在 Boss 雾壳冲撞预警时横向闪避；撤离阶段直奔阳光撤离点。
//   走位不主动追露珠 / 林风（与 S2 口径一致），它们只在进入拾取半径后被吸过来。
// 选卡策略（pick）：
//   random             每次从三张里等概率选一张（SeededRandom(`${seed}:bot`)）
//   prefer:<weaponId>  偏好某武器：进化卡 > 该武器（新卡/升级）> 其它新武器 > 能解锁已有武器进化的新被动
//                      （01 §7 evolvesWith）> 武器升级 > 其它被动 > 一捧露水 > 其它
//                      weaponId 可为 data/weapons.js 中任一武器（共 5 把：spore_shot、umbrella_blades、
//                      dew_ring、raindrop、leaf_boomerang）
// 选卡记录里进化卡的 id 记为 `evo:<weaponId>`（与同名武器卡区分）。
import { SurvivorRun } from '../../js/survivor/SurvivorRun.js'
import { SeededRandom } from '../../js/survivor/SurvivorRandom.js'
import { xpToNext } from '../../js/survivor/Progression.js'
import { ENEMIES } from '../../js/survivor/data/enemies.js'
import { WEAPONS } from '../../js/survivor/data/weapons.js'
import { PASSIVES } from '../../js/survivor/data/passives.js'
import { STRINGS } from '../../js/survivor/data/strings.js'

const FRAME = 1 / 60
export const MAX_SEC = 1020 // 单局上限 17 分钟（覆盖 K13：10:00 狂暴 I、11:00 狂暴 II、12:00 起雾壳剥落至 16:00 封顶）

export const MOVES = Object.freeze({ flee: '保守逃跑', spore: '贴孢子' })

export function pickLabel(pick) {
  if (pick === 'random') return '随机选卡'
  if (pick.startsWith('prefer:')) return `偏好${cardName(pick.slice(7))}`
  return pick
}

const DROP_NAMES = Object.freeze({ dew: '露珠', bigDew: '大露珠', wind: '一阵林风' })

// 选卡记录用的卡 id：进化卡与同名武器卡区分。
export const offerId = (c) => (c.kind === 'evolve' ? `evo:${c.id}` : c.id)

export function cardName(id) {
  if (id.startsWith('evo:') && WEAPONS[id.slice(4)]) return WEAPONS[id.slice(4)].evolved.name
  if (DROP_NAMES[id]) return DROP_NAMES[id]
  if (WEAPONS[id]) return WEAPONS[id].name
  if (PASSIVES[id]) return PASSIVES[id].name
  if (id === 'heal_dew') return STRINGS.cardHealDew
  if (id === 'shiny_spore') return STRINGS.cardShinySpore
  if (ENEMIES[id]) return ENEMIES[id].name
  if (id === 'mist_bubble') return '浊雾泡'
  return id
}

// --- 选卡 ---
export function makePicker(pick, seed) {
  if (pick === 'random') {
    const rng = new SeededRandom(`${seed}:bot`)
    return (offer) => rng.int(0, offer.length - 1)
  }
  if (pick.startsWith('prefer:')) {
    const fav = pick.slice(7)
    if (!WEAPONS[fav]) throw new Error(`unknown weapon in pick strategy: ${fav}`)
    // run（可选）：用于判断哪些新被动能解锁已有武器的进化；不传时只看偏好武器。
    const keyPassives = (run) => {
      const ids = new Set([WEAPONS[fav].evolvesWith])
      if (run) for (const w of run.weapons) if (!w.evolved && WEAPONS[w.id].evolvesWith) ids.add(WEAPONS[w.id].evolvesWith)
      return ids
    }
    const rank = (c, keys) => {
      if (c.kind === 'evolve') return 0
      if (c.kind === 'weapon' && c.id === fav) return 1
      if (c.kind === 'weapon' && c.isNew) return 2
      if (c.kind === 'passive' && c.isNew && keys.has(c.id)) return 3
      if (c.kind === 'weapon') return 4
      if (c.kind === 'passive') return 5
      if (c.kind === 'heal') return 6
      return 7
    }
    return (offer, run) => {
      const keys = keyPassives(run)
      let best = 0
      for (let i = 1; i < offer.length; i += 1) if (rank(offer[i], keys) < rank(offer[best], keys)) best = i
      return best
    }
  }
  throw new Error(`unknown pick strategy: ${pick}`)
}

// --- 移动 ---
// 返回单位方向向量（或 0 向量）。也供 scripts/survivor/update-golden.mjs 固化回放输入。
export function steer(run, move) {
  const p = run.player
  // 撤离：直奔撤离点中心。
  if (run.state === 'extract' && run.extraction) {
    const dx = run.extraction.x - p.x
    const dy = run.extraction.y - p.y
    const d = Math.hypot(dx, dy)
    return d < 4 ? [0, 0] : [dx / d, dy / d]
  }
  const cfg = move === 'spore'
    ? { senseR: 90, bubbleR: 110, sporeR: 700, safeR: 0, bossKeep: 130 }
    : { senseR: 260, bubbleR: 200, sporeR: 420, safeR: 60, bossKeep: 260 }

  // 1) 威胁斥力：近处敌人（距离平方反比）。
  let fx = 0
  let fy = 0
  let nearest = Infinity
  const en = run.enemies
  const boss = run.bossEnemy
  for (let i = 0; i < en.count; i += 1) {
    const e = en.active[i]
    if (e === boss || e.hp <= 0) continue
    const dx = p.x - e.x
    const dy = p.y - e.y
    const d = Math.hypot(dx, dy) || 0.001
    const gap = d - e.r - p.r
    if (gap < nearest) nearest = gap
    if (d > cfg.senseR) continue
    const w = 1 / Math.max(gap, 6) ** 2
    fx += (dx / d) * w
    fy += (dy / d) * w
  }
  // 浊雾泡：只躲正在靠近的。
  const bb = run.mistBubbles
  for (let i = 0; i < bb.count; i += 1) {
    const b = bb.active[i]
    const dx = p.x - b.x
    const dy = p.y - b.y
    const d = Math.hypot(dx, dy) || 0.001
    if (d > cfg.bubbleR) continue
    const vx = b.vx || 0
    const vy = b.vy || 0
    if (vx * dx + vy * dy <= 0) continue
    // 横向躲开泡的飞行路线
    const vm = Math.hypot(vx, vy) || 1
    let sx = -vy / vm
    let sy = vx / vm
    if (sx * dx + sy * dy < 0) { sx = -sx; sy = -sy }
    const w = 2 / Math.max(d - p.r, 6) ** 2
    fx += sx * w
    fy += sy * w
  }
  let dirX = 0
  let dirY = 0
  const fm = Math.hypot(fx, fy)
  if (fm > 0) { dirX = fx / fm; dirY = fy / fm }
  const threat = Math.min(1, fm * 900) // 0..1：越近越想逃

  // 2) Boss：保持距离并绕圈；冲撞预警/冲撞时横向闪避。
  if (boss && run.boss) {
    const B = run.boss
    const dx = p.x - boss.x
    const dy = p.y - boss.y
    const d = Math.hypot(dx, dy) || 0.001
    const ux = dx / d
    const uy = dy / d
    let bx = 0
    let by = 0
    if (B.skill === 'windup' || B.skill === 'charge') {
      // 冲撞方向的垂直方向，选离开冲撞线的一侧
      let sx = -B.dirY
      let sy = B.dirX
      if (sx * dx + sy * dy < 0) { sx = -sx; sy = -sy }
      if (d < 420) { bx = sx * 3; by = sy * 3 }
    } else {
      const keep = cfg.bossKeep + boss.r
      const radial = d < keep ? 1.5 : d > keep + 60 ? -1 : 0
      bx = ux * radial - uy * 0.8 // 切向绕圈
      by = uy * radial + ux * 0.8
    }
    dirX += bx
    dirY += by
    const m = Math.hypot(dirX, dirY) || 1
    return [dirX / m, dirY / m]
  }

  // 3) 孢子吸引：保守型只在周围安全时拾取近处孢子；贴孢子型随时去拾取。
  if (move === 'flee' && nearest < cfg.safeR) return fm > 0 ? [dirX, dirY] : [0, 0]
  const sp = run.spores
  let best = null
  let bestScore = Infinity
  for (let i = 0; i < sp.count; i += 1) {
    const s = sp.active[i]
    const d = Math.hypot(s.x - p.x, s.y - p.y)
    if (d > cfg.sporeR) continue
    const score = d / Math.sqrt(s.xp || 1)
    if (score < bestScore) { bestScore = score; best = s }
  }
  if (best) {
    const dx = best.x - p.x
    const dy = best.y - p.y
    const d = Math.hypot(dx, dy) || 0.001
    const pull = move === 'spore' ? 1 : 0.6
    const tx = (dx / d) * pull * (1 - threat) + dirX * threat * 1.5
    const ty = (dy / d) * pull * (1 - threat) + dirY * threat * 1.5
    const m = Math.hypot(tx, ty) || 1
    return [tx / m, ty / m]
  }
  return fm > 0 ? [dirX, dirY] : [0, 0]
}

// 累计经验（已拾取）：Lv1 起到当前等级所需总和 + 当前等级进度。
function bankedXp(prog) {
  let sum = prog.xp
  for (let l = 1; l < prog.level; l += 1) sum += xpToNext(l)
  return sum
}

// 跑一局。hooks（可选）：
//   onEvent(ev, run)      每个逻辑事件（除 weaponFired / pickup 等高频事件外）
//   onSecond(sec, run)    每跨过一个整秒
//   onPick(rec, run)      每次选卡 {t, level, offer:[id], picked}
export function playRun({ seed, move = 'flee', pick = 'random', maxSec = MAX_SEC, hooks = {} }) {
  if (!MOVES[move]) throw new Error(`unknown move style: ${move}`)
  const run = new SurvivorRun({ seed, viewport: { width: 720, height: 1560 }, firstRun: true })
  const picker = makePicker(pick, seed)
  const rec = {
    seed, move, pick,
    outcome: '', survivalSec: 0, killer: '', level: 1,
    levelAt: {},           // {60, 180, 300, 420}: 跨过该秒时的等级
    firstLevelUpSec: null,
    bossSpawnSec: null, bossLevel: null, bossDefeatSec: null,
    extractOpenSec: null, wonSec: null,
    offered: {}, picked: {}, picks: [],
    weapons: [], passives: [],
    spawned: 0, purifiedCombat: 0, purifiedCleansing: 0,
    spawnedPreBoss: null, purifiedPreBoss: null,
    xpDropped: 0, xpBanked: 0,
    capSkipped: null, dropped: null, droppedTime: 0,
    hpAtBossSpawn: null, hpAtBossDefeat: null,
    // S3：进化 / 精英 / 拾取物 / 新被动
    evolveOffered: 0, evolveFirstOfferSec: null,
    evolutions: [],        // [{id: 武器 id, t}]，按进化顺序
    eliteSpawnSec: null, eliteDefeatSec: null,
    drops: { dew: { spawned: 0, picked: 0, heal: 0 }, bigDew: { spawned: 0, picked: 0, heal: 0 }, wind: { spawned: 0, picked: 0, xp: 0 } },
    regenHeal: 0,          // 露水叶片名义回复量（战斗中每跳 heal 事件 amount 之和，最后一跳可能被满血截断）
    maxPickupRadius: 0,
    minutes: [],           // 每分钟：{enemies: 平均同屏普通敌人数（每秒采样）, purified: 本分钟战斗净化数, hurt: 本分钟受击次数}
  }
  let minEnemies = 0
  let minSamples = 0
  let minPurified = 0
  let minHurt = 0
  let cleansingSeen = false
  let lastDropUid = 0
  let lastSec = 0
  const marks = [60, 180, 300, 420]
  let guard = 0
  const guardMax = Math.ceil((maxSec + 10) / FRAME) + 10000
  while (run.state !== 'won' && run.state !== 'lost' && run.time < maxSec && guard < guardMax) {
    guard += 1
    if (run.simulating) {
      const [ix, iy] = steer(run, move)
      run.setInput(ix, iy)
      run.advance(FRAME)
    } else if (run.state === 'levelup') {
      const offer = run.offer
      const i = picker(offer, run)
      const ids = offer.map(offerId)
      if (offer.some((c) => c.kind === 'evolve')) {
        rec.evolveOffered += 1
        if (rec.evolveFirstOfferSec === null) rec.evolveFirstOfferSec = run.time
      }
      for (const id of ids) rec.offered[id] = (rec.offered[id] || 0) + 1
      rec.picked[ids[i]] = (rec.picked[ids[i]] || 0) + 1
      const pr = { t: run.time, level: run.progression.level, offer: offer.map((c) => ({ id: c.id, kind: c.kind, level: c.level, isNew: c.isNew })), picked: ids[i] }
      rec.picks.push(pr)
      if (rec.firstLevelUpSec === null) rec.firstLevelUpSec = run.time
      run.choose(i)
      if (hooks.onPick) hooks.onPick(pr, run)
    } else {
      break
    }
    // 新生成的拾取物（池对象 uid 递增）
    const dr = run.drops
    for (let k = 0; k < dr.count; k += 1) {
      const o = dr.active[k]
      if (o.uid > lastDropUid) { lastDropUid = o.uid; rec.drops[o.kind].spawned += 1 }
    }
    if (run.stats.pickupRadius > rec.maxPickupRadius) rec.maxPickupRadius = run.stats.pickupRadius
    let lastPickup = ''
    for (const ev of run.drainEvents()) {
      if (ev.type === 'pickup' && ev.kind !== 'spore') {
        lastPickup = ev.kind
        rec.drops[ev.kind].picked += 1
        if (ev.kind === 'wind') {
          // 林风拾取后仍在场、被标记飞向角色的孢子经验（拾取同帧已入账的不计）
          for (let k = 0; k < run.spores.count; k += 1) if (run.spores.active[k].wind) rec.drops.wind.xp += run.spores.active[k].xp
        }
        continue
      }
      if (ev.type === 'heal') {
        if (lastPickup === 'dew' || lastPickup === 'bigDew') rec.drops[lastPickup].heal += ev.amount
        else if (run.state !== 'extract' && !run.extraction) rec.regenHeal += ev.amount
        lastPickup = ''
        continue
      }
      lastPickup = ''
      if (ev.type === 'evolved') rec.evolutions.push({ id: ev.id, t: run.time })
      if (ev.type === 'eliteSpawn' && rec.eliteSpawnSec === null) rec.eliteSpawnSec = run.time
      if (ev.type === 'eliteDefeated' && rec.eliteDefeatSec === null) rec.eliteDefeatSec = run.time
      if (ev.type === 'cleansing') cleansingSeen = true
      if (ev.type === 'playerHurt') minHurt += 1
      if (ev.type === 'purified' && ev.kind !== 'boss_mist_snail') {
        if (cleansingSeen) rec.purifiedCleansing += 1
        else {
          rec.purifiedCombat += 1
          minPurified += 1
          rec.xpDropped += ENEMIES[ev.kind] ? ENEMIES[ev.kind].xp : 0
        }
      }
      if (ev.type === 'bossSpawn') {
        rec.bossSpawnSec = run.time
        rec.bossLevel = run.progression.level
        rec.hpAtBossSpawn = run.player.hp
        // 本步之前生成的普通敌人数（nextUid 从 1 开始，Boss 占 1 个 uid）
        rec.spawnedPreBoss = run.enemies.nextUid - 2
        rec.purifiedPreBoss = rec.purifiedCombat
      }
      if (ev.type === 'bossDefeated') { rec.bossDefeatSec = run.time; rec.hpAtBossDefeat = run.player.hp }
      if (ev.type === 'extractionOpen') rec.extractOpenSec = run.time
      if (ev.type === 'won') rec.wonSec = run.time
      if (hooks.onEvent && ev.type !== 'weaponFired' && ev.type !== 'pickup' && ev.type !== 'purified' && ev.type !== 'heal' && ev.type !== 'playerHurt') hooks.onEvent(ev, run)
    }
    while (marks.length && run.time >= marks[0]) rec.levelAt[marks.shift()] = run.progression.level
    const sec = Math.floor(run.time)
    if (sec > lastSec) {
      for (let s = lastSec + 1; s <= sec; s += 1) {
        minEnemies += run.enemies.count - (run.bossEnemy ? 1 : 0)
        minSamples += 1
        if (s % 60 === 0) {
          rec.minutes.push({ enemies: minEnemies / minSamples, purified: minPurified, hurt: minHurt })
          minEnemies = 0; minSamples = 0; minPurified = 0; minHurt = 0
        }
        if (hooks.onSecond) hooks.onSecond(s, run)
      }
      lastSec = sec
    }
  }
  const s = run.summary()
  rec.outcome = run.state === 'won' ? 'won' : run.state === 'lost' ? 'lost' : 'timeout'
  rec.survivalSec = run.time
  rec.killer = rec.outcome === 'lost' ? (s.killer || 'unknown') : ''
  rec.level = s.level
  rec.weapons = s.weapons
  rec.passives = s.passives
  rec.spawned = run.enemies.nextUid - 1 - (rec.bossSpawnSec !== null ? 1 : 0)
  rec.xpBanked = bankedXp(run.progression)
  rec.capSkipped = { ...run.diag.capSkipped }
  rec.dropped = { ...run.diag.dropped }
  rec.droppedTime = run.diag.droppedTime
  rec.finalHp = Math.max(0, run.player.hp)
  // 生成后同一步就被拾取、没被逐帧扫描看到的拾取物个数（按种类无法区分，单独记）
  rec.dropsUnseen = run.drops.nextUid - 1 - (rec.drops.dew.spawned + rec.drops.bigDew.spawned + rec.drops.wind.spawned)
  return { rec, run }
}

// 构筑组合键：武器（获得顺序无关，按 id 排序）+ 被动（同上），不含等级。
export function buildKey(rec) {
  const w = rec.weapons.map((x) => x.id).sort()
  const p = rec.passives.map((x) => x.id).sort()
  return `${w.map(cardName).join('+')} | ${p.length ? p.map(cardName).join('+') : '无被动'}`
}
