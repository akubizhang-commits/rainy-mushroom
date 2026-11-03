import test from 'node:test'
import assert from 'node:assert/strict'
import { swordQiHits, swordQiTravelLimit } from '../js/xianxia/TowerSwordQi.js'

// Independent measurements of the accepted down-cut painting at width 180.
// This replaces the retired 220-degree circle while keeping an open rear.
test('open crescent hits its painted tips and leading edge', () => {
  for (const [x,y] of [[-127.84,78.06],[-156.31,-83.57],[-1.29,-2.76]]) {
    assert.ok(swordQiHits('crescent',180,6,{x:0,y:0},{x:0,y:0},1,0,
      {x,y,radius:1},3), `visible crescent blade misses (${x}, ${y})`)
  }
})

test('open crescent leaves its center and rear gap empty', () => {
  for (const [x,y] of [[-90,0],[-180,0],[-160,50],[-160,-50]]) {
    assert.equal(swordQiHits('crescent',180,6,{x:0,y:0},{x:0,y:0},1,0,
      {x,y,radius:1},3), false, `empty crescent gap hits (${x}, ${y})`)
  }
})

test('hooked tips sweep thin targets in all directions without filling the hollow center', () => {
  for (const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]) {
    const target = {x:-67.84*dx-78.06*dy,y:-67.84*dy+78.06*dx,radius:1}
    assert.ok(swordQiHits('crescent',180,6,{x:0,y:0},{x:120*dx,y:120*dy},dx,dy,target,3))
  }
})

test('a hooked crescent cannot spawn with its rear tips outside the battlefield', () => {
  assert.equal(swordQiTravelLimit('crescent',180,6,{x:-810,y:0},1,0,500),0)
})
