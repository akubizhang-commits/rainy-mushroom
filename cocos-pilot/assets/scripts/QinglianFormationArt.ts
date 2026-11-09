import {Color, Graphics} from 'cc';
import {skillForm, qinglianPetalPose, QINGLIAN_BLADE_HALF_WIDTH} from './shared/js/xianxia/TowerSkillForms';

/** 青莲剑阵 visuals. The judgment blades (qinglianPetals, the source of truth for the 8/12/16 round geometry)
 * are no longer painted. The look comes from two rotating vortex layers in QinglianVortexArt. This file keeps the
 * pure geometry for tests and the pool-centre dot.
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

function paintCentre(g: Graphics, x: number, y: number, alpha: number) {
 g.fillColor = colour(QINGLIAN_PALETTE.moon, alpha)
 g.circle(x, y, 3); g.fill()
}

/** Visual spin of the two vortex layers, in degrees. Both turn clockwise (negative angle in Cocos,
 * whose positive rotation is counter-clockwise). The outer layer is faster than the inner one.
 * Visual only: the judgment rounds in TowerSkillForms do not depend on this.
 */
export const QINGLIAN_SPIN_RAD_PER_SEC = {outer: 1.6, inner: .7} as const;
export function qinglianVortexSpin(age: number) {
 const t = Math.max(0, age);
 return {
  outer: -QINGLIAN_SPIN_RAD_PER_SEC.outer * t * 180 / Math.PI,
  inner: -QINGLIAN_SPIN_RAD_PER_SEC.inner * t * 180 / Math.PI,
 };
}

/** 起阵 (0–0.8s, windup): a faint rune circle grows and 3–5 outer petals rise.
 * 成阵 (last 0.3s of windup): rings unfold outer → middle → inner.
 */
export function drawQinglianWindup(g: Graphics, x: number, y: number, age: number, total: number) {
 // The judgment blades and thin circles are no longer drawn; the vortex layers carry the look.
 const a = clamp(age, 0, total), p = clamp(a / Math.max(.001, total * .6))
 paintCentre(g, x, y, p)
}

/** 爆发 (3s after the zone starts): the rings keep rotating, outer → middle → inner each
 * open within their own round (0–0.3s, 1.0–1.3s, 2.0–2.3s), and a flash marks each round.
 */
export function drawQinglianBurst(g: Graphics, x: number, y: number, time: number, startedAt: number,
 duration: number, pulseIndex: number) {
 const age = Math.max(0, time - startedAt)
 const fade = age < duration - .4 ? 1 : clamp((duration - age) / .4)
 if (fade <= 0) return
 // The judgment blades and the thin outer circles are no longer drawn. Pulse index is kept for the signature.
 void pulseIndex
 paintCentre(g, x, y, fade)
}
