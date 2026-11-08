import {Color, Graphics} from 'cc';
import {skillForm, qinglianPetalPose} from './shared/js/xianxia/TowerSkillForms';

/** 青莲剑阵 is drawn entirely with code-drawn lens-shaped blades. No sprites,
 * water, leaves, dew or dense formation lines. Colours stay in the cool
 * blue-white range: body 青白, edge 淡青, highlight 银青, centre 月白.
 */
export const QINGLIAN_PALETTE = {
 body: [207, 243, 255], edge: [165, 230, 240], silver: [190, 225, 235], moon: [240, 252, 255],
} as const;

export type QinglianPetal = {
 ring: number; judgment: boolean; alpha: number;
 outline: {x: number; y: number}[]; base: {x: number; y: number}; tip: {x: number; y: number};
};

const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

/** Pure geometry shared by the painter and tests. unfold[k] in [0,1] opens ring k;
 * visible[k] limits how many petals of ring k are shown (windup uses 3–5 outlines). */
export function qinglianPetals(time: number, unfold: number[], visible: number[], fade: number): QinglianPetal[] {
 const form = skillForm('sj_qinglian', 1), out: QinglianPetal[] = []
 form.rings.forEach((ring: any, k: number) => {
  const open = clamp(unfold[k] ?? 0)
  if (open <= 0 || fade <= 0) return
  const count = Math.min(ring.visualPetals, Math.max(0, Math.floor(visible[k] ?? ring.visualPetals)))
  for (let j = 0; j < count; j++) {
   const pose = qinglianPetalPose(form, time, k, j)
   const judgment = j % 2 === 0
   const dx = Math.cos(pose.angle), dy = Math.sin(pose.angle)
   const nx = -dy, ny = dx
   const base = {x: dx * ring.radius * .35 * open, y: dy * ring.radius * .35 * open}
   const tip = {x: dx * ring.radius * open, y: dy * ring.radius * open}
   const half = ring.radius * (judgment ? .095 : .07) * open
   const left: {x: number; y: number}[] = [], right: {x: number; y: number}[] = []
   for (let s = 0; s <= 6; s++) {
    const t = s / 6, width = half * Math.pow(Math.sin(Math.PI * t), .8)
    const px = base.x + (tip.x - base.x) * t, py = base.y + (tip.y - base.y) * t
    left.push({x: px + nx * width, y: py + ny * width})
    right.push({x: px - nx * width, y: py - ny * width})
   }
   out.push({ring: k, judgment, alpha: ring.alpha * fade * (judgment ? 1 : .55) * open,
    outline: [...left, ...right.reverse()], base, tip})
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
  if (petal.judgment) {
   // Judgment blades carry a silver cutting edge from base to tip.
   g.strokeColor = colour(QINGLIAN_PALETTE.silver, petal.alpha * 1.2)
   g.lineWidth = 1
   g.moveTo(x + petal.base.x, y + petal.base.y); g.lineTo(x + petal.tip.x, y + petal.tip.y); g.stroke()
  }
 }
}

function paintCentre(g: Graphics, x: number, y: number, alpha: number) {
 g.fillColor = colour(QINGLIAN_PALETTE.moon, alpha)
 g.circle(x, y, 3); g.fill()
}

/** 起阵 (0–0.3s): cyan rune mark spreads on the ground, 3–5 faint petal outlines
 * rise, and a centre point marks the eye. 成阵 (0.3–0.8s): rings unfold in turn
 * with a staggered angle. The skill's own timing controls both phases.
 */
export function drawQinglianWindup(g: Graphics, x: number, y: number, age: number, total: number) {
 const a = clamp(age, 0, total), form = skillForm('sj_qinglian', 1), outer = form.rings[2].radius
 if (a < .3) {
  const p = a / .3
  g.strokeColor = colour(QINGLIAN_PALETTE.edge, .32 * p)
  g.lineWidth = 2
  g.circle(x, y, outer * .8 * p); g.stroke()
  const visible = [3 + Math.round(p * 2), 0, 0]
  paintPetals(g, x, y, qinglianPetals(a, [p * .6, 0, 0], visible, 1))
  paintCentre(g, x, y, p)
  return
 }
 const q = (a - .3) / .5
 const unfold = form.rings.map((_: unknown, k: number) => clamp((q - k * .2) / .6))
 paintPetals(g, x, y, qinglianPetals(a, unfold, [], 1))
 paintCentre(g, x, y, 1)
}

/** 爆发 (after the zone starts): rings keep spinning, each judgment pulse flashes an
 * expanding ring, and the last 0.4s fade into the centre (收势).
 */
export function drawQinglianBurst(g: Graphics, x: number, y: number, time: number, startedAt: number,
 duration: number, pulseIndex: number) {
 const age = Math.max(0, time - startedAt), form = skillForm('sj_qinglian', 1)
 const fade = age < duration - .4 ? 1 : clamp((duration - age) / .4)
 if (fade <= 0) return
 const lastPulse = startedAt + Math.max(0, pulseIndex - 1) * .5
 const glow = clamp((time - lastPulse) / .5)
 if (pulseIndex > 0 && glow < 1) {
  g.strokeColor = colour(QINGLIAN_PALETTE.silver, .3 * (1 - glow) * fade)
  g.lineWidth = 2
  g.circle(x, y, form.rings[2].radius * (.6 + .4 * glow)); g.stroke()
 }
 paintPetals(g, x, y, qinglianPetals(time, [1, 1, 1], [], fade))
 paintCentre(g, x, y, fade)
}
