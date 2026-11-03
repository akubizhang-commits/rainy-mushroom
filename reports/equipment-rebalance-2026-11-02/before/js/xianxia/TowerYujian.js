import { GROWTH_SKILLS } from './TowerGrowth.js'
const GENERATION_INTERVAL = GROWTH_SKILLS.find(s => s.id === 'sj_yujian').generation_interval
// Fixed shoulder slots, scaled from the 158px preview actor to the 108px game actor.
// Simulation time only: pause, restore and replay cannot move these swords.
const SCALE = 108 / 158
const TAU = Math.PI * 2
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x) }
export const YUJIAN_LENGTH = 64 * SCALE
export const YUJIAN_TAIL = .25
// Compact, staggered clusters around each shoulder. The heights deliberately
// do not rise with distance from the body, avoiding a wing-shaped silhouette.
const SHOULDER_SLOTS = [
  [[80,108],[114,132],[84,155],[120,88],[92,66]],
  [[82,111],[116,89],[88,153],[122,133],[94,68]],
]
// Raise the whole cluster so its lowest sword sits at the actor's chest.
const SHOULDER_LIFT = 26
export function yujianHoverPose(index, time, center) {
  const side = index % 2, rank = Math.floor(index / 2)
  const [x,y] = SHOULDER_SLOTS[side][rank]
  return { x: center.x + (side ? 1 : -1)*x*SCALE,
    y: center.y + y*SCALE + SHOULDER_LIFT }
}
export function newYujianState(player, time) {
  const face = player.faceX < 0 ? -1 : 1, angle = face < 0 ? Math.PI : 0
  return {version:3, head:0, ready:0, nextAt:time+GENERATION_INTERVAL, face, from:angle, to:angle, at:time, x:player.x, y:player.y}
}
export function yujianHeading(state, time) {
  return state.from + (state.to-state.from)*ease((time-state.at)/.32)
}
export function turnYujian(state, face, time) {
  face = face < 0 ? -1 : 1
  if (face === state.face) return
  const current = yujianHeading(state,time), desired = face < 0 ? Math.PI : 0
  state.from = current
  state.to = current + Math.atan2(Math.sin(desired-current),Math.cos(desired-current))
  state.face = face; state.at = time
  // Keep angles bounded through arbitrarily many turns without a visual jump.
  if (Math.abs(state.from)>TAU*2) {
    const offset = Math.round(state.from/TAU)*TAU
    state.from-=offset; state.to-=offset
  }
}
export function validYujianState(state, time) {
  return state === undefined || state?.version===3
    && Number.isInteger(state.head) && state.head>=0 && state.head<10
    && Number.isInteger(state.ready) && state.ready>=0 && state.ready<=10
    && Number.isFinite(state.nextAt) && state.nextAt>=0 && [-1,1].includes(state.face)
    && ['from','to','at','x','y'].every(k=>Number.isFinite(state[k]))
    && state.at>=0 && state.at<=time && Math.abs(state.to-state.from)<=Math.PI+1e-8
}
export function validYujianShot(p) {
  if (p.yujianSlot === undefined) return true
  return p.source==='sj_yujian' && !p.hostile && Number.isInteger(p.yujianSlot)
    && p.yujianSlot>=0 && p.yujianSlot<10 && [-1,1].includes(p.launchFace)
    && ['gatherAt','flightAt','hoverX','hoverY','hoverAngle'].every(k=>Number.isFinite(p[k]))
    && p.gatherAt>=0 && p.flightAt>=p.gatherAt
    && (p.launchAvoided===undefined || typeof p.launchAvoided==='boolean')
    && (p.dissolveAt===null || Number.isFinite(p.dissolveAt))
    && Array.isArray(p.trail) && p.trail.length<=24
    && p.trail.every(a=>['x','y','angle','at'].every(k=>Number.isFinite(a[k])))
}
// Changes velocity only. TowerRun owns swept movement, walls and one-hit damage.
export function stepYujianFlight(shot, target, time, dt) {
  const launching = time < shot.flightAt + .12
  if (launching && !shot.launchAvoided) {
    shot.vx=shot.launchFace*680; shot.vy=0; return
  }
  if (!target || target.hp<=0) return
  const distance=Math.hypot(target.x-shot.x,target.y-shot.y)
  const current=Math.atan2(shot.vy,shot.vx)
  const bend=distance<32?0:(shot.yujianSlot%2 ? 1 : -1)*.45*clamp(1-(time-shot.flightAt)/.65,0,1)
  const desired=Math.atan2(target.y-shot.y,target.x-shot.x)+bend
  const delta=Math.atan2(Math.sin(desired-current),Math.cos(desired-current))
  const speed=launching?680:clamp(distance*6,180,680)
  // Tighten the turn as the target approaches: a fixed turning radius can orbit
  // small enemies forever. Terminal guidance also prevents circling at contact.
  const turn=Math.max(8,speed/Math.max(8,distance*.45))*dt
  const angle=distance<32?desired:current+clamp(delta,-turn,turn)
  shot.vx=Math.cos(angle)*speed; shot.vy=Math.sin(angle)*speed
}
export function yujianVisualPose(shot,time) {
  if (time<shot.flightAt) {
    const u=ease((time-shot.gatherAt)/Math.max(.001,shot.flightAt-shot.gatherAt))
    const angle=shot.launchFace<0?Math.PI:0
    const delta=Math.atan2(Math.sin(angle-shot.hoverAngle),Math.cos(angle-shot.hoverAngle))
    return {x:shot.hoverX,y:shot.hoverY,angle:shot.hoverAngle+delta*u}
  }
  return {x:shot.x,y:shot.y+Math.max(14,46-(time-shot.flightAt)*60),
    angle:Math.atan2(shot.vy,shot.vx)}
}

// Outer-boundary steering: preserves speed, damage, TTL and hit rules.
export function avoidYujianBoundary(shot,target,dt,clearance) {
  const speed=Math.hypot(shot.vx,shot.vy)
  if(!target || speed<=0)return false
  const lookahead=speed*.15, minimum=speed*dt
  if(clearance(shot.vx/speed,shot.vy/speed,lookahead)>=lookahead-1e-8)return false
  const desired=Math.atan2(target.y-shot.y,target.x-shot.x)
  const distance=Math.hypot(target.x-shot.x,target.y-shot.y)
  const horizon=Math.max(minimum,Math.min(lookahead,distance))
  for(let i=0;i<=12;i++)for(const sign of i===0?[1]:[1,-1]) {
    const angle=desired+sign*i*Math.PI/12,dx=Math.cos(angle),dy=Math.sin(angle)
    if(clearance(dx,dy,horizon)>=horizon-1e-8) {
      shot.launchAvoided=true
      shot.vx=dx*speed;shot.vy=dy*speed;return true
    }
  }
  return false
}
