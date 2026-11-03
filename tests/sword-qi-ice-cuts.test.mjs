import test from 'node:test'
import assert from 'node:assert/strict'
import {swordQiHits,swordQiTravelLimit} from '../js/xianxia/TowerSwordQi.js'

test('sweep collision follows its narrow painted blade, not the old full-height moon',()=>{
 const hit=(x,y,pulse)=>swordQiHits('crescent',180,6,{x:0,y:0},{x:0,y:0},1,0,{x,y,radius:1},pulse)
 // Independently measured bright edge: original pixel (1118,840), front (1224,625).
 assert.equal(hit(-19.47,-18.96,2),true)
 assert.equal(hit(-19.47,-39.49,3),true)
 assert.equal(hit(-19.47,-39.49,2),false)
 assert.equal(hit(-80,0,2),false,'hollow interior is not damage')
})

test('each cut continuously sweeps its painted edge in four directions',()=>{
 const points=[[-36.108,-32.382],[-19.47,-18.96],[-19.47,-39.49]]
 for(const [index,[x,y]] of points.entries())for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
  const target={x:(x+60)*dx-y*dy,y:(x+60)*dy+y*dx,radius:1}
  assert.equal(swordQiHits('crescent',180,6,{x:0,y:0},{x:120*dx,y:120*dy},dx,dy,target,index+1),true)
 }
})

test('the narrow sweep fits below a wall where the down cut is obstructed',()=>{
 const sweep=swordQiTravelLimit('crescent',180,6,{x:0,y:970},1,0,200,undefined,2)
 const down=swordQiTravelLimit('crescent',180,6,{x:0,y:970},1,0,200,undefined,3)
 assert.ok(sweep>0)
 assert.equal(down,0)
})
