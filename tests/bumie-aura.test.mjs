import test from 'node:test';
import assert from 'node:assert/strict';
import {BumieAuraState} from '../js/xianxia/TowerBumie.js';
const state=()=>({time:1,phase:'playing',player:{x:10,y:20,hp:100},loadout:{passive:{vajra:1}},effects:[]});
test('learned aura follows player with deterministic simulation-time loop, rendering is read only',()=>{
 const m=new BumieAuraState(),s=state(),before=JSON.stringify(s),a=m.sample(s);
 assert.ok(a.visible);assert.deepEqual(m.sample(s),a);assert.equal(JSON.stringify(s),before);
 s.player.x+=30;assert.equal(m.sample(s).x,a.x+30);s.time+=.25;assert.notEqual(m.sample(s).frame,a.frame);
});
test('only positive player_hit pulses; heal, enemy hit, zero and future hits do not',()=>{
 const m=new BumieAuraState(),s=state(),base=m.sample(s).alpha;
 for(const e of [{kind:'hit',damage:20},{kind:'armor_heal',damage:20},{kind:'player_hit',damage:0},{kind:'player_hit',damage:20,startedAt:2}]){
 s.effects=[{startedAt:1,...e}];assert.equal(m.sample(s).alpha,base);
 }
 s.effects=[{kind:'player_hit',damage:5,startedAt:1}];assert.ok(m.sample(s).alpha>base);
 s.effects=[];s.time=1.3;assert.ok(m.sample(s).alpha>base);s.time=1.7;assert.equal(m.sample(s).alpha,base);
});
test('death, unlearning, terminal state and time rewind clear feedback',()=>{
 const m=new BumieAuraState(),s=state();s.effects=[{kind:'player_hit',damage:5,startedAt:1}];m.sample(s);
 s.player.hp=0;assert.equal(m.sample(s).visible,false);
 s.player.hp=100;s.effects=[];assert.equal(m.sample(s).alpha,125);
 s.loadout.passive={};assert.equal(m.sample(s).visible,false);s.loadout.passive.vajra=1;s.phase='won';assert.equal(m.sample(s).visible,false);
 const fresh=state();assert.equal(m.sample(fresh).alpha,125);fresh.time=.5;assert.equal(m.sample(fresh).alpha,125);
});
