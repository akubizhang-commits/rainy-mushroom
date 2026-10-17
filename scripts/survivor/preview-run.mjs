// 文字版单局预览：驱动纯逻辑层跑完整一局，打印节奏快照。
// 不涉及渲染，仅用于让人直观感受数值与节奏。用法：
//   node scripts/survivor/preview-run.mjs [seed] [snapshotEverySec]
import { SurvivorRun } from '../../js/survivor/SurvivorRun.js'

const seed = process.argv[2] || 'preview-001'
const everySec = Number(process.argv[3]) || 15
const DT = 1 / 60

const run = new SurvivorRun({ seed, viewport: { width: 720, height: 1560 }, firstRun: true })

// 简单 AI：朝"最近敌人的反方向"逃，场上没敌人就不动。
function pickFleeInput() {
  const enemies = run.enemies.active
  const n = run.enemies.count
  if (!n) return [0, 0]
  let bx = 0, by = 0, best = Infinity
  for (let i = 0; i < n; i += 1) {
    const e = enemies[i]
    const dx = e.x - run.player.x
    const dy = e.y - run.player.y
    const d = Math.hypot(dx, dy)
    if (d < best) { best = d; bx = dx; by = dy }
  }
  const m = Math.hypot(bx, by) || 1
  return [-bx / m, -by / m] // 远离最近的敌人
}

// 升级选卡策略：优先升武器，其次治疗，最后露晶。
function pickCard(offer) {
  let idx = offer.findIndex((c) => c.kind === 'weapon')
  if (idx < 0) idx = offer.findIndex((c) => c.kind === 'heal')
  if (idx < 0) idx = 0
  return idx
}

const picks = []
let nextSnap = everySec
const rows = []
function snapshot(tag) {
  rows.push({
    t: run.time.toFixed(0),
    tag,
    state: run.state,
    hp: `${Math.max(0, Math.round(run.player.hp))}/${run.player.maxHp}`,
    lvl: run.progression.level,
    wpn: run.weapons[0].level,
    enemies: run.enemies.count,
    shots: run.shots.count,
    spores: run.spores.count,
    purified: run.purified,
  })
}

snapshot('开局')

// 以 60fps 推进，最多模拟 240 秒防止意外死循环。
let guard = 0
while (run.state !== 'won' && run.state !== 'lost' && guard < 240 * 60) {
  if (run.state === 'playing') {
    const [ix, iy] = pickFleeInput()
    run.setInput(ix, iy)
    run.advance(DT)
  } else if (run.state === 'levelup') {
    const i = pickCard(run.offer)
    picks.push({ at: run.time.toFixed(0), card: run.offer[i].id })
    run.choose(i)
  }
  guard += 1
  if (run.state === 'playing' && run.time >= nextSnap) {
    snapshot(`${nextSnap}s`)
    nextSnap += everySec
  }
}
snapshot('结束')

// 输出
const pad = (s, n) => String(s).padEnd(n)
console.log(`\n雨后菌语 · 单局文字预览   seed=${seed}   (AI 自动逃跑+自动升级)\n`)
console.log(pad('时间', 6) + pad('阶段', 8) + pad('状态', 9) + pad('血量', 11) + pad('等级', 6) + pad('武器Lv', 8) + pad('敌人', 6) + pad('弹体', 6) + pad('孢子', 6) + '净化')
console.log('-'.repeat(78))
for (const r of rows) {
  console.log(
    pad(r.t + 's', 6) + pad(r.tag, 8) + pad(r.state, 9) + pad(r.hp, 11) +
    pad('Lv' + r.lvl, 6) + pad(r.wpn, 8) + pad(r.enemies, 6) + pad(r.shots, 6) +
    pad(r.spores, 6) + r.purified,
  )
}

const s = run.summary()
console.log('\n--- 结算 ---')
console.log(`结果：${s.outcome === 'won' ? '✅ 撑过 180 秒，胜利' : '❌ 阵亡'}` + (s.outcome === 'lost' ? `（被 ${s.killer || '未知'} 击倒）` : ''))
console.log(`存活：${s.survivalSec.toFixed(1)}s   等级：Lv${s.level}   武器：${s.weapons.map((w) => `${w.id} Lv${w.level}`).join(' / ')}   被动：${s.passives.map((p) => `${p.id} Lv${p.level}`).join(' / ') || '无'}   净化总数：${s.purified}`)
console.log(`升级次数：${picks.length}`)
if (picks.length) {
  console.log('升级选牌：' + picks.map((p) => `${p.at}s→${p.card}`).join('  '))
}
console.log(`掉帧补偿丢弃：敌人 ${run.diag.dropped.enemies} / 弹体 ${run.diag.dropped.shots}（应为 0）\n`)
