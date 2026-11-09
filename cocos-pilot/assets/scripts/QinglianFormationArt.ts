import {Color, Graphics} from 'cc';
import {skillForm, qinglianPetalPose, QINGLIAN_BLADE_HALF_WIDTH} from './shared/js/xianxia/TowerSkillForms';

/** 青莲剑阵 is drawn with code-drawn lens-shaped blades over a static vortex layer.
 * Colours stay in the cool blue-white range: body 青白, edge 淡青, highlight 银青, centre 月白.
 */
export const QINGLIAN_PALETTE = {
 body: [207, 243, 255], edge: [165, 230, 240], silver: [190, 225, 235], moon: [240, 252, 255],
} as const;

export type QinglianPetal = {
 ring: number; alpha: number;
 outline: {x: number; y: number}[]; base: {x: number; y: number}; tip: {x: number; y: number};
};

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

/** Pure geometry shared by the painter and tests. Every petal is a judgment blade that starts at the eye.
 * unfold[k] in [0,1] opens ring k; visible[k] limits how many petals of ring k are shown. */
export function qinglianPetals(time: number, unfold: number[], visible: number[], fade: number): QinglianPetal[] {
 const form = skillForm('sj_qinglian', 1), out: QinglianPetal[] = []
 form.rings.forEach((ring: any, k: number) => {
  const open = clamp(unfold[k] ?? 0)
  if (open <= 0 || fade <= 0) return
  const count = Math.min(ring.visualPetals, Math.max(0, Math.floor(visible[k] ?? ring.visualPetals)))
  for (let j = 0; j < count; j++) {
   const pose = qinglianPetalPose(form, time, k, j)
   const dx = Math.cos(pose.angle), dy = Math.sin(pose.angle)
   const nx = -dy, ny = dx
   const base = {x: pose.baseX, y: pose.baseY}
   const tip = {x: dx * ring.radius * open, y: dy * ring.radius * open}
   // The lens peaks at the judgment half-width, so the drawn edge matches the hit band.
   const half = QINGLIAN_BLADE_HALF_WIDTH * open
   const left: {x: number; y: number}[] = [], right: {x: number; y: number}[] = []
   for (let s = 0; s <= 6; s++) {
    const t = s / 6, width = half * Math.pow(Math.sin(Math.PI * t), .8)
    const px = base.x + (tip.x - base.x) * t, py = base.y + (tip.y - base.y) * t
    left.push({x: px + nx * width, y: py + ny * width})
    right.push({x: px - nx * width, y: py - ny * width})
   }
   out.push({ring: k, alpha: ring.alpha * fade * open, outline: [...left, ...right.reverse()], base, tip})
  }
 })
 return out
}

const colour = (rgb: readonly number[], alpha: number) =>
 new Color(rgb[0], rgb[1], rgb[2], Math.round(255 * clamp(alpha)))

function paintPetals(g: Graphics, x: number, y: number, petals: QinglianPetal[]) {
 for (const petal of petals) {
  const {outline} = petal
  g.fillColor = colour(QINGLIAN_PALETTE.body, petal.alpha * .5)
  g.moveTo(x + outline[0].x, y + outline[0].y)
  for (let i = 1; i < outline.length; i++) g.lineTo(x + outline[i].x, y + outline[i].y)
  g.close(); g.fill()
  g.strokeColor = colour(QINGLIAN_PALETTE.edge, petal.alpha)
  g.lineWidth = 1.5
  g.moveTo(x + outline[0].x, y + outline[0].y)
  for (let i = 1; i < outline.length; i++) g.lineTo(x + outline[i].x, y + outline[i].y)
  g.close(); g.stroke()
  // Silver cutting edge along the blade's centre line, eye to tip.
  g.strokeColor = colour(QINGLIAN_PALETTE.silver, petal.alpha * 1.2)
  g.lineWidth = 1
  g.moveTo(x + petal.base.x, y + petal.base.y); g.lineTo(x + petal.tip.x, y + petal.tip.y); g.stroke()
 }
}

function paintCentre(g: Graphics, x: number, y: number, alpha: number) {
 g.fillColor = colour(QINGLIAN_PALETTE.moon, alpha)
 g.circle(x, y, 3); g.fill()
}

/** 起阵 (0–0.8s, windup): a faint rune circle grows and 3–5 outer petals rise.
 * 成阵 (last 0.3s of windup): rings unfold outer → middle → inner.
 */
export function drawQinglianWindup(g: Graphics, x: number, y: number, age: number, total: number) {
 const a = clamp(age, 0, total), form = skillForm('sj_qinglian', 1), outer = form.rings[2].radius
 const p = clamp(a / Math.max(.001, total * .6))
 g.strokeColor = colour(QINGLIAN_PALETTE.edge, .32 * p)
 g.lineWidth = 2
 g.circle(x, y, outer * .8 * p); g.stroke()
 const unfold = form.rings.map((_: unknown, k: number) => clamp((p - k * .2) / .6))
 paintPetals(g, x, y, qinglianPetals(a, unfold, [3 + Math.round(p * 2), 0, 0], 1))
 paintCentre(g, x, y, p)
}

/** 爆发 (3s after the zone starts): the rings keep rotating, outer → middle → inner each
 * open within their own round (0–0.3s, 1.0–1.3s, 2.0–2.3s), and a flash marks each round.
 */
export function drawQinglianBurst(g: Graphics, x: number, y: number, time: number, startedAt: number,
 duration: number, pulseIndex: number) {
 const age = Math.max(0, time - startedAt), form = skillForm('sj_qinglian', 1)
 const fade = age < duration - .4 ? 1 : clamp((duration - age) / .4)
 if (fade <= 0) return
 // Round r (1-based) opens at (r - 1) seconds; the outer ring is round 1, the inner ring round 3.
 const unfold = form.rings.map((_: unknown, k: number) => {
  const round = form.rings.length - k
  return clamp((age - (round - 1)) / .3)
 })
 const lastFlash = startedAt + Math.max(0, pulseIndex - 1) * 1
 const glow = clamp((time - lastFlash) / .5)
 if (pulseIndex > 0 && glow < 1) {
  g.strokeColor = colour(QINGLIAN_PALETTE.silver, .3 * (1 - glow) * fade)
  g.lineWidth = 2
  g.circle(x, y, form.rings[2].radius * (.6 + .4 * glow)); g.stroke()
 }
 // Decorative outer arc blades at the judgment edge (r≈200). They are not judged, and they turn with the outer ring.
 const outer = form.rings[2], open = clamp(unfold[2])
 if (open > 0) {
  g.strokeColor = colour(QINGLIAN_PALETTE.silver, .55 * open * fade)
  g.lineWidth = 2.5
  for (let k = 0; k < 3; k++) {
   const start = qinglianPetalPose(form, age, 2, 0).angle + k * Math.PI * 2 / 3
   g.arc(x, y, outer.radius * open, start, start + .7, false); g.stroke()
  }
 }
 paintPetals(g, x, y, qinglianPetals(age, unfold, [], fade))
 paintCentre(g, x, y, fade)
}
