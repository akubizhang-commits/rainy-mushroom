import { clipHexRay, clipHexSegment } from './TowerArena.js'
import { clipPillars } from './TowerObstacles.js'

export const SHADOW_LIFT = 37
export const SHADOW_TAIL = .36
const OFFSETS = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]

/** Presentation only: one settled hit drives both the burst and body recoil.
 * Sampling simulation time keeps pause/rebuild deterministic without timers. */
export function shadowHitFeedback(hit, time) {
  if (!hit || hit.hostile || hit.kind !== 'hit' || hit.source !== 'shadow'
    || !Number.isFinite(hit.damage) || hit.damage <= 0
    || ![time, hit.x, hit.y].every(Number.isFinite)) return null
  const age = time - (hit.startedAt ?? hit.expiresAt - .25)
  if (!Number.isFinite(age) || age < 0 || age >= .18) return null
  const meta = hit.shadowImpact
  let dx = 1, dy = 0, strength = 1
  if (meta) {
    const length = Math.hypot(meta.dirX, meta.dirY)
    if (!Number.isFinite(length) || length < 1e-8
      || !Number.isInteger(meta.pulseCount) || meta.pulseCount < 1 || meta.pulseCount > 4
      || !Number.isInteger(meta.pulseIndex) || meta.pulseIndex < 1 || meta.pulseIndex > meta.pulseCount) return null
    dx = meta.dirX / length; dy = meta.dirY / length
    if (meta.pulseCount > 1 && meta.pulseIndex === meta.pulseCount) strength = 1.4
  }
  const fade = Math.pow(1 - age / .18, 1.6)
  const recoil = (age < .025 ? .65 + .35 * age / .025 : Math.pow((.18 - age) / .155, 2)) * strength
  return { age, dx, dy, strength, fade,
    x: dx * 4.5 * recoil, y: dy * 4.5 * recoil,
    scaleX: 1 + (.045 * Math.abs(dy) - .085 * Math.abs(dx)) * recoil,
    scaleY: 1 + (.045 * Math.abs(dx) - .085 * Math.abs(dy)) * recoil }
}

/** Keep the strongest current hit per body; simultaneous hits never add drift. */
export function shadowBodyReactions(effects, time) {
  const reactions = new Map()
  for (const hit of effects || []) {
    if (hit?.targetId === undefined || hit?.targetId === null) continue
    const pose = shadowHitFeedback(hit, time)
    if (!pose) continue
    const previous = reactions.get(hit.targetId)
    if (!previous || Math.hypot(pose.x, pose.y) > Math.hypot(previous.x, previous.y))
      reactions.set(hit.targetId, pose)
  }
  return reactions
}

/** Anticipation only. Uses the same finite-width arena clipping as TowerRun's
 * actual pulse; the renderer always takes released endpoints from the event. */
export function shadowPreviewLine(zone, index, arenaVersion) {
  if (!zone || !Number.isInteger(index) || index < 0 || index > 3
    || ![zone.x, zone.y, zone.radius, zone.width, zone.dirX, zone.dirY].every(Number.isFinite)
    || zone.radius <= 0 || zone.width <= 0 || Math.hypot(zone.dirX, zone.dirY) < 1e-8) return null
  const angle = Math.atan2(zone.dirY, zone.dirX) + OFFSETS[index]
  const dx = Math.cos(angle), dy = Math.sin(angle), radius = zone.width / 2
  let x = zone.x - dx * zone.radius, y = zone.y - dy * zone.radius
  let length = zone.radius * 2
  if (![x, y, length, radius].every(Number.isFinite)) return null
  if (arenaVersion === 1) {
    const segment = clipHexSegment({ x, y },
      { x: zone.x + dx * zone.radius, y: zone.y + dy * zone.radius }, radius)
    if (!segment) return null
    x = segment.start.x; y = segment.start.y
    length = Math.hypot(segment.end.x - x, segment.end.y - y)
    length = clipPillars({ x, y }, dx, dy, clipHexRay({ x, y }, dx, dy, length, radius), radius)
  } else {
    if (Math.abs(dx) > 1e-9) length = Math.min(length, ((dx > 0 ? 978 - radius : -912 + radius) - x) / dx)
    if (Math.abs(dy) > 1e-9) length = Math.min(length, ((dy > 0 ? 1020 - radius : -1140 + radius) - y) / dy)
    length = Math.max(0, length)
  }
  const toX=x+dx*length,toY=y+dy*length
  return [toX,toY,length].every(Number.isFinite)
    ? { x, y, toX, toY, dx, dy, angle, length } : null
}
