// 文字版单局预览：用 bot 驱动纯逻辑层跑完整一局（多武器 / 被动 / Boss / 撤离），打印
// 每 N 秒快照、每次升级的三选一与选择、Boss 战过程与撤离过程。不涉及渲染。用法：
//   node scripts/survivor/preview-run.mjs [seed] [--move flee|spore]
//        [--pick random|prefer:<weaponId>] [--every 30] [--max-sec 720]
// 默认 seed=preview-001、move=spore、pick=random、every=30。同参数两次输出一致。
import { playRun, cardName, pickLabel, MOVES, MAX_SEC } from './bot.mjs'

const args = process.argv.slice(2)
const opts = { seed: 'preview-001', move: 'spore', pick: 'random', every: 30, maxSec: MAX_SEC }
for (let i = 0; i < args.length; i += 1) {
  const a = args[i]
  const v = args[i + 1]
  if (a === '--move') { opts.move = v; i += 1 }
  else if (a === '--pick') { opts.pick = v; i += 1 }
  else if (a === '--every') { opts.every = Math.max(1, Number(v) || 30); i += 1 }
  else if (a === '--max-sec') { opts.maxSec = Number(v) || MAX_SEC; i += 1 }
  else if (!a.startsWith('--')) opts.seed = a
  else throw new Error(`unknown argument: ${a}`)
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
const hp = (run) => `${Math.max(0, Math.round(run.player.hp))}/${run.player.maxHp}`
const build = (run) => {
  const w = run.weapons.map((x) => `${cardName(x.id)}${x.level}`).join(' ')
  const p = Object.keys(run.passives).map((id) => `${cardName(id)}${run.passives[id]}`).join(' ')
  return p ? `${w} ｜ ${p}` : w
}
const cardText = (c) => {
  if (c.kind === 'weapon' || c.kind === 'passive') return `${cardName(c.id)}${c.isNew ? '(新)' : `→Lv${c.level}`}`
  return cardName(c.id)
}

const lines = []
const log = (s) => lines.push(s)
let lastBossHpLog = -1
const bossSkills = { bossSummon: 0, bossCharge: 0, bossBubbleRing: 0 }
const { rec, run } = playRun({
  seed: opts.seed,
  move: opts.move,
  pick: opts.pick,
  maxSec: opts.maxSec,
  hooks: {
    onSecond(sec, r) {
      if (r.boss && r.boss.alive) {
        // Boss 战每 10 秒一行血量
        const b10 = Math.floor(sec / 10)
        if (b10 !== lastBossHpLog && sec % 10 === 0) {
          lastBossHpLog = b10
          const d = Math.hypot(r.boss.x - r.player.x, r.boss.y - r.player.y)
          log(`  ${mmss(sec)}  [Boss] 生命 ${(r.boss.hpRatio * 100).toFixed(0)}%  距离 ${d.toFixed(0)}  角色 ${hp(r)}  场上敌人 ${r.enemies.count - 1}`)
        }
      }
      if (sec % opts.every === 0 && r.state !== 'extract' && r.state !== 'cleansing') {
        log(`■ ${mmss(sec)}  Lv${r.progression.level}  生命 ${hp(r)}  敌人 ${r.enemies.count}  孢子 ${r.spores.count}  净化 ${r.purified}  ${build(r)}`)
      }
    },
    onPick(p) {
      log(`  ${mmss(p.t)}  升到 Lv${p.level}：${p.offer.map(cardText).join(' / ')}  → 选 ${cardName(p.picked)}`)
    },
    onEvent(ev, r) {
      const t = mmss(r.time)
      if (ev.type in bossSkills) bossSkills[ev.type] += 1
      if (ev.type === 'bossWarning') log(`  ${t}  ⚠ Boss 预警`)
      else if (ev.type === 'bossSpawn') log(`  ${t}  ★ 浊雾巨蜗出现  角色 Lv${r.progression.level} 生命 ${hp(r)}  ${build(r)}`)
      else if (ev.type === 'bossEnrage') log(`  ${t}  ！Boss ${ev.stage === 1 ? '狂暴 I' : ev.stage === 2 ? '狂暴 II' : `雾壳剥落 ${ev.layers} 层`}（受到伤害 ×${ev.takenMul}）`)
      else if (ev.type === 'bossBubbleRing' && !r._ringLogged) { r._ringLogged = true; log(`  ${t}  Boss 生命 <50%，开始放浊雾泡环`) }
      else if (ev.type === 'bossDefeated') log(`  ${t}  ✔ 浊雾巨蜗被净化  角色生命 ${hp(r)}`)
      else if (ev.type === 'cleansing') log(`  ${t}  cleansing：全场净化 1.5 秒`)
      else if (ev.type === 'extractionOpen') {
        const d = Math.hypot(ev.x - r.player.x, ev.y - r.player.y)
        log(`  ${t}  阳光撤离点出现（距离 ${d.toFixed(0)}）`)
      } else if (ev.type === 'won') log(`  ${t}  ☀ 停留 2 秒完成撤离，胜利`)
      else if (ev.type === 'lost') log(`  ${t}  ✖ 被浊雾笼罩`)
    },
  },
})

console.log(`\n雨后菌语 · 单局文字预览   seed=${opts.seed}   ${MOVES[opts.move]} · ${pickLabel(opts.pick)}   快照每 ${opts.every}s\n`)
for (const l of lines) console.log(l)
console.log('\n--- 结算 ---')
const outcome = rec.outcome === 'won' ? '✅ 击败浊雾巨蜗并撤离，胜利' : rec.outcome === 'lost' ? `❌ 被浊雾笼罩（最后伤害来源：${cardName(rec.killer)}）` : '⏸ 到达时长上限仍未结束'
console.log(`结果：${outcome}`)
console.log(`时长：${mmss(rec.survivalSec)}   等级：Lv${rec.level}   构筑：${build(run)}`)
console.log(`等级节点：1:00 Lv${rec.levelAt[60] ?? '—'} / 3:00 Lv${rec.levelAt[180] ?? '—'} / 5:00 Lv${rec.levelAt[300] ?? '—'} / Boss 出现 Lv${rec.bossLevel ?? '—'}（目标 5（保守 4）/ 12–14 / 18–20 / 24–26）`)
if (rec.bossDefeatSec !== null) console.log(`Boss 战：${(rec.bossDefeatSec - rec.bossSpawnSec).toFixed(1)}s（召唤 ${bossSkills.bossSummon} 次 / 冲撞 ${bossSkills.bossCharge} 次 / 泡环 ${bossSkills.bossBubbleRing} 次）   撤离：${rec.wonSec !== null ? (rec.wonSec - rec.extractOpenSec).toFixed(1) + 's' : '未完成'}`)
const preRate = rec.spawnedPreBoss ? `${((rec.purifiedPreBoss / rec.spawnedPreBoss) * 100).toFixed(1)}%` : '—'
console.log(`净化率：0–7:00 ${preRate}，全程 ${((rec.purifiedCombat / Math.max(1, rec.spawned)) * 100).toFixed(1)}%（战斗净化 ${rec.purifiedCombat} / 生成 ${rec.spawned}，另 cleansing 净化 ${rec.purifiedCleansing}）   孢子拾取率 ${((rec.xpBanked / Math.max(1, rec.xpDropped)) * 100).toFixed(1)}%`)
console.log(`升级次数：${rec.picks.length}   diag.capSkipped：敌人 ${rec.capSkipped.enemies}（同屏上限跳过，设计内）   diag.dropped（对象池满，应为 0）：敌人 ${rec.dropped.enemies} / 弹体 ${rec.dropped.shots} / 浊雾泡 ${rec.dropped.bubbles || 0}   droppedTime ${rec.droppedTime}（应为 0）\n`)
