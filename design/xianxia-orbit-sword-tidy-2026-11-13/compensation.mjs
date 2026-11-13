// Per-level compensation for the base 周天剑阵 after the 11-13 change (4 swords, no reverse, combat pace).
// For each level: blade-only hits per 4 s window (0.6 s shared interval) for an enemy of radius ER standing
// between the inner field edge and the outer reach, area-weighted by radius, averaged over 24 bearings and
// 5 start times. Inner-field hits are excluded (unchanged). factor = max(1, before / after).
import { skillForm } from '../../js/xianxia/TowerSkillForms.js'
import { wuwoSwordPose as poseNow } from '../../js/xianxia/WuwoMotion.js'
import { wuwoSwordPose as poseOld } from './before/WuwoMotion.js'
const STEP = 1 / 60, ER = 18, OLD = [6, 6, 8, 8, 8, 10, 10, 10, 10, 12]
const seg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - t * dx, py - ay - t * dy) }
function hits(form, pose, pace, r) {
  let total = 0, n = 0
  for (let b = 0; b < 24; b++) for (const t0 of [0, 1.3, 2.9, 4.7, 7.1]) {
    const a = b * Math.PI / 12, ex = r * Math.cos(a), ey = r * Math.sin(a); let next = -1, h = 0
    for (let t = t0; t < t0 + 4; t += STEP) {
      if (t < next) continue
      if ([...Array(form.swords).keys()].some(i => { const c = pose(form, t * pace, i).collision; return seg(ex, ey, c.baseX, c.baseY, c.tipX, c.tipY) <= ER + form.bladeWidth / 2 })) { h++; next = t + form.interval }
    }
    total += h; n++
  }
  return total / n
}
const out = []
for (let lv = 1; lv <= 10; lv++) {
  const f = skillForm('sj_wanjian', lv), old = { ...f, swords: OLD[lv - 1] }
  const r0 = f.innerRadius + ER + 1, r1 = f.radius + f.bladeLength / 2 + f.bladeWidth / 2 + ER
  let wb = 0, wa = 0, w = 0
  for (let k = 0; k < 8; k++) { const r = r0 + (r1 - r0) * (k + .5) / 8; wb += r * hits(old, poseOld, 1, r); wa += r * hits(f, poseNow, f.combatPace, r); w += r }
  const before = wb / w, after = wa / w, factor = Math.max(1, before / after)
  out.push({ level: lv, before: +before.toFixed(3), after: +after.toFixed(3), factor: +factor.toFixed(2) })
  console.log(lv, before.toFixed(2), after.toFixed(2), factor.toFixed(2))
}
console.log(JSON.stringify(out.map(o => o.factor)))
