// Approximate hits per 4 s active window for a stationary enemy (radius 18) at distance r from the player,
// averaged over 36 bearings and 5 start times. Uses the real skillForm geometry and the real/old pose code.
import { skillForm } from '../../js/xianxia/TowerSkillForms.js'
import { wuwoSwordPose as poseNow } from '../../js/xianxia/WuwoMotion.js'
import { wuwoSwordPose as poseOld } from './before/WuwoMotion.js'
const STEP = 1 / 60, ER = 18
const seg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - t * dx, py - ay - t * dy) }
function hits(form, pose, r) {
  let total = 0, n = 0
  for (let b = 0; b < 36; b++) for (const t0 of [0, 1.3, 2.9, 4.7, 7.1]) {
    const a = b * Math.PI / 18, ex = r * Math.cos(a), ey = r * Math.sin(a); let next = -1, h = 0
    for (let t = t0; t < t0 + 4; t += STEP) {
      if (t < next) continue
      const inner = Math.hypot(ex, ey) <= form.innerRadius + ER
      const blade = !inner && [...Array(form.swords).keys()].some(i => { const c = pose(form, t * (form.pace ?? 1), i).collision; return seg(ex, ey, c.baseX, c.baseY, c.tipX, c.tipY) <= ER + form.bladeWidth / 2 })
      if (inner || blade) { h++; next = t + form.interval }
    }
    total += h; n++
  }
  return total / n
}
for (const [lv, oldCount] of [[1, 6], [3, 8], [6, 10], [10, 12]]) {
  const f = skillForm('sj_wanjian', lv), old = { ...f, swords: oldCount }
  const rs = [Math.round(f.innerRadius + ER + 10), Math.round(f.radius), Math.round(f.radius + f.bladeLength / 2)]
  const fc = { ...f, pace: f.combatPace }
  console.log(`Lv${lv} inner=${Math.round(f.innerRadius)} ring=${Math.round(f.radius)}`, rs.map(r => `r${r}: before ${hits(old, poseOld, r).toFixed(2)} 4 swords normal pace ${hits(f, poseNow, r).toFixed(2)} combat pace ${hits(fc, poseNow, r).toFixed(2)}`).join(' | '))
}
