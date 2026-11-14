// The clock is simulation time. Ready attacks retain one opportunity, not a queue.
export function newAttackActions() {
  return { version: 2, readyAt: 0, busyUntil: 0, heavyUntil: 0, bypasses: 0, lastSkill: null, basic: null, orbit: null,
    waiting: {}, current: null }
}
// 2026-11-06：大招之间的公共间隔。放完一个大招，要隔 HEAVY_SKILL_GAP ÷ (1＋施法速度) 秒
// 才能放下一个大招；小技能可在间隔内穿插。按施法的基础功法判断（一剑开天随剑破虚空、四象随两仪）。
export const HEAVY_SKILLS = Object.freeze(['sj_line', 'sj_cross', 'sj_sancai', 'sj_formation', 'evo_wanjian'])
export const HEAVY_SKILL_GAP = 2
export function heavySkillGap(castSpeed = 0) {
  if (!Number.isFinite(castSpeed) || castSpeed < 0) throw new RangeError('Invalid cast speed')
  return HEAVY_SKILL_GAP / (1 + castSpeed)
}
export function canStartSkill(actions, time, basicReady) {
  return !actions || time + 1e-9 >= actions.busyUntil && !(basicReady && actions.bypasses >= 1)
}
export function startSkillAction(actions, time, duration, skill, basicReady, castSpeed = 0) {
  if (!actions) return
  actions.busyUntil = time + Math.max(1 / 60, duration)
  if (HEAVY_SKILLS.includes(skill)) actions.heavyUntil = time + heavySkillGap(castSpeed)
  actions.lastSkill = skill
  delete actions.waiting[skill]
  if (basicReady) actions.bypasses = 1
}
export const SKILL_ORDER = Object.freeze(['sj_yujian', 'sj_arc', 'sj_moon', 'sj_moon_triple', 'sj_cross', 'sj_wanjian', 'sj_qinglian',
  'sj_line', 'sj_shadow', 'sj_jinghong', 'sj_sancai', 'sj_formation', 'evo_wanjian'])
export function updateSkillCandidates(actions, ids, time) {
  for (const id of Object.keys(actions.waiting)) if (!ids.includes(id)) delete actions.waiting[id]
  for (const id of ids) if (actions.waiting[id] === undefined) actions.waiting[id] = time
}
export function nextSkillCandidate(actions, time, basicReady) {
  if (!canStartSkill(actions, time, basicReady)) return null
  return Object.keys(actions.waiting)
    .filter(id => !HEAVY_SKILLS.includes(id) || time + 1e-9 >= (actions.heavyUntil ?? 0)).sort((a, b) => actions.waiting[a] - actions.waiting[b]
    || SKILL_ORDER.indexOf(a) - SKILL_ORDER.indexOf(b))[0] ?? null
}
export function validAttackActions(a, time, validContext) {
  const finite = n => Number.isFinite(n) && n >= 0
  if (!a || Object.keys(a).sort().join(',') !== 'basic,busyUntil,bypasses,current,heavyUntil,lastSkill,orbit,readyAt,version,waiting'
    || a.version !== 2 || !finite(a.readyAt) || !finite(a.busyUntil)
    || !finite(a.heavyUntil) || a.heavyUntil > time + HEAVY_SKILL_GAP + 1e-9
    || a.readyAt > time + 1 + 1e-9 || a.busyUntil > time + 30
    || ![0, 1].includes(a.bypasses) || a.lastSkill !== null && typeof a.lastSkill !== 'string') return false
  if (!a.waiting || Array.isArray(a.waiting) || typeof a.waiting !== 'object'
    || Object.entries(a.waiting).some(([id, at]) => !SKILL_ORDER.includes(id) || !finite(at) || at > time)) return false
  if (a.current !== null && (!a.current || typeof a.current.skill !== 'string'
    || !finite(a.current.startedAt) || !finite(a.current.releaseAt) || !finite(a.current.endsAt)
    || a.current.startedAt > time || a.current.releaseAt <= a.current.startedAt
    || a.current.endsAt < a.current.releaseAt || a.current.endsAt !== a.busyUntil
    || a.basic !== null || Math.abs(Math.hypot(a.current.dirX, a.current.dirY) - 1) > 1e-8
    || !Number.isFinite(a.current.dirX) || !Number.isFinite(a.current.dirY))) return false
  if (a.orbit !== null && (!a.orbit || !finite(a.orbit.startedAt) || a.orbit.startedAt > time
    || !validContext(a.orbit.castContext))) return false
  const b = a.basic
  if (!b) return b === null
  return b.skill === 'basic_attack' && typeof b.targetId === 'string'
    && [b.startedAt, b.releaseAt, b.endsAt].every(finite) && b.startedAt <= time
    && b.releaseAt > b.startedAt && b.endsAt > b.releaseAt
    && Math.abs(Math.hypot(b.dirX, b.dirY) - 1) < 1e-8
    && b.endsAt === a.busyUntil && b.endsAt > time - 1e-9
    && [0, 1].includes(b.pulseIndex) && b.pulseIndex === (time + 1e-9 >= b.releaseAt ? 1 : 0)
    && validContext(b.castContext)
}
