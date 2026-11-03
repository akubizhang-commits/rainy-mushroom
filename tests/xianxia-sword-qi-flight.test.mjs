import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { skillForm, skillHitShare } from '../js/xianxia/TowerSkillForms.js'
import { swordQiDepth, swordQiReleaseOffset, swordQiSegments, swordQiHits, swordQiTravelLimit } from '../js/xianxia/TowerSwordQi.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'
import { createIronWeapon } from '../js/xianxia/TowerWeapons.js'

const STEP = 1 / 60
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
function make(id, rank, arenaVersion) {
  const weapon = createIronWeapon()
  const run = new TowerRun({ attemptId: 7, floor: 9, seed: 123, xp: 0, hp: 100, arenaVersion,
    loadout: { growthVersion: 1, active: { [id]: rank }, passive: {}, evolutions: [],
      evolutionLevels: {}, tutorialWaves: 0, weapon, weaponId: weapon.id,
      weaponQuality: 0, weaponRefine: 0, weaponFocusCount: 0 } })
  run.state.cooldowns[id] = 99999
  for (let i = 0; i < 300 && !run.state.enemies.length; i++) run.advance(STEP)
  for (const [i,e] of run.state.enemies.entries()) {
    e.x = run.state.player.x + 500; e.y = run.state.player.y + (i ? 300 : 0); e.ai.graceUntil = 99999
  }
  return run
}
function start(run, id) {
  run.state.cooldowns[id] = 0; run.advance(STEP); run.state.cooldowns[id] = 99999
}
function damageEvents(run, seconds) {
  const seen = new Set(), hits = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    run.advance(STEP)
    for (const e of run.state.effects) if (e.kind === 'hit' && !seen.has(e.id)) {
      seen.add(e.id); hits.push(e)
    }
  }
  return hits
}

test('arc changes only at ranks 4 and 7; other skill stages keep their thresholds', () => {
  for (const [rank, shape, hits] of [[1,'sector',1],[3,'sector',1],[4,'crescent-projectile',1],
    [6,'crescent-projectile',1],[7,'crescent-projectile',3],[10,'crescent-projectile',3]]) {
    const f = skillForm('sj_arc', rank); assert.equal(f.shape, shape); assert.equal(f.hits, hits)
    close(Array.from({ length: hits }, (_, i) => skillHitShare('sj_arc', rank, i + 1)).reduce((a,b)=>a+b), 1)
  }
  assert.equal(skillForm('sj_line', 6).hits, 2)
  assert.equal(skillForm('sj_shadow', 3).hits, 2)
})

test('cross grows once at rank 7 and keeps one strike per cast', () => {
  assert.equal(skillForm('sj_cross', 3).shape, 'cross-burst')
  assert.equal(skillForm('sj_cross', 4).shape, 'cross-burst')
  close(skillForm('sj_cross', 7).width / skillForm('sj_cross', 6).width, 1.5)
  assert.equal(skillForm('sj_cross', 10).hits, 1)
})

test('cross collision follows the approved forward-facing crescent curves at each size', () => {
  const approved = JSON.parse(readFileSync(new URL(
    '../design/xianxia-cross-forward-2026-10-30/art/forward-candidates.json', import.meta.url)))
    .candidates.find(candidate => candidate.id === 'c')
  for (const width of [180, 270]) {
    const segments = swordQiSegments('cross', width)
    assert.equal(segments.length, 24)
    for (let blade = 0; blade < 2; blade++) {
      const points = [segments[blade * 12].a,
        ...segments.slice(blade * 12, (blade + 1) * 12).map(segment => segment.b)]
      for (const [i, point] of points.entries()) {
        close(point.x / width, approved.normalizedPolylines[blade][i][0])
        close(point.y / width, approved.normalizedPolylines[blade][i][1])
      }
      assert.ok(points[0].x < points[6].x && points[12].x < points[6].x,
        'Both tips trail the shared middle instead of pointing ahead')
    }
    const points = segments.flatMap(segment => [segment.a, segment.b])
    close(Math.max(...points.map(point => point.x)), 0)
    close(Math.min(...points.map(point => point.x)), -swordQiDepth('cross', width))
    close(Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y)), width)
  }
})

test('cross release keeps its intersection 90 units ahead at every rank and direction', () => {
  for (let rank = 1; rank <= 10; rank++) {
    const form = skillForm('sj_cross', rank)
    const intersection = swordQiSegments('cross', form.width)[5].b
    close(intersection.y, 0)
    close(swordQiReleaseOffset(form) + intersection.x, 90)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2]]) {
      const origin = { x: 30 + dx * swordQiReleaseOffset(form), y: -20 + dy * swordQiReleaseOffset(form) }
      const onBlade = { x: 30 + 90 * dx, y: -20 + 90 * dy, radius: 1 }
      assert.ok(swordQiHits('cross', form.width, form.bladeWidth, origin, origin, dx, dy, onBlade))
      // The space ahead of the crossing at half-height remains empty.
      const inGap = { x: onBlade.x - 50 * dy, y: onBlade.y + 50 * dx, radius: 1 }
      assert.equal(swordQiHits('cross', form.width, form.bladeWidth, origin, origin, dx, dy, inGap), false)
    }
  }
})

test('near crossed crescents settle their shared intersection only once',()=>{
  const run=make('sj_cross',1),p=run.state.player,target=run.state.enemies[0]
  const form=skillForm('sj_cross',1)
  const intersection=swordQiReleaseOffset(form)+swordQiSegments('cross',form.width)[5].b.x
  Object.assign(target,{x:p.x+intersection,y:p.y})
  const hp=target.hp
  assert.ok(validateTowerSnapshot(run.snapshot()))
  start(run,'sj_cross')
  const hits=damageEvents(run,.4).filter(e=>e.x===target.x&&e.y===target.y)
  assert.equal(hits.length,1)
  close(hp-target.hp,p.attack*GROWTH_SKILLS.find(s=>s.id==='sj_cross').damage[0])
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('swept blades catch thin targets between frames and leave empty corner space', () => {
  assert.equal(swordQiHits('crescent',180,12,{x:0,y:0},{x:120,y:0},1,0,{x:60,y:0,radius:1}), true)
  assert.equal(swordQiHits('crescent',180,12,{x:0,y:0},{x:120,y:0},1,0,{x:60,y:130,radius:1}), false)
  const small=swordQiHits('cross',180,12,{x:0,y:0},{x:200,y:0},1,0,{x:40,y:115,radius:1})
  const big=swordQiHits('cross',270,18,{x:0,y:0},{x:200,y:0},1,0,{x:40,y:115,radius:1})
  assert.equal(small,false); assert.equal(big,true)
})

test('travel limit uses battlefield boundaries and blocks the middle of a wide blade on pillars', () => {
  // The projected diagonal reaches 4.746122448979592 ahead of its anchor.
  close(swordQiTravelLimit('crescent',180,12,{x:0,y:0},1,0,4000),967.2538775510204)
  const limit=swordQiTravelLimit('cross',270,18,{x:33,y:100},0,1,4000,1)
  assert.ok(limit>=0 && limit<300, `the central arms must meet the north pillar, got ${limit}`)
})

for (const [id, rank, count] of [['sj_arc',4,1],['sj_arc',7,3]]) {
  test(`${id} rank ${rank} travels before hit, pierces targets once per wave and preserves total damage`, () => {
    const run=make(id,rank), target=run.state.enemies[0]
    Object.assign(target,{hp:1e6,maxHp:1e6,radius:5,moveSpeed:0})
    start(run,id); assert.equal(damageEvents(run,id==='sj_cross'?.32:.25).length,0)
    assert.ok(run.state.projectiles.some(p=>p.bladeKind))
    const hits=damageEvents(run,1).filter(e=>e.x===target.x&&e.y===target.y)
    assert.equal(hits.length,count)
    const skill=GROWTH_SKILLS.find(s=>s.id===id)
    close(1e6-target.hp,run.state.player.attack*skill.damage[rank-1])
  })
}

test('flying blade persists off-screen, holds its direction, stops at the map and cannot hit during dissolve', () => {
  const run=make('sj_arc',4), enemy=run.state.enemies[0]
  Object.assign(enemy,{hp:1e6,maxHp:1e6,moveSpeed:0})
  start(run,'sj_arc'); damageEvents(run,.23)
  const shot=run.state.projectiles[0]; assert.ok(shot)
  const y=shot.y
  run.setView?.({xmin:-100,xmax:100,ymin:-100,ymax:100})
  run.state.player.y+=200; enemy.y+=200
  damageEvents(run,.2); close(shot.y,y)
  for(let i=0;i<150&&shot.dissolveAt===null;i++)run.advance(STEP)
  assert.ok(Number.isFinite(shot.dissolveAt))
  const x=shot.x
  enemy.x=x;enemy.y=y
  const hp=enemy.hp; damageEvents(run,.2)
  close(shot.x,x); close(enemy.hp,hp)
})

for (const id of ['sj_arc']) {
  test(`${id} in-flight and fading snapshots validate, pause and restore deterministically`, () => {
    const run=make(id,7)
    start(run,id); damageEvents(run,.4)
    assert.ok(run.state.projectiles.length)
    assert.ok(validateTowerSnapshot(run.snapshot()))
    run.pause()
    const saved=run.snapshot(), restored=TowerRun.restore(saved)
    run.advance(1);assert.deepEqual(run.snapshot(),saved)
    run.resume();restored.resume()
    run.advance(.8);restored.advance(.8)
    assert.deepEqual(run.snapshot(),restored.snapshot())
    assert.ok(validateTowerSnapshot(run.snapshot()))
    const broken=run.snapshot(), shot=broken.projectiles.find(p=>p.bladeKind)
    assert.ok(shot);shot.width*=2
    assert.equal(validateTowerSnapshot(broken),false)
  })
}


test('cross burst hits front, rear and sides once, caps at six and excludes outside targets',()=>{
 const run=make('sj_cross',7),p=run.state.player,template=run.state.enemies[0]
 run.state.pending=[];run.state.reserved=[]
 run.state.enemies=Array.from({length:8},(_,i)=>{
  const e=structuredClone(template),a=i*Math.PI/3,r=i===7?310:120+i*10
  Object.assign(e,{id:'burst-'+i,x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,radius:5,hp:1e6,maxHp:1e6,moveSpeed:0})
  e.ai.graceUntil=99999;return e
 })
 start(run,'sj_cross');const hits=damageEvents(run,.8).filter(e=>e.source==='sj_cross')
 assert.equal(hits.length,6)
 assert.equal(run.state.enemies.filter(e=>e.hp<1e6).length,6)
 assert.equal(run.state.enemies[7].hp,1e6)
 assert.equal(run.state.projectiles.filter(e=>e.source==='sj_cross').length,0)
 const fx=run.state.effects.find(e=>e.shape==='cross-burst');assert.ok(fx)
 close(fx.x,p.x);close(fx.y,p.y);assert.equal(fx.radius,270)
 const hp=run.state.enemies.map(e=>e.hp);damageEvents(run,.4)
 assert.deepEqual(run.state.enemies.map(e=>e.hp),hp,'afterglow adds no damage')
})

test('cross burst remains centered at release during movement, pause and save restore',()=>{
 const run=make('sj_cross',4),p=run.state.player,e=run.state.enemies[0]
 e.x=p.x-150;e.y=p.y
 start(run,'sj_cross');damageEvents(run,.3)
 const fx=run.state.effects.find(e=>e.shape==='cross-burst');assert.ok(fx)
 const origin={x:fx.x,y:fx.y};run.setInput(1,0);damageEvents(run,.1)
 close(fx.x,origin.x);close(fx.y,origin.y)
 run.pause();const snapshot=run.snapshot();assert.ok(validateTowerSnapshot(snapshot))
 const restored=TowerRun.restore(snapshot);run.advance(.1);assert.deepEqual(run.snapshot(),snapshot)
 run.resume();restored.resume();run.advance(.2);restored.advance(.2)
 assert.deepEqual(run.snapshot(),restored.snapshot())
})
