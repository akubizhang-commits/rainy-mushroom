import test from 'node:test'
import assert from 'node:assert/strict'
import {addQingping,tickQingping,validQingping} from '../js/xianxia/TowerQingping.js'
const fixture=()=>({state:{scarReadyAt:0,time:0,enemies:[{id:'a',hp:100}]}})
test('debuff application has no delayed contact, and blocked refresh cannot change expiry',()=>{
 const r=fixture(),e=r.state.enemies[0]
 assert.equal(addQingping(r,e),true);assert.deepEqual(e.scarDebuff,{endsAt:3,vulnerability:.2})
 for(const time of [.2,.48,.5,1,2.99]){
  r.state.time=time;assert.equal(addQingping(r,e),false);assert.deepEqual(tickQingping(r),[])
  assert.equal(e.scarDebuff.endsAt,3);assert.ok(validQingping(r.state))
 }
 r.state.time=3;tickQingping(r);assert.equal(e.scarDebuff,undefined);assert.equal(r.state.scarReadyAt,10)
 r.state.time=10;assert.equal(addQingping(r,e),true);assert.equal(e.scarDebuff.endsAt,13)
})
test('dead targets lose debuff; forged status lifetime and power are rejected',()=>{
 const r=fixture(),e=r.state.enemies[0];addQingping(r,e)
 e.scarDebuff.vulnerability=NaN;assert.equal(validQingping(r.state),false)
 e.hp=0;tickQingping(r);assert.equal(e.scarDebuff,undefined);assert.ok(validQingping(r.state))
})
test('saved state cannot manufacture several marked targets in one shared cooldown',()=>{
 const r=fixture(),e=r.state.enemies[0];addQingping(r,e)
 r.state.enemies.push({...structuredClone(e),id:'forged-second-target'})
 assert.equal(validQingping(r.state),false)
})
